import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton
import json
import os
import re
import requests
import uuid
import time
import threading
import signal
from datetime import datetime, timezone, timedelta

# --- Kill Old Instances ---
pid_file = "main_bot.pid"
if os.path.exists(pid_file):
    try:
        with open(pid_file, "r") as f:
            old_pid = int(f.read().strip())
        import signal
        os.kill(old_pid, signal.SIGTERM)
    except:
        pass
with open(pid_file, "w") as f:
    f.write(str(os.getpid()))

IST = timezone(timedelta(hours=5, minutes=30))
from manager import STORE_BOT_TOKEN, CHANNEL_USERNAME, CHANNEL_LINK, GROUP_CHAT_ID, GROUP_LINK, ADMIN_BOT_TOKEN, UPI_QR_IMAGE, get_payment_settings

def get_cf_client_id(): return get_payment_settings().get('CF_CLIENT_ID')
def get_cf_secret(): return get_payment_settings().get('CF_SECRET')
def get_cf_env(): return get_payment_settings().get('CF_ENV')
def get_nowpayments_key(): return get_payment_settings().get('NOWPAYMENTS_API_KEY')
def get_upi_id(): return get_payment_settings().get('UPI_ID')
def get_binance_pay_id(): return get_payment_settings().get('BINANCE_PAY_ID')
def get_binance_key(): return get_payment_settings().get('BINANCE_API_KEY')
def get_binance_secret(): return get_payment_settings().get('BINANCE_API_SECRET')
from flask import Flask, request, jsonify

# Initialize Telegram Bots & Flask App
bot = telebot.TeleBot(STORE_BOT_TOKEN)
admin_bot = telebot.TeleBot(ADMIN_BOT_TOKEN)
app = Flask(__name__)

# --- NETWORK RESILIENCE HANDLER ---
class BotExceptionHandler(telebot.ExceptionHandler):
    def handle(self, exception):
        # Catch common transient network errors to avoid crashing or long tracebacks
        err_msg = str(exception).lower()
        if any(x in err_msg for x in ["connection", "timeout", "remote end", "disconnected", "reset", "abort"]):
            print(f"📡 Network Glitch: {exception}")
            # Returning True ignores the exception and lets the bot continue polling
            return True
        return False

bot.exception_handler = BotExceptionHandler()
admin_bot.exception_handler = BotExceptionHandler()

# Stores pending buy/deposit context per user
pending_orders = {}
# For automatic payment detection
pending_deposits = []
payment_processing_lock = threading.Lock()
active_purchases = set()

# --- EXCHANGE RATE MANAGER ---
class CurrencyConverter:
    def __init__(self):
        self.rates = {"INR": 1.0, "USD": 0.012}
        self.symbols = {"INR": "₹", "USD": "$"}

    def update_rates_loop(self):
        """Background loop to update exchange rates every hour without blocking user threads."""
        while True:
            try:
                res = requests.get('https://open.er-api.com/v6/latest/INR', timeout=10).json()
                if 'rates' in res:
                    self.rates['USD'] = res['rates'].get('USD', 0.012)
                    print("[Background] Updated exchange rates:", self.rates)
            except Exception as e:
                print("[Background] Failed to update rates:", e)
            time.sleep(3600)

    def convert(self, amount_inr, target_currency):
        rate = self.rates.get(target_currency, 1.0)
        return round(amount_inr * rate, 2)
        
    def format_price(self, amount_inr, target_currency):
        converted = self.convert(amount_inr, target_currency)
        symbol = self.symbols.get(target_currency, "₹")
        return f"{symbol}{converted}"

converter = CurrencyConverter()

from manager import load_db, save_db, load_payments, save_payment, check_and_reward_referrer

db = load_db()

def get_active_discount(p_id, original_price, db):
    """
    Checks if there is any active discount for the given product.
    Returns (discounted_price, discount_info_str) or (original_price, None).
    """
    discounts = db.get('discounts', {})
    if not discounts:
        return original_price, None
        
    now = time.time()
    best_discounted_price = original_price
    discount_info = None
    
    for d in discounts.values():
        if not d.get('is_active', True):
            continue
        # Check start and end times
        start_ts = d.get('start_date')
        end_ts = d.get('end_date')
        if start_ts and now < start_ts:
            continue
        if end_ts and now > end_ts:
            continue
            
        # Check product target
        target_type = d.get('target_type', 'all')
        if target_type == 'specific':
            if p_id not in d.get('target_products', []):
                continue
                
        # Calculate discount
        disc_type = d.get('type', 'flat')
        val = d.get('value', 0.0)
        
        if disc_type == 'percentage':
            discounted = original_price * (1 - val / 100.0)
            info = f"{val}% OFF"
        else:
            discounted = max(0.0, original_price - val)
            info = f"₹{val} OFF"
            
        if discounted < best_discounted_price:
            best_discounted_price = discounted
            discount_info = info
            
    # Round to 2 decimal places
    best_discounted_price = round(best_discounted_price, 2)
    if best_discounted_price == original_price:
        return original_price, None
    return best_discounted_price, discount_info

def show_order_confirmation(chat_id, message_id, p_id, v_id, qty, coupon_code=None):
    global db
    db = load_db()
    prod = db['products'].get(p_id)
    var = prod['variants'].get(v_id)
    
    stock_pool_id = var.get('pool_id')
    raw_stock = len(prod.get('stock_pools', {}).get(stock_pool_id, []))
    is_pre_enabled = prod.get('preorder_pools', {}).get(stock_pool_id, False)
    is_preorder_purchase = (raw_stock < qty and is_pre_enabled)
    buy_btn_text = "📦 Place Pre-Order" if is_preorder_purchase else "🛒 Complete Purchase"
    
    delivery_time_disp = "24-48 Hours" if is_preorder_purchase else prod.get('delivery_time', 'Instant')

    user = db['users'].get(str(chat_id), {})
    currency = user.get('currency', 'INR')

    original_price = var['price']
    disc_price, disc_info = get_active_discount(p_id, original_price, db)
    base_total = disc_price * qty
    
    applied_coupon = None
    coupon_discount = 0.0
    disc_details = ""
    
    if coupon_code:
        coupon = db.get('coupons', {}).get(coupon_code)
        if coupon and coupon.get('is_active', True):
            now = time.time()
            start_ts = coupon.get('start_date')
            end_ts = coupon.get('end_date')
            date_ok = not ((start_ts and now < start_ts) or (end_ts and now > end_ts))
            
            target_type = coupon.get('target_type', 'all')
            prod_ok = not (target_type == 'specific' and p_id not in coupon.get('target_products', []))
            
            # Check user specific limit
            user_ok = True
            per_user_limit = coupon.get('per_user_limit', -1)
            if per_user_limit != -1:
                user_uses = sum(1 for s in db.get('sales', []) if s.get('user_id') == chat_id and s.get('coupon_code') == coupon_code)
                if user_uses >= per_user_limit:
                    user_ok = False
            
            max_uses = coupon.get('max_uses', -1)
            used_count = coupon.get('used_count', 0)
            limit_ok = not (max_uses != -1 and used_count >= max_uses)
            
            if date_ok and prod_ok and limit_ok and user_ok:
                applied_coupon = coupon
                val = coupon.get('value', 0.0)
                if coupon.get('type') == 'percentage':
                    coupon_discount = round(base_total * (val / 100.0), 2)
                    disc_details = f"{val}% OFF"
                else:
                    coupon_discount = round(val, 2)
                    disc_details = f"₹{val} OFF"
                
    final_total = max(0.0, base_total - coupon_discount)
    
    user_balance = user.get('balance', 0)
    original_total_str = converter.format_price(original_price * qty, currency)
    base_total_str = converter.format_price(base_total, currency)
    final_total_str = converter.format_price(final_total, currency)
    bal_str = converter.format_price(user_balance, currency)
    
    has_enough = user_balance >= final_total
    shortfall = final_total - user_balance
    shortfall_str = converter.format_price(shortfall, currency)
    
    warning_text = ""
    if not has_enough:
        warning_text = f"\n\n❌ **INSUFFICIENT BALANCE!**\n*You are short by {shortfall_str}. Please add funds to purchase.*"
    
    markup = InlineKeyboardMarkup(row_width=2)
    
    if applied_coupon:
        discount_val_str = converter.format_price(coupon_discount, currency)
        text = (
            f"💳 **CONFIRM ORDER (COUPON APPLIED)**\n"
            f"───────────────────────────\n"
            f"📦 **Product:** `{prod['name']} ({var['name']})`\n"
            f"🔢 **Quantity:** `{qty} unit(s)`\n"
            f"💵 **Original Total:** `{original_total_str}`\n"
            f"🎟️ **Coupon Applied:** `{coupon_code} (-{discount_val_str} {disc_details})`\n"
            f"💵 **Final Cost:** *{final_total_str}*\n"
            f"💼 **Your Balance:** `{bal_str}`\n"
            f"⚡ **Delivery Process:** `{'Automatic' if prod.get('delivery_process', 'auto') == 'auto' else 'Manual'}`\n"
            f"⏱️ **Delivery Time:** `{delivery_time_disp}`\n"
            f"───────────────────────────\n"
            f"⚡ *Click the button below to complete purchase:*{warning_text}"
        )
        if has_enough:
            markup.add(
                InlineKeyboardButton(buy_btn_text, callback_data=f"buy:{p_id}:{v_id}:{qty}:{coupon_code}"),
                InlineKeyboardButton("❌ Remove Coupon", callback_data=f"buy_cancel_coupon:{p_id}:{v_id}:{qty}")
            )
        else:
            markup.add(
                InlineKeyboardButton("💳 Add Balance", callback_data="add_bal"),
                InlineKeyboardButton("❌ Remove Coupon", callback_data=f"buy_cancel_coupon:{p_id}:{v_id}:{qty}")
            )
    else:
        text = (
            f"💳 **CONFIRM ORDER**\n"
            f"───────────────────────────\n"
            f"📦 **Product:** `{prod['name']} ({var['name']})`\n"
            f"🔢 **Quantity:** `{qty} unit(s)`\n"
            f"💵 **Total Cost:** `{base_total_str}`\n"
            f"💼 **Your Balance:** `{bal_str}`\n"
            f"⚡ **Delivery Process:** `{'Automatic' if prod.get('delivery_process', 'auto') == 'auto' else 'Manual'}`\n"
            f"⏱️ **Delivery Time:** `{delivery_time_disp}`\n"
            f"───────────────────────────\n"
            f"⚡ *Click the button below to complete purchase:*{warning_text}"
        )
        if has_enough:
            markup.add(
                InlineKeyboardButton(buy_btn_text, callback_data=f"buy:{p_id}:{v_id}:{qty}"),
                InlineKeyboardButton("🎟️ Apply Coupon", callback_data=f"apply_coup:{p_id}:{v_id}:{qty}")
            )
        else:
            markup.add(
                InlineKeyboardButton("💳 Add Balance", callback_data="add_bal"),
                InlineKeyboardButton("🎟️ Apply Coupon", callback_data=f"apply_coup:{p_id}:{v_id}:{qty}")
            )
        
    back_cb = f"opt:{p_id}:{v_id}"
    markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=back_cb))
    
    if message_id:
        try:
            bot.edit_message_text(text, chat_id, message_id, reply_markup=markup, parse_mode='Markdown')
        except Exception as e:
            if "message is not modified" not in str(e).lower():
                bot.send_message(chat_id, text, reply_markup=markup, parse_mode='Markdown')
    else:
        bot.send_message(chat_id, text, reply_markup=markup, parse_mode='Markdown')

def get_user(user_obj):
    str_id = str(user_obj.id)
    if str_id not in db['users']:
        db['users'][str_id] = {
            "balance": 0.0, 
            "currency": "INR",
            "username": user_obj.username or "Unknown",
            "total_deposit": 0.0,
            "total_purchases": 0
        }
        save_db(db)
        
    user_ref = db['users'][str_id]
    needs_save = False
    if "username" not in user_ref:
        user_ref["username"] = user_obj.username or "Unknown"
        user_ref["total_deposit"] = 0.0
        user_ref["total_purchases"] = 0
        needs_save = True
    if needs_save: save_db(db)
    return user_ref

# --- GATEKEEPING LOGIC ---
membership_cache = {} # Cache dict: user_id -> (is_member, expiry_time)

def check_membership(user_id, bypass_cache=False):
    """Checks if the user is a member of the mandatory channel and group with local caching."""
    now = time.time()
    if not bypass_cache and user_id in membership_cache:
        is_member, expiry = membership_cache[user_id]
        if now < expiry:
            return is_member
            
    try:
        # Check Channel Membership
        member_channel = bot.get_chat_member(CHANNEL_USERNAME, user_id)
        is_channel_member = member_channel.status in ['member', 'administrator', 'creator']
        
        # Check Group Membership (if configured)
        is_group_member = True
        if GROUP_CHAT_ID:
            try:
                member_group = bot.get_chat_member(int(GROUP_CHAT_ID), user_id)
                is_group_member = member_group.status in ['member', 'administrator', 'creator']
            except Exception as e:
                print(f"Group Membership Check Error: {e}")
                # If bot is not in group or group is misconfigured, allow access to avoid locking everyone out
                is_group_member = True
                
        is_member = is_channel_member and is_group_member
        
        # Cache membership status: 5 minutes if member, 10 seconds if not member
        cache_time = 300 if is_member else 10
        membership_cache[user_id] = (is_member, now + cache_time)
        return is_member
    except Exception as e:
        # If bot is not admin or channel doesn't exist, allow access to avoid blocking everyone
        print(f"Membership Check Error: {e}")
        return True

def membership_required_screen(chat_id, is_callback=False):
    """Sends a friendly message telling user they MUST join the channel/group."""
    if GROUP_CHAT_ID:
        text = (
            "👋 *Welcome!*\n\n"
            "To explore our premium products and use the bot, please join our official **Channel** and **Group** first.\n\n"
            "It only takes a second! Click the buttons below to join and then click 'I have joined'."
        )
        markup = InlineKeyboardMarkup(row_width=1)
        markup.add(
            InlineKeyboardButton("📢 Join Channel", url=CHANNEL_LINK),
            InlineKeyboardButton("💬 Join Group", url=GROUP_LINK),
            InlineKeyboardButton("✅ Verify Membership", callback_data="check_joined")
        )
    else:
        text = (
            "👋 *Welcome!*\n\n"
            "To explore our premium products and use the bot, please join our official announcement channel first.\n\n"
            "It only takes a second! Click the button below to join and then click 'I have joined'."
        )
        markup = InlineKeyboardMarkup(row_width=1)
        markup.add(
            InlineKeyboardButton("📢 Join Channel", url=CHANNEL_LINK),
            InlineKeyboardButton("✅ Verify Membership", callback_data="check_joined")
        )
    
    bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

def is_main_menu_button(text):
    if not text: return False
    suffixes = ["Explore Store", "Search Product", "Add Balance", "Order History", "My Account", "Invite Users", "How to use Bot", "Help & Support"]
    return any(text.endswith(s) for s in suffixes)

def get_p_emoji(key, fallback):
    return fallback

def html_escape(text):
    return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

# --- HELPER MENUS ---
def build_reply_keyboard():
    markup = ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    db_ref = load_db()
    icons = db_ref.get("theme_settings", {}).get("button_icons", {})
    buttons = [
        KeyboardButton(f"{icons.get('explore_store', '🛍️')} Explore Store"),
        KeyboardButton(f"{icons.get('search_product', '🔍')} Search Product"),
        KeyboardButton(f"{icons.get('add_balance', '💳')} Add Balance"),
        KeyboardButton(f"{icons.get('order_history', '📦')} Order History"),
        KeyboardButton(f"{icons.get('my_account', '👤')} My Account")
    ]
    if db_ref.get('referral_enabled', True):
        buttons.append(KeyboardButton(f"{icons.get('invite_users', '🎁')} Invite Users"))
    buttons.append(KeyboardButton(f"{icons.get('how_to_use', '📖')} How to use Bot"))
    buttons.append(KeyboardButton(f"{icons.get('help_support', '💬')} Help & Support"))
    markup.add(*buttons)
    return markup

def build_category_menu():
    categories = db.get('categories', {})
    products = db.get('products', {})
    markup = InlineKeyboardMarkup(row_width=1)
    
    # ✨ Explore All Products button at the very top
    markup.add(InlineKeyboardButton("✨ Explore All Products", callback_data="explore_all:1"))
    
    # Always prioritize manual priority first, then name
    def get_cat_sort_key(item):
        cid, cdata = item
        try:
            pri = int(cdata.get('priority', 999999))
        except:
            pri = 999999
        return (pri, cdata.get('name', '').lower())
            
    sorted_cats = sorted(categories.items(), key=get_cat_sort_key)
    
    cat_buttons = []
    for i, (cid, cdata) in enumerate(sorted_cats, 1):
        cat_buttons.append(InlineKeyboardButton(f"📁 {i}. {cdata.get('name', 'Unnamed')}", callback_data=f"cat_browse:{cid}:1"))
    
    if cat_buttons:
        markup.add(*cat_buttons)
    
    return markup

def build_paginated_product_menu(user_currency, cat_id=None, page=1):
    """Universal paginated menu for any list of products (Categorized or All)."""
    markup = InlineKeyboardMarkup(row_width=1)
    products = db.get('products', {})
    
    # Pre-calculate popularity from sales history
    sales = db.get('sales', [])
    popularity = {}
    for s in sales:
        pid = s.get('product_id')
        if pid:
            popularity[pid] = popularity.get(pid, 0) + 1
            
    # 1. Filter products
    filtered_p_ids = []
    for p_id, p_data in products.items():
        if not p_data.get('is_active', True): continue
        
        # Filtering logic
        if cat_id:
            match = (p_data.get('category_id') == cat_id) if cat_id != 'others' else (p_data.get('category_id') is None)
            if not match: continue
        
        # Ensure variants exist
        if not p_data.get('variants'): continue
        filtered_p_ids.append(p_id)

    # 1.5 Sort Products (In Stock > Famous > Cheap)
    def get_sort_key(p_id):
        p_data = products[p_id]
        stock_count = sum(len(arr) for arr in p_data.get('stock_pools', {}).values())
        in_stock = 1 if stock_count > 0 else 0
        pop_score = popularity.get(p_id, 0)
        prices = [v.get('price', float('inf')) for v in p_data.get('variants', {}).values()]
        min_price = min(prices) if prices else float('inf')
        
        mode = db.get('sorting_mode', 'auto')
        if mode == 'manual':
            pri = p_data.get('cat_priority', 999999) if cat_id else p_data.get('global_priority', 999999)
            return (pri, -in_stock, min_price)
        else:
            return (-in_stock, -pop_score, min_price)

    filtered_p_ids.sort(key=get_sort_key)

    # 2. Pagination Math
    PAGE_SIZE = 8
    total_products = len(filtered_p_ids)
    total_pages = (total_products + PAGE_SIZE - 1) // PAGE_SIZE if total_products > 0 else 1
    page = max(1, min(page, total_pages))
    
    start_idx = (page - 1) * PAGE_SIZE
    end_idx = start_idx + PAGE_SIZE
    page_items = filtered_p_ids[start_idx:end_idx]

    # 3. Add Product Buttons
    for p_id in page_items:
        p_data = products[p_id]
        stock_count = sum([len(arr) for arr in p_data.get('stock_pools', {}).values()])
        has_pre = any(p_data.get('preorder_pools', {}).values())
        has_inf = any(p_data.get('infinite_pools', {}).values())
        if stock_count > 0 or has_inf:
            st = "In Stock" if has_inf else f"{stock_count} Available"
        elif has_pre:
            st = "Pre-Order"
        else:
            st = "0 Available"
        text = f"📦 {p_data['name']} • {st}"
        
        # Encode routing info
        if cat_id:
            cb = f"view:{p_id}:c:{cat_id}:{page}"
        else:
            cb = f"view:{p_id}:a:{page}"
            
        markup.add(InlineKeyboardButton(text, callback_data=cb))
    
    # 4. Navigation Row
    nav_row = []
    if page > 1:
        cb_prev = f"cat_browse:{cat_id}:{page-1}" if cat_id else f"explore_all:{page-1}"
        nav_row.append(InlineKeyboardButton("◀️", callback_data=cb_prev))
    
    nav_row.append(InlineKeyboardButton(f"Page {page}/{total_pages}", callback_data="noop"))
    
    if page < total_pages:
        cb_next = f"cat_browse:{cat_id}:{page+1}" if cat_id else f"explore_all:{page+1}"
        nav_row.append(InlineKeyboardButton("▶️", callback_data=cb_next))
    
    if nav_row:
        markup.row(*nav_row)

    # 5. Back Button
    markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="back_categories"))
    return markup


def build_paginated_search_menu(user_currency, query, page=1):
    """Universal paginated menu for search results."""
    markup = InlineKeyboardMarkup(row_width=1)
    products = db.get('products', {})
    
    # 1. Filter products matching query
    filtered_p_ids = []
    q_lower = query.lower()
    for p_id, p_data in products.items():
        if not p_data.get('is_active', True): continue
        if not p_data.get('variants'): continue
        
        name_match = q_lower in p_data.get('name', '').lower()
        desc_match = q_lower in p_data.get('description', '').lower()
        if name_match or desc_match:
            filtered_p_ids.append(p_id)
            
    # Pre-calculate popularity from sales history
    sales = db.get('sales', [])
    popularity = {}
    for s in sales:
        pid = s.get('product_id')
        if pid:
            popularity[pid] = popularity.get(pid, 0) + 1
            
    # Sort matching products
    def get_sort_key(p_id):
        p_data = products[p_id]
        stock_count = sum(len(arr) for arr in p_data.get('stock_pools', {}).values())
        in_stock = 1 if stock_count > 0 else 0
        pop_score = popularity.get(p_id, 0)
        prices = [v.get('price', float('inf')) for v in p_data.get('variants', {}).values()]
        min_price = min(prices) if prices else float('inf')
        return (-in_stock, -pop_score, min_price)
        
    filtered_p_ids.sort(key=get_sort_key)
    
    total_products = len(filtered_p_ids)
    if total_products == 0:
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="back_categories"))
        return markup, 0
        
    PAGE_SIZE = 8
    total_pages = (total_products + PAGE_SIZE - 1) // PAGE_SIZE
    page = max(1, min(page, total_pages))
    
    start_idx = (page - 1) * PAGE_SIZE
    end_idx = start_idx + PAGE_SIZE
    page_items = filtered_p_ids[start_idx:end_idx]
    
    for p_id in page_items:
        p_data = products[p_id]
        stock_count = sum(len(arr) for arr in p_data.get('stock_pools', {}).values())
        has_pre = any(p_data.get('preorder_pools', {}).values())
        has_inf = any(p_data.get('infinite_pools', {}).values())
        if stock_count > 0 or has_inf:
            st = "In Stock" if has_inf else f"{stock_count} Available"
        elif has_pre:
            st = "Pre-Order"
        else:
            st = "0 Available"
        btn_text = f"📦 {p_data['name']} • {st}"
        markup.add(InlineKeyboardButton(btn_text, callback_data=f"view:{p_id}:s:{query}:{page}"))
        
    nav_row = []
    if page > 1:
        nav_row.append(InlineKeyboardButton("◀️", callback_data=f"search_browse:{query}:{page-1}"))
    nav_row.append(InlineKeyboardButton(f"Page {page}/{total_pages}", callback_data="noop"))
    if page < total_pages:
        nav_row.append(InlineKeyboardButton("▶️", callback_data=f"search_browse:{query}:{page+1}"))
        
    if nav_row:
        markup.row(*nav_row)
        
    markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="back_categories"))
    return markup, total_products


def show_search_results(call, currency, query, page=1):
    """Displays search results with pagination."""
    markup, count = build_paginated_search_menu(currency, query, page)
    if count == 0:
        text = (
            f"🔍 **PRODUCT SEARCH RESULTS**\n"
            f"───────────────────────────\n"
            f"❌ No products found matching: *{query}*\n\n"
            f"💡 *Please try a different keyword or browse the catalog.*"
        )
    else:
        text = (
            f"🔍 **PRODUCT SEARCH RESULTS**\n"
            f"───────────────────────────\n"
            f"Search results for: *{query}*\n\n"
            f"Select any item below to view its details, variants, and stock:"
        )
        
    try:
        bot.edit_message_text(
            text,
            call.message.chat.id, call.message.message_id,
            reply_markup=markup, parse_mode='Markdown'
        )
    except telebot.apihelper.ApiTelegramException as e:
        if "message is not modified" not in str(e).lower():
            raise e


def process_product_search(message):
    """Handles query input for product search."""
    global db
    db = load_db()
    chat_id = message.chat.id
    query = message.text.strip() if message.text else ""
    
    if query in ["🛍️ Explore Store", "🔍 Search Product", "📦 Order History", "💳 Add Balance", "👤 My Account", "🎁 Invite Users", "📖 How to use Bot", "💬 Help & Support"]:
        return handle_text_menus(message)
        
    if query.lower() == 'cancel':
        return bot.send_message(chat_id, "❌ Search cancelled.")
        
    if not query:
        msg = bot.send_message(chat_id, "⚠️ Search term cannot be empty. Please try again:")
        bot.register_next_step_handler(msg, process_product_search)
        return
        
    user = get_user(message.from_user)
    currency = user.get('currency', 'INR')
    
    markup, count = build_paginated_search_menu(currency, query, page=1)
    if count == 0:
        emoji = get_p_emoji('search', '🔍')
        text = (
            f"{emoji} <b>PRODUCT SEARCH RESULTS</b>\n"
            f"───────────────────────────\n"
            f"❌ No products found matching: <b>{html_escape(query)}</b>\n\n"
            f"💡 <i>Please try a different keyword or browse the catalog.</i>"
        )
    else:
        emoji = get_p_emoji('search', '🔍')
        text = (
            f"{emoji} <b>PRODUCT SEARCH RESULTS</b>\n"
            f"───────────────────────────\n"
            f"Search results for: <b>{html_escape(query)}</b>\n\n"
            f"Select any item below to view its details, variants, and stock:"
        )
        
    bot.send_message(chat_id, text, reply_markup=markup, parse_mode='HTML')



def _send_purchase_broadcast_bg(username, prod_name, var_name, formatted_paid, remaining_stock):
    try:
        from manager import GROUP_CHAT_ID, STORE_BOT_TOKEN
        import telebot
        import threading
        from datetime import datetime
        
        if not GROUP_CHAT_ID or GROUP_CHAT_ID.strip() == "":
            return
            
        def _send():
            try:
                temp_bot = telebot.TeleBot(STORE_BOT_TOKEN)
                # Censor username
                if not username or username == "Unknown":
                    censored_user = "Unknown"
                else:
                    if len(username) > 3:
                        censored_user = username[0] + ("*" * (len(username) - 3)) + username[-2:]
                    else:
                        censored_user = username[0] + ("*" * (len(username) - 1))
                        
                now = datetime.now()
                dt_str = now.strftime('%I:%M %p, %d %b %Y')
                
                stock_msg = f"🔥 *Stock Left:* Only {remaining_stock} remaining!" if remaining_stock > 0 else "🔥 *Stock Left:* Out of Stock!"
                
                msg = (
                    f"🛍 *New Order Received!* 🛍\n\n"
                    f"👤 *Buyer:* `{censored_user}`\n"
                    f"📦 *Product:* {prod_name}\n"
                    f"💎 *Variant:* {var_name}\n"
                    f"💰 *Paid Amount:* {formatted_paid}\n"
                    f"{stock_msg}\n"
                    f"📅 *Time:* {dt_str}\n\n"
                    f"✅ *Thank you for choosing us!*"
                )
                
                markup = telebot.types.InlineKeyboardMarkup()
                bot_info = temp_bot.get_me()
                markup.add(telebot.types.InlineKeyboardButton("🛒 Buy Now", url=f"https://t.me/{bot_info.username}"))
                
                temp_bot.send_message(GROUP_CHAT_ID, msg, reply_markup=markup, parse_mode="Markdown")
            except Exception as e:
                print(f"Error in broadcast thread: {e}")
                
        threading.Thread(target=_send, daemon=True).start()
    except Exception as e:
        print(f"Error launching broadcast thread: {e}")

def _send_admin_alert(db, msg_text):
    try:
        from manager import ADMIN_BOT_TOKEN
        import telebot
        admin_bot = telebot.TeleBot(ADMIN_BOT_TOKEN)
        admin_ids = db.get('admin_ids', [])
        if db.get('admin_id') and db.get('admin_id') not in admin_ids:
            admin_ids.append(db.get('admin_id'))
            
        for aid in admin_ids:
            try:
                admin_bot.send_message(aid, msg_text, parse_mode="Markdown")
            except: pass
    except Exception as e:
        print(f"Error sending admin alert: {e}")

# --- CASHFREE HELPERS ---

def record_deposit(user_id, username, amount, currency, method, gateway, order_id, status="Pending"):
    db = load_db()
    dep_id = f"DEP_{int(time.time())}_{uuid.uuid4().hex[:4].upper()}"
    new_dep = {
        "deposit_id": dep_id,
        "user_id": user_id,
        "username": username or "Unknown",
        "amount": amount,
        "currency": currency,
        "method": method,
        "gateway": gateway,
        "status": status,
        "timestamp": time.time(),
        "order_id": order_id
    }
    if 'deposits' not in db: db['deposits'] = []
    db['deposits'].append(new_dep)
    save_db(db)
        
    return dep_id

def update_deposit_status(order_id, status):
    db = load_db()
    updated = False
    for d in db.get('deposits', []):
        if d.get('order_id') == order_id:
            d['status'] = status
            updated = True
    if updated:
        save_db(db)

def create_cf_order(amount, user_id):
    """Calls Cashfree Orders API (v2) and returns the direct payment link."""
    url = "https://test.cashfree.com/api/v1/order/create" if get_cf_env() == "SANDBOX" else "https://api.cashfree.com/api/v1/order/create"
    
    order_id = f"ORD_{int(time.time())}_{user_id}"
    payload = {
        "appId": get_cf_client_id(),
        "secretKey": get_cf_secret(),
        "orderId": order_id,
        "orderAmount": float(amount),
        "orderCurrency": "INR",
        "customerEmail": "customer@placeholder.com",
        "customerPhone": "9999999999"
    }
    
    try:
        response = requests.post(url, data=payload, timeout=10) # v2 often uses form-data or direct payload
        res_data = response.json()
        if res_data.get('status') == "OK":
            return res_data.get('paymentLink'), order_id
        else:
            print(f"CF v2 Error: {res_data}")
            return None, None
    except Exception as e:
        print(f"CF v2 Exception: {e}")
        return None, None
    
def check_cf_v2_status(order_id):
    """Verifies payment using v2 API."""
    url = "https://test.cashfree.com/api/v1/order/info/status" if get_cf_env() == "SANDBOX" else "https://api.cashfree.com/api/v1/order/info/status"
    payload = {
        "appId": get_cf_client_id(),
        "secretKey": get_cf_secret(),
        "orderId": order_id
    }
    try:
        response = requests.post(url, data=payload, timeout=10)
        return response.json()
    except Exception as e:
        print(f"CF Status Check Exception: {e}")
        return {}

def create_now_invoice(amount_inr, user_id):
    """Calls NOWPayments API to create a crypto invoice with a 5% fee added."""
    url = "https://api.nowpayments.io/v1/invoice"
    headers = {
        "x-api-key": get_nowpayments_key(),
        "Content-Type": "application/json"
    }
    # 5% Fee Logic: If user enters 100, we bill 105.
    bill_amount = round(amount_inr * 1.05, 2)
    order_id = f"CRYPTO_{int(time.time())}_{user_id}"
    
    payload = {
        "price_amount": bill_amount,
        "price_currency": "inr",
        "order_id": order_id,
        "order_description": f"Deposit for User {user_id}",
        "ipn_callback_url": "http://162.0.211.112:5000/nowpayments_ipn",
        "success_url": "https://t.me/share/url?url=Success", # Placeholder
        "cancel_url": "https://t.me/share/url?url=Cancel"
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        res_data = response.json()
        if 'invoice_url' in res_data:
            return res_data['invoice_url'], res_data['id'], bill_amount, None
        else:
            error_msg = res_data.get('message', 'Unknown Error')
            print(f"NOWPayments Error: {res_data}")
            return None, None, 0, error_msg
    except Exception as e:
        print(f"NOWPayments Exception: {e}")
        return None, None, 0, str(e)

def check_now_status(payment_id):
    """Checks the status of a NOWPayments payment."""
    url = f"https://api.nowpayments.io/v1/payment/{payment_id}"
    headers = {"x-api-key": get_nowpayments_key()}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        return response.json()
    except Exception:
        return {}

# (Redundant verify_binance_pay_transaction duplicate definition removed. Main function is defined below.)

# --- UPI UTR VERIFICATION WEBHOOK ---

def parse_upi_sms(text):
    # Find 12-digit UTR or PhonePe Transaction ID
    utr_match = re.search(r'\b(\d{12}|T\d{10,24})\b', text, re.IGNORECASE)
    if not utr_match:
        # Fallback for other alphanumeric IDs
        utr_match = re.search(r'(?:Ref No|Txn Id|TxnId|ID)[\s:]*([A-Za-z0-9]{10,24})', text, re.IGNORECASE)
        if not utr_match:
            return None, None
    utr = utr_match.group(1).upper()

    # Find Amount
    amount_patterns = [
        r'(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)', # Rs. 100 or Rs. 100.00
        r'credited\s*(?:with\s*)?(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)',
        r'received\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)'
    ]
    
    amount = None
    for pattern in amount_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            val_str = match.group(1).replace(',', '')
            try:
                amount = float(val_str)
                break
            except ValueError:
                continue
                
    # Fallback: if amount not matched by currency symbols, look for general decimal/integer that isn't the UTR
    if amount is None:
        all_numbers = re.findall(r'\b(?:\d+)(?:\.\d{1,2})?\b', text)
        for num in all_numbers:
            if num != utr and len(num) < 10:
                try:
                    val = float(num)
                    if val > 0:
                        amount = val
                        break
                except ValueError:
                    continue
                    
    return utr, amount

@app.route('/upi_webhook', methods=['POST'])
def upi_webhook():
    """
    Webhook to receive SMS notifications from SMS Forwarder app.
    Parses UTR and Amount and logs into MongoDB upi_payments list.
    """
    try:
        data = request.json or request.form.to_dict()
        if not data:
            print("[UPI Webhook] Empty payload received")
            return jsonify({"error": "Empty payload"}), 400
        
        # Extract message text and sender
        sms_text = data.get('message') or data.get('body') or data.get('text') or data.get('msg') or data.get('sms') or ""
        sender = data.get('sender') or data.get('from') or data.get('phone') or "Unknown"
        
        if not sms_text:
            for k, v in data.items():
                if isinstance(v, str) and len(v) > 20:
                    sms_text = v
                    break
        
        if not sms_text:
            print(f"[UPI Webhook] No SMS content found in payload: {data}")
            return jsonify({"error": "No SMS text found"}), 400
            
        print(f"[UPI Webhook] Received SMS: Sender: {sender}, Content: {sms_text}")
        
        # Parse UTR and Amount
        utr, amount = parse_upi_sms(sms_text)
        if not utr or amount is None:
            print(f"[UPI Webhook] Failed to parse transaction details. UTR={utr}, Amount={amount}")
            return jsonify({"status": "failed_to_parse", "sms": sms_text}), 200
            
        # Log in database
        db = load_db()
        if 'upi_payments' not in db:
            db['upi_payments'] = []
            
        # Check if already exists
        exists = any(p.get('utr') == utr for p in db['upi_payments'])
        if exists:
            print(f"[UPI Webhook] UTR {utr} already exists in DB. Skipping.")
            return jsonify({"status": "duplicate", "utr": utr}), 200
            
        new_payment = {
            "utr": utr,
            "amount": float(amount),
            "status": "unclaimed",
            "timestamp": time.time(),
            "sender": sender,
            "raw_sms": sms_text
        }
        db['upi_payments'].append(new_payment)
        save_db(db)
        
        print(f"[UPI Webhook] Successfully logged payment: UTR={utr}, Amount={amount}")
        return jsonify({"status": "success", "utr": utr, "amount": amount}), 200
        
    except Exception as e:
        print(f"[UPI Webhook] Error: {e}")
        return jsonify({"error": str(e)}), 500

# --- NOWPAYMENTS IPN WEBHOOK & VERIFICATION WORKER ---

@app.route('/nowpayments_ipn', methods=['POST'])
def nowpayments_ipn():
    """NOWPayments IPN (Instant Payment Notification) Webhook Endpoint."""
    try:
        data = request.json
        if not data:
            print("[IPN Webhook] Received empty POST request")
            return jsonify({"error": "Empty body"}), 400
        
        payment_id = data.get('payment_id') # Unique transaction ID generated after coin selection
        invoice_id = data.get('invoice_id') # Unique invoice ID (matches our d['payment_id'])
        payment_status = data.get('payment_status')
        order_id = data.get('order_id')
        
        print(f"[IPN Webhook] Received IPN callback: payment_id={payment_id}, invoice_id={invoice_id}, status={payment_status}, order_id={order_id}")
        
        if not invoice_id:
            print("[IPN Webhook] No invoice_id in payload, ignoring.")
            return jsonify({"status": "ignored_no_invoice"}), 200

        # Asynchronously verify the payment and credit the user, responding to NOWPayments inside 3s limit
        threading.Thread(target=verify_and_process_ipn, args=(invoice_id, payment_id, payment_status), daemon=True).start()
        
        return jsonify({"status": "received"}), 200
    except Exception as e:
        print(f"[IPN Webhook] Exception: {e}")
        return jsonify({"error": str(e)}), 500

def verify_and_process_ipn(invoice_id, payment_id, payment_status):
    """Securely verifies the payment status via NOWPayments API and credits the user's balance."""
    global pending_deposits
    try:
        str_invoice_id = str(invoice_id)
        payment_ref = f"NOW_{str_invoice_id}"
        
        with payment_processing_lock:
            # Load the DB
            db = load_db()
            
            # Check if already processed to avoid double spending
            history = load_payments()
            if payment_ref in history:
                print(f"[IPN Webhook] Payment {payment_ref} already processed and credited in the past. Skipping.")
                return
            
            # Find the deposit record in DB
            deposit_rec = None
            for d in db.get('deposits', []):
                if d.get('order_id') == payment_ref:
                    deposit_rec = d
                    break
            
            if not deposit_rec:
                print(f"[IPN Webhook] Deposit record with order_id {payment_ref} not found in database. Skipping.")
                return
            
            # Double check status from NOWPayments API using payment_id (which is 100% secure)
            if payment_id:
                res = check_now_status(payment_id)
                verified_status = res.get('payment_status')
                print(f"[IPN Webhook] Verifying via API: payment_id={payment_id}, verified_status={verified_status}")
            else:
                verified_status = payment_status
                res = {}
                print(f"[IPN Webhook] No payment_id provided in IPN, using payment_status={payment_status}")
                
            if verified_status in ["finished", "confirmed", "partially_paid"]:
                # Credit the user
                uid = deposit_rec['user_id']
                amount = deposit_rec['amount'] # base amount in deposit currency (INR or USD)
                dep_currency = deposit_rec.get('currency', 'INR')
                
                # Convert amount to INR first to ensure ratio calculations use correct values
                amount_inr = amount
                if dep_currency == 'USD':
                    usd_rate = converter.rates.get('USD', 0.012)
                    amount_inr = round(amount / usd_rate, 2)
                
                outcome_amount = res.get('outcome_amount')
                outcome_currency = res.get('outcome_currency')
                actually_paid = res.get('actually_paid')
                pay_amount = res.get('pay_amount')
                
                print(f"[IPN Webhook] Processing credit: user={uid}, base_amount_inr={amount_inr}")
                
                credited_amount = None
                
                # 1. Primary Method: Convert the received payout crypto back to INR at live rates
                if outcome_amount and outcome_currency:
                    estimated_inr = estimate_fiat_amount(outcome_amount, outcome_currency, "inr")
                    if estimated_inr is not None:
                        credited_amount = round(estimated_inr, 2)
                        print(f"[IPN Webhook] Primary estimate success: converted back to fiat = {credited_amount} INR")
                
                # 2. Fallback Method: Ratio-based calculation using (base_amount_inr * 1.05) * (actually_paid / pay_amount)
                if credited_amount is None:
                    if actually_paid and pay_amount and float(pay_amount) > 0:
                        ratio = float(actually_paid) / float(pay_amount)
                        bill_amount = amount_inr * 1.05
                        credited_amount = round(bill_amount * ratio, 2)
                        print(f"[IPN Webhook] Fallback ratio calculation used: ratio={ratio:.4f}, credited_amount={credited_amount} INR")
                    else:
                        print(f"[IPN Webhook] Fallback failed: actually_paid data is missing. Cannot credit safely.")
                        return
                
                final_credit = credited_amount
                
                # Reload DB dynamic to make sure we don't overwrite other data
                db = load_db(force_fetch=True)
                str_uid = str(uid)
                if str_uid in db['users']:
                    user_ref = db['users'][str_uid]
                    user_ref['balance'] += final_credit
                    user_ref['total_deposit'] = user_ref.get('total_deposit', 0.0) + final_credit
                    
                    # Update deposit record status
                    for d in db.get('deposits', []):
                        if d.get('order_id') == payment_ref:
                            # Convert amount back to user's currency for deposit record
                            if dep_currency == 'USD':
                                usd_rate = converter.rates.get('USD', 0.012)
                                d['amount'] = round(final_credit * usd_rate, 2)
                            else:
                                d['amount'] = final_credit
                            d['status'] = "Success"
                            break
                            
                    reward_info = check_and_reward_referrer(db, str_uid)
                    if reward_info:
                        referrer_id, reward_amount = reward_info
                        try:
                            ref_username = user_ref.get('username', 'Unknown')
                            ref_display = f"@{ref_username.replace('_', '-')}" if ref_username != "Unknown" else f"User `{str_uid}`"
                            referrer_user = db['users'][referrer_id]
                            reward_curr = referrer_user.get('currency', 'INR')
                            reward_str = converter.format_price(reward_amount, reward_curr)
                            new_bal_str = converter.format_price(referrer_user.get('balance', 0.0), reward_curr)
                            
                            reward_msg = (
                                f"🎉 *REFERRAL REWARD CREDITED!* 🎉\n"
                                f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                                f"Congratulations! Your referred friend has successfully completed the deposit requirement.\n\n"
                                f"👤 *Referral:* {ref_display} (ID: `{str_uid}`)\n"
                                f"💰 *Reward Credited:* `{reward_str}`\n"
                                f"💳 *New Wallet Balance:* `{new_bal_str}`\n"
                                f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                                f"The reward has been added directly to your wallet balance. You can use it to purchase any store products instantly!"
                            )
                            bot.send_message(int(referrer_id), reward_msg, parse_mode="Markdown")
                        except Exception as e:
                            print(f"Error notifying referrer: {e}")
                            
                    save_db(db)
                    save_payment(payment_ref)
                    update_deposit_status(payment_ref, "Success")
                    
                    # Remove from memory pending_deposits
                    pending_deposits = [pd for pd in pending_deposits if pd.get('payment_id') != str_invoice_id]
                    
                    # Notify User via bot
                    try:
                        credited_str = converter.format_price(final_credit, user_ref['currency'])
                        new_bal_str = converter.format_price(user_ref['balance'], user_ref['currency'])
                        msg_text = (
                            f"💰 *AUTO TOP-UP RECEIVED* 💰\n"
                            f"━━━━━━━━━━━━━━━━━━━━━\n"
                            f"➕ *Added Amount:* `{credited_str}`\n"
                            f"💳 *New Wallet Balance:* `{new_bal_str}`\n"
                            f"━━━━━━━━━━━━━━━━━━━━━\n"
                            f"Your automatic payment has been verified and credited successfully!"
                        )
                        bot.send_message(uid, msg_text, parse_mode='Markdown')
                        print(f"[IPN Webhook] Successfully credited ₹{final_credit} to User {uid} and sent Telegram notification.")
                    except Exception as tg_err:
                        print(f"[IPN Webhook] Failed to send Telegram notification to user {uid}: {tg_err}")
                else:
                    print(f"[IPN Webhook] User {uid} not found in database, cannot credit.")
                    
            elif verified_status in ["failed", "expired", "refunded", "rejected"]:
                # Update deposit status to Failed
                db = load_db(force_fetch=True)
                for d in db.get('deposits', []):
                    if d.get('order_id') == payment_ref:
                        d['status'] = "Failed"
                        break
                save_db(db)
                update_deposit_status(payment_ref, "Failed")
                
                # Remove from memory pending_deposits
                pending_deposits = [pd for pd in pending_deposits if pd.get('payment_id') != str_invoice_id]
                print(f"[IPN Webhook] Payment failed or expired: {payment_ref}. Status updated in DB.")
                
    except Exception as e:
        print(f"[IPN Webhook Internal Error] verify_and_process_ipn failed: {e}")

def estimate_fiat_amount(crypto_amount, crypto_currency, fiat_currency="inr"):
    """Converts a crypto amount (e.g., outcome_amount in btc) back to fiat using NOWPayments estimate endpoint."""
    url = f"https://api.nowpayments.io/v1/estimate?amount={crypto_amount}&currency_from={crypto_currency}&currency_to={fiat_currency}"
    headers = {
        "x-api-key": get_nowpayments_key(),
        "Content-Type": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        res_data = response.json()
        if 'estimated_amount' in res_data:
            return float(res_data['estimated_amount'])
        else:
            print(f"[NOWPayments Estimate] Error response: {res_data}")
    except Exception as e:
        print(f"[NOWPayments Estimate] Exception: {e}")
    return None

_working_binance_proxies = []
_last_proxy_scan_time = 0
_binance_time_offset = 0

def get_binance_proxies():
    """
    Returns a cached list of working proxies or scans for new ones if cache is empty
    or expired (older than 15 minutes).
    """
    global _working_binance_proxies, _last_proxy_scan_time, _binance_time_offset
    import time
    import requests
    import concurrent.futures
    import random

    now = time.time()
    if _working_binance_proxies and (now - _last_proxy_scan_time) < 900: # 15 minutes cache
        return _working_binance_proxies
    
    print("[Binance Pay Proxy] Cached proxies expired or empty. Scanning for working proxies...")
    proxy_urls = [
        "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
        "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt"
    ]
    proxies = []
    for url in proxy_urls:
        try:
            r = requests.get(url, timeout=5)
            if r.status_code == 200:
                proxies.extend(r.text.strip().split("\n"))
        except Exception as e:
            print(f"[Binance Pay Proxy] Error fetching from {url}: {e}")
        
    proxies = list(set([p.strip() for p in proxies if p.strip()]))
    if not proxies:
        return []
    
    def test_single_proxy(proxy):
        proxy_dict = {
            "http": f"http://{proxy}",
            "https": f"http://{proxy}"
        }
        try:
            res = requests.get("https://api.binance.com/api/v3/time", proxies=proxy_dict, timeout=3)
            if res.status_code == 200:
                res_json = res.json()
                server_time = res_json.get('serverTime')
                if server_time:
                    return proxy, server_time - int(time.time() * 1000)
        except Exception:
            pass
        return None
    
    # Shuffle and test first 150 in parallel to find a working one quickly
    random.shuffle(proxies)
    test_subset = proxies[:150]
    working_proxies = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=30) as executor:
        results = executor.map(test_single_proxy, test_subset)
        for r in results:
            if r:
                working_proxies.append(r)
            
    if not working_proxies and len(proxies) > 150:
        # Test next 150
        test_subset_2 = proxies[150:300]
        with concurrent.futures.ThreadPoolExecutor(max_workers=30) as executor:
            results = executor.map(test_single_proxy, test_subset_2)
            for r in results:
                if r:
                    working_proxies.append(r)
                
    if working_proxies:
        _working_binance_proxies = [w[0] for w in working_proxies[:5]]
        _binance_time_offset = working_proxies[0][1]
        _last_proxy_scan_time = now
        print(f"[Binance Pay Proxy] Selected working proxies: {_working_binance_proxies}")
        print(f"[Binance Pay Proxy] Detected server offset: {_binance_time_offset} ms")
    else:
        _working_binance_proxies = []
    
    return list(_working_binance_proxies)

def get_crypto_usd_price(currency):
    currency = currency.upper()
    if currency in ["USDT", "USDC", "BUSD", "USD"]:
        return 1.0
    
    proxies_list = get_binance_proxies()
    for proxy in proxies_list:
        proxy_dict = {"http": f"http://{proxy}", "https": f"http://{proxy}"}
        try:
            res = requests.get(f"https://api.binance.com/api/v3/ticker/price?symbol={currency}USDT", proxies=proxy_dict, timeout=5).json()
            if 'price' in res:
                return float(res['price'])
        except Exception as e:
            print(f"Error fetching {currency}USDT price via proxy {proxy}: {e}")
    
        try:
            res = requests.get(f"https://api.binance.com/api/v3/ticker/price?symbol={currency}USDC", proxies=proxy_dict, timeout=5).json()
            if 'price' in res:
                return float(res['price'])
        except Exception as e:
            print(f"Error fetching {currency}USDC price via proxy {proxy}: {e}")
        
    try:
        res = requests.get(f"https://api.binance.com/api/v3/ticker/price?symbol={currency}USDT", timeout=5).json()
        if 'price' in res:
            return float(res['price'])
    except Exception as e:
        print(f"Error fetching {currency}USDT price directly: {e}")
    
    return 0.0

def verify_binance_pay_transaction(txn_id):
    """
    Queries Binance Pay API to check if a transaction with the given ID (orderId or transactionId) exists,
    is incoming (amount > 0), and returns details.
    Returns: (success_bool, amount, currency, order_id_str, transaction_id_str) or (False, None, None, None, None)
    """
    import hmac
    import hashlib
    url = "https://api.binance.com/sapi/v1/pay/transactions"

    global _working_binance_proxies
    proxies_list = list(get_binance_proxies())

    headers = {
        "X-MBX-APIKEY": get_binance_key()
    }

    for proxy in proxies_list:
        proxy_dict = {
            "http": f"http://{proxy}",
            "https": f"http://{proxy}"
        }
    
        # Calculate fresh signature for each proxy request to prevent timestamp expiration
        timestamp = int(time.time() * 1000) + _binance_time_offset
        query_string = f"timestamp={timestamp}"
    
        signature = hmac.new(
            get_binance_secret().encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
    
        full_url = f"{url}?{query_string}&signature={signature}"
    
        try:
            print(f"[Binance Pay] Querying via proxy: {proxy} with offset {_binance_time_offset} ms")
            response = requests.get(full_url, headers=headers, proxies=proxy_dict, timeout=8)
            if response.status_code == 200:
                res_json = response.json()
                if res_json.get('code') == '000000' and res_json.get('success'):
                    transactions = res_json.get('data', [])
                    txn_id_clean = str(txn_id).strip().lower()
                
                    for txn in transactions:
                        order_id = str(txn.get('orderId', '')).strip().lower()
                        transaction_id = str(txn.get('transactionId', '')).strip().lower()
                    
                        if txn_id_clean == order_id or txn_id_clean == transaction_id:
                            amount_str = txn.get('amount', '0')
                            try:
                                amount = float(amount_str)
                            except ValueError:
                                amount = 0.0
                            
                            if amount > 0:
                                return True, amount, txn.get('currency', 'USDT'), txn.get('orderId'), txn.get('transactionId')
                    return False, None, None, None, None
            else:
                print(f"[Binance Pay] Proxy {proxy} request returned status {response.status_code}")
                print(f"[Binance Pay] Proxy response body: {response.text}")
                if response.status_code != 451 and proxy in _working_binance_proxies:
                    _working_binance_proxies.remove(proxy)
        except Exception as e:
            print(f"[Binance Pay] Proxy {proxy} request failed: {e}")
            if proxy in _working_binance_proxies:
                _working_binance_proxies.remove(proxy)
 
    try:
        print("[Binance Pay] All proxies failed. Trying direct request...")
        timestamp = int(time.time() * 1000) + _binance_time_offset
        query_string = f"timestamp={timestamp}"
        signature = hmac.new(
            get_binance_secret().encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        full_url = f"{url}?{query_string}&signature={signature}"
    
        response = requests.get(full_url, headers=headers, timeout=10)
        if response.status_code == 200:
            res_json = response.json()
            if res_json.get('code') == '000000' and res_json.get('success'):
                transactions = res_json.get('data', [])
                txn_id_clean = str(txn_id).strip().lower()
            
                for txn in transactions:
                    order_id = str(txn.get('orderId', '')).strip().lower()
                    transaction_id = str(txn.get('transactionId', '')).strip().lower()
                
                    if txn_id_clean == order_id or txn_id_clean == transaction_id:
                        amount_str = txn.get('amount', '0')
                        try:
                            amount = float(amount_str)
                        except ValueError:
                            amount = 0.0
                        
                        if amount > 0:
                            return True, amount, txn.get('currency', 'USDT'), txn.get('orderId'), txn.get('transactionId')
    except Exception as e:
        print(f"[Binance Pay] Direct request failed: {e}")
    
    return False, None, None, None, None

def generate_deposit_invoice(chat_id, amount, method, user, currency, edit_msg_id=None):
    """Generates crypto or UPI deposit invoices and updates state/DB."""
    try:
        # Delete selection message to keep chat clean
        if edit_msg_id:
            try: bot.delete_message(chat_id, edit_msg_id)
            except: pass

        if method == 'crypto':
            min_limit = 500 if currency == "INR" else 5
            symbol = "₹" if currency == "INR" else "$"
            if amount < min_limit:
                bot.send_message(chat_id, f"⚠️ *Minimum Crypto Deposit is {symbol}{min_limit}.* Please try again.", reply_markup=build_reply_keyboard())
                return
        
            # Determine the transaction currency
            tx_currency = "INR" if currency == "INR" else "USD"
        
            # Convert to INR for the invoice and balance if entered in USD
            amount_inr = amount
            if tx_currency == "USD":
                usd_rate = converter.rates.get('USD', 0.012)
                amount_inr = round(amount / usd_rate, 2)
        
            bot.send_message(chat_id, f"⏳ Generating Crypto invoice for {amount} {tx_currency} (5% Fee included)...", reply_markup=build_reply_keyboard())
            payment_url, payment_id, bill_amt, err = create_now_invoice(amount_inr, chat_id)
        
            if payment_url:
                markup = InlineKeyboardMarkup(row_width=1)
                markup.add(InlineKeyboardButton("🪙 Pay with Crypto", url=payment_url))
            
                symbol = "₹" if tx_currency == "INR" else "$"
                text = (
                    f"🪙 *Crypto Invoice*\n\n"
                    f"• Deposit Amount: {symbol}{amount}\n"
                    f"• Network Fee (5%): {symbol}{round(amount * 0.05, 2)}\n"
                    f"• Total Payable: *{symbol}{bill_amt if tx_currency == 'INR' else round(amount * 1.05, 2)}*\n"
                    f"• Invoice ID: `{payment_id}`\n\n"
                    f"Click the button below to complete payment."
                )
                bot.send_message(chat_id, text, reply_markup=markup, parse_mode='Markdown')
            
                pending_deposits.append({
                    'gateway': 'nowpayments',
                    'payment_id': payment_id,
                    'user_id': chat_id,
                    'amount': amount_inr, 
                    'start_ts': time.time()
                })
            
                record_deposit(chat_id, user.get('username'), amount, tx_currency, "CRYPTO", "nowpayments", f"NOW_{payment_id}")
            else:
                msg_text = f"❌ *Payment Error*\n\nReason: `{err}`\n\nTip: Try depositing a higher amount (e.g. ₹1000) as some crypto networks have higher minimum limits."
                bot.send_message(chat_id, msg_text, parse_mode='Markdown')
        
            return

        if method == 'upi_qr':
            # UPI QR Flow
            # Record in detailed history as Pending - UPI is always INR
            order_id = f"UPI_QR_PENDING_{chat_id}_{int(time.time())}"
            record_deposit(chat_id, user.get('username'), amount, "INR", "UPI_QR", "UPI_QR", order_id, status="Pending")

            # Format instruction text
            instruction_text = (
                f"🇮🇳 *UPI QR Deposit (Auto Verification)*\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"💵 *Amount to Pay:* `₹{amount:.2f}`\n"
                f"📱 *UPI ID:* `{get_upi_id()}`\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"👉 **Instructions:**\n"
                f"1️⃣ Scan the QR code or copy the UPI ID above.\n"
                f"2️⃣ Open any UPI app (PhonePe, Paytm, GooglePay, etc.) and complete the payment of **₹{amount:.2f}**.\n"
                f"3️⃣ After payment, copy the **Transaction ID** from the receipt.\n"
                f"4️⃣ **Paste the Transaction ID here below** to verify and credit your wallet.\n\n"
                f"⏳ *Note: You must complete this payment and enter the ID within 1 hour. Otherwise, the deposit will be cancelled.*\n\n"
                f"✍️ *Please enter/paste the Transaction ID now:* "
            )

            markup = InlineKeyboardMarkup()
            markup.row(InlineKeyboardButton("❌ Cancel Deposit", callback_data="dep_amt:cancel"))

            try:
                # Send the QR code photo
                if os.path.exists(UPI_QR_IMAGE):
                    with open(UPI_QR_IMAGE, "rb") as photo:
                        msg = bot.send_photo(chat_id, photo, caption=instruction_text, reply_markup=markup, parse_mode='Markdown')
                else:
                    # Fallback if image not found
                    msg = bot.send_message(chat_id, instruction_text, reply_markup=markup, parse_mode='Markdown')
                
                pending_orders[chat_id] = {
                    'type': 'deposit',
                    'step': 'waiting_for_utr',
                    'method': 'upi_qr',
                    'intended_amount': amount,
                    'order_id': order_id,
                    'msg_id': msg.message_id
                }
                bot.register_next_step_handler(msg, process_deposit_steps)
            
            except Exception as photo_err:
                print(f"Error sending UPI photo: {photo_err}")
                msg = bot.send_message(chat_id, instruction_text, reply_markup=markup, parse_mode='Markdown')
                pending_orders[chat_id] = {
                    'type': 'deposit',
                    'step': 'waiting_for_utr',
                    'method': 'upi_qr',
                    'intended_amount': amount,
                    'order_id': order_id,
                    'msg_id': msg.message_id
                }
                bot.register_next_step_handler(msg, process_deposit_steps)
            return

        # Cashfree UPI Flow (for method == 'inr')
        bot.send_message(chat_id, "⏳ Generating payment link...", reply_markup=build_reply_keyboard())
        payment_url, order_id = create_cf_order(amount, chat_id)
        markup = InlineKeyboardMarkup(row_width=1)
        markup.add(
            InlineKeyboardButton("💳 Pay via UPI", url=payment_url)
        )
    
        text = (
            f"💳 *UPI Invoice*\n\n"
            f"• Deposit Amount: ₹{amount}\n"
            f"• Order ID: `{order_id}`\n\n"
            f"Click the button below to complete payment."
        )
        if payment_url:
            bot.send_message(chat_id, text, reply_markup=markup, parse_mode='Markdown')
        
            # Register for automatic monitoring
            pending_deposits.append({
                'gateway': 'cashfree',
                'order_id': order_id,
                'user_id': chat_id,
                'amount': amount,
                'start_ts': time.time()
            })
        
            # Record in detailed history - UPI is always INR
            record_deposit(chat_id, user.get('username'), amount, "INR", "UPI", "cashfree", order_id)
        else:
            bot.send_message(chat_id, "❌ Error creating order. Please ensure your API keys are correct and 'Hosted Checkout' is enabled in Cashfree.")

    except Exception as e:
        print(f"Error in generate_deposit_invoice: {e}")
        bot.send_message(chat_id, "❌ Something went wrong generating your invoice. Please try again.")

def process_deposit_steps(message):
    global db
    db = load_db()
    chat_id = message.chat.id
    str_cid = str(chat_id)
    user = db['users'].get(str_cid, {})
    currency = user.get('currency', 'INR')

    if not message.text:
        return
    
    # Handle cancellation
    val = message.text.strip().lower()
    if val in ['cancel', '❌ cancel']:
        pending_orders.pop(chat_id, None)
        return bot.send_message(chat_id, "❌ Deposit cancelled.", reply_markup=build_reply_keyboard())
    
    if is_main_menu_button(message.text):
        pending_orders.pop(chat_id, None)
        return handle_text_menus(message)
    
    state = pending_orders.get(chat_id)
    if not state or state['type'] != 'deposit': return

    if state['step'] == 'amount':
        try:
            # Clean input by stripping symbols like ₹, $
            clean_text = message.text.strip().replace('₹', '').replace('$', '').strip()
            amount = float(clean_text)
            if amount < 1: raise ValueError
        
            msg_id = state.get('msg_id')
            pending_orders.pop(chat_id, None)
        
            generate_deposit_invoice(chat_id, amount, state.get('method'), user, currency, edit_msg_id=msg_id)
        
        except ValueError:
            msg = bot.send_message(chat_id, "❌ Invalid amount. Please enter a valid number:")
            bot.register_next_step_handler(msg, process_deposit_steps)

    elif state['step'] == 'waiting_for_utr':
        # Enforce 1-hour time limit
        try:
            order_id = state.get('order_id', '')
            timestamp = int(order_id.split('_')[-1])
            if time.time() - timestamp > 3600:
                bot.send_message(chat_id, "❌ *Deposit Expired.* You exceeded the 1-hour time limit. This deposit has been cancelled.", parse_mode="Markdown", reply_markup=build_reply_keyboard())
                db = load_db()
                for d in db.get('deposits', []):
                    if d.get('order_id') == order_id:
                        d['status'] = 'Failed'
                save_db(db)
                pending_orders.pop(chat_id, None)
                return
        except Exception:
            pass

        utr = message.text.strip()
    
        # Validate Transaction ID format (10 to 24 characters, alphanumeric)
        if len(utr) < 10 or len(utr) > 24 or not utr.isalnum():
            msg = bot.send_message(
                chat_id, 
                "❌ *Invalid ID.* It must be a valid **Transaction ID**.\n\nPlease check the receipt and paste it again (or type 'cancel'):", 
                parse_mode="Markdown"
            )
            bot.register_next_step_handler(msg, process_deposit_steps)
            return

        # UTR is valid. Check database for unclaimed matches
        db = load_db()
        upi_payments = db.get('upi_payments', [])
    
        matching_payment = None
        for p in upi_payments:
            if p.get('utr') == utr:
                matching_payment = p
                break
            
        if not matching_payment:
            # Payment not received or logged yet
            msg = bot.send_message(
                chat_id,
                f"⏳ *Payment Verification Pending*\n\n"
                f"We haven't detected a payment for Transaction ID `{utr}` yet.\n"
                f"• It usually takes 1-2 minutes for bank SMS to arrive.\n"
                f"• Please wait a minute and paste the Transaction ID again here:\n\n"
                f"*Type 'cancel' to exit.*",
                parse_mode="Markdown"
            )
            bot.register_next_step_handler(msg, process_deposit_steps)
            return
        
        if matching_payment.get('status') != 'unclaimed':
            # Payment already claimed
            bot.send_message(
                chat_id,
                f"❌ *This Transaction ID ({utr}) has already been claimed.*",
                parse_mode="Markdown",
                reply_markup=build_reply_keyboard()
            )
            pending_orders.pop(chat_id, None)
            return
        
        # Success! Process payment
        actual_amount = matching_payment.get('amount', state.get('intended_amount', 0))
    
        # Credit user wallet
        user_ref = db['users'].get(str_cid)
        if user_ref:
            credit_amount_inr = actual_amount
            user_ref['balance'] = round(user_ref.get('balance', 0.0) + credit_amount_inr, 2)
            user_ref['total_deposit'] = round(user_ref.get('total_deposit', 0.0) + credit_amount_inr, 2)
        
            # Mark UTR as claimed
            matching_payment['status'] = 'claimed'
            matching_payment['claimed_by'] = chat_id
            matching_payment['claim_time'] = time.time()
        
            # Find and update the pending deposit record in DB
            db_order_id = state.get('order_id')
            found_dep = False
            for d in db.get('deposits', []):
                if d.get('order_id') == db_order_id:
                    d['status'] = 'Success'
                    d['amount'] = credit_amount_inr
                    d['order_id'] = f"UPI_{utr}"
                    found_dep = True
                    break
        
            if not found_dep:
                record_deposit(chat_id, user.get('username'), credit_amount_inr, "INR", "UPI", "UPI_QR", f"UPI_{utr}", status="Success")
            
            # Trigger referral system checks
            reward_info = check_and_reward_referrer(db, str_cid)
            if reward_info:
                referrer_id, reward_amount = reward_info
                try:
                    ref_username = user_ref.get('username', 'Unknown')
                    ref_display = f"@{ref_username.replace('_', '-')}" if ref_username != "Unknown" else f"User `{chat_id}`"
                    referrer_user = db['users'][referrer_id]
                    reward_curr = referrer_user.get('currency', 'INR')
                    reward_str = converter.format_price(reward_amount, reward_curr)
                    new_bal_str = converter.format_price(referrer_user.get('balance', 0.0), reward_curr)
                
                    reward_msg = (
                        f"🎉 *REFERRAL REWARD CREDITED!* 🎉\n"
                        f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                        f"Congratulations! Your referred friend has successfully completed the deposit requirement.\n\n"
                        f"👤 *Referral:* {ref_display} (ID: `{chat_id}`)\n"
                        f"💰 *Reward Credited:* `{reward_str}`\n"
                        f"💳 *New Wallet Balance:* `{new_bal_str}`\n"
                        f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                        f"The reward has been added directly to your wallet balance. You can use it to purchase any store products instantly!"
                    )
                    bot.send_message(int(referrer_id), reward_msg, parse_mode="Markdown")
                except Exception as ref_err:
                    print(f"Error notifying referrer: {ref_err}")
                
            save_db(db)
        
            new_bal_str = converter.format_price(user_ref['balance'], currency)
            success_msg = (
                f"✅ *Deposit Successful!* \n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"• Transaction ID: `{utr}`\n"
                f"• Amount Credited: *{converter.format_price(credit_amount_inr, currency)}*\n"
                f"• New Wallet Balance: *{new_bal_str}*\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"Your deposit has been verified and credited successfully!"
            )
            bot.send_message(chat_id, success_msg, parse_mode="Markdown", reply_markup=build_reply_keyboard())
        
            # Clear pending order state
            pending_orders.pop(chat_id, None)
        else:
            bot.send_message(chat_id, "❌ Error retrieving user account. Please contact support.")
            pending_orders.pop(chat_id, None)

    elif state['step'] == 'waiting_for_binance_txn':
        # Enforce 1-hour time limit
        try:
            order_id = state.get('order_id', '')
            timestamp = int(order_id.split('_')[-1])
            if time.time() - timestamp > 3600:
                bot.send_message(chat_id, "❌ *Deposit Expired.* You exceeded the 1-hour time limit. This deposit has been cancelled.", parse_mode="Markdown", reply_markup=build_reply_keyboard())
                db = load_db()
                for d in db.get('deposits', []):
                    if d.get('order_id') == order_id:
                        d['status'] = 'Failed'
                save_db(db)
                pending_orders.pop(chat_id, None)
                return
        except Exception:
            pass

        txn_id = message.text.strip()
    
        # Validate Transaction ID or Order ID format
        clean_check = txn_id.replace('P_', '').replace('p_', '')
        if not clean_check.isalnum() or len(txn_id) < 10 or len(txn_id) > 30:
            msg = bot.send_message(
                chat_id, 
                "❌ *Invalid Transaction ID or Order ID.* Please enter a valid Binance Pay Transaction/Order ID (or type 'cancel'):", 
                parse_mode="Markdown"
            )
            bot.register_next_step_handler(msg, process_deposit_steps)
            return
        
        # Check if transaction ID has already been claimed
        db = load_db()
        for dep in db.get('deposits', []):
            ref_id = dep.get('order_id', '')
            if f"BINANCE_{txn_id.lower()}" in ref_id.lower() or ref_id.lower() == txn_id.lower() or dep.get('tx_id') == txn_id:
                bot.send_message(
                    chat_id,
                    f"❌ *This Binance Transaction ID ({txn_id}) has already been claimed.*",
                    parse_mode="Markdown",
                    reply_markup=build_reply_keyboard()
                )
                pending_orders.pop(chat_id, None)
                return

        # Verify transaction with Binance Pay API
        bot.send_message(chat_id, "🔍 *Verifying transaction with Binance Pay...*", parse_mode="Markdown")
        success, amount, coin_currency, binance_order_id, binance_tx_id = verify_binance_pay_transaction(txn_id)
    
        if not success:
            msg = bot.send_message(
                chat_id,
                f"⏳ *Payment Verification Failed*\n\n"
                f"We couldn't find a successful incoming Binance Pay transaction with ID `{txn_id}`.\n"
                f"• Ensure you copied the correct **Order ID** or **Transaction ID**.\n"
                f"• Payment may take a few seconds to register on the Binance network.\n"
                f"• Please wait a moment and try entering the ID again:\n\n"
                f"*Type 'cancel' to exit.*",
                parse_mode="Markdown"
            )
            bot.register_next_step_handler(msg, process_deposit_steps)
            return
        
        # Check double spending again with verified IDs from Binance API
        for dep in db.get('deposits', []):
            ref_id = dep.get('order_id', '')
            if (binance_order_id and binance_order_id.lower() in ref_id.lower()) or (binance_tx_id and binance_tx_id.lower() in ref_id.lower()):
                bot.send_message(
                    chat_id,
                    f"❌ *This Binance Transaction has already been claimed.*",
                    parse_mode="Markdown",
                    reply_markup=build_reply_keyboard()
                )
                pending_orders.pop(chat_id, None)
                return

        # Credit user wallet
        user_ref = db['users'].get(str_cid)
        if user_ref:
            currency = user_ref.get('currency', 'INR')
            crypto_usd_price = get_crypto_usd_price(coin_currency)
            if crypto_usd_price <= 0:
                crypto_usd_price = 1.0
            
            amount_usd = amount * crypto_usd_price
        
            if amount_usd < 1.0:
                bot.send_message(
                    chat_id,
                    f"❌ *Deposit Rejected (Below Minimum)*\n\nWe detected a Binance Pay transaction of `${amount_usd:.2f}`, but the minimum deposit limit is **$1.00**.\nThis amount has not been credited. Please contact support.",
                    parse_mode="Markdown",
                    reply_markup=build_reply_keyboard()
                )
                pending_orders.pop(chat_id, None)
                return
        
            usd_rate = converter.rates.get('USD', 0.012)
            credit_amount_inr = round(amount_usd / usd_rate, 2)
            
            user_ref['balance'] = round(user_ref.get('balance', 0.0) + credit_amount_inr, 2)
            user_ref['total_deposit'] = round(user_ref.get('total_deposit', 0.0) + credit_amount_inr, 2)
        
            # Update the pending deposit record in DB
            db_order_id = state.get('order_id')
            found_dep = False
            for d in db.get('deposits', []):
                if d.get('order_id') == db_order_id:
                    d['status'] = 'Success'
                    if currency == "USD":
                        d['amount'] = round(amount_usd, 2)
                    else:
                        d['amount'] = credit_amount_inr
                    d['currency'] = currency
                    d['order_id'] = f"BINANCE_{binance_order_id or binance_tx_id or txn_id}"
                    d['tx_id'] = txn_id
                    found_dep = True
                    break
        
            if not found_dep:
                d_amt = round(amount_usd, 2) if currency == "USD" else credit_amount_inr
                record_deposit(chat_id, user.get('username'), d_amt, currency, "BINANCE_PAY", "binance_pay", f"BINANCE_{binance_order_id or binance_tx_id or txn_id}", status="Success")
            
            # Trigger referral system checks
            reward_info = check_and_reward_referrer(db, str_cid)
            if reward_info:
                referrer_id, reward_amount = reward_info
                try:
                    ref_username = user_ref.get('username', 'Unknown')
                    ref_display = f"@{ref_username.replace('_', '-')}" if ref_username != "Unknown" else f"User `{chat_id}`"
                    referrer_user = db['users'][referrer_id]
                    reward_curr = referrer_user.get('currency', 'INR')
                    reward_str = converter.format_price(reward_amount, reward_curr)
                    new_bal_str = converter.format_price(referrer_user.get('balance', 0.0), reward_curr)
                
                    reward_msg = (
                        f"🎉 *REFERRAL REWARD CREDITED!* 🎉\n"
                        f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                        f"Congratulations! Your referred friend has successfully completed the deposit requirement.\n\n"
                        f"👤 *Referral:* {ref_display} (ID: `{chat_id}`)\n"
                        f"💰 *Reward Credited:* `{reward_str}`\n"
                        f"💳 *New Wallet Balance:* `{new_bal_str}`\n"
                        f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                        f"The reward has been added directly to your wallet balance. You can use it to purchase any store products instantly!"
                    )
                    bot.send_message(int(referrer_id), reward_msg, parse_mode="Markdown")
                except Exception as ref_err:
                    print(f"Error notifying referrer: {ref_err}")
                
            save_db(db)
        
            new_bal_str = converter.format_price(user_ref['balance'], currency)
            success_msg = (
                f"✅ *Binance Pay Deposit Successful!* \n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"• Order ID: `{binance_order_id or txn_id}`\n"
                f"• Received Crypto: `{amount} {coin_currency}`\n"
                f"• Amount Credited: *{converter.format_price(credit_amount_inr, currency)}*\n"
                f"• New Wallet Balance: *{new_bal_str}*\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"Your deposit has been verified and credited successfully!"
            )
            bot.send_message(chat_id, success_msg, parse_mode="Markdown", reply_markup=build_reply_keyboard())
            pending_orders.pop(chat_id, None)
        else:
            bot.send_message(chat_id, "❌ Error retrieving user account. Please contact support.")
            pending_orders.pop(chat_id, None)

def build_profile_menu(active_curr="INR"):
    markup = InlineKeyboardMarkup(row_width=2)
    inr_label = "✅ 🇮🇳 INR" if active_curr == "INR" else "🔘 🇮🇳 INR"
    usd_label = "✅ 🇺🇸 USD" if active_curr == "USD" else "🔘 🇺🇸 USD"
    markup.row(
        InlineKeyboardButton(inr_label, callback_data="setcurr_INR"),
        InlineKeyboardButton(usd_label, callback_data="setcurr_USD")
    )
    return markup

# --- SCREEN BUILDERS ---
def show_category_list(call):
    """Entry point for browsing products by category or explore all."""
    markup = build_category_menu()
    text = (
        "🛒 **WELCOME TO QUANTUM SERVICES**\n"
        "───────────────────────────\n"
        "Explore our premium products and digital services. Select a category below or explore the full catalog.\n\n"
        "💡 *Use the buttons below to browse:*"
    )
    try:
        bot.edit_message_text(
            text,
            call.message.chat.id, call.message.message_id,
            reply_markup=markup, parse_mode='Markdown'
        )
    except telebot.apihelper.ApiTelegramException as e:
        if "message is not modified" not in str(e).lower():
            raise e

def show_product_list(call, currency, cat_id=None, page=1):
    """Shows products, filtered by category if provided, with pagination."""
    markup = build_paginated_product_menu(currency, cat_id=cat_id, page=page)

    if cat_id:
        name = db['categories'].get(cat_id, {}).get('name', 'Others') if cat_id != 'others' else "Others"
        emoji = get_p_emoji('category', '📂')
        text = (
            f"{emoji} <b>CATEGORY: {html_escape(name.upper())}</b>\n"
            f"───────────────────────────\n"
            f"Browse our products under this category. Select any item to view its details, variants, and stock:"
        )
    else:
        emoji = get_p_emoji('catalog', '🚀')
        text = (
            f"{emoji} <b>FULL PRODUCT CATALOG</b>\n"
            f"───────────────────────────\n"
            f"Browse our complete list of premium products. Select any item below to view its details and plans:"
        )
    
    try:
        bot.edit_message_text(
            text,
            call.message.chat.id, call.message.message_id,
            reply_markup=markup, parse_mode='HTML'
        )
    except telebot.apihelper.ApiTelegramException as e:
        if "message is not modified" not in str(e).lower():
            raise e

def show_variant_screen(call, p_id, currency, routing_data=""):
    """Shows variants for a given product (Level 2)."""
    prod = db['products'].get(p_id)
    if not prod or not prod.get('is_active', True):
        bot.answer_callback_query(call.id, "Sorry, this product is currently unavailable.", show_alert=True)
        return show_category_list(call)
    
    variants = prod.get('variants', {})
    markup = InlineKeyboardMarkup(row_width=1)

    variant_details_lines = []
    for v_id, v_data in variants.items():
        stock_pool_id = v_data.get('pool_id')
        raw_stock = len(prod.get('stock_pools', {}).get(stock_pool_id, []))
        is_inf = prod.get('infinite_pools', {}).get(stock_pool_id, False)
        is_pre = prod.get('preorder_pools', {}).get(stock_pool_id, False)
        if is_inf or raw_stock > 0:
            stock_disp = "In Stock" if is_inf else f"{raw_stock} In Stock"
        elif is_pre:
            stock_disp = "Pre-Order"
        else:
            stock_disp = "0 In Stock"
    
        original_price = v_data['price']
        disc_price, disc_info = get_active_discount(p_id, original_price, db)
    
        price_in_currency = converter.format_price(original_price, currency)
        if disc_info:
            disc_price_in_currency = converter.format_price(disc_price, currency)
            variant_details_lines.append(f"• <b>{html_escape(v_data['name'])}</b>: <code>{disc_price_in_currency}</code> (Was {price_in_currency}) 🔥 <b>{html_escape(disc_info)}</b> <code>[{stock_disp}]</code>")
            btn_text = f"🔥 {v_data['name']} • {disc_price_in_currency}"
        else:
            variant_details_lines.append(f"• <b>{html_escape(v_data['name'])}</b>: <code>{price_in_currency}</code> <code>[{stock_disp}]</code>")
            btn_text = f"{v_data['name']} • {price_in_currency}"
        
        markup.add(InlineKeyboardButton(
            btn_text,
            callback_data=f"opt:{p_id}:{v_id}:{routing_data}" if routing_data else f"opt:{p_id}:{v_id}"
        ))

    back_cb = ""
    if routing_data.startswith("a:"):
        page = routing_data.split(":")[1]
        back_cb = f"explore_all:{page}"
    elif routing_data.startswith("c:"):
        parts = routing_data.split(":")
        cat_id = parts[1]
        page = parts[2]
        back_cb = f"cat_browse:{cat_id}:{page}"
    elif routing_data.startswith("s:"):
        parts = routing_data.split(":")
        query = parts[1]
        page = parts[2]
        back_cb = f"search_results:{query}:{page}"
    else:
        cat_id = prod.get('category_id') or "others"
        back_cb = f"cat_browse:{cat_id}"
    
    markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=back_cb))

    desc = html_escape(prod.get('description', 'No description available for this product.'))
    variant_details_text = "\n".join(variant_details_lines)

    title_emoji = '🛍️'

    emoji_del = get_p_emoji('delivery', '🚚')
    emoji_proc = get_p_emoji('process', '⚡')
    emoji_time = get_p_emoji('time', '⏱️')
    emoji_desc = get_p_emoji('description', '📝')
    emoji_plans = get_p_emoji('plans', '💎')

    text = (
        f"{title_emoji} <b>{html_escape(prod['name'].upper())}</b>\n"
        f"───────────────────────────\n"
        f"{emoji_del} <b>DELIVERY INFORMATION</b>\n"
        f"───────────────────────────\n"
        f"{emoji_proc} <b>Process</b>: <code>{'Automatic' if prod.get('delivery_process', 'auto') == 'auto' else 'Manual'}</code>\n"
        f"{emoji_time} <b>Time</b>: <code>{html_escape('24-48 Hours' if any(prod.get('preorder_pools', {}).values()) and sum(len(arr) for arr in prod.get('stock_pools', {}).values()) == 0 else prod.get('delivery_time', 'Instant'))}</code>\n\n"
        f"───────────────────────────\n"
        f"{emoji_desc} <b>PRODUCT DESCRIPTION</b>\n"
        f"───────────────────────────\n"
        f"{desc}\n\n"
        f"{emoji_plans} <b>AVAILABLE PLANS &amp; DETAILS</b>\n"
        f"───────────────────────────\n"
        f"{variant_details_text}\n\n"
        f"Select a plan/duration below to proceed:"
    )
    try:
        bot.edit_message_text(
            text,
            call.message.chat.id, call.message.message_id,
            reply_markup=markup, parse_mode='HTML'
        )
    except telebot.apihelper.ApiTelegramException as e:
        if "message is not modified" not in str(e).lower():
            raise e

def show_buy_screen(call, p_id, v_id, currency, balance, routing_data=""):
    """Prompts user to type quantity via chat (Level 3)."""
    prod = db['products'].get(p_id)
    if not prod or not prod.get('is_active', True):
        bot.answer_callback_query(call.id, "Sorry, this product is currently unavailable.", show_alert=True)
        return show_product_list(call, currency)
    
    var = prod['variants'].get(v_id)
    chat_id = call.message.chat.id
    stock_pool_id = var.get('pool_id')
    raw_stock = len(prod.get('stock_pools', {}).get(stock_pool_id, []))
    is_inf = prod.get('infinite_pools', {}).get(stock_pool_id, False)
    is_pre_enabled = prod.get('preorder_pools', {}).get(stock_pool_id, False)
    if is_inf and raw_stock > 0:
        stock_disp = "In Stock"
    elif raw_stock == 0 and is_pre_enabled:
        stock_disp = "Pre-Order Available"
    else:
        stock_disp = f"{raw_stock} available"

    original_price = var['price']
    disc_price, disc_info = get_active_discount(p_id, original_price, db)

    if disc_info:
        price_str = f"{converter.format_price(disc_price, currency)} (Was {converter.format_price(original_price, currency)}) 🔥 {disc_info}"
    else:
        price_str = converter.format_price(original_price, currency)
    
    bal_str = converter.format_price(balance, currency)

    back_cb = f"view:{p_id}:{routing_data}" if routing_data else f"view_{p_id}"

    text = (
        f"🛒 **CHECKOUT**\n"
        f"───────────────────────────\n"
        f"📦 **Product:** `{prod['name']} ({var['name']})`\n"
        f"💰 **Price:** `{price_str} / unit`\n"
        f"📊 **Stock:** `{stock_disp}`\n"
        f"💼 **Your Balance:** `{bal_str}`\n"
        f"───────────────────────────\n"
        f"✏️ *Type the quantity you want to buy (e.g. 1, 2, 3...) and send it:*"
    )
    markup = InlineKeyboardMarkup()
    if not is_inf and raw_stock == 0 and not is_pre_enabled:
        markup.add(InlineKeyboardButton("🔴 Out of Stock", callback_data="view_none"))
    markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=back_cb))

    try:
        sent = bot.edit_message_text(text, chat_id, call.message.message_id, reply_markup=markup, parse_mode='Markdown')
    except telebot.apihelper.ApiTelegramException as e:
        if "message is not modified" not in str(e).lower():
            raise e
        # If not modified, we still need 'sent' to be the original message for registration
        sent = call.message

    if is_inf or raw_stock > 0 or is_pre_enabled:
        # Store context then wait for user to type quantity
        pending_orders[chat_id] = {'p_id': p_id, 'v_id': v_id, 'routing_data': routing_data}
        bot.register_next_step_handler(sent, process_qty_input)


def process_qty_input(message):
    """Handles user typing a quantity number in chat."""
    global db
    db = load_db()
    chat_id = message.chat.id

    # If user pressed a main menu button instead of typing a number, cancel current flow
    if is_main_menu_button(message.text):
        pending_orders.pop(chat_id, None)
        handle_text_menus(message)
        return

    order = pending_orders.get(chat_id)
    if not order:
        return

    p_id = order['p_id']
    v_id = order['v_id']
    routing_data = order.get('routing_data', '')
    prod = db['products'].get(p_id)
    var = prod['variants'].get(v_id)
    user = db['users'].get(str(chat_id), {})
    if user.get('is_frozen', False):
        pending_orders.pop(chat_id, None)
        bot.send_message(chat_id, "❄️ *Your wallet is frozen. You cannot make any purchases.*", parse_mode='Markdown')
        return
    currency = user.get('currency', 'INR')

    try:
        qty = int(message.text.strip())
        if qty <= 0:
            raise ValueError
    except ValueError:
        msg = bot.send_message(chat_id, "❌ Please type a valid number (e.g. 1, 2, 3):")
        bot.register_next_step_handler(msg, process_qty_input)
        return

    stock_pool_id = var.get('pool_id')
    pool_stock = prod.get('stock_pools', {}).get(stock_pool_id, [])
    is_inf = prod.get('infinite_pools', {}).get(stock_pool_id, False)
    is_pre_enabled = prod.get('preorder_pools', {}).get(stock_pool_id, False)
    stock = float('inf') if is_inf else len(pool_stock)
    
    # If not infinite and quantity > stock, allow if it's a 0-stock pre-order
    if qty > stock and not (stock == 0 and is_pre_enabled):
        msg = bot.send_message(chat_id, f"❌ Only *{len(pool_stock)}* items are available. Please enter a lower quantity:", parse_mode='Markdown')
        bot.register_next_step_handler(msg, process_qty_input)
        return

    original_price = var['price']
    disc_price, disc_info = get_active_discount(p_id, original_price, db)
    total_inr = disc_price * qty
    total_str = converter.format_price(total_inr, currency)
    bal_str = converter.format_price(user.get('balance', 0), currency)

    # We do NOT check for insufficient balance here anymore.
    # This allows the user to proceed to the confirmation screen where they can apply a discount coupon.
    # The actual balance check is securely handled during 'buy_confirm'.

    # Show confirmation
    show_order_confirmation(chat_id, None, p_id, v_id, qty)
    pending_orders.pop(chat_id, None)

def process_coupon_code_input(message):
    global db
    db = load_db()
    chat_id = message.chat.id

    # Handle standard menus cancel
    if is_main_menu_button(message.text):
        pending_orders.pop(chat_id, None)
        handle_text_menus(message)
        return

    state = pending_orders.get(chat_id)
    if not state or state.get('type') != 'apply_coupon':
        return
    
    p_id = state['p_id']
    v_id = state['v_id']
    qty = state['qty']
    old_msg_id = state['msg_id']

    # Try deleting the input message to keep chat clean
    try: bot.delete_message(chat_id, message.message_id)
    except: pass

    code_input = message.text.strip().upper() if message.text else ""

    if code_input == "CANCEL":
        pending_orders.pop(chat_id, None)
        show_order_confirmation(chat_id, old_msg_id, p_id, v_id, qty)
        return

    # Check coupon in DB
    coupons = db.get('coupons', {})
    coupon = coupons.get(code_input)

    is_valid = True
    reason = ""

    if not coupon or not coupon.get('is_active', True):
        is_valid = False
        reason = "Coupon code not found or inactive."
    else:
        # Check date validity
        now = time.time()
        start_ts = coupon.get('start_date')
        end_ts = coupon.get('end_date')
        if start_ts and now < start_ts:
            is_valid = False
            reason = "Coupon is not active yet."
        elif end_ts and now > end_ts:
            is_valid = False
            reason = "Coupon has expired."
        
        # Check product target
        target_type = coupon.get('target_type', 'all')
        if target_type == 'specific':
            if p_id not in coupon.get('target_products', []):
                is_valid = False
                reason = "This coupon is not valid for the selected product."
            
        # Check per-user limit
        per_user_limit = coupon.get('per_user_limit', -1)
        if per_user_limit != -1:
            user_uses = sum(1 for s in db.get('sales', []) if s.get('user_id') == chat_id and s.get('coupon_code') == code_input)
            if user_uses >= per_user_limit:
                is_valid = False
                reason = f"You have already reached the use limit of {per_user_limit} times for this coupon."
            
        # Check max uses
        max_uses = coupon.get('max_uses', -1)
        used_count = coupon.get('used_count', 0)
        if max_uses != -1 and used_count >= max_uses:
            is_valid = False
            reason = "This coupon has reached its maximum usage limit."

    if not is_valid:
        pending_orders.pop(chat_id, None)
        bot.send_message(chat_id, f"❌ **Invalid Coupon**: {reason}")
        show_order_confirmation(chat_id, old_msg_id, p_id, v_id, qty)
        return

    # Coupon is valid! Apply discount
    pending_orders.pop(chat_id, None)

    try:
        bot.delete_message(chat_id, old_msg_id)
    except:
        pass
    
    show_order_confirmation(chat_id, None, p_id, v_id, qty, coupon_code=code_input)


# --- COMMANDS ---
def send_variant_screen_new_msg(message, p_id, currency):
    prod = db['products'].get(p_id)
    if not prod or not prod.get('is_active', True):
        bot.send_message(message.chat.id, "Sorry, this product is currently unavailable.", parse_mode='Markdown')
        return
    
    variants = prod.get('variants', {})
    markup = InlineKeyboardMarkup(row_width=1)

    variant_details_lines = []
    for v_id, v_data in variants.items():
        stock_pool_id = v_data.get('pool_id')
        raw_stock = len(prod.get('stock_pools', {}).get(stock_pool_id, []))
        is_inf = prod.get('infinite_pools', {}).get(stock_pool_id, False)
        is_pre = prod.get('preorder_pools', {}).get(stock_pool_id, False)
        if is_inf or raw_stock > 0:
            stock_disp = "In Stock" if is_inf else f"{raw_stock} In Stock"
        elif is_pre:
            stock_disp = "Pre-Order"
        else:
            stock_disp = "0 In Stock"
    
        original_price = v_data['price']
        disc_price, disc_info = get_active_discount(p_id, original_price, db)
    
        price_in_currency = converter.format_price(original_price, currency)
        if disc_info:
            disc_price_in_currency = converter.format_price(disc_price, currency)
            variant_details_lines.append(f"• *{v_data['name']}*: `{disc_price_in_currency}` (Was {price_in_currency}) 🔥 *{disc_info}* `[{stock_disp}]`")
            btn_text = f"🔥 {v_data['name']} • {disc_price_in_currency}"
        else:
            variant_details_lines.append(f"• *{v_data['name']}*: `{price_in_currency}` `[{stock_disp}]`")
            btn_text = f"{v_data['name']} • {price_in_currency}"
        
        markup.add(InlineKeyboardButton(
            btn_text,
            callback_data=f"opt:{p_id}:{v_id}"
        ))

    cat_id = prod.get('category_id') or "others"
    markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"cat_browse:{cat_id}"))

    desc = html_escape(prod.get('description', 'No description available for this product.'))
    variant_details_text = "\n".join(variant_details_lines)

    text = (
        f"🛍️ **{prod['name'].upper()}**\n"
        f"───────────────────────────\n"
        f"🚚 **DELIVERY INFORMATION**\n"
        f"───────────────────────────\n"
        f"⚡ **Process**: `{'Automatic' if prod.get('delivery_process', 'auto') == 'auto' else 'Manual'}`\n"
        f"⏱️ **Time**: `{'24-48 Hours' if any(prod.get('preorder_pools', {}).values()) and sum(len(arr) for arr in prod.get('stock_pools', {}).values()) == 0 else prod.get('delivery_time', 'Instant')}`\n\n"
        f"───────────────────────────\n"
        f"📝 **PRODUCT DESCRIPTION**\n"
        f"───────────────────────────\n"
        f"{desc}\n\n"
        f"💎 **AVAILABLE PLANS & DETAILS**\n"
        f"───────────────────────────\n"
        f"{variant_details_text}\n\n"
        f"Select a plan/duration below to proceed:"
    )
    bot.send_message(
        message.chat.id,
        text,
        reply_markup=markup, parse_mode='Markdown'
    )

@bot.message_handler(commands=['start'])
def send_welcome(message):
    global db
    db = load_db()
    user_id = message.from_user.id

    args = message.text.split()
    payload = args[1] if len(args) > 1 else None

    # Tiny delay to allow connection to stabilize 
    time.sleep(0.5)

    is_new = str(user_id) not in db.get('users', {})

    if is_new:
        user_ref = get_user(message.from_user)
        if payload and payload.startswith("ref_") and db.get('referral_enabled', True):
            try:
                referrer_id = payload.split("_")[1]
                if str(referrer_id) in db.get('users', {}) and str(referrer_id) != str(user_id):
                    user_ref['referred_by'] = str(referrer_id)
                    user_ref['referral_reward_claimed'] = False
                
                    referrer = db['users'][str(referrer_id)]
                    referrer['total_referred'] = referrer.get('total_referred', 0) + 1
                    save_db(db)
                
                    try:
                        ref_username = message.from_user.username
                        ref_display = f"@{ref_username.replace('_', '-')}" if ref_username else f"User `{user_id}`"
                        min_dep_inr = db.get('referral_min_deposit', 100.0)
                        reward_inr = db.get('referral_reward', 20.0)
                        ref_curr = referrer.get('currency', 'INR')
                        min_dep_str = converter.format_price(min_dep_inr, ref_curr)
                        reward_str = converter.format_price(reward_inr, ref_curr)
                    
                        signup_msg = (
                            f"🔔 *NEW REFERRAL REGISTERED*\n"
                            f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                            f"Great news! A new user has joined the bot using your exclusive invitation link.\n\n"
                            f"👤 *User:* {ref_display} (ID: `{user_id}`)\n"
                            f"🎯 *Status:* Pending Deposit\n"
                            f"💰 *Potential Reward:* `{reward_str}`\n\n"
                            f"💡 *Requirement:* Once they complete a cumulative deposit of **{min_dep_str}** or more, the reward will be instantly credited to your wallet balance!\n"
                            f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                            f"Thank you for growing our community! Keep sharing to earn more."
                        )
                        bot.send_message(int(referrer_id), signup_msg, parse_mode="Markdown")
                    except:
                        pass
            except Exception as e:
                print(f"Error processing referral start: {e}")

    is_member = check_membership(user_id)
    if not is_member:
        try:
            bot.send_message(message.chat.id, "👋 Welcome!", reply_markup=build_reply_keyboard())
        except: pass
    
        membership_required_screen(message.chat.id)
        return
    
    if is_new:
        try:
            bot.send_message(message.chat.id, "👋 Welcome!", reply_markup=build_reply_keyboard())
        except: pass
    
        success_text = (
            "🎉 **WELCOME TO QUANTUM SERVICES**\n"
            "───────────────────────────\n"
            "Please select your preferred store currency below to activate your account:\n\n"
            "💡 *Note:* You can always change your store currency later from the *👑 My Profile* section."
        )
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("🇮🇳 INR", callback_data="setcurr_INR"),
            InlineKeyboardButton("🇺🇸 USD", callback_data="setcurr_USD")
        )
        bot.send_message(message.chat.id, success_text, reply_markup=markup, parse_mode='Markdown')
        return
    
    # User is member
    if payload and payload.startswith("p-"):
        # Make sure bottom menu is active
        try:
            bot.send_message(message.chat.id, "Here is the product you requested:", reply_markup=build_reply_keyboard())
        except: pass
        user = get_user(message.from_user)
        currency = user.get('currency', 'INR')
        send_variant_screen_new_msg(message, payload, currency)
    else:
        # 1. First Welcome Message: Greeting + ENABLES Bottom Menu (Reply Keyboard)
        welcome_text = (
            "👑 **WELCOME TO QUANTUM SERVICES** 👑\n"
            "───────────────────────────\n"
            "Your premium gateway for digital products, accounts, and subscriptions with instant automatic delivery!\n\n"
            "💎 **KEY BENEFITS**\n"
            "───────────────────────────\n"
            "🌟 *Premium, Checked Products*\n"
            "⚡ *Instant Automated Delivery*\n"
            "🛡️ *Secure & Trusted Payments* \n"
            "🕒 *24/7 Dedicated Support*\n\n"
            "🚀 *Use the menu below to explore and get started!*"
        )
        try:
            bot.send_message(message.chat.id, welcome_text, reply_markup=build_reply_keyboard(), parse_mode='Markdown')
        except telebot.apihelper.ApiTelegramException as e:
            if e.error_code == 403:
                print(f"🚫 User {message.chat.id} blocked the bot. Message not sent.")
                return
            raise e


# --- CALLBACK ROUTER ---
@bot.callback_query_handler(func=lambda call: True)
def handle_callbacks(call):
    global db
    db = load_db()

    if call.data == 'tutorials_menu':
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🟢 How to Top Up", callback_data="view_tut_how_to_topup"))
        markup.add(InlineKeyboardButton("🛒 How to Buy", callback_data="view_tut_how_to_buy"))
        markup.add(InlineKeyboardButton("🛠 Product Support", callback_data="view_tut_product_support"))
        markup.add(InlineKeyboardButton("👨‍💻 Admin Support", callback_data="view_tut_admin_support"))
        bot.edit_message_text("📖 *Tutorials & Guides*\n\nSelect a topic below to learn how to use the bot:", chat_id=call.message.chat.id, message_id=call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    if call.data.startswith('view_tut_'):
        tut_id = call.data.replace('view_tut_', '')
        tutorials = db.get('tutorials', {})
        tut_text = tutorials.get(tut_id, "_Tutorial not found_")
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 Back to Tutorials", callback_data="tutorials_menu"))
        bot.edit_message_text(tut_text, chat_id=call.message.chat.id, message_id=call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    chat_id = call.message.chat.id
    # CRITICAL: Clear any pending text input handlers when an inline button is clicked
    bot.clear_step_handler_by_chat_id(chat_id)

    str_chat_id = str(chat_id)
    data = call.data
    user = get_user(call.from_user)
    currency = user['currency']

    # --- MEMBERSHIP CHECK ---
    if data == "check_joined":
        if check_membership(chat_id, bypass_cache=True):
            bot.answer_callback_query(call.id, "✅ Thank you for joining!")
        
            success_text = (
                "🎉 *Thank you for joining!*\n"
                "Your access has been activated. Please select your preferred store currency below:\n\n"
                "💡 *Note:* You can always change your store currency later from the *👑 My Profile* section."
            )
        
            markup = InlineKeyboardMarkup(row_width=2)
            markup.add(
                InlineKeyboardButton("🇮🇳 INR", callback_data="setcurr_INR"),
                InlineKeyboardButton("🇺🇸 USD", callback_data="setcurr_USD")
            )
        
            bot.send_message(chat_id, success_text, reply_markup=markup, parse_mode='Markdown')
        
            try: bot.delete_message(chat_id, call.message.message_id)
            except: pass
        else:
            bot.answer_callback_query(call.id, "❌ Please join the channel first!", show_alert=True)
        return

    # Gate all other callbacks
    if not check_membership(chat_id):
        bot.answer_callback_query(call.id, "⚠️ Channel membership required!")
        membership_required_screen(chat_id, is_callback=True)
        return
    bot.answer_callback_query(call.id)

    # --- DEPOSIT QUICK AMOUNT SELECT ---
    if data.startswith("dep_amt:"):
        amt_val = data.split(":")[1]
        state = pending_orders.get(chat_id)
        if not state or state['type'] != 'deposit':
            bot.answer_callback_query(call.id, "❌ Session expired or invalid.", show_alert=True)
            try: bot.delete_message(chat_id, call.message.message_id)
            except: pass
            return
        
        bot.clear_step_handler_by_chat_id(chat_id)
    
        if amt_val == "cancel":
            pending_orders.pop(chat_id, None)
            try: bot.delete_message(chat_id, call.message.message_id)
            except: pass
            bot.send_message(chat_id, "❌ Deposit cancelled.", reply_markup=build_reply_keyboard())
            return
        
        try:
            amount = float(amt_val)
            method = state.get('method')
            msg_id = state.get('msg_id')
            pending_orders.pop(chat_id, None)
        
            generate_deposit_invoice(chat_id, amount, method, user, currency, edit_msg_id=msg_id)
        except Exception as e:
            bot.send_message(chat_id, f"❌ Error: {e}", reply_markup=build_reply_keyboard())
        return

    # --- DEPOSIT METHOD SELECTION ---
    if data.startswith("dep_meth:"):
        method = data.split(":")[1]
        bot.clear_step_handler_by_chat_id(chat_id)
    
        # Check active status
        methods = db.get('payment_methods', {"cashfree": True, "upi_qr": True, "crypto": True, "binance_pay": True})
        gw_key = "cashfree" if method == "inr" else ("upi_qr" if method == "upi_qr" else ("binance_pay" if method == "binance_pay" else "crypto"))
        if not methods.get(gw_key, True):
            bot.answer_callback_query(call.id, "⚠️ This payment method is currently disabled for maintenance.", show_alert=True)
            return
    
        if method == "crypto":
            symbol = converter.symbols.get(currency, "₹")
            min_val = 500 if currency == "INR" else 5
        
            text = (
                f"🪙 *Deposit via Crypto*\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"• Minimum Deposit: `{symbol}{min_val}`\n"
                f"• Transaction Fee: `5%`\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"👇 *Select a quick amount below or type a custom amount:* "
            )
            markup = InlineKeyboardMarkup(row_width=2)
            if currency == "USD":
                markup.row(
                    InlineKeyboardButton("$10", callback_data="dep_amt:10"),
                    InlineKeyboardButton("$25", callback_data="dep_amt:25")
                )
                markup.row(
                    InlineKeyboardButton("$50", callback_data="dep_amt:50"),
                    InlineKeyboardButton("$100", callback_data="dep_amt:100")
                )
            else:
                markup.row(
                    InlineKeyboardButton("₹500", callback_data="dep_amt:500"),
                    InlineKeyboardButton("₹1000", callback_data="dep_amt:1000")
                )
                markup.row(
                    InlineKeyboardButton("₹2000", callback_data="dep_amt:2000"),
                    InlineKeyboardButton("₹5000", callback_data="dep_amt:5000")
                )
            markup.row(InlineKeyboardButton("❌ Cancel Deposit", callback_data="dep_amt:cancel"))
        
            msg = bot.send_message(chat_id, text, reply_markup=markup, parse_mode='Markdown')
            pending_orders[chat_id] = {'type': 'deposit', 'step': 'amount', 'method': 'crypto', 'msg_id': msg.message_id}
            bot.register_next_step_handler(msg, process_deposit_steps)
            return
        
        elif method == "inr":
            # Cashfree UPI
            symbol = converter.symbols.get(currency, "₹")
            min_val = 1
        
            text = (
                f"💳 *Deposit via UPI*\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"• Minimum Deposit: `{symbol}{min_val}`\n"
                f"• Transaction Fee: `0% (Free)`\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"👇 *Select a quick amount below or type a custom amount:* "
            )
            markup = InlineKeyboardMarkup(row_width=2)
            markup.row(
                InlineKeyboardButton("₹100", callback_data="dep_amt:100"),
                InlineKeyboardButton("₹200", callback_data="dep_amt:200")
            )
            markup.row(
                InlineKeyboardButton("₹500", callback_data="dep_amt:500"),
                InlineKeyboardButton("₹1000", callback_data="dep_amt:1000")
            )
            markup.row(InlineKeyboardButton("❌ Cancel Deposit", callback_data="dep_amt:cancel"))
        
            msg = bot.send_message(chat_id, text, reply_markup=markup, parse_mode='Markdown')
            pending_orders[chat_id] = {'type': 'deposit', 'step': 'amount', 'method': 'inr', 'msg_id': msg.message_id}
            bot.register_next_step_handler(msg, process_deposit_steps)
            return

        elif method == "upi_qr":
            # Direct QR payment, no amount prompt!
            user = get_user(call.from_user)
            order_id = f"UPI_QR_PENDING_{chat_id}_{int(time.time())}"
            record_deposit(chat_id, user.get('username'), 0.0, "INR", "UPI_QR", "UPI_QR", order_id, status="Pending")

            instruction_text = (
                f"🇮🇳 *UPI QR Deposit (Auto Verification)*\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"📱 *UPI ID:* `{get_upi_id()}`\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"👉 **Instructions:**\n"
                f"1️⃣ Scan the QR code or copy the UPI ID above.\n"
                f"2️⃣ Open any UPI app (PhonePe, Paytm, GooglePay, BHIM, etc.) and pay **any amount** of your choice.\n"
                f"3️⃣ After payment, copy the **Transaction ID** from the receipt.\n"
                f"4️⃣ **Paste/Enter the Transaction ID here below** to verify and credit your wallet.\n\n"
                f"⏳ *Note: You must complete this payment and enter the ID within 1 hour. Otherwise, the deposit will be cancelled.*\n\n"
                f"✍️ *Please enter the Transaction ID now:* "
            )

            markup = InlineKeyboardMarkup()
            markup.row(InlineKeyboardButton("❌ Cancel Deposit", callback_data="dep_amt:cancel"))

            try:
                # Send the QR code photo
                if os.path.exists(UPI_QR_IMAGE):
                    with open(UPI_QR_IMAGE, "rb") as photo:
                        msg = bot.send_photo(chat_id, photo, caption=instruction_text, reply_markup=markup, parse_mode='Markdown')
                else:
                    msg = bot.send_message(chat_id, instruction_text, reply_markup=markup, parse_mode='Markdown')
                
                pending_orders[chat_id] = {
                    'type': 'deposit',
                    'step': 'waiting_for_utr',
                    'method': 'upi_qr',
                    'intended_amount': 0.0,
                    'order_id': order_id,
                    'msg_id': msg.message_id
                }
                bot.register_next_step_handler(msg, process_deposit_steps)
            
            except Exception as photo_err:
                print(f"Error sending UPI photo: {photo_err}")
                msg = bot.send_message(chat_id, instruction_text, reply_markup=markup, parse_mode='Markdown')
                pending_orders[chat_id] = {
                    'type': 'deposit',
                    'step': 'waiting_for_utr',
                    'method': 'upi_qr',
                    'intended_amount': 0.0,
                    'order_id': order_id,
                    'msg_id': msg.message_id
                }
                bot.register_next_step_handler(msg, process_deposit_steps)
            return

        elif method == "binance_pay":
            # Direct Binance Pay, no amount prompt!
            user = get_user(call.from_user)
            user_currency = user.get('currency', 'INR')
            order_id = f"BINANCE_PENDING_{chat_id}_{int(time.time())}"
            record_deposit(chat_id, user.get('username'), 0.0, user_currency, "BINANCE_PAY", "binance_pay", order_id, status="Pending")

            instruction_text = (
                f"🪙 *Binance Pay Deposit (Auto-Verification)*\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"🆔 *Binance Pay ID:* `{get_binance_pay_id()}`\n"
                f"👤 *Merchant Name:* `QuantumXD Store Bot`\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"👉 **Instructions:**\n"
                f"1️⃣ Open your Binance App.\n"
                f"2️⃣ Go to **Pay** and select **Send** -> **Binance ID/Pay ID**.\n"
                f"3️⃣ Enter Pay ID: `{get_binance_pay_id()}` and pay **any amount** of your choice.\n"
                f"4️⃣ After payment, copy the **18 or 19-digit Order ID** (or **Transaction ID** starting with `P_`) from your payment details/receipt.\n"
                f"5️⃣ **Paste/Enter the Order ID or Transaction ID here below** to instantly credit your wallet.\n\n"
                f"⏳ *Note: You must complete this payment and enter the Order ID within 1 hour. Otherwise, the deposit will be cancelled.*\n\n"
                f"✍️ *Please enter the Order ID or Transaction ID now:* "
            )

            markup = InlineKeyboardMarkup()
            markup.row(InlineKeyboardButton("❌ Cancel Deposit", callback_data="dep_amt:cancel"))

            msg = bot.send_message(chat_id, instruction_text, reply_markup=markup, parse_mode='Markdown')
        
            pending_orders[chat_id] = {
                'type': 'deposit',
                'step': 'waiting_for_binance_txn',
                'method': 'binance_pay',
                'intended_amount': 0.0,
                'order_id': order_id,
                'msg_id': msg.message_id
            }
            bot.register_next_step_handler(msg, process_deposit_steps)
            return

    elif data.startswith("check_now:"):
        # Relic of manual checking, removing as requested
        bot.answer_callback_query(call.id, "⌛️ Detection is now automatic! Just wait for confirmation.", show_alert=True)
        return

    # --- BACK BUTTONS ---
    if data == "back_categories":
        show_category_list(call)
        return

    elif data == "back_products":
        show_category_list(call) # Point to category list
        return
    
    elif data.startswith("cat_browse:"):
        parts = data.split(":")
        cat_id = parts[1]
        page = int(parts[2]) if len(parts) > 2 else 1
        show_product_list(call, currency, cat_id=cat_id, page=page)
        return

    elif data.startswith("explore_all:"):
        page = int(data.split(":")[1])
        show_product_list(call, currency, cat_id=None, page=page)
        return

    elif data.startswith("search_browse:") or data.startswith("search_results:"):
        parts = data.split(":")
        query = parts[1]
        page = int(parts[2]) if len(parts) > 2 else 1
        show_search_results(call, currency, query, page)
        return

    elif data.startswith("check_pay:"):
        parts = data.split(":")
        order_id = parts[1]
        amount = float(parts[2])
    
        # Verify with Cashfree v2 API
        try:
            res_data = check_cf_v2_status(order_id)
            status = res_data.get('orderStatus')
        
            if status == "PAID":
                history = load_payments()
                if order_id in history:
                    bot.answer_callback_query(call.id, "✅ This payment has already been added to your balance.", show_alert=True)
                else:
                    # Success
                    user_ref = db['users'][str_chat_id]
                    user_ref['balance'] += amount
                    user_ref['total_deposit'] = user_ref.get('total_deposit', 0.0) + amount
                    reward_info = check_and_reward_referrer(db, str_chat_id)
                    if reward_info:
                        referrer_id, reward_amount = reward_info
                        try:
                            ref_username = user_ref.get('username', 'Unknown')
                            ref_display = f"@{ref_username.replace('_', '-')}" if ref_username != "Unknown" else f"User `{str_chat_id}`"
                            referrer_user = db['users'][referrer_id]
                            reward_curr = referrer_user.get('currency', 'INR')
                            reward_str = converter.format_price(reward_amount, reward_curr)
                            new_bal_str = converter.format_price(referrer_user.get('balance', 0.0), reward_curr)
                        
                            reward_msg = (
                                f"🎉 *REFERRAL REWARD CREDITED!* 🎉\n"
                                f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                                f"Congratulations! Your referred friend has successfully completed the deposit requirement.\n\n"
                                f"👤 *Referral:* {ref_display} (ID: `{str_chat_id}`)\n"
                                f"💰 *Reward Credited:* `{reward_str}`\n"
                                f"💳 *New Wallet Balance:* `{new_bal_str}`\n"
                                f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                                f"The reward has been added directly to your wallet balance. You can use it to purchase any store products instantly!"
                            )
                            bot.send_message(int(referrer_id), reward_msg, parse_mode="Markdown")
                        except Exception as e:
                            print(f"Error notifying referrer: {e}")
                    save_db(db)
                    save_payment(order_id)
                    update_deposit_status(order_id, "Success")
                
                    new_bal_str = converter.format_price(user_ref['balance'], currency)
                    msg_text = (
                        f"💰 *PAYMENT SUCCESSFUL* 💰\n"
                        f"━━━━━━━━━━━━━━━━━━━━━\n"
                        f"➕ *Added Amount:* `₹{amount}`\n"
                        f"💳 *New Wallet Balance:* `{new_bal_str}`\n"
                        f"━━━━━━━━━━━━━━━━━━━━━\n"
                        f"Your deposit has been verified and credited successfully!"
                    )
                    bot.send_message(chat_id, msg_text, parse_mode='Markdown')
                    bot.delete_message(chat_id, call.message.message_id)
            else:
                bot.answer_callback_query(call.id, f"❌ Order Status: {status or 'PENDING'}. Please pay first.", show_alert=True)
        except Exception as e:
            bot.answer_callback_query(call.id, "❌ Error verifying payment. Try again later.", show_alert=True)
        return

    # --- CURRENCY CHANGE ---
    elif data.startswith("setcurr_"):
        new_curr = data.split("_")[1]
        db['users'][str_chat_id]['currency'] = new_curr
        save_db(db)
        user = db['users'][str_chat_id]
        now_str = datetime.now(IST).strftime("%I:%M %p, %d %b %Y")
        bal_str = converter.format_price(user['balance'], new_curr)
        dep_str = converter.format_price(user.get('total_deposit', 0.0), new_curr)
        purchases = user.get('total_purchases', 0)
        uname = str(user.get('username', 'Unknown')).replace('_', '-')
        u_name = f"@{uname}" if uname != "Unknown" else "No Username"
    
        status_line = ""
        if user.get('is_frozen', False):
            status_line = "⚠️ **Wallet Status:** `❄️ Frozen (Purchases Disabled)`\n───────────────────────\n"
        
        text = (
            f"👤 **CUSTOMER PROFILE**\n"
            f"───────────────────────\n"
            f"{status_line}"
            f"🆔 **User ID:** `{chat_id}`\n"
            f"👤 **Username:** {u_name}\n\n"
            f"💰 **FINANCIAL OVERVIEW**\n"
            f"───────────────────────\n"
            f"💵 **Current Balance:** `{bal_str}`\n"
            f"💳 **Total Deposited:** `{dep_str}`\n"
            f"📦 **Total Purchases:** `{purchases} orders`\n\n"
            f"⚙️ **PREFERENCES**\n"
            f"───────────────────────\n"
            f"💱 **Display Currency:** `{new_curr}`\n"
            f"🕒 **Last Updated:** `{now_str}`\n\n"
            f"*Select currency to convert your store view:*"
        )
        try:
            bot.edit_message_text(text, chat_id, call.message.message_id, reply_markup=build_profile_menu(new_curr), parse_mode='Markdown')
        except telebot.apihelper.ApiTelegramException as e:
            if "message is not modified" not in str(e).lower():
                raise e

    elif data.startswith("view_user_orders:"):
        p_id = data.split(":")[1]
        show_orders_for_product(call.message, p_id, is_support=False)
        return

    elif data.startswith("view_support_orders:"):
        p_id = data.split(":")[1]
        show_orders_for_product(call.message, p_id, is_support=True)
        return

    elif data == "back_to_support_main":
        bot.delete_message(chat_id, call.message.message_id)
        show_support_menu(call.message)
        return

    elif data == "support_product_menu":
        bot.delete_message(chat_id, call.message.message_id)
        show_support_product_menu(call.message)
        return

    elif data.startswith("support:"):
        sale_id = data.split(":")[1]
        pending_orders[chat_id] = {'support_sale_id': sale_id}
        msg = bot.send_message(chat_id, "💬 **Support Request**\n\nPlease write your issue or question regarding this order down below. Our team will review it shortly:", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_support_issue)
        return

    elif data == "dep_history":
        show_deposit_history(call.message)
        return

    elif data.startswith("dep_support:"):
        dep_id = data.split(":")[1]
        pending_orders[chat_id] = {'support_dep_id': dep_id}
        msg = bot.send_message(chat_id, "💬 **Deposit Support Request**\n\nPlease describe the issue with your deposit (e.g. balance not added). Our team will assist you shortly:", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_deposit_support_issue)
        return

    # --- PRODUCT VIEW (Level 1 → 2) ---
    elif data.startswith("view_") or data.startswith("view:"):
        if data.startswith("view:"):
            parts = data.split(":")
            p_id = parts[1]
            routing_data = ":".join(parts[2:])
        else:
            p_id = data.split("_", 1)[1]
            routing_data = ""
        
        prod = db['products'].get(p_id)
        if not prod:
            return

        variants = prod.get('variants', {})
        if not variants:
            return

        show_variant_screen(call, p_id, currency, routing_data)

    # --- VARIANT SELECT (Level 2 → 3) ---
    elif data.startswith("opt:"):
        if user.get('is_frozen', False):
            bot.answer_callback_query(call.id, "❄️ Your wallet is frozen. You cannot make any purchases.", show_alert=True)
            return
        parts = data.split(":")
        p_id, v_id = parts[1], parts[2]
        routing_data = ":".join(parts[3:]) if len(parts) > 3 else ""
        show_buy_screen(call, p_id, v_id, currency, user['balance'], routing_data)

    # --- FINAL PURCHASE (from confirmation) ---
    elif data.startswith("page_creds:"):
        parts = data.split(":")
        batch_id = parts[1]
        page = int(parts[2])
    
        db = load_db()
        # Find all sales matching this batch_id for this user
        batch_sales = [s for s in db.get('sales', []) if s.get('batch_id') == batch_id and s.get('user_id') == chat_id]
    
        if not batch_sales:
            bot.answer_callback_query(call.id, "Session expired or not found.", show_alert=True)
            return
        
        import math
        items_per_page = 10
        total_items = len(batch_sales)
        total_pages = math.ceil(total_items / items_per_page)
    
        if page < 1: page = 1
        if page > total_pages: page = total_pages
    
        start_idx = (page - 1) * items_per_page
        end_idx = start_idx + items_per_page
        page_sales = batch_sales[start_idx:end_idx]
    
        items_blocks = []
        for i, sale in enumerate(page_sales, start=start_idx + 1):
            items_blocks.append(f"🔑 *Item #{i}:*\n`{sale.get('credentials', '')}`")
        items_text = "\n\n".join(items_blocks)
    
        prod_id = batch_sales[0].get('product_id')
        pool_id = batch_sales[0].get('pool_id')
        prod = db.get('products', {}).get(prod_id, {})
        prod_rules = prod.get('pool_rules', {}).get(pool_id, '').strip()
        if not prod_rules:
            prod_rules = prod.get('rules', '').strip()
        rules_text = f"\n━━━━━━━━━━━━━━━━━━━━━\n📜 *PRODUCT RULES*\n─────────────────────\n{prod_rules}\n" if prod_rules else ""
    
        creds_text = (
            f"🔑 *DELIVERED CREDENTIALS (Page {page} of {total_pages})*\n"
            f"─────────────────────\n"
            f"{items_text}\n"
            f"{rules_text}"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"💡 *Verification Code (OTP)*\n"
            f"If your login requires a verification code (OTP), click the button below to message support immediately."
        )
    
        markup = InlineKeyboardMarkup()
        nav_buttons = []
        if page > 1:
            nav_buttons.append(InlineKeyboardButton("⬅️ Previous", callback_data=f"page_creds:{batch_id}:{page-1}"))
        if page < total_pages:
            nav_buttons.append(InlineKeyboardButton("Next ➡️", callback_data=f"page_creds:{batch_id}:{page+1}"))
        
        if nav_buttons:
            markup.row(*nav_buttons)
        
        last_sale = batch_sales[-1]
        markup.row(InlineKeyboardButton("💬 Contact Support", callback_data=f"support:{last_sale['sale_id']}"))
    
        try:
            bot.edit_message_text(creds_text, chat_id, call.message.message_id, reply_markup=markup, parse_mode='Markdown')
            bot.answer_callback_query(call.id)
            print(f"DEBUG: Successfully navigated to page {page} for batch {batch_id}")
        except Exception as e:
            print(f"DEBUG: page_creds edit error: {e}")
            if "message is not modified" not in str(e).lower():
                bot.answer_callback_query(call.id, "Error loading page.")
            else:
                bot.answer_callback_query(call.id)
        return

    elif data.startswith("apply_coup:"):
        parts = data.split(":")
        p_id, v_id, qty = parts[1], parts[2], int(parts[3])
        pending_orders[chat_id] = {
            'type': 'apply_coupon',
            'p_id': p_id,
            'v_id': v_id,
            'qty': qty,
            'msg_id': call.message.message_id
        }
        msg = bot.send_message(chat_id, "🎟️ **APPLY COUPON**\n\nPlease type your coupon code (e.g., `SAVE10`) and send it to apply your discount:\n\n*Type 'cancel' to return.*", parse_mode="Markdown")
        bot.register_next_step_handler(msg, process_coupon_code_input)
        return

    elif data.startswith("buy_cancel_coupon:"):
        parts = data.split(":")
        p_id, v_id, qty = parts[1], parts[2], int(parts[3])
        show_order_confirmation(chat_id, call.message.message_id, p_id, v_id, qty)
        return

    elif data.startswith("buy:"):
        if chat_id in active_purchases:
            bot.answer_callback_query(call.id, "⏳ Processing your previous request... please wait.", show_alert=True)
            return
        
        if user.get('is_frozen', False):
            bot.answer_callback_query(call.id, "❄️ Your wallet is frozen. You cannot make any purchases.", show_alert=True)
            return
        
        active_purchases.add(chat_id)
        parts = data.split(":")
        p_id, v_id, qty = parts[1], parts[2], int(parts[3])
        coupon_code = parts[4] if len(parts) > 4 else None

        prod = db['products'].get(p_id)
        var = prod['variants'].get(v_id)
    
        pool_id = var.get('pool_id')
        pool_stock = prod.get('stock_pools', {}).get(pool_id, [])

        is_preorder_purchase = False
        is_preorder_enabled = prod.get('preorder_pools', {}).get(pool_id, False)

        if not prod or not var:
            active_purchases.discard(chat_id)
            bot.answer_callback_query(call.id, "Sorry, product not found!", show_alert=True)
            return
            
        if len(pool_stock) < qty:
            if is_preorder_enabled:
                is_preorder_purchase = True
            else:
                active_purchases.discard(chat_id)
                bot.answer_callback_query(call.id, "Sorry, not enough stock!", show_alert=True)
                return

        # Calculate base price with active product discount
        original_price = var['price']
        disc_price, disc_info = get_active_discount(p_id, original_price, db)
        total_inr = disc_price * qty
    
        applied_coupon = None
        coupon_discount = 0.0
        if coupon_code:
            coupon = db.get('coupons', {}).get(coupon_code)
            if coupon and coupon.get('is_active', True):
                # Verify date
                now = time.time()
                start_ts = coupon.get('start_date')
                end_ts = coupon.get('end_date')
                date_ok = not ((start_ts and now < start_ts) or (end_ts and now > end_ts))
            
                # Verify product
                target_type = coupon.get('target_type', 'all')
                prod_ok = not (target_type == 'specific' and p_id not in coupon.get('target_products', []))
            
                # Verify per-user usage limit
                user_ok = True
                per_user_limit = coupon.get('per_user_limit', -1)
                if per_user_limit != -1:
                    user_uses = sum(1 for s in db.get('sales', []) if s.get('user_id') == chat_id and s.get('coupon_code') == coupon_code)
                    if user_uses >= per_user_limit:
                        user_ok = False
                    
                # Verify overall usage limit
                limit_ok = True
                max_uses = coupon.get('max_uses', -1)
                used_count = coupon.get('used_count', 0)
                if max_uses != -1 and used_count >= max_uses:
                    limit_ok = False
                
                if date_ok and prod_ok and limit_ok and user_ok:
                    applied_coupon = coupon
                    val = coupon.get('value', 0.0)
                    if coupon.get('type') == 'percentage':
                        coupon_discount = round(total_inr * (val / 100.0), 2)
                    else:
                        coupon_discount = round(val, 2)
                
                    total_inr = max(0.0, total_inr - coupon_discount)

        if user['balance'] < total_inr:
            active_purchases.discard(chat_id)
            bot.answer_callback_query(call.id, "Insufficient Balance! Please add funds.", show_alert=True)
            return

        db['users'][str_chat_id]['balance'] -= total_inr
        db['users'][str_chat_id]['total_purchases'] += qty
        
        is_inf = prod.get('infinite_pools', {}).get(pool_id, False)
        delivered_items = []
        for _ in range(qty):
            if is_inf and len(pool_stock) > 0:
                delivered_items.append(pool_stock[0])
            elif not is_preorder_purchase and len(pool_stock) > 0:
                delivered_items.append(pool_stock.pop(0))
            elif is_preorder_purchase:
                delivered_items.append("⏳ Pre-Ordered Item (Awaiting Stock)")
    
        # Log every sale to sales.json for admin analytics
        if 'sales' not in db: db['sales'] = []
        import uuid
        now = time.time()
        u_obj = db['users'].get(str_chat_id, {})
    
        # Calculate expiry if product has duration
        duration_months = var.get('duration', 0)
        end_ts = None
        if duration_months > 0:
            end_ts = now + (duration_months * 30 * 24 * 3600)

        batch_id = str(uuid.uuid4())[:8]
        for item in delivered_items:
            db['sales'].append({
                "sale_id": str(uuid.uuid4())[:8],
                "batch_id": batch_id,
                "user_id": chat_id,
                "username": u_obj.get('username', 'Unknown'),
                "product_id": p_id,
                "variant_id": v_id,
                "pool_id": pool_id,
                "product_name": prod['name'],
                "variant_name": var['name'],
                "price": round(total_inr / qty, 2), # actual paid unit price
                "original_price": original_price,
                "coupon_code": coupon_code,
                "coupon_discount": round(coupon_discount / qty, 2) if coupon_code else 0.0,
                "purchase_ts": now,
                "end_ts": end_ts,
                "status": "Pre-Order" if is_preorder_purchase else ("Pending" if prod.get('delivery_process', 'auto') == 'manual' else "Delivered"),
                "credentials": item
            })
        
        if applied_coupon:
            db['coupons'][applied_coupon['code']]['used_count'] = applied_coupon.get('used_count', 0) + 1
            
        save_db(db)
        
        if is_preorder_purchase:
            _send_admin_alert(db, f"📦 **PRE-ORDER RECEIVED!**\n\n👤 **User:** @{u_obj.get('username', 'Unknown')} (`{chat_id}`)\n🛒 **Product:** {prod['name']} ({var['name']})\n📦 **Quantity:** {qty}\n🪪 **Pool ID:** `{pool_id}`\n\nStock is currently empty. This pre-order is waiting for auto-delivery.")

        if prod.get('delivery_process', 'auto') == 'manual' and not is_preorder_purchase:
            _send_admin_alert(db, f"🔔 *New Pending Order!*\n\n👤 *User:* @{u_obj.get('username', 'Unknown')} (`{chat_id}`)\n📦 *Product:* {prod['name']} ({var['name']})\n🔢 *Quantity:* {qty}\n\nPlease review and deliver this order from the Admin Panel.")

        # Trigger group broadcast
        formatted_amount_inr = converter.format_price(total_inr, "INR")
        formatted_amount_usd = converter.format_price(total_inr, "USD")
        formatted_paid = f"{formatted_amount_inr} ({formatted_amount_usd})"
        
        _send_purchase_broadcast_bg(
            username=u_obj.get('username', 'Unknown'),
            prod_name=prod['name'],
            var_name=var['name'],
            formatted_paid=formatted_paid,
            remaining_stock=len(pool_stock)
        )

        final_bal_str = converter.format_price(db['users'][str_chat_id]['balance'], currency)
    
        # MESSAGE 1: Purchase Receipt
        receipt_text = (
            f"🛍️ *PURCHASE SUCCESSFUL* 🛍️\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"📦 *Product:* `{prod['name']} ({var['name']})`\n"
            f"🔢 *Quantity:* `{qty} unit(s)`\n"
            f"💰 *Total Paid:* `{converter.format_price(total_inr, currency)}`\n"
            f"💳 *New Balance:* `{final_bal_str}`\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"💡 *Note:* Your delivered credentials are sent below. You can also view them anytime in your **📦 Order History**.\n"
            f"🙏 *Thank you for shopping with us!*"
        )
    
        bot.answer_callback_query(call.id)
        try:
            bot.edit_message_text(receipt_text, chat_id, call.message.message_id, parse_mode='Markdown')
        except Exception:
            try:
                bot.edit_message_text(receipt_text, chat_id, call.message.message_id, parse_mode=None)
            except Exception:
                bot.send_message(chat_id, receipt_text, parse_mode=None)
    
        # MESSAGE 2: Credentials and Rules
        import math
        items_per_page = 10
        total_pages = math.ceil(len(delivered_items) / items_per_page)
    
        page_items = delivered_items[:items_per_page]
        items_blocks = []
        for i, item in enumerate(page_items, 1):
            items_blocks.append(f"🔑 *Item #{i}:*\n`{item}`")
        items_text = "\n\n".join(items_blocks)
    
        prod_rules = prod.get('pool_rules', {}).get(pool_id, '').strip()
        if not prod_rules:
            prod_rules = prod.get('rules', '').strip()
        rules_text = f"\n━━━━━━━━━━━━━━━━━━━━━\n📜 *PRODUCT RULES*\n─────────────────────\n{prod_rules}\n" if prod_rules else ""

        page_info = f" (Page 1 of {total_pages})" if total_pages > 1 else ""
        creds_text = (
            f"🔑 *DELIVERED CREDENTIALS{page_info}*\n"
            f"─────────────────────\n"
            f"{items_text}\n"
            f"{rules_text}"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"💡 *Verification Code (OTP)*\n"
            f"If your login requires a verification code (OTP), click the button below to message support immediately."
        )
    
        markup = InlineKeyboardMarkup()
        nav_buttons = []
        if total_pages > 1:
            nav_buttons.append(InlineKeyboardButton("➡️ Next Page", callback_data=f"page_creds:{batch_id}:2"))
    
        if nav_buttons:
            markup.row(*nav_buttons)
        
        last_sale = db['sales'][-1]
        markup.row(InlineKeyboardButton("💬 Contact Support", callback_data=f"support:{last_sale['sale_id']}"))

        try:
            bot.send_message(chat_id, creds_text, reply_markup=markup, parse_mode='Markdown')
        except Exception:
            try:
                bot.send_message(chat_id, creds_text, reply_markup=markup, parse_mode=None)
            except Exception as e:
                import io
            full_creds = "\n\n".join([f"Item #{i+1}:\n{item}" for i, item in enumerate(delivered_items)])
            doc = io.BytesIO(full_creds.encode('utf-8'))
            doc.name = f"Purchase_{prod['name'][:10]}.txt"
            try:
                bot.send_document(chat_id, doc, caption="Your purchased items are attached as a file due to length.")
            except:
                pass

        admin_ids = db.get('admin_ids', [])
        # Show variant name only if product has multiple variants
        has_multi_var = len(prod.get('variants', {})) > 1
        name_display = f"{prod['name']} ({var['name']})" if has_multi_var else prod['name']
    
        uname = str(u_obj.get('username', 'Unknown')).replace('_', '-')
        uname_display = f"@{uname}" if uname != "Unknown" else "Unknown"
    
        for a_id in admin_ids:
            if a_id != 0:
                try:
                    admin_text = (
                        f"🔔 *NEW SALE ALERT* 🔔\n"
                        f"━━━━━━━━━━━━━━━━━━━━━\n"
                        f"👤 *Customer:* {uname_display} (`{chat_id}`)\n"
                        f"📦 *Item:* `{name_display}`\n"
                        f"🔢 *Quantity:* `{qty}`\n"
                        f"💰 *Paid Amount:* `₹{total_inr}`\n"
                        f"📈 *Remaining Stock:* `{len(pool_stock)} unit(s)`\n"
                        f"━━━━━━━━━━━━━━━━━━━━━"
                    )
                    bot.send_message(a_id, admin_text, parse_mode='Markdown')
                except Exception:
                    pass

        active_purchases.discard(chat_id)
        # Check low stock alert (specific pool stock < 3)
        product_stock = sum(len(arr) for arr in prod.get('stock_pools', {}).values())
        is_infinite = prod.get('infinite_pools', {}).get(pool_id, False)
        if len(pool_stock) < 3 and not is_infinite:
            for a_id in admin_ids:
                if a_id != 0:
                    try:
                        low_stock_text = (
                            f"⚠️ *LOW STOCK ALERT* ⚠️\n"
                            f"━━━━━━━━━━━━━━━━━━━━━\n"
                            f"📦 *Product:* `{name_display}`\n"
                            f"🧊 *Pool ID:* `{pool_id}`\n"
                            f"📉 *Pool Stock:* `{len(pool_stock)} unit(s)`\n"
                            f"📊 *Total Product Stock:* `{product_stock} unit(s)`\n"
                            f"━━━━━━━━━━━━━━━━━━━━━\n"
                            f"⚠️ *Please restock this product soon!*"
                        )
                        markup = InlineKeyboardMarkup()
                        markup.add(InlineKeyboardButton("➕ Add Stock", callback_data=f"lowstk_view:{p_id}"))
                        admin_bot.send_message(a_id, low_stock_text, reply_markup=markup, parse_mode='Markdown')
                    except Exception:
                        pass


@bot.message_handler(content_types=['text'])
def handle_text_menus(message):
    global db
    db = load_db()
    chat_id = message.chat.id
    text = message.text
    user = get_user(message.from_user)
    currency = user['currency']

    # --- MEMBERSHIP CHECK ---
    if not check_membership(chat_id):
        membership_required_screen(chat_id)
        return

    if text.endswith("Explore Store"):
        p_emoji = get_p_emoji('home', '✨')
        welcome_text = (
            f"{p_emoji} <b>Welcome To Quantum's Store</b> {p_emoji}\n\n"
            f"📂 <b>Explore All Products</b>:- Use this Menu to Explore Our All products &amp; Services Collection\n\n"
            f"📂 <b>Categories</b>:- Browse Our Products &amp; Sevices by Category\n\n"
            f"💡 <b>Select an option below to continue</b>"
        )
        bot.send_message(chat_id, welcome_text, reply_markup=build_category_menu(), parse_mode='HTML')

    elif text.endswith("Search Product"):
        prompt_text = (
            f"🔍 **PRODUCT SEARCH**\n"
            f"───────────────────────────\n"
            f"Please enter the product name or keyword you are looking for:\n\n"
            f"💡 *Type cancel to return to the main menu.*"
        )
        msg = bot.send_message(chat_id, prompt_text, parse_mode='Markdown')
        bot.register_next_step_handler(msg, process_product_search)

    elif text.endswith("Add Balance"):
        bal_str = converter.format_price(user['balance'], currency)
        uname = html_escape(str(user.get('username', 'Unknown')).replace('_', '-'))
        uname_display = f"@{uname}" if uname != "Unknown" else "No Username"
    
        p_emoji = get_p_emoji('balance', '💳')
        e_user = get_p_emoji('user', '👤')
        e_briefcase = get_p_emoji('briefcase', '💼')
        e_flash = get_p_emoji('flash', '⚡')
        e_note = get_p_emoji('note_time', '⏱️')
        e_gateway = get_p_emoji('gateway', '📊')
        e_down = get_p_emoji('down', '👇')
    
        deposit_text = (
            f"{p_emoji} <b>ADD FUNDS TO WALLET</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"{e_user} <b>User:</b> {uname_display} (<code>{chat_id}</code>)\n"
            f"{e_briefcase} <b>Current Balance:</b> <code>{bal_str}</code>\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"{e_flash} <b>All payments are 100% Auto-Verified and will be automatically credited to your wallet instantly upon completion!</b>\n\n"
            f"{e_note} <b>Note:</b> Please complete the payment within <b>1 hour</b> after selecting a method.\n\n"
            f"{e_gateway} <b>Gateway Details:</b>\n"
            f"• <b>UPI:</b> <code>0% Fee</code> | <code>Min ₹1</code>\n"
            f"• <b>Binance Pay:</b> <code>0% Fee</code> | <code>Min $1</code>\n"
            f"• <b>Crypto:</b> <code>5% Fee</code> | <code>Min ₹500</code> / <code>$5</code>\n\n"
            f"{e_down} <b>Select your preferred deposit method:</b>"
        )
        # Get active payment methods from database config
        methods = db.get('payment_methods', {"cashfree": True, "upi_qr": True, "crypto": True, "binance_pay": True})
    
        markup = InlineKeyboardMarkup(row_width=2)
        buttons = []
        if methods.get("cashfree", True):
            buttons.append(InlineKeyboardButton("💳 UPI", callback_data="dep_meth:inr"))
        if methods.get("upi_qr", True):
            buttons.append(InlineKeyboardButton("🇮🇳 UPI QR", callback_data="dep_meth:upi_qr"))
        if methods.get("binance_pay", True):
            buttons.append(InlineKeyboardButton("🟡 BINANCE PAY", callback_data="dep_meth:binance_pay"))
        if methods.get("crypto", True):
            buttons.append(InlineKeyboardButton("🪙 CRYPTO", callback_data="dep_meth:crypto"))
        
        markup.add(*buttons)
        markup.add(InlineKeyboardButton("📜 Deposit History", callback_data="dep_history"))
    
        bot.send_message(chat_id, deposit_text, reply_markup=markup, parse_mode='HTML')

    elif text.endswith("My Account"):
        now_str = datetime.now(IST).strftime("%I:%M %p, %d %b %Y")
        bal_str = converter.format_price(user['balance'], currency)
        dep_str = converter.format_price(user.get('total_deposit', 0.0), currency)
        purchases = user.get('total_purchases', 0)
        uname = html_escape(str(user.get('username', 'Unknown')).replace('_', '-'))
        u_name = f"@{uname}" if uname != "Unknown" else "No Username"
    
        status_line = ""
        if user.get('is_frozen', False):
            status_line = "⚠️ <b>Wallet Status:</b> <code>❄️ Frozen (Purchases Disabled)</code>\n───────────────────────\n"
        
        p_emoji = get_p_emoji('account', '👤')
        e_fin = get_p_emoji('financial', '💰')
        e_cur = get_p_emoji('cur_bal', '💵')
        e_dep = get_p_emoji('tot_dep', '💳')
        e_pur = get_p_emoji('tot_pur', '📦')
        e_pref = get_p_emoji('preferences', '⚙️')
        e_disp = get_p_emoji('disp_curr', '💱')
        e_upd = get_p_emoji('last_upd', '🕒')
        e_user = get_p_emoji('user', '👤')
    
        reply_text = (
            f"{p_emoji} <b>CUSTOMER PROFILE</b>\n"
            f"───────────────────────\n"
            f"{status_line}"
            f"🆔 <b>User ID:</b> <code>{chat_id}</code>\n"
            f"{e_user} <b>Username:</b> {u_name}\n\n"
            f"{e_fin} <b>FINANCIAL OVERVIEW</b>\n"
            f"───────────────────────\n"
            f"{e_cur} <b>Current Balance:</b> <code>{bal_str}</code>\n"
            f"{e_dep} <b>Total Deposited:</b> <code>{dep_str}</code>\n"
            f"{e_pur} <b>Total Purchases:</b> <code>{purchases} orders</code>\n\n"
            f"{e_pref} <b>PREFERENCES</b>\n"
            f"───────────────────────\n"
            f"{e_disp} <b>Display Currency:</b> <code>{currency}</code>\n"
            f"{e_upd} <b>Last Updated:</b> <code>{now_str}</code>\n\n"
            f"<i>Select currency to convert your store view:</i>"
        )
        bot.send_message(chat_id, reply_text, reply_markup=build_profile_menu(currency), parse_mode='HTML')

    elif text.endswith("Invite Users"):
        if not db.get('referral_enabled', True):
            bot.send_message(chat_id, "⚠️ The referral program is currently disabled by the admin.", reply_markup=build_reply_keyboard())
            return
        
        bot_username = bot.get_me().username
        ref_link = f"https://t.me/{bot_username}?start=ref_{chat_id}"
    
        total_ref = user.get('total_referred', 0)
        successful_ref = user.get('successful_referrals', 0)
        earnings = user.get('referral_earnings', 0.0)
    
        reward_amt = db.get('referral_reward', 20.0)
        min_dep = db.get('referral_min_deposit', 100.0)
    
        reward_str = converter.format_price(reward_amt, currency)
        min_dep_str = converter.format_price(min_dep, currency)
        earnings_str = converter.format_price(earnings, currency)
    
        e_invite = get_p_emoji('invite', '🎁')
        e_rew = get_p_emoji('reward', '💰')
        e_req = get_p_emoji('requirement', '🎯')
        e_stat = get_p_emoji('stats', '📊')
        e_f = get_p_emoji('friends', '👤')
        e_succ = get_p_emoji('success', '✅')
        e_earn = get_p_emoji('earned', '💸')
        e_link = get_p_emoji('link', '🔗')
        e_tip = get_p_emoji('tip', '💡')
    
        invite_text = (
            f"{e_invite} <b>INVITE & EARN PROGRAM</b> {e_invite}\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"Share your referral link with your friends and earn wallet rewards when they top up!\n\n"
            f"{e_rew} <b>Per-Invite Reward:</b> <code>{reward_str}</code>\n"
            f"{e_req} <b>Requirement:</b> Referred friend must deposit a minimum cumulative total of <code>{min_dep_str}</code>.\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"{e_stat} <b>YOUR REFERRAL STATS</b>\n"
            f"{e_f} <b>Friends Invited:</b> <code>{total_ref}</code>\n"
            f"{e_succ} <b>Successful Invites:</b> <code>{successful_ref}</code>\n"
            f"{e_earn} <b>Total Referral Earned:</b> <code>{earnings_str}</code>\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"{e_link} <b>YOUR EXCLUSIVE INVITE LINK:</b>\n"
            f"<code>{ref_link}</code>\n\n"
            f"{e_tip} <i>Tip: Click the link above to copy it instantly and share it!</i>"
        )
    
        markup = InlineKeyboardMarkup()
        share_url = f"https://t.me/share/url?url={ref_link}&text=Hey! Join this awesome digital store bot to buy accounts, subscriptions, and more instantly! 🚀"
        markup.add(InlineKeyboardButton("🔗 Share with Friends", url=share_url))
    
        bot.send_message(chat_id, invite_text, reply_markup=markup, parse_mode='HTML')

    elif text.endswith("Order History"):
        show_my_orders(message)

    elif text.endswith("How to use Bot"):
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🟢 How to Top Up", callback_data="view_tut_how_to_topup"))
        markup.add(InlineKeyboardButton("🛒 How to Buy", callback_data="view_tut_how_to_buy"))
        markup.add(InlineKeyboardButton("🛠 Product Support", callback_data="view_tut_product_support"))
        markup.add(InlineKeyboardButton("👨‍💻 Admin Support", callback_data="view_tut_admin_support"))
        
        vid_link = db.get("video_tutorial_link", "https://t.me/howtousebotqxd")
        markup.add(InlineKeyboardButton("🎬 Video Tutorial", url=vid_link))
        
        bot.send_message(chat_id, "📖 *Tutorials & Guides*\n\nSelect a topic below to learn how to use the bot:", reply_markup=markup, parse_mode="Markdown")
        
    elif text.endswith("Community & Proofs"):
        communities = db.get('communities', {})
        if not communities:
            bot.send_message(chat_id, "🌐 *Community & Proofs*\n\nNo community links are available at the moment.", parse_mode="Markdown")
            return
            
        markup = InlineKeyboardMarkup(row_width=1)
        for cid, cdata in communities.items():
            c_link = cdata['link'].strip()
            if not c_link.startswith(('http://', 'https://')):
                c_link = 'https://' + c_link
            markup.add(InlineKeyboardButton(f"🌐 {cdata['name']}", url=c_link))
            
        bot.send_message(chat_id, "🌐 *Community & Proofs*\n\nJoin our communities below:", reply_markup=markup, parse_mode="Markdown")
    
    elif text.endswith("Help & Support"):
        show_support_menu(message)

def show_support_menu(message):
    """Shows the main support portal."""
    chat_id = message.chat.id
    markup = InlineKeyboardMarkup(row_width=1)

    markup.add(InlineKeyboardButton("📦 Product Support", callback_data="support_product_menu"))

    import urllib.parse

    support_val = db.get('support_username', 'quantumsera').strip()
    if support_val.startswith('@'):
        support_val = support_val[1:]
    
    user = db['users'].get(str(chat_id), {})
    username = user.get('username', 'Unknown')
    u_display = f"@{username}" if username != "Unknown" else "No Username"

    draft_msg = (
        "🎫 SUPPORT INQUIRY\n"
        "━━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 User: {u_display}\n"
        f"🆔 ID: {chat_id}\n"
        "━━━━━━━━━━━━━━━━━━━━━\n"
        "📝 My Issue:\n"
        "-> \n"
    )
    encoded_report = urllib.parse.quote(draft_msg)
    support_url = f"https://t.me/{support_val}?text={encoded_report}"

    markup.add(InlineKeyboardButton("👨‍💻 Admin Support", url=support_url))

    p_emoji = get_p_emoji('help', '💬')
    text = (
        f"{p_emoji} <b>Contact Support</b>\n\n"
        "• Click <b>Product Support</b> if you have an issue with a purchased item.\n"
        "• Click <b>Admin Support</b> for general inquiries and account issues."
    )
    bot.send_message(chat_id, text, reply_markup=markup, parse_mode="HTML")

def show_support_product_menu(message):
    """Shows the product support menu."""
    chat_id = message.chat.id
    sales = db.get('sales', [])
    user_sales = [s for s in sales if s.get('user_id') == chat_id]

    if not user_sales:
        return bot.send_message(chat_id, "ℹ️ You haven't made any purchases yet.")

    markup = InlineKeyboardMarkup(row_width=1)
    unique_prods = {}
    for s in user_sales:
        pid = s.get('product_id')
        if pid not in unique_prods:
            unique_prods[pid] = {"name": s.get('product_name'), "count": 0}
        unique_prods[pid]["count"] += 1
    
    for pid, info in unique_prods.items():
        markup.add(InlineKeyboardButton(f"📦 Support: {info['name']}", callback_data=f"view_support_orders:{pid}"))
    
    markup.add(InlineKeyboardButton("⬅️ Back", callback_data="back_to_support_main"))
    
    bot.send_message(chat_id, "📦 *Product Support*\n\nPlease select the product you are having issues with:", reply_markup=markup, parse_mode="Markdown")

def show_my_orders(message):
    """Shows a menu of products the user has already purchased for credential viewing."""
    chat_id = message.chat.id
    sales = db.get('sales', [])
    user_sales = [s for s in sales if s.get('user_id') == chat_id]

    if not user_sales:
        return bot.send_message(chat_id, "ℹ️ You haven't made any purchases yet.")

    # Group by product_id to show unique buttons
    unique_prods = {}
    for s in user_sales:
        pid = s.get('product_id')
        if pid not in unique_prods:
            unique_prods[pid] = {"name": s.get('product_name'), "count": 0}
        unique_prods[pid]["count"] += 1
    
    markup = InlineKeyboardMarkup(row_width=1)
    for pid, info in unique_prods.items():
        markup.add(InlineKeyboardButton(f"📦 {info['name']} • {info['count']} Orders", callback_data=f"view_user_orders:{pid}"))

    p_emoji = get_p_emoji('orders', '🛍️')
    bot.send_message(chat_id, f"{p_emoji} <b>My Orders</b>\nSelect a product to view your purchase history:", reply_markup=markup, parse_mode="HTML")

def show_orders_for_product(message, p_id, is_support=False):
    """Displays detailed order cards for a specific selected product."""
    chat_id = message.chat.id
    sales = db.get('sales', [])
    # Get all user sales for order numbering
    all_user_sales = [s for s in sales if s.get('user_id') == chat_id]
    # Filter for this specific product
    prod_sales = [s for s in all_user_sales if s.get('product_id') == p_id]

    from datetime import datetime

    for s in prod_sales[::-1]:
        # Order numbering based on overall user history
        order_num = all_user_sales.index(s) + 1
    
        buy_dt = datetime.fromtimestamp(s.get('purchase_ts', 0), IST).strftime('%I:%M %p, %d %b %Y')
        p_name = s.get('product_name', 'Unknown')
        v_name = s.get('variant_name', 'Unknown')
        creds = s.get('credentials', 'N/A')
        status = s.get('status', 'Delivered')
    
        status_map = {
            "Delivered": "✅ Delivered",
            "Canceled": "❌ Canceled",
            "Refunded": "💰 Refunded",
            "On Hold": "⏸️ On Hold"
        }
        status_text = status_map.get(status, status)
    
        # Subscription Info
        sub_info = ""
        end_ts = s.get('end_ts')
        if end_ts:
            exp_dt = datetime.fromtimestamp(end_ts, IST).strftime('%I:%M %p, %d %b %Y')
        
            # Sync status with order status
            if status == "Canceled":
                sub_status = "🔴 Subscription Canceled"
            elif status == "Refunded":
                sub_status = "💰 Order Refunded"
            elif status == "On Hold":
                sub_status = "⏸️ Subscription On Hold"
            else:
                # Normal Delivered status logic
                sub_status = "🟢 LIVE" if time.time() < end_ts else "🔴 EXPIRED"
            
            sub_info = f"⚖️ **Validity:** `{sub_status}`\n📅 **Expiry Date:** `{exp_dt}`\n"
    
        edit_info = ""
        if s.get('last_edited_at'):
            edit_dt = datetime.fromtimestamp(s['last_edited_at'], IST).strftime('%I:%M %p, %d %b %Y')
            edit_info = f"🔄 **Last Replaced:** `{edit_dt}`\n"

        card = (
            f"📦 **ORDER RECEIPT #{order_num}**\n"
            f"───────────────────────────\n"
            f"📦 **Product:** `{p_name}`\n"
            f"💎 **Variant:** `{v_name}`\n"
            f"💰 **Paid Amount:** `₹{s.get('price', 0)}`\n"
            f"📊 **Status:** `{status_text}`\n\n"
            f"🕒 **TIMESTAMP & METRICS**\n"
            f"───────────────────────────\n"
            f"📅 **Purchase Date:** `{buy_dt}`\n"
            f"{sub_info}"
            f"{edit_info}\n"
            f"🔑 **DELIVERED CREDENTIALS**\n"
            f"───────────────────────────\n"
            f"`{creds}`\n"
        )
    
        markup = InlineKeyboardMarkup()
        if is_support:
            markup.add(InlineKeyboardButton("💬 Contact Support", callback_data=f"support:{s['sale_id']}"))
        bot.send_message(chat_id, card, reply_markup=markup if is_support else None, parse_mode='Markdown')

def step_support_other_issue(message):
    chat_id = message.chat.id
    issue_text = message.text
    if issue_text.lower() == 'cancel': return bot.send_message(chat_id, "Cancelled.")

    # Create a generic report text
    report = (
        f"📝 CONTACT SUPPORT (General)\n"
        f"───────────────────────\n"
        f"👤 Customer: @{message.from_user.username or 'Unknown'} ({chat_id})\n"
        f"❓ Issue: {issue_text}\n"
        f"───────────────────────"
    )

    import urllib.parse
    encoded_report = urllib.parse.quote(report)

    db_current = load_db()
    support_val = db_current.get('support_username', 'quantumsera').strip()
    if support_val.startswith('@'):
        support_val = support_val[1:]

    is_numeric = support_val.isdigit()
    if is_numeric:
        support_url = f"tg://openmessage?user_id={support_val}&text={encoded_report}"
        btn_label = "🚀 Contact Support"
        text_link = f"[Support Admin](tg://user?id={support_val})"
    else:
        support_url = f"tg://resolve?domain={support_val}&text={encoded_report}"
        btn_label = f"🚀 Send to @{support_val}"
        text_link = f"@{support_val}"

    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton(btn_label, url=support_url))

    bot.send_message(chat_id, "✅ Your request has been prepared! Click the button below to send it directly to our support team.", reply_markup=markup, parse_mode="Markdown")

def step_support_issue(message):
    chat_id = message.chat.id
    issue_text = message.text
    if issue_text.lower() == 'cancel': return bot.send_message(chat_id, "Cancelled.")

    context = pending_orders.get(chat_id, {})
    sale_id = context.get('support_sale_id')
    if not sale_id: return

    # Find sale data
    sales = db.get('sales', [])
    sale = next((s for s in sales if s.get('sale_id') == sale_id), None)
    if not sale: return

    user_sales = [s for s in sales if s.get('user_id') == chat_id]
    order_num = user_sales.index(sale) + 1 if sale in user_sales else "?"

    from datetime import datetime
    buy_dt = datetime.fromtimestamp(sale.get('purchase_ts', 0), IST).strftime('%I:%M %p, %d %b %Y')

    # Create the detailed report text for pre-filling
    report = (
        f"📝 CONTACT SUPPORT\n"
        f"───────────────────────\n"
        f"👤 Customer: @{message.from_user.username or 'Unknown'} ({chat_id})\n"
        f"📦 Order No: {order_num}\n"
        f"📦 Product Name: {sale['product_name']}\n"
        f"💎 Product Variant: {sale['variant_name']}\n\n"
        f"📅 Purchased Date: {buy_dt}\n\n"
        f"🔑 Credentials: {sale['credentials']}\n"
        f"❓ Issue: {issue_text}\n"
        f"───────────────────────"
    )

    import urllib.parse
    encoded_report = urllib.parse.quote(report)

    db_current = load_db()
    support_val = db_current.get('support_username', 'quantumsera').strip()
    if support_val.startswith('@'):
        support_val = support_val[1:]

    is_numeric = support_val.isdigit()
    if is_numeric:
        support_url = f"tg://openmessage?user_id={support_val}&text={encoded_report}"
        btn_label = "🚀 Contact Support"
        text_link = f"[Support Admin](tg://user?id={support_val})"
    else:
        support_url = f"tg://resolve?domain={support_val}&text={encoded_report}"
        btn_label = f"🚀 Send to @{support_val}"
        text_link = f"@{support_val}"

    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton(btn_label, url=support_url))

    bot.send_message(chat_id, "✅ Your request has been prepared! Click the button below to send it directly to our support team. It will be automatically typed for you.", reply_markup=markup, parse_mode="Markdown")

    pending_orders.pop(chat_id, None)

def show_deposit_history(message):
    chat_id = message.chat.id
    db = load_db()
    deposits = [d for d in db.get('deposits', []) if d.get('user_id') == chat_id]

    if not deposits:
        return bot.send_message(chat_id, "ℹ️ You haven't made any deposits yet.")

    bot.send_message(chat_id, "📜 *Your Recent Deposit History:*")

    # Directly show last 10 deposits as individual cards (matching admin bot style)
    for d in deposits[::-1][:10]:
        dt = datetime.fromtimestamp(d.get('timestamp', 0), IST).strftime('%d %b %Y')
        tm = datetime.fromtimestamp(d.get('timestamp', 0), IST).strftime('%I:%M %p')
    
        status_map = {"Success": "✅ Completed", "Pending": "⏳ Pending", "Failed": "❌ Failed"}
        status_text = status_map.get(d['status'], d['status'])
    
        user = db['users'].get(str(chat_id), {})
        user_curr = user.get('currency', 'INR')
    
        # Keep the profile currency logic
        if d['currency'] == user_curr:
            symbol = converter.symbols.get(user_curr, "")
            display_amt = f"{symbol}{d['amount']}"
        else:
            if d['currency'] == "INR":
                display_amt = f"₹{d['amount']} ({converter.format_price(d['amount'], user_curr)})"
            else:
                usd_rate = converter.rates.get('USD', 0.012)
                base_inr = round(d['amount'] / usd_rate, 2)
                display_amt = f"${d['amount']} ({converter.format_price(base_inr, user_curr)})"

        card = (
            f"💰 *Deposit Receipt*\n\n"
            f"• Deposit ID: `{d.get('deposit_id', d.get('order_id', 'N/A'))}`\n"
            f"• Order ID: `{d.get('order_id', 'N/A')}`\n"
            f"• Amount: {display_amt}\n"
            f"• Status: {status_text}\n"
            f"• Method: `{d.get('method', 'Unknown')}`\n"
            f"• Date: {dt} {tm}"
        )
    
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("💬 Contact Support", callback_data=f"dep_support:{d['deposit_id']}"))
        bot.send_message(chat_id, card, reply_markup=markup, parse_mode="Markdown")

def step_deposit_support_issue(message):
    chat_id = message.chat.id
    issue_text = message.text
    if issue_text.lower() == 'cancel': return bot.send_message(chat_id, "Cancelled.")

    context = pending_orders.get(chat_id, {})
    dep_id = context.get('support_dep_id')
    if not dep_id: return

    db = load_db()
    dep = next((d for d in db.get('deposits', []) if d.get('deposit_id') == dep_id), None)
    if not dep: return

    dt = datetime.fromtimestamp(dep.get('timestamp', 0), IST).strftime('%I:%M %p, %d %b %Y')

    report = (
        f"📝 DEPOSIT SUPPORT\n"
        f"───────────────────────\n"
        f"👤 Customer: @{message.from_user.username or 'Unknown'} ({chat_id})\n"
        f"🆔 Deposit ID: {dep['deposit_id']}\n"
        f"💵 Amount: {dep['amount']} {dep['currency']}\n"
        f"💳 Method: {dep['method']}\n"
        f"📅 Date: {dt}\n"
        f"📊 Status: {dep['status']}\n\n"
        f"❓ Issue: {issue_text}\n"
        f"───────────────────────"
    )

    import urllib.parse
    encoded_report = urllib.parse.quote(report)

    db_current = load_db()
    support_val = db_current.get('support_username', 'quantumsera').strip()
    if support_val.startswith('@'):
        support_val = support_val[1:]

    is_numeric = support_val.isdigit()
    if is_numeric:
        support_url = f"tg://openmessage?user_id={support_val}&text={encoded_report}"
        btn_label = "🚀 Contact Support"
        text_link = f"[Support Admin](tg://user?id={support_val})"
    else:
        support_url = f"tg://resolve?domain={support_val}&text={encoded_report}"
        btn_label = f"🚀 Send to @{support_val}"
        text_link = f"@{support_val}"

    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton(btn_label, url=support_url))

    bot.send_message(chat_id, "✅ Your deposit support request has been prepared! Click below to send it.", reply_markup=markup, parse_mode="Markdown")
    pending_orders.pop(chat_id, None)

# Monitor loops
def monitor_deposits():
    """Background loop to check for pending deposits and update balance automatically."""
    while True:
        try:
            # Check every 15 seconds
            time.sleep(15)
            if not pending_deposits: continue
        
            global db
            db = load_db()
            now = time.time()
            to_remove = []
        
            for d in pending_deposits:
                gateway = d.get('gateway', 'cashfree') # Default to cashfree for old records
            
                # Timeout after 20 mins for fiat, 3 hours for crypto
                timeout_limit = 10800 if gateway == 'nowpayments' else 1200
                if (now - d['start_ts']) > timeout_limit:
                    payment_ref = f"NOW_{d['payment_id']}" if gateway == 'nowpayments' else d['order_id']
                    update_deposit_status(payment_ref, "Failed")
                    to_remove.append(d)
                    continue
            
                is_paid = False
                payment_ref = ""
            
                if gateway == 'nowpayments':
                    payment_id = d['payment_id']
                    payment_ref = f"NOW_{payment_id}"
                    res = check_now_status(payment_id)
                    p_status = res.get('payment_status')
                    if p_status in ["finished", "confirmed", "partially_paid"]:
                        is_paid = True
                    elif p_status in ["failed", "expired", "refunded", "rejected"]:
                        update_deposit_status(payment_ref, "Failed")
                        to_remove.append(d)
                        continue
                else: 
                    # Cashfree
                    order_id = d['order_id']
                    payment_ref = order_id
                    res = check_cf_v2_status(order_id)
                    o_status = res.get('orderStatus')
                    if o_status == "PAID":
                        is_paid = True
                    elif o_status in ["FAILED", "EXPIRED", "CANCELLED"]:
                        update_deposit_status(payment_ref, "Failed")
                        to_remove.append(d)
                        continue

            if is_paid:
                uid = d['user_id']
                amount = d['amount']
                
                if gateway == 'nowpayments':
                    # Fetch dynamic conversion details
                    outcome_amount = res.get('outcome_amount')
                    outcome_currency = res.get('outcome_currency')
                    actually_paid = res.get('actually_paid')
                    pay_amount = res.get('pay_amount')
                    
                    print(f"[NOWPayments] Payment completed: id={payment_id}, status={p_status}, outcome_amount={outcome_amount}, outcome_currency={outcome_currency}, actually_paid={actually_paid}, pay_amount={pay_amount}")
                    
                    credited_amount = None
                    
                    # 1. Primary Method: Convert the received payout crypto back to INR at live rates
                    if outcome_amount and outcome_currency:
                        estimated_inr = estimate_fiat_amount(outcome_amount, outcome_currency, "inr")
                        if estimated_inr is not None:
                            credited_amount = round(estimated_inr, 2)
                            print(f"[NOWPayments] Primary estimate success: outcome converted back to fiat = {credited_amount} INR")
                    
                    # 2. Fallback Method: Ratio-based calculation using (base_amount * 1.05) * (actually_paid / pay_amount)
                    if credited_amount is None:
                        if actually_paid and pay_amount and float(pay_amount) > 0:
                            ratio = float(actually_paid) / float(pay_amount)
                            bill_amount = amount * 1.05
                            credited_amount = round(bill_amount * ratio, 2)
                            print(f"[NOWPayments] Fallback ratio calculation used: ratio={ratio:.4f}, credited_amount={credited_amount} INR")
                        else:
                            print(f"[NOWPayments] Fallback failed: actually_paid data is missing. Cannot credit safely.")
                            continue
                    
                    amount = credited_amount
                
                with payment_processing_lock:
                    # Double check history to avoid duplicate adds
                    history = load_payments()
                    if payment_ref not in history:
                        # Success!
                        str_uid = str(uid)
                        if str_uid in db['users']:
                            user_ref = db['users'][str_uid]
                            user_ref['balance'] += amount
                            user_ref['total_deposit'] = user_ref.get('total_deposit', 0.0) + amount
                            
                            # Update the deposit transaction history record with the actual credited amount
                            for dep_rec in db.get('deposits', []):
                                if dep_rec.get('order_id') == payment_ref:
                                    dep_currency = dep_rec.get('currency', 'INR')
                                    if dep_currency == 'USD':
                                        usd_rate = converter.rates.get('USD', 0.012)
                                        dep_rec['amount'] = round(amount * usd_rate, 2)
                                    else:
                                        dep_rec['amount'] = amount
                                    dep_rec['status'] = "Success"
                                    
                            reward_info = check_and_reward_referrer(db, str_uid)
                            if reward_info:
                                referrer_id, reward_amount = reward_info
                                try:
                                    ref_username = user_ref.get('username', 'Unknown')
                                    ref_display = f"@{ref_username.replace('_', '-')}" if ref_username != "Unknown" else f"User `{str_uid}`"
                                    referrer_user = db['users'][referrer_id]
                                    reward_curr = referrer_user.get('currency', 'INR')
                                    reward_str = converter.format_price(reward_amount, reward_curr)
                                    new_bal_str = converter.format_price(referrer_user.get('balance', 0.0), reward_curr)
                                    
                                    reward_msg = (
                                        f"🎉 *REFERRAL REWARD CREDITED!* 🎉\n"
                                        f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                                        f"Congratulations! Your referred friend has successfully completed the deposit requirement.\n\n"
                                        f"👤 *Referral:* {ref_display} (ID: `{str_uid}`)\n"
                                        f"💰 *Reward Credited:* `{reward_str}`\n"
                                        f"💳 *New Wallet Balance:* `{new_bal_str}`\n"
                                        f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                                        f"The reward has been added directly to your wallet balance. You can use it to purchase any store products instantly!"
                                    )
                                    bot.send_message(int(referrer_id), reward_msg, parse_mode="Markdown")
                                except Exception as e:
                                    print(f"Error notifying referrer: {e}")
                            save_db(db)
                            save_payment(payment_ref)
                            update_deposit_status(payment_ref, "Success")
                            
                            # Notify user
                            try:
                                credited_str = converter.format_price(amount, user_ref['currency'])
                                new_bal_str = converter.format_price(user_ref['balance'], user_ref['currency'])
                                msg_text = (
                                    f"💰 *AUTO TOP-UP RECEIVED* 💰\n"
                                    f"━━━━━━━━━━━━━━━━━━━━━\n"
                                    f"➕ *Added Amount:* `{credited_str}`\n"
                                    f"💳 *New Wallet Balance:* `{new_bal_str}`\n"
                                    f"━━━━━━━━━━━━━━━━━━━━━\n"
                                    f"Your automatic payment has been verified and credited successfully!"
                                )
                                bot.send_message(uid, msg_text, parse_mode='Markdown')
                                print(f"[{'NOWPayments' if gateway == 'nowpayments' else 'Cashfree'}] Successfully credited {amount} INR to User {uid}.")
                            except Exception as tg_err:
                                print(f"[{'NOWPayments' if gateway == 'nowpayments' else 'Cashfree'}] Failed to send Telegram notification to user {uid}: {tg_err}")
                        else:
                            print(f"[{'NOWPayments' if gateway == 'nowpayments' else 'Cashfree'}] User {uid} not found in database, cannot credit.")
                
                to_remove.append(d)

        
            # Cleanup
            for d in to_remove:
                if d in pending_deposits:
                    pending_deposits.remove(d)
            
        except Exception as e:
            # If it's a common network error, print a cleaner message
            if "Connection" in str(e) or "Disconnected" in str(e):
                print(f"📡 Monitor Deposits: Network glitch (retrying in 5s...)")
            else:
                print(f"Monitor Deposits Error: {e}")
            time.sleep(5)

def monitor_expiries():
    """Background loop to check for subscription expiries and notify user/admin."""
    import uuid
    while True:
        try:
            db = load_db()
            now = time.time()
            sales = db.get('sales', [])
            updated = False
        
            for s in sales:
                # Only notify for certain statuses
                if s.get('status') not in ["Delivered", "On Hold"]: continue
            
                sid = s['sale_id']
                end_ts = s.get('end_ts')
                if not end_ts: continue
            
                # Check if it's within the 3-day window
                remaining = end_ts - now
                if 0 < remaining < (3 * 24 * 3600):
                    last_notif = s.get('last_notif_ts', 0)
                    # Notify every 8 hours (3 times a day)
                    if (now - last_notif) > (8 * 3600):
                        uid = s['user_id']
                        p_name = s['product_name']
                        days_left = round(remaining / (24*3600), 1)
                    
                        # Notify User
                        try:
                            msg = (
                                f"⚠️ *Subscription Alert*\n\n"
                                f"Hello, your *{p_name}* subscription will expire in *{days_left} days*.\n\n"
                                f"Please renew it soon to avoid any service interruption! 🙏"
                            )
                            bot.send_message(uid, msg, parse_mode="Markdown")
                        except: pass
                    
                        # Notify Admin (via MongoDB) removed per request.
                    
                        s['last_notif_ts'] = now
                        s['notif_count'] = s.get('notif_count', 0) + 1
                        updated = True
        
            if updated:
                save_db(db)
            
        except Exception as e:
            print(f"Monitor Loop Error: {e}")
        
        time.sleep(3600) # Check every hour

def db_sync_loop():
    """Background loop to periodically sync the local database cache with MongoDB Atlas."""
    global db
    while True:
        try:
            # Fetch latest data status from MongoDB Atlas every 15 seconds in the background.
            # Using load_db() without force_fetch=True is highly optimized: it only queries
            # a single status field and only reloads all collections if changes actually occurred.
            time.sleep(15)
            db = load_db()
        except Exception as e:
            print(f"[Background Sync] Error: {e}")

def run_flask():
    """Starts the Flask webserver on a background thread for webhooks."""
    try:
        print("[Flask] Starting IPN listener server on port 5000...")
        app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
    except Exception as e:
        print(f"[Flask] Server Error: {e}")

if __name__ == "__main__":
    print("Simplified Wallet Bot is starting...")
    # Force full database fetch from MongoDB Atlas on bot startup
    db = load_db(force_fetch=True)

    # Restore pending deposits from database to memory list on startup
    print("[Startup] Restoring pending deposits from database...")
    restore_count = 0
    for d in db.get('deposits', []):
        if d.get('status') == 'Pending':
            gateway = d.get('gateway', 'cashfree')
            order_id = d.get('order_id')
            if gateway == 'nowpayments' and order_id and order_id.startswith('NOW_'):
                payment_id = order_id[4:]
                if not any(pd.get('payment_id') == payment_id for pd in pending_deposits):
                    pending_deposits.append({
                        'gateway': 'nowpayments',
                        'payment_id': payment_id,
                        'user_id': d.get('user_id'),
                        'amount': d.get('amount'),
                        'start_ts': d.get('timestamp', time.time())
                    })
                    restore_count += 1
            elif gateway == 'cashfree' and order_id:
                if not any(pd.get('order_id') == order_id for pd in pending_deposits):
                    pending_deposits.append({
                        'gateway': 'cashfree',
                        'order_id': order_id,
                        'user_id': d.get('user_id'),
                        'amount': d.get('amount'),
                        'start_ts': d.get('timestamp', time.time())
                    })
                    restore_count += 1
    print(f"[Startup] Restored {restore_count} pending deposits to active monitor list.")

    # Start monitor and sync threads
    threading.Thread(target=converter.update_rates_loop, daemon=True).start()
    threading.Thread(target=db_sync_loop, daemon=True).start()
    threading.Thread(target=monitor_expiries, daemon=True).start()
    threading.Thread(target=monitor_deposits, daemon=True).start()
    threading.Thread(target=run_flask, daemon=True).start()

    print("Bot is starting...")
    try:
        pass
    except:
        pass
    
    while True:
        try:
            print("Bot is running! Press CTRL+C to stop.")
            # Increased timeout and polling parameters for better resilience
            bot.infinity_polling(timeout=60, long_polling_timeout=30)
        except Exception as e:
            # Suppress noisy conflict errors if already handled or just blipping
            if "Conflict" in str(e):
                print("⚠️ Parallel instance detected or Reconnecting... Waiting 5s.")
                time.sleep(5)
            else:
                print(f"🔄 Connection/Network Glitch: Reconnecting in 3 seconds... ({e})")
                time.sleep(3)

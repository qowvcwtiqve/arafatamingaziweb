import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
import telebot
from telebot.types import ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton

import json
import os
import uuid
import time
import signal
from datetime import datetime, timezone, timedelta
IST = timezone(timedelta(hours=5, minutes=30))
import requests
import threading

# --- Kill Old Instances ---
pid_file = "admin_bot.pid"
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

from manager import ADMIN_BOT_TOKEN, STORE_BOT_TOKEN
bot = telebot.TeleBot(ADMIN_BOT_TOKEN, num_threads=20)

try:
    STORE_BOT_USERNAME = telebot.TeleBot(STORE_BOT_TOKEN).get_me().username
except Exception as e:
    print(f"Could not fetch store bot username: {e}")
    STORE_BOT_USERNAME = "store_bot"


# --- NETWORK RESILIENCE HANDLER ---
class BotExceptionHandler(telebot.ExceptionHandler):
    def handle(self, exception):
        # Catch common transient network errors to avoid crashing or long tracebacks
        err_msg = str(exception).lower()
        if any(x in err_msg for x in ["connection", "timeout", "remote end", "disconnected", "reset", "abort"]):
            print(f"📡 Admin Bot Network Glitch: {exception}")
            # Returning True ignores the exception and lets the bot continue polling
            return True
        return False

bot.exception_handler = BotExceptionHandler()

conv_states = {}

class CurrencyConverter:
    def __init__(self):
        self.rates = {'INR': 1.0, 'USD': 0.012} # Default
        self.symbols = {'INR': '₹', 'USD': '$'}

    def update_rates_loop(self):
        """Background loop to update exchange rates every hour without blocking user threads."""
        while True:
            try:
                res = requests.get('https://open.er-api.com/v6/latest/INR', timeout=10).json()
                if 'rates' in res:
                    self.rates['USD'] = res['rates'].get('USD', 0.012)
                    print("[Background Admin] Updated exchange rates:", self.rates)
            except Exception:
                pass
            time.sleep(3600)

    def format_price(self, amount_inr, target_currency):
        if target_currency == 'INR':
            return f"₹{amount_inr}"
        rate = self.rates.get(target_currency, 0.012)
        price = amount_inr * rate
        return f"${price:.2f}"

converter = CurrencyConverter()

from manager import load_db, save_db, check_and_reward_referrer

def resolve_user_id(query, db):
    query = query.strip()
    if not query:
        return None
    if query.startswith('@'):
        query = query[1:]
    
    # Check if query is directly a User ID
    if query.isdigit():
        if query in db.get('users', {}):
            return query
            
    # Check by Username (case-insensitive)
    for uid, udata in db.get('users', {}).items():
        uname = udata.get('username', '')
        if uname and uname.lower() == query.lower():
            return uid
            
    return None

def decode_back_cb(back_cb_str):
    if not back_cb_str:
        return "orders_main_menu"
    if back_cb_str.startswith("cust_u_p_"):
        return "cust_u_p:" + back_cb_str[9:].replace("_", ":")
    return back_cb_str.replace("_", ":")

def is_admin(message_or_call):
    chat_id = message_or_call.message.chat.id if hasattr(message_or_call, 'message') else message_or_call.chat.id
    db = load_db()
    a_ids = db.get('admin_ids', [])
    if db.get('admin_id') and db.get('admin_id') not in a_ids:
        a_ids.append(db.get('admin_id'))
    return chat_id in a_ids

def is_menu_button_click(text):
    if not text:
        return False
    menu_buttons = [
        "🛍 Manage Products", "🏷️ Manage Products", "📦 Manage Catalog",
        "💰 Manage Balances", "💳 Manage Balances", "💳 User Balances",
        "📋 Customer Orders", "📜 Customer Orders", "📜 Recent Orders", "📜 Manage Orders",
        "⏳ Pending Orders", "Pending Orders",
        "💰 Customer Deposit", "💸 Customer Deposit", "💸 User Deposits",
        "👥 Bot Users", "👑 Bot Users",
        "📢 Broadcast", "📣 Broadcast", "📢 Send Broadcast",
        "📊 Sorting Settings", "⚙️ Sorting Settings", "⚙️ Sort Settings",
        "📞 Contact Support Admin", "🛠️ Contact Support Admin", "🛠️ Support Panel", "🛠️ Support Settings",
        "🏷️ Discounts & Coupons", "⚙️ Payment Settings", "🎁 Referral Program", "🎁 Referral Settings",
        "📖 Manage Tutorials", "📖 Tutorial Settings", "⚙️ Bot Settings", "📢 Ad Maker"
    ]
    return text in menu_buttons

def admin_menu():
    markup = ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    markup.add(
        KeyboardButton("📦 Manage Catalog"),
        KeyboardButton("📜 Manage Orders")
    )
    markup.add(
        KeyboardButton("👥 Bot Users"),
        KeyboardButton("🏷️ Discounts & Coupons")
    )
    markup.add(
        KeyboardButton("📢 Send Broadcast"),
        KeyboardButton("⚙️ Bot Settings")
    )
    markup.add(
        KeyboardButton("⏳ Pending Orders"),
        KeyboardButton("📢 Ad Maker")
    )
    return markup

def _send_payment_settings(chat_id, edit_msg_id=None):
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("🔘 Toggle Methods (ON/OFF)", callback_data="pay_toggles_main"))
    markup.add(InlineKeyboardButton("⚙️ Configure API Credentials", callback_data="pay_configs_main"))
    markup.add(InlineKeyboardButton("🔙 Back to Settings", callback_data="bot_settings_menu"))
    
    text = (
        f"💳 **Payment Gateways Manager**\n"
        f"───────────────────────────\n"
        f"Select an option below to manage the store's payment systems. You can toggle gateways ON/OFF or configure their API credentials."
    )
    
    if edit_msg_id:
        try:
            bot.edit_message_text(text, chat_id, edit_msg_id, reply_markup=markup, parse_mode="Markdown")
        except Exception as e:
            if "message is not modified" not in str(e).lower():
                print(e)
    else:
        bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

def _send_payment_toggles(chat_id, edit_msg_id=None):
    db = load_db()
    methods = db.get('payment_methods', {"cashfree": True, "upi_qr": True, "crypto": True, "binance_pay": True})
    
    cashfree_status = "🟢 ON" if methods.get("cashfree", True) else "🔴 OFF"
    upi_qr_status = "🟢 ON" if methods.get("upi_qr", True) else "🔴 OFF"
    crypto_status = "🟢 ON" if methods.get("crypto", True) else "🔴 OFF"
    binance_pay_status = "🟢 ON" if methods.get("binance_pay", True) else "🔴 OFF"
    
    markup = InlineKeyboardMarkup()
    markup.row(
        InlineKeyboardButton(f"💳 Cashfree: {cashfree_status}", callback_data="toggle_pay:cashfree"),
        InlineKeyboardButton(f"🇮🇳 UPI QR: {upi_qr_status}", callback_data="toggle_pay:upi_qr")
    )
    markup.row(
        InlineKeyboardButton(f"🪙 Crypto: {crypto_status}", callback_data="toggle_pay:crypto"),
        InlineKeyboardButton(f"🪙 Binance Pay: {binance_pay_status}", callback_data="toggle_pay:binance_pay")
    )
    markup.row(InlineKeyboardButton("🔙 Go Back", callback_data="payment_settings_main"))
    
    text = (
        f"🟢 **Toggle Payment Gateways**\n"
        f"───────────────────────────\n"
        f"Enable or disable payment gateways in the store. Disabled gateways will not be displayed to users in the deposit menu:\n\n"
        f"• **Cashfree UPI:** `{cashfree_status}`\n"
        f"• **UPI QR (Auto-Verify):** `{upi_qr_status}`\n"
        f"• **Crypto Payments:** `{crypto_status}`\n"
        f"• **Binance Pay (Auto):** `{binance_pay_status}`"
    )
    
    if edit_msg_id:
        try:
            bot.edit_message_text(text, chat_id, edit_msg_id, reply_markup=markup, parse_mode="Markdown")
        except Exception as e:
            if "message is not modified" not in str(e).lower():
                print(e)
    else:
        bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

def _send_payment_configs(chat_id, edit_msg_id=None):
    from manager import get_payment_settings
    pay_settings = get_payment_settings()
    
    markup = InlineKeyboardMarkup()
    markup.row(
        InlineKeyboardButton("⚙️ Config Cashfree", callback_data="conf_gate:cashfree"),
        InlineKeyboardButton("⚙️ Config UPI QR", callback_data="conf_gate:upi_qr")
    )
    markup.row(
        InlineKeyboardButton("⚙️ Config NowPayments", callback_data="conf_gate:nowpayments"),
        InlineKeyboardButton("⚙️ Config Binance Pay", callback_data="conf_gate:binance")
    )
    markup.row(InlineKeyboardButton("🔙 Go Back", callback_data="payment_settings_main"))
    
    text = (
        f"⚙️ **Configure Gateways API**\n"
        f"───────────────────────────\n"
        f"Update the API keys, credentials, and wallet addresses for the integrated payment gateways:\n\n"
        f"🌍 **Cashfree UPI:** `{pay_settings.get('CF_CLIENT_ID', 'N/A')[:6]}...`\n"
        f"📂 **UPI QR (Auto-Verify):** `{pay_settings.get('UPI_ID', 'N/A')}`\n"
        f"🪙 **Crypto Payments:** `{pay_settings.get('NOWPAYMENTS_API_KEY', 'N/A')[:6]}...`\n"
        f"🪙 **Binance Pay (Auto):** `{pay_settings.get('BINANCE_PAY_ID', 'N/A')}`"
    )
    
    if edit_msg_id:
        try:
            bot.edit_message_text(text, chat_id, edit_msg_id, reply_markup=markup, parse_mode="Markdown")
        except Exception as e:
            if "message is not modified" not in str(e).lower():
                print(e)
    else:
        bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

def _send_support_panel(chat_id, edit_msg_id=None):
    db = load_db()
    curr_support = db.get('support_username', 'quantumsera')
    
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("✏️ Edit Support Admin", callback_data="edit_support_target"))
    markup.add(InlineKeyboardButton("🔙 Back to Settings", callback_data="bot_settings_menu"))
    
    text = (
        f"🛠️ **Support Panel Dashboard**\n"
        f"───────────────────────────\n"
        f"Manage customer support channels for your store.\n\n"
        f"💬 **Active Support Target:** `@{curr_support}`\n"
        f"└ _All 'Help & Support' queries in the store bot will route to this Telegram handle._\n"
        f"───────────────────────────\n"
        f"Select an option below to configure support options:"
    )
    
    if edit_msg_id:
        try:
            bot.edit_message_text(text, chat_id, edit_msg_id, reply_markup=markup, parse_mode="Markdown")
        except Exception as e:
            if "message is not modified" not in str(e).lower():
                print(e)
    else:
        bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

def _send_bot_settings_panel(chat_id, edit_msg_id=None):
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("📊 Sorting Settings", callback_data="sort_settings_main"))
    markup.add(InlineKeyboardButton("🛠️ Support Settings", callback_data="support_panel_main"))
    markup.add(InlineKeyboardButton("🎁 Referral Settings", callback_data="referral_settings_main"))
    markup.add(InlineKeyboardButton("⚙️ Payment Settings", callback_data="payment_settings_main"))
    markup.add(InlineKeyboardButton("📖 Tutorial Settings", callback_data="admin_tutorials"))
    markup.add(InlineKeyboardButton("❌ Close Menu", callback_data="close_menu"))
    
    text = (
        f"⚙️ **Bot Configuration Control**\n"
        f"───────────────────────────\n"
        f"Select a settings category below to configure store properties, sorting rules, support channels, payment gateways, and tutorials."
    )
    if edit_msg_id:
        try:
            bot.edit_message_text(text, chat_id, edit_msg_id, reply_markup=markup, parse_mode="Markdown")
        except Exception as e:
            if "message is not modified" not in str(e).lower():
                print(e)
    else:
        bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

def _send_tutorials_panel(chat_id, edit_msg_id=None):
    markup = InlineKeyboardMarkup()
    markup.add(
        InlineKeyboardButton("🟢 How to Top Up", callback_data="edit_tut_how_to_topup"),
        InlineKeyboardButton("🛒 How to Buy", callback_data="edit_tut_how_to_buy")
    )
    markup.add(
        InlineKeyboardButton("🛠 Product Support", callback_data="edit_tut_product_support"),
        InlineKeyboardButton("👨‍💻 Admin Support", callback_data="edit_tut_admin_support")
    )
    markup.add(InlineKeyboardButton("🎬 Video Tutorial Link", callback_data="edit_tut_video_link"))
    markup.add(InlineKeyboardButton("🔙 Back to Settings", callback_data="bot_settings_menu"))
    
    text = "📖 *Tutorial Settings*\n\nSelect a tutorial to edit its text:"
    if edit_msg_id:
        try:
            bot.edit_message_text(text, chat_id, edit_msg_id, reply_markup=markup, parse_mode="Markdown")
        except Exception as e:
            if "message is not modified" not in str(e).lower():
                print(e)
    else:
        bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")


def _send_sorting_settings_panel(chat_id, edit_msg_id=None):
    db = load_db()
    mode = db.get('sorting_mode', 'auto')
    markup = InlineKeyboardMarkup()
    markup.row(
        InlineKeyboardButton("✅ Auto Mode" if mode == 'auto' else "🔘 Auto Mode", callback_data="set_sort:auto"),
        InlineKeyboardButton("✅ Manual Mode" if mode == 'manual' else "🔘 Manual Mode", callback_data="set_sort:manual")
    )
    markup.row(InlineKeyboardButton("🌍 Sort 'Explore All' Products", callback_data="manage_global_pri"))
    markup.row(InlineKeyboardButton("📂 Sort Categories Order", callback_data="manage_cat_pri"))
    markup.row(InlineKeyboardButton("📦 Sort Products inside Category", callback_data="manage_catprod_pri_menu"))
    markup.row(InlineKeyboardButton("🔙 Back to Settings", callback_data="bot_settings_menu"))
    
    text = "📊 **Sorting Mode Settings**\n\nChoose how products and categories are sorted in the store:"
    if edit_msg_id:
        try:
            bot.edit_message_text(text, chat_id, edit_msg_id, reply_markup=markup, parse_mode="Markdown")
        except Exception as e:
            if "message is not modified" not in str(e).lower():
                print(e)
    else:
        bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

def build_store_reply_keyboard():
    markup = ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    buttons = [
        KeyboardButton("🛍️ Explore Store"),
        KeyboardButton("🔍 Search Product"),
        KeyboardButton("💳 Add Balance"),
        KeyboardButton("📦 Order History"),
        KeyboardButton("👤 My Account")
    ]
    db_ref = load_db()
    if db_ref and db_ref.get('referral_enabled', True):
        buttons.append(KeyboardButton("🎁 Invite Users"))
    buttons.append(KeyboardButton("💬 Help & Support"))
    markup.add(*buttons)
    return markup

def safe_send_store_message(main_bot, uid, text, reply_markup=None, parse_mode="Markdown"):
    """Sends a message from store bot to a user, handling rate limits (429) and user blocks."""
    import re
    retries = 3
    while retries > 0:
        try:
            main_bot.send_message(uid, text, reply_markup=reply_markup, parse_mode=parse_mode)
            time.sleep(0.035) # 0.035s delay to respect global limit of 30 msg/sec
            return True
        except telebot.apihelper.ApiTelegramException as e:
            if e.error_code == 429:
                retry_after = 5
                try:
                    match = re.search(r'retry after (\d+)', str(e))
                    if match:
                        retry_after = int(match.group(1))
                    elif hasattr(e, 'result') and hasattr(e.result, 'json'):
                        retry_after = e.result.json().get('parameters', {}).get('retry_after', 5)
                except:
                    pass
                print(f"[Rate Limit] Rate limited for user {uid}. Sleeping for {retry_after}s.")
                time.sleep(retry_after)
                retries -= 1
            elif e.error_code in [400, 403]:
                # 403: Blocked by user, 400: User ID invalid/deactivated/chat not found
                print(f"[Store Send Skip] Skipped user {uid} (Error {e.error_code}: {e.description})")
                return False
            else:
                print(f"[Store Send Error] Failed to send to {uid}: {e}")
                return False
        except Exception as e:
            print(f"[Store Send Error] Network/Unknown error for user {uid}: {e}")
            time.sleep(1)
            retries -= 1
    return False

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

def parse_datetime_to_timestamp(text, is_end_date=False):
    """
    Parses a user-entered datetime string to a timezone-aware IST timestamp.
    Supports YYYY-MM-DD HH:MM, DD-MM-YYYY HH:MM, standard variants, 
    and relative formats (e.g. 'now', '7 days', '2 hours', 'never').
    Returns timestamp or None if parsing fails.
    """
    import re
    from datetime import datetime, timezone, timedelta
    IST = timezone(timedelta(hours=5, minutes=30))
    
    text = text.strip().lower()
    if text == 'now':
        return time.time()
    if is_end_date and text in ['never', 'no', 'none', 'inf', 'infinite']:
        return 9999999999
        
    # Relative time support (e.g., 7 days, 2 hours)
    m = re.match(r'^(\d+)\s*(day|days|d|hour|hours|h|minute|minutes|m)$', text)
    if m:
        val = int(m.group(1))
        unit = m.group(2)
        if unit in ['day', 'days', 'd']:
            return time.time() + val * 86400
        elif unit in ['hour', 'hours', 'h']:
            return time.time() + val * 3600
        else:
            return time.time() + val * 60
            
    formats = [
        "%d-%m-%Y %H:%M",
        "%Y-%m-%d %H:%M",
        "%d/%m/%Y %H:%M",
        "%Y/%m/%d %H:%M",
        "%d-%m-%Y",
        "%Y-%m-%d"
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(text, fmt)
            dt = dt.replace(tzinfo=IST)
            return dt.timestamp()
        except ValueError:
            continue
    return None


# --- CORE COMMANDS ---
@bot.message_handler(commands=['start'])
def send_welcome(message):
    if not is_admin(message):
        bot.reply_to(message, "Unauthorized access. This bot is for admins only.\nPlease use `/login <username> <password>` to access.", parse_mode="Markdown")
        return
    bot.send_message(message.chat.id, "Welcome to the Admin Control Panel.", reply_markup=admin_menu())

@bot.message_handler(commands=['login'])
def cmd_login(message):
    args = message.text.split()
    if len(args) != 3:
        bot.reply_to(message, "Usage: `/login <username> <password>`\nDefault is `/login arafatamingazi Arafat@1213`", parse_mode="Markdown")
        return
        
    user_id = args[1]
    pwd = args[2]
    
    db = load_db()
    if "admin_credentials" not in db:
        db["admin_credentials"] = {"arafatamingazi": "Arafat@1213"}
        save_db(db)
        
    creds = db.get("admin_credentials", {})
    
    if user_id in creds and str(creds[user_id]) == pwd:
        if 'admin_ids' not in db:
            db['admin_ids'] = []
        if message.chat.id not in db['admin_ids']:
            db['admin_ids'].append(message.chat.id)
            save_db(db)
        bot.send_message(message.chat.id, "✅ Login Successful!")
        send_welcome(message)
    else:
        bot.send_message(message.chat.id, "❌ Invalid credentials.")


# ─── HELPERS ────────────────────────────────────────────────────

def set_item_priority(full_db_dict, target_id, new_p, priority_key, filter_func=None):
    """
    Shifts items to ensure they are sequentially numbered 1..N
    and inserts target_id at new_p, shifting others down.
    """
    if filter_func:
        items_dict = {k: v for k, v in full_db_dict.items() if filter_func(v)}
    else:
        items_dict = full_db_dict
        
    if target_id not in items_dict: return
    
    n = len(items_dict)
    if new_p < 1: new_p = 1
    if new_p > n: new_p = n
    
    sorted_items = sorted(items_dict.items(), key=lambda x: (x[1].get(priority_key, 999999), x[1].get('name', '')))
    
    keys = [k for k, v in sorted_items]
    
    keys.remove(target_id)
    keys.insert(new_p - 1, target_id)
    
    for i, k in enumerate(keys, start=1):
        full_db_dict[k][priority_key] = i

def _send_orders_status_list(chat_id, db, status, page=1, edit_msg_id=None, call_id=None):
    if not db:
        from manager import load_db
        db = load_db()
    sales = db.get('sales', [])
    status_sales = [s for s in sales if s.get('status', 'Delivered') == status]
    
    if not status_sales:
        if call_id:
            bot.answer_callback_query(call_id, f"No {status} orders found.", show_alert=True)
        else:
            bot.send_message(chat_id, f"No {status} orders found.")
        return
        
    users_orders = {}
    for s in status_sales:
        uid = str(s.get('user_id'))
        ts = s.get('purchase_ts', 0)
        if uid not in users_orders:
            users_orders[uid] = {"username": s.get('username', 'Unknown'), "count": 0, "last_ts": ts}
        users_orders[uid]["count"] += 1
        if ts > users_orders[uid]["last_ts"]:
            users_orders[uid]["last_ts"] = ts
            
    sorted_users = sorted(users_orders.items(), key=lambda x: x[1]["last_ts"], reverse=True)
    
    PAGE_SIZE = 10
    total = len(sorted_users)
    total_pages = (total + PAGE_SIZE - 1) // PAGE_SIZE
    page = max(1, min(page, total_pages))
    
    start_idx = (page - 1) * PAGE_SIZE
    end_idx = start_idx + PAGE_SIZE
    page_items = sorted_users[start_idx:end_idx]
    
    markup = InlineKeyboardMarkup(row_width=1)
    for uid, info in page_items:
        btn_text = f"👤 @{info['username']} ({uid}) - {info['count']} Orders"
        markup.add(InlineKeyboardButton(btn_text, callback_data=f"cust_u:{uid}:{status}"))
        
    nav_row = []
    if page > 1:
        nav_row.append(InlineKeyboardButton("◀️", callback_data=f"orders_s:{status}:{page-1}"))
    nav_row.append(InlineKeyboardButton(f"Page {page}/{total_pages}", callback_data="noop"))
    if page < total_pages:
        nav_row.append(InlineKeyboardButton("▶️", callback_data=f"orders_s:{status}:{page+1}"))
        
    if nav_row:
        markup.row(*nav_row)
        
    markup.row(
        InlineKeyboardButton("🔍 Search", callback_data="search_orders_prompt"),
        InlineKeyboardButton("🔙 Go Back", callback_data="orders_main_menu")
    )
    
    text_msg = f"📋 **{status} Orders - Select Customer** (Recent First)\nTotal Customers: {total}\n\nSelect a user to view their products/orders:"
    if edit_msg_id:
        bot.edit_message_text(text_msg, chat_id, edit_msg_id, reply_markup=markup, parse_mode="Markdown")
    else:
        bot.send_message(chat_id, text_msg, reply_markup=markup, parse_mode="Markdown")

def _send_manage_products(chat_id, db, edit_msg_id=None):
    """Sends (or edits) the Manage Products top-level menu."""
    products = db.get('products', {})
    
    active = {pid: p for pid, p in products.items()
              if p.get('is_active', True) and sum(len(arr) for arr in p.get('stock_pools', {}).values()) > 0}
    inactive = {pid: p for pid, p in products.items()
                if pid not in active}
    def is_low_stock(p):
        if not p.get('is_active', True):
            return False
        stock_pools = p.get('stock_pools', {})
        if not stock_pools:
            return True
        for pool_id, arr in stock_pools.items():
            if not p.get('infinite_pools', {}).get(pool_id, False) and len(arr) < 3:
                return True
        return False
        
    low_stock = {pid: p for pid, p in products.items() if is_low_stock(p)}
    
    markup = InlineKeyboardMarkup(row_width=2)
    markup.row(
        InlineKeyboardButton(f"📦 All Products ({len(products)})", callback_data="mp_all"),
        InlineKeyboardButton(f"⚠️ Low Stock ({len(low_stock)})", callback_data="mp_lowstock")
    )
    markup.row(
        InlineKeyboardButton("📁 Categories", callback_data="cat_mgt"),
        InlineKeyboardButton("➕ Add Product", callback_data="add_prod")
    )
    markup.row(
        InlineKeyboardButton("🗑️ Delete Product", callback_data="list_del_prod"),
        InlineKeyboardButton("❌ Close Panel", callback_data="close_menu")
    )
    
    text = (
        "📦 **MANAGE CATALOG PANEL**\n"
        "───────────────────────────\n"
        "Configure product listings, monitor active inventory, manage catalog categories, and edit pricing or stock pools.\n\n"
        "👇 **Select an option below to proceed:**"
    )
    if edit_msg_id:
        try:
            bot.edit_message_text(text, chat_id, edit_msg_id, reply_markup=markup, parse_mode="Markdown")
        except Exception as e:
            if "message is not modified" not in str(e).lower():
                raise e
    else:
        bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

def _send_deposit_menu(chat_id, edit_msg_id=None):
    """Sends or edits the top-level Customer Deposit status menu."""
    markup = InlineKeyboardMarkup()
    markup.row(
        InlineKeyboardButton("🟢 Completed", callback_data="dep_s:Success:1"),
        InlineKeyboardButton("⏳ Pending", callback_data="dep_s:Pending:1")
    )
    markup.row(
        InlineKeyboardButton("🔴 Failed", callback_data="dep_s:Failed:1"),
        InlineKeyboardButton("🔍 Search", callback_data="search_deposits_prompt")
    )
    
    markup.row(
        InlineKeyboardButton("🔙 Go Back", callback_data="close_menu")
    )
    text = "💰 **Customer Deposits Menu**\n\nChoose a category to view deposits, or search for a specific customer's history:"
    if edit_msg_id:
        try:
            bot.edit_message_text(text, chat_id, edit_msg_id, reply_markup=markup, parse_mode="Markdown")
        except Exception as e:
            if "message is not modified" not in str(e).lower():
                print(e)
    else:
        bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

def step_admin_add_utr_id(message):
    chat_id = message.chat.id
    if not message.text: return
    utr = message.text.strip()
    if utr.lower() == 'cancel':
        return bot.send_message(chat_id, "❌ Manual UTR logging cancelled.", reply_markup=admin_menu())
        
    if not utr.isdigit() or len(utr) != 12:
        msg = bot.send_message(chat_id, "❌ *Invalid UTR ID.* Must be exactly 12 digits. Please try again (or type 'cancel'):", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_admin_add_utr_id)
        return
        
    # Check if UTR already exists in DB
    db = load_db()
    if 'upi_payments' in db:
        exists = any(p.get('utr') == utr for p in db['upi_payments'])
        if exists:
            return bot.send_message(chat_id, "❌ *This UTR ID already exists in the database.*", parse_mode="Markdown", reply_markup=admin_menu())
            
    msg = bot.send_message(chat_id, f"✍️ UTR ID: `{utr}`\n\nPlease enter the **Amount (₹)** for this transaction:", parse_mode="Markdown")
    bot.register_next_step_handler(msg, lambda msg: step_admin_add_utr_amount(msg, utr))

def step_admin_add_utr_amount(message, utr):
    chat_id = message.chat.id
    if not message.text: return
    val = message.text.strip()
    if val.lower() == 'cancel':
        return bot.send_message(chat_id, "❌ Manual UTR logging cancelled.", reply_markup=admin_menu())
        
    try:
        amount = float(val)
        if amount <= 0: raise ValueError
    except ValueError:
        msg = bot.send_message(chat_id, "❌ *Invalid Amount.* Please enter a valid positive number (or type 'cancel'):", parse_mode="Markdown")
        bot.register_next_step_handler(msg, lambda msg: step_admin_add_utr_amount(msg, utr))
        return
        
    # Save the payment record
    db = load_db()
    if 'upi_payments' not in db:
        db['upi_payments'] = []
        
    new_payment = {
        "utr": utr,
        "amount": amount,
        "status": "unclaimed",
        "timestamp": time.time(),
        "sender": "Admin",
        "raw_sms": f"Manually logged by Admin {chat_id}"
    }
    db['upi_payments'].append(new_payment)
    save_db(db)
    
    success_text = (
        f"✅ *Manual UTR Logged Successfully!* \n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"• UTR ID: `{utr}`\n"
        f"• Amount: *₹{amount}*\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"Status is set to `unclaimed`. Customers can now claim this payment by entering the UTR in the bot."
    )
    bot.send_message(chat_id, success_text, parse_mode="Markdown", reply_markup=admin_menu())


def _product_detail_markup(pid, p):
    """Returns the InlineKeyboard for a single product's detail page."""
    markup = InlineKeyboardMarkup(row_width=2)
    markup.row(
        InlineKeyboardButton("⚙️ Edit Product", callback_data=f"ep_menu:{pid}"),
        InlineKeyboardButton("📦 Stock & Pools", callback_data=f"sp_menu:{pid}")
    )
    markup.row(
        InlineKeyboardButton("🔗 Share Link", url=f"https://t.me/{STORE_BOT_USERNAME}?start={pid}")
    )
    
    is_active = p.get('is_active', True)
    stock_total = sum(len(arr) for arr in p.get('stock_pools', {}).values())
    if is_active:
        markup.row(InlineKeyboardButton("🔴 Disable Product", callback_data=f"toggle_active:{pid}:0"))
    else:
        markup.row(InlineKeyboardButton("🟢 Enable Product", callback_data=f"toggle_active:{pid}:1"))
        
    back_cb = "mp_active" if (is_active and stock_total > 0) else "mp_inactive"
    markup.row(
        InlineKeyboardButton("🔙 Back to Catalog", callback_data=back_cb)
    )
    return markup

def _edit_product_markup(pid):
    markup = InlineKeyboardMarkup(row_width=2)
    markup.row(
        InlineKeyboardButton("✏️ Edit Name", callback_data=f"editname:{pid}"),
        InlineKeyboardButton("📝 Edit Description", callback_data=f"editdesc:{pid}")
    )
    markup.row(
        InlineKeyboardButton("📁 Edit Category", callback_data=f"edit_prod_cat:{pid}"),
        InlineKeyboardButton("⚙️ Manage Variants", callback_data=f"cfg_{pid}")
    )
    db = load_db()
    p = db.get('products', {}).get(pid, {})
    is_auto = p.get('delivery_process', 'auto') == 'auto'
    
    markup.row(
        InlineKeyboardButton("📜 Edit Rules", callback_data=f"editrules:{pid}"),
        InlineKeyboardButton("⏱️ Edit Delivery Time", callback_data=f"editdeltime:{pid}")
    )

    markup.row(
        InlineKeyboardButton(f"{'✅ ' if is_auto else ''}⚙️ Auto Delivery", callback_data=f"set_del_proc:auto:{pid}"),
        InlineKeyboardButton(f"{'✅ ' if not is_auto else ''}🧑‍💻 Manual Delivery", callback_data=f"set_del_proc:manual:{pid}")
    )
    markup.row(InlineKeyboardButton("🔙 Back", callback_data=f"prod_detail:{pid}"))
    return markup

def _stock_pools_markup(pid):
    markup = InlineKeyboardMarkup(row_width=2)
    markup.row(
        InlineKeyboardButton("🧊 Manage Pools", callback_data=f"managepools:{pid}"),
        InlineKeyboardButton("📦 Manage Stock", callback_data=f"ms_menu:{pid}")
    )
    markup.row(InlineKeyboardButton("🔙 Back", callback_data=f"prod_detail:{pid}"))
    return markup

def _manage_stock_markup(pid):
    markup = InlineKeyboardMarkup(row_width=2)
    markup.row(
        InlineKeyboardButton("➕ Add Stock", callback_data=f"selstock:{pid}"),
        InlineKeyboardButton("🔍 Check Stock", callback_data=f"delstock:{pid}")
    )
    markup.row(
        InlineKeyboardButton("🗑️ Clear All Stock", callback_data=f"clear_stock:{pid}")
    )
    markup.row(InlineKeyboardButton("🔙 Back to Stock & Pools", callback_data=f"sp_menu:{pid}"))
    return markup


def _product_detail_text(pid, p, db=None):
    if db is None: db = load_db()
    stock_total = sum(len(arr) for arr in p.get('stock_pools', {}).values())
    cat_name = "Uncategorized"
    cid = p.get('category_id')
    if cid and cid != 'others':
        cat_name = db.get('categories', {}).get(cid, {}).get('name', 'Unknown')
        
    lines = [
        "📦 **PRODUCT DETAIL CARD**",
        "───────────────────────────",
        f"📛 **Name**: `{p['name']}`",
        f"📁 **Category**: `{cat_name}`",
        f"📦 **Stock Status**: `{'🟢 Active (In Stock)' if stock_total > 0 else '🔴 Inactive (Out of Stock)'}`",
        f"👁️ **Visibility**: `{'🟢 Enabled (Visible)' if p.get('is_active', True) else '🔴 Disabled (Hidden)'}`",
        f"📊 **Total Stock**: `{stock_total} item(s)`",
        f"⚡ **Delivery Process**: `{'Automatic' if p.get('delivery_process', 'auto') == 'auto' else 'Manual'}`",
        f"⏱️ **Delivery Time**: `{p.get('delivery_time', 'Instant')}`",
        "───────────────────────────",
        "📝 **Description**:",
        f"{p.get('description', 'No description set.')}",
        "───────────────────────────"
    ]
    
    if p.get('stock_pools'):
        lines.append("🧊 **Stock Pools**:")
        for pool_id, arr in p.get('stock_pools', {}).items():
            lines.append(f"• Pool `{pool_id}` — `{len(arr)}` items")
            
    if p.get('variants'):
        lines.append("\n🏷️ **Variants & Pricing**:")
        for v in p.get('variants', {}).values():
            lines.append(f"• `{v['name']}` — `₹{v['price']}` (Pool: `{v.get('pool_id','?')}`)")
            
    if not p.get('is_active', True):
        reason = p.get('inactive_reason', 'out_of_stock')
        reason_str = "Out of Stock" if reason == 'out_of_stock' else "Disabled by Admin"
        lines.append(f"\n🔴 **Status Detail**: `INACTIVE ({reason_str})`")
        
    return "\n".join(lines)

def _send_ad_maker_menu(chat_id, edit_msg_id=None):
    db = load_db()
    products = db.get('products', {})
    if chat_id not in conv_states:
        conv_states[chat_id] = {}
    if 'ad_selected' not in conv_states[chat_id]:
        conv_states[chat_id]['ad_selected'] = []
        
    selected = conv_states[chat_id]['ad_selected']
    markup = InlineKeyboardMarkup(row_width=1)
    
    sorted_prods = sorted(products.items(), key=lambda x: x[1].get('name', ''))
    
    for pid, p in sorted_prods:
        if not p.get('is_active', True):
            continue
        p_name = p.get('name', 'Unnamed')
        btn_text = f"✅ {p_name}" if pid in selected else f"⬜️ {p_name}"
        markup.add(InlineKeyboardButton(btn_text, callback_data=f"ad_toggle:{pid}"))
        
    markup.row(
        InlineKeyboardButton("✅ Select All", callback_data="ad_sel_all"),
        InlineKeyboardButton("⬜️ Deselect All", callback_data="ad_desel_all")
    )
    markup.row(
        InlineKeyboardButton("📝 Generate Ad", callback_data="ad_generate"),
        InlineKeyboardButton("❌ Close", callback_data="close_menu")
    )
    
    text = (
        "📢 **Auto Ad Maker**\n"
        "───────────────────────────\n"
        "Select the products you want to include in your ad. The generated ad will automatically display the cheapest variant's price in INR and USD.\n\n"
        "👇 **Select Products:**"
    )
    
    if edit_msg_id:
        try:
            bot.edit_message_text(text, chat_id, edit_msg_id, reply_markup=markup, parse_mode="Markdown")
        except Exception as e:
            if "message is not modified" not in str(e).lower():
                print(e)
    else:
        bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

# --- TEXT MENUS (BOTTOM KEYBOARD) ---

@bot.message_handler(content_types=['text'])
def handle_menu(message):
    if not is_admin(message): return
    chat_id = message.chat.id
    
    # Check MongoDB for cross-instance state
    from manager import db_mongo
    doc = db_mongo.system.find_one({'_id': 'admin_states'})
    all_states = doc.get('states', {}) if doc else {}
    state = all_states.get(str(chat_id), {})
        
    text = message.text
    
    if text in ["🛍 Manage Products", "🏷️ Manage Products", "📦 Manage Catalog"]:
        db = load_db()
        _send_manage_products(chat_id, db)

    elif text in ["💰 Manage Balances", "💳 Manage Balances", "💳 User Balances"]:
        msg = bot.send_message(chat_id, "Type the exact **User ID** you want to add balance to (or type 'cancel'):", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_bal_uid)
        
    elif text == "📢 Ad Maker":
        _send_ad_maker_menu(chat_id)
        
        
    elif text in ["📢 Broadcast", "📣 Broadcast", "📢 Send Broadcast"]:
        markup = InlineKeyboardMarkup(row_width=1)
        markup.add(
            InlineKeyboardButton("💬 Send Text Broadcast", callback_data="bc_type:text"),
            InlineKeyboardButton("📦 Send Product Broadcast", callback_data="bc_type:product"),
            InlineKeyboardButton("❌ Cancel", callback_data="close_menu")
        )
        bot.send_message(chat_id, "📢 **Select Broadcast Type**\n\nChoose what you want to broadcast to all users:", reply_markup=markup, parse_mode="Markdown")
        
    elif text in ["⏳ Pending Orders", "Pending Orders"]:
        db = load_db()
        _send_orders_status_list(chat_id, db, "Pending")
        
    elif text in ["📋 Customer Orders", "📜 Customer Orders", "📜 Recent Orders", "📜 Manage Orders"]:
        markup = InlineKeyboardMarkup()
        markup.row(
            InlineKeyboardButton("⏳ Pending", callback_data="orders_s:Pending:1"),
            InlineKeyboardButton("🟢 Delivered", callback_data="orders_s:Delivered:1")
        )
        markup.row(
            InlineKeyboardButton("🔴 Canceled", callback_data="orders_s:Canceled:1"),
            InlineKeyboardButton("💰 Refunded", callback_data="orders_s:Refunded:1")
        )
        markup.row(
            InlineKeyboardButton("⏸️ On Hold", callback_data="orders_s:On Hold:1"),
            InlineKeyboardButton("📦 Pre-Order", callback_data="orders_s:Pre-Order:1")
        )
        markup.row(
            InlineKeyboardButton("🔍 Search", callback_data="search_orders_prompt"),
            InlineKeyboardButton("❌ Close Menu", callback_data="close_menu")
        )
        bot.send_message(chat_id, "📋 **Customer Orders Menu**\n\nSelect a status category to view orders (recent first), or search for a customer's specific orders:", reply_markup=markup, parse_mode="Markdown")
        
    elif text in ["📖 Manage Tutorials", "📖 Tutorial Settings", "Tutorial Settings"]:
        _send_tutorials_panel(chat_id)
        
    elif text in ["👥 Bot Users", "👑 Bot Users"]:
        _send_bot_users(chat_id)
        
    elif text in ["💰 Customer Deposit", "💸 Customer Deposit", "💸 User Deposits"]:
        _send_deposit_menu(chat_id)
        
    elif text in ["📊 Sorting Settings", "⚙️ Sorting Settings", "⚙️ Sort Settings"]:
        _send_sorting_settings_panel(chat_id)
 
    elif text in ["📞 Contact Support Admin", "🛠️ Contact Support Admin", "🛠️ Support Panel", "🛠️ Support Settings", "Support Settings"]:
        _send_support_panel(chat_id)
 
    elif text in ["🏷️ Discounts & Coupons", "Discounts & Coupons"]:
        markup = InlineKeyboardMarkup(row_width=2)
        markup.row(
            InlineKeyboardButton("📉 Auto-Discounts", callback_data="mgt_discounts:1"),
            InlineKeyboardButton("🎫 Coupon Codes", callback_data="mgt_coupons:1")
        )
        markup.row(
            InlineKeyboardButton("➕ Add Discount", callback_data="create_disc_start"),
            InlineKeyboardButton("➕ Add Coupon", callback_data="create_coup_start")
        )
        markup.row(InlineKeyboardButton("❌ Close Menu", callback_data="close_menu"))
        
        text_msg = (
            "🏷️ **DISCOUNTS & COUPONS PANEL**\n"
            "───────────────────────\n"
            "Manage promotional offers, active discounts, and shopping coupons.\n\n"
            "• **Discounts**: Automatic price reductions on catalog items.\n"
            "• **Coupons**: Code-based checkout discounts (e.g., `SAVE10`)."
        )
        bot.send_message(chat_id, text_msg, reply_markup=markup, parse_mode="Markdown")
 
    elif text in ["🎁 Referral Program", "Referral Program", "🎁 Referral Settings", "Referral Settings"]:
        _send_referral_panel(chat_id)
 
    elif text in ["⚙️ Payment Settings", "💳 Payment Settings", "Payment Settings"]:
        _send_payment_settings(chat_id)

    elif text in ["⚙️ Bot Settings", "Bot Settings"]:
        _send_bot_settings_panel(chat_id)
def _send_discount_broadcast_bg(msg_text, markup):
    try:
        db = load_db()
        users = db.get('users', {})
        main_bot = telebot.TeleBot(STORE_BOT_TOKEN)
        
        # --- SEND TO MANDATORY CHANNEL & GROUP ---
        from manager import CHANNEL_USERNAME, GROUP_CHAT_ID
        if CHANNEL_USERNAME:
            try: main_bot.send_message(CHANNEL_USERNAME, msg_text, reply_markup=markup, parse_mode="HTML")
            except Exception as e: print(f"Failed to send disc bc to channel: {e}")
        if GROUP_CHAT_ID:
            try: main_bot.send_message(GROUP_CHAT_ID, msg_text, reply_markup=markup, parse_mode="HTML")
            except Exception as e: print(f"Failed to send disc bc to group: {e}")
        # -----------------------------------------
        
        count = 0
        for uid in users.keys():
            if safe_send_store_message(main_bot, int(uid), msg_text, reply_markup=markup, parse_mode="HTML"):
                count += 1
        print(f"[Discount Broadcast] Sent to {count} users.")
    except Exception as e:
        print(f"Error in discount broadcast bg: {e}")

def broadcast_discount(new_disc, db):
    try:
        products = db.get('products', {})
        target_type = new_disc.get('target_type', 'all')
        target_products = new_disc.get('target_products', [])
        
        valid_prods = []
        if target_type == 'all':
            valid_prods = [(pid, p) for pid, p in products.items()]
        else:
            for pid in target_products:
                if pid in products:
                    valid_prods.append((pid, products[pid]))
        
        if not valid_prods:
            return
            
        val_str = f"{new_disc['value']}%" if new_disc['type'] == 'percentage' else f"₹{new_disc['value']}"
        
        import html
        safe_name = html.escape(new_disc['name'])
        
        msg_text = (
            f"🎉 <b>MEGA DISCOUNT ALERT</b> 🎉\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"🔥 <b>{safe_name}</b> is now LIVE!\n\n"
            f"Get a massive <b>{val_str} OFF</b> on our premium products!\n"
            f"Hurry up before the offer expires! ⏳\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"👇 <i>Click below to grab your discount now:</i>"
        )
        
        markup = InlineKeyboardMarkup(row_width=1)
        for pid, prod in valid_prods[:15]: 
            markup.add(InlineKeyboardButton(f"🎁 Buy {prod['name']} - {val_str} OFF", url=f"https://t.me/{STORE_BOT_USERNAME}?start={pid}"))
            
        if len(valid_prods) > 15:
            markup.add(InlineKeyboardButton(f"🛍️ View All Products", url=f"https://t.me/{STORE_BOT_USERNAME}?start=catalog"))
            
        threading.Thread(target=_send_discount_broadcast_bg, args=(msg_text, markup), daemon=True).start()
    except Exception as e:
        print(f"Error building discount broadcast: {e}")

@bot.callback_query_handler(func=lambda call: True)
def handle_callbacks(call):
    chat_id = call.message.chat.id
    # Acknowledge callback immediately to eliminate button loading spinner
    try: bot.answer_callback_query(call.id)
    except: pass

    # CRITICAL: Clear any pending text input handlers when an inline admin button is clicked
    bot.clear_step_handler_by_chat_id(chat_id)
    
    data = call.data
    db = load_db()

    if data.startswith("ad_toggle:"):
        pid = data.split(":")[1]
        if chat_id not in conv_states: conv_states[chat_id] = {}
        if 'ad_selected' not in conv_states[chat_id]: conv_states[chat_id]['ad_selected'] = []
        if pid in conv_states[chat_id]['ad_selected']:
            conv_states[chat_id]['ad_selected'].remove(pid)
        else:
            conv_states[chat_id]['ad_selected'].append(pid)
        _send_ad_maker_menu(chat_id, call.message.message_id)
        return
        
    elif data == "ad_sel_all":
        if chat_id not in conv_states: conv_states[chat_id] = {}
        conv_states[chat_id]['ad_selected'] = [pid for pid, p in db.get('products', {}).items() if p.get('is_active', True)]
        _send_ad_maker_menu(chat_id, call.message.message_id)
        return
        
    elif data == "ad_desel_all":
        if chat_id not in conv_states: conv_states[chat_id] = {}
        conv_states[chat_id]['ad_selected'] = []
        _send_ad_maker_menu(chat_id, call.message.message_id)
        return
        
    elif data == "ad_generate":
        selected = conv_states.get(chat_id, {}).get('ad_selected', [])
        if not selected:
            bot.answer_callback_query(call.id, "❌ No products selected!", show_alert=True)
            return
            
        ad_text = "🌟 *PREMIUM DIGITAL SERVICES* 🌟\n━━━━━━━━━━━━━━━━━━━━━━\n\n"
        products = db.get('products', {})
        
        for pid in selected:
            p = products.get(pid)
            if not p: continue
            p_name = p.get('name', 'Unnamed')
            variants = p.get('variants', [])
            
            min_price = None
            if isinstance(variants, list):
                for v in variants:
                    price = v.get('price', 0.0)
                    if min_price is None or price < min_price:
                        min_price = price
            elif isinstance(variants, dict):
                for v in variants.values():
                    price = v.get('price', 0.0)
                    if min_price is None or price < min_price:
                        min_price = price
                    
            if min_price is not None:
                usd_price = converter.format_price(min_price, "USD")
                inr_price = converter.format_price(min_price, "INR")
                ad_text += f"🔹 *{p_name}* {inr_price} | {usd_price} 💎\n"
            else:
                ad_text += f"🔹 *{p_name}* Contact Admin 💎\n"
                
        ad_text += "━━━━━━━━━━━━━━━━━━━━━━\n"
        ad_text += f"🛒 *Instant Auto-Delivery:* @{STORE_BOT_USERNAME}\n"
        ad_text += f"💬 *24/7 Premium Support*"
        
        bot.send_message(chat_id, ad_text, parse_mode="Markdown")
        bot.answer_callback_query(call.id, "✅ Ad Generated successfully!")
        return

    elif data == 'admin_tutorials':
        _send_tutorials_panel(chat_id, call.message.message_id)
        return
        
    elif data.startswith('edit_tut_'):
        tut_id = data.replace('edit_tut_', '')
        if tut_id == 'video_link':
            current_text = db.get('video_tutorial_link', 'https://t.me/howtousebotqxd')
        else:
            tutorials = db.get('tutorials', {})
            current_text = tutorials.get(tut_id, "_No text set_")
        
        tut_names = {
            "how_to_topup": "How to Top Up",
            "how_to_buy": "How to Buy",
            "product_support": "Product Support",
            "admin_support": "Admin Support",
            "video_link": "Video Tutorial Link"
        }
        display_name = tut_names.get(tut_id, tut_id)
        
        prompt_text = (
            f"📝 **Editing Tutorial: {display_name}**\n"
            f"───────────────────────────\n"
            f"💡 **Current Text:**\n{current_text}\n"
            f"───────────────────────────\n"
            f"✍️ *Please send the new tutorial text below (Markdown is supported):*"
        )
        
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("❌ Cancel Edit", callback_data="cancel_edit_tut"))
        
        try:
            msg = bot.edit_message_text(prompt_text, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        except Exception:
            msg = bot.send_message(chat_id, prompt_text, reply_markup=markup, parse_mode="Markdown")
            
        conv_states[chat_id] = {'state': 'edit_tut', 'tut_id': tut_id, 'prompt_msg_id': msg.message_id}
        bot.register_next_step_handler(msg, step_edit_tutorial)
        return

    elif data == 'cancel_edit_tut':
        bot.clear_step_handler_by_chat_id(chat_id)
        conv_states.pop(chat_id, None)
        _send_tutorials_panel(chat_id, call.message.message_id)
        return


    elif data.startswith("cancel_pri_edit:"):
        target = data.replace("cancel_pri_edit:", "")
        bot.clear_step_handler_by_chat_id(chat_id)
        conv_states.pop(chat_id, None)
        call.data = target
        handle_callbacks(call)
        return

    elif data == "support_panel_main":
        _send_support_panel(chat_id, call.message.message_id)
        return

    elif data == "bot_settings_menu":
        _send_bot_settings_panel(chat_id, call.message.message_id)
        return

    elif data == "referral_settings_main":
        _send_referral_panel(chat_id, call.message.message_id)
        return

    elif data == "edit_support_target":
        conv_states[chat_id] = {'state': 'edit_support_target', 'prompt_msg_id': call.message.message_id}
        
        prompt_text = (
            f"✏️ **Update Support Admin**\n"
            f"───────────────────────────\n"
            f"✍️ *Please send the new Telegram Username (e.g. `quantumsera` without @) "
            f"or Telegram User ID (e.g. `123456789`) below.*\n\n"
            f"⚠️ *Make sure the account has public messaging permissions so customers can message them.*"
        )
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_support_edit"))
        
        bot.edit_message_text(prompt_text, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        bot.register_next_step_handler(call.message, step_save_support_username)
        return

    elif data == "cancel_support_edit":
        bot.clear_step_handler_by_chat_id(chat_id)
        conv_states.pop(chat_id, None)
        _send_support_panel(chat_id, call.message.message_id)
        return

    elif data == "payment_settings_main":
        _send_payment_settings(chat_id, call.message.message_id)
        return

    elif data == "pay_toggles_main":
        _send_payment_toggles(chat_id, call.message.message_id)
        return

    elif data == "pay_configs_main":
        _send_payment_configs(chat_id, call.message.message_id)
        return

    elif data.startswith("conf_gate:"):
        gate = data.split(":")[1]
        from manager import get_payment_settings
        pay_settings = get_payment_settings()
        
        markup = InlineKeyboardMarkup()
        
        if gate == "cashfree":
            text = (
                f"⚙️ **Cashfree UPI Credentials**\n"
                f"───────────────────────────\n"
                f"🆔 **App Client ID:** `{pay_settings.get('CF_CLIENT_ID', 'Not Configured')}`\n"
                f"🔑 **Client Secret:** `{pay_settings.get('CF_SECRET', 'Not Configured')}`\n"
                f"🌐 **Environment:** `{pay_settings.get('CF_ENV', 'PRODUCTION')}`\n"
                f"───────────────────────────\n"
                f"Select an option below to update the credentials:"
            )
            markup.row(
                InlineKeyboardButton("✏️ Edit Client ID", callback_data="edit_gate_val:CF_CLIENT_ID"),
                InlineKeyboardButton("✏️ Edit Client Secret", callback_data="edit_gate_val:CF_SECRET")
            )
            markup.row(
                InlineKeyboardButton("🌐 Toggle Env (Prod/Sandbox)", callback_data="edit_gate_env:CF_ENV"),
                InlineKeyboardButton("🔙 Go Back", callback_data="pay_configs_main")
            )
            
        elif gate == "upi_qr":
            text = (
                f"⚙️ **UPI QR Credentials**\n"
                f"───────────────────────────\n"
                f"🇮🇳 **UPI ID (VPA):** `{pay_settings.get('UPI_ID', 'Not Configured')}`\n"
                f"───────────────────────────\n"
                f"Select an option below to update the UPI ID:"
            )
            markup.row(
                InlineKeyboardButton("✏️ Edit UPI ID", callback_data="edit_gate_val:UPI_ID"),
                InlineKeyboardButton("🔙 Go Back", callback_data="pay_configs_main")
            )
            
        elif gate == "nowpayments":
            text = (
                f"⚙️ **NowPayments Credentials**\n"
                f"───────────────────────────\n"
                f"🪙 **API Key:** `{pay_settings.get('NOWPAYMENTS_API_KEY', 'Not Configured')}`\n"
                f"───────────────────────────\n"
                f"Select an option below to update the API key:"
            )
            markup.row(
                InlineKeyboardButton("✏️ Edit API Key", callback_data="edit_gate_val:NOWPAYMENTS_API_KEY"),
                InlineKeyboardButton("🔙 Go Back", callback_data="pay_configs_main")
            )
            
        elif gate == "binance":
            text = (
                f"⚙️ **Binance Pay Credentials**\n"
                f"───────────────────────────\n"
                f"🆔 **Binance Pay ID:** `{pay_settings.get('BINANCE_PAY_ID', 'Not Configured')}`\n"
                f"🔑 **Binance API Key:** `{pay_settings.get('BINANCE_API_KEY', 'Not Configured')}`\n"
                f"🔒 **Binance Secret:** `{pay_settings.get('BINANCE_API_SECRET', 'Not Configured')}`\n"
                f"───────────────────────────\n"
                f"Select an option below to update the credentials:"
            )
            markup.row(
                InlineKeyboardButton("✏️ Edit Pay ID", callback_data="edit_gate_val:BINANCE_PAY_ID"),
                InlineKeyboardButton("✏️ Edit API Key", callback_data="edit_gate_val:BINANCE_API_KEY")
            )
            markup.row(
                InlineKeyboardButton("✏️ Edit Secret", callback_data="edit_gate_val:BINANCE_API_SECRET"),
                InlineKeyboardButton("🔙 Go Back", callback_data="pay_configs_main")
            )
            
        bot.edit_message_text(text, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("edit_gate_env:"):
        from manager import get_payment_settings
        pay_settings = get_payment_settings()
        curr_env = pay_settings.get('CF_ENV', 'PRODUCTION')
        new_env = 'SANDBOX' if curr_env == 'PRODUCTION' else 'PRODUCTION'
        
        db = load_db()
        if 'payment_settings' not in db:
            db['payment_settings'] = {}
        db['payment_settings']['CF_ENV'] = new_env
        save_db(db)
        
        bot.answer_callback_query(call.id, f"✅ Environment set to {new_env}!")
        call.data = "conf_gate:cashfree"
        handle_callbacks(call)
        return

    elif data.startswith("edit_gate_val:"):
        key = data.split(":")[1]
        conv_states[chat_id] = {'state': 'edit_gate_val', 'key': key, 'prompt_msg_id': call.message.message_id}
        
        key_names = {
            "CF_CLIENT_ID": "Cashfree Client ID",
            "CF_SECRET": "Cashfree Secret Key",
            "UPI_ID": "UPI ID (VPA)",
            "NOWPAYMENTS_API_KEY": "NowPayments API Key",
            "BINANCE_PAY_ID": "Binance Pay ID",
            "BINANCE_API_KEY": "Binance API Key",
            "BINANCE_API_SECRET": "Binance API Secret"
        }
        display_name = key_names.get(key, key)
        
        gate_map = {
            "CF_CLIENT_ID": "cashfree",
            "CF_SECRET": "cashfree",
            "UPI_ID": "upi_qr",
            "NOWPAYMENTS_API_KEY": "nowpayments",
            "BINANCE_PAY_ID": "binance",
            "BINANCE_API_KEY": "binance",
            "BINANCE_API_SECRET": "binance"
        }
        gate_type = gate_map.get(key, "cashfree")
        
        prompt_text = (
            f"✏️ **Edit {display_name}**\n"
            f"───────────────────────────\n"
            f"✍️ *Please send the new value for this field below.*"
        )
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data=f"cancel_gate_edit:{gate_type}"))
        
        bot.edit_message_text(prompt_text, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        bot.register_next_step_handler(call.message, step_edit_gate_val)
        return

    elif data.startswith("cancel_gate_edit:"):
        gate = data.split(":")[1]
        bot.clear_step_handler_by_chat_id(chat_id)
        conv_states.pop(chat_id, None)
        call.data = f"conf_gate:{gate}"
        handle_callbacks(call)
        return


    if data == "admin_add_utr_start":
        msg = bot.send_message(chat_id, "✍️ **Manual Transaction ID Logger**\n\nPlease enter the **Transaction ID** to add:\n\n*Type 'cancel' to abort.*", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_admin_add_utr_id)
        return

    elif data.startswith("toggle_pay:"):
        gateway = data.split(":")[1]
        methods = db.get('payment_methods', {"cashfree": True, "upi_qr": True, "crypto": True, "binance_pay": True})
        
        current_status = methods.get(gateway, True)
        methods[gateway] = not current_status
        db['payment_methods'] = methods
        save_db(db)
        
        bot.answer_callback_query(call.id, f"✅ {gateway.upper()} toggled {'OFF' if current_status else 'ON'}!")
        _send_payment_toggles(chat_id, call.message.message_id)
        return

    # REFERRAL PROGRAM CONFIGURATIONS
    if data.startswith("ref_config:"):
        action = data.split(":")[1]
        if action == "toggle":
            enabled = db.get('referral_enabled', True)
            db['referral_enabled'] = not enabled
            save_db(db)
            bot.answer_callback_query(call.id, f"✅ Referral system {'disabled' if enabled else 'enabled'}!")
            _send_referral_panel(chat_id, call.message.message_id)
            return
            
        elif action == "reward":
            msg = bot.send_message(chat_id, "✍️ **Change Referral Reward**\n\nEnter the new reward amount (in ₹) credited to referrer (e.g. `20` or `50`):\n\n*Type 'cancel' to abort.*", parse_mode="Markdown")
            bot.register_next_step_handler(msg, step_save_ref_reward)
            return
            
        elif action == "min_dep":
            msg = bot.send_message(chat_id, "✍️ **Change Min Deposit Requirement**\n\nEnter the new minimum cumulative deposit required by the referred user (e.g. `100` or `200`):\n\n*Type 'cancel' to abort.*", parse_mode="Markdown")
            bot.register_next_step_handler(msg, step_save_ref_min_dep)
            return

    import time
    from datetime import datetime

    # CUSTOMER ORDERS NAVIGATION
    if data.startswith("cust_u:"):
        parts = data.split(":")
        uid = parts[1]
        status = parts[2] if len(parts) > 2 and parts[2] != "" else None
        is_profile = len(parts) > 3 and parts[3] == "profile"
        profile_page = parts[4] if len(parts) > 4 else "1"
        
        # Filter sales
        if status:
            user_sales = [s for s in db['sales'] if str(s['user_id']) == uid and s.get('status', 'Delivered') == status]
        else:
            user_sales = [s for s in db['sales'] if str(s['user_id']) == uid]
        
        # Group by product
        u_prods = {}
        for s in user_sales:
            pid = s['product_id']
            if pid not in u_prods:
                u_prods[pid] = {"name": s['product_name'], "count": 0}
            u_prods[pid]["count"] += 1
            
        markup = InlineKeyboardMarkup(row_width=1)
        for pid, info in u_prods.items():
            if is_profile:
                cb_data = f"cust_u_p:{uid}:{pid}:0:{status or ''}:profile:{profile_page}"
            else:
                cb_data = f"cust_u_p:{uid}:{pid}:0:{status}" if status else f"cust_u_p:{uid}:{pid}:0"
            markup.add(InlineKeyboardButton(f"📦 {info['name']} ({info['count']} Items)", callback_data=cb_data))
            
        back_cb = f"view_user:{uid}:{profile_page}" if is_profile else (f"orders_s:{status}:1" if status else "orders_main_menu")
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=back_cb))
        
        status_title = f" ({status})" if status else ""
        bot.edit_message_text(f"📦 *Purchases for UID: {uid}*{status_title}\nSelect a product to view specific orders:", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("cust_u_p:"):
        parts = data.split(":")
        uid, pid = parts[1], parts[2]
        page_index = int(parts[3]) if len(parts) > 3 else 0
        status = parts[4] if len(parts) > 4 and parts[4] != "" else None
        
        is_profile = len(parts) > 5 and parts[5] == "profile"
        profile_page = parts[6] if len(parts) > 6 else "1"
        
        if status:
            user_prod_sales = [s for s in db['sales'] if str(s['user_id']) == uid and s['product_id'] == pid and s.get('status', 'Delivered') == status][::-1]
        else:
            user_prod_sales = [s for s in db['sales'] if str(s['user_id']) == uid and s['product_id'] == pid][::-1]
            
        if not user_prod_sales:
            # Instead of erroring, go back one more level
            bot.answer_callback_query(call.id, "No more orders in this category.")
            back_cb = f"cust_u:{uid}:{status or ''}:profile:{profile_page}" if is_profile else (f"cust_u:{uid}:{status}" if status else f"cust_u:{uid}")
            call.data = back_cb
            return handle_callbacks(call)
            
        if page_index < 0: page_index = 0
        if page_index >= len(user_prod_sales): page_index = len(user_prod_sales) - 1
            
        s = user_prod_sales[page_index]
        
        buy_dt = datetime.fromtimestamp(s.get('purchase_ts', 0), IST).strftime('%I:%M %p, %d %b %Y')
        sid = s['sale_id']
        
        # Sub Info
        sub_info = ""
        end_ts = s.get('end_ts')
        curr_status = s.get('status', 'Delivered')
        
        if end_ts:
            exp_dt = datetime.fromtimestamp(end_ts, IST).strftime('%I:%M %p, %d %b %Y')
            
            # Sync sub validity with order status
            if curr_status == "Canceled":
                status_v = "🔴 Subscription Canceled"
            elif curr_status == "Refunded":
                status_v = "💰 Order Refunded"
            elif curr_status == "On Hold":
                status_v = "⏸️ Subscription On Hold"
            else:
                status_v = "🟢 LIVE" if time.time() < end_ts else "🔴 EXPIRED"
            
            sub_info = f"⚖️ *Validity:* {status_v}\n📅 *Expiry:* {exp_dt}\n"
            
        status_map = {
            "Pending": "⏳ Pending",
            "Delivered": "✅ Delivered",
            "Canceled": "❌ Canceled",
            "Refunded": "💰 Refunded",
            "On Hold": "⏸️ On Hold"
        }
        status_str = status_map.get(curr_status, curr_status)
            
        edit_info = ""
        if s.get('last_edited_at'):
            edit_dt = datetime.fromtimestamp(s['last_edited_at'], IST).strftime('%I:%M %p, %d %b %Y')
            edit_info = f"🔄 *Replaced At:* {edit_dt}\n"
 
        uname = str(s.get('username', 'Unknown')).replace('_', '-')
        uname_display = f"@{uname}" if uname != "Unknown" else "Unknown"
        card = (
            f"🧾 *Order ID: {sid}*\n"
            f"👤 *Customer:* {uname_display} (`{uid}`)\n"
            f"───────────────────────\n"
            f"📦 *Product:* {s['product_name']}\n"
            f"💎 *Variant:* {s['variant_name']}\n"
            f"💰 *Paid Amount:* ₹{s.get('price', 0)}\n"
            f"📊 *Current Status:* {status_str}\n\n"
            f"{sub_info}"
            f"📅 *Purchased:* {buy_dt}\n"
            f"{edit_info}\n"
            f"📑 *Credentials:*\n`{s['credentials']}`\n"
        )
        
        if len(user_prod_sales) > 1:
            card += f"\n*(Order {page_index + 1} of {len(user_prod_sales)})*"
            
        markup = InlineKeyboardMarkup()
        # Build back callback string and store in conversation state to avoid exceeding Telegram's 64-byte limit
        back_cb_str = f"cust_u_p_{uid}_{pid}_{page_index}_{status or ''}"
        if is_profile:
            back_cb_str += f"_profile_{profile_page}"
        if chat_id not in conv_states:
            conv_states[chat_id] = {}
        conv_states[chat_id]['back_cb_str'] = back_cb_str
        
        markup.add(
            InlineKeyboardButton("✏️ Edit/Replace", callback_data=f"repl_sale:{sid}"),
            InlineKeyboardButton("🗑️ Delete", callback_data=f"del_sale:{sid}")
        )
        markup.add(
            InlineKeyboardButton("🟢 Delivered", callback_data=f"setstat:{sid}:Delivered"),
            InlineKeyboardButton("🔴 Cancel", callback_data=f"setstat:{sid}:Canceled"),
            InlineKeyboardButton("💰 Refund", callback_data=f"setstat:{sid}:Refunded"),
            InlineKeyboardButton("⏸️ Hold", callback_data=f"setstat:{sid}:On Hold")
        )
        
        nav_buttons = []
        if page_index > 0:
            if is_profile:
                cb_prev = f"cust_u_p:{uid}:{pid}:{page_index - 1}:{status or ''}:profile:{profile_page}"
            else:
                cb_prev = f"cust_u_p:{uid}:{pid}:{page_index - 1}:{status}" if status else f"cust_u_p:{uid}:{pid}:{page_index - 1}"
            nav_buttons.append(InlineKeyboardButton("◀️ Prev Order", callback_data=cb_prev))
        if page_index < len(user_prod_sales) - 1:
            if is_profile:
                cb_next = f"cust_u_p:{uid}:{pid}:{page_index + 1}:{status or ''}:profile:{profile_page}"
            else:
                cb_next = f"cust_u_p:{uid}:{pid}:{page_index + 1}:{status}" if status else f"cust_u_p:{uid}:{pid}:{page_index + 1}"
            nav_buttons.append(InlineKeyboardButton("Next Order ▶️", callback_data=cb_next))
            
        if nav_buttons:
            markup.add(*nav_buttons)
            
        back_cb = f"cust_u:{uid}:{status or ''}:profile:{profile_page}" if is_profile else (f"cust_u:{uid}:{status}" if status else f"cust_u:{uid}")
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=back_cb))
        
        try:
            bot.edit_message_text(card, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        except Exception as e:
            if "message is not modified" not in str(e).lower():
                print(e)
        return

    elif data == "back_to_cust_users":
        # Redirect to orders_main_menu to avoid huge lags and crash
        call.data = "orders_main_menu"
        return handle_callbacks(call)

    elif data == "close_menu":
        try: bot.delete_message(chat_id, call.message.message_id)
        except: pass
        return

    elif data == "dep_main":
        _send_deposit_menu(chat_id, edit_msg_id=call.message.message_id)
        return

    # --- CUSTOMER DEPOSITS TABS ---
    elif data.startswith("dep_s:"):
        parts = data.split(":")
        status = parts[1]
        page = int(parts[2])
        
        # Get unique users who have deposits with this status
        all_deps = db.get('deposits', [])
        status_deps = [d for d in all_deps if d.get('status') == status]
        uids = list(set([str(d.get('user_id')) for d in status_deps]))
        
        if not uids:
            bot.answer_callback_query(call.id, f"No {status} deposits found.", show_alert=True)
            return
            
        PAGE_SIZE = 10
        total = len(uids)
        total_pages = (total + PAGE_SIZE - 1) // PAGE_SIZE
        page = max(1, min(page, total_pages))
        
        start_idx = (page - 1) * PAGE_SIZE
        end_idx = start_idx + PAGE_SIZE
        page_items = uids[start_idx:end_idx]
        
        all_users = db.get('users', {})
        markup = InlineKeyboardMarkup(row_width=1)
        for uid in page_items:
            udata = all_users.get(uid, {})
            uname = str(udata.get('username', 'Unknown')).replace('_', '-')
            markup.add(InlineKeyboardButton(f"👤 {uname} (ID: {uid})", callback_data=f"dep_us:{uid}:{status}:1"))
            
        nav_row = []
        if page > 1:
            nav_row.append(InlineKeyboardButton("⬅️", callback_data=f"dep_s:{status}:{page-1}"))
        nav_row.append(InlineKeyboardButton(f"Page {page}/{total_pages}", callback_data="noop"))
        if page < total_pages:
            nav_row.append(InlineKeyboardButton("➡️", callback_data=f"dep_s:{status}:{page+1}"))
            
        if nav_row:
            markup.row(*nav_row)
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="dep_main"))
            
        bot.edit_message_text(f"💰 *{status} Deposits: Select User*\nChoose a user to view their {status} deposits:", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("dep_us:"):
        parts = data.split(":")
        uid, status, page = parts[1], parts[2], int(parts[3])
        
        deposits = [d for d in db.get('deposits', []) if str(d.get('user_id')) == uid and d.get('status') == status]
        deposits.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
        
        if not deposits:
            bot.answer_callback_query(call.id, "No deposits found for this user/status.", show_alert=True)
            return
            
        PAGE_SIZE = 10
        total = len(deposits)
        total_pages = (total + PAGE_SIZE - 1) // PAGE_SIZE
        page = max(1, min(page, total_pages))
        
        start_idx = (page - 1) * PAGE_SIZE
        end_idx = start_idx + PAGE_SIZE
        page_items = deposits[start_idx:end_idx]
        
        markup = InlineKeyboardMarkup(row_width=1)
        for d in page_items:
            dt = datetime.fromtimestamp(d.get('timestamp', 0), IST).strftime('%d %b')
            amt = d['amount']
            curr = d['currency']
            amt_str = f"₹{amt}" if curr == "INR" else f"${amt}"
            dep_id = d.get('deposit_id', d.get('order_id', 'Unknown'))
            btn_text = f"[{dt}] {amt_str} - ID: {dep_id}"
            markup.add(InlineKeyboardButton(btn_text, callback_data=f"dep_v:{dep_id}:{status}:{page}:{uid}"))
            
        nav_row = []
        if page > 1:
            nav_row.append(InlineKeyboardButton("⬅️", callback_data=f"dep_us:{uid}:{status}:{page-1}"))
        nav_row.append(InlineKeyboardButton(f"Page {page}/{total_pages}", callback_data="noop"))
        if page < total_pages:
            nav_row.append(InlineKeyboardButton("➡️", callback_data=f"dep_us:{uid}:{status}:{page+1}"))
            
        if nav_row:
            markup.row(*nav_row)
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"dep_s:{status}:1"))
            
        uname = str(next((d.get('username') for d in deposits if d.get('username')), "Unknown")).replace('_', '-')
        bot.edit_message_text(f"👤 *Deposits by @{uname}* ({status})\nSelect a deposit to view details:", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("dep_v:"):
        parts = data.split(":")
        did = parts[1]
        status = parts[2]
        page = parts[3]
        uid = parts[4] if len(parts) > 4 else None
        is_profile = int(parts[5]) if len(parts) > 5 else 0
        dir_page = int(parts[6]) if len(parts) > 6 else 1
        
        d = next((x for x in db.get('deposits', []) if x.get('deposit_id') == did or x.get('order_id') == did), None)
        if not d:
            return bot.answer_callback_query(call.id, "Deposit not found.", show_alert=True)
            
        dt = datetime.fromtimestamp(d.get('timestamp', 0), IST).strftime('%d %b %Y')
        tm = datetime.fromtimestamp(d.get('timestamp', 0), IST).strftime('%I:%M %p')
        status_map = {"Success": "✅ Completed", "Pending": "⏳ Pending", "Failed": "❌ Failed"}
        status_text = status_map.get(d['status'], d['status'])
        
        amt = d['amount']
        curr = d['currency']
        if curr == "INR":
            inr_str = f"₹{amt}"
            usd_str = converter.format_price(amt, "USD")
            display_amt = f"{inr_str} ({usd_str})"
        else:
            usd_str = f"${amt}"
            usd_rate = converter.rates.get('USD', 0.012)
            base_inr = round(amt / usd_rate, 2)
            inr_str = f"₹{base_inr}"
            display_amt = f"{usd_str} ({inr_str})"
 
        uname = str(d.get('username', 'Unknown')).replace('_', '-')
        uname_display = f"@{uname}" if uname != "Unknown" else "Unknown"
        d_uid = d.get('user_id', 'Unknown')
        
        d_method = str(d.get('method', 'Unknown')).replace('_', '-')
        d_dep_id = str(d.get('deposit_id', d.get('order_id', 'Unknown'))).replace('_', '-')
        d_ord_id = str(d.get('order_id', 'N/A')).replace('_', '-')
        
        card = (
            f"💰 *Deposit Receipt (Admin View)*\n"
            f"───────────────────────\n"
            f"👤 *Customer:* {uname_display} (`{d_uid}`)\n"
            f"🆔 *Deposit ID:* `{d_dep_id}`\n"
            f"📑 *Order ID:* `{d_ord_id}`\n"
            f"💵 *Amount:* {display_amt}\n"
            f"📊 *Status:* {status_text}\n"
            f"💳 *Method:* {d_method}\n"
            f"📅 *Date:* {dt}\n"
            f"⏰ *Time:* {tm}\n"
            f"───────────────────────"
        )
        markup = InlineKeyboardMarkup()
        if uid:
            if status == "all":
                markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"adm_dep_u:{uid}:{page}:{is_profile}:{dir_page}"))
            else:
                markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"dep_us:{uid}:{status}:{page}"))
        else:
            markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"dep_s:{status}:{page}"))
        bot.edit_message_text(card, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("dep_users:"):
        page = int(data.split(":")[1])
        user_ids = list(set([str(d.get('user_id')) for d in db.get('deposits', [])]))
        
        if not user_ids:
            return bot.answer_callback_query(call.id, "No deposits found.", show_alert=True)
            
        PAGE_SIZE = 10
        total = len(user_ids)
        total_pages = (total + PAGE_SIZE - 1) // PAGE_SIZE
        page = max(1, min(page, total_pages))
        
        start_idx = (page - 1) * PAGE_SIZE
        end_idx = start_idx + PAGE_SIZE
        page_items = user_ids[start_idx:end_idx]
        
        all_users = db.get('users', {})
        markup = InlineKeyboardMarkup(row_width=1)
        
        for uid in page_items:
            udata = all_users.get(uid, {})
            uname = str(udata.get('username', 'Unknown')).replace('_', '-')
            display_name = f"👤 {uname} (ID: {uid})"
            # We reuse the existing adm_dep_u handler for the actual view
            markup.add(InlineKeyboardButton(display_name, callback_data=f"adm_dep_u:{uid}"))
            
        nav_row = []
        if page > 1:
            nav_row.append(InlineKeyboardButton("⬅️", callback_data=f"dep_users:{page-1}"))
        nav_row.append(InlineKeyboardButton(f"Page {page}/{total_pages}", callback_data="noop"))
        if page < total_pages:
            nav_row.append(InlineKeyboardButton("➡️", callback_data=f"dep_users:{page+1}"))
            
        if nav_row:
            markup.row(*nav_row)
            
        bot.edit_message_text("👥 *Select a Customer* to view their deposit history:", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    # ADMIN DEPOSIT HISTORY VIEW
    elif data.startswith("adm_dep_u:"):
        parts = data.split(":")
        uid = parts[1]
        page = int(parts[2]) if len(parts) > 2 else 1
        is_profile = int(parts[3]) if len(parts) > 3 else 0
        dir_page = int(parts[4]) if len(parts) > 4 else 1
        
        deposits = [d for d in db.get('deposits', []) if str(d.get('user_id')) == uid]
        deposits.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
        
        if not deposits:
            bot.answer_callback_query(call.id, "No deposit history for this user.", show_alert=True)
            return
            
        PAGE_SIZE = 8
        total = len(deposits)
        total_pages = (total + PAGE_SIZE - 1) // PAGE_SIZE
        page = max(1, min(page, total_pages))
        
        start_idx = (page - 1) * PAGE_SIZE
        end_idx = start_idx + PAGE_SIZE
        page_items = deposits[start_idx:end_idx]
        
        markup = InlineKeyboardMarkup(row_width=1)
        for d in page_items:
            dt = datetime.fromtimestamp(d.get('timestamp', 0), IST).strftime('%d %b')
            amt = d['amount']
            curr = d['currency']
            amt_str = f"₹{amt}" if curr == "INR" else f"${amt}"
            
            st = d.get('status', 'Pending')
            st_emoji = "✅" if st == "Success" else ("⏳" if st == "Pending" else "❌")
            
            dep_id = d.get('deposit_id', d.get('order_id', 'Unknown'))
            btn_text = f"[{dt}] {st_emoji} {amt_str} ({d.get('method', 'UPI')}) - ID: {dep_id}"
            markup.add(InlineKeyboardButton(btn_text, callback_data=f"dep_v:{dep_id}:all:{page}:{uid}:{is_profile}:{dir_page}"))
            
        nav_row = []
        if page > 1:
            nav_row.append(InlineKeyboardButton("⬅️", callback_data=f"adm_dep_u:{uid}:{page-1}:{is_profile}:{dir_page}"))
        nav_row.append(InlineKeyboardButton(f"Page {page}/{total_pages}", callback_data="noop"))
        if page < total_pages:
            nav_row.append(InlineKeyboardButton("➡️", callback_data=f"adm_dep_u:{uid}:{page+1}:{is_profile}:{dir_page}"))
            
        if nav_row:
            markup.row(*nav_row)
            
        if is_profile:
            markup.add(InlineKeyboardButton("🔙 Back to Profile", callback_data=f"view_user:{uid}:{dir_page}"))
        else:
            markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="dep_main"))
        
        uname = str(next((d.get('username') for d in deposits if d.get('username')), "Unknown")).replace('_', '-')
        
        text = (
            f"👤 **Customer Deposit History**\n"
            f"───────────────────────\n"
            f"👤 **Customer:** @{uname} (`{uid}`)\n"
            f"💰 **Total Deposits:** `{total}` transaction(s)\n"
            f"───────────────────────\n"
            f"👇 *Select a deposit below to view full details:*"
        )
        
        try:
            bot.edit_message_text(text, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        except Exception:
            try: bot.delete_message(chat_id, call.message.message_id)
            except: pass
            bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")
        return

    # DISCOUNTS & COUPONS SYSTEM CALLBACKS
    elif data == "promo_menu":
        discounts = db.get('discounts', {})
        coupons = db.get('coupons', {})
        
        now = time.time()
        active_disc_count = sum(1 for d in discounts.values() if d.get('start_date', 0) <= now <= d.get('end_date', 9999999999))
        active_coup_count = sum(1 for c in coupons.values() if c.get('start_date', 0) <= now <= c.get('end_date', 9999999999))
        
        markup = InlineKeyboardMarkup(row_width=2)
        markup.row(
            InlineKeyboardButton("📉 Auto-Discounts", callback_data="mgt_discounts:1"),
            InlineKeyboardButton("🎫 Coupon Codes", callback_data="mgt_coupons:1")
        )
        markup.row(
            InlineKeyboardButton("➕ Add Discount", callback_data="create_disc_start"),
            InlineKeyboardButton("➕ Add Coupon", callback_data="create_coup_start")
        )
        markup.row(InlineKeyboardButton("❌ Close Menu", callback_data="close_menu"))
        
        text_msg = (
            "🏷️ **DISCOUNTS & COUPONS PANEL**\n"
            "───────────────────────────\n"
            "Manage promotional offers, active discounts, and shopping coupons.\n\n"
            "📊 **Current Status**:\n"
            f"• Active Auto Discounts: `{active_disc_count}` offer(s)\n"
            f"• Active Promo Coupons: `{active_coup_count}` code(s)\n\n"
            "• **Discounts**: Automatic price reductions on catalog items.\n"
            "• **Coupons**: Code-based checkout discounts (e.g., `SAVE10`)."
        )
        try:
            bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        except Exception:
            bot.send_message(chat_id, text_msg, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("mgt_discounts:"):
        page = int(data.split(":")[1])
        discounts = db.get('discounts', {})
        markup = InlineKeyboardMarkup(row_width=1)
        
        if not discounts:
            markup.add(
                InlineKeyboardButton("➕ Create Discount", callback_data="create_disc_start"),
                InlineKeyboardButton("🔙 Go Back", callback_data="promo_menu")
            )
            bot.edit_message_text("🏷️ **Discounts Management**\n\nNo active discounts or offers found.", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
            return
            
        PAGE_SIZE = 5
        disc_ids = list(discounts.keys())
        total = len(disc_ids)
        total_pages = (total + PAGE_SIZE - 1) // PAGE_SIZE
        page = max(1, min(page, total_pages))
        
        start_idx = (page - 1) * PAGE_SIZE
        end_idx = start_idx + PAGE_SIZE
        page_items = disc_ids[start_idx:end_idx]
        
        now = time.time()
        for did in page_items:
            d = discounts[did]
            status_emoji = "🟢"
            if now < d.get('start_date', 0):
                status_emoji = "⏳"
            elif now > d.get('end_date', 0):
                status_emoji = "🔴"
                
            val_str = f"{d['value']}%" if d['type'] == 'percentage' else f"₹{d['value']}"
            markup.add(InlineKeyboardButton(f"📉 {d['name']} ({val_str}) {status_emoji}", callback_data=f"view_disc:{did}:{page}"))
            
        nav_row = []
        if page > 1:
            nav_row.append(InlineKeyboardButton("◀️", callback_data=f"mgt_discounts:{page-1}"))
        nav_row.append(InlineKeyboardButton(f"Page {page}/{total_pages}", callback_data="noop"))
        if page < total_pages:
            nav_row.append(InlineKeyboardButton("▶️", callback_data=f"mgt_discounts:{page+1}"))
        if nav_row:
            markup.row(*nav_row)
            
        markup.add(
            InlineKeyboardButton("➕ Add Discount", callback_data="create_disc_start"),
            InlineKeyboardButton("🔙 Back to Menu", callback_data="promo_menu")
        )
        
        text_msg = "📉 **AUTO-DISCOUNTS DIRECTORY**\n\nSelect any offer below to view details or delete:"
        bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("view_disc:"):
        parts = data.split(":")
        did = parts[1]
        page = int(parts[2])
        discounts = db.get('discounts', {})
        
        if did not in discounts:
            bot.answer_callback_query(call.id, "❌ Discount not found.", show_alert=True)
            call.data = f"mgt_discounts:{page}"
            return handle_callbacks(call)
            
        d = discounts[did]
        now = time.time()
        status = "🟢 Active"
        if now < d.get('start_date', 0):
            status = "⏳ Scheduled"
        elif now > d.get('end_date', 0):
            status = "🔴 Expired"
            
        val_str = f"{d['value']}%" if d['type'] == 'percentage' else f"₹{d['value']}"
        target_str = "All Products" if d.get('target_type') == 'all' else f"{len(d.get('target_products', []))} Products"
        
        start_time = d.get('start_date', 0)
        start_time_str = datetime.fromtimestamp(start_time, tz=IST).strftime("%d-%m-%Y %H:%M")
        end_time = d.get('end_date', 0)
        end_time_str = "Never (No Expiration)" if end_time == 9999999999 else datetime.fromtimestamp(end_time, tz=IST).strftime("%d-%m-%Y %H:%M")
        
        text_msg = (
            "🏷️ **DISCOUNT DETAIL CARD**\n"
            "───────────────────────────\n"
            f"📛 **Name**: `{d['name']}`\n"
            f"📊 **Type**: `{d['type'].capitalize()}`\n"
            f"💰 **Value**: `{val_str} OFF`\n"
            f"🎯 **Target**: `{target_str}`\n"
            f"📅 **Start**: `{start_time_str} IST`\n"
            f"📅 **End**: `{end_time_str}`\n"
            f"🟢 **Status**: `{status}`\n"
            "───────────────────────────"
        )
        
        markup = InlineKeyboardMarkup(row_width=1)
        markup.add(
            InlineKeyboardButton("🗑️ Delete Offer", callback_data=f"del_disc:{did}:{page}"),
            InlineKeyboardButton("🔙 Back to List", callback_data=f"mgt_discounts:{page}")
        )
        bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("del_disc:"):
        parts = data.split(":")
        did = parts[1]
        page = int(parts[2])
        if 'discounts' in db and did in db['discounts']:
            name = db['discounts'][did]['name']
            del db['discounts'][did]
            save_db(db)
            bot.answer_callback_query(call.id, f"✅ Discount offer '{name}' deleted!")
        else:
            bot.answer_callback_query(call.id, "❌ Discount not found.")
            
        call.data = f"mgt_discounts:{page}"
        return handle_callbacks(call)

    elif data.startswith("mgt_coupons:"):
        page = int(data.split(":")[1])
        coupons = db.get('coupons', {})
        markup = InlineKeyboardMarkup(row_width=1)
        
        if not coupons:
            markup.add(
                InlineKeyboardButton("➕ Create Coupon", callback_data="create_coup_start"),
                InlineKeyboardButton("🔙 Go Back", callback_data="promo_menu")
            )
            bot.edit_message_text("🎟️ **Coupons Management**\n\nNo coupon codes found.", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
            return
            
        PAGE_SIZE = 5
        codes = list(coupons.keys())
        total = len(codes)
        total_pages = (total + PAGE_SIZE - 1) // PAGE_SIZE
        page = max(1, min(page, total_pages))
        
        start_idx = (page - 1) * PAGE_SIZE
        end_idx = start_idx + PAGE_SIZE
        page_items = codes[start_idx:end_idx]
        
        now = time.time()
        for code in page_items:
            c = coupons[code]
            status_emoji = "🟢"
            if now < c.get('start_date', 0):
                status_emoji = "⏳"
            elif now > c.get('end_date', 0):
                status_emoji = "🔴"
                
            val_str = f"{c['value']}%" if c['type'] == 'percentage' else f"₹{c['value']}"
            markup.add(InlineKeyboardButton(f"🎫 {code} ({val_str}) {status_emoji}", callback_data=f"view_coup:{code}:{page}"))
            
        nav_row = []
        if page > 1:
            nav_row.append(InlineKeyboardButton("◀️", callback_data=f"mgt_coupons:{page-1}"))
        nav_row.append(InlineKeyboardButton(f"Page {page}/{total_pages}", callback_data="noop"))
        if page < total_pages:
            nav_row.append(InlineKeyboardButton("▶️", callback_data=f"mgt_coupons:{page+1}"))
        if nav_row:
            markup.row(*nav_row)
            
        markup.add(
            InlineKeyboardButton("➕ Add Coupon", callback_data="create_coup_start"),
            InlineKeyboardButton("🔙 Back to Menu", callback_data="promo_menu")
        )
        bot.edit_message_text("🎫 **COUPON CODES DIRECTORY**\n\nSelect any coupon below to view details or delete:", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("view_coup:"):
        parts = data.split(":")
        code = parts[1]
        page = int(parts[2])
        coupons = db.get('coupons', {})
        
        if code not in coupons:
            bot.answer_callback_query(call.id, "❌ Coupon not found.", show_alert=True)
            call.data = f"mgt_coupons:{page}"
            return handle_callbacks(call)
            
        c = coupons[code]
        now = time.time()
        status = "🟢 Active"
        if now < c.get('start_date', 0):
            status = "⏳ Scheduled"
        elif now > c.get('end_date', 0):
            status = "🔴 Expired"
            
        val_str = f"{c['value']}%" if c['type'] == 'percentage' else f"₹{c['value']}"
        uses_str = f"{c.get('used_count', 0)} / {c.get('max_uses', '∞') if c.get('max_uses', -1) != -1 else '∞'}"
        per_user = c.get('per_user_limit', -1)
        per_user_str = "Unlimited" if per_user == -1 else f"{per_user} time(s)"
        target_str = "All Products" if c.get('target_type') == 'all' else f"{len(c.get('target_products', []))} Products"
        
        start_time = c.get('start_date', 0)
        start_time_str = datetime.fromtimestamp(start_time, tz=IST).strftime("%d-%m-%Y %H:%M")
        end_time = c.get('end_date', 0)
        end_time_str = "Never (No Expiration)" if end_time == 9999999999 else datetime.fromtimestamp(end_time, tz=IST).strftime("%d-%m-%Y %H:%M")
        
        text_msg = (
            "🎟️ **COUPON DETAIL CARD**\n"
            "───────────────────────────\n"
            f"🔑 **Code**: `{code}`\n"
            f"📊 **Type**: `{c['type'].capitalize()}`\n"
            f"💰 **Value**: `{val_str} OFF`\n"
            f"🎯 **Target**: `{target_str}`\n"
            f"🔢 **Uses (Global)**: `{uses_str}`\n"
            f"👤 **Per-User Limit**: `{per_user_str}`\n"
            f"📅 **Start**: `{start_time_str} IST`\n"
            f"📅 **End**: `{end_time_str}`\n"
            f"🟢 **Status**: `{status}`\n"
            "───────────────────────────"
        )
        
        markup = InlineKeyboardMarkup(row_width=1)
        markup.add(
            InlineKeyboardButton("🗑️ Delete Coupon", callback_data=f"del_coup:{code}:{page}"),
            InlineKeyboardButton("🔙 Back to List", callback_data=f"mgt_coupons:{page}")
        )
        bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("del_coup:"):
        parts = data.split(":")
        code = parts[1]
        page = int(parts[2])
        if 'coupons' in db and code in db['coupons']:
            del db['coupons'][code]
            save_db(db)
            bot.answer_callback_query(call.id, f"✅ Coupon code '{code}' deleted!")
        else:
            bot.answer_callback_query(call.id, "❌ Coupon not found.")
            
        call.data = f"mgt_coupons:{page}"
        return handle_callbacks(call)

    # DISCOUNT CREATION FLOW CALLBACKS
    elif data == "create_disc_start":
        conv_states[chat_id] = {'step': 'disc_name'}
        msg = bot.send_message(chat_id, "✍️ **Create Discount: Name**\n\nEnter a descriptive name for this discount offer (e.g. `Summer Sale` or `Weekend Special`):\n\n*Type 'cancel' to abort.*", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_disc_name)
        return

    elif data.startswith("disc_type:"):
        dtype = data.split(":")[1]
        conv_states[chat_id]['type'] = dtype
        conv_states[chat_id]['step'] = 'disc_value'
        
        msg = bot.send_message(chat_id, f"💰 **Create Discount: Value**\n\nEnter the discount value (e.g. enter `15` for 15% off, or `100` for ₹100 off):\n\n*Type 'cancel' to abort.*", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_disc_value)
        return

    elif data.startswith("disc_target:"):
        parts = data.split(":")
        target = parts[1]
        
        if target == 'all':
            conv_states[chat_id]['target_type'] = 'all'
            conv_states[chat_id]['step'] = 'disc_start_date'
            
            markup = InlineKeyboardMarkup(row_width=2)
            markup.add(
                InlineKeyboardButton("Start Now", callback_data="disc_start_choice:now"),
                InlineKeyboardButton("In 1 Hour", callback_data="disc_start_choice:1h"),
                InlineKeyboardButton("Tomorrow", callback_data="disc_start_choice:1d")
            )
            markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_discount"))
            msg = bot.send_message(chat_id, "📅 **Create Discount: Start Date & Time**\n\nEnter the start date/time when this discount goes active.\nFormat: `DD-MM-YYYY HH:MM` (e.g., `05-06-2026 12:00`):\n\n- Click a quick option below,\n- Or type the start date/time below:", reply_markup=markup, parse_mode="Markdown")
            bot.register_next_step_handler(msg, step_disc_start_date)
            return
            
        elif target == 'specific':
            page = int(parts[2])
            conv_states[chat_id]['target_type'] = 'specific'
            if 'target_products' not in conv_states[chat_id]:
                conv_states[chat_id]['target_products'] = []
                
            _render_product_selector(chat_id, call.message.message_id, page, is_coupon=False)
            return

    elif data.startswith("disc_selprod:"):
        parts = data.split(":")
        pid = parts[1]
        page = int(parts[2])
        
        selected = conv_states[chat_id].get('target_products', [])
        if pid in selected:
            selected.remove(pid)
        else:
            selected.append(pid)
        conv_states[chat_id]['target_products'] = selected
        
        _render_product_selector(chat_id, call.message.message_id, page, is_coupon=False)
        return

    elif data == "disc_confirm_sel":
        selected = conv_states[chat_id].get('target_products', [])
        if not selected:
            bot.answer_callback_query(call.id, "❌ Please select at least one product!", show_alert=True)
            return
            
        conv_states[chat_id]['step'] = 'disc_start_date'
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("Start Now", callback_data="disc_start_choice:now"),
            InlineKeyboardButton("In 1 Hour", callback_data="disc_start_choice:1h"),
            InlineKeyboardButton("Tomorrow", callback_data="disc_start_choice:1d")
        )
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_discount"))
        msg = bot.send_message(chat_id, "📅 **Create Discount: Start Date & Time**\n\nEnter the start date/time when this discount goes active.\nFormat: `DD-MM-YYYY HH:MM` (e.g., `05-06-2026 12:00`):\n\n- Click a quick option below,\n- Or type the start date/time below:", reply_markup=markup, parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_disc_start_date)
        return

    elif data == "confirm_create_discount":
        state = conv_states.get(chat_id)
        if not state:
            bot.answer_callback_query(call.id, "❌ Session expired.", show_alert=True)
            return
            
        disc_id = "disc-" + uuid.uuid4().hex[:6]
        new_disc = {
            "discount_id": disc_id,
            "name": state['name'],
            "type": state['type'],
            "value": float(state['value']),
            "target_type": state['target_type'],
            "target_products": state.get('target_products', []),
            "start_date": state['start_date'],
            "end_date": state['end_date'],
            "is_active": True
        }
        if 'discounts' not in db:
            db['discounts'] = {}
        db['discounts'][disc_id] = new_disc
        save_db(db)
        
        # Trigger Broadcast
        broadcast_discount(new_disc, db)
        
        conv_states.pop(chat_id, None)
        bot.edit_message_text("✅ **Discount Offer created successfully!**\nIt is now active/scheduled according to the dates set.", chat_id, call.message.message_id, parse_mode="Markdown")
        return

    elif data == "cancel_discount":
        conv_states.pop(chat_id, None)
        bot.answer_callback_query(call.id, "❌ Discount creation cancelled.")
        call.data = "promo_menu"
        return handle_callbacks(call)

    # COUPON CREATION FLOW CALLBACKS
    elif data == "create_coup_start":
        conv_states[chat_id] = {'step': 'coup_code'}
        msg = bot.send_message(chat_id, "✍️ **Create Coupon: Code**\n\nEnter the coupon code that users will type at checkout (e.g. `SAVE10` or `WELCOME200`):\n\n*Type 'cancel' to abort.*", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_coupon_code)
        return

    elif data.startswith("coup_type:"):
        ctype = data.split(":")[1]
        conv_states[chat_id]['type'] = ctype
        conv_states[chat_id]['step'] = 'coup_value'
        
        msg = bot.send_message(chat_id, f"💰 **Create Coupon: Value**\n\nEnter the coupon discount value (e.g. enter `10` for 10% off, or `50` for ₹50 off):\n\n*Type 'cancel' to abort.*", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_coupon_value)
        return

    elif data.startswith("coup_target:"):
        parts = data.split(":")
        target = parts[1]
        
        if target == 'all':
            conv_states[chat_id]['target_type'] = 'all'
            conv_states[chat_id]['step'] = 'coup_start_date'
            
            markup = InlineKeyboardMarkup(row_width=2)
            markup.add(
                InlineKeyboardButton("Start Now", callback_data="coup_start_choice:now"),
                InlineKeyboardButton("In 1 Hour", callback_data="coup_start_choice:1h"),
                InlineKeyboardButton("Tomorrow", callback_data="coup_start_choice:1d")
            )
            markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_coupon"))
            msg = bot.send_message(chat_id, "📅 **Create Coupon: Start Date & Time**\n\nEnter the start date/time when this coupon code becomes valid.\nFormat: `DD-MM-YYYY HH:MM` (e.g., `05-06-2026 12:00`):\n\n- Click a quick option below,\n- Or type the start date/time below:", reply_markup=markup, parse_mode="Markdown")
            bot.register_next_step_handler(msg, step_coupon_start_date)
            return
            
        elif target == 'specific':
            page = int(parts[2])
            conv_states[chat_id]['target_type'] = 'specific'
            if 'target_products' not in conv_states[chat_id]:
                conv_states[chat_id]['target_products'] = []
                
            _render_product_selector(chat_id, call.message.message_id, page, is_coupon=True)
            return

    elif data.startswith("coup_selprod:"):
        parts = data.split(":")
        pid = parts[1]
        page = int(parts[2])
        
        selected = conv_states[chat_id].get('target_products', [])
        if pid in selected:
            selected.remove(pid)
        else:
            selected.append(pid)
        conv_states[chat_id]['target_products'] = selected
        
        _render_product_selector(chat_id, call.message.message_id, page, is_coupon=True)
        return

    elif data == "coup_confirm_sel":
        selected = conv_states[chat_id].get('target_products', [])
        if not selected:
            bot.answer_callback_query(call.id, "❌ Please select at least one product!", show_alert=True)
            return
            
        conv_states[chat_id]['step'] = 'coup_start_date'
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("Start Now", callback_data="coup_start_choice:now"),
            InlineKeyboardButton("In 1 Hour", callback_data="coup_start_choice:1h"),
            InlineKeyboardButton("Tomorrow", callback_data="coup_start_choice:1d")
        )
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_coupon"))
        msg = bot.send_message(chat_id, "📅 **Create Coupon: Start Date & Time**\n\nEnter the start date/time when this coupon code becomes valid.\nFormat: `DD-MM-YYYY HH:MM` (e.g., `05-06-2026 12:00`):\n\n- Click a quick option below,\n- Or type the start date/time below:", reply_markup=markup, parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_coupon_start_date)
        return

    elif data == "confirm_create_coupon":
        state = conv_states.get(chat_id)
        if not state:
            bot.answer_callback_query(call.id, "❌ Session expired.", show_alert=True)
            return
            
        code = state['code']
        new_coup = {
            "code": code,
            "type": state['type'],
            "value": float(state['value']),
            "target_type": state['target_type'],
            "target_products": state.get('target_products', []),
            "start_date": state['start_date'],
            "end_date": state['end_date'],
            "max_uses": state['max_uses'],
            "per_user_limit": state.get('per_user_limit', -1),
            "used_count": 0,
            "is_active": True
        }
        if 'coupons' not in db:
            db['coupons'] = {}
        db['coupons'][code] = new_coup
        save_db(db)
        
        conv_states.pop(chat_id, None)
        bot.edit_message_text(f"✅ **Coupon Code `{code}` created successfully!**", chat_id, call.message.message_id, parse_mode="Markdown")
        return

    elif data == "cancel_coupon":
        conv_states.pop(chat_id, None)
        bot.answer_callback_query(call.id, "❌ Coupon creation cancelled.")
        call.data = "promo_menu"
        return handle_callbacks(call)

    elif data == "cancel_add_product":
        bot.clear_step_handler_by_chat_id(chat_id)
        conv_states.pop(chat_id, None)
        bot.answer_callback_query(call.id, "❌ Product creation cancelled.")
        _send_manage_products(chat_id, db, edit_msg_id=call.message.message_id)
        return

    # QUICK CHOICE WIZARD CALLBACKS
    elif data.startswith("disc_start_choice:"):
        choice = data.split(":")[1]
        bot.clear_step_handler_by_chat_id(chat_id)
        
        if choice == 'now':
            ts = time.time()
        elif choice == '1h':
            ts = time.time() + 3600
        elif choice == '1d':
            ts = time.time() + 86400
        else:
            ts = time.time()
            
        conv_states[chat_id]['start_date'] = ts
        conv_states[chat_id]['step'] = 'disc_end_date'
        
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("⏰ 1 Day", callback_data="disc_end_choice:1d"),
            InlineKeyboardButton("⏰ 3 Days", callback_data="disc_end_choice:3d"),
            InlineKeyboardButton("⏰ 7 Days", callback_data="disc_end_choice:7d"),
            InlineKeyboardButton("⏰ 30 Days", callback_data="disc_end_choice:30d"),
            InlineKeyboardButton("♾️ Never Expire", callback_data="disc_end_choice:never")
        )
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_discount"))
        
        msg = bot.send_message(chat_id, "📅 **Create Discount: End Date & Time**\n\nEnter when this discount ends.\n- Click one of the quick options below,\n- Or type a custom duration (e.g. `2 hours`),\n- Or enter a specific date (e.g., `06-06-2026 12:00`):", reply_markup=markup, parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_disc_end_date)
        return

    elif data.startswith("disc_end_choice:"):
        choice = data.split(":")[1]
        bot.clear_step_handler_by_chat_id(chat_id)
        
        if choice == '1d':
            ts = time.time() + 86400
        elif choice == '3d':
            ts = time.time() + 3 * 86400
        elif choice == '7d':
            ts = time.time() + 7 * 86400
        elif choice == '30d':
            ts = time.time() + 30 * 86400
        elif choice == 'never':
            ts = 9999999999
            
        conv_states[chat_id]['end_date'] = ts
        
        # Show confirmation preview
        state = conv_states[chat_id]
        start_str = datetime.fromtimestamp(state['start_date'], tz=IST).strftime("%d-%m-%Y %H:%M")
        end_str = "Never (No Expiration)" if state['end_date'] == 9999999999 else datetime.fromtimestamp(state['end_date'], tz=IST).strftime("%d-%m-%Y %H:%M")
        val_str = f"{state['value']}%" if state['type'] == 'percentage' else f"₹{state['value']}"
        target_str = "All Products" if state['target_type'] == 'all' else f"{len(state.get('target_products', []))} Specific Products"

        confirm_text = (
            "📝 **Confirm Discount Details**\n"
            "───────────────────────\n"
            f"🏷️ **Name**: {state['name']}\n"
            f"📊 **Type**: {state['type'].capitalize()}\n"
            f"💰 **Value**: {val_str}\n"
            f"🎯 **Target**: {target_str}\n"
            f"📅 **Start**: {start_str} IST\n"
            f"📅 **End**: {end_str}\n"
            "───────────────────────\n"
            "⚠️ **Verify details. Confirm and save this discount?**"
        )

        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("✅ Confirm & Activate", callback_data="confirm_create_discount"),
            InlineKeyboardButton("❌ Cancel", callback_data="cancel_discount")
        )
        bot.send_message(chat_id, confirm_text, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("coup_start_choice:"):
        choice = data.split(":")[1]
        bot.clear_step_handler_by_chat_id(chat_id)
        
        if choice == 'now':
            ts = time.time()
        elif choice == '1h':
            ts = time.time() + 3600
        elif choice == '1d':
            ts = time.time() + 86400
        else:
            ts = time.time()
            
        conv_states[chat_id]['start_date'] = ts
        conv_states[chat_id]['step'] = 'coup_end_date'
        
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("⏰ 1 Day", callback_data="coup_end_choice:1d"),
            InlineKeyboardButton("⏰ 3 Days", callback_data="coup_end_choice:3d"),
            InlineKeyboardButton("⏰ 7 Days", callback_data="coup_end_choice:7d"),
            InlineKeyboardButton("⏰ 30 Days", callback_data="coup_end_choice:30d"),
            InlineKeyboardButton("♾️ Never Expire", callback_data="coup_end_choice:never")
        )
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_coupon"))
        
        msg = bot.send_message(chat_id, "📅 **Create Coupon: End Date & Time**\n\nEnter when this coupon expires.\n- Click one of the quick options below,\n- Or type a custom duration (e.g. `7 days`),\n- Or enter a specific date (e.g., `06-06-2026 12:00`):", reply_markup=markup, parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_coupon_end_date)
        return

    elif data.startswith("coup_end_choice:"):
        choice = data.split(":")[1]
        bot.clear_step_handler_by_chat_id(chat_id)
        
        if choice == '1d':
            ts = time.time() + 86400
        elif choice == '3d':
            ts = time.time() + 3 * 86400
        elif choice == '7d':
            ts = time.time() + 7 * 86400
        elif choice == '30d':
            ts = time.time() + 30 * 86400
        elif choice == 'never':
            ts = 9999999999
            
        conv_states[chat_id]['end_date'] = ts
        conv_states[chat_id]['step'] = 'coup_per_user_limit'
        
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("1 Time", callback_data="coup_per_user_choice:1"),
            InlineKeyboardButton("♾️ Unlimited", callback_data="coup_per_user_choice:-1")
        )
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_coupon"))
        
        msg = bot.send_message(chat_id, "🔢 **Create Coupon: Max Uses Per User**\n\nEnter the maximum number of times **a single user** can use this coupon.\n- Click a quick option below,\n- Or type a custom number:", reply_markup=markup, parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_coupon_per_user_limit)
        return

    elif data.startswith("coup_per_user_choice:"):
        val = int(data.split(":")[1])
        bot.clear_step_handler_by_chat_id(chat_id)
        conv_states[chat_id]['per_user_limit'] = val
        conv_states[chat_id]['step'] = 'coup_max_uses'
        
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("10 Uses", callback_data="coup_max_uses_choice:10"),
            InlineKeyboardButton("50 Uses", callback_data="coup_max_uses_choice:50"),
            InlineKeyboardButton("100 Uses", callback_data="coup_max_uses_choice:100"),
            InlineKeyboardButton("♾️ Unlimited", callback_data="coup_max_uses_choice:-1")
        )
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_coupon"))
        
        msg = bot.send_message(chat_id, "🔢 **Create Coupon: Max Uses (Global)**\n\nEnter the maximum total uses for this coupon across all users.\n- Click a quick option below,\n- Or type a custom number:", reply_markup=markup, parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_coupon_max_uses)
        return

    elif data.startswith("coup_max_uses_choice:"):
        max_uses = int(data.split(":")[1])
        bot.clear_step_handler_by_chat_id(chat_id)
        conv_states[chat_id]['max_uses'] = max_uses
        
        # Show confirmation preview
        state = conv_states[chat_id]
        start_str = datetime.fromtimestamp(state['start_date'], tz=IST).strftime("%d-%m-%Y %H:%M")
        end_str = "Never (No Expiration)" if state['end_date'] == 9999999999 else datetime.fromtimestamp(state['end_date'], tz=IST).strftime("%d-%m-%Y %H:%M")
        val_str = f"{state['value']}%" if state['type'] == 'percentage' else f"₹{state['value']}"
        target_str = "All Products" if state['target_type'] == 'all' else f"{len(state.get('target_products', []))} Specific Products"
        uses_str = "Unlimited" if max_uses == -1 else str(max_uses)
        per_user_str = "Unlimited" if state['per_user_limit'] == -1 else f"{state['per_user_limit']} use(s)"

        confirm_text = (
            "📝 **Confirm Coupon Details**\n"
            "───────────────────────\n"
            f"🎟️ **Code**: `{state['code']}`\n"
            f"📊 **Type**: {state['type'].capitalize()}\n"
            f"💰 **Value**: {val_str}\n"
            f"🎯 **Target**: {target_str}\n"
            f"📅 **Start**: {start_str} IST\n"
            f"📅 **End**: {end_str}\n"
            f"🔢 **Limit Per User**: {per_user_str}\n"
            f"🔢 **Max Uses (Global)**: {uses_str}\n"
            "───────────────────────\n"
            "⚠️ **Verify details. Confirm and save this coupon?**"
        )

        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("✅ Confirm & Save", callback_data="confirm_create_coupon"),
            InlineKeyboardButton("❌ Cancel", callback_data="cancel_coupon")
        )
        bot.send_message(chat_id, confirm_text, reply_markup=markup, parse_mode="Markdown")
        return

    # PRODUCT BROADCAST CALLBACKS
    elif data == "bc_menu":
        markup = InlineKeyboardMarkup(row_width=1)
        markup.add(
            InlineKeyboardButton("💬 Send Text Broadcast", callback_data="bc_type:text"),
            InlineKeyboardButton("📦 Send Product Broadcast", callback_data="bc_type:product"),
            InlineKeyboardButton("❌ Cancel", callback_data="close_menu")
        )
        try:
            bot.edit_message_text("📢 **Select Broadcast Type**\n\nChoose what you want to broadcast to all users:", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        except:
            bot.send_message(chat_id, "📢 **Select Broadcast Type**\n\nChoose what you want to broadcast to all users:", reply_markup=markup, parse_mode="Markdown")
        return

    elif data == "bc_type:text":
        msg = bot.send_message(chat_id, "💬 **Text Broadcast**\n\nEnter the message you want to broadcast to all registered users (or type `cancel`):", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_preview_text_broadcast)
        return

    elif data.startswith("bc_type:product") or data.startswith("bc_prod_page:"):
        if data == "bc_type:product":
            conv_states[chat_id] = {
                'bc_type': 'product',
                'bc_pids': []
            }
            page = 1
        else:
            try:
                page = int(data.split(":")[1])
            except (ValueError, IndexError):
                page = 1
        _render_broadcast_product_selector(chat_id, call.message.message_id, page)
        return

    elif data.startswith("bc_toggleprod:"):
        parts = data.split(":")
        pid = parts[1]
        page = int(parts[2])
        
        if chat_id not in conv_states:
            conv_states[chat_id] = {
                'bc_type': 'product',
                'bc_pids': []
            }
            
        selected = conv_states[chat_id].get('bc_pids', [])
        if pid in selected:
            selected.remove(pid)
        else:
            selected.append(pid)
        conv_states[chat_id]['bc_pids'] = selected
        
        _render_broadcast_product_selector(chat_id, call.message.message_id, page)
        return

    elif data == "bc_confirm_sel":
        selected = conv_states.get(chat_id, {}).get('bc_pids', [])
        if not selected:
            bot.answer_callback_query(call.id, "❌ Please select at least one product!", show_alert=True)
            return
            
        msg = bot.send_message(chat_id, f"✍️ **Product Broadcast**\n\nEnter a custom announcement message for the selected products (or type `cancel`):", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_process_product_broadcast)
        return

    elif data.startswith("confirm_bc:"):
        bc_type = data.split(":")[1]
        state = conv_states.get(chat_id)
        if not state or state.get('bc_type') != bc_type:
            bot.answer_callback_query(call.id, "❌ Session expired or invalid.", show_alert=True)
            return
            
        db = load_db()
        users = db.get("users", {})
        total_users = len(users)
        
        if total_users == 0:
            bot.answer_callback_query(call.id, "❌ No users registered to broadcast to.", show_alert=True)
            return
            
        bot.answer_callback_query(call.id, "📢 Broadcast started in background.")
        
        # Edit the preview message to show status
        status_msg = bot.edit_message_text(f"🔄 **Broadcasting...**\nProgress: `0%` (0/{total_users})", chat_id, call.message.message_id, parse_mode="Markdown")
        
        # Start broadcast in a background thread to prevent blocking the callback handler
        threading.Thread(
            target=run_broadcast_task,
            args=(bc_type, state.copy(), chat_id, status_msg.message_id),
            daemon=True
        ).start()
        
        conv_states.pop(chat_id, None)
        return
        
    elif data == "cancel_bc":
        conv_states.pop(chat_id, None)
        bot.edit_message_text("❌ **Broadcast cancelled.**", chat_id, call.message.message_id, parse_mode="Markdown")
        return

    # PRODUCT CREATION WIZARD CALLBACKS
    elif data == "wiz_cancel":
        conv_states.pop(chat_id, None)
        bot.clear_step_handler_by_chat_id(chat_id)
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 Manage Catalog", callback_data="mp_menu"))
        bot.send_message(chat_id, "❌ **Product setup discarded.**", reply_markup=markup, parse_mode="Markdown")
        return

    elif data == "wiz_next_desc":
        wiz_prompt_desc(chat_id)
        return

    elif data == "wiz_skip_desc":
        if 'draft' in conv_states.get(chat_id, {}):
            conv_states[chat_id]['draft']['description'] = ''
        wiz_prompt_var(chat_id, status_msg="📝 *Description skipped.*")
        return

    elif data == "wiz_add_var_prompt":
        wiz_prompt_add_var_name(chat_id)
        return

    elif data == "wiz_next_rules":
        wiz_prompt_rules(chat_id)
        return

    elif data == "wiz_skip_rules":
        if 'draft' in conv_states.get(chat_id, {}):
            conv_states[chat_id]['draft']['rules'] = ''
        wiz_prompt_delivery_time(chat_id, status_msg="📜 *Rules skipped.*")
        return

    elif data.startswith("wiz_del_proc:"):
        proc = data.split(":")[1]
        if 'draft' in conv_states.get(chat_id, {}):
            conv_states[chat_id]['draft']['delivery_process'] = proc
        wiz_prompt_cat(chat_id, status_msg=f"⚡ *Delivery Process set to {'Automatic' if proc == 'auto' else 'Manual'}!*")
        return

    elif data == "wiz_var_cancel":
        conv_states.get(chat_id, {}).pop('draft_var', None)
        wiz_show_variants_summary(chat_id)
        return

    elif data.startswith("wiz_varpoolselect:"):
        bot.answer_callback_query(call.id)
        pool_id = data.split(":", 1)[1]
        state = conv_states.get(chat_id)
        if not state:
            bot.send_message(chat_id, "❌ Error: Session state not found. Start setup again.")
            return
            
        draft = state.get('draft')
        draft_var = state.get('draft_var')
        if not draft or not draft_var:
            bot.send_message(chat_id, "❌ Error: Draft variant state not found. Try adding variant again.")
            return
            
        try:
            vid = "v-" + uuid.uuid4().hex[:6]
            draft['variants'][vid] = {
                'name': draft_var.get('name', 'Unnamed'),
                'price': draft_var.get('price', 0),
                'duration': draft_var.get('duration', 0),
                'pool_id': pool_id
            }
            state.pop('draft_var', None)
            
            # Delete old keyboard message to clean chat
            try:
                bot.delete_message(chat_id, call.message.message_id)
            except Exception:
                pass
            
            pending = state.get('pending_vars', [])
            curr_idx = state.get('current_var_idx', 0)
            next_idx = curr_idx + 1
            if next_idx < len(pending):
                state['current_var_idx'] = next_idx
                next_name = pending[next_idx]
                state['draft_var'] = {'name': next_name}
                msg = bot.send_message(chat_id, f"✨ *Variant '{draft_var.get('name')}' added successfully!*\n\n💰 **ADD VARIANT: {next_name.upper()}**\n───────────────────────────\nEnter the Price in INR for variant `{next_name}`:", parse_mode="Markdown")
                bot.register_next_step_handler(msg, step_wizard_var_price)
            else:
                state.pop('pending_vars', None)
                state.pop('current_var_idx', None)
                wiz_show_variants_summary(chat_id, status_msg=f"✨ *Variant '{draft_var.get('name')}' added successfully!*")
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            bot.send_message(chat_id, f"❌ Debug Error in pool selection:\n```\n{tb}\n```", parse_mode="Markdown")
        return

    elif data.startswith("wiz_catselect:"):
        cid = data.split(":", 1)[1]
        state = conv_states.get(chat_id)
        draft = state.get('draft') if state else None
        if draft:
            draft['category_id'] = cid
            pid = "p-" + uuid.uuid4().hex[:6]
            db['products'][pid] = {
                'name': draft['name'],
                'description': draft.get('description', ''),
                'category_id': draft.get('category_id', ''),
                'rules': draft.get('rules', ''),
                'stock_pools': draft['stock_pools'],
                'variants': draft['variants'],
                'delivery_process': draft.get('delivery_process', 'auto'),
                'delivery_time': draft.get('delivery_time', 'Instant'),
                'is_active': False
            }
            save_db(db)
            
            bot.send_message(chat_id, f"🎉 **Product `{draft['name']}` created successfully!**\n*(It is currently deactivated. It will go live once stock is uploaded)*", parse_mode="Markdown")
            
            pending = state.get('pending_prods', [])
            curr_idx = state.get('current_index', 0)
            next_idx = curr_idx + 1
            if next_idx < len(pending):
                state['current_index'] = next_idx
                next_name = pending[next_idx]
                state['draft'] = {
                    'name': next_name,
                    'description': '',
                    'category_id': '',
                    'rules': '',
                    'stock_pools': {},
                    'variants': {}
                }
                bot.send_message(chat_id, f"📦 **Moving to next product in bulk queue: {next_name}**")
                wiz_prompt_pool(chat_id)
            else:
                conv_states.pop(chat_id, None)
                markup = InlineKeyboardMarkup()
                markup.row(
                    InlineKeyboardButton("➕ Add More", callback_data="add_prod"),
                    InlineKeyboardButton("🔙 Manage Catalog", callback_data="mp_menu")
                )
                bot.send_message(chat_id, "✅ **All products in queue have been successfully configured!**", reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("repl_sale:"):
        parts = data.split(":")
        sid = parts[1]
        back_cb_str = parts[2] if len(parts) > 2 else conv_states.get(chat_id, {}).get('back_cb_str', '')
        conv_states[chat_id] = {'repl_sid': sid, 'back_cb_str': back_cb_str}
        msg = bot.send_message(chat_id, "🔄 **Replace Credentials**\n\nSend the NEW credentials for this order. The user will be notified immediately:", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_repl_save)
        return

    elif data.startswith("del_sale:"):
        parts = data.split(":")
        sid = parts[1]
        back_cb_str = parts[2] if len(parts) > 2 else conv_states.get(chat_id, {}).get('back_cb_str', '')
        db = load_db()
        original_len = len(db['sales'])
        db['sales'] = [s for s in db['sales'] if s['sale_id'] != sid]
        if len(db['sales']) < original_len:
            save_db(db)
            bot.answer_callback_query(call.id, "✅ Order Deleted Permanently!", show_alert=True)
            if back_cb_str:
                call.data = decode_back_cb(back_cb_str)
                return handle_callbacks(call)
            else:
                bot.delete_message(chat_id, call.message.message_id)
        else:
            bot.answer_callback_query(call.id, "❌ Order not found.")
        return

    elif data.startswith("setstat:"):
        parts = data.split(":")
        sid = parts[1]
        new_status = parts[2]
        back_cb_str = parts[3] if len(parts) > 3 else conv_states.get(chat_id, {}).get('back_cb_str', '')
        db = load_db()
        target_uid = None
        p_name = ""
        for s in db['sales']:
            if s['sale_id'] == sid:
                s['status'] = new_status
                target_uid = s['user_id']
                p_name = s['product_name']
                break
        save_db(db)
        bot.answer_callback_query(call.id, f"Order status set to {new_status}")
        
        # Notify user
        try:
            from manager import STORE_BOT_TOKEN
            target_bot = telebot.TeleBot(STORE_BOT_TOKEN)
            kb = build_store_reply_keyboard()
            safe_send_store_message(target_bot, target_uid, f"📊 *Order Status Update*\n\nYour order for *{p_name}* has been updated to: *{new_status}*.", reply_markup=kb)
        except: pass
        
        # Refresh message
        if back_cb_str:
            call.data = f"view_order_detail:{sid}"
            return handle_callbacks(call)
        else:
            bot.delete_message(chat_id, call.message.message_id)
        return

    elif data.startswith("orders_s:"):
        parts = data.split(":")
        status = parts[1]
        page = int(parts[2])
        db = load_db()
        _send_orders_status_list(chat_id, db, status, page, edit_msg_id=call.message.message_id, call_id=call.id)
        return
 
    elif data == "orders_main_menu":
        markup = InlineKeyboardMarkup()
        markup.row(
            InlineKeyboardButton("⏳ Pending", callback_data="orders_s:Pending:1"),
            InlineKeyboardButton("🟢 Delivered", callback_data="orders_s:Delivered:1")
        )
        markup.row(
            InlineKeyboardButton("🔴 Canceled", callback_data="orders_s:Canceled:1"),
            InlineKeyboardButton("💰 Refunded", callback_data="orders_s:Refunded:1")
        )
        markup.row(
            InlineKeyboardButton("⏸️ On Hold", callback_data="orders_s:On Hold:1")
        )
        markup.row(
            InlineKeyboardButton("🔍 Search", callback_data="search_orders_prompt"),
            InlineKeyboardButton("❌ Close Menu", callback_data="close_menu")
        )
        
        bot.edit_message_text("📋 **Customer Orders Menu**\n\nSelect a status category to view orders (recent first), or search for a customer's specific orders:", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("view_order_detail:"):
        parts = data.split(":")
        sid = parts[1]
        back_cb_str = parts[2] if len(parts) > 2 else conv_states.get(chat_id, {}).get('back_cb_str', '')
        
        back_cb = decode_back_cb(back_cb_str)
        
        sales = db.get('sales', [])
        s = next((x for x in sales if x['sale_id'] == sid), None)
        if not s:
            bot.answer_callback_query(call.id, "❌ Order not found.", show_alert=True)
            return
            
        uid = str(s.get('user_id'))
        uname = str(s.get('username', 'Unknown')).replace('_', '-')
        uname_display = f"@{uname}" if uname != "Unknown" else "Unknown"
        buy_dt = datetime.fromtimestamp(s.get('purchase_ts', 0), IST).strftime('%I:%M %p, %d %b %Y')
        
        sub_info = ""
        end_ts = s.get('end_ts')
        curr_status = s.get('status', 'Delivered')
        
        if end_ts:
            exp_dt = datetime.fromtimestamp(end_ts, IST).strftime('%I:%M %p, %d %b %Y')
            if curr_status == "Canceled":
                status_v = "🔴 Subscription Canceled"
            elif curr_status == "Refunded":
                status_v = "💰 Order Refunded"
            elif curr_status == "On Hold":
                status_v = "⏸️ Subscription On Hold"
            else:
                status_v = "🟢 LIVE" if time.time() < end_ts else "🔴 EXPIRED"
            
            sub_info = f"⚖️ *Validity:* {status_v}\n📅 *Expiry:* {exp_dt}\n"
            
        status_map = {
            "Delivered": "✅ Delivered",
            "Canceled": "❌ Canceled",
            "Refunded": "💰 Refunded",
            "On Hold": "⏸️ On Hold"
        }
        status_str = status_map.get(curr_status, curr_status)
        
        edit_info = ""
        if s.get('last_edited_at'):
            edit_dt = datetime.fromtimestamp(s['last_edited_at'], IST).strftime('%I:%M %p, %d %b %Y')
            edit_info = f"🔄 *Replaced At:* {edit_dt}\n"
            
        card = (
            f"🧾 *Order ID: {sid}*\n"
            f"👤 *Customer:* {uname_display} (`{uid}`)\n"
            f"───────────────────────\n"
            f"📦 *Product:* {s['product_name']}\n"
            f"💎 *Variant:* {s['variant_name']}\n"
            f"💰 *Paid Amount:* ₹{s.get('price', 0)}\n"
            f"📊 *Current Status:* {status_str}\n\n"
            f"{sub_info}"
            f"📅 *Purchased:* {buy_dt}\n"
            f"{edit_info}\n"
            f"📑 *Credentials:*\n`{s['credentials']}`\n"
        )
        
        markup = InlineKeyboardMarkup()
        markup.add(
            InlineKeyboardButton("✏️ Edit/Replace", callback_data=f"repl_sale:{sid}"),
            InlineKeyboardButton("🗑️ Delete", callback_data=f"del_sale:{sid}")
        )
        markup.add(
            InlineKeyboardButton("🟢 Delivered", callback_data=f"setstat:{sid}:Delivered"),
            InlineKeyboardButton("🔴 Cancel", callback_data=f"setstat:{sid}:Canceled"),
            InlineKeyboardButton("💰 Refund", callback_data=f"setstat:{sid}:Refunded"),
            InlineKeyboardButton("⏸️ Hold", callback_data=f"setstat:{sid}:On Hold")
        )
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=back_cb))
        
        bot.edit_message_text(card, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data == "search_orders_prompt":
        msg = bot.send_message(chat_id, "🔍 **Search Customer Orders**\n\nPlease enter the Telegram **User ID** (e.g. `123456789`) or **Username** (e.g. `quantumsera`) to load their specific orders:\n\nType `cancel` to abort.", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_search_orders)
        return

    elif data == "search_deposits_prompt":
        msg = bot.send_message(chat_id, "🔍 **Search Customer Deposits**\n\nPlease enter the Telegram **User ID** or **Username** to load their deposit history:\n\nType `cancel` to abort.", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_search_deposits)
        return

    elif data == "search_users_prompt":
        msg = bot.send_message(chat_id, "🔍 **Search Bot Users**\n\nPlease enter the Telegram **User ID** or **Username** to load their profile directly:\n\nType `cancel` to abort.", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_search_users)
        return

    elif data.startswith("bot_users_page:"):
        page = int(data.split(":")[1])
        _send_bot_users(chat_id, edit_msg_id=call.message.message_id, page=page)
        return

    elif data.startswith("view_user:"):
        parts = data.split(":")
        uid = parts[1]
        page = int(parts[2]) if len(parts) > 2 else 1
        db = load_db()
        u = db.get('users', {}).get(uid)
        if not u:
            return bot.answer_callback_query(call.id, "User not found.")
            
        uname = str(u.get('username', 'Unknown')).replace('_', '-')
        bal = converter.format_price(u.get('balance', 0), u.get('currency', 'INR'))
        tot_dep = converter.format_price(u.get('total_deposit', 0), u.get('currency', 'INR'))
        tot_pur = u.get('total_purchases', 0)
        
        card = (
            f"👤 **Bot User Profile**\n"
            f"───────────────────────\n"
            f"👤 **Username:** @{uname}\n"
            f"🆔 **User ID:** `{uid}`\n\n"
            f"💳 **Current Balance:** `{bal}`\n"
            f"📈 **Total Deposits:** `{tot_dep}`\n"
            f"🛍️ **Total Purchases:** `{tot_pur} order(s)`\n"
            f"───────────────────────"
        )
        
        markup = InlineKeyboardMarkup(row_width=2)
        markup.row(
            InlineKeyboardButton("💳 Manage Balance", callback_data=f"bal_manage:{uid}:{page}"),
            InlineKeyboardButton("💸 Deposit History", callback_data=f"adm_dep_u:{uid}:1:1:{page}")
        )
        markup.row(
            InlineKeyboardButton("🔙 Go Back", callback_data=f"bot_users_page:{page}")
        )
        
        bot.edit_message_text(card, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("bal_manage:"):
        parts = data.split(":")
        uid = parts[1]
        page = int(parts[2]) if len(parts) > 2 else 1
        _send_user_bal_panel(chat_id, call.message.message_id, uid, db, page=page)
        return

    elif data.startswith("bal_act:"):
        parts = data.split(":")
        action = parts[1]
        uid = parts[2]
        page = int(parts[3]) if len(parts) > 3 else 1
        
        db = load_db()
        u = db.get('users', {}).get(uid)
        if not u:
            return bot.answer_callback_query(call.id, "User not found.")
            
        if action in ['add', 'remove']:
            conv_states[chat_id] = {'uid': uid, 'action': action, 'panel_msg_id': call.message.message_id, 'page': page}
            action_verb = "add to" if action == 'add' else "deduct from"
            msg = bot.send_message(chat_id, f"Type the exact amount (₹) you want to {action_verb} user `{uid}` (or type 'cancel'):", parse_mode="Markdown")
            bot.register_next_step_handler(msg, step_user_bal_update_amt)
            return
            
        elif action == 'reset':
            db['users'][uid]['balance'] = 0.0
            save_db(db)
            bot.answer_callback_query(call.id, "✅ Balance reset to 0.")
            
            # Notify user
            try:
                main_bot = telebot.TeleBot(STORE_BOT_TOKEN)
                msg_text = (
                    f"🧹 *WALLET RESET NOTIFICATION* 🧹\n"
                    f"━━━━━━━━━━━━━━━━━━━━━\n"
                    f"💳 *New Wallet Balance:* `₹0.00`\n"
                    f"━━━━━━━━━━━━━━━━━━━━━\n"
                    f"Your wallet balance has been reset to zero by the Admin."
                )
                kb = build_store_reply_keyboard()
                safe_send_store_message(main_bot, int(uid), msg_text, reply_markup=kb)
            except Exception:
                pass
                
            _send_user_bal_panel(chat_id, call.message.message_id, uid, db, page=page)
            return
            
        elif action == 'freeze':
            is_frozen = u.get('is_frozen', False)
            new_state = not is_frozen
            db['users'][uid]['is_frozen'] = new_state
            save_db(db)
            
            status_word = "Frozen" if new_state else "Unfrozen"
            bot.answer_callback_query(call.id, f"✅ Wallet status: {status_word}")
            
            # Notify user
            try:
                main_bot = telebot.TeleBot(STORE_BOT_TOKEN)
                if new_state:
                    msg_text = (
                        f"❄️ *WALLET FROZEN WARNING* ❄️\n"
                        f"━━━━━━━━━━━━━━━━━━━━━\n"
                        f"Your wallet has been frozen by the Admin.\n"
                        f"⚠️ *Note:* You cannot make any new purchases while your wallet is frozen.\n"
                        f"━━━━━━━━━━━━━━━━━━━━━"
                    )
                else:
                    msg_text = (
                        f"🔥 *WALLET UNFROZEN* 🔥\n"
                        f"━━━━━━━━━━━━━━━━━━━━━\n"
                        f"Your wallet has been unfrozen by the Admin.\n"
                        f"🟢 *Status:* You can now make purchases normally!\n"
                        f"━━━━━━━━━━━━━━━━━━━━━"
                    )
                kb = build_store_reply_keyboard()
                safe_send_store_message(main_bot, int(uid), msg_text, reply_markup=kb)
            except Exception:
                pass
                
            _send_user_bal_panel(chat_id, call.message.message_id, uid, db, page=page)
            return

    elif data.startswith("set_sort:"):
        new_mode = data.split(":")[1]
        db['sorting_mode'] = new_mode
        save_db(db)
        bot.answer_callback_query(call.id, f"Sorting mode set to {new_mode.upper()}!")
        _send_sorting_settings_panel(chat_id, call.message.message_id)
        return

    elif data == "sort_settings_main":
        _send_sorting_settings_panel(chat_id, call.message.message_id)
        return

    elif data == "manage_global_pri":
        db = load_db()
        products = db.get('products', {})
        sorted_prods = sorted(products.items(), key=lambda x: (x[1].get('global_priority', 999999), x[1].get('name', '')))
        markup = InlineKeyboardMarkup(row_width=1)
        for i, (pid, p) in enumerate(sorted_prods, start=1):
            btn_text = f"{i}. {p['name']}"
            markup.add(InlineKeyboardButton(btn_text, callback_data=f"set_global_pri:{pid}"))
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="sort_settings_main"))
        bot.edit_message_text("🌍 **Global Product Priorities**\n\nClick a product to change its position in the 'Explore All' list:", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return
        
    elif data == "manage_cat_pri":
        db = load_db()
        categories = db.get('categories', {})
        sorted_cats = sorted(categories.items(), key=lambda x: (x[1].get('priority', 999999), x[1].get('name', '')))
        markup = InlineKeyboardMarkup(row_width=1)
        for i, (cid, cdata) in enumerate(sorted_cats, start=1):
            btn_text = f"{i}. {cdata['name']}"
            markup.add(InlineKeyboardButton(btn_text, callback_data=f"set_cat_pri:sort:{cid}"))
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="sort_settings_main"))
        bot.edit_message_text("📂 **Category Priorities**\n\nClick a category to change its position:", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return
        
    elif data == "manage_catprod_pri_menu":
        db = load_db()
        categories = db.get('categories', {})
        markup = InlineKeyboardMarkup(row_width=1)
        for cid, cdata in categories.items():
            markup.add(InlineKeyboardButton(f"📁 {cdata['name']}", callback_data=f"manage_catprod_pri:{cid}"))
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="sort_settings_main"))
        bot.edit_message_text("📦 **Category-wise Product Priorities**\n\nSelect a Category first:", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return
        
    elif data.startswith("manage_catprod_pri:"):
        cid = data.split(":")[1]
        db = load_db()
        products = db.get('products', {})
        cat_prods = {pid: p for pid, p in products.items() if p.get('category_id') == cid}
        sorted_prods = sorted(cat_prods.items(), key=lambda x: (x[1].get('cat_priority', 999999), x[1].get('name', '')))
        
        markup = InlineKeyboardMarkup(row_width=1)
        for i, (pid, p) in enumerate(sorted_prods, start=1):
            btn_text = f"{i}. {p['name']}"
            markup.add(InlineKeyboardButton(btn_text, callback_data=f"set_catprod_pri:{pid}"))
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="manage_catprod_pri_menu"))
        bot.edit_message_text("📦 **Category Product Priorities**\n\nClick a product to change its position inside this category:", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    # MANAGE PRODUCTS NAVIGATION
    if data == "back_prod_main" or data == "mp_menu":
        _send_manage_products(chat_id, db, edit_msg_id=call.message.message_id)
        return

    elif data == "mp_active":
        products = db.get('products', {})
        active = {pid: p for pid, p in products.items()
                  if p.get('is_active', True) and sum(len(arr) for arr in p.get('stock_pools', {}).values()) > 0}
        markup = InlineKeyboardMarkup(row_width=1)
        if not active:
            markup.add(InlineKeyboardButton("(No active products)", callback_data="noop"))
        for pid, p in sorted(active.items(), key=lambda x: str(x[1].get('name', '')).lower()):
            tot = sum(len(arr) for arr in p.get('stock_pools', {}).values())
            markup.add(InlineKeyboardButton(f"🟢 {p['name']} ({tot} stock)", callback_data=f"prod_detail:{pid}"))
        markup.add(InlineKeyboardButton("🔙 Back to Menu", callback_data="mp_all"))
        
        text_msg = (
            "🟢 **ACTIVE PRODUCTS DIRECTORY**\n"
            "───────────────────────────\n"
            "Following products are currently active with stock in the store catalog.\n\n"
            "👇 *Select a product below to view details:*"
        )
        bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data == "mp_inactive":
        products = db.get('products', {})
        active_ids = {pid for pid, p in products.items()
                     if p.get('is_active', True) and sum(len(arr) for arr in p.get('stock_pools', {}).values()) > 0}
        inactive = {pid: p for pid, p in products.items() if pid not in active_ids}
        markup = InlineKeyboardMarkup(row_width=1)
        if not inactive:
            markup.add(InlineKeyboardButton("(No inactive products)", callback_data="noop"))
        for pid, p in sorted(inactive.items(), key=lambda x: str(x[1].get('name', '')).lower()):
            reason = p.get('inactive_reason', 'out_of_stock')
            reason_str = "Out of Stock" if reason == 'out_of_stock' else "Admin Disabled"
            markup.add(InlineKeyboardButton(f"🔴 {p['name']} ({reason_str})", callback_data=f"prod_detail:{pid}"))
        markup.add(InlineKeyboardButton("🔙 Back to Menu", callback_data="mp_all"))
        
        text_msg = (
            "🔴 **INACTIVE PRODUCTS DIRECTORY**\n"
            "───────────────────────────\n"
            "Following products are currently inactive (out of stock or disabled by admin).\n\n"
            "👇 *Select a product below to view details:*"
        )
        bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data == "list_del_prod":
        products = db.get('products', {})
        markup = InlineKeyboardMarkup(row_width=1)
        if not products:
            markup.add(InlineKeyboardButton("(No products found)", callback_data="noop"))
        for pid, p in sorted(products.items(), key=lambda x: str(x[1].get('name', '')).lower()):
            markup.add(InlineKeyboardButton(f"🗑️ Delete: {p['name']}", callback_data=f"confirm_delprod:{pid}"))
        markup.add(InlineKeyboardButton("🔙 Back to Menu", callback_data="mp_menu"))
        
        text_msg = (
            "🗑️ **DELETE PRODUCT CATALOG**\n"
            "───────────────────────────\n"
            "Select the product you want to permanently delete below:\n"
            "⚠️ *Warning: Deleting a product will remove all its stock and variants.*"
        )
        bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("confirm_delprod:"):
        pid = data.split(":", 1)[1]
        prod = db.get('products', {}).get(pid)
        if not prod:
            bot.answer_callback_query(call.id, "❌ Product not found!", show_alert=True)
            return
            
        markup = InlineKeyboardMarkup()
        markup.row(
            InlineKeyboardButton("🚨 Yes, Delete Permanently", callback_data=f"do_delprod:{pid}"),
            InlineKeyboardButton("❌ Cancel", callback_data="list_del_prod")
        )
        
        text_msg = (
            "🚨 **CONFIRM DELETE PRODUCT**\n"
            "───────────────────────────\n"
            f"Are you sure you want to delete **{prod.get('name', 'Unknown').upper()}**?\n\n"
            "⚠️ *This action is irreversible and will delete all variants, stock pools, and stock items associated with this product.*"
        )
        bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("do_delprod:"):
        pid = data.split(":", 1)[1]
        if pid in db.get('products', {}):
            name = db['products'][pid].get('name', 'Unknown')
            del db['products'][pid]
            save_db(db)
            bot.answer_callback_query(call.id, f"✅ Product '{name}' deleted successfully!", show_alert=True)
        else:
            bot.answer_callback_query(call.id, "❌ Product not found or already deleted!", show_alert=True)
        
        call.data = "list_del_prod"
        return handle_callbacks(call)

    elif data == "mp_all":
        products = db.get('products', {})
        active = {pid: p for pid, p in products.items()
                  if p.get('is_active', True) and sum(len(arr) for arr in p.get('stock_pools', {}).values()) > 0}
        inactive = {pid: p for pid, p in products.items()
                    if pid not in active}
        
        markup = InlineKeyboardMarkup(row_width=2)
        markup.row(
            InlineKeyboardButton(f"🟢 Active ({len(active)})", callback_data="mp_active"),
            InlineKeyboardButton(f"🔴 Inactive ({len(inactive)})", callback_data="mp_inactive")
        )
        markup.add(InlineKeyboardButton("🔙 Back to Menu", callback_data="mp_menu"))
        
        text_msg = (
            "📦 **ALL PRODUCTS DIRECTORY**\n"
            "───────────────────────────\n"
            "Choose a category below to view and edit products in the catalog.\n\n"
            "👇 *Select an option:*"
        )
        bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data == "mp_lowstock":
        products = db.get('products', {})
        def is_low_stock(p):
            if not p.get('is_active', True):
                return False
            stock_pools = p.get('stock_pools', {})
            if not stock_pools:
                return True
            for pool_id, arr in stock_pools.items():
                if not p.get('infinite_pools', {}).get(pool_id, False) and len(arr) < 3:
                    return True
            return False
            
        low_stock = {pid: p for pid, p in products.items() if is_low_stock(p)}
        markup = InlineKeyboardMarkup(row_width=1)
        if not low_stock:
            markup.add(InlineKeyboardButton("(No low stock products)", callback_data="noop"))
        for pid, p in sorted(low_stock.items(), key=lambda x: str(x[1].get('name', '')).lower()):
            tot = sum(len(arr) for arr in p.get('stock_pools', {}).values())
            status_icon = "⚠️" if tot > 0 else "❌"
            markup.add(InlineKeyboardButton(f"{status_icon} {p['name']} ({tot} stock)", callback_data=f"lowstk_view:{pid}"))
        markup.add(InlineKeyboardButton("🔙 Back to Menu", callback_data="mp_menu"))
        
        text_msg = (
            "⚠️ **LOW STOCK PRODUCTS DIRECTORY**\n"
            "───────────────────────────\n"
            "Following products have stock levels at or below the warning threshold (3 units).\n\n"
            "👇 *Select a product below to manage stock directly:*"
        )
        bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("lowstk_view:"):
        pid = data.split(":", 1)[1]
        p = db['products'].get(pid)
        if not p: return
        tot = sum(len(arr) for arr in p.get('stock_pools', {}).values())
        
        markup = InlineKeyboardMarkup(row_width=1)
        # Show buttons to directly restock each pool
        for pool_id, stock_arr in p.get('stock_pools', {}).items():
            markup.add(InlineKeyboardButton(f"🧊 {pool_id} ({len(stock_arr)} Stock) • ➕ Add", callback_data=f"selpoolstk_lowstk:{pid}:{pool_id}"))
            
        markup.add(InlineKeyboardButton("🔙 Back to Low Stock List", callback_data="mp_lowstock"))
        
        text_msg = (
            f"⚠️ **LOW STOCK DETAIL: {p['name']}**\n"
            f"───────────────────────────\n"
            f"📊 **Current Total Stock:** `{tot} unit(s)`\n\n"
            f"👇 **Choose a pool below to add stock directly:**"
        )
        bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return


    elif data.startswith("prod_detail:"):
        pid = data.split(":", 1)[1]
        p = db['products'].get(pid)
        bot.edit_message_text(_product_detail_text(pid, p), chat_id, call.message.message_id, reply_markup=_product_detail_markup(pid, p), parse_mode="Markdown")
        return

    elif data.startswith("ep_menu:"):
        pid = data.split(":", 1)[1]
        p = db['products'].get(pid)
        if not p: return
        text_msg = (
            f"⚙️ **EDIT PRODUCT: {p['name']}**\n"
            "───────────────────────────\n"
            "Select an option below to modify product details, category, or variants."
        )
        bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=_edit_product_markup(pid), parse_mode="Markdown")
        return

    elif data.startswith("sp_menu:"):
        pid = data.split(":", 1)[1]
        p = db['products'].get(pid)
        if not p: return
        text_msg = (
            f"📦 **STOCK & POOLS: {p['name']}**\n"
            "───────────────────────────\n"
            "Manage your inventory pools, or configure specific stock items."
        )
        bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=_stock_pools_markup(pid), parse_mode="Markdown")
        return

    elif data.startswith("selstock:"):
        bot.answer_callback_query(call.id)
        pid = data.split(":", 1)[1]
        p = db['products'].get(pid)
        if not p: return
        
        pools = p.get('stock_pools', {})
        if not pools:
            bot.answer_callback_query(call.id, "❌ Error: You must create a Stock Pool for this product first!", show_alert=True)
            return
            
        markup = InlineKeyboardMarkup(row_width=1)
        for pool_id in pools.keys():
            markup.add(InlineKeyboardButton(f"🧊 {pool_id}", callback_data=f"selpoolstk_lowstk:{pid}:{pool_id}"))
        markup.add(InlineKeyboardButton("🔙 Back", callback_data=f"ms_menu:{pid}"))
        
        text_msg = (
            f"📥 **ADD STOCK: {p['name']}**\n"
            "───────────────────────────\n"
            "Select the Stock Pool you want to upload stock items to:"
        )
        bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("selpoolstk_lowstk:"):
        bot.answer_callback_query(call.id)
        parts = data.split(":", 2)
        pid, pool_id = parts[1], parts[2]
        p = db['products'].get(pid)
        if not p: return
        
        back_to = f"ms_menu:{pid}"
        if call.message and call.message.text and "LOW STOCK" in call.message.text:
            back_to = f"lowstk_view:{pid}"
            
        conv_states[chat_id] = {'pid': pid, 'pool_id': pool_id, 'back_to': back_to}
        
        msg = bot.send_message(
            chat_id,
            f"📥 **UPLOAD STOCK: {p['name'].upper()} ➔ `{pool_id}`**\n"
            "───────────────────────────\n"
            "Send the stock items to add (one per line, or upload a `.txt` file).\n\n"
            "💡 *Tips:*\n"
            "• Use blank lines between items if they are multi-line accounts/cards.\n"
            "• *Type 'cancel' to abort.*",
            parse_mode="Markdown"
        )
        bot.register_next_step_handler(msg, step_add_stock)
        return

    elif data.startswith("delstock:"):
        bot.answer_callback_query(call.id)
        pid = data.split(":", 1)[1]
        call.data = f"managepools:{pid}"
        return handle_callbacks(call)

    elif data.startswith("ms_menu:"):
        pid = data.split(":", 1)[1]
        p = db['products'].get(pid)
        if not p: return
        text_msg = (
            f"📦 **MANAGE STOCK: {p['name']}**\n"
            "───────────────────────────\n"
            "Upload new stock, inspect existing items, or clear out the entire inventory for this product."
        )
        bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=_manage_stock_markup(pid), parse_mode="Markdown")
        return

    elif data.startswith("clear_stock:"):
        pid = data.split(":", 1)[1]
        p = db['products'].get(pid)
        if not p: return
        total_cleared = 0
        if 'stock_pools' in p:
            for pool_id in p['stock_pools']:
                total_cleared += len(p['stock_pools'][pool_id])
                p['stock_pools'][pool_id] = []
        save_db(db)
        bot.answer_callback_query(call.id, f"✅ Cleared {total_cleared} stock items from all pools!", show_alert=True)
        bot.edit_message_text(_product_detail_text(pid, p), chat_id, call.message.message_id, reply_markup=_manage_stock_markup(pid), parse_mode="Markdown")
        return

    elif data.startswith("toggle_active:"):
        parts = data.split(":", 2)
        pid, new_state = parts[1], int(parts[2])
        p = db['products'].get(pid)
        p['is_active'] = bool(new_state)
        if not new_state:
            p['inactive_reason'] = 'admin_disabled'
        else:
            p.pop('inactive_reason', None)
        save_db(db)
        status = "enabled" if new_state else "disabled"
        bot.answer_callback_query(call.id, f"Product {status}!", show_alert=True)
        p = db['products'].get(pid)
        bot.edit_message_text(_product_detail_text(pid, p), chat_id, call.message.message_id, reply_markup=_product_detail_markup(pid, p), parse_mode="Markdown")
        return

    elif data.startswith("editname:"):
        pid = data.split(":")[1]
        conv_states[chat_id] = {'pid': pid}
        msg = bot.send_message(chat_id, "✏️ **Edit Name**\n\nPlease send the new name for this product:", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_edit_name)
        return
    elif data.startswith("set_global_pri:"):
        pid = data.split(":")[1]
        db = load_db()
        p = db.get('products', {}).get(pid)
        if not p:
            return bot.answer_callback_query(call.id, "Product not found.")
        current_pri = p.get('global_priority', 'Default (999999)')
        
        prompt_text = (
            f"🌍 **Set Global Priority**\n"
            f"───────────────────────────\n"
            f"📦 **Product:** `{p['name']}`\n"
            f"🔢 **Current Priority:** `{current_pri}`\n"
            f"───────────────────────────\n"
            f"✍️ *Please send the new priority number (1 is highest, goes at top):*"
        )
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_pri_edit:manage_global_pri"))
        try:
            msg = bot.edit_message_text(prompt_text, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        except Exception:
            msg = bot.send_message(chat_id, prompt_text, reply_markup=markup, parse_mode="Markdown")
            
        conv_states[chat_id] = {'pid': pid, 'prompt_msg_id': msg.message_id, 'type': 'global'}
        bot.register_next_step_handler(msg, step_set_global_pri)
        return
        
    elif data.startswith("set_catprod_pri:"):
        pid = data.split(":")[1]
        db = load_db()
        p = db.get('products', {}).get(pid)
        if not p:
            return bot.answer_callback_query(call.id, "Product not found.")
        cid = p.get('category_id')
        current_pri = p.get('cat_priority', 'Default (999999)')
        
        prompt_text = (
            f"📁 **Set Category-wise Product Priority**\n"
            f"───────────────────────────\n"
            f"📦 **Product:** `{p['name']}`\n"
            f"🔢 **Current Priority:** `{current_pri}`\n"
            f"───────────────────────────\n"
            f"✍️ *Please send the new priority number (1 is highest, goes at top):*"
        )
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data=f"cancel_pri_edit:manage_catprod_pri:{cid}"))
        try:
            msg = bot.edit_message_text(prompt_text, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        except Exception:
            msg = bot.send_message(chat_id, prompt_text, reply_markup=markup, parse_mode="Markdown")
            
        conv_states[chat_id] = {'pid': pid, 'cid': cid, 'prompt_msg_id': msg.message_id, 'type': 'catprod'}
        bot.register_next_step_handler(msg, step_set_catprod_pri)
        return

    elif data.startswith("editrules:"):
        pid = data.split(":")[1]
        db = load_db()
        prod = db.get('products', {}).get(pid)
        if not prod: return
        
        markup = InlineKeyboardMarkup(row_width=1)
        markup.add(InlineKeyboardButton("🌍 Entire Product (Global)", callback_data=f"setrules:{pid}:global"))
        
        pools = prod.get('stock_pools', {})
        if pools:
            for pool_id in pools.keys():
                markup.add(InlineKeyboardButton(f"🧊 Pool: {pool_id}", callback_data=f"setrules:{pid}:{pool_id}"))
                
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"ep_menu:{pid}"))
        bot.edit_message_text(f"📜 **Edit Rules for {prod['name']}**\n\nDo you want to set rules for the entire product, or a specific stock pool?", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return
        
    elif data.startswith("setrules:"):
        parts = data.split(":")
        pid = parts[1]
        target_id = parts[2]
        
        conv_states[chat_id] = {'pid': pid, 'rule_target': target_id}
        
        target_name = "Entire Product" if target_id == "global" else f"Pool: {target_id}"
        msg = bot.send_message(chat_id, f"📜 **Edit Rules -> {target_name}**\n\nPlease send the rules (Markdown supported).\nThese rules will be sent to the user alongside their purchased credentials.\n\nSend `clear` to remove rules, or `cancel` to go back.", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_edit_rules)
        return

    elif data.startswith("editdeltime:"):
        pid = data.split(":")[1]
        conv_states[chat_id] = {'pid': pid}
        msg = bot.send_message(chat_id, "⏱️ **Edit Delivery Time**\n\nPlease send the expected delivery time for this product (e.g., 'Instant', '24-48 Hours', 'Same Day', etc.):\n\nSend `cancel` to go back.", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_edit_delivery_time)
        return

    elif data.startswith("set_del_proc:"):
        parts = data.split(":")
        proc = parts[1]
        pid = parts[2]
        db = load_db()
        p = db['products'].get(pid)
        if p:
            p['delivery_process'] = proc
            save_db(db)
            bot.answer_callback_query(call.id, f"Delivery process set to {'Manual' if proc == 'manual' else 'Automatic'}!", show_alert=False)
            bot.edit_message_text(_product_detail_text(pid, p), chat_id, call.message.message_id, reply_markup=_edit_product_markup(pid), parse_mode="Markdown")
        else:
            bot.answer_callback_query(call.id, "Error: Product not found.", show_alert=True)
        return

    elif data.startswith("editdesc:"):
        pid = data.split(":")[1]
        conv_states[chat_id] = {'pid': pid}
        msg = bot.send_message(chat_id, "📝 **Edit Description**\n\nPlease send the new description for this product (Markdown compatible):", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_edit_desc)
        return

    elif data.startswith("edit_prod_cat:"):
        pid = data.split(":")[1]
        db = load_db()
        markup = InlineKeyboardMarkup(row_width=1)
        for cid, cdata in db.get('categories', {}).items():
            markup.add(InlineKeyboardButton(f"📁 {cdata['name']}", callback_data=f"set_prod_cat:{pid}:{cid}"))
        markup.add(InlineKeyboardButton("❌ Remove from Category", callback_data=f"set_prod_cat:{pid}:none"))
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"ep_menu:{pid}"))
        bot.edit_message_text("📁 **Select a Category** for this product:", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("set_prod_cat:"):
        parts = data.split(":")
        pid = parts[1]
        cid = parts[2]
        db = load_db()
        p = db['products'].get(pid)
        if p:
            if cid == "none":
                p.pop('category_id', None)
                p.pop('cat_priority', None)
            else:
                p['category_id'] = cid
            save_db(db)
            bot.answer_callback_query(call.id, "Category updated!", show_alert=True)
            bot.edit_message_text(_product_detail_text(pid, p, db), chat_id, call.message.message_id, reply_markup=_product_detail_markup(pid, p), parse_mode="Markdown")
        else:
            bot.answer_callback_query(call.id, "Product not found!", show_alert=True)
        return

    # BACK TO CFG PRODUCT LIST
    elif data == "back_cfg_list":
        markup = InlineKeyboardMarkup(row_width=1)
        for pid, p in sorted(db['products'].items(), key=lambda x: str(x[1].get('name', '')).lower()):
            markup.add(InlineKeyboardButton(f"⚙️ Configure {p['name']}", callback_data=f"cfg_{pid}"))
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="mp_menu"))
        bot.edit_message_text("Select a product to manage its variants:", chat_id, call.message.message_id, reply_markup=markup)
        return

    # BACK TO STOCK PRODUCT LIST (now unused - stock is inside prod_detail)
    elif data == "back_stock_list":
        _send_manage_products(chat_id, db, edit_msg_id=call.message.message_id)
        return

    elif data == "list_add_pool":
        markup = InlineKeyboardMarkup(row_width=1)
        for pid, p in sorted(db['products'].items(), key=lambda x: str(x[1].get('name', '')).lower()):
            markup.add(InlineKeyboardButton(f"🧊 Add Pool to {p['name']}", callback_data=f"addpool_{pid}"))
        markup.add(InlineKeyboardButton("---", callback_data="noop"))
        for pid, p in sorted(db['products'].items(), key=lambda x: str(x[1].get('name', '')).lower()):
            markup.add(InlineKeyboardButton(f"✏️ Manage Pools of {p['name']}", callback_data=f"managepools:{pid}"))
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="back_prod_main"))
        bot.edit_message_text("Add a new Stock Pool or manage existing ones:", chat_id, call.message.message_id, reply_markup=markup)

    elif data.startswith("managepools:"):
        pid = data.split(":", 1)[1]
        prod = db['products'].get(pid)
        markup = InlineKeyboardMarkup(row_width=1)
        pools = prod.get('stock_pools', {})
        for pool_id, stock_arr in pools.items():
            markup.add(InlineKeyboardButton(f"🧊 {pool_id} ({len(stock_arr)} Stock)", callback_data=f"editpool:{pid}:{pool_id}"))
        if not pools:
            markup.add(InlineKeyboardButton("(No pools yet)", callback_data="noop"))
        markup.add(InlineKeyboardButton("➕ Add New Pool", callback_data=f"addpool_{pid}"))
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"sp_menu:{pid}"))
        bot.edit_message_text(f"🧊 Pools for {prod['name']}:\nTap a pool to rename or delete it.", chat_id, call.message.message_id, reply_markup=markup)

    elif data.startswith("editpool:"):
        parts = data.split(":", 2)
        pid, pool_id = parts[1], parts[2]
        prod = db['products'].get(pid)
        is_inf = prod.get('infinite_pools', {}).get(pool_id, False)
        inf_text = "🟢 Infinite Stock: ON" if is_inf else "🔴 Infinite Stock: OFF"
        
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("✏️ Rename", callback_data=f"renamepool:{pid}:{pool_id}"),
            InlineKeyboardButton("📝 Edit Stock", callback_data=f"editstockitems:{pid}:{pool_id}"),
            InlineKeyboardButton("🗑️ Delete Pool", callback_data=f"delpool:{pid}:{pool_id}")
        )
        is_pre = prod.get('preorder_pools', {}).get(pool_id, False)
        pre_text = "📦 Pre-Order: ON" if is_pre else "📦 Pre-Order: OFF"
        markup.add(InlineKeyboardButton(inf_text, callback_data=f"toggleinf:{pid}:{pool_id}"))
        markup.add(InlineKeyboardButton(pre_text, callback_data=f"togglepre:{pid}:{pool_id}"))
        markup.add(InlineKeyboardButton("❌ Reset Stock", callback_data=f"clearstock:{pid}:{pool_id}"))
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"managepools:{pid}"))
        stock_count = len(prod.get('stock_pools', {}).get(pool_id, []))
        
        stock_disp = "Unlimited" if is_inf and stock_count > 0 else f"{stock_count} items"
        bot.edit_message_text(f"Pool: {pool_id}\nStock: {stock_disp}\n\nWhat do you want to do?", chat_id, call.message.message_id, reply_markup=markup)

    elif data.startswith("toggleinf:"):
        parts = data.split(":", 2)
        pid, pool_id = parts[1], parts[2]
        prod = db['products'].get(pid)
        if prod:
            if 'infinite_pools' not in prod:
                prod['infinite_pools'] = {}
            current = prod['infinite_pools'].get(pool_id, False)
            prod['infinite_pools'][pool_id] = not current
            save_db(db)
            
            is_inf = prod['infinite_pools'][pool_id]
            inf_text = "🟢 Infinite Stock: ON" if is_inf else "🔴 Infinite Stock: OFF"
            
            markup = InlineKeyboardMarkup(row_width=2)
            markup.add(
                InlineKeyboardButton("✏️ Rename", callback_data=f"renamepool:{pid}:{pool_id}"),
                InlineKeyboardButton("📝 Edit Stock", callback_data=f"editstockitems:{pid}:{pool_id}"),
                InlineKeyboardButton("🗑️ Delete Pool", callback_data=f"delpool:{pid}:{pool_id}")
            )
            markup.add(InlineKeyboardButton(inf_text, callback_data=f"toggleinf:{pid}:{pool_id}"))
            markup.add(InlineKeyboardButton("❌ Reset Stock", callback_data=f"clearstock:{pid}:{pool_id}"))
            markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"managepools:{pid}"))
            
            stock_count = len(prod.get('stock_pools', {}).get(pool_id, []))
            stock_disp = "Unlimited" if is_inf and stock_count > 0 else f"{stock_count} items"
            bot.edit_message_text(f"Pool: {pool_id}\nStock: {stock_disp}\n\nWhat do you want to do?", chat_id, call.message.message_id, reply_markup=markup)
        return


    elif data.startswith("togglepre:"):
        parts = data.split(":", 2)
        pid, pool_id = parts[1], parts[2]
        prod = db['products'].get(pid)
        if prod:
            if 'preorder_pools' not in prod:
                prod['preorder_pools'] = {}
            current = prod['preorder_pools'].get(pool_id, False)
            prod['preorder_pools'][pool_id] = not current
            save_db(db)
            
            # Call editpool again to refresh
            call.data = f"editpool:{pid}:{pool_id}"
            return handle_callbacks(call)
        return
    
    elif data.startswith("autodeliver:"):
        parts = data.split(":", 2)
        p_id, pool_id = parts[1], parts[2]
        db = load_db()
        pending = [s for s in db.get('sales', []) if s.get('pool_id') == pool_id and s.get('status') == 'Pre-Order']
        pool_stock = db.get('products', {}).get(p_id, {}).get('stock_pools', {}).get(pool_id, [])
          
        delivered_count = 0
        from manager import STORE_BOT_TOKEN
        target_bot = telebot.TeleBot(STORE_BOT_TOKEN)
        kb = build_store_reply_keyboard()

        for sale in pending:
            if len(pool_stock) > 0:
                cred = pool_stock.pop(0)
                sale['credentials'] = cred
                sale['status'] = "Pending" if db.get('products', {}).get(p_id, {}).get('delivery_process', 'auto') == 'manual' else "Delivered"
                delivered_count += 1
                  
                # Send delivery message directly to customer via Store Bot
                try:
                    user_id = sale.get('user_id')
                    product_name = sale.get('product_name', 'Product')
                    variant_name = sale.get('variant_name', '')
                    sale_id = sale.get('sale_id', '')

                    prod_obj = db.get('products', {}).get(p_id, {})
                    prod_rules = prod_obj.get('pool_rules', {}).get(pool_id, '').strip()
                    if not prod_rules:
                        prod_rules = prod_obj.get('rules', '').strip()
                    rules_text = f"\n━━━━━━━━━━━━━━━━━━━━━\n📜 *PRODUCT RULES*\n─────────────────────\n{prod_rules}\n" if prod_rules else ""

                    delivery_msg = (
                        f"📦 *PRE-ORDER FULFILLED!* 📦\n"
                        f"━━━━━━━━━━━━━━━━━━━━━\n"
                        f"Your pre-order for *{product_name}* ({variant_name}) is ready and delivered!\n\n"
                        f"🔑 *DELIVERED CREDENTIALS*\n"
                        f"─────────────────────\n"
                        f"`{cred}`\n"
                        f"{rules_text}"
                        f"━━━━━━━━━━━━━━━━━━━━━\n"
                        f"💡 *Verification Code (OTP)*\n"
                        f"If your login requires a verification code (OTP), click the button below to message support immediately.\n\n"
                        f"🙏 *Thank you for your patience!*"
                    )
                    
                    support_markup = InlineKeyboardMarkup()
                    if sale_id:
                        support_markup.row(InlineKeyboardButton("💬 Contact Support", callback_data=f"support:{sale_id}"))

                    # Send to customer via Store Bot
                    safe_send_store_message(target_bot, int(user_id), delivery_msg, reply_markup=support_markup if sale_id else kb)
                except Exception as e:
                    print(f"Error delivering pre-order to {sale.get('user_id')}: {e}")
                    
        save_db(db)
        bot.edit_message_text(f"✅ Auto-delivered {delivered_count} pre-order(s) from pool `{pool_id}` directly to customer(s) via Store Bot!", chat_id, call.message.message_id)
        return
    elif data.startswith("clearstock:"):
        parts = data.split(":", 2)
        pid, pool_id = parts[1], parts[2]
        prod = db['products'].get(pid)
        if prod and pool_id in prod.get('stock_pools', {}):
            prod['stock_pools'][pool_id] = []
            save_db(db)
            bot.answer_callback_query(call.id, "Stock cleared to 0 successfully!", show_alert=True)
            
            is_inf = prod.get('infinite_pools', {}).get(pool_id, False)
            inf_text = "🟢 Infinite Stock: ON" if is_inf else "🔴 Infinite Stock: OFF"
            
            markup = InlineKeyboardMarkup(row_width=2)
            markup.add(
                InlineKeyboardButton("✏️ Rename", callback_data=f"renamepool:{pid}:{pool_id}"),
                InlineKeyboardButton("📝 Edit Stock", callback_data=f"editstockitems:{pid}:{pool_id}"),
                InlineKeyboardButton("🗑️ Delete Pool", callback_data=f"delpool:{pid}:{pool_id}")
            )
            markup.add(InlineKeyboardButton(inf_text, callback_data=f"toggleinf:{pid}:{pool_id}"))
            markup.add(InlineKeyboardButton("❌ Reset Stock", callback_data=f"clearstock:{pid}:{pool_id}"))
            markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"managepools:{pid}"))
            bot.edit_message_text(f"Pool: {pool_id}\nStock: 0 items\n\nWhat do you want to do?", chat_id, call.message.message_id, reply_markup=markup)
        return

    elif data.startswith("renamepool:"):
        parts = data.split(":", 2)
        pid, pool_id = parts[1], parts[2]
        conv_states[chat_id] = {'pid': pid, 'old_pool_id': pool_id}
        msg = bot.send_message(chat_id, f"Send the new name for pool `{pool_id}`:", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_rename_pool)

    elif data.startswith("delpool:"):
        parts = data.split(":", 2)
        pid, pool_id = parts[1], parts[2]
        db['products'][pid]['stock_pools'].pop(pool_id, None)
        save_db(db)
        bot.answer_callback_query(call.id, f"Pool deleted!", show_alert=True)
        # Refresh pool list for this product
        prod = db['products'].get(pid)
        pools = prod.get('stock_pools', {})
        markup = InlineKeyboardMarkup(row_width=1)
        for p_id2, stock_arr in pools.items():
            markup.add(InlineKeyboardButton(f"🧊 {p_id2} ({len(stock_arr)} Stock)", callback_data=f"editpool:{pid}:{p_id2}"))
        if not pools:
            markup.add(InlineKeyboardButton("(No pools yet)", callback_data="noop"))
        markup.add(InlineKeyboardButton("➕ Add New Pool", callback_data=f"addpool_{pid}"))
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"sp_menu:{pid}"))
        bot.edit_message_text(f"🧊 Pools for {prod['name']}:\nPool deleted successfully!", chat_id, call.message.message_id, reply_markup=markup)

    elif data.startswith("editstockitems:"):
        parts = data.split(":", 2)
        pid, pool_id = parts[1], parts[2]
        prod = db['products'].get(pid)
        stock_list = prod.get('stock_pools', {}).get(pool_id, [])
        
        # Format current stock for editing
        current_text = "\n\n".join(stock_list)
        if not current_text:
            current_text = "(Pool is currently empty)"
            
        conv_states[chat_id] = {'pid': pid, 'pool_id': pool_id}
        
        if len(current_text) > 3500:
            import io
            doc = io.BytesIO(current_text.encode('utf-8'))
            doc.name = f"{pool_id}_stock.txt"
            bot.send_document(chat_id, doc, caption="Current Stock List (Too long to display)")
            msg_text = (
                f"📝 *Edit Stock: {pool_id}*\n\n"
                f"⚠️ The current stock list is too long so it was sent as a `.txt` file above.\n"
                f"Download it, edit your changes, and **UPLOAD the modified `.txt` file** back here (or paste it if it's short)."
            )
        else:
            msg_text = (
                f"📝 *Edit Stock: {pool_id}*\n\n"
                f"Here is the current stock. Copy it, make your changes, and send the **ENTIRE** updated list back to me (you can also upload a `.txt` file).\n\n"
                f"Use double newlines (`\\n\\n`) to separate items.\n\n"
                f"```\n{current_text}\n```"
            )
            
        msg = bot.send_message(chat_id, msg_text, parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_save_edited_stock)
        return

    elif data.startswith("addpool_"):
        pid = data.split("_", 1)[1]
        conv_states[chat_id] = {'pid': pid}
        msg = bot.send_message(chat_id, "Send a short ID for the new Stock Pool (e.g. `private_accounts`):", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_pool_id)

    # CATEGORY MGT
    elif data == "cat_mgt":
        markup = InlineKeyboardMarkup(row_width=1)
        for cid, cdata in db.get('categories', {}).items():
            markup.add(InlineKeyboardButton(f"📁 {cdata['name']}", callback_data=f"cat_detail:{cid}"))
        markup.add(InlineKeyboardButton("➕ Add Category", callback_data="add_cat"))
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="mp_menu"))
        bot.edit_message_text("📂 **Manage Categories**\n\nSelect a category to edit/delete, or add a new one:", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return
        
    elif data.startswith("cat_detail:"):
        cid = data.split(":", 1)[1]
        cdata = db.get('categories', {}).get(cid)
        if not cdata: return bot.answer_callback_query(call.id, "Category not found!")
        
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("✏️ Rename", callback_data=f"edit_cat:{cid}"),
            InlineKeyboardButton("🗑️ Delete", callback_data=f"del_cat:{cid}")
        )
        markup.add(InlineKeyboardButton(f"🔢 Set Priority ({cdata.get('priority', 999999)})", callback_data=f"set_cat_pri:detail:{cid}"))
        markup.add(InlineKeyboardButton("📦 Manage Products", callback_data=f"cat_prods:{cid}"))
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="cat_mgt"))
        
        p_count = sum(1 for p in db.get('products', {}).values() if p.get('category_id') == cid)
        bot.edit_message_text(f"📁 **Category:** `{cdata['name']}`\n\n📦 Products in this category: {p_count}", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("cat_prods:"):
        cid = data.split(":", 1)[1]
        cdata = db.get('categories', {}).get(cid)
        if not cdata: return bot.answer_callback_query(call.id, "Category not found!")
        
        # Initialize selection state with products currently in this category
        selected_pids = [pid for pid, p in db.get('products', {}).items() if p.get('category_id') == cid]
        conv_states[chat_id] = {'type': 'cat_prods', 'cid': cid, 'selected_pids': selected_pids}
        
        markup = InlineKeyboardMarkup(row_width=1)
        for pid, p in sorted(db.get('products', {}).items(), key=lambda x: str(x[1].get('name', '')).lower()):
            check = "✅" if pid in selected_pids else "⬜"
            markup.add(InlineKeyboardButton(f"{check} {p['name']}", callback_data=f"togg_prod:{pid}"))
            
        markup.add(InlineKeyboardButton("💾 Save", callback_data="save_cat_prods"))
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"cat_detail:{cid}"))
        
        bot.edit_message_text(f"📦 **Manage Products for `{cdata['name']}`**\n\nClick to select/deselect products, then click **Save Changes**:", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return
        
    elif data.startswith("togg_prod:"):
        pid = data.split(":", 1)[1]
        state = conv_states.get(chat_id)
        if not state or state.get('type') != 'cat_prods':
            return bot.answer_callback_query(call.id, "Session expired.", show_alert=True)
            
        selected_pids = state['selected_pids']
        if pid in selected_pids:
            selected_pids.remove(pid)
        else:
            selected_pids.append(pid)
            
        markup = InlineKeyboardMarkup(row_width=1)
        for p_id, p in db.get('products', {}).items():
            check = "✅" if p_id in selected_pids else "⬜"
            markup.add(InlineKeyboardButton(f"{check} {p['name']}", callback_data=f"togg_prod:{p_id}"))
            
        markup.add(InlineKeyboardButton("💾 Save", callback_data="save_cat_prods"))
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"cat_detail:{state['cid']}"))
        
        # Update the message markup inline
        bot.edit_message_reply_markup(chat_id, call.message.message_id, reply_markup=markup)
        return
        
    elif data == "save_cat_prods":
        state = conv_states.get(chat_id)
        if not state or state.get('type') != 'cat_prods':
            return bot.answer_callback_query(call.id, "Session expired.", show_alert=True)
            
        cid = state['cid']
        selected_pids = state['selected_pids']
        
        # Update category assignment for all products
        for p_id, p in db.get('products', {}).items():
            if p_id in selected_pids:
                p['category_id'] = cid
            elif p.get('category_id') == cid:
                p['category_id'] = None
                
        save_db(db)
        conv_states.pop(chat_id, None)
        bot.answer_callback_query(call.id, "✅ Products updated successfully!")
        
        cdata = db.get('categories', {}).get(cid)
        if not cdata: return
        
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("✏️ Rename", callback_data=f"edit_cat:{cid}"),
            InlineKeyboardButton("🗑️ Delete", callback_data=f"del_cat:{cid}")
        )
        markup.add(InlineKeyboardButton("📦 Products", callback_data=f"cat_prods:{cid}"))
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="cat_mgt"))
        
        p_count = sum(1 for p in db.get('products', {}).values() if p.get('category_id') == cid)
        bot.edit_message_text(f"📁 **Category:** `{cdata['name']}`\n\n📦 Products in this category: {p_count}", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("set_cat_pri:"):
        parts = data.split(":")
        source = parts[1]
        cid = parts[2]
        db = load_db()
        cdata = db.get('categories', {}).get(cid)
        if not cdata:
            return bot.answer_callback_query(call.id, "Category not found.")
        current_pri = cdata.get('priority', 'Default (999999)')
        
        prompt_text = (
            f"📂 **Set Category Priority**\n"
            f"───────────────────────────\n"
            f"📁 **Category:** `{cdata['name']}`\n"
            f"🔢 **Current Priority:** `{current_pri}`\n"
            f"───────────────────────────\n"
            f"✍️ *Please send the new priority number (1 is highest, goes at top):*"
        )
        back_target = "manage_cat_pri" if source == "sort" else f"cat_detail:{cid}"
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data=f"cancel_pri_edit:{back_target}"))
        try:
            msg = bot.edit_message_text(prompt_text, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        except Exception:
            msg = bot.send_message(chat_id, prompt_text, reply_markup=markup, parse_mode="Markdown")
            
        conv_states[chat_id] = {'cid': cid, 'source': source, 'prompt_msg_id': msg.message_id}
        bot.register_next_step_handler(msg, step_set_cat_pri)
        return

    elif data == "add_cat":
        msg = bot.send_message(chat_id, "➕ **Add Category**\n\nEnter the name for the new category (e.g. `Streaming`):", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_add_cat)
        return
        
    elif data.startswith("edit_cat:"):
        cid = data.split(":", 1)[1]
        conv_states[chat_id] = {'cid': cid}
        msg = bot.send_message(chat_id, "✏️ **Rename Category**\n\nEnter the new name:", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_edit_cat)
        return
        
    elif data.startswith("del_cat:"):
        cid = data.split(":", 1)[1]
        cname = db.get('categories', {}).get(cid, {}).get('name', 'Unknown')
        
        if cid in db.get('categories', {}):
            del db['categories'][cid]
            for p in db.get('products', {}).values():
                if p.get('category_id') == cid:
                    p['category_id'] = None
            save_db(db)
            bot.answer_callback_query(call.id, f"Category '{cname}' deleted!")
            
            markup = InlineKeyboardMarkup(row_width=1)
            for c_id, cdata in db.get('categories', {}).items():
                markup.add(InlineKeyboardButton(f"📁 {cdata['name']}", callback_data=f"cat_detail:{c_id}"))
            markup.add(InlineKeyboardButton("➕ Add Category", callback_data="add_cat"))
            markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="mp_menu"))
            bot.edit_message_text("📂 **Manage Categories**\n\nSelect a category to edit/delete, or add a new one:", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    # PRODUCT MGT
    if data == "add_prod":
        conv_states[chat_id] = {'step': 'wizard_names'}
        msg = bot.send_message(chat_id, "🛍️ **ADD NEW PRODUCT**\n───────────────────────────\nSend the product name(s).\n*(Bulk: comma-separated or separate lines, e.g. Netflix, Spotify)*\n\nType `cancel` to abort.", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_wizard_start)
        return
        
    elif data == "list_cfg_prod":
        markup = InlineKeyboardMarkup(row_width=1)
        for pid, p in sorted(db['products'].items(), key=lambda x: str(x[1].get('name', '')).lower()):
            markup.add(InlineKeyboardButton(f"⚙️ Configure {p['name']}", callback_data=f"cfg_{pid}"))
        markup.add(InlineKeyboardButton("🔙 Back to Menu", callback_data="back_prod_main"))
        
        text_msg = (
            "⚙️ **CONFIGURE PRODUCT VARIANTS**\n"
            "───────────────────────────\n"
            "Select a product below to manage and configure its variants:\n"
        )
        bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return
        
    elif data.startswith("cfg_"):
        pid = data.split("_", 1)[1]
        prod = db['products'].get(pid)
        markup = InlineKeyboardMarkup(row_width=1)
        markup.add(
            InlineKeyboardButton("➕ Add Variant", callback_data=f"addvar_{pid}")
        )
        for vid, v in prod.get('variants', {}).items():
            markup.add(InlineKeyboardButton(f"✏️ Edit: {v['name']} (₹{v['price']})", callback_data=f"editvar:{pid}:{vid}"))
        markup.add(InlineKeyboardButton("🔙 Back", callback_data=f"ep_menu:{pid}"))
        
        text_msg = (
            f"⚙️ **MANAGE VARIANTS: {prod['name']}**\n"
            "───────────────────────────\n"
            "Select a variant below to configure its price, duration, and pool, or click the button below to add a new variant:\n"
        )
        bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("addvar_"):
        pid = data.split("_", 1)[1]
        conv_states[chat_id] = {'pid': pid}
        instructions = (
            "➕ **ADD PRODUCT VARIANTS**\n"
            "───────────────────────────\n"
            "👉 **To Add Single Variant:**\n"
            "Just send the name (e.g. `1 Month`). You will be prompted for price and pool next.\n\n"
            "👉 **To Add Bulk Variants:**\n"
            "Send the list using pipe (`|`) or comma (`,`) delimiters (one per line):\n"
            "📝 *Format:* `Name | Price | Pool Name | Duration`\n\n"
            "💡 *Examples (Recommended - Pipe delimiter):*\n"
            "`1 Month | 299 | Premium | 1`\n"
            "`Lifetime | 1,499 | Ultra | 0`\n\n"
            "💡 *Examples (Comma delimiter):*\n"
            "`1 Month, 299, Premium, 1`\n"
            "`Lifetime, 1,499, Ultra, 0`\n\n"
            "*Type 'cancel' to abort.*"
        )
        msg = bot.send_message(chat_id, instructions, parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_var_name)
        return

    elif data.startswith("editvar:"):
        parts = data.split(":", 2)
        pid = parts[1]
        vid = parts[2]
        prod = db['products'].get(pid)
        v = prod.get('variants', {}).get(vid, {})
        
        markup = InlineKeyboardMarkup(row_width=2)
        markup.row(
            InlineKeyboardButton("✏️ Name", callback_data=f"editvname:{pid}:{vid}"),
            InlineKeyboardButton("💰 Price", callback_data=f"editvprice:{pid}:{vid}")
        )
        markup.row(
            InlineKeyboardButton("📅 Duration", callback_data=f"editvdur:{pid}:{vid}"),
            InlineKeyboardButton("🔗 Stock Pool", callback_data=f"editvpool:{pid}:{vid}")
        )
        markup.row(InlineKeyboardButton("🗑 Delete Variant", callback_data=f"delvar:{pid}:{vid}"))
        markup.row(InlineKeyboardButton("🔙 Back to Variants", callback_data=f"cfg_{pid}"))
        
        text_msg = (
            f"✏️ **EDIT VARIANT CARD**\n"
            "───────────────────────────\n"
            f"📦 **Product**: `{prod['name']}`\n"
            f"🏷️ **Variant**: `{v.get('name', 'Unknown')}`\n"
            f"💰 **Price**: `₹{v.get('price', 0)}`\n"
            f"📅 **Duration**: `{v.get('duration', 0)} month(s)` (0 = lifetime)\n"
            f"🧊 **Stock Pool**: `{v.get('pool_id', 'None')}`\n"
            "───────────────────────────\n"
            "👇 **Select what you want to edit for this variant:**"
        )
        bot.edit_message_text(text_msg, chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("editvpool:"):
        parts = data.split(":")
        pid, vid = parts[1], parts[2]
        prod = db['products'].get(pid)
        pools = prod.get('stock_pools', {}).keys()
        
        if not pools:
            bot.answer_callback_query(call.id, "❌ No pools available for this product. Create one first!", show_alert=True)
            return
            
        markup = InlineKeyboardMarkup(row_width=1)
        for pool_id in pools:
            markup.add(InlineKeyboardButton(f"🧊 {pool_id}", callback_data=f"setvpool:{pid}:{vid}:{pool_id}"))
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"editvar:{pid}:{vid}"))
        
        bot.edit_message_text(f"Select the new **Stock Pool** for variant *{prod['variants'][vid]['name']}*:", chat_id, call.message.message_id, reply_markup=markup, parse_mode="Markdown")
        return

    elif data.startswith("setvpool:"):
        parts = data.split(":")
        pid, vid, pool_id = parts[1], parts[2], parts[3]
        db = load_db()
        prod = db['products'].get(pid)
        if prod and vid in prod.get('variants', {}):
            prod['variants'][vid]['pool_id'] = pool_id
            save_db(db)
            bot.answer_callback_query(call.id, f"✅ Stock Pool changed to {pool_id}!")
            
            # Go back to variant details
            markup = InlineKeyboardMarkup(row_width=2)
            markup.add(
                InlineKeyboardButton("✏️ Change Name", callback_data=f"editvname:{pid}:{vid}"),
                InlineKeyboardButton("💰 Change Price", callback_data=f"editvprice:{pid}:{vid}"),
                InlineKeyboardButton("📅 Edit Duration", callback_data=f"editvdur:{pid}:{vid}"),
                InlineKeyboardButton("🔗 Change Stock Pool", callback_data=f"editvpool:{pid}:{vid}"),
                InlineKeyboardButton("🗑 Delete Variant", callback_data=f"delvar:{pid}:{vid}")
            )
            markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"cfg_{pid}"))
            bot.edit_message_text("What do you want to edit for this variant?", chat_id, call.message.message_id, reply_markup=markup)
        return

    elif data.startswith("editvdur:"):
        parts = data.split(":", 2)
        pid, vid = parts[1], parts[2]
        conv_states[chat_id] = {'pid': pid, 'vid': vid}
        msg = bot.send_message(chat_id, "📅 **Edit Duration**\n\nEnter the new duration in **months** (0 for lifetime/none):", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_edit_vduration)
        return

    elif data.startswith("editvname:"):
        parts = data.split(":", 2)
        conv_states[chat_id] = {'pid': parts[1], 'vid': parts[2]}
        msg = bot.send_message(chat_id, "Send the new **Variant Name**:", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_edit_vname)
        
    elif data.startswith("editvprice:"):
        parts = data.split(":", 2)
        conv_states[chat_id] = {'pid': parts[1], 'vid': parts[2]}
        msg = bot.send_message(chat_id, "Send the new **Price (₹)**:", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_edit_vprice)

# editvsub removed
        
    elif data.startswith("delvar:"):
        parts = data.split(":", 2)
        pid = parts[1]
        vid = parts[2]
        db = load_db()
        if pid in db['products'] and vid in db['products'][pid]['variants']:
            del db['products'][pid]['variants'][vid]
            save_db(db)
            bot.answer_callback_query(call.id, "Variant deleted!")
            prod = db['products'].get(pid)
            markup = InlineKeyboardMarkup(row_width=1)
            markup.add(InlineKeyboardButton("➕ Add Variant", callback_data=f"addvar_{pid}"))
            for v_id2, v2 in prod.get('variants', {}).items():
                markup.add(InlineKeyboardButton(f"✏️ Edit: {v2['name']} (₹{v2['price']})", callback_data=f"editvar:{pid}:{v_id2}"))
            markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="back_cfg_list"))
            bot.edit_message_text(f"✅ Variant deleted!\n\nConfiguring `{prod['name']}`:", chat_id, call.message.message_id, reply_markup=markup, parse_mode='Markdown')
        else:
            bot.answer_callback_query(call.id, "Variant not found!", show_alert=True)
        return

# --- WIZARD-BASED STEP-BY-STEP PRODUCT CREATION WIZARD ---

def step_wizard_start(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.clear_step_handler_by_chat_id(message.chat.id)
        conv_states.pop(message.chat.id, None)
        bot.send_message(message.chat.id, "❌ Product creation cancelled.", reply_markup=admin_menu())
        return
        
    prods = []
    # Split by newline or comma
    for part in message.text.replace("\n", ",").split(","):
        part = part.strip()
        if part: prods.append(part)
        
    if not prods:
        msg = bot.send_message(message.chat.id, "❌ No products found. Send product name(s):")
        bot.register_next_step_handler(msg, step_wizard_start)
        return
        
    chat_id = message.chat.id
    conv_states[chat_id] = {
        'pending_prods': prods,
        'current_index': 0,
        'draft': {
            'name': prods[0],
            'description': '',
            'category_id': '',
            'rules': '',
            'stock_pools': {},
            'variants': {}
        }
    }
    
    wiz_prompt_pool(chat_id)

# --- STEP 1: POOLS ---
def wiz_prompt_pool(chat_id, status_msg=""):
    state = conv_states.get(chat_id)
    if not state: return
    draft = state['draft']
    
    pools = list(draft['stock_pools'].keys())
    header = (
        f"📦 **PRODUCT SETUP: {draft['name'].upper()}**\n"
        f"───────────────────────────\n"
    )
    
    if not pools:
        text = (
            f"{header}"
            f"📥 **Step 1: Define Stock Pool**\n"
            f"Send the name of a new Stock Pool (e.g. `Premium`):"
        )
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("❌ Cancel Setup", callback_data="wiz_cancel"))
    else:
        pools_str = "\n".join(f"  • `{p}`" for p in pools)
        text = (
            f"{header}"
            f"📂 **Active Pools:**\n{pools_str}\n\n"
            f"👇 Send another pool name to add it, or proceed:"
        )
        markup = InlineKeyboardMarkup()
        markup.row(
            InlineKeyboardButton("➡️ Proceed to Description", callback_data="wiz_next_desc")
        )
        markup.row(
            InlineKeyboardButton("❌ Cancel Setup", callback_data="wiz_cancel")
        )
        
    if status_msg:
        text = f"{status_msg}\n\n{text}"
        
    msg = bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")
    bot.register_next_step_handler(msg, step_wizard_pool)

def step_wizard_pool(message):
    if is_menu_button_click(message.text): return handle_menu(message)
    chat_id = message.chat.id
    state = conv_states.get(chat_id)
    if not state: return
    
    if message.text.lower() == 'cancel':
        conv_states.pop(chat_id, None)
        bot.send_message(chat_id, "❌ Product creation cancelled.", reply_markup=admin_menu())
        return
        
    pool_id = message.text.strip()
    if not pool_id:
        wiz_prompt_pool(chat_id)
        return
        
    state['draft']['stock_pools'][pool_id] = []
    wiz_prompt_pool(chat_id, status_msg=f"🧊 *Pool '{pool_id}' added successfully!*")

# --- STEP 2: DESCRIPTION ---
def wiz_prompt_desc(chat_id, status_msg=""):
    state = conv_states.get(chat_id)
    if not state: return
    draft = state['draft']
    
    text = (
        f"📦 **PRODUCT SETUP: {draft['name'].upper()}**\n"
        f"───────────────────────────\n"
        f"📝 **Step 2: Product Description**\n"
        f"Send the description text below:"
    )
    if status_msg:
        text = f"{status_msg}\n\n{text}"
        
    markup = InlineKeyboardMarkup()
    markup.row(
        InlineKeyboardButton("⏭️ Skip & Continue", callback_data="wiz_skip_desc"),
        InlineKeyboardButton("❌ Cancel Setup", callback_data="wiz_cancel")
    )
    
    msg = bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")
    bot.register_next_step_handler(msg, step_wizard_desc)

def step_wizard_desc(message):
    if is_menu_button_click(message.text): return handle_menu(message)
    chat_id = message.chat.id
    state = conv_states.get(chat_id)
    if not state: return
    
    if message.text.lower() == 'cancel':
        conv_states.pop(chat_id, None)
        bot.send_message(chat_id, "❌ Product creation cancelled.", reply_markup=admin_menu())
        return
        
    desc = message.text.strip()
    state['draft']['description'] = desc
    wiz_prompt_var(chat_id, status_msg="📝 *Description saved successfully!*")

# --- STEP 3: VARIANTS ---
def wiz_prompt_var(chat_id, status_msg=""):
    state = conv_states.get(chat_id)
    if not state: return
    draft = state['draft']
    
    if not draft['stock_pools']:
        bot.send_message(chat_id, "❌ No pools defined. Returning to Step 1.")
        wiz_prompt_pool(chat_id)
        return
        
    wiz_show_variants_summary(chat_id, status_msg=status_msg)

def wiz_show_variants_summary(chat_id, status_msg=""):
    state = conv_states.get(chat_id)
    if not state: return
    draft = state['draft']
    
    variants = list(draft['variants'].values())
    header = (
        f"📦 **PRODUCT SETUP: {draft['name'].upper()}**\n"
        f"───────────────────────────\n"
    )
    
    if not variants:
        text = (
            f"{header}"
            f"💎 **Step 3: Define Variant**\n"
            f"Click the button below to add your first variant:"
        )
        markup = InlineKeyboardMarkup()
        markup.row(
            InlineKeyboardButton("➕ Add Variant", callback_data="wiz_add_var_prompt")
        )
        markup.row(
            InlineKeyboardButton("❌ Cancel Setup", callback_data="wiz_cancel")
        )
    else:
        var_list = "\n".join(f"  • *{v.get('name', 'Unnamed')}*: ₹{v.get('price', 0)} ({v.get('duration', 0)}m) ➔ Pool: `{v.get('pool_id', 'None')}`" for v in variants)
        text = (
            f"{header}"
            f"✨ **Configured Variants:**\n{var_list}\n\n"
            f"👇 Click below to add another variant, or proceed:"
        )
        markup = InlineKeyboardMarkup()
        markup.row(
            InlineKeyboardButton("➕ Add Additional Variant", callback_data="wiz_add_var_prompt")
        )
        markup.row(
            InlineKeyboardButton("➡️ Proceed to Rules", callback_data="wiz_next_rules")
        )
        markup.row(
            InlineKeyboardButton("❌ Cancel Setup", callback_data="wiz_cancel")
        )
        
    if status_msg:
        text = f"{status_msg}\n\n{text}"
        
    bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

def wiz_prompt_add_var_name(chat_id):
    text = (
        "💎 **ADD VARIANT**\n"
        "───────────────────────────\n"
        "Send the Variant name.\n"
        "*(Bulk: Send multiple names on separate lines)*\n\n"
        "💡 *Example:*\n"
        "`1 Month`\n"
        "`3 Months`"
    )
    msg = bot.send_message(chat_id, text, parse_mode="Markdown")
    bot.register_next_step_handler(msg, step_wizard_var_name)

def step_wizard_var_name(message):
    if is_menu_button_click(message.text): return handle_menu(message)
    chat_id = message.chat.id
    state = conv_states.get(chat_id)
    if not state: return
    
    if message.text.lower() == 'cancel':
        wiz_show_variants_summary(chat_id)
        return
        
    names = [n.strip() for n in message.text.replace(",", "\n").split("\n") if n.strip()]
    if not names:
        wiz_prompt_add_var_name(chat_id)
        return
        
    state['pending_vars'] = names
    state['current_var_idx'] = 0
    state['draft_var'] = {'name': names[0]}
    
    msg = bot.send_message(chat_id, f"💰 **ADD VARIANT: {names[0].upper()}**\n───────────────────────────\nEnter the Price in INR for variant `{names[0]}`:", parse_mode="Markdown")
    bot.register_next_step_handler(msg, step_wizard_var_price)

def step_wizard_var_price(message):
    if is_menu_button_click(message.text): return handle_menu(message)
    chat_id = message.chat.id
    state = conv_states.get(chat_id)
    if not state: return
    
    if message.text.lower() == 'cancel':
        state.pop('pending_vars', None)
        state.pop('current_var_idx', None)
        state.pop('draft_var', None)
        wiz_show_variants_summary(chat_id)
        return
        
    try:
        price = float(message.text.strip())
        if price < 0: raise ValueError
        state['draft_var']['price'] = price
        var_name = state['draft_var']['name']
        msg = bot.send_message(chat_id, f"📅 **ADD VARIANT: {var_name.upper()}**\n───────────────────────────\nEnter variant Duration in months (e.g. `1`, `3` or `0` for lifetime/none):", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_wizard_var_duration)
    except ValueError:
        var_name = state['draft_var']['name']
        msg = bot.send_message(chat_id, f"❌ Price must be a valid number. Enter price again for `{var_name}`:")
        bot.register_next_step_handler(msg, step_wizard_var_price)

def step_wizard_var_duration(message):
    if is_menu_button_click(message.text): return handle_menu(message)
    chat_id = message.chat.id
    state = conv_states.get(chat_id)
    if not state: return
    
    if message.text.lower() == 'cancel':
        state.pop('pending_vars', None)
        state.pop('current_var_idx', None)
        state.pop('draft_var', None)
        wiz_show_variants_summary(chat_id)
        return
        
    try:
        duration = int(message.text.strip())
        if duration < 0: raise ValueError
        state['draft_var']['duration'] = duration
        
        draft = state['draft']
        pools = list(draft['stock_pools'].keys())
        
        markup = InlineKeyboardMarkup(row_width=1)
        for pool_id in pools:
            markup.add(InlineKeyboardButton(f"🧊 {pool_id}", callback_data=f"wiz_varpoolselect:{pool_id}"))
        markup.add(InlineKeyboardButton("❌ Cancel Setup", callback_data="wiz_var_cancel"))
        
        var_name = state['draft_var']['name']
        bot.send_message(chat_id, f"🧊 **ADD VARIANT: {var_name.upper()}**\n───────────────────────────\nSelect the Stock Pool this variant should withdraw from:", reply_markup=markup)
    except ValueError:
        var_name = state['draft_var']['name']
        msg = bot.send_message(chat_id, f"❌ Duration must be a valid integer. Enter duration again for `{var_name}`:")
        bot.register_next_step_handler(msg, step_wizard_var_duration)

# --- STEP 4: RULES ---
def wiz_prompt_rules(chat_id, status_msg=""):
    state = conv_states.get(chat_id)
    if not state: return
    draft = state['draft']
    
    text = (
        f"📦 **PRODUCT SETUP: {draft['name'].upper()}**\n"
        f"───────────────────────────\n"
        f"📜 **Step 4: Product Rules & Usage**\n"
        f"Send the product rules below (supports multiple lines):"
    )
    if status_msg:
        text = f"{status_msg}\n\n{text}"
        
    markup = InlineKeyboardMarkup()
    markup.row(
        InlineKeyboardButton("⏭️ Skip & Continue", callback_data="wiz_skip_rules"),
        InlineKeyboardButton("❌ Cancel Setup", callback_data="wiz_cancel")
    )
    
    msg = bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")
    bot.register_next_step_handler(msg, step_wizard_rules)

def step_wizard_rules(message):
    if is_menu_button_click(message.text): return handle_menu(message)
    chat_id = message.chat.id
    state = conv_states.get(chat_id)
    if not state: return
    
    if message.text.lower() == 'cancel':
        conv_states.pop(chat_id, None)
        bot.send_message(chat_id, "❌ Product creation cancelled.", reply_markup=admin_menu())
        return
        
    rules = message.text.strip()
    state['draft']['rules'] = rules
    wiz_prompt_delivery_time(chat_id, status_msg="📜 *Rules saved successfully!*")

# --- STEP 4.5: DELIVERY TIME ---
def wiz_prompt_delivery_time(chat_id, status_msg=""):
    state = conv_states.get(chat_id)
    if not state: return
    draft = state['draft']
    
    text = (
        f"📦 **PRODUCT SETUP: {draft['name'].upper()}**\n"
        f"───────────────────────────\n"
        f"⏱️ **Step 5: Delivery Time**\n"
        f"Send the estimated delivery time for this product (e.g., 'Instant', '24-48 Hours', 'Same Day'):\n"
        f"Send `skip` to use the default 'Instant'."
    )
    if status_msg:
        text = f"{status_msg}\n\n{text}"
        
    markup = InlineKeyboardMarkup()
    markup.row(InlineKeyboardButton("❌ Cancel Setup", callback_data="wiz_cancel"))
    
    msg = bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")
    bot.register_next_step_handler(msg, step_wizard_delivery_time)

def step_wizard_delivery_time(message):
    if is_menu_button_click(message.text): return handle_menu(message)
    chat_id = message.chat.id
    state = conv_states.get(chat_id)
    if not state: return
    
    if message.text.lower() == 'cancel':
        conv_states.pop(chat_id, None)
        bot.send_message(chat_id, "❌ Product creation cancelled.", reply_markup=admin_menu())
        return
        
    dt = 'Instant' if message.text.lower() == 'skip' else message.text.strip()
    state['draft']['delivery_time'] = dt
    wiz_prompt_delivery_process(chat_id, status_msg=f"⏱️ *Delivery Time set to {dt}!*")

# --- STEP 4.6: DELIVERY PROCESS ---
def wiz_prompt_delivery_process(chat_id, status_msg=""):
    state = conv_states.get(chat_id)
    if not state: return
    draft = state['draft']
    
    text = (
        f"📦 **PRODUCT SETUP: {draft['name'].upper()}**\n"
        f"───────────────────────────\n"
        f"⚡ **Step 6: Delivery Process**\n"
        f"Select the delivery process for this product:"
    )
    if status_msg:
        text = f"{status_msg}\n\n{text}"
        
    markup = InlineKeyboardMarkup(row_width=2)
    markup.row(
        InlineKeyboardButton("⚙️ Automatic", callback_data="wiz_del_proc:auto"),
        InlineKeyboardButton("🧑‍💻 Manual", callback_data="wiz_del_proc:manual")
    )
    markup.row(InlineKeyboardButton("❌ Cancel Setup", callback_data="wiz_cancel"))
    
    bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

# --- STEP 7: CATEGORY ---
def wiz_prompt_cat(chat_id, status_msg=""):
    state = conv_states.get(chat_id)
    if not state: return
    draft = state['draft']
    
    text = (
        f"📦 **PRODUCT SETUP: {draft['name'].upper()}**\n"
        f"───────────────────────────\n"
        f"📁 **Step 7: Select Category**\n"
        f"Select a product category below:"
    )
    if status_msg:
        text = f"{status_msg}\n\n{text}"
        
    db = load_db()
    markup = InlineKeyboardMarkup(row_width=1)
    for cid, cat in db.get('categories', {}).items():
        markup.add(InlineKeyboardButton(f"📁 {cat['name']}", callback_data=f"wiz_catselect:{cid}"))
    markup.add(InlineKeyboardButton("Uncategorized", callback_data="wiz_catselect:others"))
    markup.add(InlineKeyboardButton("❌ Cancel Setup", callback_data="wiz_cancel"))
    
    bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

def step_add_cat(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    
    cat_name = message.text.strip()
    cid = "cat-" + uuid.uuid4().hex[:6]
    db = load_db()
    if 'categories' not in db: db['categories'] = {}
    db['categories'][cid] = {"name": cat_name}
    save_db(db)
    
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="cat_mgt"))
    bot.send_message(message.chat.id, f"✅ Category `{cat_name}` added successfully!", reply_markup=markup, parse_mode="Markdown")

def step_edit_cat(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    
    state = conv_states.get(message.chat.id)
    if not state or 'cid' not in state: return bot.send_message(message.chat.id, "Session expired.")
    
    cid = state['cid']
    cat_name = message.text.strip()
    db = load_db()
    
    if cid in db.get('categories', {}):
        db['categories'][cid]['name'] = cat_name
        save_db(db)
        
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="cat_mgt"))
        bot.send_message(message.chat.id, f"✅ Category renamed to `{cat_name}`!", reply_markup=markup, parse_mode="Markdown")
    else:
        bot.send_message(message.chat.id, "❌ Error: Category not found.")

# BULK-PARALLEL WIZARD
def step_bulk_parallel_prods(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.clear_step_handler_by_chat_id(message.chat.id)
        conv_states.pop(message.chat.id, None)
        bot.send_message(message.chat.id, "❌ Product creation cancelled.", reply_markup=admin_menu())
        return
        
    prods = []
    # Split by newline or comma
    for part in message.text.replace("\\n", ",").split(","):
        part = part.strip()
        if part: prods.append(part)
        
    if not prods:
        msg = bot.send_message(message.chat.id, "❌ No products found. Send product name(s):")
        bot.register_next_step_handler(msg, step_bulk_parallel_prods)
        return
        
    db = load_db()
    
    for p_name in prods:
        pid = "p-" + uuid.uuid4().hex[:6]
        db['products'][pid] = {
            "name": p_name,
            "stock_pools": {},
            "variants": {},
            "is_active": False  # Deactivated by default until stock is added
        }
        
    save_db(db)
    
    report = "✅ **Products Added Successfully!**\n\n" + "\n".join([f"• {p}" for p in prods])
    report += "\n\n*Note: These products are currently deactivated. They will automatically become live when you add stock to them in the Manage Catalog menu.*"





    
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("🔙 Back to Menu", callback_data="mp_menu"))
    bot.send_message(message.chat.id, report, reply_markup=markup, parse_mode="Markdown")

# step_bulk_parallel_validity removed



# 1.5 Add Stock Pool
def step_pool_id(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    pid = conv_states.get(message.chat.id, {}).get('pid')
    if not pid:
        bot.send_message(message.chat.id, "❌ Session expired. Please try again from the Manage Products menu.")
        return
    pool_id = message.text.strip()
    db = load_db()
    if pid not in db['products']:
        bot.send_message(message.chat.id, f"❌ Product `{pid}` not found in database.", parse_mode="Markdown")
        return
    if 'stock_pools' not in db['products'][pid]:
        db['products'][pid]['stock_pools'] = {}
    
    db['products'][pid]['stock_pools'][pool_id] = []
    save_db(db)
    
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton(f"➕ Configure Variants for {db['products'][pid]['name']}", callback_data=f"cfg_{pid}"))
    markup.add(InlineKeyboardButton(f"🧊 Manage Pools for {db['products'][pid]['name']}", callback_data=f"managepools:{pid}"))
    markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"prod_detail:{pid}"))
    bot.send_message(message.chat.id, f"✅ Stock Pool `{pool_id}` created!\n\nNow you can add stock to it, or create a variant that draws from it.", reply_markup=markup, parse_mode="Markdown")

# 1.6 Rename Stock Pool
def step_rename_pool(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    state = conv_states.get(message.chat.id, {})
    pid = state.get('pid')
    old_pool_id = state.get('old_pool_id')
    new_pool_id = message.text.strip()
    
    if not pid or not old_pool_id:
        bot.send_message(message.chat.id, "❌ Session expired. Please try again.")
        return
    
    db = load_db()
    prod = db['products'].get(pid)
    if not prod or old_pool_id not in prod.get('stock_pools', {}):
        bot.send_message(message.chat.id, "❌ Pool not found.")
        return
    
    if new_pool_id == old_pool_id:
        bot.send_message(message.chat.id, "ℹ️ Name is the same, nothing changed.")
        return
    
    if new_pool_id in prod['stock_pools']:
        bot.send_message(message.chat.id, f"❌ A pool named `{new_pool_id}` already exists!", parse_mode="Markdown")
        return
    
    # Rename: copy data to new key, delete old key
    prod['stock_pools'][new_pool_id] = prod['stock_pools'].pop(old_pool_id)
    
    # Update all variants that were pointing to the old pool_id
    for vid, v in prod.get('variants', {}).items():
        if v.get('pool_id') == old_pool_id:
            v['pool_id'] = new_pool_id
    
    save_db(db)
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton(f"🧊 Manage Pools", callback_data=f"managepools:{pid}"))
    markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"prod_detail:{pid}"))
    bot.send_message(message.chat.id, f"✅ Pool renamed: `{old_pool_id}` → `{new_pool_id}`\nAll linked variants updated.", reply_markup=markup, parse_mode="Markdown")

# 2. Add Variant
def step_var_name(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    
    # Detect Bulk: Multiple lines OR contains 3+ commas
    if "\n" in message.text or message.text.count(",") >= 3:
        return step_bulk_var(message)
        
    vid = "v-" + uuid.uuid4().hex[:6]
    conv_states[message.chat.id]['vid'] = vid
    conv_states[message.chat.id]['vname'] = message.text.strip()
    msg = bot.send_message(message.chat.id, f"Pricing for **{message.text}**:\nSend the **Price** in INR:", parse_mode="Markdown")
    bot.register_next_step_handler(msg, step_var_price)

def step_var_price(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    try:
        price = float(message.text)
        conv_states[message.chat.id]['vprice'] = price
        msg = bot.send_message(message.chat.id, "📅 **Subscription Duration**:\nSend the duration in **months** (e.g. `1`, `3`, `12`). Send `0` if it's not a subscription product:", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_var_duration)
    except ValueError:
        msg = bot.send_message(message.chat.id, "❌ Price must be a number! Send the price again:")
        bot.register_next_step_handler(msg, step_var_price)

def step_var_duration(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    try:
        duration = int(message.text.strip())
        conv_states[message.chat.id]['vduration'] = duration
        state = conv_states[message.chat.id]
        db = load_db()
        pools = db['products'][state['pid']].get('stock_pools', {}).keys()
        
        if len(pools) == 0:
            bot.send_message(message.chat.id, "❌ Error: You must create a Stock Pool for this product first!", parse_mode="Markdown")
            return
            
        pool_str = ", ".join(f"`{p}`" for p in pools)
        msg = bot.send_message(message.chat.id, f"Which Stock Pool should this variant withdraw from?\nAvailable pools: {pool_str}\n\nType the exact ID:", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_var_pool)
    except ValueError:
        msg = bot.send_message(message.chat.id, "❌ Duration must be a whole number (months). Send it again:")
        bot.register_next_step_handler(msg, step_var_duration)

# step_var_sub_months removed


def step_var_pool(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    pool_id = message.text.strip()
    state = conv_states[message.chat.id]
    db = load_db()
    
    if pool_id not in db['products'][state['pid']].get('stock_pools', {}):
        msg = bot.send_message(message.chat.id, "❌ Pool ID not found. Try again:")
        bot.register_next_step_handler(msg, step_var_pool)
        return
        
    db['products'][state['pid']]['variants'][state['vid']] = {
        "name": state['vname'],
        "price": state['vprice'],
        "duration": state['vduration'],
        "pool_id": pool_id
    }
    save_db(db)
    
    pid2 = state['pid']
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("➕ Add Another Variant", callback_data=f"addvar_{pid2}"))
    markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"cfg_{pid2}"))
    markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"ms_menu:{pid2}"))
    bot.send_message(message.chat.id, f"✅ Variant Added!\n\nName: {state['vname']}\nPrice: Rs.{state['vprice']}\nDuration: {state['vduration']} Months\nPool: {pool_id}", reply_markup=markup)


# --- BULK ADDITION STEPS ---


def step_bulk_var(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    state = conv_states.get(message.chat.id)
    if not state or 'pid' not in state:
        return bot.send_message(message.chat.id, "❌ Session expired.")
    
    pid = state['pid']
    lines = [l.strip() for l in message.text.split("\n") if l.strip()]
    db = load_db()
    
    if pid not in db['products']:
        return bot.send_message(message.chat.id, "❌ Product not found.")
    
    added_count = 0
    errors = []
    
    for line in lines:
        try:
            # Detect delimiter
            if '|' in line:
                parts = [p.strip() for p in line.split('|')]
            elif ';' in line:
                parts = [p.strip() for p in line.split(';')]
            else:
                # Comma delimiter, handle thousands separator in price
                raw_parts = [p.strip() for p in line.split(',')]
                if len(raw_parts) < 3:
                    errors.append(f"Format error: `{line}`")
                    continue
                # E.g. "1 Month, 1,299, Premium, 1" (duration = 1)
                # E.g. "1 Month, 1299, Premium" (duration = 0)
                if raw_parts[-1].isdigit() and len(raw_parts) >= 4:
                    duration_str = raw_parts[-1]
                    pool_name = raw_parts[-2]
                    price_str = ",".join(raw_parts[1:-2])
                    v_name = raw_parts[0]
                    parts = [v_name, price_str, pool_name, duration_str]
                else:
                    pool_name = raw_parts[-1]
                    price_str = ",".join(raw_parts[1:-1])
                    v_name = raw_parts[0]
                    parts = [v_name, price_str, pool_name]
            
            if len(parts) < 3:
                errors.append(f"Invalid format: `{line}`")
                continue
                
            v_name = parts[0]
            price_str = parts[1]
            pool_name = parts[2]
            
            # Clean price string
            cleaned_price = price_str.replace("Rs.", "").replace("rs.", "").replace("₹", "").replace("INR", "").replace("inr", "").replace(",", "").strip()
            price = float(cleaned_price)
            
            duration = 0
            if len(parts) >= 4:
                try:
                    duration = int(parts[3])
                except ValueError:
                    pass
            
            # Find or Create Pool
            if pool_name not in db['products'][pid]['stock_pools']:
                db['products'][pid]['stock_pools'][pool_name] = []
            
            # Add Variant
            vid = "v-" + uuid.uuid4().hex[:6]
            db['products'][pid]['variants'][vid] = {
                "name": v_name,
                "price": price,
                "duration": duration,
                "pool_id": pool_name
            }
            added_count += 1
        except Exception as e:
            errors.append(f"Error at `{line}`: {str(e)}")
            
    save_db(db)
    report = f"✅ **Bulk Add Complete!**\n\nSuccessfully added `{added_count}` variants to `{db['products'][pid]['name']}`."
    if errors:
        report += "\n\n⚠️ **Errors (first 10):**\n" + "\n".join(errors[:10])
    
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"cfg_{pid}"))
    bot.send_message(message.chat.id, report, reply_markup=markup, parse_mode="Markdown")



# 3. Add Stock
def step_add_stock(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text and message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    state = conv_states[message.chat.id]
    
    updated_text = ""
    if message.document:
        try:
            file_info = bot.get_file(message.document.file_id)
            downloaded_file = bot.download_file(file_info.file_path)
            updated_text = downloaded_file.decode('utf-8')
        except Exception as e:
            msg = bot.send_message(message.chat.id, "❌ Error reading file. Please send a valid .txt file:")
            bot.register_next_step_handler(message, step_add_stock)
            return
    elif message.text:
        updated_text = message.text
    else:
        msg = bot.send_message(message.chat.id, "❌ Please send text or a .txt file:")
        bot.register_next_step_handler(message, step_add_stock)
        return
        
    # Split by blank lines so multi-line credentials (e.g. Netflix accounts) count as ONE item each
    new_stocks = [block.strip() for block in updated_text.split("\n\n") if block.strip()]
    
    db = load_db()
    
    if state['pid'] not in db['products'] or state['pool_id'] not in db['products'][state['pid']].get('stock_pools', {}):
        bot.send_message(message.chat.id, "Error: Product or stock pool missing.")
        return

    db['products'][state['pid']]['stock_pools'][state['pool_id']].extend(new_stocks)
    db['products'][state['pid']]['is_active'] = True  # Automatically activate product when stock is added
    save_db(db)

    import threading
    threading.Thread(target=broadcast_stock_addition, args=(state['pid'], len(new_stocks)), daemon=True).start()

    pid2 = state['pid']
    
    # Pre-Order Check
    pending_pre = [s for s in db.get('sales', []) if s.get('pool_id') == state['pool_id'] and s.get('status') == 'Pre-Order']
    if pending_pre:
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("✅ Yes, Auto Deliver", callback_data=f"autodeliver:{pid2}:{state['pool_id']}"))
        markup.add(InlineKeyboardButton("❌ No, Keep Pending", callback_data=f"ms_menu:{pid2}"))
        bot.send_message(message.chat.id, f"📦 **PRE-ORDERS DETECTED!**\n\nYou added stock to pool `{state['pool_id']}`.\nThere are **{len(pending_pre)}** pending pre-orders waiting for this stock!\n\nDo you want to automatically fulfill and deliver them now?", reply_markup=markup, parse_mode="Markdown")
        return
        
    back_to = state.get('back_to', f"ms_menu:{pid2}")
    report = f"✅ Stock Update Complete!\n\n📦 Added {len(new_stocks)} item(s) to pool `{state['pool_id']}`."
    markup = InlineKeyboardMarkup()
    if "lowstk_view" in back_to:
        markup.add(InlineKeyboardButton("➕ Add More Stock", callback_data=f"selpoolstk_lowstk:{pid2}:{state['pool_id']}"))
    else:
        markup.add(InlineKeyboardButton("➕ Add More Stock", callback_data=f"selstock:{pid2}"))
    markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=back_to))
    bot.send_message(message.chat.id, report, reply_markup=markup, parse_mode="Markdown")

def step_save_edited_stock(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text and message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    state = conv_states.get(message.chat.id)
    if not state: return
    
    updated_text = ""
    if message.document:
        try:
            file_info = bot.get_file(message.document.file_id)
            downloaded_file = bot.download_file(file_info.file_path)
            updated_text = downloaded_file.decode('utf-8')
        except Exception as e:
            msg = bot.send_message(message.chat.id, "❌ Error reading file. Please send a valid .txt file:")
            bot.register_next_step_handler(message, step_save_edited_stock)
            return
    elif message.text:
        updated_text = message.text
    else:
        msg = bot.send_message(message.chat.id, "❌ Please send text or a .txt file:")
        bot.register_next_step_handler(message, step_save_edited_stock)
        return
    
    # Split by blank lines to get individual items
    updated_stocks = [block.strip() for block in updated_text.split("\n\n") if block.strip()]
    
    db = load_db()
    pid, pool_id = state['pid'], state['pool_id']
    
    if pid in db['products'] and pool_id in db['products'][pid].get('stock_pools', {}):
        old_stock_len = len(db['products'][pid]['stock_pools'][pool_id])
        db['products'][pid]['stock_pools'][pool_id] = updated_stocks
        save_db(db)
        
        new_added = len(updated_stocks) - old_stock_len
        if new_added > 0:
            import threading
            threading.Thread(target=broadcast_stock_addition, args=(pid, new_added), daemon=True).start()
            
            # Pre-Order Check
            pending_pre = [s for s in db.get('sales', []) if s.get('pool_id') == pool_id and s.get('status') == 'Pre-Order']
            if pending_pre:
                markup = InlineKeyboardMarkup()
                markup.add(InlineKeyboardButton("✅ Yes, Auto Deliver", callback_data=f"autodeliver:{pid}:{pool_id}"))
                markup.add(InlineKeyboardButton("❌ No, Keep Pending", callback_data=f"editpool:{pid}:{pool_id}"))
                bot.send_message(message.chat.id, f"📦 **PRE-ORDERS DETECTED!**\n\nYou updated stock in pool `{pool_id}`.\nThere are **{len(pending_pre)}** pending pre-orders waiting for this stock!\n\nDo you want to automatically fulfill and deliver them now?", reply_markup=markup, parse_mode="Markdown")
                return
        
        report = f"✅ **Stock List Updated!**\n\nPool `{pool_id}` now has `{len(updated_stocks)}` items."
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"editpool:{pid}:{pool_id}"))
        bot.send_message(message.chat.id, report, reply_markup=markup, parse_mode="Markdown")
    else:
        bot.send_message(message.chat.id, "❌ Error: Could not find product or pool.")

def step_repl_save(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    
    state = conv_states.get(message.chat.id, {})
    sid = state.get('repl_sid')
    back_cb_str = state.get('back_cb_str')
    if not sid: return
    
    new_creds = message.text.strip()
    db = load_db()
    
    found = False
    target_uid = None
    prod_name = ""
    for s in db['sales']:
        if s['sale_id'] == sid:
            s['credentials'] = new_creds
            s['last_edited_at'] = time.time()
            target_uid = s['user_id']
            prod_name = s['product_name']
            found = True
            break
            
    if found:
        save_db(db)
        markup = InlineKeyboardMarkup()
        if back_cb_str:
            markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"view_order_detail:{sid}"))
        bot.send_message(message.chat.id, "✅ **Credentials Updated!**\nUser has been notified.", reply_markup=markup if back_cb_str else None, parse_mode="Markdown")
        
        # Notify User via Store Bot
        try:
            from admin import STORE_BOT_TOKEN
            target_bot = telebot.TeleBot(STORE_BOT_TOKEN)
            notif = (
                f"🔄 *Order Updated/Replaced*\n\n"
                f"Admin has updated the credentials for your order of *{prod_name}*.\n\n"
                f"📑 *New Details:*\n`{new_creds}`\n\n"
                f"You can also view this in your *My Orders* section."
            )
            kb = build_store_reply_keyboard()
            safe_send_store_message(target_bot, target_uid, notif, reply_markup=kb)
        except Exception as e:
            bot.send_message(message.chat.id, f"⚠️ User notified (tried but errored: {str(e)})")
    else:
        bot.send_message(message.chat.id, "❌ Order ID not found.")

# 4. Edit Variant Details
def step_edit_vname(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    state = conv_states[message.chat.id]
    db = load_db()
    db['products'][state['pid']]['variants'][state['vid']]['name'] = message.text
    save_db(db)
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"cfg_{state['pid']}"))
    bot.send_message(message.chat.id, "✅ Variant Name updated!", reply_markup=markup)

def step_edit_vprice(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    state = conv_states[message.chat.id]
    try:
        price = float(message.text)
        db = load_db()
        db['products'][state['pid']]['variants'][state['vid']]['price'] = price
        save_db(db)
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"cfg_{state['pid']}"))
        bot.send_message(message.chat.id, "✅ Variant Price updated!", reply_markup=markup)
    except ValueError:
        msg = bot.send_message(message.chat.id, "❌ Invalid number. Send price again:")
        bot.register_next_step_handler(msg, step_edit_vprice)

def step_edit_vduration(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    try:
        duration = int(message.text.strip())
        state = conv_states[message.chat.id]
        db = load_db()
        db['products'][state['pid']]['variants'][state['vid']]['duration'] = duration
        save_db(db)
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=f"cfg_{state['pid']}"))
        bot.send_message(message.chat.id, f"✅ Variant Duration updated to {duration} months!", reply_markup=markup)
    except ValueError:
        msg = bot.send_message(message.chat.id, "❌ Invalid number. Send duration in months again:")
        bot.register_next_step_handler(msg, step_edit_vduration)

def step_edit_name(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    
    state = conv_states.get(message.chat.id)
    if not state: return
    
    new_name = message.text.strip()
    db = load_db()
    pid = state['pid']
    
    if pid in db['products']:
        db['products'][pid]['name'] = new_name
        save_db(db)
        
        bot.send_message(message.chat.id, f"✅ **Product Name updated to `{new_name}`!**", parse_mode="Markdown")
        # Return to product detail
        p = db['products'].get(pid)
        bot.send_message(message.chat.id, _product_detail_text(pid, p), reply_markup=_edit_product_markup(pid), parse_mode="Markdown")
    else:
        bot.send_message(message.chat.id, "❌ Error: Product not found.")


def step_edit_rules(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    
    state = conv_states.get(message.chat.id)
    if not state: return
    
    pid = state.get('pid')
    target_id = state.get('rule_target', 'global')
    db = load_db()
    
    if pid in db.get('products', {}):
        prod = db['products'][pid]
        
        is_clear = message.text.lower().strip() == 'clear'
        new_text = "" if is_clear else message.text
        
        if target_id == 'global':
            prod['rules'] = new_text
            msg_txt = "✅ Global rules cleared." if is_clear else "✅ Global product rules updated successfully!"
        else:
            if 'pool_rules' not in prod:
                prod['pool_rules'] = {}
            prod['pool_rules'][target_id] = new_text
            msg_txt = f"✅ Rules for Pool `{target_id}` cleared." if is_clear else f"✅ Rules for Pool `{target_id}` updated successfully!"
            
        save_db(db)
        
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 Return to Edit Menu", callback_data=f"ep_menu:{pid}"))
        bot.send_message(message.chat.id, msg_txt + "\nClick below to go back.", reply_markup=markup)
    else:
        bot.send_message(message.chat.id, "❌ Product not found.")

def step_edit_delivery_time(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    
    state = conv_states.get(message.chat.id)
    if not state: return
    
    pid = state.get('pid')
    db = load_db()
    
    if pid in db.get('products', {}):
        prod = db['products'][pid]
        prod['delivery_time'] = message.text
        save_db(db)
        
        bot.send_message(message.chat.id, f"✅ **Delivery Time updated to `{message.text}`!**", parse_mode="Markdown")
        p = db['products'].get(pid)
        bot.send_message(message.chat.id, _product_detail_text(pid, p), reply_markup=_edit_product_markup(pid), parse_mode="Markdown")
    else:
        bot.send_message(message.chat.id, "❌ Error: Product not found.")


def step_edit_desc(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel': return bot.send_message(message.chat.id, "Cancelled.")
    
    state = conv_states.get(message.chat.id)
    if not state: return
    
    desc = message.text.strip()
    db = load_db()
    pid = state['pid']
    
    if pid in db['products']:
        db['products'][pid]['description'] = desc
        save_db(db)
        
        bot.send_message(message.chat.id, "✅ **Product Description updated!**", parse_mode="Markdown")
        # Return to product detail
        p = db['products'].get(pid)
        bot.send_message(message.chat.id, _product_detail_text(pid, p), reply_markup=_edit_product_markup(pid), parse_mode="Markdown")
    else:
        bot.send_message(message.chat.id, "❌ Error: Product not found.")

def step_set_global_pri(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    
    chat_id = message.chat.id
    state = conv_states.get(chat_id)
    if not state: return
    
    pid = state['pid']
    prompt_msg_id = state.get('prompt_msg_id')
    
    if message.text.lower() == 'cancel':
        conv_states.pop(chat_id, None)
        try: bot.delete_message(chat_id, message.message_id)
        except: pass
        
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 Back to Global Priorities", callback_data="manage_global_pri"))
        if prompt_msg_id:
            bot.edit_message_text("❌ Edit cancelled.", chat_id, prompt_msg_id, reply_markup=markup)
        else:
            bot.send_message(chat_id, "❌ Edit cancelled.", reply_markup=markup)
        return
        
    try:
        pri = int(message.text.strip())
        db = load_db()
        if pid in db['products']:
            set_item_priority(db['products'], pid, pri, 'global_priority')
            save_db(db)
            
            try: bot.delete_message(chat_id, message.message_id)
            except: pass
            
            p = db['products'][pid]
            success_text = (
                f"✅ **Priority Updated Successfully!**\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"• Product: `{p['name']}`\n"
                f"• New Global Priority: `{p['global_priority']}`\n"
                f"━━━━━━━━━━━━━━━━━━━━━"
            )
            markup = InlineKeyboardMarkup()
            markup.add(InlineKeyboardButton("🔙 Back to Priorities List", callback_data="manage_global_pri"))
            
            if prompt_msg_id:
                bot.edit_message_text(success_text, chat_id, prompt_msg_id, reply_markup=markup, parse_mode="Markdown")
            else:
                bot.send_message(chat_id, success_text, reply_markup=markup, parse_mode="Markdown")
        else:
            bot.send_message(chat_id, "❌ Product not found.")
        conv_states.pop(chat_id, None)
    except ValueError:
        msg = bot.send_message(chat_id, "❌ Please enter a valid integer priority:")
        conv_states[chat_id]['prompt_msg_id'] = msg.message_id
        bot.register_next_step_handler(msg, step_set_global_pri)

def step_set_catprod_pri(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    
    chat_id = message.chat.id
    state = conv_states.get(chat_id)
    if not state: return
    
    pid = state['pid']
    cid = state.get('cid')
    prompt_msg_id = state.get('prompt_msg_id')
    
    back_callback = f"manage_catprod_pri:{cid}" if cid else "manage_catprod_pri_menu"
    
    if message.text.lower() == 'cancel':
        conv_states.pop(chat_id, None)
        try: bot.delete_message(chat_id, message.message_id)
        except: pass
        
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 Back to List", callback_data=back_callback))
        if prompt_msg_id:
            bot.edit_message_text("❌ Edit cancelled.", chat_id, prompt_msg_id, reply_markup=markup)
        else:
            bot.send_message(chat_id, "❌ Edit cancelled.", reply_markup=markup)
        return
        
    try:
        pri = int(message.text.strip())
        db = load_db()
        if pid in db['products']:
            p = db['products'][pid]
            cid = p.get('category_id')
            def cat_filter(prod):
                return prod.get('category_id') == cid
            set_item_priority(db['products'], pid, pri, 'cat_priority', filter_func=cat_filter)
            save_db(db)
            
            try: bot.delete_message(chat_id, message.message_id)
            except: pass
            
            success_text = (
                f"✅ **Category-wise Product Priority Updated!**\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"• Product: `{p['name']}`\n"
                f"• New Category Priority: `{p['cat_priority']}`\n"
                f"━━━━━━━━━━━━━━━━━━━━━"
            )
            markup = InlineKeyboardMarkup()
            markup.add(InlineKeyboardButton("🔙 Back to Product List", callback_data=f"manage_catprod_pri:{cid}"))
            
            if prompt_msg_id:
                bot.edit_message_text(success_text, chat_id, prompt_msg_id, reply_markup=markup, parse_mode="Markdown")
            else:
                bot.send_message(chat_id, success_text, reply_markup=markup, parse_mode="Markdown")
        else:
            bot.send_message(chat_id, "❌ Product not found.")
        conv_states.pop(chat_id, None)
    except ValueError:
        msg = bot.send_message(chat_id, "❌ Please enter a valid integer priority:")
        conv_states[chat_id]['prompt_msg_id'] = msg.message_id
        bot.register_next_step_handler(msg, step_set_catprod_pri)

def step_set_cat_pri(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    
    chat_id = message.chat.id
    state = conv_states.get(chat_id)
    if not state: return
    
    cid = state['cid']
    source = state.get('source', 'detail')
    prompt_msg_id = state.get('prompt_msg_id')
    
    back_callback = "manage_cat_pri" if source == "sort" else f"cat_detail:{cid}"
    
    if message.text.lower() == 'cancel':
        conv_states.pop(chat_id, None)
        try: bot.delete_message(chat_id, message.message_id)
        except: pass
        
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 Back", callback_data=back_callback))
        if prompt_msg_id:
            bot.edit_message_text("❌ Edit cancelled.", chat_id, prompt_msg_id, reply_markup=markup)
        else:
            bot.send_message(chat_id, "❌ Edit cancelled.", reply_markup=markup)
        return
        
    try:
        pri = int(message.text.strip())
        db = load_db()
        if cid in db.get('categories', {}):
            set_item_priority(db['categories'], cid, pri, 'priority')
            save_db(db)
            
            try: bot.delete_message(chat_id, message.message_id)
            except: pass
            
            final_pri = db['categories'][cid]['priority']
            success_text = (
                f"✅ **Category Priority Updated!**\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"• Category: `{db['categories'][cid]['name']}`\n"
                f"• New Priority: `{final_pri}`\n"
                f"━━━━━━━━━━━━━━━━━━━━━"
            )
            markup = InlineKeyboardMarkup()
            markup.add(InlineKeyboardButton("🔙 Go Back", callback_data=back_callback))
            
            if prompt_msg_id:
                bot.edit_message_text(success_text, chat_id, prompt_msg_id, reply_markup=markup, parse_mode="Markdown")
            else:
                bot.send_message(chat_id, success_text, reply_markup=markup, parse_mode="Markdown")
        else:
            bot.send_message(chat_id, "❌ Category not found.")
        conv_states.pop(chat_id, None)
    except ValueError:
        msg = bot.send_message(chat_id, "❌ Please enter a valid integer priority:")
        conv_states[chat_id]['prompt_msg_id'] = msg.message_id
        bot.register_next_step_handler(msg, step_set_cat_pri)

# step_edit_vsub removed


# 5. Manage Balances
def _send_user_bal_panel(chat_id, message_id, uid, db=None, page=1):
    if not db:
        db = load_db()
    u = db.get('users', {}).get(uid)
    if not u:
        return
        
    uname = str(u.get('username', 'Unknown')).replace('_', '-')
    bal = converter.format_price(u.get('balance', 0), u.get('currency', 'INR'))
    is_frozen = u.get('is_frozen', False)
    status_str = "❄️ *Frozen*" if is_frozen else "🟢 *Active*"
    
    text = (
        f"💳 *User Balance Management*\n"
        f"───────────────────────\n"
        f"👤 *User:* @{uname} (`{uid}`)\n"
        f"💰 *Current Balance:* `{bal}`\n"
        f"⚙️ *Wallet Status:* {status_str}\n"
        f"───────────────────────\n"
        f"Choose an action below to manage this user's balance:"
    )
    
    markup = InlineKeyboardMarkup()
    markup.row(
        InlineKeyboardButton("➕ Add Balance", callback_data=f"bal_act:add:{uid}:{page}"),
        InlineKeyboardButton("➖ Deduct Balance", callback_data=f"bal_act:remove:{uid}:{page}")
    )
    freeze_btn_text = "🔥 Unfreeze Wallet" if is_frozen else "❄️ Freeze Wallet"
    markup.row(
        InlineKeyboardButton("🧹 Reset to 0", callback_data=f"bal_act:reset:{uid}:{page}"),
        InlineKeyboardButton(freeze_btn_text, callback_data=f"bal_act:freeze:{uid}:{page}")
    )
    markup.row(
        InlineKeyboardButton("🔙 Back to Profile", callback_data=f"view_user:{uid}:{page}")
    )
    
    if message_id:
        try:
            bot.edit_message_text(text, chat_id, message_id, reply_markup=markup, parse_mode="Markdown")
        except Exception:
            bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")
    else:
        bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")

def step_bal_uid(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "❌ Cancelled.", reply_markup=admin_menu())
        return
        
    query = message.text.strip()
    db = load_db()
    uid = resolve_user_id(query, db)
    if not uid:
        msg = bot.send_message(message.chat.id, "❌ User not found by ID or Username in database. Please enter again (or type 'cancel'):")
        bot.register_next_step_handler(msg, step_bal_uid)
        return
        
    _send_user_bal_panel(message.chat.id, None, uid, db)

def step_user_bal_update_amt(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "❌ Cancelled.", reply_markup=admin_menu())
        return
        
    chat_id = message.chat.id
    state = conv_states.get(chat_id, {})
    uid = state.get('uid')
    action = state.get('action')
    
    if not uid or not action:
        bot.send_message(chat_id, "❌ Session expired. Please start again.")
        return
        
    try:
        amount = float(message.text.strip())
        if amount <= 0:
            raise ValueError
    except ValueError:
        msg = bot.send_message(chat_id, "❌ Please enter a valid positive number:")
        bot.register_next_step_handler(msg, step_user_bal_update_amt)
        return
        
    db = load_db()
    u = db.get('users', {}).get(uid)
    if not u:
        bot.send_message(chat_id, "❌ User not found.")
        return
        
    current_bal = u.get('balance', 0.0)
    
    if action == 'add':
        new_bal = current_bal + amount
        db['users'][uid]['balance'] = new_bal
        db['users'][uid]['total_deposit'] = u.get('total_deposit', 0.0) + amount
        save_db(db)
        bot.send_message(chat_id, f"✅ Successfully added ₹{amount} to user `{uid}`.", reply_markup=admin_menu())
        
        # Notify user
        try:
            main_bot = telebot.TeleBot(STORE_BOT_TOKEN)
            msg_text = (
                f"💰 *WALLET TOP-UP SUCCESSFUL* 💰\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"➕ *Added Amount:* `₹{amount}`\n"
                f"💳 *New Wallet Balance:* `₹{new_bal}`\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"Thank you! The funds are now available in your wallet."
            )
            kb = build_store_reply_keyboard()
            safe_send_store_message(main_bot, int(uid), msg_text, reply_markup=kb)
        except Exception:
            pass
            
    elif action == 'remove':
        new_bal = max(0.0, current_bal - amount)
        db['users'][uid]['balance'] = new_bal
        save_db(db)
        bot.send_message(chat_id, f"✅ Successfully deducted ₹{amount} from user `{uid}` (New balance: ₹{new_bal}).", reply_markup=admin_menu())
        
        # Notify user
        try:
            main_bot = telebot.TeleBot(STORE_BOT_TOKEN)
            msg_text = (
                f"💸 *WALLET DEBIT NOTIFICATION* 💸\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"➖ *Deducted Amount:* `₹{amount}`\n"
                f"💳 *New Wallet Balance:* `₹{new_bal}`\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"Please contact support if you have any questions."
            )
            kb = build_store_reply_keyboard()
            safe_send_store_message(main_bot, int(uid), msg_text, reply_markup=kb)
        except Exception:
            pass
            
    page = state.get('page', 1)
    # Clean up conv state
    conv_states.pop(chat_id, None)
    
    # Reload control panel
    _send_user_bal_panel(chat_id, None, uid, db, page=page)


def broadcast_stock_addition(pid, added_count):
    """Broadcasts a stock addition notification to all users with a View Product button."""
    try:
        db = load_db()
        prod = db['products'].get(pid)
        if not prod: return
        
        total_stock = sum(len(arr) for arr in prod.get('stock_pools', {}).values())
        
        msg_text = (
            f"🎉 *RESTOCK ALERT: {prod['name'].upper()}* 🎉\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"🔥 We have just added *{added_count} new stock* for *{prod['name']}*!\n"
            f"📊 *Current Total Stock:* `{total_stock} unit(s)`\n"
            f"━━━━━━━━━━━━━━━━━━━━━\n"
            f"👇 *Click the button below to buy or view details instantly:* "
        )
        
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton(f"📦 {prod['name']} • {total_stock} Available", url=f"https://t.me/{STORE_BOT_USERNAME}?start={pid}"))
        
        users = db.get("users", {})
        main_bot = telebot.TeleBot(STORE_BOT_TOKEN)
        
        # --- SEND TO MANDATORY CHANNEL & GROUP ---
        from manager import CHANNEL_USERNAME, GROUP_CHAT_ID
        if CHANNEL_USERNAME:
            try: main_bot.send_message(CHANNEL_USERNAME, msg_text, reply_markup=markup, parse_mode="Markdown")
            except Exception as e: print(f"Failed to send to channel: {e}")
        
        if GROUP_CHAT_ID:
            try: main_bot.send_message(GROUP_CHAT_ID, msg_text, reply_markup=markup, parse_mode="Markdown")
            except Exception as e: print(f"Failed to send to group: {e}")
        # -----------------------------------------
        
        count = 0
        for uid in users.keys():
            if safe_send_store_message(main_bot, int(uid), msg_text, reply_markup=markup):
                count += 1
        print(f"[Stock Broadcast] Sent restock alert to {count} users.")
    except Exception as e:
        print(f"Error in broadcast_stock_addition: {e}")

def step_process_product_broadcast(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "Broadcast cancelled.", reply_markup=admin_menu())
        return
        
    chat_id = message.chat.id
    state = conv_states.get(chat_id, {})
    pids = state.get('bc_pids', [])
    if not pids:
        if 'bc_pid' in state:
            pids = [state['bc_pid']]
        else:
            bot.send_message(chat_id, "❌ Session expired.", reply_markup=admin_menu())
            return
        
    db = load_db()
    valid_prods = []
    for pid in pids:
        prod = db['products'].get(pid)
        if prod:
            valid_prods.append((pid, prod))
            
    if not valid_prods:
        bot.send_message(chat_id, "❌ No valid products found.", reply_markup=admin_menu())
        return
        
    # Save parameters for confirmation
    conv_states[chat_id] = {
        'bc_type': 'product',
        'bc_pids': [p[0] for p in valid_prods],
        'bc_text': message.text
    }
    
    prod_details_list = []
    buttons_list = []
    for pid, prod in valid_prods:
        total_stock = sum(len(arr) for arr in prod.get('stock_pools', {}).values())
        prod_details_list.append(f"• `{prod['name']}` ({total_stock} Available)")
        buttons_list.append(f"[{prod['name']} • {total_stock} Available]")
        
    prod_details_str = "\n".join(prod_details_list)
    buttons_preview_str = "\n".join(buttons_list)
    
    msg_text = (
        f"📢 *NEW PRODUCT ALERT* 📢\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"{message.text}\n\n"
        f"📦 *Products:*\n{prod_details_str}\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"👇 *Click the buttons below to buy or view details instantly:*"
    )
    
    preview_text = (
        "👀 **PRODUCT BROADCAST PREVIEW**\n"
        "───────────────────────\n"
        f"{msg_text}\n"
        "───────────────────────\n"
        f"Buttons:\n{buttons_preview_str}\n"
        "───────────────────────\n"
        "⚠️ **Verify the preview above. Send this broadcast to all users?**"
    )
    
    markup = InlineKeyboardMarkup()
    markup.row(
        InlineKeyboardButton("✅ Confirm & Send", callback_data="confirm_bc:product"),
        InlineKeyboardButton("❌ Cancel", callback_data="cancel_bc")
    )
    bot.send_message(chat_id, preview_text, reply_markup=markup, parse_mode="Markdown")

def step_preview_text_broadcast(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "Broadcast cancelled.", reply_markup=admin_menu())
        return
        
    chat_id = message.chat.id
    conv_states[chat_id] = {
        'bc_type': 'text',
        'bc_text': message.text
    }
    
    preview_text = (
        "👀 **BROADCAST PREVIEW**\n"
        "───────────────────────\n"
        f"📢 *Store Announcement*\n\n"
        f"{message.text}\n"
        "───────────────────────\n"
        "⚠️ **Verify the preview above. Send this broadcast to all users?**"
    )
    
    markup = InlineKeyboardMarkup()
    markup.row(
        InlineKeyboardButton("✅ Confirm & Send", callback_data="confirm_bc:text"),
        InlineKeyboardButton("❌ Cancel", callback_data="cancel_bc")
    )
    bot.send_message(chat_id, preview_text, reply_markup=markup, parse_mode="Markdown")


def run_broadcast_task(bc_type, state, chat_id, status_msg_id):
    """Runs the broadcast loop in a background thread to prevent blocking polling."""
    try:
        db = load_db()
        users = db.get("users", {})
        total_users = len(users)
        
        if total_users == 0:
            try:
                bot.edit_message_text("❌ No users registered to broadcast to.", chat_id, status_msg_id)
            except:
                pass
            return

        main_bot = telebot.TeleBot(STORE_BOT_TOKEN)
        count = 0
        last_update_time = time.time()
        
        if bc_type == 'text':
            msg_text = f"📢 *Store Announcement*\n\n{state['bc_text']}"
            kb = build_store_reply_keyboard()
            
            # --- SEND TO MANDATORY CHANNEL & GROUP ---
            from manager import CHANNEL_USERNAME, GROUP_CHAT_ID
            if CHANNEL_USERNAME:
                try: main_bot.send_message(CHANNEL_USERNAME, msg_text, reply_markup=kb, parse_mode="Markdown")
                except Exception as e: print(f"Failed to send text bc to channel: {e}")
            if GROUP_CHAT_ID:
                try: main_bot.send_message(GROUP_CHAT_ID, msg_text, reply_markup=kb, parse_mode="Markdown")
                except Exception as e: print(f"Failed to send text bc to group: {e}")
            # -----------------------------------------
            
            for idx, uid in enumerate(users.keys(), 1):
                if safe_send_store_message(main_bot, int(uid), msg_text, reply_markup=kb):
                    count += 1
                if time.time() - last_update_time > 1.5:
                    percentage = int((idx / total_users) * 100)
                    try:
                        bot.edit_message_text(f"🔄 **Broadcasting Announcement...**\nProgress: `{percentage}%` ({idx}/{total_users})", chat_id, status_msg_id, parse_mode="Markdown")
                    except:
                        pass
                    last_update_time = time.time()
                    
            try:
                bot.edit_message_text(f"✅ **Broadcast finished!**\nDelivered to `{count}/{total_users}` users.", chat_id, status_msg_id, parse_mode="Markdown")
            except:
                pass
                
        elif bc_type == 'product':
            pids = state.get('bc_pids', [])
            if not pids and 'bc_pid' in state:
                pids = [state['bc_pid']]
                
            db = load_db()
            valid_prods = []
            for pid in pids:
                prod = db['products'].get(pid)
                if prod:
                    valid_prods.append((pid, prod))
                    
            if not valid_prods:
                try:
                    bot.edit_message_text("❌ Products not found. Broadcast failed.", chat_id, status_msg_id)
                except:
                    pass
                return
                
            prod_details_list = []
            for pid, prod in valid_prods:
                total_stock = sum(len(arr) for arr in prod.get('stock_pools', {}).values())
                prod_details_list.append(f"• `{prod['name']}` ({total_stock} Available)")
                
            prod_details_str = "\n".join(prod_details_list)
            
            msg_text = (
                f"📢 *NEW PRODUCT ALERT* 📢\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"{state['bc_text']}\n\n"
                f"📦 *Products:*\n{prod_details_str}\n"
                f"━━━━━━━━━━━━━━━━━━━━━\n"
                f"👇 *Click the buttons below to buy or view details instantly:*"
            )
            
            markup = InlineKeyboardMarkup(row_width=1)
            for pid, prod in valid_prods:
                total_stock = sum(len(arr) for arr in prod.get('stock_pools', {}).values())
                markup.add(InlineKeyboardButton(f"📦 {prod['name']} • {total_stock} Available", url=f"https://t.me/{STORE_BOT_USERNAME}?start={pid}"))
            
            # --- SEND TO MANDATORY CHANNEL & GROUP ---
            from manager import CHANNEL_USERNAME, GROUP_CHAT_ID
            if CHANNEL_USERNAME:
                try: main_bot.send_message(CHANNEL_USERNAME, msg_text, reply_markup=markup, parse_mode="Markdown")
                except Exception as e: print(f"Failed to send prod bc to channel: {e}")
            if GROUP_CHAT_ID:
                try: main_bot.send_message(GROUP_CHAT_ID, msg_text, reply_markup=markup, parse_mode="Markdown")
                except Exception as e: print(f"Failed to send prod bc to group: {e}")
            # -----------------------------------------
            
            for idx, uid in enumerate(users.keys(), 1):
                if safe_send_store_message(main_bot, int(uid), msg_text, reply_markup=markup):
                    count += 1
                if time.time() - last_update_time > 1.5:
                    percentage = int((idx / total_users) * 100)
                    try:
                        bot.edit_message_text(f"🔄 **Broadcasting Product Alert...**\nProgress: `{percentage}%` ({idx}/{total_users})", chat_id, status_msg_id, parse_mode="Markdown")
                    except:
                        pass
                    last_update_time = time.time()
                    
            try:
                bot.edit_message_text(f"✅ **Product Broadcast finished!**\nDelivered to `{count}/{total_users}` users.", chat_id, status_msg_id, parse_mode="Markdown")
            except:
                pass
    except Exception as e:
        print(f"Error in run_broadcast_task: {e}")
        try:
            bot.edit_message_text(f"❌ **Broadcast failed due to error:** {e}", chat_id, status_msg_id)
        except:
            pass


# 7. Support Username Save Process
def step_save_support_username(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
        
    chat_id = message.chat.id
    state = conv_states.get(chat_id)
    prompt_msg_id = state.get('prompt_msg_id') if state else None
    
    if message.text.lower() == 'cancel':
        conv_states.pop(chat_id, None)
        try: bot.delete_message(chat_id, message.message_id)
        except: pass
        
        if prompt_msg_id:
            _send_support_panel(chat_id, prompt_msg_id)
        else:
            _send_support_panel(chat_id)
        return
        
    new_support = message.text.strip()
    # Clean leading @ if it's not a numeric ID
    if new_support.startswith('@') and not new_support[1:].isdigit():
        new_support = new_support[1:]
        
    db = load_db()
    db['support_username'] = new_support
    save_db(db)
    
    try: bot.delete_message(chat_id, message.message_id)
    except: pass
    
    success_text = (
        f"✅ **Support Admin Updated!**\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"• New Support Admin: `@{new_support}`\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"All support options in the store bot will now direct users here."
    )
    
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("🔙 Back to Support Panel", callback_data="support_panel_main"))
    
    if prompt_msg_id:
        try:
            bot.edit_message_text(success_text, chat_id, prompt_msg_id, reply_markup=markup, parse_mode="Markdown")
        except Exception:
            bot.send_message(chat_id, success_text, reply_markup=markup, parse_mode="Markdown")
    else:
        bot.send_message(chat_id, success_text, reply_markup=markup, parse_mode="Markdown")
        
    conv_states.pop(chat_id, None)


# 8. Embedded Search Step Handlers

def step_search_orders(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "Search cancelled.", reply_markup=admin_menu())
        return
        
    query = message.text.strip()
    db = load_db()
    uid = resolve_user_id(query, db)
    
    if not uid:
        msg = bot.send_message(message.chat.id, f"❌ **User not found** matching `{query}`.\n\nPlease enter a valid User ID or Username (or type `cancel`):", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_search_orders)
        return
        
    user_sales = [s for s in db['sales'] if str(s['user_id']) == uid]
    if not user_sales:
        bot.send_message(message.chat.id, f"ℹ️ User `@{(db['users'].get(uid, {}).get('username', 'Unknown'))}` ({uid}) has no purchases in history.", reply_markup=admin_menu())
        return
        
    u_prods = {}
    for s in user_sales:
        pid = s['product_id']
        if pid not in u_prods:
            u_prods[pid] = {"name": s['product_name'], "count": 0}
        u_prods[pid]["count"] += 1
        
    markup = InlineKeyboardMarkup(row_width=1)
    for pid, info in u_prods.items():
        markup.add(InlineKeyboardButton(f"📦 {info['name']} ({info['count']} Items)", callback_data=f"cust_u_p:{uid}:{pid}"))
    markup.add(InlineKeyboardButton("🔙 Go Back", callback_data="orders_main_menu"))
    
    safe_username = str(db['users'].get(uid, {}).get('username', 'Unknown')).replace('_', '-')
    bot.send_message(message.chat.id, f"✅ **Customer Found**: @{safe_username} (`{uid}`)\nSelect a product to view specific orders:", reply_markup=markup, parse_mode="Markdown")


def step_search_deposits(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "Search cancelled.", reply_markup=admin_menu())
        return
        
    query = message.text.strip()
    db = load_db()
    uid = resolve_user_id(query, db)
    
    if not uid:
        msg = bot.send_message(message.chat.id, f"❌ **User not found** matching `{query}`.\n\nPlease enter a valid User ID or Username (or type `cancel`):", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_search_deposits)
        return
        
    deposits = [d for d in db.get('deposits', []) if str(d.get('user_id')) == uid]
    if not deposits:
        bot.send_message(message.chat.id, f"ℹ️ User `@{(db['users'].get(uid, {}).get('username', 'Unknown'))}` ({uid}) has no deposit history.", reply_markup=admin_menu())
        return
        
    class FakeCall:
        def __init__(self, chat_id, message_id, data):
            class FakeMessage:
                def __init__(self, chat_id, message_id):
                    class FakeChat:
                        def __init__(self, chat_id):
                            self.id = chat_id
                    self.chat = FakeChat(chat_id)
                    self.message_id = message_id
            self.message = FakeMessage(chat_id, message_id)
            self.data = data
            self.id = "fake_call_id"
            
    sent = bot.send_message(message.chat.id, "⌛ Loading deposit history...")
    fake_call = FakeCall(message.chat.id, sent.message_id, f"adm_dep_u:{uid}")
    handle_callbacks(fake_call)


def step_search_users(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "Search cancelled.", reply_markup=admin_menu())
        return
        
    query = message.text.strip()
    db = load_db()
    uid = resolve_user_id(query, db)
    
    if not uid:
        msg = bot.send_message(message.chat.id, f"❌ **User not found** matching `{query}`.\n\nPlease enter a valid User ID or Username (or type `cancel`):", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_search_users)
        return
        
    class FakeCall:
        def __init__(self, chat_id, message_id, data):
            class FakeMessage:
                def __init__(self, chat_id, message_id):
                    class FakeChat:
                        def __init__(self, chat_id):
                            self.id = chat_id
                    self.chat = FakeChat(chat_id)
                    self.message_id = message_id
            self.message = FakeMessage(chat_id, message_id)
            self.data = data
            self.id = "fake_call_id"
            
    sent = bot.send_message(message.chat.id, "⌛ Loading profile...")
    fake_call = FakeCall(message.chat.id, sent.message_id, f"view_user:{uid}:1")
    handle_callbacks(fake_call)


def _send_referral_panel(chat_id, message_id=None):
    db = load_db()
    users = db.get('users', {})
    
    total_referrals = 0
    successful_referrals = 0
    
    for u_id, u_data in users.items():
        if u_data.get('referred_by'):
            total_referrals += 1
            if u_data.get('referral_reward_claimed'):
                successful_referrals += 1
                
    enabled = db.get('referral_enabled', True)
    reward_amount = db.get('referral_reward', 20.0)
    min_deposit = db.get('referral_min_deposit', 100.0)
    total_rewards_paid = successful_referrals * reward_amount
    
    status_str = "🟢 Enabled" if enabled else "🔴 Disabled"
    
    ref_text = (
        f"🎁 **REFERRAL PROGRAM PANEL**\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"📊 **SYSTEM-WIDE STATISTICS**\n"
        f"👥 *Total Referrals Invited:* `{total_referrals}`\n"
        f"✅ *Successful Referrals:* `{successful_referrals}`\n"
        f"💸 *Total Rewards Paid Out:* `₹{total_rewards_paid:.2f}`\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"⚙️ **CURRENT CONFIGURATION**\n"
        f"🔌 *System Status:* **{status_str}**\n"
        f"💰 *Referral Reward Amount:* `₹{reward_amount:.2f}`\n"
        f"🎯 *Min Deposit Requirement:* `₹{min_deposit:.2f}`\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"💡 *Select an option below to update settings:*"
    )
    
    markup = InlineKeyboardMarkup(row_width=2)
    toggle_label = "🔴 Disable Program" if enabled else "🟢 Enable Program"
    markup.row(
        InlineKeyboardButton(toggle_label, callback_data="ref_config:toggle"),
        InlineKeyboardButton("⚙️ Change Reward", callback_data="ref_config:reward")
    )
    markup.row(
        InlineKeyboardButton("🎯 Change Min Deposit", callback_data="ref_config:min_dep"),
        InlineKeyboardButton("🔙 Back to Settings", callback_data="bot_settings_menu")
    )
    
    if message_id:
        try:
            bot.edit_message_text(ref_text, chat_id, message_id, reply_markup=markup, parse_mode="Markdown")
        except Exception:
            bot.send_message(chat_id, ref_text, reply_markup=markup, parse_mode="Markdown")
    else:
        bot.send_message(chat_id, ref_text, reply_markup=markup, parse_mode="Markdown")


def step_save_ref_reward(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "❌ Cancelled.", reply_markup=admin_menu())
        return
        
    chat_id = message.chat.id
    try:
        val = float(message.text.strip())
        if val < 0:
            raise ValueError()
            
        db = load_db()
        db['referral_reward'] = val
        save_db(db)
        
        bot.send_message(chat_id, f"✅ Successfully updated referral reward amount to **₹{val:.2f}**.", reply_markup=admin_menu(), parse_mode="Markdown")
    except ValueError:
        msg = bot.send_message(chat_id, "❌ Invalid amount! Enter a positive number:")
        bot.register_next_step_handler(msg, step_save_ref_reward)


def step_save_ref_min_dep(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "❌ Cancelled.", reply_markup=admin_menu())
        return
        
    chat_id = message.chat.id
    try:
        val = float(message.text.strip())
        if val < 0:
            raise ValueError()
            
        db = load_db()
        db['referral_min_deposit'] = val
        save_db(db)
        
        bot.send_message(chat_id, f"✅ Successfully updated minimum deposit requirement to **₹{val:.2f}**.", reply_markup=admin_menu(), parse_mode="Markdown")
    except ValueError:
        msg = bot.send_message(chat_id, "❌ Invalid amount! Enter a positive number:")
        bot.register_next_step_handler(msg, step_save_ref_min_dep)


# --- BOT USERS HELPERS ---
def _send_bot_users(chat_id, edit_msg_id=None, page=1):
    db = load_db()
    users = db.get('users', {})
    user_ids = list(users.keys())
    
    if not user_ids:
        if edit_msg_id:
            bot.edit_message_text("ℹ️ No users found.", chat_id, edit_msg_id)
        else:
            bot.send_message(chat_id, "ℹ️ No users found.")
        return
        
    PAGE_SIZE = 10
    total_users = len(user_ids)
    total_pages = (total_users + PAGE_SIZE - 1) // PAGE_SIZE
    page = max(1, min(page, total_pages))
    
    start_idx = (page - 1) * PAGE_SIZE
    end_idx = start_idx + PAGE_SIZE
    page_items = user_ids[start_idx:end_idx]
    
    markup = InlineKeyboardMarkup(row_width=1)
    
    for uid in page_items:
        u = users[uid]
        uname = u.get('username', 'Unknown')
        bal = converter.format_price(u.get('balance', 0), u.get('currency', 'INR'))
        markup.add(InlineKeyboardButton(f"👤 @{uname} ({uid}) • {bal}", callback_data=f"view_user:{uid}:{page}"))
        
    nav_row = []
    if page > 1:
        nav_row.append(InlineKeyboardButton("◀️", callback_data=f"bot_users_page:{page-1}"))
    nav_row.append(InlineKeyboardButton(f"Page {page}/{total_pages}", callback_data="noop"))
    if page < total_pages:
        nav_row.append(InlineKeyboardButton("▶️", callback_data=f"bot_users_page:{page+1}"))
        
    if nav_row:
        markup.row(*nav_row)
        
    markup.add(
        InlineKeyboardButton("🔍 Search User by ID/Username", callback_data="search_users_prompt"),
        InlineKeyboardButton("🔙 Go Back", callback_data="close_menu")
    )
    
    text = f"👥 *Bot Users Directory*\n\nTotal Users: {total_users}\nSelect a user to view their profile:"
    if edit_msg_id:
        try:
            bot.edit_message_text(text, chat_id, edit_msg_id, reply_markup=markup, parse_mode="Markdown")
        except Exception as e:
            if "message is not modified" not in str(e).lower():
                bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")
    else:
        bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")


def step_user_add_bal_amt(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "❌ Cancelled.", reply_markup=admin_menu())
        return
        
    chat_id = message.chat.id
    state = conv_states.get(chat_id, {})
    uid = state.get('uid')
    page = state.get('page', '1')
    
    if not uid:
        return
        
    try:
        amount = float(message.text.strip())
        db = load_db()
        db['users'][uid]['balance'] += amount
        db['users'][uid]['total_deposit'] += amount
        
        reward_info = check_and_reward_referrer(db, uid)
        if reward_info:
            referrer_id, reward_amount = reward_info
            try:
                ref_user = db['users'].get(uid)
                ref_username = ref_user.get('username', 'Unknown')
                ref_display = f"@{ref_username.replace('_', '-')}" if ref_username != "Unknown" else f"User `{uid}`"
                referrer_user = db['users'][referrer_id]
                reward_curr = referrer_user.get('currency', 'INR')
                reward_str = converter.format_price(reward_amount, reward_curr)
                new_bal_str = converter.format_price(referrer_user.get('balance', 0.0), reward_curr)
                
                reward_msg = (
                    f"🎉 *REFERRAL REWARD CREDITED!* 🎉\n"
                    f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                    f"Congratulations! Your referred friend has successfully completed the deposit requirement.\n\n"
                    f"👤 *Referral:* {ref_display} (ID: `{uid}`)\n"
                    f"💰 *Reward Credited:* `{reward_str}`\n"
                    f"💳 *New Wallet Balance:* `{new_bal_str}`\n"
                    f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                    f"The reward has been added directly to your wallet balance. You can use it to purchase any store products instantly!"
                )
                
                main_bot = telebot.TeleBot(STORE_BOT_TOKEN)
                safe_send_store_message(
                    main_bot,
                    int(referrer_id),
                    reward_msg
                )
            except Exception as e:
                print(f"Error notifying referrer: {e}")
                
        save_db(db)
        
        bot.send_message(chat_id, f"✅ Successfully added ₹{amount} to `{uid}`.", parse_mode="Markdown")
        
        # Notify user
        try:
            main_bot = telebot.TeleBot(STORE_BOT_TOKEN)
            kb = build_store_reply_keyboard()
            safe_send_store_message(main_bot, int(uid), f"💰 *Admin added funds to your wallet.*\nAdded: ₹{amount}\nNew Balance: ₹{db['users'][uid]['balance']}", reply_markup=kb)
        except Exception:
            pass
            
        # Re-open user profile
        class FakeCall:
            def __init__(self, chat_id, message_id, data):
                class FakeMessage:
                    def __init__(self, chat_id, message_id):
                        class FakeChat:
                            def __init__(self, chat_id):
                                self.id = chat_id
                        self.chat = FakeChat(chat_id)
                        self.message_id = message_id
                self.message = FakeMessage(chat_id, message_id)
                self.data = data
                self.id = "fake_call_id"
                
        sent = bot.send_message(chat_id, "⌛ Reloading user profile...")
        fake_call = FakeCall(chat_id, sent.message_id, f"view_user:{uid}:{page}")
        handle_callbacks(fake_call)
        
    except ValueError:
        msg = bot.send_message(chat_id, "❌ Amount must be a number! Send amount again:")
        bot.register_next_step_handler(msg, step_user_add_bal_amt)


def _render_product_selector(chat_id, message_id, page, is_coupon=False):
    db = load_db()
    products = db.get('products', {})
    if not products:
        bot.send_message(chat_id, "❌ No products available in the catalog.")
        return

    # Sort products alphabetically by name
    sorted_prods = sorted(products.items(), key=lambda x: x[1].get('name', '').lower())
    p_ids = [pid for pid, _ in sorted_prods]

    PAGE_SIZE = 10
    total = len(p_ids)
    total_pages = (total + PAGE_SIZE - 1) // PAGE_SIZE
    page = max(1, min(page, total_pages))

    start_idx = (page - 1) * PAGE_SIZE
    end_idx = start_idx + PAGE_SIZE
    page_items = p_ids[start_idx:end_idx]

    markup = InlineKeyboardMarkup(row_width=1)
    
    state = conv_states.get(chat_id, {})
    selected = state.get('target_products', [])

    for pid in page_items:
        p = products[pid]
        checked = "✅" if pid in selected else "⬜"
        label = f"{checked} {p.get('name', 'Unknown')}"
        cb_data = f"coup_selprod:{pid}:{page}" if is_coupon else f"disc_selprod:{pid}:{page}"
        markup.add(InlineKeyboardButton(label, callback_data=cb_data))

    # Pagination navigation
    nav_row = []
    if page > 1:
        prev_cb = f"coup_target:specific:{page-1}" if is_coupon else f"disc_target:specific:{page-1}"
        nav_row.append(InlineKeyboardButton("◀️", callback_data=prev_cb))
    nav_row.append(InlineKeyboardButton(f"Page {page}/{total_pages}", callback_data="noop"))
    if page < total_pages:
        next_cb = f"coup_target:specific:{page+1}" if is_coupon else f"disc_target:specific:{page+1}"
        nav_row.append(InlineKeyboardButton("▶️", callback_data=next_cb))
    if nav_row:
        markup.row(*nav_row)

    # Confirm and Cancel buttons
    confirm_cb = "coup_confirm_sel" if is_coupon else "disc_confirm_sel"
    cancel_cb = "cancel_coupon" if is_coupon else "cancel_discount"
    markup.add(
        InlineKeyboardButton("✅ Confirm Selection", callback_data=confirm_cb),
        InlineKeyboardButton("❌ Cancel", callback_data=cancel_cb)
    )

    text = "🎯 **Select Target Products** (Coupon)" if is_coupon else "🎯 **Select Target Products** (Discount)"
    text += f"\n\nSelected: {len(selected)} products.\nChoose products from the list below and click Confirm when done:"

    try:
        bot.edit_message_text(text, chat_id, message_id, reply_markup=markup, parse_mode="Markdown")
    except Exception as e:
        if "message is not modified" not in str(e).lower():
            bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")


def _render_broadcast_product_selector(chat_id, message_id, page):
    db = load_db()
    products = db.get('products', {})
    if not products:
        bot.send_message(chat_id, "❌ No products available in the catalog.")
        return

    # Sort products alphabetically by name
    sorted_prods = sorted(products.items(), key=lambda x: x[1].get('name', '').lower())
    p_ids = [pid for pid, _ in sorted_prods]

    PAGE_SIZE = 10
    total = len(p_ids)
    total_pages = (total + PAGE_SIZE - 1) // PAGE_SIZE
    page = max(1, min(page, total_pages))

    start_idx = (page - 1) * PAGE_SIZE
    end_idx = start_idx + PAGE_SIZE
    page_items = p_ids[start_idx:end_idx]

    markup = InlineKeyboardMarkup(row_width=1)
    
    state = conv_states.get(chat_id, {})
    selected = state.get('bc_pids', [])

    for pid in page_items:
        p = products[pid]
        checked = "✅" if pid in selected else "⬜"
        label = f"{checked} {p.get('name', 'Unknown')}"
        cb_data = f"bc_toggleprod:{pid}:{page}"
        markup.add(InlineKeyboardButton(label, callback_data=cb_data))

    # Pagination navigation
    nav_row = []
    if page > 1:
        prev_cb = f"bc_prod_page:{page-1}"
        nav_row.append(InlineKeyboardButton("◀️", callback_data=prev_cb))
    nav_row.append(InlineKeyboardButton(f"Page {page}/{total_pages}", callback_data="noop"))
    if page < total_pages:
        next_cb = f"bc_prod_page:{page+1}"
        nav_row.append(InlineKeyboardButton("▶️", callback_data=next_cb))
    if nav_row:
        markup.row(*nav_row)

    # Confirm and Cancel buttons
    markup.add(
        InlineKeyboardButton("✅ Confirm Selection", callback_data="bc_confirm_sel"),
        InlineKeyboardButton("❌ Cancel", callback_data="cancel_bc")
    )

    text = "📦 **Product Broadcast: Select Products**"
    text += f"\n\nSelected: {len(selected)} products.\nChoose products from the list below and click Confirm when done:"

    try:
        bot.edit_message_text(text, chat_id, message_id, reply_markup=markup, parse_mode="Markdown")
    except Exception as e:
        if "message is not modified" not in str(e).lower():
            bot.send_message(chat_id, text, reply_markup=markup, parse_mode="Markdown")


def step_disc_name(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "❌ Discount creation cancelled.", reply_markup=admin_menu())
        return

    chat_id = message.chat.id
    name = message.text.strip()
    if not name:
        msg = bot.send_message(chat_id, "❌ Name cannot be empty. Enter a descriptive name:")
        bot.register_next_step_handler(msg, step_disc_name)
        return

    conv_states[chat_id]['name'] = name
    
    markup = InlineKeyboardMarkup(row_width=2)
    markup.add(
        InlineKeyboardButton("📊 Percentage (%)", callback_data="disc_type:percentage"),
        InlineKeyboardButton("💵 Flat (Fixed Amount)", callback_data="disc_type:flat")
    )
    markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_discount"))
    
    bot.send_message(chat_id, "📊 **Discount Type**\n\nChoose whether the discount is a percentage reduction or a flat fixed amount:", reply_markup=markup, parse_mode="Markdown")


def step_disc_value(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "❌ Discount creation cancelled.", reply_markup=admin_menu())
        return

    chat_id = message.chat.id
    val_str = message.text.strip()
    try:
        val = float(val_str)
        if val <= 0:
            raise ValueError()
        
        dtype = conv_states[chat_id].get('type')
        if dtype == 'percentage' and val > 100:
            msg = bot.send_message(chat_id, "❌ Percentage discount cannot be greater than 100%! Enter the value again:")
            bot.register_next_step_handler(msg, step_disc_value)
            return
            
        conv_states[chat_id]['value'] = val
        
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("🌍 All Products", callback_data="disc_target:all"),
            InlineKeyboardButton("📦 Specific Products", callback_data="disc_target:specific:1")
        )
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_discount"))
        
        bot.send_message(chat_id, "🎯 **Select Target Products**\n\nChoose whether this discount applies to all catalog items or only specific products:", reply_markup=markup, parse_mode="Markdown")
        
    except ValueError:
        msg = bot.send_message(chat_id, "❌ Discount value must be a positive number! Enter the value again:")
        bot.register_next_step_handler(msg, step_disc_value)


def step_disc_start_date(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "❌ Discount creation cancelled.", reply_markup=admin_menu())
        return

    chat_id = message.chat.id
    ts = parse_datetime_to_timestamp(message.text)
    if ts is None:
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("Start Now", callback_data="disc_start_choice:now"),
            InlineKeyboardButton("In 1 Hour", callback_data="disc_start_choice:1h"),
            InlineKeyboardButton("Tomorrow", callback_data="disc_start_choice:1d")
        )
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_discount"))
        msg = bot.send_message(chat_id, "❌ Invalid date format. Enter when this discount starts (e.g. `05-06-2026 12:00` or `now`):\n\n- Click a quick option below,\n- Or type the start date/time below:", reply_markup=markup, parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_disc_start_date)
        return

    conv_states[chat_id]['start_date'] = ts
    
    markup = InlineKeyboardMarkup(row_width=2)
    markup.add(
        InlineKeyboardButton("⏰ 1 Day", callback_data="disc_end_choice:1d"),
        InlineKeyboardButton("⏰ 3 Days", callback_data="disc_end_choice:3d"),
        InlineKeyboardButton("⏰ 7 Days", callback_data="disc_end_choice:7d"),
        InlineKeyboardButton("⏰ 30 Days", callback_data="disc_end_choice:30d"),
        InlineKeyboardButton("♾️ Never Expire", callback_data="disc_end_choice:never")
    )
    markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_discount"))
    
    msg = bot.send_message(chat_id, "📅 **Create Discount: End Date & Time**\n\nEnter when this discount ends.\n- Click one of the quick options below,\n- Or type a custom duration (e.g. `2 hours`),\n- Or enter a specific date (e.g., `06-06-2026 12:00`):", reply_markup=markup, parse_mode="Markdown")
    bot.register_next_step_handler(msg, step_disc_end_date)


def step_disc_end_date(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "❌ Discount creation cancelled.", reply_markup=admin_menu())
        return

    chat_id = message.chat.id
    ts = parse_datetime_to_timestamp(message.text, is_end_date=True)
    if ts is None:
        msg = bot.send_message(chat_id, "❌ Invalid date/duration format. Enter when this discount ends (e.g., `7 days`, `never` or `06-06-2026 12:00`):", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_disc_end_date)
        return

    start_ts = conv_states[chat_id].get('start_date', 0)
    if ts <= start_ts:
        msg = bot.send_message(chat_id, "❌ Expiration date/duration must be after the start time! Enter again:", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_disc_end_date)
        return

    conv_states[chat_id]['end_date'] = ts
    
    state = conv_states[chat_id]
    start_str = datetime.fromtimestamp(state['start_date'], tz=IST).strftime("%d-%m-%Y %H:%M")
    end_str = "Never (No Expiration)" if state['end_date'] == 9999999999 else datetime.fromtimestamp(state['end_date'], tz=IST).strftime("%d-%m-%Y %H:%M")
    val_str = f"{state['value']}%" if state['type'] == 'percentage' else f"₹{state['value']}"
    target_str = "All Products" if state['target_type'] == 'all' else f"{len(state.get('target_products', []))} Specific Products"

    confirm_text = (
        "📝 **Confirm Discount Details**\n"
        "───────────────────────\n"
        f"🏷️ **Name**: {state['name']}\n"
        f"📊 **Type**: {state['type'].capitalize()}\n"
        f"💰 **Value**: {val_str}\n"
        f"🎯 **Target**: {target_str}\n"
        f"📅 **Start**: {start_str} IST\n"
        f"📅 **End**: {end_str}\n"
        "───────────────────────\n"
        "⚠️ **Verify details. Confirm and save this discount?**"
    )

    markup = InlineKeyboardMarkup(row_width=2)
    markup.add(
        InlineKeyboardButton("✅ Confirm & Activate", callback_data="confirm_create_discount"),
        InlineKeyboardButton("❌ Cancel", callback_data="cancel_discount")
    )
    bot.send_message(chat_id, confirm_text, reply_markup=markup, parse_mode="Markdown")


def step_coupon_code(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "❌ Coupon creation cancelled.", reply_markup=admin_menu())
        return

    chat_id = message.chat.id
    code = message.text.strip().upper()
    
    import re
    if not re.match(r'^[A-Z0-9_-]{3,20}$', code):
        msg = bot.send_message(chat_id, "❌ Coupon code must be 3-20 characters long and contain only letters, numbers, hyphens, or underscores. Enter the code again:")
        bot.register_next_step_handler(msg, step_coupon_code)
        return

    db = load_db()
    if code in db.get('coupons', {}):
        msg = bot.send_message(chat_id, "❌ This coupon code already exists. Please choose a different code:")
        bot.register_next_step_handler(msg, step_coupon_code)
        return

    conv_states[chat_id]['code'] = code

    markup = InlineKeyboardMarkup(row_width=2)
    markup.add(
        InlineKeyboardButton("📊 Percentage (%)", callback_data="coup_type:percentage"),
        InlineKeyboardButton("💵 Flat (Fixed Amount)", callback_data="coup_type:flat")
    )
    markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_coupon"))
    
    bot.send_message(chat_id, "📊 **Coupon Type**\n\nChoose whether the coupon gives a percentage reduction or a flat fixed amount:", reply_markup=markup, parse_mode="Markdown")


def step_coupon_value(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "❌ Coupon creation cancelled.", reply_markup=admin_menu())
        return

    chat_id = message.chat.id
    val_str = message.text.strip()
    try:
        val = float(val_str)
        if val <= 0:
            raise ValueError()
        
        dtype = conv_states[chat_id].get('type')
        if dtype == 'percentage' and val > 100:
            msg = bot.send_message(chat_id, "❌ Percentage coupon value cannot be greater than 100%! Enter the value again:")
            bot.register_next_step_handler(msg, step_coupon_value)
            return
            
        conv_states[chat_id]['value'] = val
        
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("🌍 All Products", callback_data="coup_target:all"),
            InlineKeyboardButton("📦 Specific Products", callback_data="coup_target:specific:1")
        )
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_coupon"))
        
        bot.send_message(chat_id, "🎯 **Select Target Products**\n\nChoose whether this coupon applies to all catalog items or only specific products:", reply_markup=markup, parse_mode="Markdown")
        
    except ValueError:
        msg = bot.send_message(chat_id, "❌ Coupon value must be a positive number! Enter the value again:")
        bot.register_next_step_handler(msg, step_coupon_value)


def step_coupon_start_date(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "❌ Coupon creation cancelled.", reply_markup=admin_menu())
        return

    chat_id = message.chat.id
    ts = parse_datetime_to_timestamp(message.text)
    if ts is None:
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("Start Now", callback_data="coup_start_choice:now"),
            InlineKeyboardButton("In 1 Hour", callback_data="coup_start_choice:1h"),
            InlineKeyboardButton("Tomorrow", callback_data="coup_start_choice:1d")
        )
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_coupon"))
        msg = bot.send_message(chat_id, "❌ Invalid date format. Enter when this coupon starts (e.g. `05-06-2026 12:00` or `now`):\n\n- Click a quick option below,\n- Or type the start date/time below:", reply_markup=markup, parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_coupon_start_date)
        return

    conv_states[chat_id]['start_date'] = ts
    
    markup = InlineKeyboardMarkup(row_width=2)
    markup.add(
        InlineKeyboardButton("⏰ 1 Day", callback_data="coup_end_choice:1d"),
        InlineKeyboardButton("⏰ 3 Days", callback_data="coup_end_choice:3d"),
        InlineKeyboardButton("⏰ 7 Days", callback_data="coup_end_choice:7d"),
        InlineKeyboardButton("⏰ 30 Days", callback_data="coup_end_choice:30d"),
        InlineKeyboardButton("♾️ Never Expire", callback_data="coup_end_choice:never")
    )
    markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_coupon"))
    
    msg = bot.send_message(chat_id, "📅 **Create Coupon: End Date & Time**\n\nEnter when this coupon expires.\n- Click one of the quick options below,\n- Or type a custom duration (e.g. `7 days`),\n- Or enter a specific date (e.g., `06-06-2026 12:00`):", reply_markup=markup, parse_mode="Markdown")
    bot.register_next_step_handler(msg, step_coupon_end_date)


def step_coupon_end_date(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "❌ Coupon creation cancelled.", reply_markup=admin_menu())
        return

    chat_id = message.chat.id
    ts = parse_datetime_to_timestamp(message.text, is_end_date=True)
    if ts is None:
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("⏰ 1 Day", callback_data="coup_end_choice:1d"),
            InlineKeyboardButton("⏰ 3 Days", callback_data="coup_end_choice:3d"),
            InlineKeyboardButton("⏰ 7 Days", callback_data="coup_end_choice:7d"),
            InlineKeyboardButton("⏰ 30 Days", callback_data="coup_end_choice:30d"),
            InlineKeyboardButton("♾️ Never Expire", callback_data="coup_end_choice:never")
        )
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_coupon"))
        msg = bot.send_message(chat_id, "❌ Invalid date/duration format. Enter when this coupon expires (e.g. `7 days`, `never` or `06-06-2026 12:00`):\n\n- Click a quick option below,\n- Or type the expiration date/time below:", reply_markup=markup, parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_coupon_end_date)
        return

    start_ts = conv_states[chat_id].get('start_date', 0)
    if ts <= start_ts:
        msg = bot.send_message(chat_id, "❌ Expiration date/duration must be after the start time! Enter again:", parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_coupon_end_date)
        return

    conv_states[chat_id]['end_date'] = ts
    
    markup = InlineKeyboardMarkup(row_width=2)
    markup.add(
        InlineKeyboardButton("1 Time", callback_data="coup_per_user_choice:1"),
        InlineKeyboardButton("♾️ Unlimited", callback_data="coup_per_user_choice:-1")
    )
    markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_coupon"))
    
    msg = bot.send_message(chat_id, "🔢 **Create Coupon: Max Uses Per User**\n\nEnter the maximum number of times **a single user** can use this coupon.\n- Click a quick option below,\n- Or type a custom number:", reply_markup=markup, parse_mode="Markdown")
    bot.register_next_step_handler(msg, step_coupon_per_user_limit)


def step_coupon_per_user_limit(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "❌ Coupon creation cancelled.", reply_markup=admin_menu())
        return

    chat_id = message.chat.id
    try:
        val = int(message.text.strip())
        if val <= 0 and val != -1:
            raise ValueError()
        
        conv_states[chat_id]['per_user_limit'] = val
        
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("10 Uses", callback_data="coup_max_uses_choice:10"),
            InlineKeyboardButton("50 Uses", callback_data="coup_max_uses_choice:50"),
            InlineKeyboardButton("100 Uses", callback_data="coup_max_uses_choice:100"),
            InlineKeyboardButton("♾️ Unlimited", callback_data="coup_max_uses_choice:-1")
        )
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_coupon"))
        
        msg = bot.send_message(chat_id, "🔢 **Create Coupon: Max Uses (Global)**\n\nEnter the maximum total uses for this coupon across all users.\n- Click a quick option below,\n- Or type a custom number:", reply_markup=markup, parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_coupon_max_uses)
    except ValueError:
        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("1 Time", callback_data="coup_per_user_choice:1"),
            InlineKeyboardButton("♾️ Unlimited", callback_data="coup_per_user_choice:-1")
        )
        markup.add(InlineKeyboardButton("❌ Cancel", callback_data="cancel_coupon"))
        msg = bot.send_message(chat_id, "❌ Invalid value. Enter a valid integer (positive number or -1 for unlimited uses per user):\n\n- Click a quick option below,\n- Or type a custom number:", reply_markup=markup, parse_mode="Markdown")
        bot.register_next_step_handler(msg, step_coupon_per_user_limit)


def step_coupon_max_uses(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    if message.text.lower() == 'cancel':
        bot.send_message(message.chat.id, "❌ Coupon creation cancelled.", reply_markup=admin_menu())
        return

    chat_id = message.chat.id
    try:
        max_uses = int(message.text.strip())
        if max_uses <= 0 and max_uses != -1:
            raise ValueError()

        conv_states[chat_id]['max_uses'] = max_uses
        
        state = conv_states[chat_id]
        start_str = datetime.fromtimestamp(state['start_date'], tz=IST).strftime("%d-%m-%Y %H:%M")
        end_str = "Never (No Expiration)" if state['end_date'] == 9999999999 else datetime.fromtimestamp(state['end_date'], tz=IST).strftime("%d-%m-%Y %H:%M")
        val_str = f"{state['value']}%" if state['type'] == 'percentage' else f"₹{state['value']}"
        target_str = "All Products" if state['target_type'] == 'all' else f"{len(state.get('target_products', []))} Specific Products"
        uses_str = "Unlimited" if max_uses == -1 else str(max_uses)
        per_user_str = "Unlimited" if state['per_user_limit'] == -1 else f"{state['per_user_limit']} use(s)"

        confirm_text = (
            "📝 **Confirm Coupon Details**\n"
            "───────────────────────\n"
            f"🎟️ **Code**: `{state['code']}`\n"
            f"📊 **Type**: {state['type'].capitalize()}\n"
            f"💰 **Value**: {val_str}\n"
            f"🎯 **Target**: {target_str}\n"
            f"📅 **Start**: {start_str} IST\n"
            f"📅 **End**: {end_str}\n"
            f"🔢 **Max Uses (Global)**: {uses_str}\n"
            f"👤 **Max Uses Per User**: {per_user_str}\n"
            "───────────────────────\n"
            "⚠️ **Verify details. Confirm and save this coupon?**"
        )

        markup = InlineKeyboardMarkup(row_width=2)
        markup.add(
            InlineKeyboardButton("✅ Confirm & Activate", callback_data="confirm_create_coupon"),
            InlineKeyboardButton("❌ Cancel", callback_data="cancel_coupon")
        )
        bot.send_message(chat_id, confirm_text, reply_markup=markup, parse_mode="Markdown")

    except ValueError:
        msg = bot.send_message(chat_id, "❌ Max uses must be a valid integer (positive number or -1 for unlimited)! Enter again:")
        bot.register_next_step_handler(msg, step_coupon_max_uses)


def db_sync_loop():
    """Background loop to periodically sync the local database cache with MongoDB Atlas."""
    while True:
        try:
            # Fetch latest data status from MongoDB Atlas every 15 seconds in the background.
            # Using load_db() without force_fetch=True is highly optimized: it only queries
            # a single status field and only reloads all collections if changes actually occurred.
            time.sleep(15)
            load_db()
        except Exception as e:
            print(f"[Admin Background Sync] Error: {e}")

if __name__ == "__main__":
    print("Admin Bot is starting...")
    # Force full database fetch from MongoDB Atlas on bot startup
    load_db(force_fetch=True)
    
    # Start sync and converter threads
    import threading
    threading.Thread(target=converter.update_rates_loop, daemon=True).start()
    threading.Thread(target=db_sync_loop, daemon=True).start()
    
    try:
        bot.remove_webhook()
    except:
        pass
        
    while True:
        try:
            print("Admin Bot is running! Press CTRL+C to stop.")
            # Increased timeout and polling parameters for better resilience
            bot.infinity_polling(timeout=60, long_polling_timeout=30)
        except Exception as e:
            # Suppress noisy conflict errors if already handled or just blipping
            if "Conflict" in str(e):
                print("⚠️ Parallel instance detected or Reconnecting... Waiting 5s.")
                time.sleep(5)
            else:
                print(f"🔄 Admin Bot Connection/Network Glitch: Reconnecting in 3 seconds... ({e})")
                time.sleep(3)

def step_edit_tutorial(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    
    chat_id = message.chat.id
    state = conv_states.get(chat_id, {})
    tut_id = state.get('tut_id')
    prompt_msg_id = state.get('prompt_msg_id')
    
    if not tut_id:
        bot.send_message(chat_id, "❌ Session expired. Please try again.")
        return
        
    new_text = message.text
    if new_text.lower() == 'cancel':
        conv_states.pop(chat_id, None)
        bot.send_message(chat_id, "❌ Edit cancelled.", reply_markup=admin_menu())
        return
        
    db = load_db()
    if tut_id == 'video_link':
        db['video_tutorial_link'] = new_text
    else:
        if 'tutorials' not in db:
            db['tutorials'] = {}
        db['tutorials'][tut_id] = new_text
    save_db(db)
    
    # Try deleting the user's text message to keep the chat clean
    try:
        bot.delete_message(chat_id, message.message_id)
    except:
        pass
        
    success_text = (
        f"✅ **Tutorial Updated Successfully!**\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"• Tutorial: `{tut_id}`\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"Users can now view the updated tutorial in the main bot."
    )
    
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("🔙 Back to Tutorials", callback_data="admin_tutorials"))
    
    if prompt_msg_id:
        try:
            bot.edit_message_text(success_text, chat_id, prompt_msg_id, reply_markup=markup, parse_mode="Markdown")
        except Exception:
            bot.send_message(chat_id, success_text, reply_markup=markup, parse_mode="Markdown")
    else:
        bot.send_message(chat_id, success_text, reply_markup=markup, parse_mode="Markdown")
        
    conv_states.pop(chat_id, None)

def step_edit_gate_val(message):
    if is_menu_button_click(message.text):
        return handle_menu(message)
    
    chat_id = message.chat.id
    state = conv_states.get(chat_id)
    if not state: return
    
    key = state['key']
    prompt_msg_id = state.get('prompt_msg_id')
    
    gate_map = {
        "CF_CLIENT_ID": "cashfree",
        "CF_SECRET": "cashfree",
        "UPI_ID": "upi_qr",
        "NOWPAYMENTS_API_KEY": "nowpayments",
        "BINANCE_PAY_ID": "binance",
        "BINANCE_API_KEY": "binance",
        "BINANCE_API_SECRET": "binance"
    }
    gate_type = gate_map.get(key, "cashfree")
    
    if message.text.lower() == 'cancel':
        conv_states.pop(chat_id, None)
        try: bot.delete_message(chat_id, message.message_id)
        except: pass
        
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 Back to Credentials", callback_data=f"conf_gate:{gate_type}"))
        if prompt_msg_id:
            bot.edit_message_text("❌ Edit cancelled.", chat_id, prompt_msg_id, reply_markup=markup)
        else:
            bot.send_message(chat_id, "❌ Edit cancelled.", reply_markup=markup)
        return
        
    new_val = message.text.strip()
    db = load_db()
    if 'payment_settings' not in db:
        db['payment_settings'] = {}
        
    db['payment_settings'][key] = new_val
    save_db(db)
    
    # Try deleting the user's text message to keep the chat clean
    try:
        bot.delete_message(chat_id, message.message_id)
    except:
        pass
        
    success_text = (
        f"✅ **Configuration Updated Successfully!**\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"• Updated Field: `{key}`\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"The store bot will now use this updated value for payments dynamically."
    )
    
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("🔙 Back to Credentials", callback_data=f"conf_gate:{gate_type}"))
    
    if prompt_msg_id:
        try:
            bot.edit_message_text(success_text, chat_id, prompt_msg_id, reply_markup=markup, parse_mode="Markdown")
        except Exception:
            bot.send_message(chat_id, success_text, reply_markup=markup, parse_mode="Markdown")
    else:
        bot.send_message(chat_id, success_text, reply_markup=markup, parse_mode="Markdown")
        
    conv_states.pop(chat_id, None)


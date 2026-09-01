import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
import os
import sys
import threading
import subprocess
import time
import json
import pymongo
import hashlib
from pymongo import UpdateOne

# ==========================================
# 🛡️ TELEGRAM BOT MIGRATION CONFIGURATION
# ==========================================

# 🛒 Main Store Bot Token
STORE_BOT_TOKEN = '8694964414:AAENl5qkR6X_JCx6SP_IuwvGWMNo617yUDE'

# 🛠️ Admin Bot Token
ADMIN_BOT_TOKEN = '8673265643:AAEHzXAQywcR2N4tajo0acJIWa5sAsfuBjs'

# 💳 CASHFREE PAYMENT GATEWAY CONFIG (DEFAULTS)
_CF_CLIENT_ID_DEFAULT = "13189604096003c23c53718d3280698131"
_CF_SECRET_DEFAULT = "cfsk_ma_prod_a02505b8be151e6c5f2187e1d147ec61_da93f571"
_CF_ENV_DEFAULT = "PRODUCTION"

# ₿ NOWPayments Crypto Config (DEFAULTS)
_NOWPAYMENTS_API_KEY_DEFAULT = 'J45CWSZ-DPRMVXQ-H1MG92T-R3KEBQP'
_NOWPAYMENTS_PUBLIC_KEY_DEFAULT = 'f51d0012-7c17-4a72-af22-88993495fb33'

# 🇮🇳 UPI UTR Verification Gateway Config (DEFAULTS)
_UPI_ID_DEFAULT = "Q356133021@ybl"
_UPI_QR_IMAGE_DEFAULT = "qr.jpg"

# 🪙 Binance Pay Config (DEFAULTS)
_BINANCE_PAY_ID_DEFAULT = "1133813547"
_BINANCE_API_KEY_DEFAULT = "ro9eZ6iormcws7AlPp1zLY5noQ4N5nvPNFlYtjTe7Y4hrgcKzEmITpLi0JcJs924"
_BINANCE_API_SECRET_DEFAULT = "v6JSV4DeUdNZnnerDL1kfIdeO1kffB8NTeTQQK6deEu5xth7to3S4zHRNwVpXrYU"

def get_payment_settings():
    db = load_db()
    default_settings = {
        "CF_CLIENT_ID": _CF_CLIENT_ID_DEFAULT,
        "CF_SECRET": _CF_SECRET_DEFAULT,
        "CF_ENV": _CF_ENV_DEFAULT,
        "NOWPAYMENTS_API_KEY": _NOWPAYMENTS_API_KEY_DEFAULT,
        "UPI_ID": _UPI_ID_DEFAULT,
        "BINANCE_PAY_ID": _BINANCE_PAY_ID_DEFAULT,
        "BINANCE_API_KEY": _BINANCE_API_KEY_DEFAULT,
        "BINANCE_API_SECRET": _BINANCE_API_SECRET_DEFAULT
    }
    if 'payment_settings' not in db:
        db['payment_settings'] = default_settings
        save_db(db)
        
    settings = default_settings.copy()
    settings.update(db.get('payment_settings', {}))
    return settings

# For backwards compatibility during startup imports
CF_CLIENT_ID = _CF_CLIENT_ID_DEFAULT
CF_SECRET = _CF_SECRET_DEFAULT
CF_ENV = _CF_ENV_DEFAULT
NOWPAYMENTS_API_KEY = _NOWPAYMENTS_API_KEY_DEFAULT
UPI_ID = _UPI_ID_DEFAULT
BINANCE_PAY_ID = _BINANCE_PAY_ID_DEFAULT
BINANCE_API_KEY = _BINANCE_API_KEY_DEFAULT
BINANCE_API_SECRET = _BINANCE_API_SECRET_DEFAULT
UPI_QR_IMAGE = _UPI_QR_IMAGE_DEFAULT

# 📢 Mandatory Channel Config
CHANNEL_USERNAME = "@quantumxdservices"
CHANNEL_LINK = "https://t.me/quantumxdservices"

# 📢 Mandatory Group Config (Private Group)
# IMPORTANT: Bot must be an admin in this group to check membership!
GROUP_CHAT_ID = "-1003696353687"  # You MUST enter the numeric chat ID here (e.g. -100123456789)
GROUP_LINK = "https://t.me/+nZBLQ8dwgUgwYTc1"

# ☁️ MongoDB Atlas Config
MONGO_URI = "mongodb+srv://arafatamingazi_db_user:201fPycnoVv25zGp@cluster0.wliqzg8.mongodb.net/"


# ==========================================
# 🗄️ DATABASE MANAGER (MongoDB)
# ==========================================

# Connect to MongoDB
try:
    client = pymongo.MongoClient(MONGO_URI)
    client.admin.command('ping')
    # print("[SUCCESS] Connected to MongoDB Atlas successfully!") # Removed to avoid clutter when bots import this
except Exception as e:
    print(f"[ERROR] Failed to connect to MongoDB Atlas: {e}")
    client = None

# Database name
if client:
    db_name = MONGO_URI.split('/')[-1].split('?')[0]
    if not db_name:
        db_name = 'telegram_store_bot'
    db_mongo = client[db_name]

# --- Caching Mechanism ---
_cached_db = None
_last_sync_time = 0
_hash_cache = {}

def get_hash(obj):
    # Hashes a dict/list safely. Useful for detecting changes before sending to MongoDB
    return hashlib.md5(json.dumps(obj, sort_keys=True).encode()).hexdigest()

def _default_db():
    return {
        "products": {}, "users": {}, "categories": {},
        "admin_credentials": {}, "admin_ids": [], "admin_id": 0,
        "sorting_mode": "auto",
        "support_username": "quantumsera",
        "sales": [], "deposits": [],
        "discounts": {}, "coupons": {},
        "referral_enabled": True,
        "referral_reward": 20.0,
        "referral_min_deposit": 100.0,
        "upi_payments": [],
        "tutorials": {
            "how_to_topup": """🟢 *HOW TO TOP UP BALANCE*\n\n1️⃣ Go to the **Main Menu** and click on 💳 *Add Balance*.\n2️⃣ You will see a list of available payment methods (e.g., UPI QR, Cashfree, Crypto).\n3️⃣ Click on your preferred method.\n4️⃣ Enter the exact amount you want to add to your wallet.\n5️⃣ Complete the payment and provide any required transaction ID or UTR number for verification.\n6️⃣ Once verified, the funds will instantly appear in your 👤 *My Account* balance!\n\n_Note: If your balance doesn't update automatically within a few minutes, please contact Admin Support._""",
            
            "how_to_buy": """🛒 *HOW TO BUY PRODUCTS*\n\n1️⃣ From the **Main Menu**, click on 🛍️ *Explore Store* or 🔍 *Search Product*.\n2️⃣ Browse through the categories and select the product you wish to purchase.\n3️⃣ Check the product details, stock availability, and select any variants if prompted.\n4️⃣ Click the **Buy Now** button.\n5️⃣ The exact amount will be deducted directly from your bot wallet balance.\n6️⃣ Your purchased product details (like license keys, accounts, or files) will be delivered to you instantly in the chat!\n\n_💡 Tip: Make sure you have enough wallet balance before initiating a purchase._""",
            
            "product_support": """🛠 *HOW TO GET PRODUCT SUPPORT*\n\nIf you experience any issues with a product you purchased (e.g., invalid account, non-working key, or delivery error):\n\n1️⃣ Open the **Main Menu** and click on 💬 *Help & Support*.\n2️⃣ Click on **📦 Product Support**.\n3️⃣ Select the specific order/product you are having issues with from your order history.\n4️⃣ A dedicated chat session will open where you can describe your issue directly to our support team.\n5️⃣ We will review your request and provide a replacement or refund if applicable.\n\n_⚠️ Important: Do not contact the admin directly for product replacements; always use the Product Support menu to ensure faster resolution!_""",
            
            "admin_support": """👨‍💻 *HOW TO GET ADMIN SUPPORT*\n\nIf you have general inquiries, partnership requests, severe account issues, or payment disputes, you can contact the Admin.\n\n1️⃣ Open the **Main Menu** and click on 💬 *Help & Support*.\n2️⃣ Click on **👨‍💻 Admin Support**.\n3️⃣ This will redirect you to the Admin's contact profile.\n\n📞 *Direct Admin ID:* @qxdbotowner\n\n_Please send a clear, detailed message explaining your issue and wait patiently for a response. Spamming will lead to a ban._"""
        },
        "video_tutorial_link": "https://t.me/howtousebotqxd",
        "communities": {},
        "payment_methods": {"cashfree": True, "upi_qr": True, "crypto": True, "binance_pay": True},
        "theme_settings": {
            "button_icons": {
                "explore_store": "🛍️",
                "my_account": "👤",
                "search_product": "🔍",
                "add_balance": "💳",
                "help_support": "💬",
                "back_button": "🔙"
            },
            "premium_emojis": {
                "home": "",
                "products": "",
                "account": "",
                "balance": "",
                "orders": "",
                "help": ""
            }
        }
    }

def load_db(force_fetch=False):
    global _cached_db, _last_sync_time, _hash_cache
    if not client: return _default_db()

    try:
        now = time.time()
        # If we synced recently (within 20 seconds) and not forcing a fetch, return in-memory cache instantly (0ms)
        if not force_fetch and _cached_db is not None and (now - _last_sync_time) < 20:
            return _cached_db

        # If we have cached data, only verify modification time to see if we need a full sync
        if not force_fetch and _cached_db is not None:
            try:
                mod_doc = db_mongo.system.find_one({'_id': 'last_modified'}, projection={'time': 1})
                server_mod_time = mod_doc.get('time', 0) if mod_doc else 0
                if server_mod_time <= _last_sync_time:
                    _last_sync_time = now # Update sync time to now to postpone next check
                    return _cached_db
            except Exception as e:
                # If checking modification time fails, use cache gracefully
                print(f"[load_db] MongoDB check failed, serving cache: {e}")
                return _cached_db

        # Otherwise perform full load (either forced, cache is None, or server has new updates)
        db = _default_db()
        _hash_cache.clear()
        
        for u in db_mongo.users.find(): 
            str_id = str(u.pop('_id'))
            db['users'][str_id] = u
            _hash_cache[f"user_{str_id}"] = get_hash(u)
            
        for p in db_mongo.products.find(): 
            str_id = str(p.pop('_id'))
            db['products'][str_id] = p
            _hash_cache[f"prod_{str_id}"] = get_hash(p)
            
        for c in db_mongo.categories.find(): 
            str_id = str(c.pop('_id'))
            db['categories'][str_id] = c
            _hash_cache[f"cat_{str_id}"] = get_hash(c)
            
        sales_doc = db_mongo.system.find_one({'_id': 'sales'})
        if sales_doc: 
            db['sales'] = sales_doc.get('data', [])
            _hash_cache["sales"] = get_hash(db['sales'])
            
        deposits_doc = db_mongo.system.find_one({'_id': 'deposits'})
        if deposits_doc: 
            db['deposits'] = deposits_doc.get('data', [])
            _hash_cache["deposits"] = get_hash(db['deposits'])

        upi_payments_doc = db_mongo.system.find_one({'_id': 'upi_payments'})
        if upi_payments_doc: 
            db['upi_payments'] = upi_payments_doc.get('data', [])
            _hash_cache["upi_payments"] = get_hash(db['upi_payments'])

        discounts_doc = db_mongo.system.find_one({'_id': 'discounts'})
        if discounts_doc: 
            db['discounts'] = discounts_doc.get('data', {})
            _hash_cache["discounts"] = get_hash(db['discounts'])

        coupons_doc = db_mongo.system.find_one({'_id': 'coupons'})
        if coupons_doc: 
            db['coupons'] = coupons_doc.get('data', {})
            _hash_cache["coupons"] = get_hash(db['coupons'])
            
        tutorials_doc = db_mongo.system.find_one({'_id': 'tutorials'})
        if tutorials_doc: 
            db['tutorials'] = tutorials_doc.get('data', _default_db()['tutorials'])
            _hash_cache["tutorials"] = get_hash(db['tutorials'])
            
        config_doc = db_mongo.system.find_one({'_id': 'config'})
        if config_doc:
            db['admin_credentials'] = config_doc.get('admin_credentials', {})
            db['admin_ids'] = config_doc.get('admin_ids', [])
            db['admin_id'] = config_doc.get('admin_id', 0)
            db['sorting_mode'] = config_doc.get('sorting_mode', 'auto')
            db['support_username'] = config_doc.get('support_username', 'quantumsera')
            db['referral_enabled'] = config_doc.get('referral_enabled', True)
            db['referral_reward'] = config_doc.get('referral_reward', 20.0)
            db['referral_min_deposit'] = config_doc.get('referral_min_deposit', 100.0)
            db['payment_methods'] = config_doc.get('payment_methods', {"cashfree": True, "upi_qr": True, "crypto": True, "binance_pay": True})
            db['video_tutorial_link'] = config_doc.get('video_tutorial_link', "https://t.me/howtousebotqxd")
            db['communities'] = config_doc.get('communities', {})
            _hash_cache["config"] = get_hash({
                'admin_credentials': db['admin_credentials'],
                'admin_ids': db['admin_ids'],
                'admin_id': db['admin_id'],
                'sorting_mode': db['sorting_mode'],
                'support_username': db['support_username'],
                'referral_enabled': db['referral_enabled'],
                'referral_reward': db['referral_reward'],
                'referral_min_deposit': db['referral_min_deposit'],
                'payment_methods': db['payment_methods'],
                'video_tutorial_link': db['video_tutorial_link'],
                'communities': db['communities']
            })
            
        _cached_db = db
        _last_sync_time = time.time()
        return db
    except Exception as e:
        print(f"[ERROR] Error loading from MongoDB: {e}")
        return _cached_db if _cached_db else _default_db()

def save_db(db):
    global _cached_db, _last_sync_time, _hash_cache
    if not client: return
    _cached_db = db
    try:
        changed = False
        
        # 1. Users
        users_bulk = []
        for k, v in db.get('users', {}).items():
            h = get_hash(v)
            if _hash_cache.get(f"user_{k}") != h:
                users_bulk.append(UpdateOne({'_id': str(k)}, {'$set': v}, upsert=True))
                _hash_cache[f"user_{k}"] = h
                changed = True
        if users_bulk: db_mongo.users.bulk_write(users_bulk)
            
        # 2. Products
        current_pids = list(db.get('products', {}).keys())
        pids_h = get_hash(sorted(current_pids))
        if _hash_cache.get("all_pids") != pids_h:
            res = db_mongo.products.delete_many({'_id': {'$nin': current_pids}})
            if res.deleted_count > 0: changed = True
            _hash_cache["all_pids"] = pids_h

        prods_bulk = []
        for k, v in db.get('products', {}).items():
            h = get_hash(v)
            if _hash_cache.get(f"prod_{k}") != h:
                prods_bulk.append(UpdateOne({'_id': str(k)}, {'$set': v}, upsert=True))
                _hash_cache[f"prod_{k}"] = h
                changed = True
        if prods_bulk: db_mongo.products.bulk_write(prods_bulk)
            
        # 3. Categories
        current_cids = list(db.get('categories', {}).keys())
        cids_h = get_hash(sorted(current_cids))
        if _hash_cache.get("all_cids") != cids_h:
            res = db_mongo.categories.delete_many({'_id': {'$nin': current_cids}})
            if res.deleted_count > 0: changed = True
            _hash_cache["all_cids"] = cids_h

        cats_bulk = []
        for k, v in db.get('categories', {}).items():
            h = get_hash(v)
            if _hash_cache.get(f"cat_{k}") != h:
                cats_bulk.append(UpdateOne({'_id': str(k)}, {'$set': v}, upsert=True))
                _hash_cache[f"cat_{k}"] = h
                changed = True
        if cats_bulk: db_mongo.categories.bulk_write(cats_bulk)
            
        # 4. Sales
        sales_data = db.get('sales', [])
        sales_h = get_hash(sales_data)
        if _hash_cache.get("sales") != sales_h:
            db_mongo.system.update_one({'_id': 'sales'}, {'$set': {'data': sales_data}}, upsert=True)
            _hash_cache["sales"] = sales_h
            changed = True
            
        # 5. Deposits
        deposits_data = db.get('deposits', [])
        deposits_h = get_hash(deposits_data)
        if _hash_cache.get("deposits") != deposits_h:
            db_mongo.system.update_one({'_id': 'deposits'}, {'$set': {'data': deposits_data}}, upsert=True)
            _hash_cache["deposits"] = deposits_h
            changed = True

        # upi_payments
        upi_payments_data = db.get('upi_payments', [])
        upi_payments_h = get_hash(upi_payments_data)
        if _hash_cache.get("upi_payments") != upi_payments_h:
            db_mongo.system.update_one({'_id': 'upi_payments'}, {'$set': {'data': upi_payments_data}}, upsert=True)
            _hash_cache["upi_payments"] = upi_payments_h
            changed = True
            
        # tutorials
        tutorials_data = db.get('tutorials', _default_db()['tutorials'])
        tutorials_h = get_hash(tutorials_data)
        if _hash_cache.get("tutorials") != tutorials_h:
            db_mongo.system.update_one({'_id': 'tutorials'}, {'$set': {'data': tutorials_data}}, upsert=True)
            _hash_cache["tutorials"] = tutorials_h
            changed = True
            
        # 6. Config
        config_data = {
            'admin_credentials': db.get('admin_credentials', {}),
            'admin_ids': db.get('admin_ids', []),
            'admin_id': db.get('admin_id', 0),
            'sorting_mode': db.get('sorting_mode', 'auto'),
            'support_username': db.get('support_username', 'quantumsera'),
            'referral_enabled': db.get('referral_enabled', True),
            'referral_reward': db.get('referral_reward', 20.0),
            'referral_min_deposit': db.get('referral_min_deposit', 100.0),
            'payment_methods': db.get('payment_methods', {"cashfree": True, "upi_qr": True, "crypto": True, "binance_pay": True}),
            'video_tutorial_link': db.get('video_tutorial_link', 'https://t.me/howtousebotqxd'),
            'communities': db.get('communities', {})
        }
        config_h = get_hash(config_data)
        if _hash_cache.get("config") != config_h:
            db_mongo.system.update_one({'_id': 'config'}, {'$set': config_data}, upsert=True)
            _hash_cache["config"] = config_h
            changed = True
            
        # 7. Discounts
        discounts_data = db.get('discounts', {})
        discounts_h = get_hash(discounts_data)
        if _hash_cache.get("discounts") != discounts_h:
            db_mongo.system.update_one({'_id': 'discounts'}, {'$set': {'data': discounts_data}}, upsert=True)
            _hash_cache["discounts"] = discounts_h
            changed = True
            
        # 8. Coupons
        coupons_data = db.get('coupons', {})
        coupons_h = get_hash(coupons_data)
        if _hash_cache.get("coupons") != coupons_h:
            db_mongo.system.update_one({'_id': 'coupons'}, {'$set': {'data': coupons_data}}, upsert=True)
            _hash_cache["coupons"] = coupons_h
            changed = True
            
        if changed:
            current_time = time.time()
            db_mongo.system.update_one({'_id': 'last_modified'}, {'$set': {'time': current_time}}, upsert=True)
            _cached_db = db
            _last_sync_time = current_time

    except Exception as e:
        print(f"[ERROR] Error saving to MongoDB: {e}")

def load_payments():
    if not client: return []
    try:
        doc = db_mongo.system.find_one({'_id': 'payments'})
        return doc.get('data', []) if doc else []
    except:
        return []

def save_payment(order_id):
    if not client: return
    try:
        db_mongo.system.update_one({'_id': 'payments'}, {'$addToSet': {'data': order_id}}, upsert=True)
    except Exception as e:
        print(f"Error saving payment: {e}")

def safe_load_notifs():
    if not client: return []
    try:
        doc = db_mongo.system.find_one({'_id': 'notifications'})
        return doc.get('data', []) if doc else []
    except:
        return []

def save_notifs(notifs):
    if not client: return
    try:
        db_mongo.system.update_one({'_id': 'notifications'}, {'$set': {'data': notifs}}, upsert=True)
    except Exception as e:
        print(f"Error saving notifs: {e}")


def check_and_reward_referrer(db, referred_user_id):
    """
    Checks if the referred user has met the deposit requirement for referral reward.
    If yes, credits the referrer and updates status.
    Returns: (referrer_id, reward_amount) if reward was given, else None
    """
    if not db.get('referral_enabled', True):
        return None
        
    users = db.get('users', {})
    user = users.get(str(referred_user_id))
    if not user:
        return None
        
    referrer_id = user.get('referred_by')
    if not referrer_id:
        return None
        
    if user.get('referral_reward_claimed'):
        return None
        
    min_deposit = db.get('referral_min_deposit', 100.0)
    reward_amount = db.get('referral_reward', 20.0)
    
    total_dep = user.get('total_deposit', 0.0)
    if total_dep >= min_deposit:
        # Give reward to referrer
        referrer = users.get(str(referrer_id))
        if referrer:
            referrer['balance'] = referrer.get('balance', 0.0) + reward_amount
            referrer['referral_earnings'] = referrer.get('referral_earnings', 0.0) + reward_amount
            referrer['successful_referrals'] = referrer.get('successful_referrals', 0) + 1
            
            user['referral_reward_claimed'] = True
            return str(referrer_id), reward_amount
            
    return None


# ==========================================
# 🚀 AUTO-RUNNER SCRIPT
# ==========================================

# Set working directory to the script's folder
os.chdir(os.path.dirname(os.path.abspath(__file__)))

def run_bot(script_name, bot_title):
    """Function to run a bot script and restart it if it crashes."""
    while True:
        print(f"\n[*] Starting {bot_title} ({script_name})...")
        try:
            process = subprocess.Popen(
                [sys.executable, script_name],
                stdout=None,
                stderr=None
            )
            process.wait()
            print(f"\n[!] {bot_title} stopped with exit code {process.returncode}.")
        except Exception as e:
            print(f"\n[!] Error running {bot_title}: {e}")
        
        print(f"[*] Restarting {bot_title} in 5 seconds... (Press Ctrl+C to stop all)")
        time.sleep(5)

if __name__ == "__main__":
    print("====================================================")
    print("        TELEGRAM BOT MULTI-MANAGER (QUANTUM)")
    print("====================================================")
    print("[*] Initializing bots & MongoDB Atlas...")

    admin_thread = threading.Thread(target=run_bot, args=("admin.py", "Admin Bot"), daemon=True)
    main_thread = threading.Thread(target=run_bot, args=("main.py", "Store Bot"), daemon=True)

    admin_thread.start()
    time.sleep(2)
    main_thread.start()

    print("[OK] Both bots are now running in this terminal.")
    print("[!] DO NOT CLOSE THIS WINDOW if you want the bots to stay online.")
    print("====================================================\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[!] Shutting down bots...")
        sys.exit(0)

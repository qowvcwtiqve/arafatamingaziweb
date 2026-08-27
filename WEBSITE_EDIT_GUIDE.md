# 🛠️ QuantumXD Store — Complete Customization & Editing Guide

Ye guide aapko batayegi ki website ke kisi bhi hisse (Theme, Texts, Admin Panel, Products, Payments, Backend) ko kaise safely edit karein bina kisi purani cheez ko kharab kiye.

---

## 📁 1. Project Directory Architecture

```
wokiee_v3.3.0/
├── start-dev.bat                      # ⚡ One-click dev servers launcher
├── Update_Website.bat                 # 🔄 Git pull & update script
│
├── frontend/                          # 🎨 Next.js 14 Web Application
│   ├── config/
│   │   └── siteConfig.js             # 🌟 MAIN CENTRAL CONFIG (Edit site texts, socials, FAQs here)
│   ├── app/
│   │   ├── globals.css                # 🎨 THEME & COLORS (Edit accent colors, backgrounds, fonts)
│   │   ├── layout.jsx                 # 🌐 Root Layout
│   │   ├── page.jsx                   # 🏠 Homepage
│   │   ├── products/                  # 🛍️ Store catalog & single product page
│   │   ├── cart/ & checkout/          # 💳 Cart & Payment checkout
│   │   ├── dashboard/                 # 👤 User dashboard & order receipts
│   │   └── admin/                     # 🛡️ Admin Panel Main Page
│   ├── components/                    # 🧩 MODULAR REUSABLE UI COMPONENTS
│   │   ├── admin/                     # Admin tab modules (Orders, Products, Payments, Coupons)
│   │   ├── home/                      # Homepage sections (Hero, Categories, FAQ, Telegram)
│   │   ├── layout/                    # Header, Footer, Logo, CurrencySelector
│   │   └── product/                   # ProductCard, IconBanners
│   └── store/                         # 📦 Global State (authStore, cartStore, currencyStore)
│
└── backend/                           # 🚀 Node.js / Express API Server
    ├── src/
    │   ├── server.js                  # Express App & Background Cron Task
    │   ├── config/                    # PostgreSQL & MongoDB connection pools
    │   ├── routes/                    # API Route endpoints (/api/admin, /api/payments, etc.)
    │   ├── controllers/               # Business controllers
    │   └── services/                  # Payment gateways (UPI, Crypto, Binance, Orders)
```

---

## 🌟 2. Quick Edits (Bina Kisi Code Ko Chhede)

### 🔹 A. Website Name, Telegram Link, Email & FAQs Change Karna:
👉 **File:** `frontend/config/siteConfig.js`
Is single file me aap change kar sakte hain:
- Store Name & Tagline
- Telegram Channel Link (`socials.telegramChannel`)
- Helpdesk Email (`socials.supportEmail`)
- FAQ Questions & Answers (`faqs` array)
- Footer Links (`footerLinks`)

*Isko edit karne par pure website me links aur texts automatically update ho jate hain.*

---

### 🔹 B. Website Colors & Theme Change Karna:
👉 **File:** `frontend/app/globals.css` (Line 1 se 40 tak)
Theme colors CSS variables me defined hain:
```css
:root {
  --color-primary: #6E3AFF;         /* Main Violet Accent */
  --color-primary-glow: rgba(110, 58, 255, 0.4);
  --color-cyan: #00D4FF;            /* Cyan Secondary Glow */
  --color-bg: #080B14;              /* Main Background */
  --color-surface: #0E1322;         /* Card / Panel Background */
  --color-text: #F0F4FF;            /* Main Text Color */
}
```
*Sirf in color codes ko badalne se puri website ka look-and-feel change ho jayega.*

---

## 🛡️ 3. Admin Panel Ko Edit Ya New Tab Add Karna

Admin panel bilkul modular hai (`frontend/components/admin/`). Har tab alag file me hai:
- `OrdersManagementTab.jsx` — Website Orders status & keys management
- `ProductsManagementTab.jsx` — Products listing & stock pools
- `PaymentSettingsTab.jsx` — UPI, Crypto, Binance keys toggle
- `CouponsTab.jsx` — Discount coupons management
- `UserDetailModal.jsx` — User balance & account details

### ➕ New Tab Add Karne Ka Safe Tarika:
1. `frontend/components/admin/` me nayi file banayein, e.g., `NewFeatureTab.jsx`.
2. `frontend/app/admin/page.jsx` me:
   - `TABS` array me ek nayi entry add karein:
     ```js
     { id: 'newfeature', label: 'New Feature', icon: Sparkles }
     ```
   - Niche conditional render laga dein:
     ```jsx
     {activeTab === 'newfeature' && <NewFeatureTab />}
     ```
*Aisa karne se purane kisi bhi tab par koi asar nahi padega.*

---

## 🛍️ 4. New Page / URL Add Karna

Next.js 14 App Router use ho raha hai:
- Naya page banane ke liye `frontend/app/` ke andar ek naya folder banayein, e.g., `frontend/app/offers/page.jsx`.
- Page ka component export karein:
  ```jsx
  export default function OffersPage() {
    return <div className="container"><h1>Special Offers</h1></div>;
  }
  ```
- Yeh page automatically `http://localhost:3000/offers` par live ho jayega.

---

## 🚀 5. New Backend API Route Add Karna

- Naya API route banane ke liye `backend/src/routes/` me file banayein ya existing me router add karein:
  ```js
  router.get('/my-endpoint', async (req, res, next) => {
    res.json({ success: true, data: [] });
  });
  ```
- `backend/src/server.js` me use karein:
  ```js
  app.use('/api/my-feature', myFeatureRoutes);
  ```

---

## ✅ Best Practices (Taaki Kuch Kharab Na Ho)
1. **Zustand Stores (`frontend/store/`)**: Auth ya Cart state me naye actions add karein, purane functions ke signatures ko na badlein.
2. **API Calls (`frontend/lib/api.js`)**: Hamesha `api.get()` ya `api.post()` use karein taaki JWT tokens aur base URL automatically handle hon.
3. **Responsive Testing**: Kisi bhi CSS change ke baad mobile viewport (F12 inspect) par zaroor check karein.

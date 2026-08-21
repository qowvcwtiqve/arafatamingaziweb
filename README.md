# ⚡ QuantumXD Store — Full Stack Digital Products Marketplace

A state-of-the-art full-stack digital product marketplace and instant delivery e-commerce platform built with **Next.js 14**, **Node.js/Express**, and **PostgreSQL (Supabase)**.

---

## 🎨 Futuristic Design & Aesthetics
- **Futuristic Space Theme**: Deep space black (`#080B14`) with electric violet (`#6E3AFF`) to cyan (`#00D4FF`) gradient accents.
- **Glassmorphism**: Translucent frosted panels with `backdrop-filter: blur(20px)`.
- **Zero Emojis**: 100% clean Google Material Symbols outlined iconography + official SVG brand logos.
- **Micro-Interactions**: Parallax cards, glowing focus rings, responsive drawers, and animated skeletons.

---

## 💳 Payment Integrations (1:1 with your Bot Logic)

| Gateway | Verification Method | Features |
|---|---|---|
| **UPI / QR Code** | **Automated via Gmail IMAP** | Generates unique fingerprinted amounts (e.g. ₹499.37), matches Razorpay payment emails automatically within 60 seconds, anti double-spend protection. |
| **NowPayments (Crypto)** | **Automated API Polling** | Creates crypto invoice, accepts 100+ coins (BTC, ETH, USDT, SOL, LTC), polls status every 60s, marks paid on `finished`. |
| **Binance Pay** | **HMAC API Verification** | Displays Binance Pay ID, user submits Transaction ID / Order ID, backend verifies directly against Binance API. |

---

## 🚀 Instant Digital Delivery System
- **Single License Keys / Stock Pools**: Pops next key from database upon payment.
- **Infinite Stock Items**: Delivers master access links or universal keys automatically.
- **Secure Signed Downloads**: Generates single-use 30-day tokens with download limits.
- **Automated Delivery Email**: Sends HTML receipt with download links via Gmail SMTP.

---

## 📂 Project Architecture

```
wokiee_v3.3.0/
├── start-dev.bat                # ⚡ One-click Windows launch script
├── backend/                     # 🚀 Node.js / Express API Server
│   ├── .env                     # Pre-configured with your real credentials
│   ├── src/
│   │   ├── server.js            # Express server & background payment poller
│   │   ├── config/db.js         # PostgreSQL connection pool
│   │   ├── db/schema.sql        # Full PostgreSQL database schema
│   │   ├── middleware/          # Auth, JWT, Error handling, Rate limiters
│   │   ├── routes/              # Auth, Products, Payments, Users, Admin, Download
│   │   ├── controllers/         # Business logic
│   │   └── services/            # UPI IMAP, NowPayments, Binance Pay, Email
│   └── package.json
│
└── frontend/                    # ⚛️ Next.js 14 Web Application
    ├── app/
    │   ├── layout.jsx           # Root layout with Material Symbols & Header/Footer
    │   ├── page.jsx             # Futuristic Homepage
    │   ├── globals.css          # Design system & tokens
    │   ├── products/            # Catalog with filters & search
    │   ├── products/[slug]/     # Product detail page
    │   ├── checkout/            # Interactive payment tabs (UPI, Crypto, Binance)
    │   ├── dashboard/           # User downloads & order history
    │   ├── admin/               # Complete Admin Panel (Products, Orders, Users, Coupons)
    │   ├── download/[token]/    # Secure download verification page
    │   ├── contact/             # Support page
    │   └── faq/, terms/, privacy/, refund/
    ├── components/              # Reusable UI cards, drawers, headers
    ├── store/                   # Zustand stores (cartStore, authStore)
    └── package.json
```

---

## ⚡ How to Run Locally

### 1. Quick Launch (Windows)
Double-click **`start-dev.bat`** in the project root. It will start both backend (port 5000) and frontend (port 3000) simultaneously.

### 2. Manual Commands
**Backend:**
```bash
cd backend
pnpm dev
```

**Frontend:**
```bash
cd frontend
pnpm dev
```

- **Frontend URL:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **Admin Panel:** [http://localhost:3000/admin](http://localhost:3000/admin) (Default admin: `admin@quantumxd.store` / `admin123`)

---

## 🌐 Production Deployment Guide

### Database (Free PostgreSQL on Supabase)
1. Create a free database at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** and run the contents of [`backend/src/db/schema.sql`](file:///c:/Users/Pradip%20-%20hp/Downloads/wokiee_v3.3.0/backend/src/db/schema.sql).
3. Copy your database connection string and paste into `DATABASE_URL` in `backend/.env`.

### Backend (Railway / Render / VPS)
- Deploy the `backend/` folder on [railway.app](https://railway.app) or your VPS.
- Set environment variables matching your `.env`.

### Frontend (Vercel)
- Import your repository into [vercel.com](https://vercel.com).
- Set Root Directory to `frontend`.
- Add environment variable `NEXT_PUBLIC_API_URL=https://your-backend-domain.com`.

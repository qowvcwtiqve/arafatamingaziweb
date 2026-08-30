/**
 * ⚡ QuantumXD Store — Central Site Configuration
 * 
 * Saari main website details, contact info, social links, FAQs, 
 * aur text content yahan se easily customize kiya ja sakta hai.
 * Kisi bhi file me direct code chhedne ki zaroorat nahi hai.
 */

export const siteConfig = {
  // Store Branding & Identity
  brand: {
    name: 'QuantumXD Store',
    tagline: 'Instant Automated Delivery for Digital Subscriptions & Licenses',
    shortDescription: 'Instant automated delivery for premium digital software, subscriptions & licenses with 100% warranty.',
    logoText: 'QuantumXD',
    domain: 'https://quantumxd.store',
  },

  // Support & Social Links (Easily change your Telegram & Email here)
  socials: {
    telegramChannel: 'https://t.me/quantumxdservices',
    telegramSupport: 'https://t.me/quantumxdservices',
    supportEmail: 'support@quantumxd.store',
    telegramHandle: '@quantumxdservices',
  },

  // Supported Payment Gateways info
  payments: {
    upiEnabled: true,
    cryptoEnabled: true,
    binancePayEnabled: true,
    cashfreeEnabled: true,
    badges: [
      { name: 'UPI Auto QR', icon: 'account_balance', color: 'var(--color-cyan)' },
      { name: 'Crypto (NowPayments)', icon: 'currency_bitcoin', color: 'var(--color-accent)' },
      { name: 'Binance Pay', icon: 'account_balance_wallet', color: '#F0B90B' },
    ],
  },

  // Home Page FAQs (Add or edit questions here)
  faqs: [
    {
      q: 'How fast is digital product delivery?',
      a: 'Delivery is 100% automated and instant. As soon as your UPI, Binance Pay, or Crypto transaction is verified, your product credentials and activation keys appear right on your screen and in your dashboard.'
    },
    {
      q: 'Which payment methods are accepted?',
      a: 'We accept automated UPI QR code (Google Pay, PhonePe, Paytm, BHIM), Binance Pay (0% transaction fee), and over 100+ Cryptocurrencies (USDT, BTC, ETH, SOL, LTC) via automated gateway.'
    },
    {
      q: 'What if I face any issue with my account or key?',
      a: 'We offer full replacement and warranty support. If any license or credentials encounter an issue within the warranty duration, our 24/7 Telegram support team will resolve or replace it immediately.'
    },
    {
      q: 'Can I top up my store wallet balance?',
      a: 'Yes! You can top up your QuantumXD Store wallet in your dashboard with 1 click using UPI or Crypto, and enjoy 1-click instant checkouts anytime.'
    },
    {
      q: 'How do I contact customer support?',
      a: 'You can reach out to us 24/7 on our official Telegram channel (@quantumxdservices) or email us directly at support@quantumxd.store.'
    }
  ],

  // Footer Navigation Links
  footerLinks: {
    Store: [
      { href: '/products', label: 'All Products' },
      { href: '/products?featured=true', label: 'Featured Top Picks' },
      { href: '/products?sort=newest', label: 'Latest Arrivals' },
      { href: '/products?sort=popular', label: 'Most Popular' },
    ],
    Support: [
      { href: '/tickets', label: 'Help & Support' },
      { href: 'mailto:support@quantumxd.store', label: 'Email Support' },
      { href: '/faq', label: 'Frequently Asked Questions' },
    ],
    Legal: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
      { href: '/refund', label: 'Refund & Warranty Policy' },
    ],
  },
};

export default siteConfig;

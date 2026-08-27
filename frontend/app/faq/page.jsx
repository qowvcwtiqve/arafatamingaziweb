'use client';
import { useState } from 'react';
import Link from 'next/link';

const FAQS = [
  {
    q: 'How does digital product delivery work?',
    a: 'Immediately after your payment is confirmed (via UPI, NowPayments Crypto, or Binance Pay), your license keys, credentials, or download links will be displayed directly on your screen, saved to your account dashboard under "My Orders", and sent to your email with a secure access token.',
  },
  {
    q: 'Why are digital products non-refundable once delivered?',
    a: 'Unlike physical goods, digital license keys, accounts, and private credentials are exposed and usable immediately upon delivery. Because a digital key cannot be physically returned or un-seen, all delivered sales are final and non-refundable.',
  },
  {
    q: 'What if a key or credential does not work upon delivery?',
    a: 'If a license key is invalid or defective, our support team will test and provide a working replacement within 24 hours. If a replacement is unavailable, we will issue a 100% refund directly to your QuantumXD Store Wallet.',
  },
  {
    q: 'How does the Store Wallet work for refunds and balances?',
    a: 'Any approved refund, deposit, or promotional credit is added to your Store Wallet. Wallet balance never expires and can be used with 1-click instant checkout across any item in our store. Wallet funds cannot be withdrawn to external bank accounts.',
  },
  {
    q: 'What happens if a user initiates a chargeback or bank dispute?',
    a: 'We maintain a strict zero-tolerance policy against fraudulent chargebacks and friendly fraud. Any unauthorized payment dispute results in immediate permanent account termination, revocation of all purchased digital licenses, and blacklisting across merchant fraud networks.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept Indian UPI (GPay, PhonePe, Paytm, BHIM) with automatic instant QR verification, all major Cryptocurrencies via NowPayments (BTC, ETH, USDT, LTC, SOL, etc.), Binance Pay, and QuantumXD Store Wallet Balance.',
  },
  {
    q: 'How does UPI payment verification work?',
    a: 'Our checkout generates a dynamic UPI QR code. You simply scan with any UPI app and pay the exact amount. Our backend automatically detects the receipt from the payment gateway within 1-2 minutes and unlocks your order.',
  },
  {
    q: 'Can I cancel a pre-order?',
    a: 'Yes! Pre-orders in the processing queue can be cancelled at any time before key dispatch begins. When cancelled, 100% of the purchase amount is instantly refunded to your Store Wallet.',
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState(0);

  return (
    <div style={{ padding: '100px 0 60px' }}>
      <div className="container" style={{ maxWidth: 840 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="hero__tag" style={{ margin: '0 auto 16px' }}>
            <span className="icon icon--sm icon--filled">help</span>
            Got Questions?
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 700, marginBottom: 12 }}>
            Frequently Asked <span className="text-gradient">Questions</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Everything you need to know about payments, digital delivery, and licensing.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQS.map((faq, idx) => (
            <div key={idx} className="card card--elevated" style={{ padding: 20, cursor: 'pointer' }} onClick={() => setOpen(open === idx ? -1 : idx)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 600, color: open === idx ? 'var(--color-primary-light)' : 'var(--color-text)' }}>
                  {faq.q}
                </h3>
                <span className="icon icon--sm" style={{ transform: open === idx ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--color-text-faint)' }}>
                  expand_more
                </span>
              </div>
              {open === idx && (
                <p style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border)', fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, textAlign: 'center', padding: 32, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Still have questions?</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 20 }}>Our 24/7 team is available on Telegram to assist you with any questions or order queries.</p>
          <Link href="/contact" className="btn btn--primary btn--sm">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import Link from 'next/link';

const FAQS = [
  {
    q: 'How does digital product delivery work?',
    a: 'Immediately after your payment is confirmed (via UPI, NowPayments Crypto, or Binance Pay), your product will be displayed directly on screen, saved to your account dashboard under "My Downloads", and sent to your email with a secure download token.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept Indian UPI (GPay, PhonePe, Paytm, BHIM) with automatic instant verification, all major Cryptocurrencies via NowPayments (BTC, ETH, USDT, LTC, SOL, etc.), and Binance Pay with manual transaction ID validation.',
  },
  {
    q: 'How does UPI payment verification work?',
    a: 'Our checkout generates a unique fingerprinted amount with exact paise (e.g. ₹499.37). You simply scan the QR code and pay that exact amount. Our backend automatically detects the receipt from the payment gateway within 1-2 minutes and unlocks your order.',
  },
  {
    q: 'Can I download my purchased files multiple times?',
    a: 'Yes! Download links are active for 30 days and allow up to 5 downloads per item. If you ever need your link refreshed, you can access it anytime from your dashboard or contact our support team.',
  },
  {
    q: 'What if I pay the wrong UPI amount?',
    a: 'If you paid a rounded or different amount, the automated system might not link it automatically. Simply reach out to our Telegram support with your Transaction Reference ID / screenshot and our team will credit your wallet manually within minutes.',
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

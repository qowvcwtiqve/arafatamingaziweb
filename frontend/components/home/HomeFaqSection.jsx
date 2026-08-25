'use client';
import { useState } from 'react';

const FAQS = [
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
];

export default function HomeFaqSection() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section className="section section--sm" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="container" style={{ maxWidth: 860 }}>
        
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 'var(--radius-full)',
            background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.3)',
            marginBottom: 16
          }}>
            <span className="icon icon--sm icon--cyan icon--filled">quiz</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Common Questions
            </span>
          </div>
          <h2 className="section-title">
            Frequently Asked <span className="text-gradient">Questions</span>
          </h2>
        </div>

        <div className="faq-list">
          <style jsx>{`
            .faq-list {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .faq-item {
              background: var(--color-surface);
              border: 1px solid var(--color-border);
              border-radius: var(--radius-lg);
              overflow: hidden;
              transition: all 0.25s ease;
            }
            .faq-item.is-open {
              border-color: var(--color-border-glow);
              background: var(--color-surface-2);
            }
            .faq-trigger {
              width: 100%;
              padding: 18px 22px;
              background: none;
              border: none;
              display: flex;
              align-items: center;
              justify-content: space-between;
              cursor: pointer;
              color: var(--color-text);
              font-family: var(--font-heading);
              font-size: 15.5px;
              font-weight: 700;
              text-align: left;
            }
            .faq-body {
              padding: 0 22px 20px 22px;
              font-size: 14px;
              color: var(--color-text-muted);
              line-height: 1.6;
            }
          `}</style>

          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={idx} className={`faq-item ${isOpen ? 'is-open' : ''}`}>
                <button
                  className="faq-trigger"
                  onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                >
                  <span>{faq.q}</span>
                  <span className="icon icon--sm" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }}>
                    expand_more
                  </span>
                </button>
                {isOpen && (
                  <div className="faq-body">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

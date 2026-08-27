'use client';
import { useState } from 'react';
import siteConfig from '../../config/siteConfig';

const FAQS = siteConfig.faqs;


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

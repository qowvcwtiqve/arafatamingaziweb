'use client';
import Link from 'next/link';

export default function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      tag: 'Step 1',
      icon: 'search',
      title: 'Select Digital Asset',
      desc: 'Browse our catalog of genuine software licenses, developer tools, subscriptions & gaming accounts.',
      accent: '#3874FF',
      iconBg: 'rgba(56, 116, 255, 0.1)'
    },
    {
      num: '02',
      tag: 'Step 2',
      icon: 'qr_code_2',
      title: 'Instant 1-Click Pay',
      desc: 'Scan automated UPI QR (GPay, PhonePe, Paytm), Binance Pay 0% fee, or Crypto with instant auto-verification.',
      accent: '#10B981',
      iconBg: 'rgba(16, 185, 129, 0.1)'
    },
    {
      num: '03',
      tag: 'Step 3',
      icon: 'mark_email_read',
      title: 'Automated 24/7 Delivery',
      desc: 'Your activation keys and full credentials appear instantly on-screen, in your dashboard & your email inbox.',
      accent: '#8B5CF6',
      iconBg: 'rgba(139, 92, 246, 0.1)'
    }
  ];

  return (
    <section className="how-it-works-section">
      <div className="container">
        
        {/* Section Header */}
        <div className="how-it-works-header">
          <div className="how-it-works-badge">
            <span className="icon icon--sm icon--cyan">bolt</span>
            <span>Simple 3-Step Checkout</span>
          </div>
          <h2 className="how-it-works-title">
            How It Works in <span className="how-it-works-title-accent">3 Simple Steps</span>
          </h2>
          <p className="how-it-works-subtitle">
            Fully automated instant delivery. No waiting for sellers, no manual delays.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="how-it-works-grid">
          {steps.map((s, idx) => (
            <div key={s.num} className="how-step-card">
              <div className="how-step-top">
                <div 
                  className="how-step-icon-wrap"
                  style={{ background: s.iconBg, color: s.accent }}
                >
                  <span className="icon icon--md">{s.icon}</span>
                </div>
                <div className="how-step-pill">
                  <span className="how-step-pill-num">{s.num}</span>
                  <span className="how-step-pill-tag">{s.tag}</span>
                </div>
              </div>

              <h3 className="how-step-title">{s.title}</h3>
              <p className="how-step-desc">{s.desc}</p>

              {idx < steps.length - 1 && (
                <div className="how-step-connector" aria-hidden="true">
                  <span className="icon icon--sm">east</span>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>

      <style jsx>{`
        .how-it-works-section {
          padding: 60px 0 70px 0;
          border-top: 1px solid var(--color-border);
          position: relative;
          background: transparent;
        }

        .how-it-works-header {
          text-align: center;
          max-width: 620px;
          margin: 0 auto 44px auto;
        }

        .how-it-works-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--color-border);
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--color-text-muted);
          margin-bottom: 14px;
        }

        :global([data-theme='light']) .how-it-works-badge {
          background: #FFFFFF;
          border-color: #E2E8F0;
        }

        .how-it-works-title {
          font-family: var(--font-heading, "Outfit", sans-serif);
          font-size: clamp(24px, 3.5vw, 36px);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--color-text);
          margin: 0 0 10px 0;
          line-height: 1.2;
        }

        .how-it-works-title-accent {
          color: var(--color-primary-light, #3874FF);
        }

        .how-it-works-subtitle {
          font-size: 14.5px;
          color: var(--color-text-muted);
          line-height: 1.5;
          margin: 0;
        }

        .how-it-works-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          position: relative;
        }

        .how-step-card {
          background: var(--color-surface, #0E121A);
          border: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
          border-radius: 16px;
          padding: 26px 22px;
          position: relative;
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
          display: flex;
          flex-direction: column;
        }

        :global([data-theme='light']) .how-step-card {
          background: #FFFFFF;
          border-color: #E2E8F0;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
        }

        .how-step-card:hover {
          transform: translateY(-4px);
          border-color: var(--color-primary-light, #3874FF);
          box-shadow: 0 12px 28px -6px rgba(0, 0, 0, 0.35);
        }

        :global([data-theme='light']) .how-step-card:hover {
          box-shadow: 0 10px 24px -4px rgba(27, 78, 245, 0.1);
        }

        .how-step-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .how-step-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .how-step-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 3px 10px;
          border-radius: 9999px;
        }

        :global([data-theme='light']) .how-step-pill {
          background: #F1F5F9;
          border-color: #E2E8F0;
        }

        .how-step-pill-num {
          font-family: var(--font-heading);
          font-size: 11px;
          font-weight: 800;
          color: var(--color-primary-light, #3874FF);
        }

        .how-step-pill-tag {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-muted);
        }

        .how-step-title {
          font-family: var(--font-heading, "Outfit", sans-serif);
          font-size: 16.5px;
          font-weight: 700;
          color: var(--color-text);
          margin: 0 0 8px 0;
        }

        .how-step-desc {
          font-size: 13px;
          color: var(--color-text-muted);
          line-height: 1.55;
          margin: 0;
        }

        .how-step-connector {
          position: absolute;
          right: -14px;
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--color-surface-2, #141822);
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
          z-index: 3;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        :global([data-theme='light']) .how-step-connector {
          background: #FFFFFF;
          border-color: #CBD5E1;
        }

        @media (max-width: 900px) {
          .how-it-works-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .how-step-connector {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .how-it-works-section {
            padding: 44px 0 50px 0;
          }
          .how-it-works-header {
            margin-bottom: 28px;
          }
          .how-it-works-title {
            font-size: 24px;
          }
          .how-it-works-subtitle {
            font-size: 13px;
          }
          .how-step-card {
            padding: 18px 16px;
            border-radius: 14px;
          }
          .how-step-icon-wrap {
            width: 38px;
            height: 38px;
            border-radius: 10px;
          }
          .how-step-title {
            font-size: 15px;
            margin-bottom: 6px;
          }
          .how-step-desc {
            font-size: 12.5px;
            line-height: 1.45;
          }
        }
      `}</style>
    </section>
  );
}


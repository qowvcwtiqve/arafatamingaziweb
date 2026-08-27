'use client';

export default function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      icon: 'touch_app',
      color: 'var(--color-primary-light)',
      bg: 'rgba(27, 78, 245, 0.15)',
      border: 'rgba(27, 78, 245, 0.35)',
      title: 'Select Digital Asset',
      desc: 'Browse our extensive catalog of genuine software, subscriptions, accounts, and tools at discounted rates.'
    },
    {
      step: '02',
      icon: 'qr_code_scanner',
      color: 'var(--color-cyan)',
      bg: 'rgba(56, 116, 255, 0.15)',
      border: 'rgba(56, 116, 255, 0.35)',
      title: 'Instant 1-Click Pay',
      desc: 'Scan automated UPI QR (GPay, PhonePe, Paytm), Binance Pay 0% fee, or 100+ Cryptocurrencies with zero waiting.'
    },
    {
      step: '03',
      icon: 'bolt',
      color: 'var(--color-accent)',
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.35)',
      title: 'Automated 24/7 Delivery',
      desc: 'Get your activation keys and full credentials instantly on your screen and in your dashboard inbox.'
    }
  ];

  return (
    <section className="section section--sm" style={{ borderTop: '1px solid var(--color-border)', position: 'relative', overflow: 'hidden' }}>
      <div className="container">
        
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 48px auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 'var(--radius-full)',
            background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)',
            marginBottom: 16
          }}>
            <span className="icon icon--sm icon--cyan icon--filled">sync_alt</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Seamless Process
            </span>
          </div>
          <h2 className="section-title">
            How It Works in <span className="text-gradient">3 Simple Steps</span>
          </h2>
          <p className="section-subtitle" style={{ margin: '8px auto 0 auto' }}>
            Zero manual delays. Experience fully automated instant digital commerce.
          </p>
        </div>

        <div className="how-it-works-grid">
          <style jsx>{`
            .how-it-works-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 28px;
              position: relative;
            }
            .step-card {
              background: var(--color-surface);
              border: 1px solid var(--color-border);
              border-radius: var(--radius-xl);
              padding: 32px 24px;
              position: relative;
              transition: all 0.3s ease;
              overflow: hidden;
            }
            .step-card:hover {
              transform: translateY(-6px);
              border-color: var(--color-border-glow);
              box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4), 0 0 25px rgba(124, 58, 237, 0.2);
            }
            .step-number {
              position: absolute;
              top: 20px;
              right: 24px;
              font-size: 32px;
              font-weight: 900;
              font-family: var(--font-heading);
              color: var(--color-surface-3);
              letter-spacing: -0.04em;
            }
            .step-icon-box {
              width: 56px;
              height: 56px;
              border-radius: var(--radius-lg);
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 20px;
            }
            .step-title {
              font-size: 18px;
              font-weight: 700;
              color: var(--color-text);
              margin-bottom: 10px;
              font-family: var(--font-heading);
            }
            .step-desc {
              font-size: 13.5px;
              color: var(--color-text-muted);
              line-height: 1.6;
            }
            @media (max-width: 860px) {
              .how-it-works-grid {
                grid-template-columns: 1fr;
              }
            }
          `}</style>

          {steps.map((s) => (
            <div key={s.step} className="step-card">
              <div className="step-number">{s.step}</div>
              <div
                className="step-icon-box"
                style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
              >
                <span className="icon icon--lg" style={{ color: s.color }}>{s.icon}</span>
              </div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

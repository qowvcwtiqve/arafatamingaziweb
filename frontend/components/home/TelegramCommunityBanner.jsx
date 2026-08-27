'use client';
import siteConfig from '../../config/siteConfig';

export default function TelegramCommunityBanner() {

  return (
    <section className="section section--sm" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="container">
        <div className="telegram-community-card">
          <style jsx>{`
            .telegram-community-card {
              position: relative;
              background: linear-gradient(135deg, rgba(27, 78, 245, 0.20) 0%, rgba(27, 44, 193, 0.10) 100%), var(--color-surface);
              border: 1px solid var(--color-border);
              border-radius: var(--radius-xl);
              padding: 44px 36px;
              overflow: hidden;
              box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 32px;
            }
            .content-left {
              max-width: 600px;
            }
            .pill-tag {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 5px 12px;
              border-radius: var(--radius-full);
              background: var(--color-surface-2);
              border: 1px solid var(--color-border);
              color: var(--color-cyan);
              font-size: 11.5px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 12px;
            }
            .title {
              font-size: 26px;
              font-weight: 800;
              font-family: var(--font-heading);
              color: var(--color-text);
              margin-bottom: 8px;
            }
            .desc {
              font-size: 14px;
              color: var(--color-text-muted);
              line-height: 1.5;
            }
            .cta-btn {
              display: inline-flex;
              align-items: center;
              gap: 10px;
              padding: 14px 28px;
              border-radius: var(--radius-full);
              background: linear-gradient(135deg, #00A0E3 0%, #0077B5 100%);
              color: #ffffff;
              font-size: 15px;
              font-weight: 700;
              text-decoration: none;
              box-shadow: 0 8px 24px rgba(0, 160, 227, 0.4);
              transition: all 0.25s ease;
              flex-shrink: 0;
            }
            .cta-btn:hover {
              transform: translateY(-3px) scale(1.02);
              box-shadow: 0 12px 32px rgba(0, 160, 227, 0.6);
            }
            @media (max-width: 768px) {
              .telegram-community-card {
                flex-direction: column;
                text-align: center;
                padding: 32px 20px;
              }
              .content-left {
                max-width: 100%;
              }
            }
          `}</style>

          <div className="content-left">
            <div className="pill-tag">
              <span className="icon icon--sm icon--cyan icon--filled">groups</span>
              Official Community & Drops
            </div>
            <h3 className="title">
              Join 5,000+ Members on Telegram
            </h3>
            <p className="desc">
              Get exclusive promo codes, flash discount alerts, restock updates, and direct priority support from our team.
            </p>
          </div>

          <a
            href={siteConfig.socials.telegramChannel}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-btn"
          >
            <span className="icon icon--md" style={{ fontSize: 22 }}>send</span>
            <span>Join Telegram Channel</span>
          </a>
        </div>
      </div>
    </section>
  );
}

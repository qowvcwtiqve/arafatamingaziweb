'use client';
import siteConfig from '../../config/siteConfig';

export default function TelegramCommunityBanner() {
  return (
    <section className="telegram-banner-section">
      <div className="container">
        <div className="telegram-community-card">
          
          <div className="telegram-content-left">
            <div className="telegram-pill-tag">
              <span className="icon icon--sm icon--cyan icon--filled">groups</span>
              <span>Official Community &amp; VIP Drops</span>
            </div>

            <h3 className="telegram-title">
              Join 5,000+ Members on Telegram
            </h3>

            <p className="telegram-desc">
              Get exclusive promo codes, flash discount alerts, restock updates, and direct 1-on-1 priority support from our team.
            </p>

            {/* Quick feature perks */}
            <div className="telegram-perks-row">
              <div className="telegram-perk-item">
                <span className="icon icon--sm icon--cyan">bolt</span>
                <span>Flash Deals</span>
              </div>
              <div className="telegram-perk-divider" />
              <div className="telegram-perk-item">
                <span className="icon icon--sm icon--accent">verified_user</span>
                <span>Direct Support</span>
              </div>
              <div className="telegram-perk-divider" />
              <div className="telegram-perk-item">
                <span className="icon icon--sm icon--warning">local_offer</span>
                <span>VIP Promo Drops</span>
              </div>
            </div>
          </div>

          <div className="telegram-cta-wrap">
            <a
              href={siteConfig.socials.telegramChannel}
              target="_blank"
              rel="noopener noreferrer"
              className="telegram-cta-btn"
            >
              <span className="icon icon--md">send</span>
              <span>Join Telegram Channel</span>
            </a>
            <span className="telegram-cta-subtext">Free to join • Instant access</span>
          </div>

        </div>
      </div>

      <style jsx>{`
        .telegram-banner-section {
          padding: 30px 0;
          border-top: 1px solid var(--color-border);
          position: relative;
        }

        .telegram-community-card {
          position: relative;
          background: var(--color-surface, #0E121A);
          border: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
          border-radius: 20px;
          padding: 36px 36px;
          overflow: hidden;
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
        }

        :global([data-theme='light']) .telegram-community-card {
          background: #FFFFFF;
          border-color: #E2E8F0;
          box-shadow: 0 6px 24px -4px rgba(15, 23, 42, 0.06);
        }

        .telegram-content-left {
          max-width: 620px;
        }

        .telegram-pill-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: var(--radius-full);
          background: rgba(56, 116, 255, 0.08);
          border: 1px solid rgba(56, 116, 255, 0.2);
          color: var(--color-primary-light, #3874FF);
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 12px;
        }

        :global([data-theme='light']) .telegram-pill-tag {
          background: #EFF6FF;
          border-color: #BFDBFE;
          color: #1D4ED8;
        }

        .telegram-title {
          font-size: clamp(20px, 3vw, 26px);
          font-weight: 800;
          font-family: var(--font-heading, "Outfit", sans-serif);
          color: var(--color-text);
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
        }

        .telegram-desc {
          font-size: 13.5px;
          color: var(--color-text-muted);
          line-height: 1.5;
          margin: 0 0 16px 0;
        }

        .telegram-perks-row {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .telegram-perk-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text);
        }

        .telegram-perk-divider {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--color-border);
        }

        .telegram-cta-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .telegram-cta-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 48px;
          padding: 0 26px;
          border-radius: 12px;
          background: linear-gradient(135deg, #1B4EF5 0%, #3874FF 100%);
          color: #ffffff;
          font-family: var(--font-heading);
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(27, 78, 245, 0.35);
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .telegram-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(27, 78, 245, 0.45);
        }

        .telegram-cta-subtext {
          font-size: 11.5px;
          color: var(--color-text-muted);
        }

        @media (max-width: 860px) {
          .telegram-banner-section {
            padding: 20px 0;
          }
          .telegram-community-card {
            flex-direction: column;
            text-align: left;
            padding: 22px 18px;
            border-radius: 16px;
            gap: 18px;
          }
          .telegram-content-left {
            max-width: 100%;
          }
          .telegram-title {
            font-size: 20px;
            line-height: 1.25;
            margin-bottom: 6px;
          }
          .telegram-desc {
            font-size: 12.5px;
            line-height: 1.45;
            margin-bottom: 14px;
          }
          .telegram-perks-row {
            gap: 8px;
          }
          .telegram-perk-divider {
            display: none;
          }
          .telegram-perk-item {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 11.5px;
          }
          :global([data-theme='light']) .telegram-perk-item {
            background: #F1F5F9;
            border-color: #E2E8F0;
            color: #334155;
          }
          .telegram-cta-wrap {
            width: 100%;
          }
          .telegram-cta-btn {
            width: 100%;
            height: 44px;
            font-size: 13.5px;
          }
        }
      `}</style>
    </section>
  );
}


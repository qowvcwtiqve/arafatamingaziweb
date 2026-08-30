'use client';
import { useState } from 'react';
import Link from 'next/link';
import siteConfig from '../../config/siteConfig';

const FAQS = siteConfig.faqs;

export default function HomeFaqSection() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section className="home-faq-section">
      <div className="container" style={{ maxWidth: 860 }}>
        
        {/* Header */}
        <div className="home-faq-header">
          <div className="home-faq-badge">
            <span className="icon icon--sm icon--cyan icon--filled">quiz</span>
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="home-faq-title">
            Got Questions? <span className="home-faq-title-accent">We've Got Answers</span>
          </h2>
          <p className="home-faq-subtitle">
            Everything you need to know about instant automated deliveries, warranties, payments, and 24/7 priority support.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="home-faq-list">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            const stepNum = String(idx + 1).padStart(2, '0');

            return (
              <div
                key={idx}
                className={`home-faq-item ${isOpen ? 'is-open' : ''}`}
              >
                <button
                  type="button"
                  className="home-faq-trigger"
                  onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                  aria-expanded={isOpen}
                >
                  <div className="home-faq-trigger-left">
                    <span className="home-faq-num">{stepNum}</span>
                    <span className="home-faq-question">{faq.q}</span>
                  </div>
                  <div className="home-faq-toggle-icon">
                    <span className="icon icon--sm">
                      {isOpen ? 'remove' : 'add'}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="home-faq-body">
                    <div className="home-faq-divider" />
                    <p className="home-faq-answer">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Contact Helpdesk Prompt */}
        <div className="home-faq-footer-prompt">
          <div className="home-faq-prompt-left">
            <div className="home-faq-prompt-icon">
              <span className="icon icon--md icon--cyan">support_agent</span>
            </div>
            <div>
              <h4 className="home-faq-prompt-title">Still have questions?</h4>
              <p className="home-faq-prompt-desc">Our team is available 24/7 on Telegram for instant assistance.</p>
            </div>
          </div>
          <a
            href={siteConfig.socials.telegramSupport}
            target="_blank"
            rel="noopener noreferrer"
            className="home-faq-prompt-btn"
          >
            <span className="icon icon--sm">send</span>
            <span>Ask on Telegram</span>
          </a>
        </div>

      </div>

      <style jsx>{`
        .home-faq-section {
          padding: 60px 0 80px 0;
          border-top: 1px solid var(--color-border);
          position: relative;
        }

        .home-faq-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .home-faq-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
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

        :global([data-theme='light']) .home-faq-badge {
          background: #EFF6FF;
          border-color: #BFDBFE;
          color: #1D4ED8;
        }

        .home-faq-title {
          font-family: var(--font-heading, "Outfit", sans-serif);
          font-size: clamp(24px, 3.5vw, 34px);
          font-weight: 800;
          color: var(--color-text);
          margin: 0 0 10px 0;
          letter-spacing: -0.02em;
        }

        .home-faq-title-accent {
          color: var(--color-primary-light, #3874FF);
        }

        .home-faq-subtitle {
          font-size: 14px;
          color: var(--color-text-muted);
          max-width: 580px;
          margin: 0 auto;
          line-height: 1.55;
        }

        .home-faq-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 32px;
        }

        .home-faq-item {
          background: var(--color-surface, #0E121A);
          border: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
          border-radius: 16px;
          overflow: hidden;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        :global([data-theme='light']) .home-faq-item {
          background: #FFFFFF;
          border-color: #E2E8F0;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
        }

        .home-faq-item:hover {
          border-color: var(--color-primary-light, #3874FF);
          transform: translateY(-1px);
        }

        .home-faq-item.is-open {
          border-color: var(--color-primary-light, #3874FF);
          box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.35);
        }

        :global([data-theme='light']) .home-faq-item.is-open {
          box-shadow: 0 8px 20px -4px rgba(27, 78, 245, 0.08);
        }

        .home-faq-trigger {
          width: 100%;
          padding: 20px 22px;
          background: none;
          border: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          cursor: pointer;
          text-align: left;
          color: var(--color-text);
          transition: background 0.2s ease;
        }

        .home-faq-trigger-left {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
        }

        .home-faq-num {
          font-family: var(--font-heading);
          font-size: 13px;
          font-weight: 800;
          color: var(--color-primary-light, #3874FF);
          background: rgba(56, 116, 255, 0.1);
          padding: 3px 8px;
          border-radius: 6px;
          flex-shrink: 0;
        }

        :global([data-theme='light']) .home-faq-num {
          background: #EFF6FF;
          color: #1D4ED8;
        }

        .home-faq-question {
          font-family: var(--font-heading, "Outfit", sans-serif);
          font-size: 15.5px;
          font-weight: 700;
          color: var(--color-text);
          line-height: 1.35;
        }

        .home-faq-toggle-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--color-surface-2, #141822);
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        :global([data-theme='light']) .home-faq-toggle-icon {
          background: #F1F5F9;
          border-color: #E2E8F0;
          color: #475569;
        }

        .home-faq-item.is-open .home-faq-toggle-icon {
          background: var(--color-primary-light, #3874FF);
          border-color: var(--color-primary-light, #3874FF);
          color: #FFFFFF;
        }

        .home-faq-body {
          padding: 0 22px 20px 22px;
        }

        .home-faq-divider {
          height: 1px;
          background: var(--color-border, rgba(255, 255, 255, 0.06));
          margin-bottom: 16px;
        }

        :global([data-theme='light']) .home-faq-divider {
          background: #F1F5F9;
        }

        .home-faq-answer {
          font-size: 13.5px;
          color: var(--color-text-muted);
          line-height: 1.65;
          margin: 0;
          padding-left: 36px;
        }

        .home-faq-footer-prompt {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          background: var(--color-surface, #0E121A);
          border: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
          border-radius: 16px;
          padding: 20px 24px;
        }

        :global([data-theme='light']) .home-faq-footer-prompt {
          background: #FFFFFF;
          border-color: #E2E8F0;
        }

        .home-faq-prompt-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .home-faq-prompt-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(56, 116, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .home-faq-prompt-title {
          font-family: var(--font-heading);
          font-size: 15px;
          font-weight: 700;
          color: var(--color-text);
          margin: 0 0 2px 0;
        }

        .home-faq-prompt-desc {
          font-size: 12.5px;
          color: var(--color-text-muted);
          margin: 0;
        }

        .home-faq-prompt-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          border-radius: 10px;
          background: linear-gradient(135deg, #1B4EF5 0%, #3874FF 100%);
          color: #FFFFFF;
          font-family: var(--font-heading);
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(27, 78, 245, 0.3);
          transition: transform 0.2s ease;
        }

        .home-faq-prompt-btn:hover {
          transform: translateY(-2px);
        }

        @media (max-width: 640px) {
          .home-faq-section {
            padding: 44px 0 60px 0;
          }
          .home-faq-header {
            margin-bottom: 28px;
          }
          .home-faq-trigger {
            padding: 16px 14px;
            gap: 10px;
          }
          .home-faq-trigger-left {
            gap: 10px;
          }
          .home-faq-num {
            font-size: 11px;
            padding: 2px 6px;
          }
          .home-faq-question {
            font-size: 14px;
          }
          .home-faq-body {
            padding: 0 14px 16px 14px;
          }
          .home-faq-answer {
            padding-left: 0;
            font-size: 13px;
          }
          .home-faq-footer-prompt {
            flex-direction: column;
            text-align: center;
            padding: 20px 16px;
            gap: 14px;
          }
          .home-faq-prompt-left {
            flex-direction: column;
            text-align: center;
            gap: 8px;
          }
          .home-faq-prompt-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </section>
  );
}


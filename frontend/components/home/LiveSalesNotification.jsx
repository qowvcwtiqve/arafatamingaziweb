'use client';
import { useState, useEffect } from 'react';

const RECENT_SALES = [
  { name: 'Rahul S.', city: 'Mumbai', product: 'Canva Pro Lifetime', time: '14s ago' },
  { name: 'Aman V.', city: 'Delhi', product: 'Adobe Creative Cloud', time: '42s ago' },
  { name: 'Vikram P.', city: 'Ahmedabad', product: 'ChatGPT Plus Account', time: '1m ago' },
  { name: 'Priya N.', city: 'Bangalore', product: 'Netflix Premium 4K UHD', time: '2m ago' },
  { name: 'Devendra S.', city: 'Jaipur', product: 'NordVPN 2-Year Plan', time: '3m ago' },
  { name: 'Rohan G.', city: 'Pune', product: 'Spotify Premium Family', time: '4m ago' },
  { name: 'Ananya D.', city: 'Kolkata', product: 'MS Office 365 Pro Plus', time: '5m ago' },
];

export default function LiveSalesNotification() {
  const [saleIndex, setSaleIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Initial delay before first popup
    const initialTimer = setTimeout(() => {
      setVisible(true);
    }, 3000);

    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setSaleIndex(prev => (prev + 1) % RECENT_SALES.length);
        setVisible(true);
      }, 800);
    }, 7000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const current = RECENT_SALES[saleIndex];

  return (
    <div className={`live-sales-badge ${visible ? 'is-visible' : ''}`}>
      <style jsx>{`
        .live-sales-badge {
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 99;
          background: rgba(14, 19, 34, 0.95);
          backdrop-filter: blur(16px);
          border: 1px solid var(--color-border-glow);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4), 0 0 20px rgba(124, 58, 237, 0.2);
          border-radius: var(--radius-lg);
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          max-width: 320px;
          transform: translateY(120%);
          opacity: 0;
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease;
          pointer-events: none;
        }
        .live-sales-badge.is-visible {
          transform: translateY(0);
          opacity: 1;
        }
        .icon-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(0, 212, 255, 0.2) 100%);
          border: 1px solid rgba(16, 185, 129, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #10B981;
          flex-shrink: 0;
        }
        .content-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .buyer-line {
          font-size: 11.5px;
          color: var(--color-text-faint);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .product-line {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 210px;
        }
        @media (max-width: 640px) {
          .live-sales-badge {
            left: 12px;
            bottom: 12px;
            max-width: calc(100vw - 24px);
          }
        }
      `}</style>

      <div className="icon-circle">
        <span className="icon icon--sm icon--filled" style={{ fontSize: 18 }}>shopping_bag</span>
      </div>
      <div className="content-box">
        <div className="buyer-line">
          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{current.name}</span> from {current.city} • <span style={{ color: 'var(--color-cyan)' }}>{current.time}</span>
        </div>
        <div className="product-line">
          Purchased {current.product}
        </div>
      </div>
    </div>
  );
}

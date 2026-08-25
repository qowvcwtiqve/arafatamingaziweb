'use client';

export default function LiveTicker() {
  const tickerItems = [
    { icon: 'bolt', text: 'Instant Automated 24/7 Delivery', color: 'var(--color-cyan)' },
    { icon: 'verified', text: '100% Genuine Tested Licenses', color: 'var(--color-accent)' },
    { icon: 'qr_code_scanner', text: 'Instant UPI QR & Binance Auto-Verification', color: 'var(--color-primary-light)' },
    { icon: 'star', text: '4.9★ Average Rating from 3,500+ Buyers', color: '#F59E0B' },
    { icon: 'support_agent', text: '24/7 Human Telegram Support Channel', color: 'var(--color-cyan)' },
    { icon: 'local_fire_department', text: 'Hot Deals & Up to 70% Off Subscriptions', color: '#EF4444' },
  ];

  return (
    <div className="live-ticker-strip">
      <style jsx>{`
        .live-ticker-strip {
          background: linear-gradient(90deg, #0a0e1c 0%, #12182d 50%, #0a0e1c 100%);
          border-top: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
          overflow: hidden;
          white-space: nowrap;
          position: relative;
          padding: 10px 0;
          z-index: 10;
        }
        .ticker-track {
          display: inline-flex;
          align-items: center;
          gap: 36px;
          animation: tickerScroll 35s linear infinite;
        }
        .live-ticker-strip:hover .ticker-track {
          animation-play-state: paused;
        }
        .ticker-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--color-text-muted);
          flex-shrink: 0;
        }
        @keyframes tickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      
      <div className="ticker-track">
        {[...tickerItems, ...tickerItems].map((item, idx) => (
          <div key={idx} className="ticker-item">
            <span className="icon icon--sm icon--filled" style={{ color: item.color, fontSize: 16 }}>
              {item.icon}
            </span>
            <span>{item.text}</span>
            <span style={{ color: 'var(--color-border-hover)', opacity: 0.6, marginLeft: 16 }}>•</span>
          </div>
        ))}
      </div>
    </div>
  );
}

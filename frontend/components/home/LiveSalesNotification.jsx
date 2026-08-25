'use client';
import { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';

const FIRST_NAMES = [
  'Rahul', 'Aman', 'Vikram', 'Priya', 'Devendra', 'Rohan', 'Ananya', 'Sameer',
  'Aditya', 'Neha', 'Siddharth', 'Kunal', 'Pooja', 'Abhishek', 'Gaurav', 'Kartik',
  'Rishi', 'Sneha', 'Deepak', 'Manish', 'Harsh', 'Arjun', 'Kabir', 'Tanmay', 'Alok', 'Yash', 'Saurabh'
];

const LAST_INITIALS = ['S.', 'V.', 'P.', 'N.', 'K.', 'R.', 'G.', 'D.', 'M.', 'T.', 'B.', 'J.', 'A.', 'C.'];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Pune', 'Kolkata',
  'Jaipur', 'Lucknow', 'Indore', 'Chandigarh', 'Surat', 'Bhopal', 'Nagpur', 'Noida', 'Gurgaon'
];

const TIME_AGO = ['12s ago', '25s ago', '42s ago', '1m ago', '2m ago', '3m ago', '4m ago'];

export default function LiveSalesNotification() {
  const [currentSale, setCurrentSale] = useState(null);
  const [visible, setVisible] = useState(false);
  const inStockProductsRef = useRef([]);

  useEffect(() => {
    // 1. Fetch real in-stock products from the store database
    api.get('/products?limit=50')
      .then(({ data }) => {
        const prods = data.products || [];
        // Only keep products that are currently in stock
        const inStock = prods.filter(p => {
          if (p.in_stock === false) return false;
          if (p.total_stock === 0) return false;
          return true;
        });
        if (inStock.length > 0) {
          inStockProductsRef.current = inStock;
        }
      })
      .catch(() => {});

    // Generate random sale data
    const generateNewSale = () => {
      const prods = inStockProductsRef.current;
      if (!prods.length) return null;

      const randomProd = prods[Math.floor(Math.random() * prods.length)];
      const randomName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const randomInit = LAST_INITIALS[Math.floor(Math.random() * LAST_INITIALS.length)];
      const randomCity = CITIES[Math.floor(Math.random() * CITIES.length)];
      const randomTime = TIME_AGO[Math.floor(Math.random() * TIME_AGO.length)];

      return {
        name: `${randomName} ${randomInit}`,
        city: randomCity,
        product: randomProd.title || randomProd.name,
        time: randomTime
      };
    };

    let timerId = null;
    let hideTimerId = null;

    const triggerPopup = () => {
      const sale = generateNewSale();
      if (sale) {
        setCurrentSale(sale);
        setVisible(true);

        // Show for 4.5 seconds then fade out
        hideTimerId = setTimeout(() => {
          setVisible(false);
          // Wait 18-26 seconds before showing next notification (realistic slow pace)
          const nextInterval = 18000 + Math.random() * 8000;
          timerId = setTimeout(triggerPopup, nextInterval);
        }, 4500);
      } else {
        // Retry after a short moment if products not loaded yet
        timerId = setTimeout(triggerPopup, 5000);
      }
    };

    // First alert appears after 8 seconds of browsing
    timerId = setTimeout(triggerPopup, 8000);

    return () => {
      if (timerId) clearTimeout(timerId);
      if (hideTimerId) clearTimeout(hideTimerId);
    };
  }, []);

  if (!currentSale) return null;

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
          min-width: 0;
        }
        .buyer-line {
          font-size: 11.5px;
          color: var(--color-text-faint);
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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
          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{currentSale.name}</span> from {currentSale.city} • <span style={{ color: 'var(--color-cyan)' }}>{currentSale.time}</span>
        </div>
        <div className="product-line">
          Purchased {currentSale.product}
        </div>
      </div>
    </div>
  );
}

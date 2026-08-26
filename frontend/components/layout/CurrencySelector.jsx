'use client';
import { useState, useEffect, useRef } from 'react';
import { useCurrencyStore, CURRENCIES } from '../../store/currencyStore';

export default function CurrencySelector({ isMobile = false }) {
  const { currency, setCurrency, fetchRates } = useCurrencyStore();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    fetchRates();

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div style={{
        height: 38,
        padding: '0 10px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--color-text)'
      }}>
        <span>🇮🇳</span>
        <span>INR</span>
      </div>
    );
  }

  const current = CURRENCIES[currency] || CURRENCIES.INR;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        className="currency-selector-btn"
        aria-label="Select Currency"
        style={{
          height: isMobile ? 42 : 38,
          padding: isMobile ? '0 14px' : '0 11px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'var(--transition-fast)',
          whiteSpace: 'nowrap',
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'space-between' : 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>{current.flag}</span>
          <span>{current.code}</span>
          <span style={{ color: 'var(--color-text-faint)', fontSize: 12 }}>({current.symbol})</span>
        </div>
        <span className="icon icon--sm" style={{
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          fontSize: 16,
          color: 'var(--color-text-muted)'
        }}>
          expand_more
        </span>
      </button>

      {open && (
        <div
          className="currency-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 240,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            overflow: 'hidden',
            padding: 6,
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          <div style={{
            padding: '8px 10px',
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-text-faint)',
            borderBottom: '1px solid var(--color-border)',
            marginBottom: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>Live Currency Rates</span>
            <span style={{ color: 'var(--color-accent)', fontSize: 10 }}>● Real-time</span>
          </div>

          <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.values(CURRENCIES).map((c) => {
              const isSelected = c.code === currency;
              return (
                <button
                  key={c.code}
                  onClick={() => {
                    setCurrency(c.code);
                    setOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'var(--color-surface-3)' : 'transparent',
                    border: 'none',
                    color: isSelected ? 'var(--color-text)' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'var(--transition-fast)',
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 500
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-2)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{c.flag}</span>
                    <div>
                      <div style={{ color: isSelected ? 'var(--color-text)' : 'var(--color-text)' }}>
                        {c.code} <span style={{ color: 'var(--color-text-faint)', fontSize: 11 }}>({c.symbol})</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--color-text-faint)' }}>{c.name}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="icon icon--sm icon--accent">check</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

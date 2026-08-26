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
        padding: '0 12px',
        borderRadius: 'var(--radius-md, 10px)',
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--color-text)'
      }}>
        <span style={{ fontSize: 15 }}>🇮🇳</span>
        <span style={{ letterSpacing: '0.02em' }}>INR</span>
      </div>
    );
  }

  const current = CURRENCIES[currency] || CURRENCIES.INR;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: isMobile ? 'block' : 'inline-block', width: isMobile ? '100%' : 'auto' }}>
      {/* Minimal Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="currency-trigger-btn"
        aria-label="Select Currency"
        style={{
          height: isMobile ? 44 : 38,
          padding: isMobile ? '0 14px' : '0 12px',
          borderRadius: 'var(--radius-md, 10px)',
          background: open ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
          border: `1px solid ${open ? 'var(--color-border-glow, #373E4F)' : 'var(--color-border)'}`,
          color: 'var(--color-text)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'space-between' : 'center',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>{current.flag}</span>
          <span style={{ fontWeight: 700, letterSpacing: '0.02em' }}>{current.code}</span>
          <span style={{ color: 'var(--color-text-faint)', fontSize: 12, fontWeight: 500 }}>{current.symbol}</span>
        </div>
        <span className="icon icon--sm" style={{
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          fontSize: 16,
          color: 'var(--color-text-faint)',
          marginLeft: isMobile ? 0 : 2
        }}>
          expand_more
        </span>
      </button>

      {/* Minimal Dropdown Menu */}
      {open && (
        <div
          className="currency-dropdown"
          style={{
            position: 'absolute',
            top: isMobile ? 'auto' : 'calc(100% + 6px)',
            bottom: isMobile ? 'calc(100% + 6px)' : 'auto',
            right: 0,
            left: isMobile ? 0 : 'auto',
            width: isMobile ? '100%' : 220,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg, 12px)',
            boxShadow: '0 12px 36px -4px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.04)',
            zIndex: 1100,
            overflow: 'hidden',
            padding: 4,
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Subtle Minimal Header */}
          <div style={{
            padding: '7px 10px 5px',
            fontSize: 10.5,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-text-faint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--color-border)',
            marginBottom: 3
          }}>
            <span>Select Currency</span>
            <span style={{ fontSize: 10, color: 'var(--color-text-faint)', fontWeight: 500 }}>Live Rates</span>
          </div>

          {/* Currency Rows */}
          <div style={{ maxHeight: 270, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-sm, 8px)',
                    background: isSelected ? 'var(--color-surface-3)' : 'transparent',
                    border: 'none',
                    color: isSelected ? 'var(--color-text)' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                    fontSize: 13,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--color-surface-2)';
                      e.currentTarget.style.color = 'var(--color-text)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-muted)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, lineHeight: 1 }}>{c.flag}</span>
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontWeight: isSelected ? 700 : 600,
                        color: isSelected ? 'var(--color-text)' : 'inherit'
                      }}>
                        <span>{c.code}</span>
                        <span style={{ color: 'var(--color-text-faint)', fontSize: 12, fontWeight: 400 }}>{c.symbol}</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--color-text-faint)', marginTop: 1 }}>{c.name}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="icon icon--sm" style={{ fontSize: 16, color: 'var(--color-primary-light)' }}>
                      check
                    </span>
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

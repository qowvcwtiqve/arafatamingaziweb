'use client';
import { useState, useEffect, useRef } from 'react';
import { useCurrency, CURRENCIES } from '../../store/currencyStore';
import FlagIcon from '../ui/FlagIcon';

export default function CurrencySelector({ isMobile = false }) {
  const { currency, setCurrency, fetchRates } = useCurrency();
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
        height: 36,
        padding: '0 10px',
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
        <FlagIcon code="INR" size={16} />
        <span style={{ letterSpacing: '0.02em', fontWeight: 700 }}>INR</span>
      </div>
    );
  }

  // 1. INLINE GRID VIEW FOR MOBILE PROFILE BOTTOM SHEET
  if (isMobile) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        width: '100%'
      }}>
        {Object.values(CURRENCIES).map((c) => {
          const isSelected = c.code === currency;
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => setCurrency(c.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '9px 6px',
                borderRadius: 'var(--radius-md, 10px)',
                background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'var(--color-surface-2)',
                border: isSelected ? '1.5px solid var(--color-cyan)' : '1px solid var(--color-border)',
                color: isSelected ? 'var(--color-cyan)' : 'var(--color-text)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                userSelect: 'none'
              }}
            >
              <FlagIcon code={c.code} size={15} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ fontWeight: 800, fontSize: 12.5 }}>{c.code}</span>
                <span style={{ fontSize: 11, opacity: 0.75 }}>{c.symbol}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // 2. COMPACT HEADER DROPDOWN
  const current = CURRENCIES[currency] || CURRENCIES.INR;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="currency-trigger-btn"
        aria-label="Select Currency"
        style={{
          height: 38,
          padding: '0 10px',
          borderRadius: 'var(--radius-md, 10px)',
          background: open ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
          border: `1px solid ${open ? 'var(--color-border-glow, #373E4F)' : 'var(--color-border)'}`,
          color: 'var(--color-text)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <FlagIcon code={current.code} size={16} />
          <span style={{ fontWeight: 700, letterSpacing: '0.02em' }}>{current.code}</span>
          <span style={{ color: 'var(--color-text-faint)', fontSize: 12, fontWeight: 500 }}>{current.symbol}</span>
        </div>
        <span className="icon icon--sm" style={{
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          fontSize: 15,
          color: 'var(--color-text-faint)',
          marginLeft: 2
        }}>
          expand_more
        </span>
      </button>

      {/* Downward Popup Menu */}
      {open && (
        <div
          className="currency-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 210,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md, 12px)',
            boxShadow: '0 12px 36px -4px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            zIndex: 3000,
            overflow: 'hidden',
            padding: 4,
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Header */}
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
          <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Object.values(CURRENCIES).map((c) => {
              const isSelected = c.code === currency;
              return (
                <button
                  key={c.code}
                  type="button"
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
                    <FlagIcon code={c.code} size={16} />
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
                  </div>

                  {isSelected && (
                    <span className="icon icon--sm" style={{ color: 'var(--color-cyan)', fontSize: 15 }}>
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

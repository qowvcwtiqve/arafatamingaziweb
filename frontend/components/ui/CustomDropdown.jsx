'use client';

import React, { useState, useRef, useEffect } from 'react';

/**
 * Premium Custom Dropdown Component
 * Features: Material Icons, Glassmorphism menu, Search/filter options, Smooth animation, Keyboard & outside click handling
 */
export default function CustomDropdown({
  options = [],
  value,
  onChange,
  placeholder = 'Select option...',
  icon = null,
  minWidth = 180,
  maxWidth = 320,
  style = {},
  variant = 'default', // default | compact | outline
  align = 'left',      // left | right
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Find currently selected option
  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || null;

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredOptions = searchQuery.trim()
    ? options.filter((opt) =>
        opt.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opt.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const isFiltered = value && value !== 'all' && value !== '';

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        minWidth: minWidth,
        maxWidth: maxWidth,
        ...style,
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: 38,
          padding: '0 12px',
          background: isFiltered
            ? 'rgba(99, 102, 241, 0.12)'
            : isOpen
            ? 'var(--color-surface-3)'
            : 'var(--color-surface-2)',
          border: isFiltered
            ? '1px solid var(--color-primary)'
            : isOpen
            ? '1px solid var(--color-primary-light)'
            : '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          color: isFiltered ? 'var(--color-primary-light)' : 'var(--color-text)',
          fontSize: 13,
          fontWeight: isFiltered ? 600 : 500,
          fontFamily: 'var(--font-body)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          if (!isOpen && !isFiltered) e.currentTarget.style.borderColor = 'var(--color-border-hover)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen && !isFiltered) e.currentTarget.style.borderColor = 'var(--color-border)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {(selectedOption?.icon || icon) && (
            <span
              className="icon icon--sm"
              style={{
                fontSize: 16,
                color: selectedOption?.color || (isFiltered ? 'var(--color-primary-light)' : 'var(--color-text-muted)'),
                flexShrink: 0,
              }}
            >
              {selectedOption?.icon || icon}
            </span>
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {selectedOption?.badge && (
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--color-text-muted)',
                fontWeight: 600,
              }}
            >
              {selectedOption.badge}
            </span>
          )}
          <span
            className="icon icon--sm"
            style={{
              fontSize: 18,
              color: isFiltered ? 'var(--color-primary-light)' : 'var(--color-text-faint)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            expand_more
          </span>
        </div>
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align === 'right' ? 'right' : 'left']: 0,
            minWidth: Math.max(minWidth, 200),
            width: 'max-content',
            maxWidth: 360,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-lg), 0 0 20px rgba(99, 102, 241, 0.1)',
            zIndex: 1050,
            padding: 6,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            animation: 'dropdownFadeIn 0.15s ease-out',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {/* Optional inline search if more than 8 options */}
          {options.length > 8 && (
            <div style={{ padding: '4px 6px 8px', borderBottom: '1px solid var(--color-border)', marginBottom: 4 }}>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                style={{
                  width: '100%',
                  height: 30,
                  padding: '0 8px',
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  color: 'var(--color-text)',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--color-text-faint)', textAlign: 'center' }}>
              No options found
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={String(opt.value)}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    transition: 'all 0.12s ease',
                    color: isSelected ? '#fff' : 'var(--color-text)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    {opt.icon && (
                      <span
                        className="icon icon--sm"
                        style={{
                          fontSize: 16,
                          color: opt.color || (isSelected ? 'var(--color-primary-light)' : 'var(--color-text-muted)'),
                          flexShrink: 0,
                        }}
                      >
                        {opt.icon}
                      </span>
                    )}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, whiteSpace: 'nowrap' }}>
                        {opt.label}
                      </div>
                      {opt.description && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>
                          {opt.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {opt.badge && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: '1px 5px',
                          borderRadius: 6,
                          background: isSelected ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.08)',
                          color: isSelected ? '#fff' : 'var(--color-text-faint)',
                          fontWeight: 700,
                        }}
                      >
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && (
                      <span className="icon icon--sm" style={{ fontSize: 16, color: 'var(--color-primary-light)' }}>
                        check
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

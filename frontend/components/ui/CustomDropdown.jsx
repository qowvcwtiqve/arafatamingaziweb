'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

/**
 * Obsidian Custom Dropdown Component
 * Features: Zero-emoji, Lucide icons, Obsidian Glassmorphism menu, Search/filter options, Keyboard & outside click handling
 */
export default function CustomDropdown({
  options = [],
  value,
  onChange,
  placeholder = 'Select option...',
  icon: IconComponent = null,
  minWidth = 170,
  maxWidth = 320,
  style = {},
  align = 'left',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || null;

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
          height: 40,
          padding: '0 12px',
          background: isFiltered
            ? 'rgba(56, 116, 255, 0.12)'
            : 'var(--color-surface-2, #141822)',
          border: isFiltered
            ? '1.5px solid #3874FF'
            : isOpen
            ? '1.5px solid #3874FF'
            : '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
          borderRadius: 10,
          color: isFiltered ? '#3874FF' : 'var(--color-text, #FFFFFF)',
          fontSize: 13,
          fontWeight: isFiltered ? 700 : 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(56, 116, 255, 0.18)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {IconComponent && (
            <span style={{ display: 'flex', alignItems: 'center', color: isFiltered ? '#3874FF' : 'var(--color-text-muted)' }}>
              {typeof IconComponent === 'function' ? <IconComponent size={15} /> : IconComponent}
            </span>
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {selectedOption?.badge !== undefined && selectedOption?.badge !== null && (
            <span
              style={{
                fontSize: 10.5,
                padding: '1px 6px',
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--color-text-muted)',
                fontWeight: 700,
              }}
            >
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown
            size={15}
            color={isFiltered ? '#3874FF' : 'var(--color-text-muted)'}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align === 'right' ? 'right' : 'left']: 0,
            minWidth: '100%',
            width: 'max-content',
            maxWidth: 320,
            background: 'var(--color-surface, #0F131C)',
            border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.12))',
            borderRadius: 12,
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 0, 0, 0.4)',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'adminScaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          {/* Search Header if many options */}
          {options.length > 5 && (
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))', position: 'relative' }}>
              <Search size={13} color="var(--color-text-muted)" style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  height: 30,
                  padding: '0 8px 0 26px',
                  background: 'var(--color-surface-2, #141822)',
                  border: '1px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                  borderRadius: 6,
                  fontSize: 12,
                  color: 'var(--color-text, #FFFFFF)',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Options List */}
          <div style={{ maxHeight: 240, overflowY: 'auto', padding: '6px' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                No options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      background: isSelected ? 'rgba(56, 116, 255, 0.15)' : 'transparent',
                      border: 'none',
                      borderRadius: 8,
                      color: isSelected ? '#3874FF' : 'var(--color-text, #FFFFFF)',
                      fontSize: 12.5,
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-2, #141822)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      {opt.color && (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {opt.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {opt.badge !== undefined && opt.badge !== null && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: 'var(--color-surface-2)',
                            color: 'var(--color-text-muted)',
                            fontWeight: 700,
                          }}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check size={14} color="#3874FF" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

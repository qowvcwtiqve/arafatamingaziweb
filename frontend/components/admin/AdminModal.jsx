'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';

export default function AdminModal({ config, onClose }) {
  const [val, setVal] = useState('');

  useEffect(() => {
    setVal(config?.initialValue || '');
  }, [config]);

  if (!config?.isOpen) return null;

  const isDanger = config.type === 'confirm';

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div 
        className="admin-modal-panel" 
        style={{ maxWidth: 460 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div className="admin-modal-title">
            {isDanger ? (
              <AlertTriangle size={20} color="#EF4444" />
            ) : (
              <HelpCircle size={20} color="#3874FF" />
            )}
            <span>{config.title}</span>
          </div>
          <button 
            type="button"
            className="admin-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="admin-modal-body">
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
            {config.message}
          </p>

          {config.type === 'prompt' && (
            <div style={{ marginTop: 8 }}>
              <input
                className="admin-search-input"
                style={{
                  width: '100%',
                  height: 42,
                  padding: '0 14px',
                  background: 'var(--color-surface-2, #141822)',
                  border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                  borderRadius: 10,
                  fontSize: 13.5,
                }}
                placeholder={config.placeholder}
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    config.onConfirm(val);
                    onClose();
                  }
                }}
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="admin-modal-footer">
          <button 
            type="button"
            className="admin-btn admin-btn-secondary" 
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`admin-btn ${isDanger ? 'admin-btn-danger' : 'admin-btn-primary'}`}
            onClick={() => {
              config.onConfirm(val);
              onClose();
            }}
          >
            {config.confirmText || (isDanger ? 'Confirm' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}

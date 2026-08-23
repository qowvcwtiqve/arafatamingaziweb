'use client';

import { useState, useEffect } from 'react';

export default function AdminModal({ config, onClose }) {
  const [val, setVal] = useState('');
  useEffect(() => {
    setVal(config?.initialValue || '');
  }, [config]);

  if (!config?.isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        className="card card--elevated"
        style={{
          width: 400,
          maxWidth: '90%',
          padding: 24,
          animation: 'fadeIn 0.2s ease',
          border: '1px solid var(--color-border)',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{config.title}</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 20 }}>
          {config.message}
        </p>

        {config.type === 'prompt' && (
          <input
            className="form-input"
            placeholder={config.placeholder}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            autoFocus
            style={{ marginBottom: 20 }}
          />
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn ${config.type === 'confirm' ? 'btn--danger' : 'btn--primary'}`}
            onClick={() => {
              config.onConfirm(val);
              onClose();
            }}
          >
            {config.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

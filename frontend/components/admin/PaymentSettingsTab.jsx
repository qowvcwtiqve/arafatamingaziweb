'use client';

import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function PaymentSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedGateway, setExpandedGateway] = useState(null); // Accordion state for config

  const [settings, setSettings] = useState({
    upi_qr: {
      enabled: true,
      title: 'UPI / QR Code',
      desc: 'Google Pay, PhonePe, Paytm, BHIM with UTR verification',
      icon: 'qr_code_2',
      color: '#10B981',
      upi_id: 'quantumxd@upi',
      merchant_name: 'QuantumXD Store',
      qr_image_url: '/upi-qr.png',
    },
    cashfree: {
      enabled: true,
      title: 'Cashfree PG',
      desc: 'Automated Cards, NetBanking & UPI PG checkout',
      icon: 'credit_card',
      color: '#00A0E3',
      client_id: '',
      client_secret: '',
      env: 'PRODUCTION',
    },
    binance: {
      enabled: true,
      title: 'Binance Pay',
      desc: 'Instant USDT / crypto transfer via Binance App (0% fee)',
      icon: 'payments',
      color: '#F0B90B',
      binance_pay_id: '1133813547',
      api_key: '',
      api_secret: '',
    },
    nowpayments: {
      enabled: true,
      title: 'Crypto (NOWPayments)',
      desc: 'BTC, ETH, SOL, USDT + 100 cryptocurrencies invoice',
      icon: 'currency_bitcoin',
      color: '#F7931A',
      api_key: '',
      ipn_secret: '',
    },
    wallet: {
      enabled: true,
      title: 'Account Wallet Balance',
      desc: '1-Click instant automated checkout with user wallet funds',
      icon: 'account_balance_wallet',
      color: '#8B5CF6',
    },
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/payment-settings');
      if (data.settings) {
        setSettings((prev) => ({ ...prev, ...data.settings }));
      }
    } catch (err) {
      console.error('Failed to load payment settings:', err);
      toast.error('Failed to load payment settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggle = (gatewayKey, e) => {
    e?.stopPropagation();
    setSettings((prev) => ({
      ...prev,
      [gatewayKey]: {
        ...prev[gatewayKey],
        enabled: !prev[gatewayKey]?.enabled,
      },
    }));
  };

  const handleFieldChange = (gatewayKey, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [gatewayKey]: {
        ...prev[gatewayKey],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/admin/payment-settings', { settings });
      toast.success('Payment settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error(err.response?.data?.error || 'Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 10 }}>
        <div className="skeleton" style={{ height: 48, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 60, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 60, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 60, borderRadius: 10 }} />
      </div>
    );
  }

  const activeCount = Object.values(settings).filter((g) => g?.enabled).length;

  const GATEWAYS = [
    { key: 'upi_qr', name: 'UPI / QR Code', icon: 'qr_code_2', color: '#10B981', tag: 'Direct UPI' },
    { key: 'cashfree', name: 'Cashfree Payment Gateway', icon: 'credit_card', color: '#00A0E3', tag: 'PG / Cards' },
    { key: 'binance', name: 'Binance Pay', icon: 'payments', color: '#F0B90B', tag: '0% Fee Crypto' },
    { key: 'nowpayments', name: 'NOWPayments (Crypto)', icon: 'currency_bitcoin', color: '#F7931A', tag: '100+ Coins' },
    { key: 'wallet', name: 'Wallet Balance', icon: 'account_balance_wallet', color: '#8B5CF6', tag: 'Instant 1-Click' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Sleek Minimal Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(79, 70, 229, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary-light)',
            }}
          >
            <span className="icon icon--sm icon--filled">account_balance_wallet</span>
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
              Payment Methods
            </h2>
            <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
              {activeCount} of 5 active on checkout
            </span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn--primary btn--sm"
          style={{
            padding: '7px 16px',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 8,
          }}
        >
          <span className="icon icon--sm">save</span>
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {/* Compact Gateway Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {GATEWAYS.map((g) => {
          const cfg = settings[g.key] || {};
          const isEnabled = Boolean(cfg.enabled);
          const isExpanded = expandedGateway === g.key;
          const hasFields = g.key !== 'wallet';

          return (
            <div
              key={g.key}
              style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md, 10px)',
                border: `1px solid ${isEnabled ? 'var(--color-border)' : 'var(--color-border)'}`,
                overflow: 'hidden',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Row Header */}
              <div
                onClick={() => hasFields && setExpandedGateway(isExpanded ? null : g.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  cursor: hasFields ? 'pointer' : 'default',
                  background: isExpanded ? 'var(--color-surface-2)' : 'transparent',
                }}
              >
                {/* Left: Icon & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: `${g.color}15`,
                      border: `1px solid ${g.color}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: g.color,
                      flexShrink: 0,
                    }}
                  >
                    <span className="icon icon--sm icon--filled">{g.icon}</span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                        {g.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 6,
                          background: 'var(--color-surface-2)',
                          color: 'var(--color-text-muted)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {g.tag}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                      {cfg.desc}
                    </span>
                  </div>
                </div>

                {/* Right: Toggle & Expand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }} onClick={(e) => e.stopPropagation()}>
                  {/* Status Indicator & Checkbox */}
                  <div
                    onClick={(e) => handleToggle(g.key, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: isEnabled ? '#10B981' : 'var(--color-text-faint)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {isEnabled ? 'ACTIVE' : 'DISABLED'}
                    </span>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => handleToggle(g.key, e)}
                      style={{
                        width: 36,
                        height: 20,
                        cursor: 'pointer',
                        accentColor: g.color,
                      }}
                    />
                  </div>

                  {/* Expand Chevron (if editable) */}
                  {hasFields && (
                    <button
                      type="button"
                      onClick={() => setExpandedGateway(isExpanded ? null : g.key)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 4,
                      }}
                    >
                      <span
                        className="icon icon--sm"
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                        }}
                      >
                        expand_more
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible Config Fields */}
              {isExpanded && hasFields && (
                <div
                  style={{
                    padding: '14px 16px',
                    borderTop: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                  }}
                >
                  {/* UPI QR Inputs */}
                  {g.key === 'upi_qr' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                          UPI ID (VPA)
                        </label>
                        <input
                          type="text"
                          value={cfg.upi_id || ''}
                          onChange={(e) => handleFieldChange('upi_qr', 'upi_id', e.target.value)}
                          placeholder="e.g. quantumxd@upi"
                          className="form-input"
                          style={{ width: '100%', height: 34, fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                          Merchant Name
                        </label>
                        <input
                          type="text"
                          value={cfg.merchant_name || ''}
                          onChange={(e) => handleFieldChange('upi_qr', 'merchant_name', e.target.value)}
                          placeholder="e.g. QuantumXD Store"
                          className="form-input"
                          style={{ width: '100%', height: 34, fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                          Custom QR Image URL (Optional)
                        </label>
                        <input
                          type="text"
                          value={cfg.qr_image_url || ''}
                          onChange={(e) => handleFieldChange('upi_qr', 'qr_image_url', e.target.value)}
                          placeholder="/upi-qr.png or leave empty"
                          className="form-input"
                          style={{ width: '100%', height: 34, fontSize: 12 }}
                        />
                      </div>
                    </>
                  )}

                  {/* Cashfree Inputs */}
                  {g.key === 'cashfree' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                          App ID / Client ID
                        </label>
                        <input
                          type="text"
                          value={cfg.client_id || ''}
                          onChange={(e) => handleFieldChange('cashfree', 'client_id', e.target.value)}
                          placeholder="CF App ID"
                          className="form-input"
                          style={{ width: '100%', height: 34, fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                          Secret Key
                        </label>
                        <input
                          type="password"
                          value={cfg.client_secret || ''}
                          onChange={(e) => handleFieldChange('cashfree', 'client_secret', e.target.value)}
                          placeholder="CF Secret Key"
                          className="form-input"
                          style={{ width: '100%', height: 34, fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                          Environment
                        </label>
                        <select
                          value={cfg.env || 'PRODUCTION'}
                          onChange={(e) => handleFieldChange('cashfree', 'env', e.target.value)}
                          className="form-input"
                          style={{ width: '100%', height: 34, fontSize: 12 }}
                        >
                          <option value="PRODUCTION">PRODUCTION (Live)</option>
                          <option value="TEST">TEST (Sandbox)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Binance Inputs */}
                  {g.key === 'binance' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                          Binance Pay ID
                        </label>
                        <input
                          type="text"
                          value={cfg.binance_pay_id || ''}
                          onChange={(e) => handleFieldChange('binance', 'binance_pay_id', e.target.value)}
                          placeholder="e.g. 1133813547"
                          className="form-input"
                          style={{ width: '100%', height: 34, fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                          Binance API Key (Optional)
                        </label>
                        <input
                          type="password"
                          value={cfg.api_key || ''}
                          onChange={(e) => handleFieldChange('binance', 'api_key', e.target.value)}
                          placeholder="API Key"
                          className="form-input"
                          style={{ width: '100%', height: 34, fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                          API Secret (Optional)
                        </label>
                        <input
                          type="password"
                          value={cfg.api_secret || ''}
                          onChange={(e) => handleFieldChange('binance', 'api_secret', e.target.value)}
                          placeholder="API Secret"
                          className="form-input"
                          style={{ width: '100%', height: 34, fontSize: 12 }}
                        />
                      </div>
                    </>
                  )}

                  {/* NOWPayments Inputs */}
                  {g.key === 'nowpayments' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                          NOWPayments API Key
                        </label>
                        <input
                          type="password"
                          value={cfg.api_key || ''}
                          onChange={(e) => handleFieldChange('nowpayments', 'api_key', e.target.value)}
                          placeholder="API Key"
                          className="form-input"
                          style={{ width: '100%', height: 34, fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                          IPN Secret (Optional)
                        </label>
                        <input
                          type="password"
                          value={cfg.ipn_secret || ''}
                          onChange={(e) => handleFieldChange('nowpayments', 'ipn_secret', e.target.value)}
                          placeholder="IPN Secret"
                          className="form-input"
                          style={{ width: '100%', height: 34, fontSize: 12 }}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { 
  QrCode, 
  CreditCard, 
  Banknote, 
  Bitcoin, 
  Wallet, 
  ChevronDown, 
  Save, 
  Check, 
  Key, 
  ShieldCheck, 
  Lock,
  Layers
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function PaymentSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedGateway, setExpandedGateway] = useState(null);

  const [settings, setSettings] = useState({
    upi_qr: {
      enabled: true,
      title: 'UPI / QR Code',
      desc: 'Google Pay, PhonePe, Paytm, BHIM with UTR verification',
      color: '#10B981',
      upi_id: 'quantumxd@upi',
      merchant_name: 'QuantumXD',
      qr_image_url: '/upi-qr.png',
    },
    cashfree: {
      enabled: true,
      title: 'Cashfree PG',
      desc: 'Automated Cards, NetBanking & UPI PG checkout',
      color: '#00A0E3',
      client_id: '',
      client_secret: '',
      env: 'PRODUCTION',
    },
    binance: {
      enabled: true,
      title: 'Binance Pay',
      desc: 'Instant USDT / crypto transfer via Binance App (0% fee)',
      color: '#F0B90B',
      binance_pay_id: '1133813547',
      api_key: '',
      api_secret: '',
    },
    nowpayments: {
      enabled: true,
      title: 'Crypto (NOWPayments)',
      desc: 'BTC, ETH, SOL, USDT + 100 cryptocurrencies invoice',
      color: '#F7931A',
      api_key: '',
      ipn_secret: '',
    },
    wallet: {
      enabled: true,
      title: 'Account Wallet Balance',
      desc: '1-Click instant automated checkout with user wallet funds',
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

  const GATEWAYS = [
    { key: 'upi_qr', name: 'UPI / QR Code', icon: QrCode, color: '#10B981', tag: 'Direct UPI' },
    { key: 'cashfree', name: 'Cashfree Payment Gateway', icon: CreditCard, color: '#00A0E3', tag: 'PG / Cards' },
    { key: 'binance', name: 'Binance Pay', icon: Banknote, color: '#F0B90B', tag: '0% Fee Crypto' },
    { key: 'nowpayments', name: 'NOWPayments (Crypto)', icon: Bitcoin, color: '#F7931A', tag: '100+ Coins' },
    { key: 'wallet', name: 'Wallet Balance', icon: Wallet, color: '#8B5CF6', tag: 'Instant 1-Click' },
  ];

  const handleToggle = async (gatewayKey, e) => {
    if (e) e.stopPropagation();
    const currentVal = Boolean(settings[gatewayKey]?.enabled);
    const nextEnabled = !currentVal;
    
    const newSettings = {
      ...settings,
      [gatewayKey]: {
        ...settings[gatewayKey],
        enabled: nextEnabled,
      },
    };
    
    setSettings(newSettings);
    
    try {
      await api.post('/admin/payment-settings', { settings: newSettings });
      const gatewayName = GATEWAYS.find(g => g.key === gatewayKey)?.name || gatewayKey;
      toast.success(`${gatewayName} is now ${nextEnabled ? 'ON' : 'OFF'}`);
    } catch (err) {
      console.error('Failed to toggle gateway:', err);
      toast.error('Failed to update status');
      setSettings(prev => ({
        ...prev,
        [gatewayKey]: {
          ...prev[gatewayKey],
          enabled: currentVal,
        },
      }));
    }
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ height: 60, borderRadius: 14, background: 'var(--color-surface-2)' }} />
        <div style={{ height: 60, borderRadius: 14, background: 'var(--color-surface-2)' }} />
        <div style={{ height: 60, borderRadius: 14, background: 'var(--color-surface-2)' }} />
      </div>
    );
  }

  const activeCount = Object.values(settings).filter((g) => g?.enabled).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* HEADER BAR */}
      <div className="admin-card-section" style={{ margin: 0 }}>
        <div className="admin-card-header">
          <div className="admin-card-title">
            <Wallet size={18} color="#3874FF" />
            <span>Gateway Engine ({activeCount} Active)</span>
          </div>
          <div className="admin-card-actions">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="admin-btn admin-btn-primary"
            >
              <Save size={16} />
              <span>{saving ? 'Syncing...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* GATEWAYS LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {GATEWAYS.map((g) => {
          const Icon = g.icon;
          const cfg = settings[g.key] || {};
          const isEnabled = Boolean(cfg.enabled);
          const isExpanded = expandedGateway === g.key;
          const hasFields = g.key !== 'wallet';

          return (
            <div key={g.key} className="admin-card-section" style={{ margin: 0 }}>
              
              {/* Row Bar */}
              <div
                onClick={() => hasFields && setExpandedGateway(isExpanded ? null : g.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  cursor: hasFields ? 'pointer' : 'default',
                  background: isExpanded ? 'var(--color-surface-2, #141822)' : 'transparent',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: `${g.color}18`,
                      border: `1px solid ${g.color}35`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: g.color,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
                        {g.name}
                      </span>
                      <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                        {g.tag}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {cfg.desc}
                    </div>
                  </div>
                </div>

                {/* Right: Toggle Switch & Expand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    onClick={(e) => handleToggle(g.key, e)}
                    style={{
                      width: 48,
                      height: 26,
                      borderRadius: 9999,
                      background: isEnabled ? (g.color || '#10B981') : 'rgba(255,255,255,0.12)',
                      position: 'relative',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      padding: 3,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                        transform: isEnabled ? 'translateX(22px)' : 'translateX(0px)',
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    />
                  </button>

                  {hasFields && (
                    <button
                      type="button"
                      onClick={() => setExpandedGateway(isExpanded ? null : g.key)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4, display: 'flex' }}
                    >
                      <ChevronDown
                        size={18}
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible Config Fields */}
              {isExpanded && hasFields && (
                <div
                  style={{
                    padding: 20,
                    borderTop: '1px solid var(--color-border, rgba(255, 255, 255, 0.06))',
                    background: 'var(--color-surface-2, #141822)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 14,
                  }}
                >
                  {g.key === 'upi_qr' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 5 }}>
                          UPI Virtual Payment Address (VPA)
                        </label>
                        <input
                          type="text"
                          value={cfg.upi_id || ''}
                          onChange={(e) => handleFieldChange('upi_qr', 'upi_id', e.target.value)}
                          placeholder="e.g. yourname@okaxis"
                          style={{
                            width: '100%',
                            height: 38,
                            padding: '0 12px',
                            background: 'var(--color-surface, #0F131C)',
                            border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                            borderRadius: 8,
                            fontSize: 13,
                            color: 'var(--color-text, #FFFFFF)',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 5 }}>
                          Merchant Business Name
                        </label>
                        <input
                          type="text"
                          value={cfg.merchant_name || ''}
                          onChange={(e) => handleFieldChange('upi_qr', 'merchant_name', e.target.value)}
                          placeholder="e.g. QuantumXD"
                          style={{
                            width: '100%',
                            height: 38,
                            padding: '0 12px',
                            background: 'var(--color-surface, #0F131C)',
                            border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                            borderRadius: 8,
                            fontSize: 13,
                            color: 'var(--color-text, #FFFFFF)',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </>
                  )}

                  {g.key === 'cashfree' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 5 }}>
                          Cashfree App ID / Client ID
                        </label>
                        <input
                          type="text"
                          value={cfg.client_id || ''}
                          onChange={(e) => handleFieldChange('cashfree', 'client_id', e.target.value)}
                          placeholder="CF_APP_ID..."
                          style={{
                            width: '100%',
                            height: 38,
                            padding: '0 12px',
                            background: 'var(--color-surface, #0F131C)',
                            border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                            borderRadius: 8,
                            fontSize: 13,
                            color: 'var(--color-text, #FFFFFF)',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 5 }}>
                          Secret Key
                        </label>
                        <input
                          type="password"
                          value={cfg.client_secret || ''}
                          onChange={(e) => handleFieldChange('cashfree', 'client_secret', e.target.value)}
                          placeholder="CF_SECRET_KEY..."
                          style={{
                            width: '100%',
                            height: 38,
                            padding: '0 12px',
                            background: 'var(--color-surface, #0F131C)',
                            border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                            borderRadius: 8,
                            fontSize: 13,
                            color: 'var(--color-text, #FFFFFF)',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </>
                  )}

                  {g.key === 'binance' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 5 }}>
                          Binance Pay ID
                        </label>
                        <input
                          type="text"
                          value={cfg.binance_pay_id || ''}
                          onChange={(e) => handleFieldChange('binance', 'binance_pay_id', e.target.value)}
                          placeholder="e.g. 1133813547"
                          style={{
                            width: '100%',
                            height: 38,
                            padding: '0 12px',
                            background: 'var(--color-surface, #0F131C)',
                            border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                            borderRadius: 8,
                            fontSize: 13,
                            color: 'var(--color-text, #FFFFFF)',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </>
                  )}

                  {g.key === 'nowpayments' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 5 }}>
                          NOWPayments API Key
                        </label>
                        <input
                          type="text"
                          value={cfg.api_key || ''}
                          onChange={(e) => handleFieldChange('nowpayments', 'api_key', e.target.value)}
                          placeholder="API Key..."
                          style={{
                            width: '100%',
                            height: 38,
                            padding: '0 12px',
                            background: 'var(--color-surface, #0F131C)',
                            border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                            borderRadius: 8,
                            fontSize: 13,
                            color: 'var(--color-text, #FFFFFF)',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 5 }}>
                          IPN Secret
                        </label>
                        <input
                          type="password"
                          value={cfg.ipn_secret || ''}
                          onChange={(e) => handleFieldChange('nowpayments', 'ipn_secret', e.target.value)}
                          placeholder="IPN Secret Key..."
                          style={{
                            width: '100%',
                            height: 38,
                            padding: '0 12px',
                            background: 'var(--color-surface, #0F131C)',
                            border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                            borderRadius: 8,
                            fontSize: 13,
                            color: 'var(--color-text, #FFFFFF)',
                            outline: 'none',
                          }}
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

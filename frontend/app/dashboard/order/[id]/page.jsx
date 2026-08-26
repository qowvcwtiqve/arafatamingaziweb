'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCurrency } from '../../../../store/currencyStore';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  Delivered: {
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    color: '#10b981',
    icon: 'check_circle',
    title: 'Order Delivered Successfully',
    subtitle: 'Your credentials have been dispatched and are ready to use.',
  },
  'Pre-Order': {
    bg: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.35)',
    color: '#a855f7',
    icon: 'rocket_launch',
    title: 'Pre-Order Active (In Queue)',
    subtitle: 'Your order is queued and will be auto-delivered immediately when stock arrives.',
  },
  Pending: {
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    color: '#f59e0b',
    icon: 'hourglass_top',
    title: 'Manual Order Processing',
    subtitle: 'Admin is preparing your account credentials. You will receive them shortly.',
  },
  Refunded: {
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.35)',
    color: '#3b82f6',
    icon: 'currency_exchange',
    title: 'Order Refunded',
    subtitle: 'This order has been refunded to your wallet or original payment source.',
  },
  Canceled: {
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)',
    color: '#ef4444',
    icon: 'cancel',
    title: 'Order Canceled',
    subtitle: 'This order was canceled. Contact support if you need assistance.',
  },
};

const getStatusCfg = (st) => {
  const s = String(st || '').toLowerCase().replace(/[^a-z]/g, '');
  if (s === 'delivered' || s === 'paid') return STATUS_CONFIG['Delivered'];
  if (s === 'preorder') return STATUS_CONFIG['Pre-Order'];
  if (s === 'pending' || s === 'processing' || s === 'underreview' || s === 'hold') return STATUS_CONFIG['Pending'];
  if (s === 'refunded') return STATUS_CONFIG['Refunded'];
  if (s === 'canceled' || s === 'cancelled' || s === 'failed') return STATUS_CONFIG['Canceled'];
  return STATUS_CONFIG['Pending'];
};

export default function OrderReceiptPage() {
  const { id } = useParams();
  const router = useRouter();
  const { format } = useCurrency();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/users/orders/${id}`)
      .then(({ data }) => {
        setOrder(data.order);
      })
      .catch((err) => {
        console.error('Order fetch error:', err);
        toast.error(err.response?.data?.error || 'Failed to load order receipt');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopyCredentials = () => {
    if (!order?.credentials) return;
    navigator.clipboard.writeText(order.credentials);
    setCopiedCreds(true);
    toast.success('Credentials copied to clipboard!');
    setTimeout(() => setCopiedCreds(false), 2500);
  };

  const getBotReceiptText = () => {
    if (!order) return '';
    return `🧾 𝗤𝗨𝗔𝗡𝗧𝗨𝗠𝗫𝗗 𝗢𝗥𝗗𝗘𝗥 𝗥𝗘𝗖𝗘𝗜𝗣𝗧

🆔 Order ID: #${order.order_id}
📦 Product: ${order.product_name}
🏷️ Plan: ${order.variant_name}
💰 Amount: ₹${parseFloat(order.price).toFixed(2)}
⚡ Status: ${order.status}
📅 Date: ${order.purchase_date}
⏳ Expiry: ${order.expiry_date}

🔑 DELIVERED CREDENTIALS:
----------------------------------------
${order.credentials || '[Pending Stock Delivery]'}
----------------------------------------

📋 RULES & INSTRUCTIONS:
${order.rules || 'Please adhere to all standard login guidelines.'}

💬 24/7 SUPPORT:
Telegram: @${order.support_username || 'qxdbotowner'}`;
  };

  const handleCopyBotReceipt = () => {
    navigator.clipboard.writeText(getBotReceiptText());
    setCopiedReceipt(true);
    toast.success('Full invoice receipt copied to clipboard!');
    setTimeout(() => setCopiedReceipt(false), 2500);
  };

  if (loading) {
    return (
      <div style={{ paddingTop: 'calc(var(--header-height) + 40px)', paddingBottom: 80 }}>
        <div className="container" style={{ maxWidth: 840 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="skeleton" style={{ height: 40, width: '40%', borderRadius: 12 }} />
            <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
            <div className="skeleton" style={{ height: 260, borderRadius: 16 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ paddingTop: 'calc(var(--header-height) + 60px)', paddingBottom: 80, textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 540 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            color: 'var(--color-error)'
          }}>
            <span className="icon icon--xl">receipt_long</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Order Not Found
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
            The requested order ID #{id} was not found or you are not authorized to view it.
          </p>
          <Link href="/dashboard" className="btn btn--primary btn--md" style={{ gap: 6 }}>
            <span className="icon icon--sm">arrow_back</span>
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const statusCfg = getStatusCfg(order.status);
  const isPreorderOrder = String(order.status || '').toLowerCase().includes('pre');

  return (
    <div style={{ paddingTop: 'calc(var(--header-height) + 24px)', paddingBottom: 90 }}>
      <div className="container receipt-page-container" style={{ maxWidth: 880 }}>

        {/* Back Link & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn btn--ghost btn--sm"
            style={{ gap: 6 }}
          >
            <span className="icon icon--sm">arrow_back</span>
            <span>Back to My Orders</span>
          </button>
          
          <button
            onClick={handleCopyBotReceipt}
            className="btn btn--outline btn--sm"
            style={{ gap: 6 }}
          >
            <span className="icon icon--sm">{copiedReceipt ? 'check' : 'content_copy'}</span>
            <span>{copiedReceipt ? 'Receipt Copied!' : 'Copy Full Receipt'}</span>
          </button>
        </div>

        {/* 1. Status Banner */}
        <div
          className="receipt-status-banner"
          style={{
            padding: '22px 26px',
            background: statusCfg.bg,
            border: `1.5px solid ${statusCfg.border}`,
            borderRadius: 'var(--radius-xl)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 8px 30px rgba(0,0,0,0.25)'
          }}
        >
          <div
            className="receipt-status-icon-wrap"
            style={{
              width: 52, height: 52, borderRadius: 'var(--radius-lg)',
              background: `${statusCfg.color}22`, display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              color: statusCfg.color,
            }}
          >
            <span className="icon icon--lg">{statusCfg.icon}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 19, fontWeight: 800, color: statusCfg.color, margin: 0 }}>
                {statusCfg.title}
              </h1>
              <span style={{
                fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                background: statusCfg.color, color: '#000', textTransform: 'uppercase'
              }}>
                {order.status}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0', lineHeight: 1.4 }}>
              {statusCfg.subtitle}
            </p>
          </div>
        </div>

        {/* 2. Order Details & Deliverables Card */}
        <div
          className="receipt-details-card"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: 28,
            marginBottom: 20,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}
        >

          {/* Product Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', paddingBottom: 18, marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Purchased Item
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: 'var(--color-text)' }}>
                {order.product_name}
              </h2>
              <div style={{ fontSize: 13.5, color: 'var(--color-cyan)', fontWeight: 600 }}>
                Plan: {order.variant_name}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)', textTransform: 'uppercase', marginBottom: 2 }}>
                Total Paid
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800, color: 'var(--color-accent)' }}>
                {format(order.total_amount)}
              </div>
            </div>
          </div>

          {/* Quick Meta Grid */}
          <div
            className="receipt-meta-grid"
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14,
              background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 24
            }}
          >
            {[
              { label: 'Order ID', value: `#${order.order_id}`, icon: 'tag' },
              { label: 'Purchase Date', value: order.purchase_date, icon: 'calendar_today' },
              { label: 'Validity / Expiry', value: order.expiry_date, icon: 'timer' },
              { label: 'Delivery Guarantee', value: order.delivery_time || 'Instant Automated', icon: 'bolt' },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="icon" style={{ fontSize: 14, color: 'var(--color-text-faint)' }}>{f.icon}</span>
                  {f.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', wordBreak: 'break-word' }}>
                  {f.value}
                </div>
              </div>
            ))}
          </div>

          {/* 3. Delivered Credentials Box (Bot Style) */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <label style={{ fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="icon icon--sm">vpn_key</span>
                Delivered Account Credentials / Key
              </label>

              {order.credentials && (
                <button
                  onClick={handleCopyCredentials}
                  className="btn btn--secondary btn--sm"
                  style={{ gap: 5, padding: '5px 12px' }}
                >
                  <span className="icon icon--sm">{copiedCreds ? 'check' : 'content_copy'}</span>
                  <span>{copiedCreds ? 'Copied!' : 'Copy Credentials'}</span>
                </button>
              )}
            </div>

            {order.credentials ? (
              <div
                className="receipt-credentials-pre"
                style={{
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1.5px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px 18px',
                  fontFamily: 'monospace',
                  fontSize: 13.5,
                  color: '#10b981',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  lineHeight: 1.6,
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.1)',
                  position: 'relative'
                }}
              >
                {order.credentials}
              </div>
            ) : (
              <div style={{
                background: 'var(--color-surface-2)',
                border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px 16px',
                textAlign: 'center',
                color: 'var(--color-text-faint)',
                fontSize: 13
              }}>
                <span className="icon icon--lg" style={{ display: 'block', margin: '0 auto 8px', color: isPreorderOrder ? '#a855f7' : '#f59e0b' }}>
                  {isPreorderOrder ? 'rocket_launch' : 'hourglass_empty'}
                </span>
                {isPreorderOrder
                  ? 'Pre-Order Queue Reserved. As soon as the pre-order stock is added by administrator, your credentials will automatically appear here.'
                  : 'Manual Order is being processed by administrator. Your credentials or activation details will be delivered here shortly.'}
              </div>
            )}
          </div>

          {/* 4. Usage Rules & Terms Box */}
          {order.rules && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span className="icon icon--sm">gavel</span>
                Usage Rules &amp; Guidelines
              </label>
              <div style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 16px',
                fontSize: 13,
                color: 'var(--color-text-muted)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6
              }}>
                {order.rules}
              </div>
            </div>
          )}

          {/* 5. 24/7 Human Support & Warranty Guarantee */}
          <div
            className="receipt-support-card"
            style={{
              background: 'rgba(110, 58, 255, 0.08)',
              border: '1px solid rgba(110, 58, 255, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 14
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--gradient-primary)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#fff',
                flexShrink: 0
              }}>
                <span className="icon icon--md">support_agent</span>
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)' }}>
                  Need Warranty Replacement or Support?
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>
                  Direct 24/7 Telegram support with Order #{order.order_id}
                </div>
              </div>
            </div>

            <a
              href={`https://t.me/${order.support_username || 'qxdbotowner'}?text=Hello%2C%20I%20need%20support%20for%20my%20Order%20%23${order.order_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary btn--sm receipt-support-btn"
              style={{ gap: 6, padding: '8px 16px' }}
            >
              <span className="icon icon--sm">send</span>
              <span>Telegram Support</span>
            </a>
          </div>

        </div>

      </div>
    </div>
  );
}

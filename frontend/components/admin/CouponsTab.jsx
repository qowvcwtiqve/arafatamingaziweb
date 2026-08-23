'use client';

import { useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function CouponsTab({ coupons, onAdd, onDelete }) {
  const [form, setForm] = useState({ code: '', discount_type: 'percent', discount_value: '', min_order_amount: '', max_uses: '100' });
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) return toast.error('Coupon code is required');
    setCreating(true);
    try {
      const { data } = await api.post('/admin/coupons', form);
      onAdd(data.coupon);
      toast.success('Coupon created successfully!');
      setForm({ code: '', discount_type: 'percent', discount_value: '', min_order_amount: '', max_uses: '100' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create coupon');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, marginBottom: 24 }}>
        Discount <span className="text-gradient">Coupons</span>
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
        
        {/* Create Coupon Form */}
        <div className="card card--elevated" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            Create New Coupon
          </h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Coupon Code</label>
              <input
                className="form-input"
                placeholder="e.g. FLASH50"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Discount Type</label>
              <select className="form-input" value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}>
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Discount Value</label>
              <input
                type="number"
                className="form-input"
                placeholder={form.discount_type === 'percent' ? 'e.g. 20 (for 20% off)' : 'e.g. 150 (for ₹150 off)'}
                value={form.discount_value}
                onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Min Order Amount (₹)</label>
              <input
                type="number"
                className="form-input"
                placeholder="0 for no minimum"
                value={form.min_order_amount}
                onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Max Uses</label>
              <input
                type="number"
                className="form-input"
                value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn btn--primary" disabled={creating} style={{ height: 42, marginTop: 6 }}>
              <span className="icon icon--sm">add</span>
              {creating ? 'Creating...' : 'Create Coupon'}
            </button>
          </form>
        </div>

        {/* Coupons List */}
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Code</th><th>Type</th><th>Value</th><th>Uses</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-faint)', padding: 32 }}>No coupons created yet</td></tr>
              ) : (
                coupons.map(c => (
                  <tr key={c.id}>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-light)', fontSize: 14 }}>{c.code}</span></td>
                    <td style={{ textTransform: 'capitalize', fontSize: 13 }}>{c.discount_type}</td>
                    <td><span style={{ fontWeight: 700 }}>{c.discount_type === 'percent' ? `${c.discount_value}%` : `₹${c.discount_value}`}</span></td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{c.used_count || 0}/{c.max_uses}</td>
                    <td><span className={`status status--${c.is_active ? 'paid' : 'failed'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={() => onDelete(c.id, c.code)}
                        title="Delete coupon"
                      >
                        <span className="icon icon--sm">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { TicketPercent, Plus, Trash2, Calendar, ShieldCheck, Tag } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import CustomDropdown from '../ui/CustomDropdown';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start' }}>
        
        {/* CREATE COUPON CARD */}
        <div className="admin-card-section" style={{ margin: 0 }}>
          <div className="admin-card-header">
            <div className="admin-card-title">
              <Plus size={18} color="#3874FF" />
              <span>Create Promo Coupon</span>
            </div>
          </div>
          
          <form onSubmit={handleCreate} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                Coupon Promo Code
              </label>
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
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
                placeholder="e.g. MEGA50"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                  Discount Type
                </label>
                <CustomDropdown
                  options={[
                    { value: 'percent', label: 'Percentage (%)' },
                    { value: 'fixed', label: 'Fixed Flat (₹)' },
                  ]}
                  value={form.discount_type}
                  onChange={(val) => setForm((f) => ({ ...f, discount_type: val }))}
                  minWidth={140}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                  Value
                </label>
                <input
                  type="number"
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 12px',
                    background: 'var(--color-surface-2, #141822)',
                    border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                    borderRadius: 10,
                    fontSize: 13.5,
                    color: 'var(--color-text, #FFFFFF)',
                    outline: 'none',
                  }}
                  placeholder={form.discount_type === 'percent' ? 'e.g. 20' : 'e.g. 150'}
                  value={form.discount_value}
                  onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                  Min Order (₹)
                </label>
                <input
                  type="number"
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 12px',
                    background: 'var(--color-surface-2, #141822)',
                    border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                    borderRadius: 10,
                    fontSize: 13,
                    color: 'var(--color-text, #FFFFFF)',
                    outline: 'none',
                  }}
                  placeholder="0 (No minimum)"
                  value={form.min_order_amount}
                  onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                  Max Redemptions
                </label>
                <input
                  type="number"
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 12px',
                    background: 'var(--color-surface-2, #141822)',
                    border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                    borderRadius: 10,
                    fontSize: 13,
                    color: 'var(--color-text, #FFFFFF)',
                    outline: 'none',
                  }}
                  value={form.max_uses}
                  onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="admin-btn admin-btn-primary" 
              disabled={creating} 
              style={{ height: 42, marginTop: 8 }}
            >
              <Plus size={16} />
              <span>{creating ? 'Generating...' : 'Save & Activate Coupon'}</span>
            </button>
          </form>
        </div>

        {/* ACTIVE COUPONS TABLE & MOBILE LIST */}
        <div className="admin-card-section" style={{ margin: 0 }}>
          <div className="admin-card-header">
            <div className="admin-card-title">
              <TicketPercent size={18} color="#3874FF" />
              <span>Active Coupons ({coupons.length})</span>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="admin-table-responsive hide-on-mobile">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Usage</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 800, color: '#3874FF', fontSize: 14 }}>
                        {c.code}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#10B981', fontSize: 13.5 }}>
                        {c.discount_type === 'percent' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 12.5 }}>
                      {c.used_count || 0} / {c.max_uses}
                    </td>
                    <td>
                      <span className={`admin-badge ${c.is_active ? 'approved' : 'failed'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger admin-btn-sm"
                        onClick={() => onDelete(c.id, c.code)}
                        title="Delete coupon"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                      No active discount coupons found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Touch Cards */}
          <div className="admin-mobile-card-list">
            {coupons.map(c => (
              <div key={c.id} className="admin-mobile-card">
                <div className="admin-mobile-card-header">
                  <div>
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 800, color: '#3874FF', fontSize: 15 }}>
                      {c.code}
                    </span>
                  </div>
                  <span className={`admin-badge ${c.is_active ? 'approved' : 'failed'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="admin-mobile-card-rows">
                  <div className="admin-mobile-card-row">
                    <span>Discount:</span>
                    <strong style={{ color: '#10B981' }}>
                      {c.discount_type === 'percent' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`}
                    </strong>
                  </div>
                  <div className="admin-mobile-card-row">
                    <span>Used / Max:</span>
                    <span>{c.used_count || 0} / {c.max_uses}</span>
                  </div>
                </div>

                <div className="admin-mobile-card-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    onClick={() => onDelete(c.id, c.code)}
                  >
                    <Trash2 size={15} />
                    <span>Delete Coupon</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}

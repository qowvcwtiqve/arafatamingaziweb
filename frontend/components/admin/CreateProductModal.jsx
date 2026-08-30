'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  X, 
  Layers, 
  Image as ImageIcon, 
  Sliders, 
  Check, 
  Plus, 
  Zap, 
  IndianRupee, 
  Tag,
  Eye,
  ShieldCheck
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import CustomDropdown from '../ui/CustomDropdown';

export default function CreateProductModal({ categories: initialCategories = [], onClose, onAdd }) {
  const [categories, setCategories] = useState(initialCategories);
  const [formTab, setFormTab] = useState('general');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category_id: initialCategories?.[0]?.id || 'cat-ott',
    delivery_process: 'auto',
    delivery_time: 'Instant Automated Delivery',
    rules: '',
    pool_id: 'default',
    initial_stock: '',
    is_infinite: false,
    is_preorder: false,
    pool_rules: '',
    variant_name: '1 Month Standard',
    price: '',
    duration: '1',
    website_title: '',
    images: '',
    compare_price: '',
    badge: '',
    description: '',
    is_published: true,
  });

  useEffect(() => {
    if (!categories.length) {
      api.get('/products/categories').then(({ data }) => {
        const cats = data.categories || [];
        setCategories(cats);
        if (cats.length && (!form.category_id || form.category_id === 'ai-tools')) {
          setForm(f => ({ ...f, category_id: cats[0].id }));
        }
      }).catch(() => {});
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormTab('general');
      return toast.error('Product name is required');
    }
    if (!form.price) {
      setFormTab('variant');
      return toast.error('Variant price is required');
    }

    setCreating(true);
    try {
      const payload = {
        ...form,
        website_title: form.website_title || form.name,
        images: form.images.split('\n').map((s) => s.trim()).filter(Boolean),
        price: parseFloat(form.price),
        compare_price: form.compare_price ? parseFloat(form.compare_price) : 0,
        duration: parseInt(form.duration || 1),
      };
      const { data } = await api.post('/admin/bot/products', payload);
      if (data.product) {
        onAdd(data.product);
        toast.success(`Product "${form.name}" created successfully!`);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create product');
    } finally {
      setCreating(false);
    }
  };

  const TABS = [
    { id: 'general', label: '1. Basic Info', icon: Box },
    { id: 'variant', label: '2. Pricing & Plan', icon: IndianRupee },
    { id: 'stock', label: '3. Stock & Keys', icon: Layers },
    { id: 'website', label: '4. Media & Meta', icon: ImageIcon },
  ];

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div 
        className="admin-modal-panel large" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="admin-modal-header">
          <div className="admin-modal-title">
            <Plus size={20} color="#3874FF" />
            <span>Create New Digital Product</span>
          </div>
          <button type="button" className="admin-modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Wizard Step Tabs */}
        <div style={{
          display: 'flex',
          gap: 6,
          padding: '10px 20px',
          borderBottom: '1px solid var(--color-border, rgba(255, 255, 255, 0.06))',
          background: 'var(--color-surface-2, #141822)',
          overflowX: 'auto',
        }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = formTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setFormTab(t.id)}
                className={`admin-btn ${isActive ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
                style={{ whiteSpace: 'nowrap' }}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="admin-modal-body" style={{ padding: 20 }}>
          
          {/* TAB 1: GENERAL */}
          {formTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                  Product Title *
                </label>
                <input
                  type="text"
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
                  placeholder="e.g. Netflix Premium 4K UHD"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                    Category
                  </label>
                  <CustomDropdown
                    options={categories.map((c) => ({ value: c.id, label: c.name }))}
                    value={form.category_id}
                    onChange={(val) => setForm((f) => ({ ...f, category_id: val }))}
                    placeholder="Select Category"
                    minWidth={170}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                    Delivery Process
                  </label>
                  <CustomDropdown
                    options={[
                      { value: 'auto', label: 'Automated (Instant Delivery)' },
                      { value: 'manual', label: 'Manual (Admin Review)' },
                    ]}
                    value={form.delivery_process}
                    onChange={(val) => setForm((f) => ({ ...f, delivery_process: val }))}
                    minWidth={180}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                    Delivery Timing
                  </label>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px',
                      background: 'var(--color-surface-2, #141822)',
                      border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                      borderRadius: 10,
                      fontSize: 13,
                      color: 'var(--color-text, #FFFFFF)',
                      outline: 'none',
                    }}
                    value={form.delivery_time}
                    onChange={(e) => setForm((f) => ({ ...f, delivery_time: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                  Terms of Service / Replacement Rules
                </label>
                <textarea
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--color-surface-2, #141822)',
                    border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                    borderRadius: 10,
                    fontSize: 13,
                    color: 'var(--color-text, #FFFFFF)',
                    outline: 'none',
                  }}
                  placeholder="e.g. Do not change email/password. 30 days replacement warranty..."
                  value={form.rules}
                  onChange={(e) => setForm((f) => ({ ...f, rules: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* TAB 2: PRICING & PLAN */}
          {formTab === 'variant' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                    Plan / Variant Name *
                  </label>
                  <input
                    type="text"
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
                    placeholder="e.g. 1 Month Standard"
                    value={form.variant_name}
                    onChange={(e) => setForm((f) => ({ ...f, variant_name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                    Selling Price (₹) *
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
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#10B981',
                      outline: 'none',
                    }}
                    placeholder="e.g. 199"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                    Original Strikethrough Price / MRP (₹)
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
                    placeholder="e.g. 499"
                    value={form.compare_price}
                    onChange={(e) => setForm((f) => ({ ...f, compare_price: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STOCK & KEYS */}
          {formTab === 'stock' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                  Stock Pool ID / Name
                </label>
                <input
                  type="text"
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
                  value={form.pool_id}
                  onChange={(e) => setForm((f) => ({ ...f, pool_id: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={form.is_infinite}
                    onChange={(e) => setForm((f) => ({ ...f, is_infinite: e.target.checked }))}
                  />
                  <span>Infinite Stock Mode</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={form.is_preorder}
                    onChange={(e) => setForm((f) => ({ ...f, is_preorder: e.target.checked }))}
                  />
                  <span>Pre-Order Active</span>
                </label>
              </div>

              {!form.is_infinite && !form.is_preorder && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                    Initial Stock Keys (One key/account per line)
                  </label>
                  <textarea
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--color-surface-2, #141822)',
                      border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                      borderRadius: 10,
                      fontSize: 12.5,
                      fontFamily: 'ui-monospace, monospace',
                      color: 'var(--color-text, #FFFFFF)',
                      outline: 'none',
                    }}
                    placeholder="user1@mail.com:pass1&#10;user2@mail.com:pass2"
                    value={form.initial_stock}
                    onChange={(e) => setForm((f) => ({ ...f, initial_stock: e.target.value }))}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                  Pool-Specific Delivery Rules (Optional)
                </label>
                <textarea
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--color-surface-2, #141822)',
                    border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                    borderRadius: 10,
                    fontSize: 13,
                    color: 'var(--color-text, #FFFFFF)',
                    outline: 'none',
                  }}
                  placeholder="e.g. Account credentials are sent in user:pass format. Login via official app only."
                  value={form.pool_rules}
                  onChange={(e) => setForm((f) => ({ ...f, pool_rules: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* TAB 4: MEDIA & META */}
          {formTab === 'website' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                  Product Image URLs (One URL per line)
                </label>
                <textarea
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--color-surface-2, #141822)',
                    border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                    borderRadius: 10,
                    fontSize: 13,
                    color: 'var(--color-text, #FFFFFF)',
                    outline: 'none',
                  }}
                  placeholder="https://example.com/image.png"
                  value={form.images}
                  onChange={(e) => setForm((f) => ({ ...f, images: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                    Promotional Ribbon Badge
                  </label>
                  <input
                    type="text"
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
                    placeholder="e.g. HOT, BESTSELLER, 50% OFF"
                    value={form.badge}
                    onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                    Publish on Website Immediately
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, is_published: !f.is_published }))}
                    className={`admin-btn ${form.is_published ? 'admin-btn-secondary' : 'admin-btn-ghost'}`}
                    style={{ width: '100%', height: 42, justifyContent: 'center' }}
                  >
                    {form.is_published ? <Eye size={15} /> : <Eye size={15} style={{ opacity: 0.5 }} />}
                    <span>{form.is_published ? 'Live on Store' : 'Hidden from Store'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="admin-modal-footer" style={{ margin: '8px -20px -20px', padding: '16px 20px' }}>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={creating}>
              <Plus size={16} />
              <span>{creating ? 'Publishing...' : 'Save & Publish Product'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

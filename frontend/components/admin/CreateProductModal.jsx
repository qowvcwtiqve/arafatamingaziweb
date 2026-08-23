'use client';

import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function CreateProductModal({ categories: initialCategories = [], onClose, onAdd }) {
  const [categories, setCategories] = useState(initialCategories);
  const [formTab, setFormTab] = useState('general'); // general | stock | variant | website
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
        toast.success(`Product "${form.name}" created and synced with Bot!`);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create product');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card card--elevated"
        style={{
          width: '100%',
          maxWidth: 780,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
          border: '1px solid var(--color-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--color-surface)',
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon" style={{ color: 'var(--color-primary-light)' }}>add_circle</span>
              Add New Product (Bot & Website Hub)
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
              Creates a live product in MongoDB Atlas with 1:1 Telegram Bot and Storefront synchronization.
            </p>
          </div>
          <button onClick={onClose} className="btn btn--ghost btn--sm" style={{ padding: 6 }}>
            <span className="icon">close</span>
          </button>
        </div>

        {/* 4 Tabs Header */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface-2)',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'general', label: 'General & Bot Rules', icon: 'settings' },
            { id: 'stock', label: 'Stock Pool & Keys', icon: 'inventory_2' },
            { id: 'variant', label: 'Variant & Pricing', icon: 'payments' },
            { id: 'website', label: 'Website Display & Media', icon: 'palette' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFormTab(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 18px',
                fontSize: 13,
                fontWeight: formTab === t.id ? 700 : 500,
                color: formTab === t.id ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                background: formTab === t.id ? 'var(--color-surface)' : 'transparent',
                border: 'none',
                borderBottom: formTab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="icon icon--sm" style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
            
            {/* TAB 1: GENERAL & BOT RULES */}
            {formTab === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Product Name (Bot & Global Title) *</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Canva Pro Lifetime, ChatGPT Plus..."
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-input"
                      value={form.category_id}
                      onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || c.title || c.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Delivery Process</label>
                    <select
                      className="form-input"
                      value={form.delivery_process}
                      onChange={(e) => setForm((f) => ({ ...f, delivery_process: e.target.value }))}
                    >
                      <option value="auto">Instant Automated Delivery (From Stock Pool)</option>
                      <option value="manual">Manual Delivery / Ticket Process</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Delivery Time Guarantee</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Instant / 10-30 Mins"
                    value={form.delivery_time}
                    onChange={(e) => setForm((f) => ({ ...f, delivery_time: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Global Product Rules, Warranty & Instructions</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Enter warranty rules, login guidelines, replacement policies..."
                    value={form.rules}
                    onChange={(e) => setForm((f) => ({ ...f, rules: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: STOCK POOL & KEYS */}
            {formTab === 'stock' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Stock Pool ID</label>
                    <input
                      className="form-input"
                      value={form.pool_id}
                      onChange={(e) => setForm((f) => ({ ...f, pool_id: e.target.value }))}
                      placeholder="e.g. default"
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={form.is_infinite}
                        onChange={(e) => setForm((f) => ({ ...f, is_infinite: e.target.checked }))}
                        style={{ width: 16, height: 16 }}
                      />
                      <span style={{ fontWeight: 600, color: 'var(--color-cyan)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="icon icon--sm">all_inclusive</span> Infinite Stock Pool (Never runs out)
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={form.is_preorder}
                        onChange={(e) => setForm((f) => ({ ...f, is_preorder: e.target.checked }))}
                        style={{ width: 16, height: 16 }}
                      />
                      <span>Pre-Order Mode</span>
                    </label>
                  </div>
                </div>

                {!form.is_infinite && (
                  <div className="form-group">
                    <label className="form-label">
                      Initial Stock Credentials / Keys (Paste line by line e.g. email:pass or CODE)
                    </label>
                    <textarea
                      className="form-input"
                      rows={5}
                      placeholder="user1@mail.com:pass1&#10;user2@mail.com:pass2&#10;KEY-XXXX-YYYY"
                      value={form.initial_stock}
                      onChange={(e) => setForm((f) => ({ ...f, initial_stock: e.target.value }))}
                      style={{ fontFamily: 'monospace', fontSize: 12 }}
                    />
                    <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>
                      Each line represents 1 stock unit. When purchased, 1 line will be automatically delivered to the buyer.
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Pool-Specific Delivery Rules (Optional)</label>
                  <input
                    className="form-input"
                    placeholder="Instructions delivered specifically with items from this pool..."
                    value={form.pool_rules}
                    onChange={(e) => setForm((f) => ({ ...f, pool_rules: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: VARIANT & PRICING */}
            {formTab === 'variant' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: 14, background: 'var(--color-surface-2)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Initial Plan / Variant</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    You can add more tiers or plans after creating the product from the Manage Product modal.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Plan Name *</label>
                    <input
                      className="form-input"
                      placeholder="e.g. 1 Month Private, 1 Year UHD"
                      value={form.variant_name}
                      onChange={(e) => setForm((f) => ({ ...f, variant_name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      placeholder="e.g. 199"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Compare Price (Old Strikethrough Price ₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g. 499"
                      value={form.compare_price}
                      onChange={(e) => setForm((f) => ({ ...f, compare_price: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Validity Duration (Months)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="1 for 1 month, 0 for Lifetime"
                      value={form.duration}
                      onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Linked Stock Pool</label>
                  <input
                    className="form-input"
                    value={form.pool_id}
                    onChange={(e) => setForm((f) => ({ ...f, pool_id: e.target.value }))}
                    placeholder="e.g. default"
                  />
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>
                    Maps this variant to the stock pool created in Step 2.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: WEBSITE DISPLAY & MEDIA */}
            {formTab === 'website' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Custom Display Title on Website (Optional)</label>
                  <input
                    className="form-input"
                    placeholder="Leave blank to use global product name"
                    value={form.website_title}
                    onChange={(e) => setForm((f) => ({ ...f, website_title: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Marketing Badge (e.g. Hot, Best Seller, New)</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Hot, Best Seller, New"
                    value={form.badge}
                    onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Product Images URLs (One URL per line)</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="https://images.unsplash.com/...&#10;https://i.imgur.com/..."
                    value={form.images}
                    onChange={(e) => setForm((f) => ({ ...f, images: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rich Store Description</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Detailed feature list, perks, requirements for store visitors..."
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    padding: 12,
                    background: 'var(--color-surface-2)',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                    style={{ width: 18, height: 18 }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>Publish on Storefront</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                      When checked, this product is immediately visible to all buyers on the website.
                    </div>
                  </div>
                </label>
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--color-surface)',
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              {formTab !== 'general' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabs = ['general', 'stock', 'variant', 'website'];
                    const idx = tabs.indexOf(formTab);
                    if (idx > 0) setFormTab(tabs[idx - 1]);
                  }}
                  className="btn btn--ghost btn--sm"
                >
                  ← Previous Step
                </button>
              )}
              {formTab !== 'website' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabs = ['general', 'stock', 'variant', 'website'];
                    const idx = tabs.indexOf(formTab);
                    if (idx < tabs.length - 1) setFormTab(tabs[idx + 1]);
                  }}
                  className="btn btn--ghost btn--sm"
                >
                  Next Step →
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={onClose} className="btn btn--ghost" disabled={creating}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={creating} style={{ gap: 6 }}>
                <span className="icon icon--sm">check</span>
                {creating ? 'Creating...' : 'Create & Sync Product'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

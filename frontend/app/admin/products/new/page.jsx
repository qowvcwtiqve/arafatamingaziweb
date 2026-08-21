'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'software',
    price: '',
    sale_price: '',
    short_desc: '',
    description: '',
    thumbnail_url: '',
    demo_url: '',
    file_url: '',
    stock_type: 'keys',
    stock_keys_input: '',
    is_infinite_stock: false,
    infinite_stock_item: '',
    is_featured: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        stock_keys: form.stock_keys_input
          ? form.stock_keys_input.split('\n').map(s => s.trim()).filter(Boolean)
          : [],
      };
      await api.post('/products', payload);
      toast.success('Product created successfully!');
      router.push('/admin');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '100px 0 60px' }}>
      <div className="container" style={{ maxWidth: 800 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <Link href="/admin" className="btn btn--ghost btn--icon">
            <span className="icon icon--md">arrow_back</span>
          </Link>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700 }}>
              Create New <span className="text-gradient">Product</span>
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Add a digital product, software, or license keys</p>
          </div>
        </div>

        <div className="card card--elevated" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Title */}
            <div className="form-group">
              <label className="form-label">Product Title *</label>
              <input className="form-input" placeholder="e.g. Canva Pro Lifetime Account / Windows 11 Pro Key" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>

            {/* Category & Pricing */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="software">Software & OS</option>
                  <option value="subscriptions">Subscriptions & Accounts</option>
                  <option value="developer">Developer Tools</option>
                  <option value="gaming">Gaming & Codes</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Regular Price (₹) *</label>
                <input type="number" step="0.01" className="form-input" placeholder="499" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Sale Price (₹)</label>
                <input type="number" step="0.01" className="form-input" placeholder="299 (optional)" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} />
              </div>
            </div>

            {/* Short Desc */}
            <div className="form-group">
              <label className="form-label">Short Summary</label>
              <input className="form-input" placeholder="Brief 1-2 sentence description for cards" value={form.short_desc} onChange={e => setForm(f => ({ ...f, short_desc: e.target.value }))} />
            </div>

            {/* Full Desc */}
            <div className="form-group">
              <label className="form-label">Full Description & Features</label>
              <textarea className="form-input" rows={6} placeholder="Detailed product specifications, installation instructions, warranty terms..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Media & Links */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Thumbnail Image URL</label>
                <input type="url" className="form-input" placeholder="https://images.unsplash.com/... or Cloudinary URL" value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Live Demo / Preview URL</label>
                <input type="url" className="form-input" placeholder="https://demo.example.com (optional)" value={form.demo_url} onChange={e => setForm(f => ({ ...f, demo_url: e.target.value }))} />
              </div>
            </div>

            {/* Delivery Type */}
            <div style={{ padding: 18, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <label className="form-label" style={{ marginBottom: 12, display: 'block' }}>Delivery Method</label>
              
              <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                  <input type="radio" name="stock_type" checked={!form.is_infinite_stock} onChange={() => setForm(f => ({ ...f, is_infinite_stock: false }))} />
                  License Keys / Stock List (1 key per buyer)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                  <input type="radio" name="stock_type" checked={form.is_infinite_stock} onChange={() => setForm(f => ({ ...f, is_infinite_stock: true }))} />
                  Infinite Access Link / Single Key (Delivered to all buyers)
                </label>
              </div>

              {form.is_infinite_stock ? (
                <div className="form-group">
                  <label className="form-label">Infinite Item (Delivered Every Time)</label>
                  <input className="form-input" placeholder="e.g. Drive Link / Invite link / Universal Master Key" value={form.infinite_stock_item} onChange={e => setForm(f => ({ ...f, infinite_stock_item: e.target.value }))} />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Stock Keys (1 per line)</label>
                  <textarea className="form-input" rows={4} placeholder="KEY-1234-ABCD&#10;KEY-5678-EFGH&#10;USER:PASS" value={form.stock_keys_input} onChange={e => setForm(f => ({ ...f, stock_keys_input: e.target.value }))} />
                  <p className="form-hint">Each line will be popped and delivered to one customer upon successful payment.</p>
                </div>
              )}
            </div>

            {/* Featured toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
              <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} />
              Display this product in "Featured" homepage section
            </label>

            {/* Submit */}
            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <button type="submit" className="btn btn--primary btn--lg" disabled={loading}>
                <span className="icon icon--sm">publish</span>
                {loading ? 'Creating...' : 'Create & Publish Product'}
              </button>
              <Link href="/admin" className="btn btn--ghost btn--lg">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

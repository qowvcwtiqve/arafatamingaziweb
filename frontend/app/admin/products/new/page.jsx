'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Package } from 'lucide-react';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [form, setForm] = useState({
    name: '',
    category_id: '',
    price: '',
    compare_price: '',
    description: '',
    rules: '',
    imagesStr: '',
    badge: '',
    delivery_time: 'Instant',
    is_featured: false,
    is_published: true,
  });

  useEffect(() => {
    api.get('/products/categories')
      .then(res => {
        const cats = res.data.categories || [];
        setAvailableCategories(cats);
        if (cats.length > 0) {
          setForm(f => ({ ...f, category_id: cats[0].id }));
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
        images: form.imagesStr ? form.imagesStr.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      
      await api.post('/admin/website-products', payload);
      toast.success('Website Product created successfully!');
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
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700 }}>
              Create New <span className="text-gradient">Website Product</span>
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
              These products exist only on the website. Stock and delivery must be handled manually or via external links.
            </p>
          </div>
        </div>

        <div className="card card--elevated" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={20} className="text-gradient" /> Core Details
            </h2>

            <div className="form-group">
              <label className="form-label">Product Name / Title *</label>
              <input className="form-input" placeholder="e.g. Graphic Design Assets Bundle" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required>
                  <option value="" disabled>Select a category...</option>
                  {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Price (₹) *</label>
                <input type="number" step="0.01" className="form-input" placeholder="499" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Compare At Price (₹)</label>
                <input type="number" step="0.01" className="form-input" placeholder="799 (for sale styling)" value={form.compare_price} onChange={e => setForm(f => ({ ...f, compare_price: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Full Description</label>
              <textarea className="form-input" rows={5} placeholder="Detailed product specifications..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Rules & Terms of Use</label>
              <textarea className="form-input" rows={3} placeholder="Any specific rules for this product..." value={form.rules} onChange={e => setForm(f => ({ ...f, rules: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Images (Comma separated URLs. First is thumbnail)</label>
              <textarea className="form-input" rows={3} placeholder="https://unsplash.com/1.jpg, https://unsplash.com/2.jpg" value={form.imagesStr} onChange={e => setForm(f => ({ ...f, imagesStr: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Badge Text</label>
                <input className="form-input" placeholder="e.g. Best Seller" value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Time Text</label>
                <input className="form-input" placeholder="e.g. Instant or 2 Hours" value={form.delivery_time} onChange={e => setForm(f => ({ ...f, delivery_time: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                <input type="checkbox" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} />
                Published (Visible on Website)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} />
                Featured Section
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <button type="submit" className="btn btn--primary btn--lg" disabled={loading}>
                <CheckCircle2 size={18} />
                {loading ? 'Creating...' : 'Create Website Product'}
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

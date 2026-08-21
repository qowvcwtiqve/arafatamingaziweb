'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '../../../../../lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Image as ImageIcon, CheckCircle, Package } from 'lucide-react';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  
  // Forms state
  const [metaForm, setMetaForm] = useState({
    title: '',
    description: '',
    imagesStr: '', // comma separated
    badge: '',
    is_featured: false,
    is_published: false,
    compare_price: '',
  });

  const [variantForms, setVariantForms] = useState({});

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      try {
        // Fetch from the new bot unified endpoint
        const { data } = await api.get(`/admin/bot/products/${id}`);
        const p = data.product;
        setProduct(p);
        setVariants(p.variants || []);

        setMetaForm({
          title: p.title || p.name || '',
          description: p.description || '',
          imagesStr: (p.images || []).join(', '),
          badge: p.badge || '',
          is_featured: p.is_featured || false,
          is_published: p.is_published || false,
          compare_price: p.compare_price || '',
        });

        const vForms = {};
        (p.variants || []).forEach(v => {
          vForms[v.id] = {
            rules: v.rules || '',
            description: v.description || '',
            delivery_time: v.delivery_time || 'Instant',
            delivery_method: v.delivery_method || 'auto',
          };
        });
        setVariantForms(vForms);

      } catch (err) {
        toast.error('Failed to load product details');
        router.push('/admin');
      } finally {
        setInitialLoading(false);
      }
    };
    fetchProduct();
  }, [id, router]);

  const handleMetaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title: metaForm.title,
        description: metaForm.description,
        badge: metaForm.badge,
        images: metaForm.imagesStr.split(',').map(s => s.trim()).filter(Boolean),
        is_featured: metaForm.is_featured,
        is_published: metaForm.is_published,
        compare_price: metaForm.compare_price ? parseFloat(metaForm.compare_price) : null,
      };

      await api.put(`/admin/bot/products/${id}/website-meta`, payload);
      
      // Save all variants sequentially
      for (const v of variants) {
        await api.put(`/admin/bot/products/${id}/variants/${v.id}/meta`, variantForms[v.id]);
      }

      toast.success('Product details & variants updated!');
      router.push('/admin');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const updateVariantForm = (vid, key, value) => {
    setVariantForms(prev => ({
      ...prev,
      [vid]: { ...prev[vid], [key]: value }
    }));
  };

  if (initialLoading) {
    return (
      <div style={{ padding: '100px 0', display: 'flex', justifyContent: 'center' }}>
        <Loader2 className="spinner" size={40} color="var(--color-primary)" />
      </div>
    );
  }

  return (
    <div style={{ padding: '100px 0 60px' }}>
      <div className="container" style={{ maxWidth: 800 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <Link href="/admin" className="btn btn--ghost btn--icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700 }}>
              Edit <span className="text-gradient">Product Website Display</span>
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
              Note: Base pricing, stock, and actual delivery keys are managed by the Telegram Bot.
              Here you can edit how the product looks and is described on the website.
            </p>
          </div>
        </div>

        <form onSubmit={handleMetaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Main Website Meta */}
          <div className="card card--elevated" style={{ padding: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={20} className="text-gradient" /> Main Product Display Info
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="form-group">
                <label className="form-label">Display Title</label>
                <input className="form-input" value={metaForm.title} onChange={e => setMetaForm(f => ({ ...f, title: e.target.value }))} required />
              </div>

              <div className="form-group">
                <label className="form-label">Full Description</label>
                <textarea className="form-input" rows={6} value={metaForm.description} onChange={e => setMetaForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Images (Comma separated URLs. First is thumbnail)</label>
                <textarea className="form-input" rows={3} value={metaForm.imagesStr} onChange={e => setMetaForm(f => ({ ...f, imagesStr: e.target.value }))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Compare At Price (₹) (For Sale Strikethrough)</label>
                  <input type="number" step="0.01" className="form-input" value={metaForm.compare_price} onChange={e => setMetaForm(f => ({ ...f, compare_price: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Badge Text (e.g. "Best Seller")</label>
                  <input className="form-input" value={metaForm.badge} onChange={e => setMetaForm(f => ({ ...f, badge: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                  <input type="checkbox" checked={metaForm.is_published} onChange={e => setMetaForm(f => ({ ...f, is_published: e.target.checked }))} />
                  Published (Visible on Website)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                  <input type="checkbox" checked={metaForm.is_featured} onChange={e => setMetaForm(f => ({ ...f, is_featured: e.target.checked }))} />
                  Featured Section
                </label>
              </div>
            </div>
          </div>

          {/* Variants Meta */}
          {variants.length > 0 && (
            <div className="card card--elevated" style={{ padding: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={20} className="text-gradient" /> Variant Display Overrides
              </h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                Customize rules, descriptions, and delivery methods per variant. If left blank, the bot's default will apply.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {variants.map((v, idx) => (
                  <div key={v.id} style={{ padding: 20, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--color-primary-light)' }}>
                      Variant: {v.name} (Bot Price: ₹{v.price})
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div className="form-group">
                        <label className="form-label">Delivery Method</label>
                        <select className="form-input" value={variantForms[v.id]?.delivery_method} onChange={e => updateVariantForm(v.id, 'delivery_method', e.target.value)}>
                          <option value="auto">Automated Instant</option>
                          <option value="manual">Manual Delivery</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Delivery Time Text</label>
                        <input className="form-input" placeholder="e.g. Instant or 1-2 Hrs" value={variantForms[v.id]?.delivery_time} onChange={e => updateVariantForm(v.id, 'delivery_time', e.target.value)} />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label">Variant Rules</label>
                      <textarea className="form-input" rows={3} placeholder="Specific rules for this variant..." value={variantForms[v.id]?.rules} onChange={e => updateVariantForm(v.id, 'rules', e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Variant Description Override</label>
                      <textarea className="form-input" rows={3} placeholder="Overrides main product description when this variant is selected..." value={variantForms[v.id]?.description} onChange={e => updateVariantForm(v.id, 'description', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, position: 'sticky', bottom: 20, zIndex: 10, background: 'var(--color-background)', padding: '20px 0', borderTop: '1px solid var(--color-border)' }}>
            <button type="submit" className="btn btn--primary btn--lg" disabled={loading} style={{ flex: 1 }}>
              <Save size={18} />
              {loading ? 'Saving Changes...' : 'Save All Changes'}
            </button>
            <Link href="/admin" className="btn btn--ghost btn--lg">
              Cancel
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
}

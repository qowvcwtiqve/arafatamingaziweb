'use client';

import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function EditProductMetaModal({ product, onClose, onUpdate }) {
  const [modalTab, setModalTab] = useState('pools'); // pools | variants | rules | meta
  const [fullProduct, setFullProduct] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  // Forms state
  const [metaForm, setMetaForm] = useState({
    title: product.website_meta?.title || product.name,
    description: product.website_meta?.description || product.description || '',
    images: (product.website_meta?.images || []).join('\n'),
    badge: product.website_meta?.badge || '',
    compare_price: product.website_meta?.compare_price || '',
    is_published: product.website_meta?.is_published !== false,
  });

  const [generalForm, setGeneralForm] = useState({
    name: product.name || '',
    rules: product.rules || '',
    delivery_process: product.delivery_process || 'auto',
    delivery_time: product.delivery_time || 'Instant',
    category_id: product.category_id || '',
    description: product.description || '',
  });

  // Stock addition state
  const [stockInputs, setStockInputs] = useState({});
  const [newPoolName, setNewPoolName] = useState('');
  const [variantComparePrices, setVariantComparePrices] = useState({});
  const [newVariant, setNewVariant] = useState({
    name: '',
    price: '',
    compare_price: '',
    pool_id: 'default',
    duration: '0',
    is_new_pool: false,
    new_pool_name: '',
    is_infinite: false,
  });
  const [editingVariantId, setEditingVariantId] = useState(null);
  const [editingVariantForm, setEditingVariantForm] = useState({});
  const [saving, setSaving] = useState(false);

  const startEditVariant = (vid, v, cp) => {
    setEditingVariantId(vid);
    setEditingVariantForm({
      name: v.name || '',
      price: v.price || '',
      compare_price: cp || '',
      pool_id: v.pool_id || 'default',
      duration: v.duration !== undefined ? String(v.duration) : '1',
    });
  };

  const handleSaveEditedVariant = async (vid) => {
    if (!editingVariantForm.name || !editingVariantForm.price) {
      return toast.error('Variant name and price are required');
    }
    try {
      await api.put(`/admin/bot/products/${product.id}/variants/${vid}`, {
        name: editingVariantForm.name,
        price: parseFloat(editingVariantForm.price),
        compare_price: editingVariantForm.compare_price ? parseFloat(editingVariantForm.compare_price) : null,
        pool_id: editingVariantForm.pool_id || 'default',
        duration: parseInt(editingVariantForm.duration || 1),
      });
      toast.success(`Variant "${editingVariantForm.name}" updated successfully`);
      setEditingVariantId(null);
      fetchFullProduct();
    } catch {
      toast.error('Failed to update variant');
    }
  };

  // Fetch full details (with stock pools and raw keys count) on open
  const fetchFullProduct = async () => {
    try {
      setLoadingDetail(true);
      const { data } = await api.get(`/admin/bot/products/${product.id}`);
      setFullProduct(data.product);
      setGeneralForm({
        name: data.product.name || '',
        rules: data.product.rules || '',
        delivery_process: data.product.delivery_process || 'auto',
        delivery_time: data.product.delivery_time || 'Instant',
        category_id: data.product.category_id || '',
        description: data.product.description || '',
      });

      const vMeta = data.product.website_meta?.variants || {};
      const cpMap = {};
      (data.product.variants || []).forEach((v) => {
        cpMap[v.id] = vMeta[v.id]?.compare_price !== undefined ? vMeta[v.id]?.compare_price : (v.compare_price || '');
      });
      setVariantComparePrices(cpMap);
    } catch {
      toast.error('Failed to load full product details');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchFullProduct();
  }, [product.id]);

  const handleSaveMeta = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const updatedVarMeta = {};
      for (const [vid, cp] of Object.entries(variantComparePrices)) {
        updatedVarMeta[vid] = {
          ...(fullProduct?.website_meta?.variants?.[vid] || {}),
          compare_price: cp !== '' && cp !== null && cp !== undefined ? parseFloat(cp) : null,
        };
      }
      const payload = {
        ...metaForm,
        images: metaForm.images.split('\n').map((s) => s.trim()).filter(Boolean),
        compare_price: metaForm.compare_price ? parseFloat(metaForm.compare_price) : null,
        variants: updatedVarMeta,
      };
      await api.put(`/admin/bot/products/${product.id}/website-meta`, payload);
      onUpdate({ ...product, website_meta: { ...product.website_meta, ...payload } });
      toast.success('Website styling & variant compare prices saved');
      fetchFullProduct();
    } catch {
      toast.error('Failed to save website meta');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGeneral = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/bot/products/${product.id}/general`, generalForm);
      onUpdate({ ...product, ...generalForm });
      toast.success('Product details & rules saved');
      fetchFullProduct();
    } catch {
      toast.error('Failed to save product details');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStock = async (poolId) => {
    const raw = stockInputs[poolId];
    if (!raw || !raw.trim()) return toast.error('Please enter keys/credentials');
    const items = raw.split('\n').map((s) => s.trim()).filter(Boolean);
    try {
      await api.post(`/admin/bot/products/${product.id}/pools/${poolId}/add-stock`, { stock_items: items });
      toast.success(`Added ${items.length} items to pool "${poolId}"`);
      setStockInputs((prev) => ({ ...prev, [poolId]: '' }));
      fetchFullProduct();
    } catch {
      toast.error('Failed to add stock');
    }
  };

  const handleClearPool = async (poolId) => {
    if (!confirm(`Are you sure you want to clear all stock in pool "${poolId}"?`)) return;
    try {
      await api.post(`/admin/bot/products/${product.id}/pools/${poolId}/clear-stock`);
      toast.success(`Cleared pool "${poolId}"`);
      fetchFullProduct();
    } catch {
      toast.error('Failed to clear pool');
    }
  };

  const handleToggleInfinite = async (poolId) => {
    try {
      const { data } = await api.put(`/admin/bot/products/${product.id}/pools/${poolId}/toggle-infinite`);
      toast.success(data.is_infinite ? `Pool "${poolId}" set to Infinite` : `Pool "${poolId}" set to Limited`);
      fetchFullProduct();
    } catch {
      toast.error('Failed to toggle infinite stock');
    }
  };

  const handleTogglePreorder = async (poolId) => {
    try {
      const { data } = await api.put(`/admin/bot/products/${product.id}/pools/${poolId}/toggle-preorder`);
      toast.success(data.is_preorder ? `Pool "${poolId}" set to Pre-order` : `Pool "${poolId}" regular delivery`);
      fetchFullProduct();
    } catch {
      toast.error('Failed to toggle preorder');
    }
  };

  const handleCreatePool = async () => {
    if (!newPoolName.trim()) return toast.error('Pool name is required');
    try {
      await api.post(`/admin/bot/products/${product.id}/pools/new`, { pool_id: newPoolName.trim() });
      toast.success(`Created pool "${newPoolName.trim()}"`);
      setNewPoolName('');
      fetchFullProduct();
    } catch {
      toast.error('Failed to create pool');
    }
  };

  const handleDeletePool = async (poolId) => {
    if (!confirm(`Delete pool "${poolId}"?`)) return;
    try {
      await api.delete(`/admin/bot/products/${product.id}/pools/${poolId}`);
      toast.success(`Deleted pool "${poolId}"`);
      fetchFullProduct();
    } catch {
      toast.error('Failed to delete pool');
    }
  };

  const handleAddVariant = async () => {
    if (!newVariant.name || !newVariant.price) return toast.error('Variant name and price required');
    const poolToUse = newVariant.is_new_pool ? newVariant.new_pool_name.trim() : newVariant.pool_id;
    if (newVariant.is_new_pool && !poolToUse) return toast.error('Please enter a name for the new stock pool');
    try {
      await api.post(`/admin/bot/products/${product.id}/variants`, {
        name: newVariant.name,
        price: newVariant.price,
        compare_price: newVariant.compare_price,
        pool_id: poolToUse || 'default',
        duration: newVariant.duration,
        create_pool: newVariant.is_new_pool,
        is_infinite: newVariant.is_infinite,
      });
      toast.success(newVariant.is_new_pool ? `Variant added & created pool "${poolToUse}"` : 'Variant added successfully');
      setNewVariant({
        name: '',
        price: '',
        compare_price: '',
        pool_id: Object.keys(stockPools)[0] || 'default',
        duration: '0',
        is_new_pool: false,
        new_pool_name: '',
        is_infinite: false,
      });
      fetchFullProduct();
    } catch {
      toast.error('Failed to add variant');
    }
  };

  const handleDeleteVariant = async (vid) => {
    if (!confirm('Delete this variant?')) return;
    try {
      await api.delete(`/admin/bot/products/${product.id}/variants/${vid}`);
      toast.success('Variant deleted');
      fetchFullProduct();
    } catch {
      toast.error('Failed to delete variant');
    }
  };

  const stockPools = fullProduct?.stock_pools || {};
  const infinitePools = fullProduct?.infinite_pools || {};
  const preorderPools = fullProduct?.preorder_pools || {};
  const poolRules = fullProduct?.pool_rules || {};
  const rawVariants = fullProduct?.raw_variants || {};

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
    >
      <div
        className="card card--elevated"
        style={{
          width: 860,
          maxWidth: '96%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease',
          border: '1px solid var(--color-border)',
        }}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                {product.name}
              </h2>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'rgba(110, 58, 255, 0.15)',
                  color: 'var(--color-primary-light)',
                  fontFamily: 'monospace',
                }}
              >
                {product.id}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
              Bot Database & Website Control Panel
            </p>
          </div>
          <button onClick={onClose} className="btn btn--ghost btn--sm" style={{ padding: '6px 12px', gap: 4 }}>
            <span className="icon icon--sm">close</span> Close
          </button>
        </div>

        {/* Modal Tabs Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface-2)',
            padding: '0 16px',
            gap: 6,
          }}
        >
          {[
            { id: 'pools', label: 'Stock Pools & Keys', icon: 'inventory_2' },
            { id: 'variants', label: 'Variants & Plans', icon: 'sell' },
            { id: 'rules', label: 'Rules & Delivery', icon: 'gavel' },
            { id: 'meta', label: 'Website Styling & Media', icon: 'palette' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setModalTab(t.id)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: modalTab === t.id ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                borderBottom: modalTab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span className="icon icon--sm">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Modal Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: 'var(--color-surface)' }}>
          {loadingDetail ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="skeleton" style={{ height: 60, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 60, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 60 }} />
            </div>
          ) : (
            <>
              {/* TAB 1: STOCK POOLS & KEYS */}
              {modalTab === 'pools' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Stock Pools Management</h3>
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                        Add accounts, credentials, or toggle infinite stock for auto-delivery.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="form-input"
                        placeholder="New pool ID (e.g. 1month)..."
                        value={newPoolName}
                        onChange={(e) => setNewPoolName(e.target.value)}
                        style={{ height: 34, fontSize: 12, width: 180 }}
                      />
                      <button onClick={handleCreatePool} className="btn btn--primary btn--sm" style={{ gap: 4 }}>
                        <span className="icon icon--sm">add</span> Create Pool
                      </button>
                    </div>
                  </div>

                  {Object.keys(stockPools).length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: 12 }}>
                      <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>No stock pools found for this product.</p>
                      <button onClick={handleCreatePool} className="btn btn--primary btn--sm" style={{ gap: 4 }}>
                        <span className="icon icon--sm">add</span> Create Default Stock Pool
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {Object.entries(stockPools).map(([poolId, items]) => {
                        const count = Array.isArray(items) ? items.length : 0;
                        const isInf = !!infinitePools[poolId];
                        const isPre = !!preorderPools[poolId];
                        const currentRules = poolRules[poolId] || '';

                        return (
                          <div
                            key={poolId}
                            style={{
                              padding: 18,
                              background: 'var(--color-surface-2)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-lg)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-cyan)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span className="icon icon--sm" style={{ fontSize: 16 }}>folder_open</span> {poolId}
                                </span>
                                {isInf ? (
                                  <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#00D4FF22', color: '#00D4FF', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span className="icon icon--sm" style={{ fontSize: 14 }}>all_inclusive</span> Infinite Stock
                                  </span>
                                ) : count > 0 ? (
                                  <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#10b98122', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span className="icon icon--sm" style={{ fontSize: 14 }}>check_circle</span> {count} Items Available
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#ef444422', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span className="icon icon--sm" style={{ fontSize: 14 }}>cancel</span> Out of Stock (0)
                                  </span>
                                )}
                                {isPre && (
                                  <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#f59e0b22', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span className="icon icon--sm" style={{ fontSize: 14 }}>hourglass_top</span> Pre-order Enabled
                                  </span>
                                )}
                              </div>

                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  onClick={() => handleToggleInfinite(poolId)}
                                  className={`btn btn--sm ${isInf ? 'btn--primary' : 'btn--ghost'}`}
                                  style={{ fontSize: 11, padding: '3px 8px', gap: 4 }}
                                >
                                  <span className="icon icon--sm" style={{ fontSize: 14 }}>all_inclusive</span>
                                  {isInf ? 'Disable Infinite' : 'Set Infinite'}
                                </button>
                                <button
                                  onClick={() => handleTogglePreorder(poolId)}
                                  className={`btn btn--sm ${isPre ? 'btn--outline' : 'btn--ghost'}`}
                                  style={{ fontSize: 11, padding: '3px 8px', gap: 4 }}
                                >
                                  <span className="icon icon--sm" style={{ fontSize: 14 }}>hourglass_top</span>
                                  {isPre ? 'Disable Preorder' : 'Preorder'}
                                </button>
                                {count > 0 && (
                                  <button
                                    onClick={() => handleClearPool(poolId)}
                                    className="btn btn--danger btn--sm"
                                    style={{ fontSize: 11, padding: '3px 8px' }}
                                  >
                                    Clear ({count})
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeletePool(poolId)}
                                  className="btn btn--danger btn--sm"
                                  style={{ fontSize: 11, padding: '3px 8px' }}
                                  title="Delete Pool"
                                >
                                  <span className="icon icon--sm">delete</span>
                                </button>
                              </div>
                            </div>

                            {/* Add stock textarea */}
                            <div style={{ marginTop: 12 }}>
                              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                                Add Stock Credentials / Keys (Paste line by line e.g. email:pass or CODE)
                              </label>
                              <div style={{ display: 'flex', gap: 10 }}>
                                <textarea
                                  className="form-input"
                                  rows={2}
                                  placeholder="user1@mail.com:pass1&#10;user2@mail.com:pass2"
                                  value={stockInputs[poolId] || ''}
                                  onChange={(e) =>
                                    setStockInputs((prev) => ({ ...prev, [poolId]: e.target.value }))
                                  }
                                  style={{ fontSize: 12, flex: 1 }}
                                />
                                <button
                                  onClick={() => handleAddStock(poolId)}
                                  className="btn btn--primary btn--sm"
                                  style={{ alignSelf: 'flex-end', height: 42, padding: '0 16px', gap: 4 }}
                                >
                                  <span className="icon icon--sm">add</span> Add Stock
                                </button>
                              </div>
                            </div>

                            {/* Pool Rules */}
                            <div style={{ marginTop: 10 }}>
                              <label style={{ fontSize: 11, color: 'var(--color-text-faint)', display: 'block', marginBottom: 2 }}>
                                Pool-Specific Delivery Instructions / Rules:
                              </label>
                              <input
                                className="form-input"
                                placeholder="Rules delivered with accounts from this pool..."
                                defaultValue={currentRules}
                                onBlur={async (e) => {
                                  try {
                                    await api.put(`/admin/bot/products/${product.id}/pools/${poolId}/rules`, { rules: e.target.value });
                                    toast.success('Pool rules updated');
                                  } catch {
                                    toast.error('Failed to update pool rules');
                                  }
                                }}
                                style={{ height: 32, fontSize: 12 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: VARIANTS & PLANS */}
              {modalTab === 'variants' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Product Variants & Pricing</h3>
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                        Each variant maps to a pricing tier, duration, compare (strikethrough) price, and stock pool.
                      </p>
                    </div>
                  </div>

                  {/* Add Variant Box */}
                  <div style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 10, marginBottom: 20, border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="icon icon--sm" style={{ color: 'var(--color-primary-light)' }}>add_circle</span>
                      Add New Variant / Plan
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--color-text-faint)', display: 'block', marginBottom: 3 }}>Plan Name *</label>
                        <input
                          className="form-input"
                          placeholder="e.g. 1 Month UHD"
                          value={newVariant.name}
                          onChange={(e) => setNewVariant((v) => ({ ...v, name: e.target.value }))}
                          style={{ height: 36, fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--color-text-faint)', display: 'block', marginBottom: 3 }}>Price (₹) *</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Price ₹"
                          value={newVariant.price}
                          onChange={(e) => setNewVariant((v) => ({ ...v, price: e.target.value }))}
                          style={{ height: 36, fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--color-text-faint)', display: 'block', marginBottom: 3 }}>Compare Price (₹)</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Old Price ₹"
                          value={newVariant.compare_price}
                          onChange={(e) => setNewVariant((v) => ({ ...v, compare_price: e.target.value }))}
                          style={{ height: 36, fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--color-text-faint)', display: 'block', marginBottom: 3 }}>Linked Stock Pool</label>
                        <select
                          className="form-input"
                          value={newVariant.is_new_pool ? '__NEW__' : newVariant.pool_id}
                          onChange={(e) => {
                            if (e.target.value === '__NEW__') {
                              setNewVariant((v) => ({ ...v, is_new_pool: true }));
                            } else {
                              setNewVariant((v) => ({ ...v, is_new_pool: false, pool_id: e.target.value }));
                            }
                          }}
                          style={{ height: 36, fontSize: 12 }}
                        >
                          <optgroup label="Existing Stock Pools">
                            {Object.keys(stockPools).map((pid) => (
                              <option key={pid} value={pid}>
                                {pid} ({stockPools[pid]?.length || 0} keys)
                              </option>
                            ))}
                          </optgroup>
                          <option value="__NEW__">➕ + Create New Pool...</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--color-text-faint)', display: 'block', marginBottom: 3 }}>Duration (0=Life)</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Months"
                          value={newVariant.duration}
                          onChange={(e) => setNewVariant((v) => ({ ...v, duration: e.target.value }))}
                          style={{ height: 36, fontSize: 12 }}
                        />
                      </div>
                    </div>

                    {/* Inline New Pool Creator */}
                    {newVariant.is_new_pool && (
                      <div style={{ marginTop: 10, padding: 10, background: 'var(--color-surface)', borderRadius: 8, border: '1px solid rgba(0, 212, 255, 0.3)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-cyan)', display: 'block', marginBottom: 2 }}>
                            New Stock Pool ID:
                          </label>
                          <input
                            className="form-input"
                            placeholder="e.g. pool_4k, private_pool"
                            value={newVariant.new_pool_name}
                            onChange={(e) => setNewVariant((v) => ({ ...v, new_pool_name: e.target.value }))}
                            style={{ height: 32, fontSize: 12 }}
                          />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, marginTop: 14 }}>
                          <input
                            type="checkbox"
                            checked={newVariant.is_infinite}
                            onChange={(e) => setNewVariant((v) => ({ ...v, is_infinite: e.target.checked }))}
                          />
                          <span>♾️ Infinite Stock Pool</span>
                        </label>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                      <button onClick={handleAddVariant} className="btn btn--primary btn--sm" style={{ height: 36, padding: '0 18px', gap: 4 }}>
                        <span className="icon icon--sm">add</span> Add Variant
                      </button>
                    </div>
                  </div>

                  {/* Existing Variants Table */}
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Variant ID</th>
                          <th>Plan Name</th>
                          <th>Price</th>
                          <th>Compare Price</th>
                          <th>Linked Pool</th>
                          <th>Duration</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(rawVariants).length === 0 ? (
                          <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>No variants configured.</td></tr>
                        ) : (
                          Object.entries(rawVariants).map(([vid, v]) => {
                            const cp = variantComparePrices[vid] !== undefined ? variantComparePrices[vid] : (fullProduct?.website_meta?.variants?.[vid]?.compare_price || v.compare_price);
                            const isEditing = editingVariantId === vid;

                            if (isEditing) {
                              return (
                                <tr key={vid} style={{ background: 'rgba(110, 58, 255, 0.08)' }}>
                                  <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-primary-light)' }}>{vid}</span></td>
                                  <td><input className="form-input" value={editingVariantForm.name} onChange={(e) => setEditingVariantForm(f => ({...f, name: e.target.value}))} style={{ height: 32, fontSize: 12 }} /></td>
                                  <td><input type="number" className="form-input" value={editingVariantForm.price} onChange={(e) => setEditingVariantForm(f => ({...f, price: e.target.value}))} style={{ height: 32, fontSize: 12, width: 80 }} /></td>
                                  <td><input type="number" className="form-input" value={editingVariantForm.compare_price} onChange={(e) => setEditingVariantForm(f => ({...f, compare_price: e.target.value}))} style={{ height: 32, fontSize: 12, width: 80 }} /></td>
                                  <td><input className="form-input" value={editingVariantForm.pool_id} onChange={(e) => setEditingVariantForm(f => ({...f, pool_id: e.target.value}))} style={{ height: 32, fontSize: 12 }} /></td>
                                  <td><input type="number" className="form-input" value={editingVariantForm.duration} onChange={(e) => setEditingVariantForm(f => ({...f, duration: e.target.value}))} style={{ height: 32, fontSize: 12, width: 60 }} /></td>
                                  <td style={{ textAlign: 'right' }}>
                                    <button onClick={() => handleSaveEditedVariant(vid)} className="btn btn--primary btn--sm" style={{ padding: '3px 8px' }}>Save</button>
                                    <button onClick={() => setEditingVariantId(null)} className="btn btn--ghost btn--sm" style={{ padding: '3px 8px' }}>Cancel</button>
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr key={vid}>
                                <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-primary-light)' }}>{vid}</span></td>
                                <td style={{ fontWeight: 600 }}>{v.name}</td>
                                <td style={{ fontWeight: 700 }}>₹{v.price}</td>
                                <td>
                                  {cp ? (
                                    <span style={{ color: 'var(--color-text-faint)', textDecoration: 'line-through', fontSize: 13 }}>
                                      ₹{cp}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--color-text-faint)', fontSize: 12 }}>—</span>
                                  )}
                                </td>
                                <td><span style={{ fontSize: 12, padding: '2px 6px', background: 'var(--color-surface-2)', borderRadius: 4 }}>{v.pool_id || 'default'}</span></td>
                                <td>{v.duration === 0 ? 'Lifetime' : `${v.duration} Month${v.duration > 1 ? 's' : ''}`}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <button onClick={() => startEditVariant(vid, v, cp)} className="btn btn--ghost btn--sm" style={{ padding: '3px 8px', fontSize: 11 }}>Edit</button>
                                  <button onClick={() => handleDeleteVariant(vid)} className="btn btn--danger btn--sm" style={{ padding: '3px 8px', gap: 4 }}>
                                    <span className="icon icon--sm" style={{ fontSize: 13 }}>delete</span> Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: RULES & DELIVERY */}
              {modalTab === 'rules' && (
                <form onSubmit={handleSaveGeneral} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Product Rules & Delivery Settings</h3>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                      These instructions will be displayed on the product page and included in the purchase receipt.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Delivery Process</label>
                      <select
                        className="form-input"
                        value={generalForm.delivery_process}
                        onChange={(e) => setGeneralForm((f) => ({ ...f, delivery_process: e.target.value }))}
                      >
                        <option value="auto">Instant Automated Delivery (From Stock Pool)</option>
                        <option value="manual">Manual Delivery / Ticket Process</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Delivery Time Guarantee</label>
                      <input
                        className="form-input"
                        placeholder="e.g. Instant / 10-30 Mins"
                        value={generalForm.delivery_time}
                        onChange={(e) => setGeneralForm((f) => ({ ...f, delivery_time: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Global Product Rules & Instructions</label>
                    <textarea
                      className="form-input"
                      rows={5}
                      placeholder="Enter warranty rules, login instructions, replacement policies..."
                      value={generalForm.rules}
                      onChange={(e) => setGeneralForm((f) => ({ ...f, rules: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category ID</label>
                    <input
                      className="form-input"
                      value={generalForm.category_id}
                      onChange={(e) => setGeneralForm((f) => ({ ...f, category_id: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <button type="submit" className="btn btn--primary" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Rules & Settings'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 4: WEBSITE STYLING & MEDIA */}
              {modalTab === 'meta' && (
                <form onSubmit={handleSaveMeta} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Website Display & Media</h3>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                      Customize title, marketing images, strikethrough price, and badges on the store.
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Display Title on Website</label>
                    <input
                      className="form-input"
                      value={metaForm.title}
                      onChange={(e) => setMetaForm((f) => ({ ...f, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Marketing Badge (e.g. Hot, Best Seller, New)</label>
                    <input
                      className="form-input"
                      placeholder="Best Seller / Hot Deal"
                      value={metaForm.badge}
                      onChange={(e) => setMetaForm((f) => ({ ...f, badge: e.target.value }))}
                    />
                  </div>

                  {/* Per-Variant Compare Prices */}
                  {Object.keys(rawVariants).length > 0 && (
                    <div style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="icon icon--sm" style={{ color: 'var(--color-cyan)' }}>sell</span>
                        Per-Variant Compare / Strikethrough Prices (₹)
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
                        Set individual old (strikethrough) prices for each plan on the storefront.
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                        {Object.entries(rawVariants).map(([vid, v]) => (
                          <div key={vid} style={{ padding: 10, background: 'var(--color-surface)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{v.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>Selling Price: ₹{v.price}</div>
                            <input
                              type="number"
                              className="form-input"
                              placeholder="e.g. 499"
                              value={variantComparePrices[vid] ?? ''}
                              onChange={(e) => setVariantComparePrices(prev => ({ ...prev, [vid]: e.target.value }))}
                              style={{ height: 32, fontSize: 12 }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Images URLs (One URL per line)</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="https://images.unsplash.com/..."
                      value={metaForm.images}
                      onChange={(e) => setMetaForm((f) => ({ ...f, images: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Rich Store Description</label>
                    <textarea
                      className="form-input"
                      rows={4}
                      value={metaForm.description}
                      onChange={(e) => setMetaForm((f) => ({ ...f, description: e.target.value }))}
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
                      checked={metaForm.is_published}
                      onChange={(e) => setMetaForm((f) => ({ ...f, is_published: e.target.checked }))}
                      style={{ width: 18, height: 18 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>Publish on Storefront</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                        When checked, this product is visible to all buyers on the website.
                      </div>
                    </div>
                  </label>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <button type="submit" className="btn btn--primary" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Website Styling'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

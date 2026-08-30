'use client';

import { useState, useEffect } from 'react';
import { 
  Layers, 
  IndianRupee, 
  ShieldCheck, 
  Image as ImageIcon, 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Zap, 
  Eye, 
  Save, 
  CheckCircle2, 
  AlertTriangle,
  FolderOpen,
  Clock,
  Send,
  Tag,
  FileText
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import CustomDropdown from '../ui/CustomDropdown';

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
    delivery_time: product.delivery_time || 'Instant Automated Delivery',
    category_id: product.category_id || '',
    description: product.description || '',
  });

  const [stockInputs, setStockInputs] = useState({});
  const [poolRulesInputs, setPoolRulesInputs] = useState({});
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

  const fetchFullProduct = async () => {
    try {
      setLoadingDetail(true);
      const { data } = await api.get(`/admin/bot/products/${product.id}`);
      setFullProduct(data.product);
      setGeneralForm({
        name: data.product.name || '',
        rules: data.product.rules || '',
        delivery_process: data.product.delivery_process || 'auto',
        delivery_time: data.product.delivery_time || 'Instant Automated Delivery',
        category_id: data.product.category_id || '',
        description: data.product.description || '',
      });
      setMetaForm({
        title: data.product.website_meta?.title || data.product.name,
        description: data.product.website_meta?.description || data.product.description || '',
        images: (data.product.website_meta?.images || []).join('\n'),
        badge: data.product.website_meta?.badge || '',
        compare_price: data.product.website_meta?.compare_price || '',
        is_published: data.product.website_meta?.is_published !== false,
      });

      // Populate pool rules
      setPoolRulesInputs(data.product.pool_rules || {});

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
      toast.success('Website styling, titles & variant compare prices saved');
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
      toast.success('Product details, delivery timing & rules saved');
      fetchFullProduct();
    } catch {
      toast.error('Failed to save product details');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePoolRule = async (poolId) => {
    try {
      await api.put(`/admin/bot/products/${product.id}/pools/${poolId}/rules`, {
        rules: poolRulesInputs[poolId] || ''
      });
      toast.success(`Saved custom rules for pool "${poolId}"`);
      fetchFullProduct();
    } catch {
      toast.error('Failed to save pool rules');
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
        price: parseFloat(newVariant.price),
        compare_price: newVariant.compare_price ? parseFloat(newVariant.compare_price) : null,
        pool_id: poolToUse || 'default',
        duration: parseInt(newVariant.duration || 0),
        create_pool: newVariant.is_new_pool,
        is_infinite: newVariant.is_infinite,
      });
      toast.success(newVariant.is_new_pool ? `Variant added & created pool "${poolToUse}"` : 'Variant added successfully');
      setNewVariant({
        name: '',
        price: '',
        compare_price: '',
        pool_id: 'default',
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
    if (!confirm('Are you sure you want to delete this variant?')) return;
    try {
      await api.delete(`/admin/bot/products/${product.id}/variants/${vid}`);
      toast.success('Variant removed');
      fetchFullProduct();
    } catch {
      toast.error('Failed to delete variant');
    }
  };

  const stockPools = fullProduct?.stock_pools || {};
  const infinitePools = fullProduct?.infinite_pools || {};
  const preorderPools = fullProduct?.preorder_pools || {};

  const TABS = [
    { id: 'pools', label: 'Stock Pools & Variant Rules', icon: Layers },
    { id: 'variants', label: 'Pricing Tiers & MRP', icon: IndianRupee },
    { id: 'rules', label: 'General Rules & Delivery', icon: ShieldCheck },
    { id: 'meta', label: 'Website Display & Media', icon: ImageIcon },
  ];

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div 
        className="admin-modal-panel xlarge" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="admin-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="admin-modal-title">{product.name}</span>
            <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: 'rgba(56, 116, 255, 0.15)', color: '#3874FF', fontFamily: 'monospace' }}>
              {product.id}
            </span>
          </div>
          <button type="button" className="admin-modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
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
            const isActive = modalTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setModalTab(t.id)}
                className={`admin-btn ${isActive ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
                style={{ whiteSpace: 'nowrap' }}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="admin-modal-body" style={{ padding: 20 }}>
          {loadingDetail ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ height: 60, borderRadius: 12, background: 'var(--color-surface-2)' }} />
              <div style={{ height: 120, borderRadius: 12, background: 'var(--color-surface-2)' }} />
            </div>
          ) : (
            <>
              {/* TAB 1: STOCK POOLS & EACH VARIANT RULES */}
              {modalTab === 'pools' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>Stock Pools &amp; Specific Pool Rules</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        Manage individual stock credentials, infinite mode, and custom instructions for each pool/variant.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        placeholder="New pool ID (e.g. 1month)..."
                        value={newPoolName}
                        onChange={(e) => setNewPoolName(e.target.value)}
                        style={{
                          height: 36,
                          padding: '0 10px',
                          background: 'var(--color-surface-2, #141822)',
                          border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                          borderRadius: 8,
                          fontSize: 12.5,
                          color: 'var(--color-text, #FFFFFF)',
                          outline: 'none',
                        }}
                      />
                      <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={handleCreatePool}>
                        <Plus size={14} />
                        <span>Create Pool</span>
                      </button>
                    </div>
                  </div>

                  {Object.entries(stockPools).map(([poolId, items]) => {
                    const count = Array.isArray(items) ? items.length : 0;
                    const isInf = !!infinitePools[poolId];
                    const isPre = !!preorderPools[poolId];

                    return (
                      <div
                        key={poolId}
                        style={{
                          padding: 16,
                          background: 'var(--color-surface-2, #141822)',
                          border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
                          borderRadius: 14,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FolderOpen size={16} color="#3874FF" />
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14 }}>{poolId}</span>
                            {isInf ? (
                              <span className="admin-badge processing">Infinite Stock</span>
                            ) : count > 0 ? (
                              <span className="admin-badge approved">{count} Available Keys</span>
                            ) : (
                              <span className="admin-badge failed">Out of Stock (0)</span>
                            )}
                            {isPre && <span className="admin-badge processing">Pre-Order Active</span>}
                          </div>

                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className={`admin-btn ${isInf ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
                              onClick={() => handleToggleInfinite(poolId)}
                            >
                              {isInf ? 'Disable Infinite' : 'Set Infinite'}
                            </button>
                            <button
                              type="button"
                              className={`admin-btn ${isPre ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
                              onClick={() => handleTogglePreorder(poolId)}
                            >
                              {isPre ? 'Disable Preorder' : 'Set Preorder'}
                            </button>
                            {count > 0 && (
                              <button
                                type="button"
                                className="admin-btn admin-btn-danger admin-btn-sm"
                                onClick={() => handleClearPool(poolId)}
                              >
                                Clear ({count})
                              </button>
                            )}
                            <button
                              type="button"
                              className="admin-btn admin-btn-danger admin-btn-sm"
                              onClick={() => handleDeletePool(poolId)}
                              title="Delete Pool"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Batch Key Input */}
                        <div>
                          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                            Add Credentials / Accounts to {poolId} (One per line)
                          </label>
                          <textarea
                            rows={3}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              background: 'var(--color-surface, #0F131C)',
                              border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                              borderRadius: 8,
                              fontSize: 12,
                              fontFamily: 'monospace',
                              color: 'var(--color-text, #FFFFFF)',
                              outline: 'none',
                            }}
                            placeholder="user1@mail.com:pass1&#10;user2@mail.com:pass2"
                            value={stockInputs[poolId] || ''}
                            onChange={(e) => setStockInputs(prev => ({ ...prev, [poolId]: e.target.value }))}
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                            <button
                              type="button"
                              className="admin-btn admin-btn-primary admin-btn-sm"
                              onClick={() => handleAddStock(poolId)}
                            >
                              <Plus size={13} />
                              <span>Add Stock to {poolId}</span>
                            </button>
                          </div>
                        </div>

                        {/* Custom Pool Specific Instructions / Rules */}
                        <div style={{ borderTop: '1px dashed var(--color-border, rgba(255, 255, 255, 0.08))', paddingTop: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                              Custom Instructions / Replacement Rules for Pool "{poolId}"
                            </label>
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                              onClick={() => handleSavePoolRule(poolId)}
                              style={{ padding: '2px 8px', fontSize: 11 }}
                            >
                              <Save size={11} />
                              <span>Save Pool Rule</span>
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              background: 'var(--color-surface, #0F131C)',
                              border: '1px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                              borderRadius: 8,
                              fontSize: 12,
                              color: 'var(--color-text, #FFFFFF)',
                              outline: 'none',
                            }}
                            placeholder="e.g. For this plan, please do not change profile name. 30 days replacement warranty..."
                            value={poolRulesInputs[poolId] || ''}
                            onChange={(e) => setPoolRulesInputs(prev => ({ ...prev, [poolId]: e.target.value }))}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: PRICING TIERS & MRP */}
              {modalTab === 'variants' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  
                  {/* Variants List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(fullProduct?.variants || []).map((v) => (
                      <div
                        key={v.id}
                        style={{
                          padding: 14,
                          background: 'var(--color-surface-2, #141822)',
                          borderRadius: 12,
                          border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          flexWrap: 'wrap',
                        }}
                      >
                        {editingVariantId === v.id ? (
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                              <div>
                                <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Variant Name</label>
                                <input
                                  type="text"
                                  value={editingVariantForm.name}
                                  onChange={(e) => setEditingVariantForm(f => ({ ...f, name: e.target.value }))}
                                  style={{ width: '100%', height: 36, padding: '0 8px', background: 'var(--color-surface, #0F131C)', border: '1px solid var(--color-border)', borderRadius: 6, color: '#fff', fontSize: 12.5 }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Selling Price (₹)</label>
                                <input
                                  type="number"
                                  value={editingVariantForm.price}
                                  onChange={(e) => setEditingVariantForm(f => ({ ...f, price: e.target.value }))}
                                  style={{ width: '100%', height: 36, padding: '0 8px', background: 'var(--color-surface, #0F131C)', border: '1px solid var(--color-border)', borderRadius: 6, color: '#10B981', fontWeight: 700, fontSize: 12.5 }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Compare Price / MRP (₹)</label>
                                <input
                                  type="number"
                                  value={editingVariantForm.compare_price}
                                  onChange={(e) => setEditingVariantForm(f => ({ ...f, compare_price: e.target.value }))}
                                  style={{ width: '100%', height: 36, padding: '0 8px', background: 'var(--color-surface, #0F131C)', border: '1px solid var(--color-border)', borderRadius: 6, color: '#fff', fontSize: 12.5 }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>Stock Pool</label>
                                <CustomDropdown
                                  options={Object.keys(stockPools).map(pId => ({ value: pId, label: `Pool: ${pId}` }))}
                                  value={editingVariantForm.pool_id}
                                  onChange={(val) => setEditingVariantForm(f => ({ ...f, pool_id: val }))}
                                  minWidth={130}
                                />
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                              <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setEditingVariantId(null)}>Cancel</button>
                              <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => handleSaveEditedVariant(v.id)}>Save Changes</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{v.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                                Pool: <strong style={{ fontFamily: 'monospace' }}>{v.pool_id || 'default'}</strong>
                                {variantComparePrices[v.id] && (
                                  <span style={{ marginLeft: 8, textDecoration: 'line-through' }}>
                                    MRP: ₹{variantComparePrices[v.id]}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ fontWeight: 800, fontSize: 15, color: '#10B981' }}>
                                ₹{parseFloat(v.price).toLocaleString('en-IN')}
                              </span>
                              <button
                                type="button"
                                className="admin-btn admin-btn-secondary admin-btn-sm"
                                onClick={() => startEditVariant(v.id, v, variantComparePrices[v.id])}
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn-danger admin-btn-sm"
                                onClick={() => handleDeleteVariant(v.id)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Variant Box */}
                  <div style={{
                    padding: 16,
                    background: 'var(--color-surface-2, #141822)',
                    borderRadius: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Add New Plan / Variant</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                      <input
                        type="text"
                        placeholder="Plan Name (e.g. 1 Year)..."
                        value={newVariant.name}
                        onChange={(e) => setNewVariant(nv => ({ ...nv, name: e.target.value }))}
                        style={{
                          height: 40,
                          padding: '0 10px',
                          background: 'var(--color-surface, #0F131C)',
                          border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                          borderRadius: 8,
                          fontSize: 13,
                          color: 'var(--color-text, #FFFFFF)',
                          outline: 'none',
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Selling Price (₹)..."
                        value={newVariant.price}
                        onChange={(e) => setNewVariant(nv => ({ ...nv, price: e.target.value }))}
                        style={{
                          height: 40,
                          padding: '0 10px',
                          background: 'var(--color-surface, #0F131C)',
                          border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                          borderRadius: 8,
                          fontSize: 13,
                          color: 'var(--color-text, #FFFFFF)',
                          outline: 'none',
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Compare Price / MRP (₹)..."
                        value={newVariant.compare_price}
                        onChange={(e) => setNewVariant(nv => ({ ...nv, compare_price: e.target.value }))}
                        style={{
                          height: 40,
                          padding: '0 10px',
                          background: 'var(--color-surface, #0F131C)',
                          border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                          borderRadius: 8,
                          fontSize: 13,
                          color: 'var(--color-text, #FFFFFF)',
                          outline: 'none',
                        }}
                      />
                      <CustomDropdown
                        options={Object.keys(stockPools).map(pId => ({ value: pId, label: `Pool: ${pId}` }))}
                        value={newVariant.pool_id}
                        onChange={(val) => setNewVariant(nv => ({ ...nv, pool_id: val }))}
                        placeholder="Select Pool"
                        minWidth={140}
                      />
                    </div>
                    <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={handleAddVariant} style={{ alignSelf: 'flex-start' }}>
                      <Plus size={14} />
                      <span>Save Variant</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: RULES & DELIVERY */}
              {modalTab === 'rules' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                        Product Name / Master Title
                      </label>
                      <input
                        type="text"
                        style={{
                          width: '100%',
                          height: 40,
                          padding: '0 12px',
                          background: 'var(--color-surface-2, #141822)',
                          border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                          borderRadius: 8,
                          fontSize: 13,
                          color: 'var(--color-text, #FFFFFF)',
                          outline: 'none',
                        }}
                        value={generalForm.name}
                        onChange={(e) => setGeneralForm(f => ({ ...f, name: e.target.value }))}
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
                        value={generalForm.delivery_process}
                        onChange={(val) => setGeneralForm(f => ({ ...f, delivery_process: val }))}
                        minWidth={180}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                        Delivery Time Estimate
                      </label>
                      <input
                        type="text"
                        style={{
                          width: '100%',
                          height: 40,
                          padding: '0 12px',
                          background: 'var(--color-surface-2, #141822)',
                          border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                          borderRadius: 8,
                          fontSize: 13,
                          color: 'var(--color-text, #FFFFFF)',
                          outline: 'none',
                        }}
                        value={generalForm.delivery_time}
                        onChange={(e) => setGeneralForm(f => ({ ...f, delivery_time: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                      Product Features &amp; Detailed Description
                    </label>
                    <textarea
                      rows={4}
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
                      value={generalForm.description}
                      onChange={(e) => setGeneralForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                      Global Replacement Terms &amp; Warranty Rules
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
                      value={generalForm.rules}
                      onChange={(e) => setGeneralForm(f => ({ ...f, rules: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" className="admin-btn admin-btn-primary" onClick={handleSaveGeneral} disabled={saving}>
                      <Save size={15} />
                      <span>{saving ? 'Saving...' : 'Save Product Rules'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: WEBSITE DISPLAY & MEDIA */}
              {modalTab === 'meta' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                        Website Product Title
                      </label>
                      <input
                        type="text"
                        style={{
                          width: '100%',
                          height: 40,
                          padding: '0 12px',
                          background: 'var(--color-surface-2, #141822)',
                          border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                          borderRadius: 8,
                          fontSize: 13,
                          color: 'var(--color-text, #FFFFFF)',
                          outline: 'none',
                        }}
                        value={metaForm.title}
                        onChange={(e) => setMetaForm(f => ({ ...f, title: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                        Promotional Ribbon Badge
                      </label>
                      <input
                        type="text"
                        style={{
                          width: '100%',
                          height: 40,
                          padding: '0 12px',
                          background: 'var(--color-surface-2, #141822)',
                          border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                          borderRadius: 8,
                          fontSize: 13,
                          color: 'var(--color-text, #FFFFFF)',
                          outline: 'none',
                        }}
                        placeholder="e.g. HOT, BESTSELLER, 50% OFF"
                        value={metaForm.badge}
                        onChange={(e) => setMetaForm(f => ({ ...f, badge: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                        Website Visibility
                      </label>
                      <button
                        type="button"
                        onClick={() => setMetaForm(f => ({ ...f, is_published: !f.is_published }))}
                        className={`admin-btn ${metaForm.is_published ? 'admin-btn-secondary' : 'admin-btn-ghost'}`}
                        style={{ width: '100%', height: 40, justifyContent: 'center' }}
                      >
                        {metaForm.is_published ? <Eye size={15} /> : <Eye size={15} style={{ opacity: 0.5 }} />}
                        <span>{metaForm.is_published ? 'Live on Store' : 'Hidden from Store'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                      Website Product Description / Sales Pitch
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
                      placeholder="Write marketing copy for the website..."
                      value={metaForm.description}
                      onChange={(e) => setMetaForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>

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
                      value={metaForm.images}
                      onChange={(e) => setMetaForm(f => ({ ...f, images: e.target.value }))}
                    />
                  </div>

                  {/* Variant Specific Compare Price Editor */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                      Variant-Specific Compare Prices (Strikethrough MRP for each plan)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                      {(fullProduct?.variants || []).map((v) => (
                        <div
                          key={v.id}
                          style={{
                            padding: 10,
                            background: 'var(--color-surface-2, #141822)',
                            borderRadius: 8,
                            border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{v.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: '#10B981', fontWeight: 800 }}>₹{v.price}</span>
                            <input
                              type="number"
                              placeholder="MRP (₹)..."
                              value={variantComparePrices[v.id] || ''}
                              onChange={(e) => setVariantComparePrices(prev => ({ ...prev, [v.id]: e.target.value }))}
                              style={{
                                width: '100%',
                                height: 32,
                                padding: '0 8px',
                                background: 'var(--color-surface, #0F131C)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 6,
                                fontSize: 12,
                                color: '#fff',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" className="admin-btn admin-btn-primary" onClick={handleSaveMeta} disabled={saving}>
                      <Save size={15} />
                      <span>{saving ? 'Saving...' : 'Save Website Media & Details'}</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}

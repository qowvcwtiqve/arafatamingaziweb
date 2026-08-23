'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import CustomDropdown from '../ui/CustomDropdown';

export default function ProductsManagementTab({
  products,
  setProducts,
  categories,
  onEditMeta,
  onDelete,
  onAddProduct,
  loading,
}) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); // all | in_stock | low_stock | infinite | out_of_stock | preorder
  const [statusFilter, setStatusFilter] = useState('all'); // all | bot_active | bot_inactive | published | hidden

  const categoryMap = (categories || []).reduce((acc, c) => {
    acc[c.id] = c.name || c.title || c.id;
    return acc;
  }, {});

  const isProductBotActive = (p) => {
    return p.is_active !== false;
  };

  const isProductPreorder = (p) => {
    return !!(
      p.is_preorder ||
      Object.values(p.preorder_pools || {}).some(Boolean) ||
      (p.variants || []).some((v) => v.is_preorder) ||
      (p.name && p.name.toLowerCase().includes('pre order'))
    );
  };

  // Compute counts for top stat pills
  const totalCount = products.length;
  const botActiveCount = products.filter(isProductBotActive).length;
  const botInactiveCount = products.filter((p) => !isProductBotActive(p)).length;
  const preorderCount = products.filter(isProductPreorder).length;
  const lowStockCount = products.filter((p) => {
    const isInf = p.is_infinite || p.total_stock >= 9999 || Object.values(p.infinite_pools || {}).some(Boolean);
    return !isInf && p.total_stock > 0 && p.total_stock <= 5 && !isProductPreorder(p);
  }).length;
  const infiniteStockCount = products.filter((p) => p.is_infinite || p.total_stock >= 9999 || Object.values(p.infinite_pools || {}).some(Boolean)).length;
  const outOfStockCount = products.filter((p) => {
    const isInf = p.is_infinite || p.total_stock >= 9999 || Object.values(p.infinite_pools || {}).some(Boolean);
    return !isInf && (!p.in_stock || p.total_stock === 0) && !isProductPreorder(p);
  }).length;

  const filtered = products.filter((p) => {
    const title = (p.website_meta?.title || p.name || '').toLowerCase();
    const id = (p.id || '').toLowerCase();
    const matchesSearch = !search || title.includes(search.toLowerCase()) || id.includes(search.toLowerCase());
    const matchesCat = selectedCat === 'all' || p.category_id === selectedCat;

    const isInf = p.is_infinite || p.total_stock >= 9999 || Object.values(p.infinite_pools || {}).some(Boolean) || (p.variants || []).some(v => v.is_infinite);
    let matchesStock = true;
    if (stockFilter === 'in_stock') matchesStock = p.in_stock && !isInf && !isProductPreorder(p);
    else if (stockFilter === 'low_stock') matchesStock = !isInf && p.total_stock > 0 && p.total_stock <= 5 && !isProductPreorder(p);
    else if (stockFilter === 'infinite') matchesStock = isInf;
    else if (stockFilter === 'out_of_stock') matchesStock = !isInf && (!p.in_stock || p.total_stock === 0) && !isProductPreorder(p);
    else if (stockFilter === 'preorder') matchesStock = isProductPreorder(p);

    let matchesStatus = true;
    const isPub = p.website_meta?.is_published !== false;
    const isActive = isProductBotActive(p);
    if (statusFilter === 'bot_active') matchesStatus = isActive;
    else if (statusFilter === 'bot_inactive') matchesStatus = !isActive;
    else if (statusFilter === 'published') matchesStatus = isPub;
    else if (statusFilter === 'hidden') matchesStatus = !isPub;

    return matchesSearch && matchesCat && matchesStock && matchesStatus;
  });

  const handleToggleBotActive = async (p) => {
    try {
      const { data } = await api.put(`/admin/bot/products/${p.id}/toggle-active`);
      setProducts((ps) =>
        ps.map((x) => (x.id === p.id ? { ...x, is_active: data.is_active } : x))
      );
      toast.success(data.is_active ? `Activated "${p.name}" in Bot & Web` : `Deactivated "${p.name}" in Bot`);
    } catch {
      toast.error('Failed to toggle bot status');
    }
  };

  const handleTogglePublish = async (p) => {
    const current = p.website_meta?.is_published !== false;
    const nextVal = !current;
    try {
      await api.put(`/admin/bot/products/${p.id}/website-meta`, { is_published: nextVal });
      setProducts((ps) =>
        ps.map((x) =>
          x.id === p.id ? { ...x, website_meta: { ...x.website_meta, is_published: nextVal } } : x
        )
      );
      toast.success(nextVal ? `Published "${p.name}" on website` : `Hidden "${p.name}" from website`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleToggleFeatured = async (p) => {
    const isF = !!p.website_meta?.is_featured;
    try {
      await api.put(`/admin/bot/products/${p.id}/website-meta`, { is_featured: !isF });
      setProducts((ps) =>
        ps.map((x) =>
          x.id === p.id ? { ...x, website_meta: { ...x.website_meta, is_featured: !isF } } : x
        )
      );
      toast.success(isF ? 'Removed from featured' : 'Marked as featured on homepage');
    } catch {
      toast.error('Failed to update featured status');
    }
  };

  return (
    <div>
      {/* Top Header without distracting banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, margin: 0 }}>
            Products &amp; <span className="text-gradient">Stock Inventory</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            Unified catalog management for Website Store &amp; Telegram Bot (1:1 Mongo Atlas Sync)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onAddProduct}
            className="btn btn--primary"
            style={{ gap: 8, height: 42, padding: '0 20px', fontWeight: 700, boxShadow: 'var(--shadow-glow)' }}
          >
            <span className="icon icon--sm">add</span>
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Quick Filter Badges Ribbon (Google Material Icons) */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          onClick={() => { setStockFilter('all'); setStatusFilter('all'); }}
          className={`btn btn--sm ${stockFilter === 'all' && statusFilter === 'all' ? 'btn--primary' : 'btn--ghost'}`}
          style={{ fontSize: 12, padding: '4px 12px', height: 32, gap: 5 }}
        >
          <span className="icon icon--sm">apps</span> All ({totalCount})
        </button>
        <button
          onClick={() => { setStatusFilter('bot_active'); setStockFilter('all'); }}
          className={`btn btn--sm ${statusFilter === 'bot_active' ? 'btn--primary' : 'btn--ghost'}`}
          style={{ fontSize: 12, padding: '4px 12px', height: 32, color: '#10b981', gap: 5 }}
        >
          <span className="icon icon--sm" style={{ fontSize: 15 }}>check_circle</span> Active ({botActiveCount})
        </button>
        <button
          onClick={() => { setStatusFilter('bot_inactive'); setStockFilter('all'); }}
          className={`btn btn--sm ${statusFilter === 'bot_inactive' ? 'btn--primary' : 'btn--ghost'}`}
          style={{ fontSize: 12, padding: '4px 12px', height: 32, color: '#ef4444', gap: 5 }}
        >
          <span className="icon icon--sm" style={{ fontSize: 15 }}>cancel</span> Inactive ({botInactiveCount})
        </button>
        <button
          onClick={() => { setStockFilter('preorder'); setStatusFilter('all'); }}
          className={`btn btn--sm ${stockFilter === 'preorder' ? 'btn--primary' : 'btn--ghost'}`}
          style={{ fontSize: 12, padding: '4px 12px', height: 32, color: '#a855f7', gap: 5 }}
        >
          <span className="icon icon--sm" style={{ fontSize: 15 }}>rocket_launch</span> Pre-Orders ({preorderCount})
        </button>
        <button
          onClick={() => { setStockFilter('low_stock'); setStatusFilter('all'); }}
          className={`btn btn--sm ${stockFilter === 'low_stock' ? 'btn--primary' : 'btn--ghost'}`}
          style={{ fontSize: 12, padding: '4px 12px', height: 32, color: '#f59e0b', gap: 5 }}
        >
          <span className="icon icon--sm" style={{ fontSize: 15 }}>warning</span> Low Stock ({lowStockCount})
        </button>
        <button
          onClick={() => { setStockFilter('infinite'); setStatusFilter('all'); }}
          className={`btn btn--sm ${stockFilter === 'infinite' ? 'btn--primary' : 'btn--ghost'}`}
          style={{ fontSize: 12, padding: '4px 12px', height: 32, color: '#00D4FF', gap: 5 }}
        >
          <span className="icon icon--sm" style={{ fontSize: 16 }}>all_inclusive</span> Infinite ({infiniteStockCount})
        </button>
        <button
          onClick={() => { setStockFilter('out_of_stock'); setStatusFilter('all'); }}
          className={`btn btn--sm ${stockFilter === 'out_of_stock' ? 'btn--primary' : 'btn--ghost'}`}
          style={{ fontSize: 12, padding: '4px 12px', height: 32, color: 'var(--color-text-faint)', gap: 5 }}
        >
          <span className="icon icon--sm" style={{ fontSize: 15 }}>do_not_disturb_on</span> Out of Stock ({outOfStockCount})
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      {(() => {
        const categoryOptions = [
          { value: 'all', label: `All Categories (${categories.length})`, icon: 'grid_view' },
          ...categories.map((c) => {
            const pCount = products.filter((p) => p.category_id === c.id).length;
            return {
              value: c.id,
              label: c.name,
              icon: c.icon || 'category',
              badge: pCount > 0 ? pCount : null,
            };
          }),
        ];

        const stockOptions = [
          { value: 'all', label: 'All Stock Status', icon: 'inventory_2' },
          { value: 'in_stock', label: 'In Stock (Limited)', icon: 'check_circle', color: '#10b981' },
          { value: 'low_stock', label: 'Low Stock (≤ 5)', icon: 'warning', color: '#f59e0b' },
          { value: 'infinite', label: 'Infinite Stock', icon: 'all_inclusive', color: '#00D4FF' },
          { value: 'out_of_stock', label: 'Out of Stock', icon: 'do_not_disturb_on', color: '#ef4444' },
          { value: 'preorder', label: 'Pre-order', icon: 'rocket_launch', color: '#a855f7' },
        ];

        const statusOptions = [
          { value: 'all', label: 'All Visibility', icon: 'visibility' },
          { value: 'bot_active', label: 'Active in Bot', icon: 'smart_toy', color: '#00D4FF' },
          { value: 'bot_inactive', label: 'Inactive in Bot', icon: 'pause_circle', color: '#64748B' },
          { value: 'published', label: 'Live on Web', icon: 'public', color: '#10b981' },
          { value: 'hidden', label: 'Hidden on Web', icon: 'visibility_off', color: '#f59e0b' },
        ];

        return (
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 20,
              background: 'var(--color-surface)',
              padding: '12px 16px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              alignItems: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ flex: '1 1 240px', minWidth: 220, position: 'relative' }}>
              <input
                className="form-input"
                placeholder="Search products by title, ID, or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ height: 38, fontSize: 13, paddingLeft: 36, paddingRight: search ? 32 : 12 }}
              />
              <span
                className="icon icon--sm"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }}
              >
                search
              </span>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-faint)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                  }}
                >
                  <span className="icon icon--sm" style={{ fontSize: 16 }}>close</span>
                </button>
              )}
            </div>

            <CustomDropdown
              options={categoryOptions}
              value={selectedCat}
              onChange={setSelectedCat}
              icon="category"
              minWidth={190}
            />

            <CustomDropdown
              options={stockOptions}
              value={stockFilter}
              onChange={setStockFilter}
              icon="inventory_2"
              minWidth={175}
            />

            <CustomDropdown
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              icon="visibility"
              minWidth={165}
            />
          </div>
        );
      })()}

      {/* Product List Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Product Details</th>
              <th>Category</th>
              <th>Live Stock</th>
              <th>Pricing & Plans</th>
              <th>Bot Status</th>
              <th>Website</th>
              <th style={{ textAlign: 'right' }}>Management</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="skeleton" style={{ height: 48, margin: 8 }} />
                  <div className="skeleton" style={{ height: 48, margin: 8 }} />
                  <div className="skeleton" style={{ height: 48, margin: 8 }} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--color-text-muted)' }}>
                  No products matched your search or filters.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const isPublished = p.website_meta?.is_published !== false;
                const isFeatured = !!p.website_meta?.is_featured;
                const isBotActive = !!p.is_active;
                const isPreorder = isProductPreorder(p);
                const img =
                  p.website_meta?.images?.[0] ||
                  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=200&auto=format&fit=crop';
                const catName = categoryMap[p.category_id] || p.category_id || 'General';
                const minP = p.min_price || (p.variants?.length ? Math.min(...p.variants.map((v) => v.price)) : 0);
                const maxP = p.max_price || (p.variants?.length ? Math.max(...p.variants.map((v) => v.price)) : minP);
                const priceLabel = minP === maxP ? `₹${minP.toLocaleString('en-IN')}` : `₹${minP.toLocaleString('en-IN')} - ₹${maxP.toLocaleString('en-IN')}`;
                const variantCount = p.variants?.length || 0;
                const isInf = p.is_infinite || p.total_stock >= 9999 || Object.values(p.infinite_pools || {}).some(Boolean) || (p.variants || []).some(v => v.is_infinite);

                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 'var(--radius-md)',
                            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.18) 0%, rgba(0, 212, 255, 0.12) 100%)',
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-cyan)',
                            flexShrink: 0,
                          }}
                        >
                          <span className="icon icon--md icon--filled">
                            {p.category_id?.includes('ott') || p.category_id?.includes('stream') ? 'tv' :
                             p.category_id?.includes('ai') ? 'smart_toy' :
                             p.category_id?.includes('design') ? 'palette' :
                             p.category_id?.includes('vpn') ? 'shield_lock' :
                             p.category_id?.includes('software') ? 'desktop_windows' :
                             p.category_id?.includes('game') ? 'sports_esports' :
                             p.category_id?.includes('code') ? 'terminal' :
                             p.category_id?.includes('telegram') ? 'rocket_launch' :
                             'deployed_code'}
                          </span>
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                            {p.website_meta?.title || p.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            <span
                              style={{
                                fontSize: 11,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: p.is_website_only ? 'rgba(0, 212, 255, 0.12)' : 'rgba(110, 58, 255, 0.15)',
                                color: p.is_website_only ? 'var(--color-cyan)' : 'var(--color-primary-light)',
                                fontWeight: 700,
                              }}
                            >
                              {p.is_website_only ? 'WEB' : 'BOT'}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--color-text-faint)', fontFamily: 'monospace' }}>
                              {p.id}
                            </span>
                            {isPreorder && (
                              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)', fontWeight: 700 }}>
                                PRE-ORDER
                              </span>
                            )}
                            {p.website_meta?.badge && (
                              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: '#f59e0b22', color: '#f59e0b', fontWeight: 700 }}>
                                {p.website_meta.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          fontSize: 12,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--color-surface-2)',
                          color: 'var(--color-text-muted)',
                          border: '1px solid var(--color-border)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {catName}
                      </span>
                    </td>

                    <td>
                      <div>
                        {isPreorder ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#a855f7', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="icon icon--sm" style={{ fontSize: 15, color: '#a855f7' }}>rocket_launch</span> Pre-Order Active
                          </span>
                        ) : isInf ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#00D4FF', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="icon icon--sm" style={{ fontSize: 16 }}>all_inclusive</span> Infinite
                          </span>
                        ) : p.in_stock && p.total_stock > 5 ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
                            {p.total_stock} in stock
                          </span>
                        ) : p.in_stock && p.total_stock > 0 ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="icon icon--sm" style={{ fontSize: 14, color: '#f59e0b' }}>warning</span>
                            {p.total_stock} left (Low)
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="icon icon--sm" style={{ fontSize: 14, color: '#ef4444' }}>block</span>
                            Out of stock
                          </span>
                        )}
                        {variantCount > 0 && (
                          <span style={{ fontSize: 11, color: 'var(--color-text-faint)', display: 'block', marginTop: 2 }}>
                            {variantCount} variant{variantCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{priceLabel}</div>
                      {p.website_meta?.compare_price && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-faint)', textDecoration: 'line-through' }}>
                          ₹{p.website_meta.compare_price}
                        </div>
                      )}
                    </td>

                    <td>
                      {!p.is_website_only ? (
                        <button
                          onClick={() => handleToggleBotActive(p)}
                          className={`btn btn--sm ${isBotActive ? 'btn--outline' : 'btn--ghost'}`}
                          style={{
                            padding: '3px 8px',
                            fontSize: 11,
                            gap: 4,
                            color: isBotActive ? '#10b981' : '#ef4444',
                            border: `1px solid ${isBotActive ? '#10b98144' : '#ef444444'}`,
                          }}
                          title="Click to toggle Telegram Bot Active status"
                        >
                          <span className="icon icon--sm" style={{ fontSize: 13, color: isBotActive ? '#10b981' : '#ef4444' }}>
                            {isBotActive ? 'check_circle' : 'cancel'}
                          </span>
                          {isBotActive ? 'Active' : 'Disabled'}
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>N/A</span>
                      )}
                    </td>

                    <td>
                      <button
                        onClick={() => handleTogglePublish(p)}
                        className={`btn btn--sm ${isPublished ? 'btn--primary' : 'btn--ghost'}`}
                        style={{
                          padding: '3px 8px',
                          fontSize: 11,
                          gap: 4,
                          background: isPublished ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                          color: isPublished ? '#10b981' : 'var(--color-text-faint)',
                          border: `1px solid ${isPublished ? '#10b98144' : 'var(--color-border)'}`,
                        }}
                        title="Click to toggle website visibility"
                      >
                        <span className="icon icon--sm" style={{ fontSize: 13, color: isPublished ? '#10b981' : 'var(--color-text-faint)' }}>
                          {isPublished ? 'visibility' : 'visibility_off'}
                        </span>
                        {isPublished ? 'Live' : 'Hidden'}
                      </button>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          onClick={() => handleToggleFeatured(p)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: isFeatured ? '#f59e0b' : 'var(--color-text-faint)',
                            padding: 4,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title={isFeatured ? 'Featured on homepage' : 'Feature on homepage'}
                        >
                          <span className="icon icon--sm" style={{ fontVariationSettings: isFeatured ? "'FILL' 1" : "'FILL' 0" }}>
                            star
                          </span>
                        </button>
                        {isPublished && (
                          <Link href={`/products/${p.id}`} target="_blank" className="btn btn--ghost btn--sm" title="View in store">
                            <span className="icon icon--sm">open_in_new</span>
                          </Link>
                        )}
                        <button
                          onClick={() => onEditMeta(p)}
                          className="btn btn--primary btn--sm"
                          style={{ gap: 4, fontSize: 12, padding: '4px 10px' }}
                          title="Manage Stock Pools, Variants, Rules & Images"
                        >
                          <span className="icon icon--sm" style={{ fontSize: 14 }}>tune</span> Manage
                        </button>
                        {p.is_website_only && (
                          <button onClick={() => onDelete(p.id, p.name, true)} className="btn btn--danger btn--sm" title="Delete custom web product">
                            <span className="icon icon--sm">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

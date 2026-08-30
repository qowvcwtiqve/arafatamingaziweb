'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Plus,
  Search,
  X,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  ExternalLink,
  Star,
  Trash2,
  Eye,
  EyeOff,
  Bot,
  Zap,
  Tag,
  Grid,
  Check,
  Ban,
  Clock,
  Layers,
  Sparkles,
  ChevronDown
} from 'lucide-react';
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

  const isProductBotActive = (p) => p.is_active !== false;

  const isProductPreorder = (p) => {
    return !!(
      p.is_preorder ||
      Object.values(p.preorder_pools || {}).some(Boolean) ||
      (p.variants || []).some((v) => v.is_preorder) ||
      (p.name && p.name.toLowerCase().includes('pre order'))
    );
  };

  // Compute counts for all top stat pills
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
      toast.success(nextVal ? `Published "${p.name}" to store` : `Hidden "${p.name}" from store`);
    } catch {
      toast.error('Failed to update visibility');
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
      toast.success(!isF ? `Featured "${p.name}" on homepage` : `Removed "${p.name}" from featured`);
    } catch {
      toast.error('Failed to update featured status');
    }
  };

  // Dropdown options
  const categoryOptions = [
    { value: 'all', label: `All Categories (${categories.length})` },
    ...categories.map((c) => {
      const pCount = products.filter((p) => p.category_id === c.id).length;
      return {
        value: c.id,
        label: `${c.name} (${pCount})`,
        badge: pCount > 0 ? pCount : null,
      };
    }),
  ];

  const stockOptions = [
    { value: 'all', label: 'All Stock Status' },
    { value: 'in_stock', label: 'In Stock (Limited)', color: '#10B981' },
    { value: 'low_stock', label: 'Low Stock (≤ 5)', color: '#F59E0B' },
    { value: 'infinite', label: 'Infinite Stock', color: '#00D4FF' },
    { value: 'out_of_stock', label: 'Out of Stock', color: '#EF4444' },
    { value: 'preorder', label: 'Pre-Order Active', color: '#A855F7' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Visibility & Channels' },
    { value: 'published', label: 'Live on Website', color: '#10B981' },
    { value: 'hidden', label: 'Hidden on Website', color: '#F59E0B' },
    { value: 'bot_active', label: 'Active in Bot', color: '#3874FF' },
    { value: 'bot_inactive', label: 'Disabled in Bot', color: '#64748B' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* TOP HEADER SECTION */}
      <div className="admin-card-section" style={{ margin: 0 }}>
        <div className="admin-card-header">
          <div>
            <div className="admin-card-title">
              <Box size={20} color="#3874FF" />
              <span>Products &amp; Stock Inventory ({totalCount})</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Unified catalog management for Website Store &amp; Telegram Bot (1:1 Mongo Atlas Real-time Sync)
            </div>
          </div>
          <div className="admin-card-actions">
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={onAddProduct}
            >
              <Plus size={16} />
              <span>Add New Product</span>
            </button>
          </div>
        </div>

        {/* COMPLETE 7 QUICK FILTER BADGES RIBBON */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--color-border, rgba(255, 255, 255, 0.06))',
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
        }}>
          <button
            type="button"
            onClick={() => { setStockFilter('all'); setStatusFilter('all'); }}
            className={`admin-btn ${stockFilter === 'all' && statusFilter === 'all' ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
            style={{ whiteSpace: 'nowrap' }}
          >
            <Grid size={13} />
            <span>All ({totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => { setStatusFilter('bot_active'); setStockFilter('all'); }}
            className={`admin-btn ${statusFilter === 'bot_active' ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
            style={{ whiteSpace: 'nowrap', color: statusFilter === 'bot_active' ? '#FFFFFF' : '#10B981' }}
          >
            <CheckCircle2 size={13} />
            <span>Active ({botActiveCount})</span>
          </button>

          <button
            type="button"
            onClick={() => { setStatusFilter('bot_inactive'); setStockFilter('all'); }}
            className={`admin-btn ${statusFilter === 'bot_inactive' ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
            style={{ whiteSpace: 'nowrap', color: statusFilter === 'bot_inactive' ? '#FFFFFF' : '#EF4444' }}
          >
            <Ban size={13} />
            <span>Inactive ({botInactiveCount})</span>
          </button>

          <button
            type="button"
            onClick={() => { setStockFilter('preorder'); setStatusFilter('all'); }}
            className={`admin-btn ${stockFilter === 'preorder' ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
            style={{ whiteSpace: 'nowrap', color: stockFilter === 'preorder' ? '#FFFFFF' : '#A855F7' }}
          >
            <Zap size={13} />
            <span>Pre-Orders ({preorderCount})</span>
          </button>

          <button
            type="button"
            onClick={() => { setStockFilter('low_stock'); setStatusFilter('all'); }}
            className={`admin-btn ${stockFilter === 'low_stock' ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
            style={{ whiteSpace: 'nowrap', color: stockFilter === 'low_stock' ? '#FFFFFF' : '#F59E0B' }}
          >
            <AlertTriangle size={13} />
            <span>Low Stock ({lowStockCount})</span>
          </button>

          <button
            type="button"
            onClick={() => { setStockFilter('infinite'); setStatusFilter('all'); }}
            className={`admin-btn ${stockFilter === 'infinite' ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
            style={{ whiteSpace: 'nowrap', color: stockFilter === 'infinite' ? '#FFFFFF' : '#00D4FF' }}
          >
            <Layers size={13} />
            <span>Infinite ({infiniteStockCount})</span>
          </button>

          <button
            type="button"
            onClick={() => { setStockFilter('out_of_stock'); setStatusFilter('all'); }}
            className={`admin-btn ${stockFilter === 'out_of_stock' ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
            style={{ whiteSpace: 'nowrap', color: stockFilter === 'out_of_stock' ? '#FFFFFF' : 'var(--color-text-muted)' }}
          >
            <Clock size={13} />
            <span>Out of Stock ({outOfStockCount})</span>
          </button>
        </div>

        {/* SEARCH AND FILTER TOOLBAR */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          {/* Search Box */}
          <div className="admin-search-box" style={{ flex: '1 1 240px', minWidth: 220 }}>
            <Search size={16} color="var(--color-text-muted)" style={{ marginRight: 8, flexShrink: 0 }} />
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search products by title, ID, or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2, display: 'flex' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <CustomDropdown
            options={categoryOptions}
            value={selectedCat}
            onChange={setSelectedCat}
            placeholder="All Categories"
            minWidth={190}
          />

          {/* Stock Status Dropdown */}
          <CustomDropdown
            options={stockOptions}
            value={stockFilter}
            onChange={setStockFilter}
            placeholder="All Stock Status"
            minWidth={175}
          />

          {/* Channel Visibility Dropdown */}
          <CustomDropdown
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Visibility"
            minWidth={175}
          />
        </div>

        {/* DESKTOP RESPONSIVE DATA TABLE */}
        <div className="admin-table-responsive hide-on-mobile">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product Details</th>
                <th>Category</th>
                <th>Live Stock</th>
                <th>Pricing &amp; Plans</th>
                <th>Bot Status</th>
                <th>Website</th>
                <th style={{ textAlign: 'right' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 30, textAlign: 'center' }}>
                    <div style={{ height: 40, background: 'var(--color-surface-2)', borderRadius: 8, margin: '8px 0' }} />
                    <div style={{ height: 40, background: 'var(--color-surface-2)', borderRadius: 8, margin: '8px 0' }} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 36, color: 'var(--color-text-muted)' }}>
                    No products matched your search or filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isPublished = p.website_meta?.is_published !== false;
                  const isFeatured = !!p.website_meta?.is_featured;
                  const isBotActive = isProductBotActive(p);
                  const isPreorder = isProductPreorder(p);
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
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: 'rgba(56, 116, 255, 0.12)',
                              border: '1px solid rgba(56, 116, 255, 0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#3874FF',
                              flexShrink: 0,
                            }}
                          >
                            <Box size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)' }}>
                              {p.website_meta?.title || p.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                              <span
                                style={{
                                  fontSize: 10.5,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background: p.is_website_only ? 'rgba(0, 212, 255, 0.12)' : 'rgba(56, 116, 255, 0.15)',
                                  color: p.is_website_only ? '#00D4FF' : '#3874FF',
                                  fontWeight: 800,
                                }}
                              >
                                {p.is_website_only ? 'WEB' : 'BOT'}
                              </span>
                              <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                                {p.id}
                              </span>
                              {isPreorder && (
                                <span style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 4, background: 'rgba(168, 85, 247, 0.15)', color: '#A855F7', fontWeight: 800 }}>
                                  PRE-ORDER
                                </span>
                              )}
                              {p.website_meta?.badge && (
                                <span style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', fontWeight: 800 }}>
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
                            borderRadius: 6,
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
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#A855F7', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Zap size={13} /> Pre-Order Active
                            </span>
                          ) : isInf ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#00D4FF', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Layers size={13} /> Infinite
                            </span>
                          ) : p.in_stock && p.total_stock > 5 ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
                              {p.total_stock} in stock
                            </span>
                          ) : p.in_stock && p.total_stock > 0 ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <AlertTriangle size={13} />
                              {p.total_stock} left (Low)
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Ban size={13} />
                              Out of stock
                            </span>
                          )}
                          {variantCount > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>
                              {variantCount} variant{variantCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#10B981' }}>{priceLabel}</div>
                        {p.website_meta?.compare_price && (
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                            ₹{p.website_meta.compare_price}
                          </div>
                        )}
                      </td>

                      <td>
                        {!p.is_website_only ? (
                          <button
                            type="button"
                            onClick={() => handleToggleBotActive(p)}
                            className={`admin-btn ${isBotActive ? 'admin-btn-secondary' : 'admin-btn-danger'} admin-btn-sm`}
                            style={{
                              padding: '3px 8px',
                              fontSize: 11,
                              gap: 4,
                              color: isBotActive ? '#10B981' : '#EF4444',
                            }}
                            title="Click to toggle Telegram Bot Active status"
                          >
                            {isBotActive ? <CheckCircle2 size={12} /> : <Ban size={12} />}
                            <span>{isBotActive ? 'Active' : 'Disabled'}</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>N/A</span>
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(p)}
                          className={`admin-btn ${isPublished ? 'admin-btn-secondary' : 'admin-btn-ghost'} admin-btn-sm`}
                          style={{
                            padding: '3px 8px',
                            fontSize: 11,
                            gap: 4,
                            color: isPublished ? '#10B981' : 'var(--color-text-muted)',
                          }}
                          title="Click to toggle website visibility"
                        >
                          {isPublished ? <Eye size={12} /> : <EyeOff size={12} />}
                          <span>{isPublished ? 'Live' : 'Hidden'}</span>
                        </button>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(p)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: isFeatured ? '#F59E0B' : 'var(--color-text-muted)',
                              padding: 4,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title={isFeatured ? 'Featured on homepage' : 'Feature on homepage'}
                          >
                            <Star size={16} fill={isFeatured ? '#F59E0B' : 'none'} />
                          </button>

                          {isPublished && (
                            <Link
                              href={`/products/${p.slug || p.id}`}
                              target="_blank"
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                              title="View in store"
                            >
                              <ExternalLink size={13} />
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => onEditMeta(p)}
                            className="admin-btn admin-btn-primary admin-btn-sm"
                            title="Manage Stock Pools, Variants, Rules & Images"
                          >
                            <Sliders size={13} />
                            <span>Manage</span>
                          </button>

                          {p.is_website_only && (
                            <button
                              type="button"
                              onClick={() => onDelete(p.id, p.name, true)}
                              className="admin-btn admin-btn-danger admin-btn-sm"
                              title="Delete custom web product"
                            >
                              <Trash2 size={13} />
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

        {/* MOBILE DEDICATED TOUCH CARDS WITH ALL ACTION BUTTONS */}
        <div className="admin-mobile-card-list">
          {filtered.map((p) => {
            const isPublished = p.website_meta?.is_published !== false;
            const isFeatured = !!p.website_meta?.is_featured;
            const isBotActive = isProductBotActive(p);
            const isPreorder = isProductPreorder(p);
            const catName = categoryMap[p.category_id] || 'General';
            const minP = p.min_price || (p.variants?.length ? Math.min(...p.variants.map((v) => v.price)) : 0);
            const maxP = p.max_price || (p.variants?.length ? Math.max(...p.variants.map((v) => v.price)) : minP);
            const priceLabel = minP === maxP ? `₹${minP.toLocaleString('en-IN')}` : `₹${minP.toLocaleString('en-IN')} - ₹${maxP.toLocaleString('en-IN')}`;

            return (
              <div key={p.id} className="admin-mobile-card">
                <div className="admin-mobile-card-header">
                  <div>
                    <div className="admin-mobile-card-title">{p.website_meta?.title || p.name}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 4, background: 'rgba(56, 116, 255, 0.15)', color: '#3874FF', fontWeight: 800 }}>
                        {p.is_website_only ? 'WEB' : 'BOT'}
                      </span>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{p.id}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>• {catName}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(p)}
                    style={{ background: 'transparent', border: 'none', color: isFeatured ? '#F59E0B' : 'var(--color-text-muted)', cursor: 'pointer', padding: 4 }}
                  >
                    <Star size={18} fill={isFeatured ? '#F59E0B' : 'none'} />
                  </button>
                </div>

                <div className="admin-mobile-card-rows">
                  <div className="admin-mobile-card-row">
                    <span>Price:</span>
                    <strong style={{ color: '#10B981', fontSize: 15 }}>{priceLabel}</strong>
                  </div>
                  <div className="admin-mobile-card-row">
                    <span>Stock:</span>
                    <span>{isPreorder ? 'Pre-Order Active' : `${p.total_stock || 0} units`}</span>
                  </div>
                  <div className="admin-mobile-card-row">
                    <span>Bot Status:</span>
                    <button
                      type="button"
                      onClick={() => handleToggleBotActive(p)}
                      className={`admin-btn ${isBotActive ? 'admin-btn-secondary' : 'admin-btn-danger'} admin-btn-sm`}
                      style={{ padding: '2px 8px', fontSize: 11 }}
                    >
                      {isBotActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                  <div className="admin-mobile-card-row">
                    <span>Web Visibility:</span>
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(p)}
                      className={`admin-btn ${isPublished ? 'admin-btn-secondary' : 'admin-btn-ghost'} admin-btn-sm`}
                      style={{ padding: '2px 8px', fontSize: 11 }}
                    >
                      {isPublished ? 'Live' : 'Hidden'}
                    </button>
                  </div>
                </div>

                <div className="admin-mobile-card-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={() => onEditMeta(p)}
                  >
                    <Sliders size={15} />
                    <span>Manage Stock &amp; Plans</span>
                  </button>
                  {isPublished && (
                    <Link
                      href={`/products/${p.slug || p.id}`}
                      target="_blank"
                      className="admin-btn admin-btn-secondary admin-btn-icon"
                      title="View in store"
                    >
                      <ExternalLink size={15} />
                    </Link>
                  )}
                  {p.is_website_only && (
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger admin-btn-icon"
                      onClick={() => onDelete(p.id, p.name, true)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}

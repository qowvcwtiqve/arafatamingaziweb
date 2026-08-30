'use client';

import { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import CustomDropdown from '../ui/CustomDropdown';
import {
  LifeBuoy,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  X,
  RefreshCw,
  Send,
  Image as ImageIcon,
  Lock,
  ShoppingBag,
  Wallet,
  Check,
  ChevronRight,
  User,
  Copy,
  FileText,
  Sparkles,
  ShieldCheck,
  ZoomIn,
  MessageSquare,
  Paperclip,
  Info
} from 'lucide-react';

export default function TicketsManagementTab() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    pendingAdminReply: 0,
    paymentIssues: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTicketData, setActiveTicketData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Quick Preset Templates for Instant 1-Click Replies
  const CANNED_RESPONSES = [
    {
      title: 'Replacement Issued',
      text: 'Hello! Your replacement credentials have been verified and assigned above. Please check and log in. Let us know if you need any further assistance!',
    },
    {
      title: 'Payment Credited',
      text: 'We have verified your transaction reference (UTR). Your wallet balance has been successfully credited. Thank you for choosing QuantumXD!',
    },
    {
      title: 'Screenshot Needed',
      text: 'Please provide a clear screenshot of the error message on your screen so we can resolve your issue immediately.',
    },
    {
      title: 'Order Delivered',
      text: 'Your order has been verified and delivered. You can also view your full credentials anytime in your User Dashboard > My Orders.',
    },
  ];

  // Fetch tickets list & summary stats
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/tickets');
      if (res.data?.success) {
        setTickets(res.data.tickets || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Fetch ticket details when modal opens
  const fetchTicketDetails = async (tktId, silent = false) => {
    if (!tktId) return;
    if (!silent) setLoadingDetails(true);
    try {
      const res = await api.get(`/admin/tickets/${tktId}`);
      if (res.data?.success) {
        setActiveTicketData(res.data);
      }
    } catch (err) {
      if (!silent) toast.error('Failed to load conversation thread');
    } finally {
      if (!silent) setLoadingDetails(false);
    }
  };

  // Auto-sync polling when modal is active
  useEffect(() => {
    if (!isModalOpen || !selectedTicketId) return;
    const interval = setInterval(() => {
      fetchTicketDetails(selectedTicketId, true);
    }, 6000);
    return () => clearInterval(interval);
  }, [isModalOpen, selectedTicketId]);

  const openTicketModal = (tktId) => {
    setSelectedTicketId(tktId);
    setIsModalOpen(true);
    fetchTicketDetails(tktId);
  };

  const closeTicketModal = () => {
    setIsModalOpen(false);
    setSelectedTicketId(null);
    setActiveTicketData(null);
    setReplyText('');
    setAttachedImage(null);
    setIsInternalNote(false);
    fetchTickets();
  };

  useEffect(() => {
    if (isModalOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTicketData?.messages, isModalOpen]);

  // Upload image handler
  const handleUploadImage = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be under 10MB');
      return;
    }
    setUploadingImage(true);
    const body = new FormData();
    body.append('file', file);
    try {
      const res = await api.post('/tickets/upload', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success) {
        setAttachedImage(res.data.url);
        toast.success('Screenshot attached');
      }
    } catch (err) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Send admin reply or internal staff note
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    if ((!replyText.trim() && !attachedImage) || !selectedTicketId) return;

    setSendingReply(true);
    try {
      const res = await api.post(`/admin/tickets/${selectedTicketId}/reply`, {
        message: replyText.trim(),
        image_url: attachedImage || null,
        is_internal_note: isInternalNote,
      });
      if (res.data?.success) {
        setReplyText('');
        setAttachedImage(null);
        setIsInternalNote(false);
        fetchTicketDetails(selectedTicketId);
        fetchTickets();
        toast.success(isInternalNote ? 'Internal staff note saved' : 'Reply sent to customer');
      }
    } catch (err) {
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  // Quick Status changer
  const handleStatusChange = async (newStatus) => {
    if (!selectedTicketId) return;
    try {
      const res = await api.patch(`/admin/tickets/${selectedTicketId}/status`, {
        status: newStatus,
      });
      if (res.data?.success) {
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
        fetchTicketDetails(selectedTicketId);
        fetchTickets();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // 1-Click Deposit Approver
  const handleApproveDeposit = async () => {
    if (!activeTicketData?.deposit_details?.id) return;
    const depId = activeTicketData.deposit_details.id;
    if (!window.confirm(`Approve deposit #${depId} and credit balance to customer?`)) return;

    try {
      const res = await api.post(`/admin/deposits/${depId}/approve`);
      if (res.data?.success) {
        toast.success('Deposit approved & wallet credited successfully!');
        fetchTicketDetails(selectedTicketId);
        fetchTickets();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve deposit');
    }
  };

  // Filter & Search Logic
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = t.ticket_number?.toLowerCase().includes(q);
      const matchSub = t.subject?.toLowerCase().includes(q);
      const matchUser = t.user_name?.toLowerCase().includes(q) || t.user_email?.toLowerCase().includes(q);
      if (!matchNum && !matchSub && !matchUser) return false;
    }
    return true;
  });

  return (
    <div className="admin-tickets-container">

      {/* 1. TOP STATS BAR */}
      <div className="admin-tickets-stats-grid">
        <div className="admin-tkt-stat-card">
          <div className="stat-card-left">
            <span className="stat-label">Total Tickets</span>
            <span className="stat-number">{stats.total}</span>
          </div>
          <div className="stat-card-icon-wrap cyan">
            <LifeBuoy size={20} color="#3874FF" />
          </div>
        </div>

        <div className="admin-tkt-stat-card">
          <div className="stat-card-left">
            <span className="stat-label">Open / Unresolved</span>
            <span className="stat-number green">{stats.open}</span>
          </div>
          <div className="stat-card-icon-wrap green">
            <Clock size={20} color="#10B981" />
          </div>
        </div>

        <div className="admin-tkt-stat-card">
          <div className="stat-card-left">
            <span className="stat-label">In Progress</span>
            <span className="stat-number amber">{stats.inProgress}</span>
          </div>
          <div className="stat-card-icon-wrap amber">
            <RefreshCw size={20} color="#F59E0B" />
          </div>
        </div>

        <div className="admin-tkt-stat-card">
          <div className="stat-card-left">
            <span className="stat-label">Resolved / Closed</span>
            <span className="stat-number" style={{ color: '#10B981' }}>{stats.resolved + stats.closed}</span>
          </div>
          <div className="stat-card-icon-wrap cyan">
            <CheckCircle2 size={20} color="#3874FF" />
          </div>
        </div>
      </div>

      {/* 2. CONTROLS TOOLBAR (Search & Custom Obsidian Dropdowns) */}
      <div className="tickets-toolbar-card">
        <div className="tickets-search-box">
          <Search size={15} color="#64748B" />
          <input
            type="text"
            placeholder="Search ticket #, subject, or customer name/email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="tickets-search-clear" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="tickets-filter-group">
          <CustomDropdown
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'open', label: 'Open', color: '#10B981' },
              { value: 'in_progress', label: 'In Progress', color: '#F59E0B' },
              { value: 'waiting_user', label: 'Waiting Customer', color: '#8B5CF6' },
              { value: 'resolved', label: 'Resolved', color: '#3874FF' },
              { value: 'closed', label: 'Closed', color: '#64748B' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Statuses"
            minWidth={150}
          />

          <CustomDropdown
            options={[
              { value: 'all', label: 'All Categories' },
              { value: 'order_issue', label: 'Order Issue' },
              { value: 'payment_issue', label: 'Payment Issue' },
              { value: 'key_replacement', label: 'Key Replacement' },
              { value: 'deposit_query', label: 'Wallet Deposit' },
              { value: 'general', label: 'General Support' },
            ]}
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="All Categories"
            minWidth={165}
          />

          <button className="tickets-refresh-btn" onClick={fetchTickets} title="Refresh Tickets">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* 3. TICKETS LIST TABLE & MOBILE CARDS */}
      <div className="tickets-table-card">
        {loading ? (
          <div className="tickets-table-loading">
            <RefreshCw size={24} className="spin" color="#3874FF" />
            <p>Loading tickets catalog...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="tickets-empty-box">
            <LifeBuoy size={32} color="var(--color-text-muted)" />
            <h4>No support tickets found</h4>
            <p>Try clearing filters or search terms.</p>
          </div>
        ) : (
          <div className="admin-table-responsive hide-on-mobile">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Subject &amp; Last Message</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((tkt) => {
                  const statusColors = {
                    open: '#10B981',
                    in_progress: '#F59E0B',
                    waiting_user: '#8B5CF6',
                    resolved: '#3874FF',
                    closed: '#64748B',
                  };
                  const color = statusColors[tkt.status] || '#3874FF';

                  return (
                    <tr key={tkt.id} onClick={() => openTicketModal(tkt.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <span className="ticket-id-tag">
                          {tkt.ticket_number || `TKT-${tkt.id.slice(0, 6).toUpperCase()}`}
                        </span>
                      </td>
                      <td>
                        <div className="user-info-stack">
                          <strong>{tkt.user_name || 'Customer'}</strong>
                          <span>{tkt.user_email}</span>
                        </div>
                      </td>
                      <td>
                        <span className="ticket-cat-badge">
                          {tkt.category === 'order_issue' && 'Order Issue'}
                          {tkt.category === 'payment_issue' && 'Payment/UTR'}
                          {tkt.category === 'key_replacement' && 'Replacement'}
                          {tkt.category === 'general' && 'General'}
                        </span>
                      </td>
                      <td>
                        <div className="tkt-msg-snippet-stack">
                          <strong>{tkt.subject || 'Support Ticket'}</strong>
                          <p>{tkt.last_message || tkt.message}</p>
                        </div>
                      </td>
                      <td>
                        <span
                          className="ticket-status-pill"
                          style={{
                            background: `${color}18`,
                            color: color,
                            border: `1px solid ${color}40`,
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                          <span>{tkt.status.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td>
                        <span className="tkt-time-tag">
                          {new Date(tkt.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTicketModal(tkt.id);
                          }}
                        >
                          <span>Manage</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. FULL-FEATURED ADMIN POPUP MODAL DIALOG */}
      {isModalOpen && (
        <div className="ticket-modal-overlay" onClick={closeTicketModal}>
          <div className="ticket-modal-dialog admin-modal-wide" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="modal-top-bar">
              <div className="modal-top-left">
                <div className="modal-badge-row">
                  <span className="modal-tkt-number">{activeTicketData?.ticket?.ticket_number || 'Ticket'}</span>
                  {activeTicketData?.ticket?.status && (
                    <span className={`status-pill status-${activeTicketData.ticket.status}`}>
                      <span className="pill-dot" />
                      <span>{activeTicketData.ticket.status.replace('_', ' ')}</span>
                    </span>
                  )}
                </div>
                <h3 className="modal-tkt-title">{activeTicketData?.ticket?.subject || 'Support Ticket'}</h3>
                <div className="admin-modal-meta">
                  <span><strong>Customer:</strong> {activeTicketData?.ticket?.user_name} ({activeTicketData?.ticket?.user_email})</span>
                  <span> • <strong>Created:</strong> {activeTicketData?.ticket ? new Date(activeTicketData.ticket.created_at).toLocaleString() : ''}</span>
                </div>
              </div>

              <div className="modal-top-right">
                <div className="admin-status-changer-box" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}>Status:</label>
                  <CustomDropdown
                    options={[
                      { value: 'open', label: 'Open', color: '#10B981' },
                      { value: 'in_progress', label: 'In Progress', color: '#F59E0B' },
                      { value: 'waiting_user', label: 'Waiting Customer', color: '#8B5CF6' },
                      { value: 'resolved', label: 'Resolved', color: '#3874FF' },
                      { value: 'closed', label: 'Closed', color: '#64748B' },
                    ]}
                    value={activeTicketData?.ticket?.status || 'open'}
                    onChange={(val) => handleStatusChange(val)}
                    minWidth={150}
                  />
                </div>

                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={closeTicketModal}
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="modal-scroll-body">
              {loadingDetails || !activeTicketData ? (
                <div className="modal-loading-state">
                  <RefreshCw size={24} className="spin" color="#3874FF" />
                  <p>Loading ticket thread...</p>
                </div>
              ) : (
                <>
                  {/* Linked Order Receipt Snippet */}
                  {activeTicketData.order_details && (
                    <div className="modal-receipt-box order-receipt">
                      <div className="receipt-head">
                        <div className="receipt-title-wrap">
                          <ShoppingBag size={16} color="#3874FF" />
                          <strong>Linked Order: #{activeTicketData.order_details.order_number}</strong>
                        </div>
                        <span className="receipt-status-pill">{activeTicketData.order_details.payment_status?.toUpperCase()}</span>
                      </div>
                      <div className="receipt-details-grid">
                        <div>
                          <span className="r-label">Product / Plan:</span>
                          <span className="r-val">{activeTicketData.order_details.product_name}</span>
                        </div>
                        <div>
                          <span className="r-label">Total Amount:</span>
                          <span className="r-val font-bold">₹{activeTicketData.order_details.total_amount} ({activeTicketData.order_details.payment_method})</span>
                        </div>
                        {activeTicketData.order_details.delivered_items && (
                          <div className="receipt-creds-full">
                            <span className="r-label">Delivered Key / Credentials:</span>
                            <div className="creds-code-wrap">
                              <code>{activeTicketData.order_details.delivered_items}</code>
                              <button
                                type="button"
                                className="btn-copy-sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(activeTicketData.order_details.delivered_items);
                                  toast.success('Key copied to clipboard!');
                                }}
                              >
                                <Copy size={12} />
                                <span>Copy</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Linked Deposit Details */}
                  {activeTicketData.deposit_details && (
                    <div className="modal-receipt-box deposit-receipt">
                      <div className="receipt-head">
                        <div className="receipt-title-wrap">
                          <Wallet size={16} color="#3874FF" />
                          <strong>Linked Payment Deposit: #{activeTicketData.deposit_details.id}</strong>
                        </div>
                        <span className={`receipt-status-pill ${activeTicketData.deposit_details.status === 'completed' ? 'green' : 'amber'}`}>
                          {activeTicketData.deposit_details.status?.toUpperCase()}
                        </span>
                      </div>
                      <div className="receipt-details-grid">
                        <div>
                          <span className="r-label">Deposit Amount:</span>
                          <span className="r-val font-bold text-green">₹{activeTicketData.deposit_details.amount}</span>
                        </div>
                        <div>
                          <span className="r-label">Gateway:</span>
                          <span className="r-val">{activeTicketData.deposit_details.gateway}</span>
                        </div>
                        <div>
                          <span className="r-label">UTR / Transaction Hash:</span>
                          <span className="r-val"><code>{activeTicketData.deposit_details.utr || 'N/A'}</code></span>
                        </div>
                      </div>

                      {activeTicketData.deposit_details.status !== 'completed' && (
                        <div className="admin-deposit-action-strip">
                          <button
                            type="button"
                            className="btn-1click-approve"
                            onClick={handleApproveDeposit}
                          >
                            <CheckCircle2 size={15} />
                            <span>1-Click Approve &amp; Credit ₹{activeTicketData.deposit_details.amount} to Buyer Wallet</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chat Messages Stream */}
                  <div className="modal-chat-stream">
                    {activeTicketData.messages?.map((msg) => {
                      const isUser = msg.sender_type === 'user';
                      const isSystem = msg.sender_type === 'system';
                      const isInternal = msg.is_internal_note;

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="system-pill-row">
                            <span className="system-pill">
                              <Info size={13} color="#3874FF" />
                              <span>{msg.message}</span>
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`message-bubble-row ${isUser ? 'user-row' : 'admin-row'} ${isInternal ? 'internal-row' : ''}`}
                        >
                          <div className={`message-bubble ${isUser ? 'user-bubble' : 'admin-bubble'} ${isInternal ? 'internal-bubble' : ''}`}>
                            <div className="msg-bubble-header">
                              <div className="msg-sender-info">
                                <span className="msg-sender-name">{msg.sender_name || (isUser ? 'Customer' : 'Support Staff')}</span>
                                {!isUser && !isInternal && (
                                  <span className="agent-badge">
                                    <ShieldCheck size={11} /> Support Staff
                                  </span>
                                )}
                                {isInternal && (
                                  <span className="internal-badge">
                                    <Lock size={11} /> Internal Note (Hidden from Customer)
                                  </span>
                                )}
                              </div>
                              <span className="msg-bubble-time">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="msg-bubble-content">
                              {msg.message}
                            </div>

                            {msg.image_url && (
                              <div
                                className="msg-bubble-attachment"
                                onClick={() => setLightboxImage(msg.image_url)}
                              >
                                <img src={msg.image_url} alt="Attachment" />
                                <div className="attachment-overlay">
                                  <ZoomIn size={14} /> Click to Enlarge
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </>
              )}
            </div>

            {/* Modal Bottom Reply Area with Canned Templates */}
            <div className="modal-reply-bar admin-reply-box">
              
              {/* Canned Responses Preset Strip */}
              <div className="canned-replies-strip">
                <span className="canned-title">
                  <Sparkles size={13} color="#3874FF" />
                  <span>Templates:</span>
                </span>
                {CANNED_RESPONSES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="canned-chip-btn"
                    onClick={() => setReplyText(tmpl.text)}
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>

              {/* 1-Click Quick Status Actions */}
              <div style={{ display: 'flex', gap: 6, padding: '4px 16px', borderTop: '1px solid var(--color-border, rgba(255, 255, 255, 0.06))', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
                  Quick Status:
                </span>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={() => handleStatusChange('resolved')}
                  style={{ padding: '2px 8px', fontSize: 11, color: '#3874FF' }}
                >
                  <CheckCircle2 size={12} />
                  <span>Mark Resolved</span>
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={() => handleStatusChange('in_progress')}
                  style={{ padding: '2px 8px', fontSize: 11, color: '#F59E0B' }}
                >
                  <Clock size={12} />
                  <span>In Progress</span>
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={() => handleStatusChange('waiting_user')}
                  style={{ padding: '2px 8px', fontSize: 11, color: '#8B5CF6' }}
                >
                  <User size={12} />
                  <span>Waiting Customer</span>
                </button>
              </div>

              {/* Attached image preview in reply */}
              {attachedImage && (
                <div className="reply-attachment-preview">
                  <img src={attachedImage} alt="Attachment" />
                  <button
                    type="button"
                    className="btn-remove-reply-image"
                    onClick={() => setAttachedImage(null)}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="reply-form-inner">
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleUploadImage(e.target.files[0]);
                    }
                  }}
                />

                <button
                  type="button"
                  className="btn-attach-photo"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage || sendingReply}
                  title="Attach screenshot/proof (Max 10MB)"
                >
                  {uploadingImage ? <RefreshCw size={16} className="spin" /> : <ImageIcon size={18} />}
                </button>

                <div className="internal-note-toggle-box">
                  <label className="toggle-label-chk">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                    />
                    <span className="chk-custom" />
                    <span className="chk-text">
                      <Lock size={12} /> Internal Note
                    </span>
                  </label>
                </div>

                <input
                  type="text"
                  className={`reply-input-text ${isInternalNote ? 'internal-input-mode' : ''}`}
                  placeholder={isInternalNote ? 'Write private internal staff note...' : 'Reply to customer...'}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={sendingReply}
                />

                <button
                  type="submit"
                  className={`btn-send-reply ${isInternalNote ? 'internal-send-btn' : ''}`}
                  disabled={(!replyText.trim() && !attachedImage) || sendingReply}
                >
                  {sendingReply ? <RefreshCw size={15} className="spin" /> : <Send size={15} />}
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* 5. LIGHTBOX MODAL */}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close"
              onClick={() => setLightboxImage(null)}
            >
              <X size={20} />
            </button>
            <img src={lightboxImage} alt="Enlarged screenshot" />
          </div>
        </div>
      )}

    </div>
  );
}

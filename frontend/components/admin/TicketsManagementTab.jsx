'use client';

import { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import CustomDropdown from '../ui/CustomDropdown';

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
  const [sendingReply, setSendingReply] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTickets = async () => {
    try {
      const res = await api.get('/admin/tickets', {
        params: {
          status: statusFilter,
          category: categoryFilter,
          search: searchQuery,
        },
      });
      if (res.data?.success) {
        setTickets(res.data.tickets || []);
        if (res.data.stats) setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Error fetching admin tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, categoryFilter, searchQuery]);

  const fetchTicketDetails = async (id) => {
    if (!id) return;
    setLoadingDetails(true);
    try {
      const res = await api.get(`/admin/tickets/${id}`);
      if (res.data?.success) {
        setActiveTicketData(res.data);
        setAdminNotes(res.data.ticket?.admin_notes || '');
      }
    } catch (err) {
      toast.error('Failed to load ticket conversation');
    } finally {
      setLoadingDetails(false);
    }
  };

  const openTicketModal = (id) => {
    setSelectedTicketId(id);
    setIsModalOpen(true);
    fetchTicketDetails(id);
  };

  const closeTicketModal = () => {
    setIsModalOpen(false);
    setSelectedTicketId(null);
    setActiveTicketData(null);
    setAttachedImage(null);
    setReplyText('');
    fetchTickets();
  };

  useEffect(() => {
    if (isModalOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTicketData?.messages, isModalOpen]);

  // Image Upload Handler
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
        toast.success('Screenshot attached successfully');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload screenshot');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSendReply = async (e, optionalStatus = null) => {
    if (e) e.preventDefault();
    if ((!replyText.trim() && !attachedImage) || !selectedTicketId) return;

    setSendingReply(true);
    try {
      const res = await api.post(`/admin/tickets/${selectedTicketId}/reply`, {
        message: replyText.trim(),
        is_internal_note: isInternalNote,
        image_url: attachedImage || null,
      });
      if (res.data?.success) {
        toast.success(isInternalNote ? 'Internal note added' : 'Reply sent to customer');
        setReplyText('');
        setAttachedImage(null);
        setIsInternalNote(false);

        if (optionalStatus) {
          await api.patch(`/admin/tickets/${selectedTicketId}/status`, { status: optionalStatus });
        }

        fetchTicketDetails(selectedTicketId);
        fetchTickets();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicketId) return;
    try {
      const res = await api.patch(`/admin/tickets/${selectedTicketId}/status`, { status: newStatus });
      if (res.data?.success) {
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
        fetchTicketDetails(selectedTicketId);
        fetchTickets();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedTicketId) return;
    setSavingNotes(true);
    try {
      const res = await api.patch(`/admin/tickets/${selectedTicketId}/notes`, { admin_notes: adminNotes });
      if (res.data?.success) {
        toast.success('Internal notes saved');
      }
    } catch (err) {
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleApproveDeposit = async () => {
    if (!selectedTicketId) return;
    if (!window.confirm('Are you sure you want to approve this deposit and credit the buyer wallet?')) return;

    try {
      const res = await api.post(`/admin/tickets/${selectedTicketId}/approve-deposit`);
      if (res.data?.success) {
        toast.success(res.data.message || 'Deposit approved!');
        fetchTicketDetails(selectedTicketId);
        fetchTickets();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve deposit');
    }
  };

  const applyCannedResponse = (text) => {
    setReplyText(text);
  };

  return (
    <div className="tickets-admin-wrapper">
      
      {/* 1. Stat Summary Cards */}
      <div className="tickets-stats-grid">
        <div className="ticket-stat-card">
          <div className="ticket-stat-header">
            <span className="ticket-stat-label">Total Tickets</span>
            <span className="icon icon--sm icon--cyan">confirmation_number</span>
          </div>
          <div className="ticket-stat-value">{stats.total}</div>
        </div>

        <div className="ticket-stat-card stat-card-open">
          <div className="ticket-stat-header">
            <span className="ticket-stat-label">Open / Action Needed</span>
            <span className="icon icon--sm text-blue">pending_actions</span>
          </div>
          <div className="ticket-stat-value text-blue">{stats.open}</div>
        </div>

        <div className="ticket-stat-card stat-card-amber">
          <div className="ticket-stat-header">
            <span className="ticket-stat-label">In Progress</span>
            <span className="icon icon--sm text-amber">hourglass_top</span>
          </div>
          <div className="ticket-stat-value text-amber">{stats.inProgress}</div>
        </div>

        <div className="ticket-stat-card stat-card-green">
          <div className="ticket-stat-header">
            <span className="ticket-stat-label">Payment &amp; Deposits</span>
            <span className="icon icon--sm text-green">account_balance_wallet</span>
          </div>
          <div className="ticket-stat-value text-green">{stats.paymentIssues}</div>
        </div>

        <div className="ticket-stat-card">
          <div className="ticket-stat-header">
            <span className="ticket-stat-label">Resolved &amp; Closed</span>
            <span className="icon icon--sm text-muted">task_alt</span>
          </div>
          <div className="ticket-stat-value">{stats.resolved + stats.closed}</div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="tickets-filter-bar">
        <div className="tickets-search-wrapper">
          <span className="icon icon--sm search-icon">search</span>
          <input
            type="text"
            className="tickets-search-input"
            placeholder="Search by Ticket #, Email, Buyer Name, Order ID, or UTR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="tickets-search-clear" onClick={() => setSearchQuery('')}>
              <span className="icon icon--xs">close</span>
            </button>
          )}
        </div>

        <div className="tickets-filter-group">
          <CustomDropdown
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'open', label: 'Open', color: '#10B981' },
              { value: 'in_progress', label: 'In Progress', color: '#F59E0B' },
              { value: 'resolved', label: 'Resolved', color: '#3874FF' },
              { value: 'closed', label: 'Closed', color: '#64748B' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Statuses"
            minWidth={140}
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
            minWidth={160}
          />

          <button className="tickets-refresh-btn" onClick={fetchTickets} title="Refresh Tickets">
            <span className="icon icon--sm">refresh</span>
          </button>
        </div>
      </div>

      {/* 3. Full-Width Tickets List Table / Data Grid (Popup Trigger) */}
      <div className="tickets-table-card">
        <div className="table-card-header">
          <div className="table-header-left">
            <span className="icon icon--sm icon--cyan">inbox</span>
            <strong>Support Tickets Queue ({tickets.length})</strong>
          </div>
          {stats.pendingAdminReply > 0 && (
            <span className="table-unread-tag">{stats.pendingAdminReply} Action Required</span>
          )}
        </div>

        {loading ? (
          <div className="tickets-empty-state">
            <span className="icon icon--lg spin">sync</span>
            <p>Loading tickets queue...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="tickets-empty-state">
            <span className="icon icon--xl icon--muted">inbox</span>
            <p>No support tickets found matching your filters.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table admin-tickets-table">
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Last Activity</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((tkt) => {
                  const isUnread = tkt.unread_admin_count > 0;
                  return (
                    <tr
                      key={tkt.id}
                      className={`admin-ticket-row ${isUnread ? 'unread-row' : ''}`}
                      onClick={() => openTicketModal(tkt.id)}
                    >
                      <td>
                        <div className="tkt-num-cell">
                          {isUnread && <span className="unread-dot-cell" />}
                          <span className="tkt-id-text">{tkt.ticket_number}</span>
                        </div>
                      </td>
                      <td>
                        <div className="tkt-buyer-cell">
                          <strong>{tkt.user_name || 'Buyer'}</strong>
                          <span className="tkt-sub-text">{tkt.user_email}</span>
                        </div>
                      </td>
                      <td>
                        <span className="tkt-category-chip">
                          <span className="icon icon--xs">
                            {tkt.category === 'payment_issue' ? 'account_balance_wallet' : 'shopping_bag'}
                          </span>
                          <span>{tkt.category.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td>
                        <div className="tkt-subject-text" title={tkt.subject}>
                          {tkt.subject}
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill status-${tkt.status}`}>
                          <span className="icon icon--xs">
                            {tkt.status === 'open' ? 'pending' : tkt.status === 'in_progress' ? 'hourglass_top' : tkt.status === 'resolved' ? 'check_circle' : 'lock'}
                          </span>
                          <span>{tkt.status.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="tkt-time-text">
                        {new Date(tkt.updated_at || tkt.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-open-dialog-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTicketModal(tkt.id);
                          }}
                        >
                          <span className="icon icon--xs">forum</span>
                          <span>Inspect &amp; Reply</span>
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
                      <span className="icon icon--xs">
                        {activeTicketData.ticket.status === 'open' ? 'pending' : activeTicketData.ticket.status === 'in_progress' ? 'hourglass_top' : activeTicketData.ticket.status === 'resolved' ? 'check_circle' : 'lock'}
                      </span>
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
                      { value: 'waiting_user', label: 'Waiting on Customer', color: '#8B5CF6' },
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
                  <span className="icon icon--md">close</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="modal-scroll-body">
              {loadingDetails || !activeTicketData ? (
                <div className="modal-loading-state">
                  <span className="icon icon--lg spin">sync</span>
                  <p>Loading ticket thread...</p>
                </div>
              ) : (
                <>
                  {/* EMBEDDED RECEIPT 1: Order Details */}
                  {activeTicketData.order_details && (
                    <div className="modal-receipt-box order-receipt">
                      <div className="receipt-head">
                        <div className="receipt-title-wrap">
                          <span className="icon icon--sm icon--cyan">shopping_bag</span>
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
                                <span className="icon icon--xs">content_copy</span> Copy
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* EMBEDDED RECEIPT 2: Deposit Details */}
                  {activeTicketData.deposit_details && (
                    <div className="modal-receipt-box deposit-receipt">
                      <div className="receipt-head">
                        <div className="receipt-title-wrap">
                          <span className="icon icon--sm icon--cyan">account_balance_wallet</span>
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
                            <span className="icon icon--sm">check_circle</span>
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
                              <span className="icon icon--xs icon--cyan">info</span>
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
                          {isUser && (
                            <div className="admin-chat-avatar user-av" title="Buyer">
                              <span className="icon icon--sm">person</span>
                            </div>
                          )}

                          <div className={`message-bubble ${isUser ? 'user-bubble' : 'admin-bubble'} ${isInternal ? 'internal-bubble' : ''}`}>
                            <div className="msg-bubble-header">
                              <div className="msg-sender-info">
                                <span className="msg-sender-name">{msg.sender_name || (isUser ? 'Customer' : 'Support Staff')}</span>
                                {!isUser && !isInternal && (
                                  <span className="agent-badge">
                                    <span className="icon icon--xs">verified</span> Support Staff
                                  </span>
                                )}
                                {isInternal && (
                                  <span className="internal-badge">
                                    <span className="icon icon--xs">lock</span> Internal Note (Hidden from Customer)
                                  </span>
                                )}
                              </div>
                            </div>

                            {msg.message && (
                              <div className="msg-bubble-body">
                                {msg.message}
                              </div>
                            )}

                            {msg.image_url && (
                              <div className="bubble-image-wrap" onClick={() => setLightboxImage(msg.image_url)}>
                                <img src={msg.image_url} alt="Attached screenshot" className="bubble-image-thumb" />
                                <span className="img-hover-badge">
                                  <span className="icon icon--xs">zoom_in</span> View Full
                                </span>
                              </div>
                            )}

                            <div className="msg-bubble-footer">
                              <span className="msg-time">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          {!isUser && !isInternal && (
                            <div className="admin-chat-avatar staff-av" title="Support Staff">
                              <span className="icon icon--sm icon--cyan">support_agent</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </>
              )}
            </div>

            {/* Quick Canned Macros Bar */}
            <div className="modal-macros-bar">
              <span className="macros-title">Quick Responses:</span>
              <button
                type="button"
                className="macro-btn"
                onClick={() => applyCannedResponse('Hello! We have verified your purchase. Here are your fresh replacement credentials:\n\nEmail / User: \nPassword: \n\nPlease verify and let us know if you need further help!')}
              >
                <span className="icon icon--xs icon--cyan">bolt</span>
                <span>Key Replaced</span>
              </button>
              <button
                type="button"
                className="macro-btn"
                onClick={() => applyCannedResponse('Hello! Your payment transaction (UTR) has been successfully verified, and your wallet balance has been updated. Thank you for your patience!')}
              >
                <span className="icon icon--xs icon--cyan">account_balance_wallet</span>
                <span>Payment Verified</span>
              </button>
              <button
                type="button"
                className="macro-btn"
                onClick={() => applyCannedResponse('Hello! Our technical team is investigating this issue with the server provider. We will update you here within 15-30 minutes.')}
              >
                <span className="icon icon--xs icon--accent">search</span>
                <span>Investigating</span>
              </button>
              <button
                type="button"
                className="macro-btn"
                onClick={() => applyCannedResponse('Please check your email Spam/Junk folder or access your digital key directly under your user Dashboard -> Downloads tab.')}
              >
                <span className="icon icon--xs icon--cyan">download</span>
                <span>Check Dashboard</span>
              </button>
            </div>

            {/* Modal Composer / Footer */}
            <form onSubmit={handleSendReply} className="modal-admin-reply-box">
              {attachedImage && (
                <div className="modal-attached-bar">
                  <div className="attached-thumb-box">
                    <img src={attachedImage} alt="Attachment" className="attached-thumb" />
                    <span className="attached-label">Image screenshot attached</span>
                  </div>
                  <button
                    type="button"
                    className="btn-remove-thumb"
                    onClick={() => setAttachedImage(null)}
                  >
                    <span className="icon icon--xs">close</span>
                  </button>
                </div>
              )}

              <div className="admin-reply-input-wrap">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => handleUploadImage(e.target.files?.[0])}
                />
                <button
                  type="button"
                  className="btn-attach-icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  title="Attach Screenshot"
                >
                  <span className="icon icon--sm icon--cyan">
                    {uploadingImage ? 'sync' : 'attach_file'}
                  </span>
                </button>

                <textarea
                  className={`admin-reply-textarea ${isInternalNote ? 'is-internal' : ''}`}
                  rows={2}
                  placeholder={isInternalNote ? 'Write a private internal note for other admins...' : 'Type your official response to the customer... (Enter to send, Shift+Enter for new line)'}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if ((replyText.trim() || attachedImage) && !sendingReply) {
                        handleSendReply(e);
                      }
                    }
                  }}
                />
              </div>

              <div className="admin-reply-footer-row">
                <label className="admin-internal-toggle">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                  />
                  <span>Post as Internal Admin Note</span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="btn-reply-resolve-action"
                    onClick={(e) => handleSendReply(e, 'resolved')}
                    disabled={sendingReply || (!replyText.trim() && !attachedImage)}
                    title="Send message and mark ticket as Resolved"
                  >
                    <span className="icon icon--xs">task_alt</span>
                    <span>Reply &amp; Resolve</span>
                  </button>

                  <button
                    type="submit"
                    className={`btn-send-admin-reply ${isInternalNote ? 'internal-btn' : ''}`}
                    disabled={sendingReply || (!replyText.trim() && !attachedImage)}
                  >
                    <span className="icon icon--sm">send</span>
                    <span>{sendingReply ? 'Sending...' : isInternalNote ? 'Save Internal Note' : 'Send Reply'}</span>
                  </button>
                </div>
              </div>

              {/* Scratchpad Private Notes */}
              <div className="admin-scratchpad-bar">
                <div className="scratchpad-header">
                  <span className="icon icon--xs icon--cyan">edit_note</span>
                  <span>Internal Scratchpad Notes</span>
                  <button
                    type="button"
                    className="btn-save-scratchpad"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                  >
                    {savingNotes ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
                <input
                  type="text"
                  className="scratchpad-input"
                  placeholder="Record supplier order ref, manual refund note, etc..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 5. LIGHTBOX MODAL FOR IMAGE PREVIEW */}
      {lightboxImage && (
        <div className="ticket-lightbox-backdrop" onClick={() => setLightboxImage(null)}>
          <div className="ticket-lightbox-panel" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage} alt="Fullscreen Screenshot" className="lightbox-img" />
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setLightboxImage(null)}
            >
              <span className="icon icon--md">close</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

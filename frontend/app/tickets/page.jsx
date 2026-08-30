'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import siteConfig from '../../config/siteConfig';

export default function TicketsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'chat'
  const [myTickets, setMyTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTicketData, setActiveTicketData] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentDeposits, setRecentDeposits] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    category: 'order_issue',
    order_id: '',
    deposit_id: '',
    subject: '',
    message: '',
    image_url: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [formImage, setFormImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Custom Dropdown Menus State
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [orderDropdownOpen, setOrderDropdownOpen] = useState(false);
  const [depositDropdownOpen, setDepositDropdownOpen] = useState(false);

  const categoryDropdownRef = useRef(null);
  const orderDropdownRef = useRef(null);
  const depositDropdownRef = useRef(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const formFileInputRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setCategoryDropdownOpen(false);
      }
      if (orderDropdownRef.current && !orderDropdownRef.current.contains(e.target)) {
        setOrderDropdownOpen(false);
      }
      if (depositDropdownRef.current && !depositDropdownRef.current.contains(e.target)) {
        setDepositDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch recent orders & deposits for dropdowns if logged in
  useEffect(() => {
    if (user) {
      api.get('/users/orders').then((res) => {
        if (res.data?.orders) setRecentOrders(res.data.orders);
      }).catch(() => {});
      api.get('/users/deposits').then((res) => {
        if (res.data?.deposits) setRecentDeposits(res.data.deposits);
      }).catch(() => {});
      fetchMyTickets();
    } else {
      setMyTickets([]);
      setLoadingList(false);
    }
  }, [user]);

  // Fetch Tickets List for logged in user
  const fetchMyTickets = async () => {
    if (!user) return;
    setLoadingList(true);
    try {
      const res = await api.get('/tickets/my-tickets');
      if (res.data?.success) {
        setMyTickets(res.data.tickets || []);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoadingList(false);
    }
  };

  // Load Single Ticket Conversation Details
  const fetchTicketDetails = async (tktId) => {
    if (!tktId) return;
    setLoadingDetails(true);
    try {
      const res = await api.get(`/tickets/${tktId}`);
      if (res.data?.success) {
        setActiveTicketData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load conversation');
    } finally {
      setLoadingDetails(false);
    }
  };

  const openTicketModal = (tktId) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setSelectedTicketId(tktId);
    setIsModalOpen(true);
    fetchTicketDetails(tktId);
  };

  const closeTicketModal = () => {
    setIsModalOpen(false);
    setSelectedTicketId(null);
    setActiveTicketData(null);
    setAttachedImage(null);
    setReplyText('');
    fetchMyTickets();
  };

  useEffect(() => {
    if (isModalOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTicketData?.messages, isModalOpen]);

  // Image Upload Handler
  const handleUploadImage = async (file, isForm = false) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
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
        if (isForm) {
          setFormImage(res.data.url);
          setFormData((prev) => ({ ...prev, image_url: res.data.url }));
        } else {
          setAttachedImage(res.data.url);
        }
        toast.success('Screenshot attached successfully');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload screenshot');
    } finally {
      setUploadingImage(false);
    }
  };

  // Submit New Ticket
  const handleSubmitTicket = async (e) => {
    e.preventDefault();

    // Check login state first
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!formData.message.trim()) {
      toast.error('Please describe your issue');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/tickets', formData);
      if (res.data?.success) {
        toast.success('Support ticket submitted successfully!');
        setFormData({
          category: 'order_issue',
          order_id: '',
          deposit_id: '',
          subject: '',
          message: '',
          image_url: '',
        });
        setFormImage(null);
        await fetchMyTickets();
        // Open the newly created ticket in modal popup immediately
        if (res.data.ticket?.id) {
          openTicketModal(res.data.ticket.id);
        }
        setActiveTab('chat');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reply to active ticket
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if ((!replyText.trim() && !attachedImage) || !selectedTicketId) return;

    setSendingReply(true);
    try {
      const res = await api.post(
        `/tickets/${selectedTicketId}/reply`,
        { message: replyText.trim(), image_url: attachedImage || null }
      );
      if (res.data?.success) {
        setReplyText('');
        setAttachedImage(null);
        fetchTicketDetails(selectedTicketId);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSendingReply(false);
    }
  };

  // Close ticket as resolved
  const handleCloseTicket = async () => {
    if (!selectedTicketId) return;
    if (!window.confirm('Mark this support ticket as resolved?')) return;

    try {
      const res = await api.patch(`/tickets/${selectedTicketId}/close`, {});
      if (res.data?.success) {
        toast.success('Ticket marked as resolved');
        fetchTicketDetails(selectedTicketId);
        fetchMyTickets();
      }
    } catch (err) {
      toast.error('Failed to close ticket');
    }
  };

  const categories = [
    { id: 'order_issue', label: 'Order & Delivery Issue', desc: 'Invalid key, missing credentials, or link expired', icon: 'shopping_bag' },
    { id: 'payment_issue', label: 'Payment & UTR Verification', desc: 'UPI deposit pending, UTR unmatched, or wallet issue', icon: 'account_balance_wallet' },
    { id: 'key_replacement', label: 'Key Replacement / Warranty', desc: 'Claim replacement under valid store warranty', icon: 'autorenew' },
    { id: 'general', label: 'General / Bot Inquiry', desc: 'Questions about subscriptions, stock, or bulk deals', icon: 'chat' },
  ];

  const filteredTickets = myTickets.filter((t) => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  return (
    <div className="tickets-page-container">
      <div className="tickets-page-inner">

        {/* 1. Header Hero */}
        <div className="portal-hero">
          <div className="portal-hero-badge">
            <span className="icon icon--xs icon--cyan">support_agent</span>
            <span>24/7 Priority Support Desk</span>
          </div>
          <h1 className="portal-hero-title">
            Help &amp; <span className="text-gradient">Support Center</span>
          </h1>
          <p className="portal-hero-subtitle">
            Submit a support ticket for fast order resolution, replacement keys, or payment verification.
          </p>

          {/* Navigation Pill Tabs */}
          <div className="portal-nav-switcher">
            <button
              type="button"
              className={`portal-nav-btn ${activeTab === 'new' ? 'active' : ''}`}
              onClick={() => setActiveTab('new')}
            >
              <span className="icon icon--sm">add_circle</span>
              <span>Submit New Ticket</span>
            </button>

            <button
              type="button"
              className={`portal-nav-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => {
                if (!user) {
                  setShowAuthModal(true);
                } else {
                  setActiveTab('chat');
                }
              }}
            >
              <span className="icon icon--sm">inbox</span>
              <span>My Tickets</span>
              {myTickets.length > 0 && (
                <span className="nav-counter-badge">{myTickets.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* VIEW 1: Submit New Support Ticket Form */}
        {activeTab === 'new' && (
          <div className="ticket-form-card">
            <div className="form-card-header">
              <div className="form-card-header-left">
                <div className="form-card-icon-wrap">
                  <span className="icon icon--md icon--cyan">assignment</span>
                </div>
                <div>
                  <h3 className="form-card-title">Open a Support Request</h3>
                  <p className="form-card-desc">
                    {user ? (
                      <>Logged in as <strong style={{ color: '#3874FF' }}>{user.name || user.email}</strong></>
                    ) : (
                      'Fill out the form below to receive priority assistance.'
                    )}
                  </p>
                </div>
              </div>

              {!user && (
                <button
                  type="button"
                  className="btn-signin-header-prompt"
                  onClick={() => setShowAuthModal(true)}
                >
                  <span className="icon icon--xs">login</span>
                  <span>Sign In</span>
                </button>
              )}
            </div>

            <div className="form-card-body">
              <form onSubmit={handleSubmitTicket} className="support-form">
                
                {/* 1. Custom Pure React Category Dropdown */}
                <div className="field-group">
                  <label className="field-label">Issue Category</label>
                  <div className="custom-dropdown-wrap" ref={categoryDropdownRef}>
                    <button
                      type="button"
                      className={`custom-dropdown-trigger ${categoryDropdownOpen ? 'is-open' : ''}`}
                      onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                    >
                      <div className="dropdown-trigger-left">
                        <span className="icon icon--sm icon--cyan">
                          {categories.find(c => c.id === formData.category)?.icon || 'help_outline'}
                        </span>
                        <span className="dropdown-trigger-title">
                          {categories.find(c => c.id === formData.category)?.label}
                        </span>
                      </div>
                      <span className={`icon icon--sm dropdown-chevron ${categoryDropdownOpen ? 'rotated' : ''}`}>
                        expand_more
                      </span>
                    </button>

                    {categoryDropdownOpen && (
                      <div className="custom-dropdown-panel">
                        {categories.map((cat) => {
                          const isSelected = formData.category === cat.id;
                          return (
                            <div
                              key={cat.id}
                              className={`custom-dropdown-option ${isSelected ? 'active' : ''}`}
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, category: cat.id }));
                                setCategoryDropdownOpen(false);
                              }}
                            >
                              <div className="dropdown-option-left">
                                <span className={`icon icon--sm ${isSelected ? 'icon--cyan' : 'icon--muted'}`}>
                                  {cat.icon}
                                </span>
                                <div className="dropdown-option-text">
                                  <span className="option-title">{cat.label}</span>
                                  <span className="option-desc">{cat.desc}</span>
                                </div>
                              </div>
                              {isSelected && (
                                <span className="icon icon--xs icon--cyan">check</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Smart Order Selector */}
                {(formData.category === 'order_issue' || formData.category === 'key_replacement') && (
                  <div className="field-group highlight-group">
                    <label className="field-label">Linked Order / Purchase</label>
                    {user && recentOrders.length > 0 ? (
                      <div className="custom-dropdown-wrap" ref={orderDropdownRef}>
                        <button
                          type="button"
                          className={`custom-dropdown-trigger ${orderDropdownOpen ? 'is-open' : ''}`}
                          onClick={() => setOrderDropdownOpen(!orderDropdownOpen)}
                        >
                          <div className="dropdown-trigger-left">
                            <span className="icon icon--sm icon--cyan">shopping_bag</span>
                            <span className="dropdown-trigger-title">
                              {formData.order_id 
                                ? (recentOrders.find(o => o.id === formData.order_id)?.product_name || `Order #${formData.order_id.slice(-6)}`) 
                                : 'Select from recent purchases (Optional)'}
                            </span>
                          </div>
                          <span className={`icon icon--sm dropdown-chevron ${orderDropdownOpen ? 'rotated' : ''}`}>
                            expand_more
                          </span>
                        </button>

                        {orderDropdownOpen && (
                          <div className="custom-dropdown-panel">
                            <div
                              className={`custom-dropdown-option ${!formData.order_id ? 'active' : ''}`}
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, order_id: '' }));
                                setOrderDropdownOpen(false);
                              }}
                            >
                              <div className="dropdown-option-left">
                                <span className="icon icon--sm icon--muted">tag</span>
                                <span className="option-title">None / Manual order number</span>
                              </div>
                            </div>
                            {recentOrders.map((ord) => {
                              const isSelected = formData.order_id === ord.id;
                              return (
                                <div
                                  key={ord.id}
                                  className={`custom-dropdown-option ${isSelected ? 'active' : ''}`}
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, order_id: ord.id }));
                                    setOrderDropdownOpen(false);
                                  }}
                                >
                                  <div className="dropdown-option-left">
                                    <span className={`icon icon--sm ${isSelected ? 'icon--cyan' : 'icon--muted'}`}>
                                      shopping_bag
                                    </span>
                                    <div className="dropdown-option-text">
                                      <span className="option-title">#{ord.order_number || ord.id.slice(-6)} • {ord.product_name || 'Item'}</span>
                                      <span className="option-desc">Total: ₹{ord.total_amount || ord.price}</span>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <span className="icon icon--xs icon--cyan">check</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="custom-input-box">
                        <span className="icon icon--sm input-box-icon">tag</span>
                        <input
                          type="text"
                          className="custom-input"
                          placeholder="e.g. #QX-4892 or Sale Order Number"
                          value={formData.order_id}
                          onChange={(e) => setFormData((prev) => ({ ...prev, order_id: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Smart Deposit Selector */}
                {(formData.category === 'payment_issue') && (
                  <div className="field-group highlight-group">
                    <label className="field-label">Deposit Transaction / UPI UTR Number</label>
                    {user && recentDeposits.length > 0 && (
                      <div className="custom-dropdown-wrap" ref={depositDropdownRef} style={{ marginBottom: 10 }}>
                        <button
                          type="button"
                          className={`custom-dropdown-trigger ${depositDropdownOpen ? 'is-open' : ''}`}
                          onClick={() => setDepositDropdownOpen(!depositDropdownOpen)}
                        >
                          <div className="dropdown-trigger-left">
                            <span className="icon icon--sm icon--cyan">account_balance_wallet</span>
                            <span className="dropdown-trigger-title">
                              {formData.deposit_id && recentDeposits.find(d => d.id === formData.deposit_id)
                                ? `₹${recentDeposits.find(d => d.id === formData.deposit_id)?.amount} (${recentDeposits.find(d => d.id === formData.deposit_id)?.gateway})`
                                : 'Select from recent wallet deposits'}
                            </span>
                          </div>
                          <span className={`icon icon--sm dropdown-chevron ${depositDropdownOpen ? 'rotated' : ''}`}>
                            expand_more
                          </span>
                        </button>

                        {depositDropdownOpen && (
                          <div className="custom-dropdown-panel">
                            {recentDeposits.map((dep) => {
                              const isSelected = formData.deposit_id === dep.id;
                              return (
                                <div
                                  key={dep.id}
                                  className={`custom-dropdown-option ${isSelected ? 'active' : ''}`}
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, deposit_id: dep.id }));
                                    setDepositDropdownOpen(false);
                                  }}
                                >
                                  <div className="dropdown-option-left">
                                    <span className={`icon icon--sm ${isSelected ? 'icon--cyan' : 'icon--muted'}`}>
                                      account_balance_wallet
                                    </span>
                                    <div className="dropdown-option-text">
                                      <span className="option-title">₹{dep.amount} ({dep.gateway})</span>
                                      <span className="option-desc">Status: {dep.status?.toUpperCase()} • {new Date(dep.created_at || Date.now()).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <span className="icon icon--xs icon--cyan">check</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="custom-input-box">
                      <span className="icon icon--sm input-box-icon">receipt_long</span>
                      <input
                        type="text"
                        className="custom-input"
                        placeholder="Enter 12-digit UPI UTR number or Crypto Tx Hash"
                        value={formData.deposit_id}
                        onChange={(e) => setFormData((prev) => ({ ...prev, deposit_id: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {/* 4. Subject */}
                <div className="field-group">
                  <label className="field-label">Subject / Issue Summary</label>
                  <div className="custom-input-box">
                    <span className="icon icon--sm input-box-icon">edit</span>
                    <input
                      type="text"
                      className="custom-input"
                      placeholder="e.g. Key replacement request / Payment verification"
                      value={formData.subject}
                      onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* 5. Message Details */}
                <div className="field-group">
                  <label className="field-label">Detailed Explanation</label>
                  <textarea
                    className="ticket-direct-textarea"
                    rows={4}
                    placeholder="Please explain the issue in detail with any relevant error message or screenshot..."
                    value={formData.message}
                    onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                    required
                  />
                </div>

                {/* 6. Image / Screenshot Attachment */}
                <div className="field-group">
                  <label className="field-label">Attach Screenshot / Error Proof (Optional)</label>
                  <div className="attachment-upload-zone">
                    <input
                      type="file"
                      accept="image/*"
                      ref={formFileInputRef}
                      style={{ display: 'none' }}
                      onChange={(e) => handleUploadImage(e.target.files?.[0], true)}
                    />
                    {formImage ? (
                      <div className="attached-preview-card">
                        <img src={formImage} alt="Attachment preview" className="preview-thumbnail" />
                        <div className="preview-info">
                          <span className="preview-name">Screenshot Attached</span>
                          <button
                            type="button"
                            className="btn-remove-attachment"
                            onClick={() => {
                              setFormImage(null);
                              setFormData((prev) => ({ ...prev, image_url: '' }));
                            }}
                          >
                            <span className="icon icon--xs">close</span> Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-add-attachment"
                        onClick={() => {
                          if (!user) {
                            setShowAuthModal(true);
                          } else {
                            formFileInputRef.current?.click();
                          }
                        }}
                        disabled={uploadingImage}
                      >
                        <span className="icon icon--sm icon--cyan">add_photo_alternate</span>
                        <span>{uploadingImage ? 'Uploading image...' : 'Attach Screenshot or Payment Proof'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="form-submit-row">
                  <button
                    type="submit"
                    className="portal-primary-submit-btn"
                    disabled={submitting || uploadingImage}
                  >
                    <span className="icon icon--sm">send</span>
                    <span>{submitting ? 'Submitting...' : 'Submit Ticket'}</span>
                  </button>
                </div>

              </form>
            </div>

          </div>
        )}

        {/* VIEW 2: My Tickets Cards Grid View (Requires User Account) */}
        {activeTab === 'chat' && (
          <div className="portal-tickets-list-section">
            
            {!user ? (
              <div className="tickets-empty-box auth-required-banner">
                <span className="icon icon--2xl icon--cyan">lock</span>
                <h3>Account Required to View Support Tickets</h3>
                <p>Please sign in to your QuantumXD account to track active ticket resolutions and view replacement history.</p>
                <div className="auth-prompt-btn-group">
                  <button
                    type="button"
                    className="btn-open-first"
                    onClick={() => router.push('/login?redirect=/tickets')}
                  >
                    <span className="icon icon--sm">login</span> Sign In to My Account
                  </button>
                  <button
                    type="button"
                    className="btn-register-alt"
                    onClick={() => router.push('/register?redirect=/tickets')}
                  >
                    <span className="icon icon--sm">person_add</span> Create Account
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Filter Chips Bar */}
                <div className="tickets-status-filter-row">
                  <div className="status-chips-wrap">
                    <button
                      type="button"
                      className={`status-chip ${statusFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('all')}
                    >
                      All ({myTickets.length})
                    </button>
                    <button
                      type="button"
                      className={`status-chip ${statusFilter === 'open' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('open')}
                    >
                      Open ({myTickets.filter(t => t.status === 'open').length})
                    </button>
                    <button
                      type="button"
                      className={`status-chip ${statusFilter === 'in_progress' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('in_progress')}
                    >
                      In Progress ({myTickets.filter(t => t.status === 'in_progress').length})
                    </button>
                    <button
                      type="button"
                      className={`status-chip ${statusFilter === 'resolved' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('resolved')}
                    >
                      Resolved ({myTickets.filter(t => t.status === 'resolved').length})
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn-create-ticket-top"
                    onClick={() => setActiveTab('new')}
                  >
                    <span className="icon icon--sm">add</span>
                    <span>Open New Ticket</span>
                  </button>
                </div>

                {loadingList ? (
                  <div className="tickets-loading-grid">
                    {[1, 2, 3].map(i => <div key={i} className="ticket-card-skeleton" />)}
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="tickets-empty-box">
                    <span className="icon icon--2xl icon--muted">confirmation_number</span>
                    <h3>No Support Tickets Found</h3>
                    <p>You haven't submitted any support tickets under this filter.</p>
                    <button
                      type="button"
                      className="btn-open-first"
                      onClick={() => setActiveTab('new')}
                    >
                      <span className="icon icon--sm">add</span> Submit a Support Ticket
                    </button>
                  </div>
                ) : (
                  <div className="tickets-cards-grid">
                    {filteredTickets.map((tkt) => {
                      const hasUnread = tkt.unread_user_count > 0;
                      return (
                        <div
                          key={tkt.id}
                          className={`ticket-grid-card ${hasUnread ? 'has-unread' : ''}`}
                          onClick={() => openTicketModal(tkt.id)}
                        >
                          <div className="ticket-card-head">
                            <div className="ticket-num-box">
                              {hasUnread && <span className="unread-pulse" />}
                              <span className="tkt-num">{tkt.ticket_number}</span>
                            </div>
                            <span className={`status-pill status-${tkt.status}`}>
                              <span className="icon icon--xs">
                                {tkt.status === 'open' ? 'pending' : tkt.status === 'in_progress' ? 'hourglass_top' : tkt.status === 'resolved' ? 'check_circle' : 'lock'}
                              </span>
                              <span>{tkt.status.replace('_', ' ')}</span>
                            </span>
                          </div>

                          <h4 className="ticket-card-title">{tkt.subject}</h4>

                          <div className="ticket-card-meta">
                            <span className="tkt-category-badge">
                              <span className="icon icon--xs">
                                {tkt.category === 'payment_issue' ? 'account_balance_wallet' : 'shopping_bag'}
                              </span>
                              <span>{tkt.category.replace('_', ' ')}</span>
                            </span>
                            <span className="tkt-date">
                              {new Date(tkt.updated_at || tkt.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="ticket-card-action">
                            <button type="button" className="btn-view-chat">
                              <span className="icon icon--sm">forum</span>
                              <span>Open Conversation</span>
                              {hasUnread && <span className="new-msg-tag">New Reply</span>}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

          </div>
        )}

        {/* 2. POPUP MODAL: Ticket Conversation & Live Helpdesk Panel */}
        {isModalOpen && (
          <div className="ticket-modal-overlay" onClick={closeTicketModal}>
            <div className="ticket-modal-dialog" onClick={(e) => e.stopPropagation()}>
              
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
                  <span className="modal-tkt-time">
                    Created on {activeTicketData?.ticket ? new Date(activeTicketData.ticket.created_at).toLocaleString() : ''}
                  </span>
                </div>

                <div className="modal-top-right">
                  {activeTicketData?.ticket?.status !== 'closed' && activeTicketData?.ticket?.status !== 'resolved' && (
                    <button
                      type="button"
                      className="btn-mark-resolved-top"
                      onClick={handleCloseTicket}
                      title="Mark as Resolved"
                    >
                      <span className="icon icon--xs">check_circle</span>
                      <span>Mark Resolved</span>
                    </button>
                  )}
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
                    {/* Embedded Order Receipt */}
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
                              <span className="r-label">Delivered License / Key:</span>
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

                    {/* Embedded Deposit Receipt */}
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
                            <span className="r-val"><code>{activeTicketData.deposit_details.utr || 'Pending'}</code></span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Chat Messages Stream */}
                    <div className="modal-chat-stream">
                      {activeTicketData.messages?.map((msg) => {
                        const isUser = msg.sender_type === 'user';
                        const isSystem = msg.sender_type === 'system';

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
                            className={`message-row ${isUser ? 'user-msg' : 'agent-msg'}`}
                          >
                            {!isUser && (
                              <div className="chat-avatar agent-avatar" title="QuantumXD Support">
                                <span className="icon icon--sm icon--cyan">support_agent</span>
                              </div>
                            )}

                            <div className={`message-bubble ${isUser ? 'user-bubble' : 'agent-bubble'}`}>
                              <div className="bubble-header">
                                <span className="bubble-sender-name">
                                  {isUser ? 'You' : 'Support Team'}
                                </span>
                                {!isUser && (
                                  <span className="verified-agent-tag">
                                    <span className="icon icon--xs">verified</span> Staff
                                  </span>
                                )}
                              </div>

                              {msg.message && (
                                <div className="bubble-content">
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

                              <div className="bubble-footer">
                                <span className="bubble-time">
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isUser && (
                                  <span className="icon icon--xs msg-status-icon">done_all</span>
                                )}
                              </div>
                            </div>

                            {isUser && (
                              <div className="chat-avatar user-avatar" title="You">
                                <span className="icon icon--sm">person</span>
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

              {/* Modal Footer / Reply Composer */}
              {activeTicketData?.ticket && activeTicketData.ticket.status !== 'closed' ? (
                <form onSubmit={handleSendReply} className="modal-reply-footer">
                  {attachedImage && (
                    <div className="modal-attached-bar">
                      <div className="attached-thumb-box">
                        <img src={attachedImage} alt="Attachment" className="attached-thumb" />
                        <span className="attached-label">Image attached</span>
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

                  <div className="modal-composer-input-row">
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
                      title="Attach Screenshot / Image"
                    >
                      <span className="icon icon--sm icon--cyan">
                        {uploadingImage ? 'sync' : 'attach_file'}
                      </span>
                    </button>

                    <textarea
                      className="modal-reply-textarea"
                      rows={2}
                      placeholder="Type your response... (Shift+Enter for new line, Enter to send)"
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

                    <button
                      type="submit"
                      className="modal-send-submit-btn"
                      disabled={sendingReply || uploadingImage || (!replyText.trim() && !attachedImage)}
                      title="Send Reply"
                    >
                      <span className="icon icon--sm">send</span>
                    </button>
                  </div>
                </form>
              ) : activeTicketData?.ticket?.status === 'closed' ? (
                <div className="modal-closed-banner">
                  <span className="icon icon--xs">lock</span> This support ticket is closed.
                </div>
              ) : null}

            </div>
          </div>
        )}

        {/* 3. ACCOUNT REQUIRED POPUP MODAL */}
        {showAuthModal && (
          <div className="ticket-modal-overlay" onClick={() => setShowAuthModal(false)}>
            <div className="auth-required-modal-panel" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="auth-modal-close-btn"
                onClick={() => setShowAuthModal(false)}
                aria-label="Close"
              >
                <span className="icon icon--sm">close</span>
              </button>

              <div className="auth-modal-icon-wrap">
                <span className="icon icon--lg icon--cyan">verified_user</span>
              </div>
              
              <h2 className="auth-modal-title">Sign In to Submit Tickets</h2>
              <p className="auth-modal-desc">
                An active QuantumXD account is required to submit support requests, track resolutions, and claim replacements.
              </p>

              <div className="auth-modal-actions-list">
                <button
                  type="button"
                  className="btn-auth-primary"
                  onClick={() => router.push('/login?redirect=/tickets')}
                >
                  <span className="icon icon--sm">login</span>
                  <span>Sign In to Account</span>
                </button>

                <button
                  type="button"
                  className="btn-auth-secondary"
                  onClick={() => router.push('/register?redirect=/tickets')}
                >
                  <span className="icon icon--sm">person_add</span>
                  <span>Create Account</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. LIGHTBOX MODAL FOR IMAGE FULLSCREEN VIEW */}
        {lightboxImage && (
          <div className="ticket-lightbox-backdrop" onClick={() => setLightboxImage(null)}>
            <div className="ticket-lightbox-panel" onClick={(e) => e.stopPropagation()}>
              <img src={lightboxImage} alt="Fullscreen Attachment" className="lightbox-img" />
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

        {/* Direct Email Support Card */}
        <div className="portal-channels-row single-channel">
          <div className="channel-box">
            <div className="channel-icon-box blue">
              <span className="icon icon--md icon--accent">mail</span>
            </div>
            <div>
              <h4 className="channel-title">Official Email Support</h4>
              <span className="channel-status">{siteConfig.socials.supportEmail}</span>
            </div>
            <a
              href={`mailto:${siteConfig.socials.supportEmail}`}
              className="channel-action-btn secondary"
            >
              Contact Support via Email
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

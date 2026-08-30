'use client';

import { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function SupportChatWidget() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'list' | 'chat'
  const [myTickets, setMyTickets] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [activeTicketData, setActiveTicketData] = useState(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentDeposits, setRecentDeposits] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    telegram: '',
    category: 'order_issue',
    priority: 'medium',
    order_id: '',
    deposit_id: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const messagesEndRef = useRef(null);

  // Load guest token if present in localStorage
  const getGuestTokens = () => {
    try {
      return JSON.parse(localStorage.getItem('quantumxd_guest_tickets') || '[]');
    } catch {
      return [];
    }
  };

  const saveGuestToken = (tktId, token) => {
    try {
      const list = getGuestTokens();
      list.unshift({ id: tktId, token });
      localStorage.setItem('quantumxd_guest_tickets', JSON.stringify(list));
    } catch {}
  };

  // Pre-fill user details
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        telegram: user.telegram_username || '',
      }));
    }
  }, [user]);

  // Fetch recent orders & deposits for smart dropdown
  useEffect(() => {
    if (user && isOpen) {
      api.get('/users/profile').then((res) => {
        if (res.data?.orders) setRecentOrders(res.data.orders);
        if (res.data?.deposits) setRecentDeposits(res.data.deposits);
      }).catch(() => {});
    }
  }, [user, isOpen]);

  // Fetch buyer's tickets
  const fetchMyTickets = async () => {
    try {
      if (user) {
        const res = await api.get('/tickets/my-tickets');
        if (res.data?.success) {
          setMyTickets(res.data.tickets || []);
        }
      } else {
        // Guest mode: fetch tickets by stored tokens
        const stored = getGuestTokens();
        if (stored.length > 0) {
          const promises = stored.slice(0, 10).map((item) =>
            api.get(`/tickets/${item.id}`, { params: { token: item.token } }).catch(() => null)
          );
          const results = await Promise.all(promises);
          const valid = results.filter((r) => r?.data?.success).map((r) => r.data.ticket);
          setMyTickets(valid);
        }
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMyTickets();
    }
  }, [isOpen, user]);

  // Load ticket conversation
  const loadTicketConversation = async (tktId) => {
    if (!tktId) return;
    setActiveTicketId(tktId);
    setActiveTab('chat');
    setLoadingTicket(true);

    try {
      const stored = getGuestTokens().find((item) => item.id === tktId);
      const res = await api.get(`/tickets/${tktId}`, {
        params: { token: stored?.token },
      });
      if (res.data?.success) {
        setActiveTicketData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load conversation');
    } finally {
      setLoadingTicket(false);
    }
  };

  // Scroll to bottom on new message
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTicketData?.messages, activeTab]);

  // Submit New Ticket
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      toast.error('Please enter your message');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/tickets', formData);
      if (res.data?.success) {
        toast.success(`Support Ticket #${res.data.ticket.ticket_number} created!`);
        if (!user && res.data.ticket.guest_access_token) {
          saveGuestToken(res.data.ticket.id, res.data.ticket.guest_access_token);
        }
        // Clear message
        setFormData((prev) => ({
          ...prev,
          subject: '',
          message: '',
          order_id: '',
          deposit_id: '',
        }));
        fetchMyTickets();
        loadTicketConversation(res.data.ticket.id);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  // Reply to active ticket
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicketId) return;

    setSendingReply(true);
    try {
      const stored = getGuestTokens().find((item) => item.id === activeTicketId);
      const res = await api.post(`/tickets/${activeTicketId}/reply`, {
        message: replyText.trim(),
      }, {
        params: { token: stored?.token },
      });

      if (res.data?.success) {
        setReplyText('');
        loadTicketConversation(activeTicketId);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSendingReply(false);
    }
  };

  // Close ticket
  const handleCloseTicket = async () => {
    if (!activeTicketId) return;
    if (!window.confirm('Mark this ticket as resolved and close conversation?')) return;

    try {
      const stored = getGuestTokens().find((item) => item.id === activeTicketId);
      await api.patch(`/tickets/${activeTicketId}/close`, {}, {
        params: { token: stored?.token },
      });
      toast.success('Ticket marked as closed.');
      loadTicketConversation(activeTicketId);
      fetchMyTickets();
    } catch (err) {
      toast.error('Failed to close ticket');
    }
  };

  const totalUnreadCount = myTickets.reduce((sum, t) => sum + (t.unread_user_count || 0), 0);

  return (
    <>
      {/* 1. Floating Launcher Button */}
      <div className="support-floating-container">
        {!isOpen && (
          <button
            type="button"
            className="support-launcher-btn"
            onClick={() => setIsOpen(true)}
            aria-label="Open 24/7 Support Helpdesk"
          >
            <div className="support-launcher-pulse" />
            <span className="icon icon--md support-launcher-icon">support_agent</span>
            <span className="support-launcher-text">Support</span>
            {totalUnreadCount > 0 && (
              <span className="support-unread-badge">{totalUnreadCount}</span>
            )}
          </button>
        )}
      </div>

      {/* 2. Support Modal Drawer */}
      {isOpen && (
        <div className="support-drawer-backdrop" onClick={() => setIsOpen(false)}>
          <div className="support-drawer-panel" onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="support-drawer-header">
              <div className="support-header-left">
                <div className="support-header-icon-box">
                  <span className="icon icon--md icon--cyan">support_agent</span>
                </div>
                <div>
                  <h3 className="support-header-title">QuantumXD Helpdesk</h3>
                  <div className="support-header-status">
                    <span className="support-live-dot" />
                    <span>Live Support • &lt; 2 Mins Reply</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="support-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close Support Window"
              >
                <span className="icon icon--sm">close</span>
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="support-tab-nav">
              <button
                type="button"
                className={`support-tab-btn ${activeTab === 'new' ? 'active' : ''}`}
                onClick={() => setActiveTab('new')}
              >
                <span className="icon icon--xs">add_circle</span>
                <span>Submit Ticket</span>
              </button>

              <button
                type="button"
                className={`support-tab-btn ${activeTab === 'list' || activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('list');
                  fetchMyTickets();
                }}
              >
                <span className="icon icon--xs">chat</span>
                <span>My Tickets ({myTickets.length})</span>
                {totalUnreadCount > 0 && <span className="tab-unread-dot" />}
              </button>
            </div>

            {/* Body Panels */}
            <div className="support-drawer-body">
              
              {/* TAB 1: Submit Ticket Form */}
              {activeTab === 'new' && (
                <form onSubmit={handleSubmitTicket} className="support-form">
                  
                  {/* Category Selector */}
                  <div className="support-field">
                    <label className="support-label">Support Category</label>
                    <select
                      className="support-select"
                      value={formData.category}
                      onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                      required
                    >
                      <option value="order_issue">🛍️ Order Delivery / Key Problem</option>
                      <option value="payment_issue">💳 Payment / Wallet Deposit Issue</option>
                      <option value="key_replacement">🔄 Replacement Warranty Claim</option>
                      <option value="deposit_query">💰 UPI / Crypto Transaction Query</option>
                      <option value="general">💬 General Support / Account Help</option>
                    </select>
                  </div>

                  {/* Smart Order Selector (if user has orders) */}
                  {(formData.category === 'order_issue' || formData.category === 'key_replacement') && (
                    <div className="support-field">
                      <label className="support-label">Select Associated Order</label>
                      {recentOrders.length > 0 ? (
                        <select
                          className="support-select"
                          value={formData.order_id}
                          onChange={(e) => setFormData((prev) => ({ ...prev, order_id: e.target.value }))}
                        >
                          <option value="">-- Choose from your recent purchases --</option>
                          {recentOrders.map((ord) => (
                            <option key={ord.id} value={ord.id}>
                              #{ord.order_number || ord.id.slice(-6)} • {ord.product_name || 'Item'} (₹{ord.total_amount || ord.price})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className="support-input"
                          placeholder="e.g. #QX-4892 or Sale ID"
                          value={formData.order_id}
                          onChange={(e) => setFormData((prev) => ({ ...prev, order_id: e.target.value }))}
                        />
                      )}
                    </div>
                  )}

                  {/* Smart Deposit Selector (if user has deposits) */}
                  {(formData.category === 'payment_issue' || formData.category === 'deposit_query') && (
                    <div className="support-field">
                      <label className="support-label">Select Deposit or Enter UTR / Tx ID</label>
                      {recentDeposits.length > 0 && (
                        <select
                          className="support-select"
                          style={{ marginBottom: 8 }}
                          value={formData.deposit_id}
                          onChange={(e) => setFormData((prev) => ({ ...prev, deposit_id: e.target.value }))}
                        >
                          <option value="">-- Select from your recent deposits --</option>
                          {recentDeposits.map((dep) => (
                            <option key={dep.id} value={dep.id}>
                              ₹{dep.amount} ({dep.gateway}) • {dep.status?.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        type="text"
                        className="support-input"
                        placeholder="e.g. 12-digit UPI UTR or Binance Tx Hash"
                        value={formData.deposit_id}
                        onChange={(e) => setFormData((prev) => ({ ...prev, deposit_id: e.target.value }))}
                      />
                    </div>
                  )}

                  {/* Guest Email / Name if not logged in */}
                  {!user && (
                    <div className="support-row-2">
                      <div className="support-field">
                        <label className="support-label">Your Name</label>
                        <input
                          type="text"
                          className="support-input"
                          placeholder="e.g. Rahul"
                          value={formData.name}
                          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="support-field">
                        <label className="support-label">Email Address</label>
                        <input
                          type="email"
                          className="support-input"
                          placeholder="e.g. rahul@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Subject */}
                  <div className="support-field">
                    <label className="support-label">Subject / Issue Summary</label>
                    <input
                      type="text"
                      className="support-input"
                      placeholder="e.g. Canva Pro login invalid / UTR not credited"
                      value={formData.subject}
                      onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Message */}
                  <div className="support-field">
                    <label className="support-label">Detailed Explanation</label>
                    <textarea
                      className="support-textarea"
                      rows={4}
                      placeholder="Describe what happened with as much detail as possible..."
                      value={formData.message}
                      onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Priority */}
                  <div className="support-field">
                    <label className="support-label">Urgency Level</label>
                    <div className="support-priority-chips">
                      {['medium', 'high', 'urgent'].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          className={`priority-chip ${formData.priority === lvl ? 'active ' + lvl : ''}`}
                          onClick={() => setFormData((prev) => ({ ...prev, priority: lvl }))}
                        >
                          {lvl.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="support-submit-btn"
                    disabled={submitting}
                  >
                    <span className="icon icon--sm">send</span>
                    <span>{submitting ? 'Submitting Ticket...' : 'Dispatch Ticket to Support'}</span>
                  </button>

                </form>
              )}

              {/* TAB 2: Ticket List */}
              {activeTab === 'list' && (
                <div className="support-tickets-list">
                  {myTickets.length === 0 ? (
                    <div className="support-empty-view">
                      <span className="icon icon--xl icon--muted">receipt_long</span>
                      <h4>No Support Tickets Yet</h4>
                      <p>Need assistance with an order, payment, or key? Submit a new ticket to get fast help.</p>
                      <button
                        type="button"
                        className="support-create-trigger"
                        onClick={() => setActiveTab('new')}
                      >
                        <span className="icon icon--sm">add</span> Create Support Ticket
                      </button>
                    </div>
                  ) : (
                    myTickets.map((tkt) => (
                      <div
                        key={tkt.id}
                        className="customer-ticket-card"
                        onClick={() => loadTicketConversation(tkt.id)}
                      >
                        <div className="tkt-card-top">
                          <span className="tkt-number">{tkt.ticket_number}</span>
                          <span className={`status-pill status-${tkt.status}`}>
                            {tkt.status.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="tkt-subject">{tkt.subject}</h4>
                        <div className="tkt-card-bottom">
                          <span className="tkt-category-tag">
                            {tkt.category === 'payment_issue' || tkt.category === 'deposit_query' ? '💳 ' : '🛍️ '}
                            {tkt.category.replace('_', ' ')}
                          </span>
                          <span className="tkt-date">
                            {new Date(tkt.updated_at || tkt.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {tkt.unread_user_count > 0 && (
                          <div className="tkt-new-reply-alert">
                            <span className="unread-dot" /> New Response from Agent
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: Active Conversation Thread */}
              {activeTab === 'chat' && (
                <div className="support-chat-container">
                  
                  {/* Top Bar with Back Button & Ticket Number */}
                  <div className="support-chat-topbar">
                    <button
                      type="button"
                      className="chat-back-btn"
                      onClick={() => setActiveTab('list')}
                    >
                      <span className="icon icon--xs">arrow_back</span>
                      <span>All Tickets</span>
                    </button>

                    {activeTicketData && (
                      <div className="chat-tkt-meta">
                        <span className="chat-tkt-id">{activeTicketData.ticket.ticket_number}</span>
                        <span className={`status-pill status-${activeTicketData.ticket.status}`}>
                          {activeTicketData.ticket.status.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {loadingTicket || !activeTicketData ? (
                    <div className="support-empty-view">
                      <span className="icon icon--lg spin">sync</span>
                      <p>Loading conversation...</p>
                    </div>
                  ) : (
                    <>
                      {/* EMBEDDED RECEIPT: Order Details */}
                      {activeTicketData.order_details && (
                        <div className="chat-receipt-box">
                          <div className="receipt-box-top">
                            <div className="receipt-box-title">
                              <span className="icon icon--xs icon--accent">shopping_bag</span>
                              <strong>Order #{activeTicketData.order_details.order_number}</strong>
                            </div>
                            <span className="receipt-pill">{activeTicketData.order_details.payment_status?.toUpperCase()}</span>
                          </div>
                          <div className="receipt-box-info">
                            <div><strong>Item:</strong> {activeTicketData.order_details.product_name}</div>
                            <div><strong>Total:</strong> ₹{activeTicketData.order_details.total_amount}</div>
                          </div>
                          {activeTicketData.order_details.delivered_items && (
                            <div className="receipt-box-keys">
                              <span className="keys-label">Delivered Credentials:</span>
                              <div className="keys-val">
                                <code>{activeTicketData.order_details.delivered_items}</code>
                                <button
                                  type="button"
                                  className="key-copy-btn"
                                  onClick={() => {
                                    navigator.clipboard.writeText(activeTicketData.order_details.delivered_items);
                                    toast.success('Credentials copied!');
                                  }}
                                >
                                  Copy
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* EMBEDDED RECEIPT: Payment Details */}
                      {activeTicketData.deposit_details && (
                        <div className="chat-receipt-box deposit-box">
                          <div className="receipt-box-top">
                            <div className="receipt-box-title">
                              <span className="icon icon--xs icon--cyan">account_balance_wallet</span>
                              <strong>Deposit #{activeTicketData.deposit_details.id}</strong>
                            </div>
                            <span className="receipt-pill">{activeTicketData.deposit_details.status?.toUpperCase()}</span>
                          </div>
                          <div className="receipt-box-info">
                            <div><strong>Amount:</strong> ₹{activeTicketData.deposit_details.amount}</div>
                            <div><strong>Gateway:</strong> {activeTicketData.deposit_details.gateway}</div>
                            <div><strong>UTR / Tx:</strong> <code>{activeTicketData.deposit_details.utr || 'Pending'}</code></div>
                          </div>
                        </div>
                      )}

                      {/* Message Bubbles */}
                      <div className="chat-messages-scroll">
                        {activeTicketData.messages?.map((msg) => {
                          const isUser = msg.sender_type === 'user';
                          const isSystem = msg.sender_type === 'system';

                          if (isSystem) {
                            return (
                              <div key={msg.id} className="chat-system-msg">
                                <span>{msg.message}</span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={msg.id}
                              className={`chat-bubble-wrap ${isUser ? 'user-msg' : 'agent-msg'}`}
                            >
                              <div className={`chat-bubble ${isUser ? 'user-bubble' : 'agent-bubble'}`}>
                                <div className="chat-bubble-meta">
                                  <span className="sender-name">
                                    {isUser ? 'You' : 'QuantumXD Support Staff'}
                                  </span>
                                  {!isUser && <span className="verified-dot">✓</span>}
                                  <span className="msg-time">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div className="chat-bubble-text">
                                  {msg.message}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Bottom Reply Composer */}
                      {activeTicketData.ticket.status !== 'closed' ? (
                        <form onSubmit={handleSendReply} className="chat-reply-bar">
                          <input
                            type="text"
                            className="chat-reply-input"
                            placeholder="Type your message to support..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            required
                          />
                          <button
                            type="submit"
                            className="chat-reply-send"
                            disabled={sendingReply}
                          >
                            <span className="icon icon--sm">send</span>
                          </button>
                        </form>
                      ) : (
                        <div className="chat-closed-notice">
                          <span className="icon icon--xs">lock</span> This support ticket has been closed.
                        </div>
                      )}

                      {/* Close Ticket Button */}
                      {activeTicketData.ticket.status !== 'closed' && (
                        <div className="chat-actions-strip">
                          <button
                            type="button"
                            className="btn-mark-closed"
                            onClick={handleCloseTicket}
                          >
                            <span className="icon icon--xs">check</span> Mark Issue as Resolved & Close Ticket
                          </button>
                        </div>
                      )}
                    </>
                  )}

                </div>
              )}

            </div>

          </div>
        </div>
      )}

      <style jsx>{`
        /* Floating Button */
        .support-floating-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 999;
        }

        .support-launcher-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 48px;
          padding: 0 20px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #1B4EF5 0%, #3874FF 100%);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.18);
          font-family: var(--font-heading, "Outfit", sans-serif);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 24px -4px rgba(27, 78, 245, 0.5);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .support-launcher-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px -4px rgba(27, 78, 245, 0.65);
        }

        .support-launcher-pulse {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #10B981;
          border: 2px solid #0E121A;
          animation: pulseGreen 2s infinite;
        }

        @keyframes pulseGreen {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
        }

        .support-unread-badge {
          background: #EF4444;
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 9999px;
        }

        /* Modal Drawer */
        .support-drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          padding: 20px;
        }

        .support-drawer-panel {
          width: 440px;
          max-width: 100%;
          height: 620px;
          max-height: 90vh;
          background: var(--color-surface, #0E121A);
          border: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
          border-radius: 20px;
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        :global([data-theme='light']) .support-drawer-panel {
          background: #FFFFFF;
          border-color: #E2E8F0;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Header */
        .support-drawer-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .support-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .support-header-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(56, 116, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .support-header-title {
          font-family: var(--font-heading);
          font-size: 15px;
          font-weight: 800;
          color: var(--color-text);
          margin: 0;
        }

        .support-header-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: var(--color-text-muted);
        }

        .support-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
        }

        .support-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .support-close-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--color-text);
        }

        /* Navigation Tabs */
        .support-tab-nav {
          display: flex;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-surface-2, #141822);
        }

        :global([data-theme='light']) .support-tab-nav {
          background: #F8FAFC;
        }

        .support-tab-btn {
          flex: 1;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          font-family: var(--font-heading);
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text-muted);
          cursor: pointer;
          position: relative;
        }

        .support-tab-btn.active {
          color: #3874FF;
          border-bottom-color: #3874FF;
          background: rgba(56, 116, 255, 0.05);
        }

        .tab-unread-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #EF4444;
          margin-left: 2px;
        }

        /* Drawer Body */
        .support-drawer-body {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        /* Form */
        .support-form {
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .support-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .support-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .support-label {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--color-text);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .support-select,
        .support-input {
          height: 38px;
          padding: 0 12px;
          border-radius: 8px;
          background: var(--color-surface-2, #141822);
          border: 1px solid var(--color-border);
          color: var(--color-text);
          font-size: 13px;
          outline: none;
        }

        :global([data-theme='light']) .support-select,
        :global([data-theme='light']) .support-input {
          background: #F8FAFC;
          border-color: #CBD5E1;
          color: #0F172A;
        }

        .support-textarea {
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--color-surface-2, #141822);
          border: 1px solid var(--color-border);
          color: var(--color-text);
          font-size: 13px;
          font-family: var(--font-body);
          outline: none;
          resize: vertical;
        }

        :global([data-theme='light']) .support-textarea {
          background: #F8FAFC;
          border-color: #CBD5E1;
          color: #0F172A;
        }

        .support-priority-chips {
          display: flex;
          gap: 8px;
        }

        .priority-chip {
          flex: 1;
          height: 30px;
          border-radius: 6px;
          background: var(--color-surface-2, #141822);
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .priority-chip.active.medium {
          border-color: #3874FF;
          color: #3874FF;
          background: rgba(56, 116, 255, 0.1);
        }

        .priority-chip.active.high {
          border-color: #F59E0B;
          color: #F59E0B;
          background: rgba(245, 158, 11, 0.1);
        }

        .priority-chip.active.urgent {
          border-color: #EF4444;
          color: #EF4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .support-submit-btn {
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 8px;
          background: linear-gradient(135deg, #1B4EF5 0%, #3874FF 100%);
          color: #FFFFFF;
          border: none;
          font-family: var(--font-heading);
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 4px;
        }

        /* Tickets List */
        .support-tickets-list {
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .customer-ticket-card {
          background: var(--color-surface-2, #141822);
          border: 1px solid var(--color-border);
          border-radius: 10px;
          padding: 12px 14px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: border-color 0.15s ease;
        }

        :global([data-theme='light']) .customer-ticket-card {
          background: #F8FAFC;
          border-color: #E2E8F0;
        }

        .customer-ticket-card:hover {
          border-color: #3874FF;
        }

        .tkt-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .tkt-number {
          font-family: var(--font-heading);
          font-size: 12px;
          font-weight: 800;
          color: #3874FF;
        }

        .status-pill {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 9999px;
          text-transform: capitalize;
        }

        .status-open { background: rgba(56, 116, 255, 0.15); color: #3874FF; }
        .status-in_progress { background: rgba(245, 158, 11, 0.15); color: #F59E0B; }
        .status-resolved { background: rgba(16, 185, 129, 0.15); color: #10B981; }
        .status-closed { background: rgba(100, 116, 139, 0.15); color: #94A3B8; }

        .tkt-subject {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text);
          margin: 0;
        }

        .tkt-card-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: var(--color-text-muted);
        }

        .tkt-new-reply-alert {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: #3874FF;
          margin-top: 4px;
        }

        .unread-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #3874FF;
        }

        .support-empty-view {
          margin: auto;
          text-align: center;
          padding: 40px 20px;
        }

        .support-empty-view h4 {
          font-family: var(--font-heading);
          font-size: 16px;
          font-weight: 700;
          margin: 12px 0 6px 0;
          color: var(--color-text);
        }

        .support-empty-view p {
          font-size: 12.5px;
          color: var(--color-text-muted);
          margin-bottom: 16px;
          line-height: 1.4;
        }

        .support-create-trigger {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 36px;
          padding: 0 16px;
          border-radius: 8px;
          background: #1B4EF5;
          color: #FFFFFF;
          border: none;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
        }

        /* Chat Thread Container */
        .support-chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .support-chat-topbar {
          padding: 10px 16px;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--color-surface-2, #141822);
        }

        :global([data-theme='light']) .support-chat-topbar {
          background: #F8FAFC;
        }

        .chat-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .chat-back-btn:hover {
          color: #3874FF;
        }

        .chat-tkt-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chat-tkt-id {
          font-family: var(--font-heading);
          font-size: 12px;
          font-weight: 800;
          color: #3874FF;
        }

        /* Embedded Receipt inside Chat */
        .chat-receipt-box {
          margin: 12px 16px 0 16px;
          background: rgba(56, 116, 255, 0.06);
          border: 1px solid rgba(56, 116, 255, 0.2);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12px;
        }

        .chat-receipt-box.deposit-box {
          background: rgba(16, 185, 129, 0.06);
          border-color: rgba(16, 185, 129, 0.2);
        }

        .receipt-box-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .receipt-box-title {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12.5px;
          color: var(--color-text);
        }

        .receipt-pill {
          font-size: 9.5px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 9999px;
          background: rgba(56, 116, 255, 0.15);
          color: #3874FF;
        }

        .receipt-box-info {
          display: flex;
          justify-content: space-between;
          color: var(--color-text-muted);
          font-size: 11.5px;
        }

        .receipt-box-keys {
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px dashed rgba(255, 255, 255, 0.1);
        }

        .keys-label {
          font-size: 10.5px;
          color: var(--color-text-muted);
          display: block;
          margin-bottom: 2px;
        }

        .keys-val {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--color-surface, #0E121A);
          border: 1px solid var(--color-border);
          border-radius: 4px;
          padding: 3px 8px;
        }

        .keys-val code {
          font-size: 11px;
          color: #3874FF;
          word-break: break-all;
        }

        .key-copy-btn {
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        /* Message Bubbles */
        .chat-messages-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .chat-system-msg {
          text-align: center;
          font-size: 11px;
          color: var(--color-text-muted);
          background: rgba(255, 255, 255, 0.04);
          padding: 2px 10px;
          border-radius: 9999px;
          align-self: center;
        }

        .chat-bubble-wrap {
          display: flex;
          width: 100%;
        }

        .user-msg { justify-content: flex-end; }
        .agent-msg { justify-content: flex-start; }

        .chat-bubble {
          max-width: 80%;
          padding: 10px 14px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .user-bubble {
          background: #1B4EF5;
          color: #FFFFFF;
          border-bottom-right-radius: 2px;
        }

        .agent-bubble {
          background: var(--color-surface-2, #141822);
          border: 1px solid var(--color-border);
          border-bottom-left-radius: 2px;
        }

        :global([data-theme='light']) .agent-bubble {
          background: #F1F5F9;
          border-color: #CBD5E1;
        }

        .chat-bubble-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10.5px;
          opacity: 0.8;
        }

        .sender-name {
          font-weight: 700;
        }

        .verified-dot {
          color: #10B981;
          font-weight: 900;
        }

        .msg-time {
          margin-left: auto;
        }

        .chat-bubble-text {
          font-size: 13px;
          line-height: 1.45;
          white-space: pre-wrap;
          word-break: break-word;
        }

        /* Reply Bar */
        .chat-reply-bar {
          padding: 10px 16px;
          border-top: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--color-surface, #0E121A);
        }

        .chat-reply-input {
          flex: 1;
          height: 38px;
          border-radius: 8px;
          background: var(--color-surface-2, #141822);
          border: 1px solid var(--color-border);
          color: var(--color-text);
          padding: 0 12px;
          font-size: 13px;
          outline: none;
        }

        :global([data-theme='light']) .chat-reply-input {
          background: #F8FAFC;
          border-color: #CBD5E1;
        }

        .chat-reply-send {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: #1B4EF5;
          color: #FFFFFF;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .chat-closed-notice {
          padding: 10px;
          text-align: center;
          font-size: 11.5px;
          color: var(--color-text-muted);
          background: var(--color-surface-2);
          border-top: 1px solid var(--color-border);
        }

        .chat-actions-strip {
          padding: 6px 16px 12px;
          display: flex;
          justify-content: center;
          background: var(--color-surface);
        }

        .btn-mark-closed {
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .btn-mark-closed:hover {
          color: #10B981;
        }

        @media (max-width: 480px) {
          .support-floating-container {
            bottom: 16px;
            right: 16px;
          }
          .support-drawer-backdrop {
            padding: 0;
          }
          .support-drawer-panel {
            width: 100vw;
            height: 85vh;
            border-radius: 20px 20px 0 0;
          }
        }
      `}</style>
    </>
  );
}

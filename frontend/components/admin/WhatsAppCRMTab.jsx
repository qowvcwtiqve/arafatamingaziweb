'use client';

import { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Search, Send, User, Clock, CheckCircle2 } from 'lucide-react';

export default function WhatsAppCRMTab() {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchContacts();
    const interval = setInterval(fetchContacts, 10000); // Auto refresh contacts
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.phoneNumber);
      const interval = setInterval(() => fetchMessages(selectedContact.phoneNumber), 5000); // Auto refresh messages
      return () => clearInterval(interval);
    }
  }, [selectedContact]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchContacts = async () => {
    try {
      const { data } = await api.get('/whatsapp/contacts');
      setContacts(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch contacts', err);
      setLoading(false);
    }
  };

  const fetchMessages = async (phoneNumber) => {
    try {
      const { data } = await api.get(`/whatsapp/messages/${phoneNumber}`);
      setMessages(data);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !selectedContact) return;

    const msgToSend = inputMsg;
    setInputMsg('');

    // Optimistic UI update
    setMessages(prev => [...prev, {
      _id: Date.now().toString(),
      direction: 'outgoing',
      text: msgToSend,
      status: 'sending',
      createdAt: new Date().toISOString()
    }]);

    try {
      await api.post('/whatsapp/send', {
        to: selectedContact.phoneNumber,
        message: msgToSend
      });
      fetchMessages(selectedContact.phoneNumber);
    } catch (err) {
      toast.error('Failed to send message');
      fetchMessages(selectedContact.phoneNumber); // revert optimistic
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading WhatsApp CRM...</div>;

  return (
    <div className="admin-card-section" style={{ display: 'flex', height: 'calc(100vh - 120px)', padding: 0, overflow: 'hidden' }}>
      
      {/* Sidebar - Contacts */}
      <div style={{ width: '320px', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-secondary)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)' }}>Inbox</h2>
          <div className="admin-search-box" style={{ marginTop: 15 }}>
            <Search size={16} color="var(--color-text-muted)" style={{ marginRight: 8 }} />
            <input type="text" className="admin-search-input" placeholder="Search contacts..." />
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {contacts.map(contact => (
            <div 
              key={contact._id} 
              onClick={() => setSelectedContact(contact)}
              style={{
                padding: '15px 20px',
                borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer',
                background: selectedContact?._id === contact._id ? 'var(--color-bg-tertiary)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'background 0.2s'
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <User size={20} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {new Date(contact.lastMessageAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{contact.phoneNumber}</div>
              </div>
            </div>
          ))}
          {contacts.length === 0 && (
             <div style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-muted)' }}>No contacts found</div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)' }}>
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 15, background: 'var(--color-bg-secondary)' }}>
              <div style={{ width: 45, height: 45, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <User size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>{selectedContact.name}</h3>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{selectedContact.phoneNumber}</span>
              </div>
            </div>

            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 15 }}>
              {messages.map(msg => (
                <div 
                  key={msg._id} 
                  style={{
                    alignSelf: msg.direction === 'outgoing' ? 'flex-end' : 'flex-start',
                    maxWidth: '70%',
                  }}
                >
                  <div style={{
                    background: msg.direction === 'outgoing' ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                    color: msg.direction === 'outgoing' ? '#fff' : 'var(--color-text)',
                    padding: '10px 15px',
                    borderRadius: '12px',
                    borderBottomRightRadius: msg.direction === 'outgoing' ? '4px' : '12px',
                    borderBottomLeftRadius: msg.direction === 'incoming' ? '4px' : '12px',
                    fontSize: 14,
                    lineHeight: 1.5
                  }}>
                    {msg.text}
                  </div>
                  <div style={{ 
                    fontSize: 11, 
                    color: 'var(--color-text-muted)', 
                    marginTop: 4, 
                    textAlign: msg.direction === 'outgoing' ? 'right' : 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: msg.direction === 'outgoing' ? 'flex-end' : 'flex-start',
                    gap: 4
                  }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.direction === 'outgoing' && (
                       <CheckCircle2 size={12} color={msg.status === 'read' ? '#3b82f6' : 'var(--color-text-muted)'} />
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div style={{ padding: '20px', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
              <form onSubmit={sendMessage} style={{ display: 'flex', gap: 10 }}>
                <input 
                  type="text" 
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder="Type a message..." 
                  style={{ 
                    flex: 1, 
                    padding: '12px 20px', 
                    borderRadius: '24px', 
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-primary)',
                    color: 'var(--color-text)',
                    outline: 'none'
                  }} 
                />
                <button 
                  type="submit" 
                  disabled={!inputMsg.trim()}
                  style={{ 
                    width: 45, 
                    height: 45, 
                    borderRadius: '50%', 
                    background: inputMsg.trim() ? 'var(--color-primary)' : 'var(--color-bg-tertiary)', 
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: inputMsg.trim() ? 'pointer' : 'not-allowed',
                    transition: 'background 0.2s'
                  }}
                >
                  <Send size={18} style={{ marginLeft: 3 }} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--color-text-muted)' }}>
            <MessageSquare size={64} style={{ marginBottom: 20, opacity: 0.2 }} />
            <h2>Select a conversation</h2>
            <p>Choose a contact from the left to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}

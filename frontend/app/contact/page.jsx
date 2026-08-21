'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      toast.success('Message sent! Our support team will get back to you shortly.');
      setForm({ name: '', email: '', subject: '', message: '' });
      setSending(false);
    }, 1000);
  };

  return (
    <div style={{ padding: '100px 0 60px' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="hero__tag" style={{ margin: '0 auto 16px' }}>
            <span className="icon icon--sm icon--filled">support_agent</span>
            24/7 Fast Support
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 700, marginBottom: 12 }}>
            Get in <span className="text-gradient">Touch</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: 600, margin: '0 auto' }}>
            Have questions about digital delivery, payment methods, or custom orders? Reach out via Telegram or send us a message below.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 32, maxWidth: 1000, margin: '0 auto' }}>
          {/* Direct channels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card card--elevated" style={{ padding: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(0, 160, 227, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00A0E3', marginBottom: 14 }}>
                <span className="icon icon--lg">send</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Telegram Support</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Instant replies & active live community channel.</p>
              <a href="https://t.me/your_support_username" target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--sm btn--full">
                Open Telegram
              </a>
            </div>

            <div className="card card--elevated" style={{ padding: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(110, 58, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', marginBottom: 14 }}>
                <span className="icon icon--lg">email</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Email Support</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>digitalshoppei@gmail.com</p>
              <a href="mailto:digitalshoppei@gmail.com" className="btn btn--outline btn--sm btn--full">
                Send Direct Email
              </a>
            </div>
          </div>

          {/* Contact form */}
          <div className="card card--elevated" style={{ padding: 32 }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Send a Message</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input className="form-input" placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" placeholder="john@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Subject</label>
                <input className="form-input" placeholder="Order inquiry / Issue with download" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
              </div>

              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-input" rows={5} placeholder="Describe your issue or question in detail..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required style={{ resize: 'vertical' }} />
              </div>

              <button type="submit" className="btn btn--primary" style={{ alignSelf: 'flex-start' }} disabled={sending}>
                <span className="icon icon--sm">send</span>
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

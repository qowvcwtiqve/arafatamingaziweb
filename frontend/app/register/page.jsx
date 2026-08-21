'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created! Welcome to QuantumXD Store');
      router.push('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(110,58,255,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            QuantumXD Store
          </Link>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 6, fontSize: 15 }}>Create your free account</p>
        </div>

        <div className="card card--elevated" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <span className="icon icon--sm" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }}>person</span>
                <input type="text" className="form-input" style={{ paddingLeft: 40 }} placeholder="Your full name"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <span className="icon icon--sm" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }}>email</span>
                <input type="email" className="form-input" style={{ paddingLeft: 40 }} placeholder="your@email.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <span className="icon icon--sm" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }}>lock</span>
                <input type="password" className="form-input" style={{ paddingLeft: 40 }} placeholder="Min 6 characters"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <span className="icon icon--sm" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }}>lock_reset</span>
                <input type="password" className="form-input" style={{ paddingLeft: 40 }} placeholder="Repeat password"
                  value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
              </div>
            </div>

            <button type="submit" className="btn btn--primary btn--full" style={{ marginTop: 4 }} disabled={loading}>
              {loading ? 'Creating account...' : (
                <><span className="icon icon--sm">person_add</span> Create Account</>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

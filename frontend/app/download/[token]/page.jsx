'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '../../../lib/api';
import Link from 'next/link';

export default function DownloadPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    // Call download endpoint
    const url = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/download/${token}`;
    
    // We can directly trigger window.location.href or fetch if json response (e.g. license keys)
    fetch(url)
      .then(async (res) => {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const json = await res.json();
          if (!res.ok) {
            setError(json.error || 'Failed to download');
          } else {
            setData(json);
          }
        } else if (res.redirected) {
          window.location.href = res.url;
        } else if (res.ok) {
          window.location.href = url;
        } else {
          setError('Failed to fetch download. Link may be expired.');
        }
      })
      .catch((err) => {
        setError('Network error accessing download server.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card card--elevated" style={{ maxWidth: 520, width: '100%', padding: 36, textAlign: 'center' }}>
        {loading ? (
          <div>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gradient-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--color-primary)' }}>
              <span className="icon icon--lg" style={{ animation: 'spin 1.5s linear infinite' }}>sync</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              Preparing Your Download...
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
              Verifying token and fetching your secure digital product.
            </p>
          </div>
        ) : error ? (
          <div>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--color-error)' }}>
              <span className="icon icon--lg">error</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--color-error)' }}>
              Download Error
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 }}>
              {error}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link href="/dashboard" className="btn btn--primary btn--sm">
                Go to My Downloads
              </Link>
              <Link href="/contact" className="btn btn--ghost btn--sm">
                Contact Support
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--color-success)' }}>
              <span className="icon icon--lg">verified</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              {data?.product || 'Product Delivered!'}
            </h2>
            {data?.content && (
              <div style={{ marginTop: 20, marginBottom: 24, textAlign: 'left' }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>Your License Key / Account Credentials:</p>
                <div style={{ padding: 16, background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontSize: 14, wordBreak: 'break-all', color: 'var(--color-accent)' }}>
                  {data.content}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link href="/dashboard" className="btn btn--primary btn--sm">
                View My Orders
              </Link>
              <Link href="/products" className="btn btn--ghost btn--sm">
                Explore More Products
              </Link>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  );
}

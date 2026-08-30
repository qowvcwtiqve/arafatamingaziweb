import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | QuantumXD',
  description: 'How QuantumXD protects your personal data, transaction references, and ensures zero storage of banking information.',
};

export default function PrivacyPage() {
  return (
    <div style={{ padding: '100px 0 80px', minHeight: '80vh' }}>
      <div className="container" style={{ maxWidth: 880 }}>
        
        {/* Header Badge & Title */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: '9999px',
            background: 'rgba(27, 78, 245, 0.08)',
            border: '1px solid rgba(27, 78, 245, 0.2)',
            color: '#1B4EF5',
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 12
          }}>
            <span className="icon icon--sm icon--filled">lock</span>
            Data Privacy &amp; Security Standards
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800, margin: '0 0 10px 0' }}>
            Privacy <span className="text-gradient">Policy</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 15, margin: 0 }}>
            Effective date: August 2026. Your privacy and financial security are our top priorities.
          </p>
        </div>

        {/* Policy Sections Card */}
        <div className="card card--elevated" style={{ padding: '36px 32px', color: 'var(--color-text)', lineHeight: 1.8, fontSize: 14.5, display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          {/* Section 1 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm icon--cyan">badge</span>
              1. Information We Collect
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 10 }}>
              To deliver your digital purchases and protect against fraud, QuantumXD collects only strictly necessary information:
            </p>
            <ul style={{ paddingLeft: 22, margin: 0, color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong>Account Credentials:</strong> Email address, display name, and securely hashed passwords (using industry-standard bcrypt encryption).</li>
              <li><strong>Order Data:</strong> Purchased product identifiers, timestamps, generated digital license keys, and download activity tokens.</li>
              <li><strong>Technical Metadata:</strong> IP address, device user-agent, and session cookies solely for anti-fraud detection and session persistence.</li>
            </ul>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Section 2 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm icon--accent">shield</span>
              2. Zero Storage of Financial &amp; Banking Data
            </h2>
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
              We do <strong>NOT</strong> process, store, or have access to your bank account numbers, debit/credit card CVVs, UPI PINs, or private cryptocurrency wallet keys. All monetary transactions are processed directly by certified third-party payment infrastructure (UPI, Cashfree, NowPayments, and Binance Pay) through end-to-end encrypted TLS tunnels.
            </p>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Section 3 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm icon--cyan">security</span>
              3. How We Use Your Data
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 10 }}>
              Your data is used exclusively to:
            </p>
            <ul style={{ paddingLeft: 22, margin: 0, color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Authenticate your account and grant access to your purchased licenses in the dashboard.</li>
              <li>Email order receipts, activation instructions, and digital download links.</li>
              <li>Prevent duplicate account abuse, unauthorized chargebacks, and automated bot attacks.</li>
            </ul>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Section 4 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm icon--cyan">no_accounts</span>
              4. No Third-Party Data Selling
            </h2>
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
              QuantumXD does <strong>never</strong> sell, rent, monetize, or trade your personal email, identity, or purchasing habits to advertising brokers or marketing agencies.
            </p>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Section 5 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm icon--cyan">manage_accounts</span>
              5. User Rights &amp; Data Deletion
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 14 }}>
              You have the right to request a complete export or permanent deletion of your account and associated personal data at any time by contacting our privacy compliance desk:
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/contact" className="btn btn--primary btn--sm" style={{ gap: 6 }}>
                <span className="icon icon--sm">support</span>
                <span>Contact Privacy Desk</span>
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

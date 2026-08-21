export default function PrivacyPage() {
  return (
    <div style={{ padding: '100px 0 60px' }}>
      <div className="container" style={{ maxWidth: 840 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 700, marginBottom: 24 }}>
          Privacy <span className="text-gradient">Policy</span>
        </h1>
        <div className="card card--elevated" style={{ padding: 36, color: 'var(--color-text-muted)', lineHeight: 1.8, fontSize: 14 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 10 }}>1. Information We Collect</h3>
          <p style={{ marginBottom: 20 }}>We only collect essential information required to deliver your digital purchases: your email address, username, and transaction references.</p>

          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 10 }}>2. Payment Information</h3>
          <p style={{ marginBottom: 20 }}>We do not store your private bank details, credit card numbers, or crypto private keys. All transactions are securely processed through third-party gateways (UPI / Razorpay / NowPayments / Binance).</p>

          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 10 }}>3. Data Security</h3>
          <p>We use industry-standard encryption, HTTP-only cookies, and hashed authentication to ensure your account and purchase histories remain private and secure.</p>
        </div>
      </div>
    </div>
  );
}

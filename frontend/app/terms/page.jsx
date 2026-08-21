export default function TermsPage() {
  return (
    <div style={{ padding: '100px 0 60px' }}>
      <div className="container" style={{ maxWidth: 840 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 700, marginBottom: 24 }}>
          Terms of <span className="text-gradient">Service</span>
        </h1>
        <div className="card card--elevated" style={{ padding: 36, color: 'var(--color-text-muted)', lineHeight: 1.8, fontSize: 14 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 10 }}>1. Acceptance of Terms</h3>
          <p style={{ marginBottom: 20 }}>By accessing and purchasing from QuantumXD Store, you agree to be bound by these terms. If you do not agree with any part of these terms, please do not use our services.</p>

          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 10 }}>2. Digital Goods Delivery</h3>
          <p style={{ marginBottom: 20 }}>All products listed on QuantumXD Store are intangible digital goods (software licenses, digital keys, accounts, or file downloads). Delivery occurs electronically and automatically upon verified payment confirmation.</p>

          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 10 }}>3. License and Usage</h3>
          <p style={{ marginBottom: 20 }}>Purchased products are licensed for your individual use only. Reselling, distributing, or sharing private license keys or credentials without explicit authorization is strictly prohibited.</p>

          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 10 }}>4. Limitation of Liability</h3>
          <p>QuantumXD Store shall not be held liable for any indirect or consequential damages arising from the use or inability to use our digital items beyond the original purchase price of the item.</p>
        </div>
      </div>
    </div>
  );
}

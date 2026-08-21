export default function RefundPage() {
  return (
    <div style={{ padding: '100px 0 60px' }}>
      <div className="container" style={{ maxWidth: 840 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 700, marginBottom: 24 }}>
          Refund <span className="text-gradient">Policy</span>
        </h1>
        <div className="card card--elevated" style={{ padding: 36, color: 'var(--color-text-muted)', lineHeight: 1.8, fontSize: 14 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 10 }}>1. Digital Product Nature</h3>
          <p style={{ marginBottom: 20 }}>Due to the instant delivery and irrevocable nature of digital keys, downloads, and accounts, purchases are generally non-refundable once the key or file has been accessed.</p>

          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 10 }}>2. Defective or Inoperable Products</h3>
          <p style={{ marginBottom: 20 }}>If a delivered license key or digital item is defective or invalid upon delivery, contact our Telegram support within 48 hours with proof/screenshots. We will immediately replace the item or credit your store wallet balance.</p>

          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)', marginBottom: 10 }}>3. Duplicate Payments</h3>
          <p>In the event of accidental duplicate payments for the same order, the extra amount will be credited back to your store balance or refunded to the original payment source upon verification.</p>
        </div>
      </div>
    </div>
  );
}

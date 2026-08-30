import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | QuantumXD',
  description: 'Terms and conditions governing the purchase, delivery, licensing, and usage of digital assets on QuantumXD.',
};

export default function TermsPage() {
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
            <span className="icon icon--sm icon--filled">gavel</span>
            Official User Agreement
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800, margin: '0 0 10px 0' }}>
            Terms of <span className="text-gradient">Service</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 15, margin: 0 }}>
            Effective date: August 2026. By accessing, browsing, or purchasing on QuantumXD, you agree to these Terms.
          </p>
        </div>

        {/* Policy Sections Card */}
        <div className="card card--elevated" style={{ padding: '36px 32px', color: 'var(--color-text)', lineHeight: 1.8, fontSize: 14.5, display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          {/* Section 1 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm icon--cyan">article</span>
              1. Acceptance of Agreement
            </h2>
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
              These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "Buyer") and QuantumXD ("Store", "we", "us"). By creating an account, depositing funds, clicking "Agree", or completing any digital order, you accept and agree to be bound by these Terms and our <Link href="/refund" style={{ color: '#1B4EF5', textDecoration: 'underline', fontWeight: 600 }}>Refund Policy</Link> and <Link href="/privacy" style={{ color: '#1B4EF5', textDecoration: 'underline', fontWeight: 600 }}>Privacy Policy</Link>.
            </p>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Section 2 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm icon--accent">bolt</span>
              2. Digital Products, Order Placement &amp; Cancellations
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 10 }}>
              All items offered on QuantumXD are intangible electronic items (such as game activations, software keys, subscription credentials, and downloadable assets).
            </p>
            <ul style={{ paddingLeft: 22, margin: 0, color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong>Automated Fulfillment:</strong> Valid orders are dispatched instantly upon verified payment confirmation.</li>
              <li><strong>Order Cancellation:</strong> Once an order is placed, it cannot be self-cancelled by the buyer from the dashboard. For any cancellation request, the buyer must contact our support team.</li>
              <li><strong>Non-Working Guarantee:</strong> If a delivered digital product, key, or account does not work and cannot be replaced, the order will be cancelled and <strong>100% fully refunded</strong>.</li>
              <li><strong>Irrevocable Fulfillment:</strong> Once verified functional digital keys or credentials are shown or delivered, the sale is final.</li>
            </ul>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Section 3 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm icon--cyan">verified_user</span>
              3. License Scope &amp; Anti-Resale Restrictions
            </h2>
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
              Purchases are granted for personal, non-exclusive, individual consumer usage. Reselling, unauthorized sub-licensing, redistributing, or publicly publishing credentials, serial keys, or download tokens is strictly prohibited and will result in immediate termination of the license without compensation.
            </p>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Section 4 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm icon--cyan">account_balance_wallet</span>
              4. Store Wallet, Deposits &amp; Pricing
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 10 }}>
              Prices on QuantumXD are displayed dynamically with multi-currency support (INR, USD, EUR, etc.).
            </p>
            <ul style={{ paddingLeft: 22, margin: 0, color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong>Wallet Balances:</strong> Funds deposited into your QuantumXD Wallet or received as store credit are non-transferable, non-expiring, and cannot be withdrawn as cash.</li>
              <li><strong>Pricing Changes:</strong> We reserve the right to modify catalog pricing, discounts, and promotional offers at any time without prior notice.</li>
            </ul>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Section 5 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: '#EF4444', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm" style={{ color: '#EF4444' }}>shield</span>
              5. No-Chargeback Agreement &amp; Anti-Fraud
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 10 }}>
              By submitting payment on QuantumXD, you explicitly waive the right to file fraudulent chargebacks, bank payment disputes, or false "unauthorized transaction" claims for delivered digital goods.
            </p>
            <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: 13.5, color: '#DC2626' }}>
              Any user attempting fraudulent chargebacks will be permanently banned, have all digital licenses deactivated, and be subject to legal recovery proceedings.
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Section 6 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm icon--cyan">lock</span>
              6. Limitation of Liability
            </h2>
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
              To the maximum extent permitted by applicable law, QuantumXD and its affiliates shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from third-party platform policy modifications (e.g. Sony, Steam, Netflix, Microsoft updates) beyond the replacement or store wallet credit of the purchased item.
            </p>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Section 7 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm icon--cyan">support_agent</span>
              7. Dispute Resolution &amp; Support Contact
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 14 }}>
              For any questions, order verification, or dispute settlement, our team is directly available via our official channels:
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/contact" className="btn btn--primary btn--sm" style={{ gap: 6 }}>
                <span className="icon icon--sm">support</span>
                <span>Contact Help Desk</span>
              </Link>
              <a href="https://t.me/QuantumXD" target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm" style={{ gap: 6 }}>
                <span className="icon icon--sm">send</span>
                <span>Telegram Support</span>
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

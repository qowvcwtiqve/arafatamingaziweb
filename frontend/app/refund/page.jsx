import Link from 'next/link';

export const metadata = {
  title: 'Refund & Cancellation Policy | QuantumXD Store',
  description: 'Our policy on digital product fulfillment, replacements, store wallet credits, and non-refundable digital goods.',
};

export default function RefundPage() {
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
            <span className="icon icon--sm icon--filled">verified_user</span>
            Customer Protection &amp; Digital Fulfillment Terms
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800, margin: '0 0 10px 0' }}>
            Refund &amp; Cancellation <span className="text-gradient">Policy</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 15, margin: 0 }}>
            Last updated: August 2026. Please read carefully before purchasing any digital asset on QuantumXD.
          </p>
        </div>

        {/* Highlight Alert Box */}
        <div style={{
          padding: '18px 22px',
          background: 'rgba(239, 68, 68, 0.06)',
          border: '1.5px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '12px',
          marginBottom: 30,
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start'
        }}>
          <span className="icon icon--md" style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }}>warning</span>
          <div style={{ fontSize: 13.5, color: 'var(--color-text)', lineHeight: 1.6 }}>
            <strong style={{ color: '#DC2626' }}>Important Notice for All Buyers: </strong>
            QuantumXD exclusively provides <strong>intangible digital goods</strong> (software license keys, game activations, subscription accounts, and digital assets). Because digital credentials and keys are exposed immediately upon purchase and cannot be physically returned or un-seen, <strong>all delivered purchases are strictly non-refundable</strong> once generated or dispatched.
          </div>
        </div>

        {/* Policy Sections Card */}
        <div className="card card--elevated" style={{ padding: '36px 32px', color: 'var(--color-text)', lineHeight: 1.8, fontSize: 14.5, display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          {/* Section 1 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm icon--cyan">inventory_2</span>
              1. Nature of Digital Goods
            </h2>
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
              All items on QuantumXD (including PlayStation/Steam keys, OTT &amp; streaming credentials, AI tool activations, VPN profiles, and software licenses) are delivered digitally through automated online channels or direct dashboard download tokens. When you complete checkout, your license or account is provisioned instantly.
            </p>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Section 2 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm icon--cyan">cancel</span>
              2. Order Placement &amp; Cancellation Policy
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 10 }}>
              Because digital assets and licenses are linked to automated instant fulfillment queues, <strong>orders once placed cannot be self-cancelled by the buyer from the website dashboard</strong>.
            </p>
            <div style={{ padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 10, border: '1px solid var(--color-border)', marginBottom: 12 }}>
              <strong style={{ color: 'var(--color-text)' }}>Need to Cancel an Order?</strong>
              <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
                Buyers must contact our 24/7 customer support on Telegram (<a href="https://t.me/QuantumXD" target="_blank" rel="noopener noreferrer" style={{ color: '#1B4EF5', fontWeight: 700, textDecoration: 'underline' }}>@QuantumXD</a>) or submit a ticket with their Order ID to request a manual cancellation.
              </p>
            </div>
            <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.06)', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: 13.5, color: '#059669' }}>
              <strong style={{ color: '#047857' }}>Non-Working Product Guarantee:</strong> If any delivered product, key, or account does not work, cannot be activated, or fails verification, the order will be <strong>immediately cancelled and 100% fully refunded</strong> (via replacement or Store Wallet/source refund).
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Section 3 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm icon--accent">block</span>
              3. Strict Non-Refundable Policy for Working Goods
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
              Except where a product is verified defective or unfulfillable, delivered working digital goods are non-refundable under the following circumstances:
            </p>
            <ul style={{ paddingLeft: 22, margin: 0, color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Change of mind after digital credentials, game keys, or accounts have been revealed and verified functional.</li>
              <li>Inability of the buyer's hardware, operating system, or console region to support the product (buyers must verify compatibility prior to purchase).</li>
              <li>Incorrect variant, package, or duration selected by the user during checkout.</li>
              <li>Failure to redeem licenses within the product's activation validity window.</li>
            </ul>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Section 4 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm icon--cyan">check_circle</span>
              4. Eligible Refund Scenarios
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
              A full cancellation and refund is granted under the following verified scenarios:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 14, background: 'var(--color-surface-2)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                <strong style={{ color: 'var(--color-text)' }}>A. Product Does Not Work / Defective Key:</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
                  If a delivered key or credential does not work upon delivery, contact support with screenshot/video proof. If we cannot provide a working replacement, the order will be cancelled and <strong>100% fully refunded</strong>.
                </p>
              </div>
              <div style={{ padding: 14, background: 'var(--color-surface-2)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                <strong style={{ color: 'var(--color-text)' }}>B. Undeliverable / Out-of-Stock Orders:</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
                  If an order cannot be fulfilled due to inventory exhaustion, supplier delay, or administrative cancellation prior to key generation, 100% of the purchase amount will be credited to your <strong>QuantumXD Store Wallet</strong> or refunded.
                </p>
              </div>
              <div style={{ padding: 14, background: 'var(--color-surface-2)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                <strong style={{ color: 'var(--color-text)' }}>C. Support-Approved Pre-Order Cancellations:</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
                  Pre-orders in the processing queue may be cancelled before the key dispatch begins by contacting support. 100% of the funds are refunded directly to your Store Wallet.
                </p>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Section 4 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm icon--cyan">account_balance_wallet</span>
              4. Store Wallet Balance Credits
            </h2>
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
              All approved refunds for delivered items or replacement reconciliations are credited exclusively to the user's <strong>QuantumXD Store Wallet</strong>. Wallet balance credits have no expiration date and can be used immediately across any product in our catalog. Wallet balance cannot be withdrawn to external bank accounts or converted into fiat cash.
            </p>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Section 5 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: '#EF4444', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm" style={{ color: '#EF4444' }}>gavel</span>
              5. Zero-Tolerance Chargeback &amp; Fraud Policy
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 10 }}>
              Initiating a chargeback, bank dispute, or friendly fraud claim through your payment provider (UPI app, bank, or card issuer) without first seeking resolution with our support team is a direct violation of our Terms of Service.
            </p>
            <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: 13.5, color: '#DC2626' }}>
              <strong>Consequences of Fraudulent Chargebacks:</strong> Any account associated with an unauthorized chargeback will face <strong>immediate and permanent termination</strong>, revocation of all associated digital licenses, forfeiture of any remaining wallet balance, and reporting to global digital merchant fraud-prevention databases.
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Section 6 */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm icon--cyan">support_agent</span>
              6. How to Request Support or Replacement
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 14 }}>
              If you experience any issue with your digital purchase, please reach out to our dedicated 24/7 support channels with your Order ID:
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/contact" className="btn btn--primary btn--sm" style={{ gap: 6 }}>
                <span className="icon icon--sm">support</span>
                <span>Open Support Ticket</span>
              </Link>
              <a href="https://t.me/QuantumXD" target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm" style={{ gap: 6 }}>
                <span className="icon icon--sm">send</span>
                <span>Telegram Support (@QuantumXD)</span>
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

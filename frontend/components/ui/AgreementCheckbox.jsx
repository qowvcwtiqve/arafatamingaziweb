'use client';
import Link from 'next/link';

/**
 * Reusable stylish theme-matched Agreement Checkbox
 * @param {boolean} checked - Current checkbox state
 * @param {function} onChange - State change callback
 * @param {string} mode - 'checkout' (Terms & Refund Policy) | 'auth' (Terms & Privacy Policy)
 * @param {function} [onLinkClick] - Optional link click handler (e.g. to close drawer)
 * @param {object} [style] - Optional outer wrapper style overrides
 */
export default function AgreementCheckbox({
  checked,
  onChange,
  mode = 'checkout',
  onLinkClick,
  style = {}
}) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className={`agreement-card ${checked ? 'agreed' : ''}`}
      style={style}
    >
      <div className="agreement-checkbox-box">
        <span className="icon checkmark-icon">check</span>
      </div>

      <div className="agreement-text">
        {mode === 'auth' ? (
          <span>
            I agree to the{' '}
            <Link
              href="/terms"
              target="_blank"
              onClick={(e) => {
                e.stopPropagation();
                if (onLinkClick) onLinkClick(e);
              }}
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              target="_blank"
              onClick={(e) => {
                e.stopPropagation();
                if (onLinkClick) onLinkClick(e);
              }}
            >
              Privacy Policy
            </Link>
            .
          </span>
        ) : (
          <span>
            I agree to the{' '}
            <Link
              href="/terms"
              target="_blank"
              onClick={(e) => {
                e.stopPropagation();
                if (onLinkClick) onLinkClick(e);
              }}
            >
              Terms of Service
            </Link>{' '}
            &amp;{' '}
            <Link
              href="/refund"
              target="_blank"
              onClick={(e) => {
                e.stopPropagation();
                if (onLinkClick) onLinkClick(e);
              }}
            >
              Refund Policy
            </Link>
            .
          </span>
        )}
      </div>
    </div>
  );
}

import Link from 'next/link';

export default function Logo({ size = 'default', showTag = true, href = '/', className = '' }) {
  const isLarge = size === 'large';
  const isMedium = size === 'medium';
  
  const fontSize = isLarge ? 28 : isMedium ? 24 : 22;
  const tagSize = isLarge ? 10 : 9;

  const content = (
    <div
      className={`logo-brand ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        textDecoration: 'none',
        cursor: 'pointer',
        userSelect: 'none',
        lineHeight: 1.05,
      }}
    >
      {/* Pure Bold Typography Wordmark */}
      <div
        style={{
          fontFamily: 'var(--font-heading, system-ui, -apple-system, sans-serif)',
          fontSize: fontSize,
          fontWeight: 800,
          letterSpacing: '-0.035em',
          color: 'var(--color-text)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <span>Quantum</span>
        <span
          style={{
            background: 'linear-gradient(135deg, #8B5CF6 0%, #38BDF8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 900,
            letterSpacing: '-0.02em',
          }}
        >
          XD
        </span>
      </div>

      {showTag && (
        <span
          style={{
            fontSize: tagSize,
            fontWeight: 800,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--color-text-faint)',
            marginTop: 2,
          }}
        >
          Store
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
        {content}
      </Link>
    );
  }

  return content;
}

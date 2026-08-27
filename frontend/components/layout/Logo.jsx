import Link from 'next/link';

export default function Logo({ size = 'default', href = '/', className = '' }) {
  const isLarge = size === 'large';
  const isMedium = size === 'medium';
  const isSmall = size === 'small';
  
  const fontSize = isLarge ? 26 : isMedium ? 23 : isSmall ? 19 : 22;

  const content = (
    <div
      className={`logo-brand ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        textDecoration: 'none',
        cursor: 'pointer',
        userSelect: 'none',
        lineHeight: 1,
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
          gap: 1.5,
        }}
      >
        <span>Quantum</span>
        <span
          style={{
            background: 'linear-gradient(135deg, #1B4EF5 0%, #3874FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 900,
            letterSpacing: '-0.02em',
          }}
        >
          XD
        </span>
      </div>
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

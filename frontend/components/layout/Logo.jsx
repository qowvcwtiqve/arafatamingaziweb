import Link from 'next/link';

export default function Logo({ size = 'default', showTag = true, href = '/', className = '' }) {
  const isLarge = size === 'large';
  const iconSize = isLarge ? 38 : 32;

  const content = (
    <div className={`logo-brand ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: isLarge ? 12 : 10, textDecoration: 'none', cursor: 'pointer' }}>
      {/* Glowing Modern Quantum Isometric Emblem */}
      <div style={{
        width: iconSize,
        height: iconSize,
        borderRadius: isLarge ? 10 : 8,
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 20px rgba(139, 92, 246, 0.45), 0 2px 8px rgba(0,0,0,0.3)',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        border: '1px solid rgba(255, 255, 255, 0.25)'
      }}>
        {/* Shimmer light effect */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none'
        }} />

        {/* Dynamic 3D Quantum Diamond/Layers */}
        <svg width={isLarge ? 22 : 18} height={isLarge ? 22 : 18} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7.2L12 12.4L22 7.2L12 2Z" fill="#ffffff" />
          <path d="M2 12L12 17.2L22 12" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 16.8L12 22L22 16.8" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" />
        </svg>
      </div>

      {/* Typography */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <div style={{
          fontFamily: 'var(--font-heading, "Inter", sans-serif)',
          fontSize: isLarge ? 23 : 19,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: 'var(--color-text)',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <span>Quantum</span>
          <span style={{
            background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #f472b6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 900
          }}>
            XD
          </span>
        </div>
        {showTag && (
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-text-faint)',
            marginTop: 3
          }}>
            Digital Store
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} style={{ textDecoration: 'none' }}>{content}</Link>;
  }

  return content;
}

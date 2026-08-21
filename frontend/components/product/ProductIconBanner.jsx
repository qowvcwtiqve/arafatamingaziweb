'use client';

function getProductIcon(name = '', category = '') {
  const str = `${name} ${category}`.toLowerCase();
  if (str.includes('canva') || str.includes('design') || str.includes('photoshop') || str.includes('adobe')) {
    return { icon: 'palette', gradient: 'linear-gradient(135deg, rgba(236,72,153,0.2) 0%, rgba(99,102,241,0.2) 100%)', color: '#f472b6' };
  }
  if (str.includes('ai') || str.includes('chatgpt') || str.includes('grammarly') || str.includes('gpt') || str.includes('bot')) {
    return { icon: 'smart_toy', gradient: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(56,189,248,0.2) 100%)', color: '#38BDF8' };
  }
  if (str.includes('zee5') || str.includes('netflix') || str.includes('prime') || str.includes('hotstar') || str.includes('stream') || str.includes('tv') || str.includes('sonyliv')) {
    return { icon: 'tv', gradient: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(239,68,68,0.2) 100%)', color: '#fbbf24' };
  }
  if (str.includes('vpn') || str.includes('key') || str.includes('license') || str.includes('antivirus') || str.includes('security')) {
    return { icon: 'vpn_key', gradient: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(56,189,248,0.2) 100%)', color: '#34d399' };
  }
  if (str.includes('windows') || str.includes('office') || str.includes('os') || str.includes('software')) {
    return { icon: 'desktop_windows', gradient: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(56,189,248,0.2) 100%)', color: '#818cf8' };
  }
  if (str.includes('game') || str.includes('steam') || str.includes('gta') || str.includes('playstation')) {
    return { icon: 'sports_esports', gradient: 'linear-gradient(135deg, rgba(168,85,247,0.25) 0%, rgba(236,72,153,0.2) 100%)', color: '#c084fc' };
  }
  if (str.includes('code') || str.includes('dev') || str.includes('github') || str.includes('hosting')) {
    return { icon: 'terminal', gradient: 'linear-gradient(135deg, rgba(20,184,166,0.25) 0%, rgba(99,102,241,0.2) 100%)', color: '#2dd4bf' };
  }
  return { icon: 'token', gradient: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(56,189,248,0.15) 100%)', color: 'var(--color-primary-light)' };
}

export default function ProductIconBanner({ title = '', category = '', size = 'card' }) {
  const { icon, gradient, color } = getProductIcon(title, category);
  const isDetail = size === 'detail';
  const iconSize = isDetail ? 68 : 42;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(circle at 50% 35%, rgba(99, 102, 241, 0.22) 0%, rgba(16, 21, 34, 0.95) 75%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      userSelect: 'none'
    }}>
      {/* Background Subtle Tech Mesh Lines */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
        opacity: 0.6
      }} />

      {/* Glowing Orb */}
      <div style={{
        position: 'absolute',
        width: isDetail ? 160 : 90,
        height: isDetail ? 160 : 90,
        borderRadius: '50%',
        background: gradient,
        filter: isDetail ? 'blur(30px)' : 'blur(20px)',
        pointerEvents: 'none'
      }} />

      {/* Main Google Font Icon Container */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: isDetail ? 100 : 64,
        height: isDetail ? 100 : 64,
        borderRadius: isDetail ? 'var(--radius-xl)' : 'var(--radius-lg)',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: `0 0 30px ${color}33, inset 0 0 15px rgba(255, 255, 255, 0.05)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
        backdropFilter: 'blur(8px)'
      }}>
        <span
          className="icon"
          style={{
            fontSize: iconSize,
            fontVariationSettings: "'FILL' 1, 'wght' 400"
          }}
        >
          {icon}
        </span>
      </div>

      {/* Clean Tag under icon */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        marginTop: isDetail ? 12 : 8,
        fontSize: isDetail ? 13 : 10,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--color-text-muted)',
        opacity: 0.85
      }}>
        Digital License
      </div>
    </div>
  );
}

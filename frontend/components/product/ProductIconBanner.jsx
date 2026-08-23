'use client';

function getProductIcon(name = '', category = '') {
  const str = `${name} ${category}`.toLowerCase();

  // 1. OTT & Streaming Platforms
  if (str.includes('netflix') || str.includes('prime') || str.includes('zee5') || str.includes('hotstar') || str.includes('sonyliv') || str.includes('ullu') || str.includes('crunchyroll') || str.includes('disney') || str.includes('ott') || str.includes('stream') || str.includes('tv')) {
    return {
      icon: 'tv',
      gradient: 'linear-gradient(135deg, rgba(239,68,68,0.35) 0%, rgba(245,158,11,0.3) 100%)',
      color: '#FB7185',
      glow: 'rgba(239, 68, 68, 0.4)',
      label: 'OTT & STREAMING'
    };
  }

  // 2. Music & Audio
  if (str.includes('spotify') || str.includes('youtube') || str.includes('music') || str.includes('audio') || str.includes('sound') || str.includes('apple music') || str.includes('gaana')) {
    return {
      icon: 'headphones',
      gradient: 'linear-gradient(135deg, rgba(16,185,129,0.35) 0%, rgba(0,212,255,0.3) 100%)',
      color: '#34D399',
      glow: 'rgba(16, 185, 129, 0.4)',
      label: 'MUSIC & ENTERTAINMENT'
    };
  }

  // 3. AI & Intelligent Tools
  if (str.includes('ai') || str.includes('chatgpt') || str.includes('gpt') || str.includes('claude') || str.includes('midjourney') || str.includes('grammarly') || str.includes('quillbot') || str.includes('perplexity') || str.includes('gemini') || str.includes('bot') || str.includes('openai')) {
    return {
      icon: 'smart_toy',
      gradient: 'linear-gradient(135deg, rgba(99,102,241,0.4) 0%, rgba(0,212,255,0.35) 100%)',
      color: '#38BDF8',
      glow: 'rgba(0, 212, 255, 0.4)',
      label: 'AI INTELLIGENCE'
    };
  }

  // 4. Creative, Design & Photo/Video
  if (str.includes('canva') || str.includes('design') || str.includes('photoshop') || str.includes('adobe') || str.includes('illustrator') || str.includes('premiere') || str.includes('freepik') || str.includes('envato') || str.includes('figma')) {
    return {
      icon: 'palette',
      gradient: 'linear-gradient(135deg, rgba(236,72,153,0.35) 0%, rgba(168,85,247,0.35) 100%)',
      color: '#F472B6',
      glow: 'rgba(236, 72, 153, 0.4)',
      label: 'CREATIVE & DESIGN'
    };
  }

  // 5. VPN, Security & Antivirus
  if (str.includes('vpn') || str.includes('nord') || str.includes('surfshark') || str.includes('express') || str.includes('antivirus') || str.includes('kaspersky') || str.includes('security') || str.includes('protect') || str.includes('shield')) {
    return {
      icon: 'shield_lock',
      gradient: 'linear-gradient(135deg, rgba(16,185,129,0.35) 0%, rgba(6,182,212,0.35) 100%)',
      color: '#10B981',
      glow: 'rgba(16, 185, 129, 0.4)',
      label: 'VPN & SECURITY'
    };
  }

  // 6. OS, Windows & Office Software
  if (str.includes('windows') || str.includes('office') || str.includes('microsoft') || str.includes('ms office') || str.includes('license') || str.includes('key') || str.includes('activation') || str.includes('software')) {
    return {
      icon: 'desktop_windows',
      gradient: 'linear-gradient(135deg, rgba(99,102,241,0.4) 0%, rgba(124,58,237,0.35) 100%)',
      color: '#818CF8',
      glow: 'rgba(99, 102, 241, 0.4)',
      label: 'SOFTWARE & LICENSE'
    };
  }

  // 7. Gaming, Steam & Consoles
  if (str.includes('game') || str.includes('gaming') || str.includes('steam') || str.includes('gta') || str.includes('playstation') || str.includes('xbox') || str.includes('valorant') || str.includes('bgmi') || str.includes('free fire') || str.includes('pubg')) {
    return {
      icon: 'sports_esports',
      gradient: 'linear-gradient(135deg, rgba(168,85,247,0.4) 0%, rgba(236,72,153,0.35) 100%)',
      color: '#C084FC',
      glow: 'rgba(168, 85, 247, 0.4)',
      label: 'GAMING ASSETS'
    };
  }

  // 8. Development, Code, Hosting & RDP
  if (str.includes('code') || str.includes('dev') || str.includes('github') || str.includes('hosting') || str.includes('vps') || str.includes('rdp') || str.includes('domain') || str.includes('server') || str.includes('api') || str.includes('script')) {
    return {
      icon: 'terminal',
      gradient: 'linear-gradient(135deg, rgba(20,184,166,0.4) 0%, rgba(99,102,241,0.35) 100%)',
      color: '#2DD4BF',
      glow: 'rgba(45, 212, 191, 0.4)',
      label: 'DEVELOPER TOOLS'
    };
  }

  // 9. Telegram, Discord & Social Boost
  if (str.includes('telegram') || str.includes('discord') || str.includes('nitro') || str.includes('stars') || str.includes('boost') || str.includes('followers') || str.includes('social') || str.includes('premium')) {
    return {
      icon: 'rocket_launch',
      gradient: 'linear-gradient(135deg, rgba(0,212,255,0.4) 0%, rgba(124,58,237,0.4) 100%)',
      color: '#00D4FF',
      glow: 'rgba(0, 212, 255, 0.45)',
      label: 'TELEGRAM & SOCIAL'
    };
  }

  // 10. Education, Courses & Books
  if (str.includes('udemy') || str.includes('course') || str.includes('learn') || str.includes('skillshare') || str.includes('coursera') || str.includes('book') || str.includes('edu')) {
    return {
      icon: 'school',
      gradient: 'linear-gradient(135deg, rgba(245,158,11,0.4) 0%, rgba(16,185,129,0.35) 100%)',
      color: '#FBBF24',
      glow: 'rgba(245, 158, 11, 0.4)',
      label: 'COURSES & LEARNING'
    };
  }

  // Default Digital Asset
  return {
    icon: 'deployed_code',
    gradient: 'linear-gradient(135deg, rgba(124,58,237,0.4) 0%, rgba(0,212,255,0.35) 100%)',
    color: '#A78BFA',
    glow: 'rgba(124, 58, 237, 0.4)',
    label: category ? category.toUpperCase() : 'DIGITAL PRODUCT'
  };
}

export default function ProductIconBanner({ title = '', category = '', size = 'card' }) {
  const { icon, gradient, color, glow, label } = getProductIcon(title, category);
  const isDetail = size === 'detail';
  const iconSize = isDetail ? 64 : 38;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(circle at 50% 30%, rgba(124, 58, 237, 0.16) 0%, var(--color-surface-2) 80%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      userSelect: 'none'
    }}>
      {/* Background Subtle Cyber Tech Mesh Grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(var(--color-border) 1px, transparent 1px)',
        backgroundSize: isDetail ? '20px 20px' : '16px 16px',
        opacity: 0.6
      }} />

      {/* Glowing Dynamic Orb */}
      <div style={{
        position: 'absolute',
        width: isDetail ? 180 : 100,
        height: isDetail ? 180 : 100,
        borderRadius: '50%',
        background: gradient,
        filter: isDetail ? 'blur(36px)' : 'blur(22px)',
        pointerEvents: 'none'
      }} />

      {/* Central Google Font Material Symbol Glass Container */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: isDetail ? 96 : 58,
        height: isDetail ? 96 : 58,
        borderRadius: isDetail ? 'var(--radius-xl, 20px)' : 'var(--radius-lg, 16px)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-glow, rgba(255, 255, 255, 0.15))',
        boxShadow: `0 8px 25px ${glow}, inset 0 1px 1px rgba(255, 255, 255, 0.15)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
        transition: 'transform 0.3s ease',
      }}>
        <span
          className="icon icon--filled"
          style={{
            fontSize: iconSize,
            color: color,
          }}
        >
          {icon}
        </span>
      </div>

      {/* Clean Category Label under icon */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        marginTop: isDetail ? 12 : 8,
        fontSize: isDetail ? 12 : 10,
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--color-text-muted)',
        background: 'rgba(0, 0, 0, 0.25)',
        padding: '2px 8px',
        borderRadius: 12,
        border: '1px solid var(--color-border)',
      }}>
        {label}
      </div>
    </div>
  );
}

'use client';

function getProductCategoryMeta(name = '', category = '') {
  const str = `${name} ${category}`.toLowerCase();

  if (str.includes('netflix') || str.includes('prime') || str.includes('zee5') || str.includes('hotstar') || str.includes('sonyliv') || str.includes('crunchyroll') || str.includes('disney') || str.includes('ott') || str.includes('stream') || str.includes('tv')) {
    return {
      icon: 'live_tv',
      color: '#3874FF',
      bgGradient: 'linear-gradient(135deg, rgba(27, 78, 245, 0.15) 0%, rgba(56, 116, 255, 0.08) 100%)',
      borderColor: 'rgba(56, 116, 255, 0.25)',
      label: 'OTT & STREAMING'
    };
  }

  if (str.includes('spotify') || str.includes('youtube') || str.includes('music') || str.includes('audio') || str.includes('sound') || str.includes('apple music') || str.includes('gaana')) {
    return {
      icon: 'headphones',
      color: '#10B981',
      bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(56, 116, 255, 0.08) 100%)',
      borderColor: 'rgba(16, 185, 129, 0.25)',
      label: 'MUSIC & AUDIO'
    };
  }

  if (str.includes('ai') || str.includes('chatgpt') || str.includes('gpt') || str.includes('claude') || str.includes('midjourney') || str.includes('grammarly') || str.includes('quillbot') || str.includes('perplexity') || str.includes('gemini') || str.includes('openai')) {
    return {
      icon: 'smart_toy',
      color: '#3874FF',
      bgGradient: 'linear-gradient(135deg, rgba(27, 78, 245, 0.18) 0%, rgba(56, 116, 255, 0.10) 100%)',
      borderColor: 'rgba(56, 116, 255, 0.3)',
      label: 'AI INTELLIGENCE'
    };
  }

  if (str.includes('canva') || str.includes('design') || str.includes('photoshop') || str.includes('adobe') || str.includes('illustrator') || str.includes('figma') || str.includes('freepik')) {
    return {
      icon: 'palette',
      color: '#EC4899',
      bgGradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(27, 78, 245, 0.08) 100%)',
      borderColor: 'rgba(236, 72, 153, 0.25)',
      label: 'CREATIVE & DESIGN'
    };
  }

  if (str.includes('vpn') || str.includes('nord') || str.includes('surfshark') || str.includes('express') || str.includes('antivirus') || str.includes('security') || str.includes('shield')) {
    return {
      icon: 'shield_lock',
      color: '#10B981',
      bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(27, 78, 245, 0.08) 100%)',
      borderColor: 'rgba(16, 185, 129, 0.25)',
      label: 'VPN & SECURITY'
    };
  }

  if (str.includes('windows') || str.includes('office') || str.includes('microsoft') || str.includes('license') || str.includes('key') || str.includes('activation') || str.includes('software')) {
    return {
      icon: 'desktop_windows',
      color: '#3874FF',
      bgGradient: 'linear-gradient(135deg, rgba(27, 78, 245, 0.18) 0%, rgba(56, 116, 255, 0.08) 100%)',
      borderColor: 'rgba(56, 116, 255, 0.25)',
      label: 'SOFTWARE LICENSE'
    };
  }

  if (str.includes('game') || str.includes('gaming') || str.includes('steam') || str.includes('playstation') || str.includes('xbox') || str.includes('valorant') || str.includes('bgmi') || str.includes('free fire')) {
    return {
      icon: 'sports_esports',
      color: '#A855F7',
      bgGradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(27, 78, 245, 0.08) 100%)',
      borderColor: 'rgba(168, 85, 247, 0.25)',
      label: 'GAMING ASSETS'
    };
  }

  if (str.includes('code') || str.includes('dev') || str.includes('github') || str.includes('hosting') || str.includes('vps') || str.includes('rdp') || str.includes('server')) {
    return {
      icon: 'terminal',
      color: '#14B8A6',
      bgGradient: 'linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(27, 78, 245, 0.08) 100%)',
      borderColor: 'rgba(20, 184, 166, 0.25)',
      label: 'DEVELOPER TOOLS'
    };
  }

  return {
    icon: 'deployed_code',
    color: '#3874FF',
    bgGradient: 'linear-gradient(135deg, rgba(27, 78, 245, 0.18) 0%, rgba(56, 116, 255, 0.08) 100%)',
    borderColor: 'rgba(56, 116, 255, 0.25)',
    label: category ? category.toUpperCase() : 'DIGITAL ASSET'
  };
}

export default function ProductIconBanner({ title = '', category = '', size = 'card' }) {
  const { icon, color, bgGradient, borderColor, label } = getProductCategoryMeta(title, category);
  const isDetail = size === 'detail';
  const iconSize = isDetail ? 52 : 32;

  return (
    <div className="product-icon-banner">
      <style jsx>{`
        .product-icon-banner {
          width: 100%;
          height: 100%;
          position: absolute;
          inset: 0;
          background: ${bgGradient};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          user-select: none;
          padding: 16px;
        }

        .icon-tile {
          width: ${isDetail ? '84px' : '52px'};
          height: ${isDetail ? '84px' : '52px'};
          border-radius: ${isDetail ? '20px' : '14px'};
          background: var(--color-surface);
          border: 1px solid ${borderColor};
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${color};
          transition: transform 0.25s ease;
        }

        .product-icon-banner:hover .icon-tile {
          transform: scale(1.06);
        }

        .category-label {
          margin-top: ${isDetail ? '12px' : '8px'};
          font-size: ${isDetail ? '11px' : '9.5px'};
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-text-muted);
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          padding: 2px 8px;
          border-radius: 9999px;
        }
      `}</style>

      <div className="icon-tile">
        <span className="icon icon--filled" style={{ fontSize: iconSize }}>
          {icon}
        </span>
      </div>

      <div className="category-label">
        {label}
      </div>
    </div>
  );
}

'use client';

export default function FlagIcon({ code = 'INR', size = 16, style = {} }) {
  const c = String(code).toUpperCase();

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    overflow: 'hidden',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 0 0 1px rgba(255,255,255,0.12)',
    verticalAlign: 'middle',
    ...style,
  };

  switch (c) {
    case 'INR':
      return (
        <span style={containerStyle} title="India (INR)">
          <svg viewBox="0 0 32 32" width={size} height={size}>
            <rect y="0" width="32" height="10.66" fill="#FF9933" />
            <rect y="10.66" width="32" height="10.66" fill="#FFFFFF" />
            <rect y="21.33" width="32" height="10.66" fill="#138808" />
            <circle cx="16" cy="16" r="3.6" fill="none" stroke="#000088" strokeWidth="0.9" />
            <circle cx="16" cy="16" r="1.1" fill="#000088" />
          </svg>
        </span>
      );

    case 'USD':
      return (
        <span style={containerStyle} title="United States (USD)">
          <svg viewBox="0 0 32 32" width={size} height={size}>
            <rect width="32" height="32" fill="#B22234" />
            <path d="M0 4.9h32M0 9.8h32M0 14.8h32M0 19.7h32M0 24.6h32M0 29.5h32" stroke="#FFF" strokeWidth="2.46" />
            <rect width="14" height="16" fill="#3C3B6E" />
            <circle cx="4" cy="4" r="0.9" fill="#FFF" />
            <circle cx="10" cy="4" r="0.9" fill="#FFF" />
            <circle cx="7" cy="8" r="0.9" fill="#FFF" />
            <circle cx="4" cy="12" r="0.9" fill="#FFF" />
            <circle cx="10" cy="12" r="0.9" fill="#FFF" />
          </svg>
        </span>
      );

    case 'EUR':
      return (
        <span style={containerStyle} title="Eurozone (EUR)">
          <svg viewBox="0 0 32 32" width={size} height={size}>
            <rect width="32" height="32" fill="#003399" />
            <g fill="#FFCC00">
              <circle cx="16" cy="6" r="1.1" />
              <circle cx="21" cy="7.3" r="1.1" />
              <circle cx="24.7" cy="11" r="1.1" />
              <circle cx="26" cy="16" r="1.1" />
              <circle cx="24.7" cy="21" r="1.1" />
              <circle cx="21" cy="24.7" r="1.1" />
              <circle cx="16" cy="26" r="1.1" />
              <circle cx="11" cy="24.7" r="1.1" />
              <circle cx="7.3" cy="21" r="1.1" />
              <circle cx="6" cy="16" r="1.1" />
              <circle cx="7.3" cy="11" r="1.1" />
              <circle cx="11" cy="7.3" r="1.1" />
            </g>
          </svg>
        </span>
      );

    case 'GBP':
      return (
        <span style={containerStyle} title="United Kingdom (GBP)">
          <svg viewBox="0 0 32 32" width={size} height={size}>
            <rect width="32" height="32" fill="#012169" />
            <path d="M0 0 L32 32 M32 0 L0 32" stroke="#FFF" strokeWidth="5.5" />
            <path d="M0 0 L32 32 M32 0 L0 32" stroke="#C8102E" strokeWidth="2.2" />
            <path d="M16 0 V32 M0 16 H32" stroke="#FFF" strokeWidth="9" />
            <path d="M16 0 V32 M0 16 H32" stroke="#C8102E" strokeWidth="5.5" />
          </svg>
        </span>
      );

    case 'BDT':
      return (
        <span style={containerStyle} title="Bangladesh (BDT)">
          <svg viewBox="0 0 32 32" width={size} height={size}>
            <rect width="32" height="32" fill="#006A4E" />
            <circle cx="14.5" cy="16" r="7.5" fill="#F42A41" />
          </svg>
        </span>
      );

    case 'PKR':
      return (
        <span style={containerStyle} title="Pakistan (PKR)">
          <svg viewBox="0 0 32 32" width={size} height={size}>
            <rect width="32" height="32" fill="#115E34" />
            <rect width="7.5" height="32" fill="#FFFFFF" />
            {/* Crescent and Star */}
            <circle cx="19.5" cy="16" r="7" fill="#FFFFFF" />
            <circle cx="21.5" cy="14.5" r="6" fill="#115E34" />
            <polygon points="21,11 22,13.5 24.5,13.5 22.5,15 23.2,17.5 21,16 18.8,17.5 19.5,15 17.5,13.5 20,13.5" fill="#FFFFFF" />
          </svg>
        </span>
      );

    case 'VND':
      return (
        <span style={containerStyle} title="Vietnam (VND)">
          <svg viewBox="0 0 32 32" width={size} height={size}>
            <rect width="32" height="32" fill="#DA251D" />
            <polygon points="16,6.5 18.9,15.5 28.5,15.5 20.8,21.1 23.7,30.1 16,24.5 8.3,30.1 11.2,21.1 3.5,15.5 13.1,15.5" fill="#FFFF00" />
          </svg>
        </span>
      );

    case 'SGD':
      return (
        <span style={containerStyle} title="Singapore (SGD)">
          <svg viewBox="0 0 32 32" width={size} height={size}>
            <rect y="0" width="32" height="16" fill="#ED2939" />
            <rect y="16" width="32" height="16" fill="#FFFFFF" />
            {/* Crescent */}
            <circle cx="9" cy="8" r="5" fill="#FFFFFF" />
            <circle cx="10.8" cy="8" r="4.3" fill="#ED2939" />
            {/* 5 Stars */}
            <circle cx="11.5" cy="5.5" r="0.75" fill="#FFFFFF" />
            <circle cx="13.2" cy="7.2" r="0.75" fill="#FFFFFF" />
            <circle cx="13" cy="9.4" r="0.75" fill="#FFFFFF" />
            <circle cx="10.8" cy="10.4" r="0.75" fill="#FFFFFF" />
            <circle cx="10.2" cy="6.8" r="0.75" fill="#FFFFFF" />
          </svg>
        </span>
      );

    case 'RUB':
      return (
        <span style={containerStyle} title="Russia (RUB)">
          <svg viewBox="0 0 32 32" width={size} height={size}>
            <rect y="0" width="32" height="10.66" fill="#FFFFFF" />
            <rect y="10.66" width="32" height="10.66" fill="#0039A6" />
            <rect y="21.33" width="32" height="10.66" fill="#D52B1E" />
          </svg>
        </span>
      );

    default:
      return (
        <span style={containerStyle}>
          <span style={{ fontSize: 10, fontWeight: 800 }}>{c.slice(0, 2)}</span>
        </span>
      );
  }
}

'use client';

// Official high-fidelity vector SVGs for payment method badges (Standard E-Commerce Format)

export function UpiBadge({ height = 24 }) {
  return (
    <svg height={height} viewBox="0 0 54 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect width="54" height="24" rx="5" fill="#1A1C23" stroke="rgba(255,255,255,0.1)" />
      <g transform="translate(6, 4)">
        {/* UPI Icon */}
        <path d="M12.5 2L7 16H11.5L14 7.5L16.5 16H21L26.5 2H22L19 10.5L16.5 2H12.5Z" fill="#097939" />
        <path d="M3.5 9L0.5 16H4.5L6.5 12L5 9H3.5Z" fill="#097939" />
        <path d="M5.5 2L2 9H6.5L8.5 4.5L7.5 2H5.5Z" fill="#ED752E" />
      </g>
      {/* UPI Text */}
      <text x="31" y="16" fontFamily="system-ui, -apple-system, sans-serif" fontSize="11" fontWeight="800" fill="#FFFFFF" letterSpacing="0.05em">UPI</text>
    </svg>
  );
}

export function GPayBadge({ height = 24 }) {
  return (
    <svg height={height} viewBox="0 0 56 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect width="56" height="24" rx="5" fill="#1A1C23" stroke="rgba(255,255,255,0.1)" />
      <g transform="translate(7, 5)">
        <path d="M13.6 7.1c0-.5-.04-1-.12-1.47H7.1v2.78h3.66c-.16.85-.64 1.57-1.36 2.05v1.7h2.2c1.29-1.19 2-2.94 2-5.06z" fill="#4285F4"/>
        <path d="M7.1 13.8c1.84 0 3.38-.61 4.51-1.65l-2.2-1.7c-.61.41-1.39.66-2.31.66-1.78 0-3.29-1.2-3.83-2.82H1.01v1.76c1.13 2.24 3.44 3.75 6.09 3.75z" fill="#34A853"/>
        <path d="M3.27 8.29c-.14-.41-.22-.85-.22-1.29s.08-.88.22-1.29V3.95H1.01C.37 5.22 0 6.66 0 8.2s.37 2.98 1.01 4.25l2.26-1.76v-.4z" fill="#FBBC05"/>
        <path d="M7.1 2.82c1 0 1.9.35 2.61 1.02l1.96-1.96C10.48.75 8.94 0 7.1 0 4.46 0 2.14 1.51 1.01 3.75l2.26 1.76c.54-1.62 2.05-2.69 3.83-2.69z" fill="#EA4335"/>
      </g>
      <text x="25" y="16" fontFamily="system-ui, -apple-system, sans-serif" fontSize="10.5" fontWeight="700" fill="#FFFFFF">Pay</text>
    </svg>
  );
}

export function PhonePeBadge({ height = 24 }) {
  return (
    <svg height={height} viewBox="0 0 68 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect width="68" height="24" rx="5" fill="#1A1C23" stroke="rgba(255,255,255,0.1)" />
      <g transform="translate(6, 4)">
        <rect width="16" height="16" rx="4" fill="#5F259F" />
        <path d="M10.5 5L6.8 8.6V12M6.8 8.6L5 6.8M6.8 8.6H10C11 8.6 11.8 7.9 11.8 7C11.8 6.1 11.1 5.3 10 5.3H5.8V12" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      <text x="26" y="16" fontFamily="system-ui, -apple-system, sans-serif" fontSize="10.5" fontWeight="700" fill="#FFFFFF">PhonePe</text>
    </svg>
  );
}

export function PaytmBadge({ height = 24 }) {
  return (
    <svg height={height} viewBox="0 0 58 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect width="58" height="24" rx="5" fill="#1A1C23" stroke="rgba(255,255,255,0.1)" />
      <g transform="translate(6, 4)">
        <rect width="16" height="16" rx="4" fill="#002E6E" />
        <path d="M4 6H6.5C7.5 6 8.2 6.7 8.2 7.5C8.2 8.3 7.5 9 6.5 9H5.5V11.5H4V6Z" fill="#00BAF2"/>
        <path d="M9 8.5H10.5V11.5H9V8.5Z" fill="#00BAF2"/>
        <path d="M11 7.5H12.8L14 10L15.2 7.5H17L15 11.5H13.2L11 7.5Z" fill="#00BAF2"/>
      </g>
      <text x="26" y="16" fontFamily="system-ui, -apple-system, sans-serif" fontSize="10.5" fontWeight="700" fill="#00BAF2">Paytm</text>
    </svg>
  );
}

export function BinancePayBadge({ height = 24 }) {
  return (
    <svg height={height} viewBox="0 0 86 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect width="86" height="24" rx="5" fill="#1A1C23" stroke="rgba(255,255,255,0.1)" />
      <g transform="translate(6, 4)">
        <rect width="16" height="16" rx="4" fill="#181A20" />
        <path d="M8 3L9.5 4.5L6.3 7.7L4.8 6.2L8 3Z" fill="#F0B90B"/>
        <path d="M11.2 6.2L12.7 7.7L9.5 10.9L8 9.4L11.2 6.2Z" fill="#F0B90B"/>
        <path d="M8 10L9.5 11.5L8 13L6.5 11.5L8 10Z" fill="#F0B90B"/>
        <path d="M4.8 9.4L6.3 10.9L4.8 12.4L3.3 10.9L4.8 9.4Z" fill="#F0B90B"/>
        <path d="M8 6.4L9.5 7.9L8 9.4L6.5 7.9L8 6.4Z" fill="#F0B90B"/>
      </g>
      <text x="26" y="16" fontFamily="system-ui, -apple-system, sans-serif" fontSize="10.5" fontWeight="700" fill="#F0B90B">Binance</text>
      <text x="67" y="16" fontFamily="system-ui, -apple-system, sans-serif" fontSize="10.5" fontWeight="700" fill="#FFFFFF">Pay</text>
    </svg>
  );
}

export function TetherBadge({ height = 24 }) {
  return (
    <svg height={height} viewBox="0 0 62 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect width="62" height="24" rx="5" fill="#1A1C23" stroke="rgba(255,255,255,0.1)" />
      <g transform="translate(6, 4)">
        <circle cx="8" cy="8" r="8" fill="#26A17B" />
        <path d="M8.6 8.2c-.1 0-.4 0-.6 0-1.7 0-3.1-.3-3.1-.6s1.3-.6 3.1-.6 3.1.3 3.1.6c0 .1-.3.5-1.1.6V10c1.7-.1 3-.5 3-1 0-.7-2.2-1.2-5-1.2s-5 .5-5 1.2c0 .5 1.3.9 3 1V13h2.6v-3v-.8zm-.6-1.9h3V5H5v1.3h3V5.8z" fill="#FFFFFF"/>
      </g>
      <text x="26" y="16" fontFamily="system-ui, -apple-system, sans-serif" fontSize="10.5" fontWeight="700" fill="#26A17B">USDT</text>
    </svg>
  );
}

export function BitcoinBadge({ height = 24 }) {
  return (
    <svg height={height} viewBox="0 0 54 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect width="54" height="24" rx="5" fill="#1A1C23" stroke="rgba(255,255,255,0.1)" />
      <g transform="translate(6, 4)">
        <circle cx="8" cy="8" r="8" fill="#F7931A" />
        <path d="M10.8 6.9c.1-1-.6-1.5-1.7-1.9l.3-1.4-.9-.2-.3 1.3c-.2-.1-.5-.1-.7-.2l.3-1.3-.9-.2-.3 1.4c-.2 0-.4-.1-.5-.1l-1.2-.3-.2.9s.7.2.7.2c.3.1.4.3.4.5l-.5 1.9c0 .1.1.1.1.1l-.1 0-.7 2.7c0 .2-.3.3-.5.3 0 0-.7-.2-.7-.2l-.4 1 1.1.3c.2.1.4.1.6.1l-.3 1.4.9.2.3-1.4c.3.1.5.1.7.2l-.3 1.4.9.2.3-1.4c1.5.3 2.6.1 3.1-1.1.4-1 0-1.6-.7-2 .7-.3 1.1-.8 1-1.8zm-1.6 3c-.3 1.1-2.1.5-2.7.4l.5-1.9c.6.1 2.5.4 2.2 1.5zm.3-3c-.3 1-1.7.5-2.3.3l.4-1.7c.5.1 2.1.4 1.9 1.4z" fill="#FFFFFF"/>
      </g>
      <text x="26" y="16" fontFamily="system-ui, -apple-system, sans-serif" fontSize="10.5" fontWeight="700" fill="#F7931A">BTC</text>
    </svg>
  );
}

export function RuPayBadge({ height = 24 }) {
  return (
    <svg height={height} viewBox="0 0 64 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect width="64" height="24" rx="5" fill="#1A1C23" stroke="rgba(255,255,255,0.1)" />
      <g transform="translate(6, 4)">
        <rect width="16" height="16" rx="4" fill="#0C2340" />
        <path d="M4 4.5H8.5C9.6 4.5 10.4 5.3 10.4 6.3C10.4 7.2 9.6 8 8.5 8H6.5V10.5H4V4.5Z" fill="#097939"/>
        <path d="M10 7.5L12.5 11.5H15L12 7.5H10Z" fill="#ED752E"/>
      </g>
      <text x="26" y="16" fontFamily="system-ui, -apple-system, sans-serif" fontSize="10.5" fontWeight="700" fill="#FFFFFF">RuPay</text>
    </svg>
  );
}

export function VisaBadge({ height = 24 }) {
  return (
    <svg height={height} viewBox="0 0 52 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect width="52" height="24" rx="5" fill="#1A1C23" stroke="rgba(255,255,255,0.1)" />
      <text x="11" y="17" fontFamily="'Arial Black', system-ui, sans-serif" fontSize="13" fontStyle="italic" fontWeight="900" fill="#1A73E8" letterSpacing="0.08em">VISA</text>
    </svg>
  );
}

export function MastercardBadge({ height = 24 }) {
  return (
    <svg height={height} viewBox="0 0 52 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect width="52" height="24" rx="5" fill="#1A1C23" stroke="rgba(255,255,255,0.1)" />
      <g transform="translate(14, 5)">
        <circle cx="7" cy="7" r="6" fill="#EB001B" />
        <circle cx="16" cy="7" r="6" fill="#F79E1B" fillOpacity="0.88" />
      </g>
    </svg>
  );
}

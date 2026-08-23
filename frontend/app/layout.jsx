import './globals.css';
import { Toaster } from 'react-hot-toast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

export const metadata = {
  title: {
    default: 'QuantumXD Store — Digital Marketplace',
    template: '%s | QuantumXD Store',
  },
  description: 'Buy premium digital products, software, templates, and tools. Instant delivery, secure payments via UPI, Crypto & Binance Pay.',
  keywords: ['digital products', 'software', 'templates', 'instant download', 'UPI payment', 'crypto payment'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://quantumxd.store'),
  openGraph: {
    type: 'website',
    title: 'QuantumXD Store — Digital Marketplace',
    icons: {
      icon: '/favicon.svg',
    },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#07090E',
};

const themeScript = `
  (function() {
    try {
      var savedTheme = localStorage.getItem('quantumxd-theme');
      if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
      } else {
        var prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
        if (prefersLight) {
          document.documentElement.setAttribute('data-theme', 'light');
        }
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Google Material Symbols — Icon system (replaces all emojis) */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Header />
        <main className="page-wrapper">
          {children}
        </main>
        <Footer />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-surface-2)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}

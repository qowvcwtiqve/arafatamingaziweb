'use client';
import Link from 'next/link';

const QUICK_CATEGORIES = [
  { id: 'all', name: 'All Products', icon: 'grid_view', color: '#3874FF', href: '/products' },
  { id: 'gaming', name: 'Gaming Keys', icon: 'sports_esports', color: '#A78BFA', href: '/products?search=Steam' },
  { id: 'ai', name: 'AI Subscriptions', icon: 'psychology', color: '#10B981', href: '/products?search=AI' },
  { id: 'ott', name: 'OTT & Streaming', icon: 'smart_display', color: '#EC4899', href: '/products?search=OTT' },
  { id: 'software', name: 'Pro Software', icon: 'apps', color: '#F59E0B', href: '/products?search=Software' },
  { id: 'vpn', name: 'VPN & Security', icon: 'vpn_lock', color: '#06B6D4', href: '/products?search=VPN' },
  { id: 'playstation', name: 'PlayStation & PSN', icon: 'gamepad', color: '#3B82F6', href: '/products?search=PlayStation' },
];

export default function QuickCategoryBar() {
  return (
    <div className="quick-category-bar">
      <div className="container">
        <div className="quick-category-scroll">
          {QUICK_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href}
              className="quick-category-item"
            >
              <div
                className="quick-category-icon-box"
                style={{
                  color: cat.color,
                  background: `${cat.color}15`,
                  borderColor: `${cat.color}33`
                }}
              >
                <span className="icon icon--md">{cat.icon}</span>
              </div>
              <span className="quick-category-name">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], // [{ id, product_id, variant_id?, title, price, thumbnail_url }]
      isOpen: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set(s => ({ isOpen: !s.isOpen })),

      addItem: (item) => {
        const existingId = `${item.product_id}-${item.variant_id || 'default'}`;
        const existing = get().items.find(i => i.id === existingId);
        
        if (!existing) {
          set(s => ({
            items: [...s.items, { ...item, id: existingId, quantity: item.quantity || 1 }],
            isOpen: true,
          }));
        } else {
          set(s => ({
            items: s.items.map(i => i.id === existingId ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i),
            isOpen: true,
          }));
        }
      },

      updateQuantity: (id, qty) => {
        if (qty < 1) return;
        set(s => ({
          items: s.items.map(i => i.id === id ? { ...i, quantity: qty } : i)
        }));
      },

      removeItem: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),

      clearCart: () => set({ items: [] }),

      get total() {
        return get().items.reduce((sum, i) => sum + (parseFloat(i.price) * (i.quantity || 1)), 0);
      },
    }),
    { name: 'quantumxd-cart' }
  )
);

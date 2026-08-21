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
        const existing = get().items.find(i =>
          i.product_id === item.product_id && i.variant_id === item.variant_id
        );
        if (!existing) {
          set(s => ({
            items: [...s.items, { ...item, id: `${item.product_id}-${item.variant_id || 'default'}` }],
            isOpen: true,
          }));
        } else {
          set({ isOpen: true });
        }
      },

      removeItem: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),

      clearCart: () => set({ items: [] }),

      get total() {
        return get().items.reduce((sum, i) => sum + parseFloat(i.price), 0);
      },
    }),
    { name: 'quantumxd-cart' }
  )
);

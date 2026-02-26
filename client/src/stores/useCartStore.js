import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      // State
      items: [],

      // Actions
      addItem: (post) => {
        const { items } = get();
        const existing = items.find((i) => i.postId === post.postId);
        if (existing) {
          if (existing.quantity >= existing.maxQuantity) return false;
          const newQty = Math.min(existing.quantity + (post.quantity || 1), existing.maxQuantity);
          set({ items: items.map((i) => (i.postId === post.postId ? { ...i, quantity: newQty } : i)) });
          return 'updated';
        }

        set({
          items: [
            ...items,
            {
              postId: post.postId,
              title: post.title,
              price: Number(post.price),
              quantity: post.quantity || 1,
              maxQuantity: post.maxQuantity || 1,
              imageUrl: post.imageUrl,
              sellerCustomerId: post.sellerCustomerId || null,
            },
          ],
        });
        return true;
      },

      removeItem: (postId) => {
        set({ items: get().items.filter((i) => i.postId !== postId) });
      },

      updateQuantity: (postId, qty) => {
        set({
          items: get().items.map((i) => {
            if (i.postId !== postId) return i;
            const clamped = Math.max(1, Math.min(qty, i.maxQuantity));
            return { ...i, quantity: clamped };
          }),
        });
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'atf-cart',
      partialize: (s) => ({ items: s.items }),
    }
  )
);

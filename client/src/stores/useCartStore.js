import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      // State
      items: [],

      // Derived
      get totalAmount() {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },
      get itemCount() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      // Actions
      addItem: (post) => {
        const { items } = get();
        const alreadyInCart = items.some((i) => i.postId === post.id);
        if (alreadyInCart) return;

        set({
          items: [
            ...items,
            {
              postId: post.id,
              title: post.title,
              price: Number(post.price),
              quantity: 1,
              maxQuantity: post.quantity || 1,
              imageUrl: post.image_url,
              sellerCustomerId: post.customer_id || null,
            },
          ],
        });
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
    }
  )
);

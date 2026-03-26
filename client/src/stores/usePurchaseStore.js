import { create } from 'zustand';
import websocketService from '../services/websocketService.js';
import { useAuthStore } from './useAuthStore.js';
import { getSellerPurchases } from '../services/fetch-purchases.js';

let listenersAttached = false;

export const usePurchaseStore = create((set, get) => ({
  sellerPurchases: [],
  salesLoading: false,
  pendingGalleryShipmentsCount: 0,

  fetchSellerPurchases: async () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;
    set({ salesLoading: true });
    try {
      const purchases = await getSellerPurchases();
      const list = Array.isArray(purchases) ? purchases : [];
      set({
        sellerPurchases: list,
        pendingGalleryShipmentsCount: list.filter((p) => !p.trackingNumber).length,
        salesLoading: false,
      });
    } catch (e) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error fetching seller purchases:', e);
      }
      set({ salesLoading: false });
    }
  },

  updateTrackingInStore: (id, trackingNumber) => {
    set((state) => {
      const updated = state.sellerPurchases.map((p) =>
        p.id === id ? { ...p, trackingNumber } : p,
      );
      return {
        sellerPurchases: updated,
        pendingGalleryShipmentsCount: updated.filter((p) => !p.trackingNumber).length,
      };
    });
  },

  attachListeners: () => {
    if (listenersAttached) return;
    listenersAttached = true;

    websocketService.on('gallery-sold', () => {
      get().fetchSellerPurchases();
    });
  },
}));

// attach immediately when module loads
usePurchaseStore.getState().attachListeners();

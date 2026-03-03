import { create } from 'zustand';
import websocketService from '../services/websocketService.js';
import { useAuthStore } from './useAuthStore.js';

const BASE_URL = process.env.REACT_APP_BASE_URL;

let listenersAttached = false;

export const useAuctionEventsStore = create((set, get) => ({
  // event signals
  lastBidUpdate: null,
  lastBuyNowId: null,
  lastAuctionEnded: null,
  lastAuctionCreated: null,
  lastAuctionExtended: null,
  lastAuctionPaid: null,
  lastTrackingUpdate: null,

  // seller badge
  pendingShipmentsCount: 0,
  setPendingShipments: (count) => set({ pendingShipmentsCount: count }),
  fetchPendingShipments: async () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;
    try {
      const resp = await fetch(`${BASE_URL}/api/v1/auctions/seller`, { credentials: 'include' });
      if (!resp.ok) return;
      const auctions = await resp.json();
      const count = Array.isArray(auctions) ? auctions.filter((a) => a.winnerSub && !a.trackingNumber).length : 0;
      set({ pendingShipmentsCount: count });
    } catch (e) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error fetching pending shipments:', e);
      }
    }
  },

  // actions
  setBid: (auctionId) => set({ lastBidUpdate: { id: Number(auctionId), t: Date.now() } }),
  setBuyNow: (auctionId) => set({ lastBuyNowId: Number(auctionId) }),
  setEnded: (auctionId) => set({ lastAuctionEnded: Number(auctionId) }),
  setCreated: (auction) => set({ lastAuctionCreated: auction }),
  setExtended: (auctionId, newEndTime) =>
    set({ lastAuctionExtended: { id: Number(auctionId), newEndTime, t: Date.now() } }),
  setPaid: (auctionId, isPaid) =>
    set({
      lastAuctionPaid: { id: Number(auctionId), isPaid, t: Date.now() },
    }),
  setTracking: (auctionId, trackingNumber) =>
    set({
      lastTrackingUpdate: { id: Number(auctionId), trackingNumber, t: Date.now() },
    }),

  // one-time listener attach
  attachListeners: () => {
    if (listenersAttached) return;
    listenersAttached = true;

    websocketService.on('bid-placed', ({ auctionId }) => {
      get().setBid(auctionId);
    });

    websocketService.on('auction-BIN', (auctionId) => {
      get().setBuyNow(auctionId);
    });

    websocketService.on('auction-ended', ({ auctionId }) => {
      get().setEnded(auctionId);
    });

    websocketService.on('auction-created', ({ auction }) => {
      get().setCreated(auction);
    });

    websocketService.on('auction-extended', ({ auctionId, newEndTime }) => {
      get().setExtended(auctionId, newEndTime);
    });

    websocketService.on('tracking-info', ({ auctionId, trackingNumber }) => {
      get().setTracking(auctionId, trackingNumber);
    });

    websocketService.on('auction-paid', ({ auctionId, isPaid }) => {
      get().setPaid(auctionId, isPaid);
    });
  },
}));

// attach immediately when module loads
useAuctionEventsStore.getState().attachListeners();

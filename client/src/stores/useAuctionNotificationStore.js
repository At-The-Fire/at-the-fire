import { create } from 'zustand';
import { useAuthStore } from './useAuthStore.js';

const BASE_URL = process.env.REACT_APP_BASE_URL;

export const useAuctionNotificationStore = create((set) => ({
  unreadWonCount: 0,

  fetchUnreadCount: async () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;

    try {
      const response = await fetch(`${BASE_URL}/api/v1/auction-notifications`, {
        credentials: 'include',
      });

      if (response.status === 401 || response.status === 403) {
        useAuthStore.getState().handleAuthError(response.status);
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch auction notifications');

      const data = await response.json();
      set({ unreadWonCount: Array.isArray(data) ? data.length : 0 });
    } catch (e) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error fetching auction notifications:', e);
      }
    }
  },

  markAllRead: async () => {
    try {
      await fetch(`${BASE_URL}/api/v1/auction-notifications/mark-read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      set({ unreadWonCount: 0 });
    } catch (e) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error marking auction notifications as read:', e);
      }
    }
  },

  incrementCount: () => set((state) => ({ unreadWonCount: state.unreadWonCount + 1 })),
}));

import { create } from 'zustand';
import { useAuthStore } from './useAuthStore.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const BASE_URL = process.env.REACT_APP_BASE_URL;

export const useNotificationStore = create((set, get) => ({
  unreadCount: 0,
  acknowledgedCount: 0,
  lastSeenCount: 0,
  mobileOpen: false,
  eventConversationId: null,
  activeConversationId: null,
  newMessageTrigger: 0,
  selectedConversation: null,

  setMobileOpen: (isOpen) => set({ mobileOpen: isOpen }),

  setActiveConversationId: (conversationId) => set({ activeConversationId: conversationId }),

  triggerNewMessage: () => set((state) => ({ newMessageTrigger: state.newMessageTrigger + 1 })),

  setSelectedConversation: (conversation) => set({ selectedConversation: conversation }),

  clearActiveConversationId: () => set({ activeConversationId: null }),

  // Optionally, if you need to store messages related to the conversation:
  // messages: [],
  // setMessages: (messages) => set({ messages }),

  fetchUnreadCount: async () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;

    try {
      const response = await fetch(`${BASE_URL}/api/v1/conversations/unread-count`, {
        credentials: 'include',
      });

      if (response.status === 401 || response.status === 403) {
        useAuthStore.getState().handleAuthError(response.status);
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch unread count');

      const data = await response.json();
      const { unreadCount: newCount, lastSeenCount } = get();

      if (newCount > lastSeenCount) {
        const newMessages = newCount - lastSeenCount;
        set({
          unreadCount: data.unreadCount,
          lastSeenCount: data.unreadCount,
          acknowledgedCount: data.unreadCount - newMessages,
        });
      } else {
        set({ unreadCount: data.unreadCount });
      }
    } catch (e) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error(`Error fetching unread count:`, e);
      }
      useAuthStore.getState().setError(e.code);
      toast.error(`Error fetching unread count: ${e.message}`, {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'useNotification-1',
        autoClose: false,
      });
    }
  },

  markConversationAsRead: async (conversationId) => {
    try {
      await fetch(`${BASE_URL}/api/v1/conversations/mark-read`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });

      if (conversationId !== get().eventConversationId) {
        return;
      }

      set((state) => ({
        unreadCount: Math.max(0, state.unreadCount - 1),
        acknowledgedCount: Math.max(0, state.acknowledgedCount - 1),
      }));
    } catch (e) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error(`Error marking conversation as read:`, e);
      }
      useAuthStore.getState().setError(e.code);
      toast.error(`Error marking conversation as read: ${e.message}`, {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'useNotification-2',
        autoClose: false,
      });
    }
  },

  decrementUnreadCount: (count = 1) =>
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount - count),
    })),
}));

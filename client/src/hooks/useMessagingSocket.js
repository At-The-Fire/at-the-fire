// src/hooks/useMessagingSocket.js
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useNotificationStore } from '../stores/useNotificationStore';
import { useAuthStore } from '../stores/useAuthStore.js';

export function useMessagingSocket() {
  const { user } = useAuthStore();
  const activeConversationId = useNotificationStore((state) => state.activeConversationId);
  const { markConversationAsRead } = useNotificationStore();

  useEffect(() => {
    const isDev = window.location.hostname === 'localhost';
    const socketUrl = isDev ? process.env.REACT_APP_BASE_URL : window.location.origin;
    const socket = io(socketUrl, { withCredentials: true });

    // Listener for new messages
    socket.on('new message', (data) => {
      if (data.recipient === user) {
        if (activeConversationId !== data.conversationId) {
          useNotificationStore.setState({
            unreadCount: data.unreadCount,
            eventConversationId: data.conversationId,
          });
        } else {
          // The message belongs to the active conversation.
          // Clear the unread count and trigger an update.
          useNotificationStore.setState({
            unreadCount: 0,
            eventConversationId: data.conversationId,
          });

          markConversationAsRead(data.conversationId);
          // markConversationAsRead(data.conversationId);
          useNotificationStore.getState().triggerNewMessage();
        }
      }

      //* below commented out for example while setting up 2.8.25
      //* could update messages themselves- no need to do a reactive fetch, only on load....
      // console.log('Received new message:', data);
      // For example, update your unread count directly in your zustand store.
      // If you have more sophisticated message handling, you could trigger a refetch
      // or update a separate messages store.
      // useNotificationStore.setState((state) => ({
      // unreadCount: data.unreadCount,
      // Optionally, if you want to do something with the message:
      // messages: [...state.messages, data.message],
      // }));
    });

    // You could also listen for an event specifically for unread count changes:
    // socket.on('unreadCount', (data) => {
    //   console.log('Updated unread count:', data);
    //   useNotificationStore.setState({
    //     unreadCount: data.unreadCount,
    //   });
    // });

    return () => socket.disconnect();
  }, [user, activeConversationId]);
}

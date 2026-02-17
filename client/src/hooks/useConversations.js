import { useState } from 'react';
import { useNotificationStore } from '../stores/useNotificationStore';
import {
  fetchConversations,
  createConversations,
  sendNewMessage,
  deleteMessage,
  fetchMessagesForConversation,
} from '../services/fetch-conversations';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../stores/useAuthStore.js';

export const useConversations = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const { markConversationAsRead, fetchUnreadCount, selectedConversation } = useNotificationStore();
  const { customerId, isAuthenticated, setError, error, user } = useAuthStore();
  const setSelectedConversation = useNotificationStore((state) => state.setSelectedConversation);

  const handleError = (e, operation) => {
    console.log('handleError firing values:');
    console.log('e', e);
    console.log('operation', operation);

    setError(e.code);
    if (e.code === 401 || e.code === 403) {
      useAuthStore.getState().handleAuthError(e.code, e.message);
    } else {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error(`Error ${operation}:`, e);
      }
      useAuthStore.getState().setError(e.code);
      toast.error(`Error ${operation}: ${e.message}`, {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: `useConvo-${operation}`,
        autoClose: false,
      });
    }
  };

  const loadConversations = async () => {
    try {
      if (!user || !isAuthenticated || !customerId || error === 401 || error === 403) {
        return;
      }
      const data = await fetchConversations();

      setConversations(data);
      setLoading(false);
    } catch (e) {
      setError(e.code);

      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        handleError(e, 'loading conversations');
      }
      setLoading(false);
    }
  };

  const handleCreateConversation = async (participantSubs) => {
    try {
      setLoading(true);
      const data = await createConversations(participantSubs);
      await loadConversations();
      const newConvo = conversations.find((conv) => conv.id === data.conversationId);
      if (newConvo) {
        handleSelectConversation(newConvo);
      }
      return data;
    } catch (e) {
      setError(e.code);

      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        handleError(e, 'creating new conversation');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    try {
      const messages = await fetchMessagesForConversation(conversation.id);
      setMessages(messages);
      await markConversationAsRead(conversation.id);
      await fetchUnreadCount();
    } catch (e) {
      setError(e.code);

      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        handleError(e, 'selecting conversation and marking it as read');
      }
    }
  };

  const handleSendMessage = async (conversationId, content) => {
    try {
      await sendNewMessage(conversationId, content);
      const messages = await fetchMessagesForConversation(conversationId);
      setMessages(messages);

      // Refresh conversations and maintain selection like your original code
      const updatedConversations = await fetchConversations();
      setConversations(updatedConversations);

      // Keep same conversation selected if it still exists
      const currentConversation = updatedConversations.find((conv) => conv.id === conversationId);
      if (currentConversation) {
        setSelectedConversation(currentConversation);
      }
    } catch (e) {
      setError(e.code);

      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        handleError(e, 'sending message');
      }
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      await deleteMessage(conversationId);
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }

      await loadConversations();
    } catch (e) {
      setError(e.code);

      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        handleError(e, 'deleting conversation');
      }
    }
  };

  return {
    conversations,
    setConversations,
    selectedConversation,
    setSelectedConversation,
    messages,
    loading,
    setLoading,
    loadConversations,
    handleCreateConversation,
    handleSelectConversation,
    handleSendMessage,
    handleDeleteConversation,
  };
};

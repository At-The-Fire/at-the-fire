const BASE_URL = process.env.REACT_APP_BASE_URL;

export const fetchConversations = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/conversations`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }

    const data = await response.json();

    return data;
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      console.error('Error fetching conversations:', e);
    }
    throw e;
  }
};

export const createConversations = async (participantSubs) => {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ participantSubs }),
    });

    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }

    const data = await response.json();

    return data;
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      console.error('Error fetching conversations:', e);
    }
    throw e;
  }
};

export const sendNewMessage = async (conversationId, content) => {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/conversations/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        conversationId,
        content,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }

    const data = await response.json();

    return data;
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      console.error('Error fetching conversations:', e);
    }
    throw e;
  }
};

export const fetchMessagesForConversation = async (conversationId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/conversations/${conversationId}/messages`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Error fetching messages');
    const data = await response.json();

    return data;
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      console.error('Error fetching conversations:', e);
    }
    throw e;
  }
};

export const deleteMessage = async (conversationId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/conversations/${conversationId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error('Failed to delete conversation');
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      console.error('Error fetching conversations:', e);
    }
    throw e;
  }
};

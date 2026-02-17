// const BASE_URL =  process.env.REACT_APP_BASE_URL;
const BASE_URL = process.env.REACT_APP_BASE_URL;

export const sendChatPrompt = async (messages) => {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/ai-assistant/chat`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('idToken')}`,
      },
      body: JSON.stringify({ messages }),
      credentials: 'include',
    });

    const data = await resp.json();
    if (!resp.ok) {
      throw {
        code: data.code || resp.status,
        message: data.message || `Error getting AI response: Status ${resp.status}`,
        type: data.type || 'UnknownError',
      };
    }

    return data;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in sendChatPrompt:', error);
    }
    throw error;
  }
};

export const generateImage = async (prompt, options = {}) => {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/ai-assistant/generate-image`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('idToken')}`,
      },
      body: JSON.stringify({
        prompt,
        n: options.n || 1,
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
      }),
      credentials: 'include',
    });

    const data = await resp.json();
    if (!resp.ok) {
      throw {
        code: data.code || resp.status,
        message: data.message || `Error generating image: Status ${resp.status}`,
        type: data.type || 'UnknownError',
      };
    }

    return data;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in generateImage:', error);
    }
    throw error;
  }
};

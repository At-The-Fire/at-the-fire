const BASE_URL = process.env.REACT_APP_BASE_URL;
/* eslint-disable no-console */
const createCookies = async (result) => {
  try {
    const cookies = await fetch(`${BASE_URL}/api/v1/auth/create-cookies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(result),
    });
    return cookies;
  } catch (e) {
    e.message = 'Failed to create cookies';
    if (process.env.REACT_APP_APP_ENV === 'development') {
      console.error(e);
    }
    throw e;
  }
};

const deleteCookies = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/auth/clear-cookies`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json', // Changed to 'application/json'
      },
      credentials: 'include',
    });

    // Check if the response was successful
    if (!response.ok) {
      throw new Error(`Error clearing cookies: HTTP status ${response.status}`);
    }

    // Handle 204 (No Content) case
    if (response.status === 204) {
      return;
    }

    // Handle other response codes if necessary
    const data = await response.json();
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      console.error('Error signing out and deleting cookies:', e);
    }
    // If it's a network error, the error will be a TypeError with a message like "Failed to fetch"
    if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        console.error('Network error: Please check your internet connection.');
      }
      throw e;
    } else {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        console.error('Unexpected error:', e.message);
      }
    }
  }
};

export { createCookies, deleteCookies };

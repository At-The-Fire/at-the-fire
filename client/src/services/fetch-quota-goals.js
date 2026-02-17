const BASE_URL = process.env.REACT_APP_BASE_URL;

// fetch all products from database
export async function fetchQuotaGoals() {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/goals?`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    // Check if the server responded with a non-200 status
    const data = await resp.json();
    if (!resp.ok) {
      throw {
        code: data.code || resp.status,
        message: data.message || `Error fetching goals: Status ${resp.status}`,
        type: data.type || 'UnknownError',
      };
    }

    return data;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in fetchQuotaGoals:', error.message);
    }
    throw error;
  }
}

// edit existing product in database
export async function editQuotaGoals(quotaData) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/goals`, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quotaData,
      }),
      credentials: 'include',
    });

    // Check if the server responded with a non-200 status
    const msg = await resp.json();
    if (!resp.ok) {
      throw {
        code: msg.code || resp.status,
        message: msg.message || `Error editing goals: Status ${resp.status}`,
        type: msg.type || 'UnknownError',
      };
    }
    return msg;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    throw error;
  }
}

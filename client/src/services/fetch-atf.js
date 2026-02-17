const BASE_URL = process.env.REACT_APP_BASE_URL;

export async function fetchUserData() {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/atf-operations`, {
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
      // Preserve the full error structure
      throw {
        code: data.code || resp.status,
        message: data.message || `Error fetching posts: Status ${resp.status}`,
        type: data.type || 'UnknownError',
      };
    }

    return data;
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in fetchUsers: ', e);
    }
    throw e;
  }
}
export async function fetchInvoices() {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/atf-operations/invoices`, {
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
      // Preserve the full error structure
      throw {
        code: data.code || resp.status,
        message: data.message || `Error fetching posts: Status ${resp.status}`,
        type: data.type || 'UnknownError',
      };
    }

    return data;
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in fetchUsers: ', e);
    }
    throw e;
  }
}

export async function deleteUser(sub) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/atf-operations/delete-user/${sub}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    const data = await resp.json();

    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: data.code || resp.status,
        message: data.message || `Error fetching posts: Status ${resp.status}`,
        type: data.type || 'UnknownError',
      };
    }
    return data;
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error deleting user: ', e);
    }
    throw e;
  }
}
export async function deleteSubscriber(sub) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/atf-operations/delete-subscriber/${sub}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    const data = await resp.json();

    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: data.code || resp.status,
        message: data.message || `Error fetching posts: Status ${resp.status}`,
        type: data.type || 'UnknownError',
      };
    }
    return data;
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error deleting user: ', e);
    }
    throw e;
  }
}

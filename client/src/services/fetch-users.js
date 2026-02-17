const BASE_URL = process.env.REACT_APP_BASE_URL;

export async function searchUsers(searchTerm) {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/users?search=${searchTerm}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    return data;
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error fetching users: ', e);
    }
    // throw e;
    return [];
  }
}

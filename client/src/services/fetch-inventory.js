const BASE_URL = process.env.REACT_APP_BASE_URL;

// fetch all inventory snapshots from database
export async function fetchInventorySnapshots() {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/inventory-snapshot`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const rawData = await resp.text();

    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: rawData.code || resp.status,
        message: rawData.message || `Error fetching inventory snapshots: Status ${resp.status}`,
        type: rawData.type || 'UnknownError',
      };
    }

    const data = JSON.parse(rawData);

    const adjustedData = data.map((snapshot) => {
      const createdAtDate = new Date(snapshot.created_at);
      const timezoneOffset = createdAtDate.getTimezoneOffset() * 60000;
      const localDate = new Date(createdAtDate.getTime() + timezoneOffset);
      localDate.setHours(0, 0, 0, 0); // Set the time to midnight
      snapshot.created_at = localDate;
      return snapshot;
    });

    return adjustedData;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in error fetchInventorySnapshots.', error.message);
    }
    throw error;
  }
}

export async function postNewSnapshot(snapshot) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/inventory-snapshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(snapshot),
      credentials: 'include',
    });

    const data = await resp.json();

    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: data.code || resp.status,
        message: data.message || `Error posting inventory snapshots: Status ${resp.status}`,
        type: data.type || 'UnknownError',
      };
    }

    return data;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    throw error;
  }
}

const BASE_URL = process.env.REACT_APP_BASE_URL;

export async function getUnreadAuctionNotifications() {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auction-notifications`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Error fetching auction notifications');
    }

    const data = await res.json();
    return data;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error fetching auction notifications', e);
    throw new Error(e.message || 'Error in getUnreadAuctionNotifications');
  }
}

export async function markAuctionNotificationsRead() {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auction-notifications/mark-read`, {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Error marking auction notifications as read');
    }

    const data = await res.json();
    return data;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error marking auction notifications as read', e);
    throw new Error(e.message || 'Error in markAuctionNotificationsRead');
  }
}

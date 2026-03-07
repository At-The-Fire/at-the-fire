const BASE_URL = process.env.REACT_APP_BASE_URL;

export async function getAuctions() {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auctions`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Error fetching auctions');
    }

    const data = await res.json();
    return data;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error fetching auctions', e);
    throw new Error(e.message || 'Error in getAuctions');
  }
}

export async function getUserAuctions() {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auctions/user-auctions`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Error fetching auctions');
    }

    const data = await res.json();
    return data;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error fetching auctions', e);
    throw new Error(e.message || 'Error in getUserAuctions');
  }
}

export async function getSellerAuctions() {
  const resp = await fetch(`${BASE_URL}/api/v1/auctions/seller`, {
    credentials: 'include',
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

export async function getAuctionDetail(id) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/auctions/${id}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const auctionDetail = await resp.json();
    return auctionDetail;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    throw error;
  }
}

export async function getAuctionResults(auctionId) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/auctions/results/${auctionId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const auctionDetail = await resp.json();
    return auctionDetail;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    throw error;
  }
}

export async function createAuction(auctionDetails) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/auctions`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ auctionDetails }),
      credentials: 'include',
    });

    const data = await resp.json();
    if (resp.ok) {
      return data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    throw error;
  }
}

export async function uploadAuctionImagesToS3(imageFiles) {
  try {
    const formData = new FormData();
    for (const file of imageFiles) {
      formData.append('imageFiles', file);
    }

    const response = await fetch(`${BASE_URL}/api/v1/auctions/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to upload images');
    }

    const result = await response.json();

    const parsedResults = result.map((item) => (typeof item === 'string' ? JSON.parse(item) : item));

    return parsedResults;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error uploading images:', error);
    throw error;
  }
}

export async function updateAuction(id, auction) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/auctions/${id}`, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ auction }),
      credentials: 'include',
    });
    const msg = await resp.json();
    return msg;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    throw error;
  }
}

export async function cancelAuction(id) {
  const resp = await fetch(`${BASE_URL}/api/v1/auctions/${id}/cancel`, {
    method: 'PUT',
    credentials: 'include',
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || body.message || 'Request failed');
  }
  return resp.json();
}

export async function markAuctionPaid(auctionId, isPaid) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/auctions/${auctionId}/paid`, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isPaid }),
      credentials: 'include',
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || 'Failed to mark paid');
    return data;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    throw err;
  }
}

export async function getAdminAuctions() {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/admin/admin-auctions`, {
      credentials: 'include',
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || 'Failed to load admin auctions');
    return data;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    throw err;
  }
}

export async function updateAuctionTracking(auctionId, trackingNumber) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/auctions/${auctionId}/tracking`, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trackingNumber }),
      credentials: 'include',
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || 'Failed to update tracking');
    return data;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    throw err;
  }
}

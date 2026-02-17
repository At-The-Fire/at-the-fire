const BASE_URL = process.env.REACT_APP_BASE_URL;

// get all Orders from database and display on admin page
export async function fetchOrders() {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/orders`, {
      method: 'GET',
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
        message: data.message || `Error fetching orders: Status ${resp.status}`,
        type: data.type || 'UnknownError',
      };
    }

    return data;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in fetchOrders', error.message);
    }
    throw error;
  }
}

export async function insertNewOrder(orderData) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderData,
      }),
      credentials: 'include',
    });

    const data = await resp.json();

    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: data.code || resp.status,
        message: data.message || `Error creating new order: Status ${resp.status}`,
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

export async function editOrder(orderId, orderData) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderData,
      }),
      credentials: 'include',
    });

    const data = await resp.json();

    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: data.code || resp.status,
        message: data.message || `Error editing order: Status ${resp.status}`,
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

export async function updateFulfillmentStatus(orderId, isFulfilled) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/orders/${orderId}/fulfillment`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isFulfilled,
      }),
      credentials: 'include',
    });

    const data = await resp.json();

    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: data.code || resp.status,
        message: data.message || `Error updating fulfillment status: Status ${resp.status}`,
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

export const deleteOrder = async (orderId) => {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/orders/${orderId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!resp.ok) {
      // Try to get error data from response
      let errorData;
      try {
        errorData = await resp.json();
      } catch {
        // If no JSON body, create basic error structure
        errorData = {
          code: resp.status,
          message: `Failed to delete order: ${resp.statusText}`,
          type: 'DeleteError',
        };
      }

      throw {
        code: errorData.code || resp.status,
        message: errorData.message || `Error deleting order: Status ${resp.status}`,
        type: errorData.type || 'DeleteError',
      };
    }

    return true;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Delete order error:', error);
    }
    throw error;
  }
};

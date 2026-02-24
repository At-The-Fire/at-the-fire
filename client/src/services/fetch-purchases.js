const BASE_URL = process.env.REACT_APP_BASE_URL;

export async function validateCart(items) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/cart/validate`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
      credentials: 'include',
    });

    const data = await resp.json();
    if (resp.ok) {
      return data;
    } else {
      throw new Error(data.message || 'Cart validation failed');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error validating cart:', error);
    throw error;
  }
}

export async function createPaymentIntent(cartItems) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/purchases/intent`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cartItems }),
      credentials: 'include',
    });

    const data = await resp.json();
    if (resp.ok) {
      return data;
    } else {
      throw new Error(data.message || 'Failed to create payment intent');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

export async function confirmPurchase(intentId, items) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/purchases/confirm`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ intentId, items }),
      credentials: 'include',
    });

    const data = await resp.json();
    if (resp.ok) {
      return data;
    } else {
      throw new Error(data.message || 'Failed to confirm purchase');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error confirming purchase:', error);
    throw error;
  }
}

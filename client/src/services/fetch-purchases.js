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
      throw new Error(data.error || data.message || 'Cart validation failed');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error validating cart:', error);
    throw error;
  }
}

export async function createPaymentIntent(cartItems) {
  try {
    const items = (cartItems || []).map((i) => ({
      postId: i.postId,
      quantity: i.quantity,
    }));

    const totalAmount = items.reduce((sum, item) => {
      const cartItem = (cartItems || []).find((ci) => ci.postId === item.postId);
      const price = Number(cartItem?.price || 0);
      const qty = Number(item.quantity || 0);
      return sum + price * qty;
    }, 0);

    // Server expects integer cents
    const totalAmountCents = Math.round(Number(totalAmount) * 100);

    const resp = await fetch(`${BASE_URL}/api/v1/purchases/intent`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ totalAmount: totalAmountCents, items }),
      credentials: 'include',
    });

    const data = await resp.json();
    if (resp.ok) {
      return data;
    } else {
      throw new Error(data.error || data.message || 'Failed to create payment intent');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

export async function confirmPurchase(intentId, items, payment = null) {
  try {
    const normalizedItems = (items || []).map((i) => ({
      postId: i.postId,
      quantity: i.quantity,
    }));

    const resp = await fetch(`${BASE_URL}/api/v1/purchases/confirm`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ intentId, items: normalizedItems, payment }),
      credentials: 'include',
    });

    const data = await resp.json();
    if (resp.ok) {
      return data;
    } else {
      throw new Error(data.error || data.message || 'Failed to confirm purchase');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error confirming purchase:', error);
    throw error;
  }
}

export async function fetchStripeSubscribe({ priceId, firstName, lastName, billingEmail, setStage, customerId }) {
  try {
    const isDev = window.location.hostname === 'localhost';
    const BASE_URL = isDev ? process.env.REACT_APP_BASE_URL : window.location.origin;
    const resp = await fetch(`${BASE_URL}/api/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        firstName,
        lastName,
        billingEmail,
        customerId,
      }),
      credentials: 'include',
    });

    const data = await resp.json();

    if (resp.ok) {
      window.location = data.url;
      setStage(2);
      return resp;
    } else {
      return Promise.reject(data);
    }
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(e);
    }
    throw e;
  }
}

export async function fetchStripeCustomerPortal() {
  try {
    const BASE_URL = process.env.REACT_APP_BASE_URL;

    const resp = await fetch(`${BASE_URL}/api/v1/create-customer-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await resp.json();

    if (resp.ok) {
      window.location = data.url;
      return resp;
    } else {
      return Promise.reject(data);
    }
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(e);
    }
    throw e;
  }
}

export async function deleteOnCancel() {
  try {
    const BASE_URL = process.env.REACT_APP_BASE_URL;
    const resp = await fetch(`${BASE_URL}/api/v1/stripe/cancel-deletion`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(),
      credentials: 'include',
    });

    const data = await resp.json();

    if (resp.ok) {
      return resp;
    }
    return Promise.reject(data);
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(e);
    }
    throw e;
  }
}

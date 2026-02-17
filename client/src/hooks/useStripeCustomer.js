import { useCallback } from 'react';
const BASE_URL = process.env.REACT_APP_BASE_URL;
export default function useStripeCustomer() {
  const fetchBillingPeriod = useCallback(async () => {
    try {
      const url = `${BASE_URL}/api/v1/stripe/billing-period`;

      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await resp.json();

      if (resp.ok) {
        return data;
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
  }, []);

  const checkStripeCustomer = async () => {
    let result = { status: 200, data: null, error: null }; // default result

    try {
      const url = `${BASE_URL}/api/v1/auth/check-customer`;
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      result.status = resp.status;

      if (!resp.ok) {
        const errorData = await resp.json();
        let error = {
          code: resp.status,
          message: errorData.message || `Error: Status ${resp.status}`,
          type: errorData.type || 'CustomerCheckError',
        };

        // Special case for 404 to ensure user-friendly message
        if (resp.status === 404) {
          error.message = 'No profile found';
          error.type = 'ProfileNotFound';
        }

        throw error;
      } else {
        result.data = await resp.json();
      }
    } catch (e) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed authentication', e);
      }
      throw e;
    }

    return result;
  };

  return { fetchBillingPeriod, checkStripeCustomer };
}

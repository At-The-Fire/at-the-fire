import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useQuotaStore from '../stores/useQuotaStore.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../stores/useAuthStore.js';

export function useQuota(customerId) {
  const navigate = useNavigate();
  const { setError, isAuthenticated, error, user } = useAuthStore();

  const { monthlyQuota, workDays, quotaLoading, quotaError, fetchQuotaData } = useQuotaStore();

  const refreshQuotaData = useCallback(async () => {
    try {
      if (!user || !isAuthenticated || !customerId) {
        return;
      }

      await fetchQuotaData(customerId, { isAuthenticated, setError, navigate, error });
    } catch (e) {
      setError(e.code);

      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error fetching quota goals:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Error fetching quota goals: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'useQuota-1',
          autoClose: false,
        });
      }
    }
  }, [customerId, isAuthenticated, user, setError, fetchQuotaData, error, navigate]);

  useEffect(() => {
    refreshQuotaData();
  }, [refreshQuotaData]);

  return {
    monthlyQuota,
    workdays: workDays,
    quotaLoading,
    quotaError,
    refreshQuotaData,
  };
}

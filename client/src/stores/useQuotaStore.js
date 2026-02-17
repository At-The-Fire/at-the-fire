import { create } from 'zustand';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { fetchQuotaGoals } from '../services/fetch-quota-goals.js';
import { useAuthStore } from './useAuthStore.js';

const useQuotaStore = create((set) => ({
  // State
  monthlyQuota: 0,
  workDays: 0,
  quotaLoading: true,
  quotaError: null,

  // Actions
  setMonthlyQuota: (monthlyQuota) => set({ monthlyQuota }),
  setWorkDays: (workDays) => set({ workDays }),
  setQuotaLoading: (quotaLoading) => set({ quotaLoading }),
  setQuotaError: (quotaError) => set({ quotaError }),

  // Reset state
  reset: () =>
    set({
      monthlyQuota: 0,
      workDays: 0,
      quotaLoading: true,
      quotaError: null,
    }),

  // Fetch data action
  fetchQuotaData: async (customerId, { isAuthenticated, setError, navigate, error }) => {
    // Early return if conditions aren't met
    if (!isAuthenticated || !customerId || error === 401) {
      set({ quotaLoading: false });
      return;
    }

    set({ quotaLoading: true });

    try {
      const data = await fetchQuotaGoals();

      if (data === null) {
        set({
          quotaError: 'Unauthorized access - please log in.',
          quotaLoading: false,
        });
        navigate('/auth/sign-in');
        return;
      }

      if (data.length > 0) {
        set({
          workDays: data[0].work_days,
          monthlyQuota: data[0].monthly_quota,
          quotaLoading: false,
          quotaError: null,
        });
      } else {
        set({
          workDays: 0,
          monthlyQuota: 0,
          quotaLoading: false,
          quotaError: null,
        });
      }
    } catch (e) {
      setError(e.code);
      set({
        quotaError: e.message,
        quotaLoading: false,
      });

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
          toastId: 'useQuotaStore-1',
          autoClose: false,
        });
      }
    }
  },
}));

export default useQuotaStore;

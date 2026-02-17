import { create } from 'zustand';
import { useAuthStore } from './useAuthStore.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const useStripeStore = create((set, get) => ({
  stripeEmail: '',
  stripeName: '',
  loadingCustomerId: false,

  fetchStripeCustomerDetails: async () => {
    const { isAuthenticated, user } = useAuthStore.getState();

    if (!isAuthenticated || !user) return;

    set({ loadingCustomerId: true });
    try {
      const stripeCustomer = await get().checkStripeCustomer();

      set({
        stripeName: stripeCustomer.data.name,
        stripeEmail: stripeCustomer.data.email,
      });

      useAuthStore.setState({
        customerId: stripeCustomer.data?.customerId || null,
      });
    } catch (e) {
      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error checking for customer details:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Error checking for customer details: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'useStripeStore-1',
          autoClose: false,
        });
      }
    } finally {
      set({ loadingCustomerId: false });
    }
  },
}));

import { useEffect, useState } from 'react';
import { fetchOrders } from '../services/fetch-orders.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../stores/useAuthStore.js';

export function useOrders(customerId) {
  const [orders, setOrders] = useState([]);
  const [orderError, setOrderError] = useState('');
  const [orderLoading, setOrderLoading] = useState(true);
  const { isAuthenticated, error } = useAuthStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!isAuthenticated || !customerId || error === 401) {
          return;
        }
        setOrderLoading(true);
        const orders = await fetchOrders();
        if (orders) {
          setOrders(orders);
          setOrderLoading(false);
        } else {
          if (process.env.REACT_APP_APP_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Error fetching orders');
          }
          throw new Error('Error fetching orders');
        }
      } catch (e) {
        setOrderError(e.code);

        if (e.code === 401 || e.code === 403) {
          useAuthStore.getState().handleAuthError(e.code, e.message);
        } else {
          if (process.env.REACT_APP_APP_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Error fetching orders:', e);
          }
          useAuthStore.getState().setError(e.code);
          toast.error(`Error fetching orders: ${e.message}`, {
            theme: 'colored',
            draggable: true,
            draggablePercent: 60,
            toastId: 'useOrders-1',
            autoClose: false,
          });
        }
      }
    };

    fetchData();
  }, [customerId, error, isAuthenticated]);

  return {
    orders,
    setOrders,
    orderLoading,
    setOrderLoading,
    orderError,
    setOrderError,
  };
}

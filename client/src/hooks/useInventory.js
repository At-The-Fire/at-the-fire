// useInventory.js
import { useEffect } from 'react';
import { fetchInventorySnapshots } from '../services/fetch-inventory.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import useSnapshotStore from '../stores/useSnapshotStore.js';
import { useAuthStore } from '../stores/useAuthStore.js';

export function useInventory() {
  const navigate = useNavigate();
  const { isAuthenticated, setError, error, user, customerId } = useAuthStore();

  const { snapshots, inventoryLoading, setInventoryLoading, setSnapshots } = useSnapshotStore();

  useEffect(() => {
    const getSnapshots = async () => {
      try {
        if (!user || !isAuthenticated || !customerId || error === 401) {
          return;
        }
        setInventoryLoading(true);
        const data = await fetchInventorySnapshots();
        setSnapshots(data);
        setInventoryLoading(false);
      } catch (e) {
        setError(e.code);

        if (e.code === 401 || e.code === 403) {
          useAuthStore.getState().handleAuthError(e.code, e.message);
        } else {
          if (process.env.REACT_APP_APP_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Error fetching inventory:', e);
          }
          useAuthStore.getState().setError(e.code);
          toast.error(`Error fetching inventory: ${e.message}`, {
            theme: 'colored',
            draggable: true,
            draggablePercent: 60,
            toastId: 'useInventory-1',
            autoClose: false,
          });
        }
      }
    };

    getSnapshots();
  }, [isAuthenticated, navigate, error, customerId, user, setInventoryLoading, setSnapshots, setError]);

  return { snapshots, inventoryLoading };
}

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../stores/useAuthStore.js';
const useFetchProfile = (sub) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const REACT_APP_BASE_URL = process.env.REACT_APP_BASE_URL;

  useEffect(() => {
    const fetchData = async () => {
      if (!sub) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`${REACT_APP_BASE_URL}/api/v1/profile/${sub}`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();

          setProfile(data.profile);
        } else {
          throw new Error('Failed to fetch profile');
        }
      } catch (e) {
        setError(e);

        if (e.code === 401 || e.code === 403) {
          useAuthStore.getState().handleAuthError(e.code, e.message);
        } else {
          if (process.env.REACT_APP_APP_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Error fetching profile:', e);
          }
          useAuthStore.getState().setError(e.code);
          toast.error(`Error fetching profile: ${e.message}`, {
            theme: 'colored',
            draggable: true,
            draggablePercent: 60,
            toastId: 'useFetchProfile-1',
            autoClose: false,
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData(); // Initial fetch
  }, [REACT_APP_BASE_URL, sub]); // Refetch when fetchData function changes

  return { profile, loading, error };
};

export default useFetchProfile;

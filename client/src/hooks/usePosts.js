import { useEffect } from 'react';
import usePostStore from '../stores/usePostStore';
import { fetchPosts } from '../services/fetch-utils.js';
import { toast } from 'react-toastify';
import { useAuthStore } from '../stores/useAuthStore.js';

export function usePosts() {
  const { setPosts, setLoading, setRestricted, setPostError } = usePostStore();
  const { user, isAuthenticated, customerId } = useAuthStore();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Start loading

      // Early return if required conditions are not met
      if (!user || !isAuthenticated || !customerId) {
        setLoading(false); // Stop loading on early exit
        return;
      }

      try {
        const data = await fetchPosts();

        setPosts(data.posts || []);
        setRestricted(data.restricted || false);
        setLoading(false);
      } catch (e) {
        setPostError(e.message);
        setLoading(false);

        if (e.code === 401 || e.code === 403) {
          useAuthStore.getState().handleAuthError(e.code, e.message);
        } else {
          if (process.env.REACT_APP_APP_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Error fetching posts:', e);
          }
          useAuthStore.getState().setError(e.code);
          toast.error(`Error fetching posts: ${e.message}`, {
            theme: 'colored',
            draggable: true,
            draggablePercent: 60,
            toastId: 'usePosts-1',
            autoClose: false,
          });
        }
      }
    };

    fetchData();
  }, []);
}

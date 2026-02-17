import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../stores/useAuthStore.js';

const BASE_URL = process.env.REACT_APP_BASE_URL;

export function useProfile(sub) {
  const [error, setError] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);

  // AWS Cognito related data:
  const [profile, setProfile] = useState({});

  // Strtipe related data:
  const [bizProfile, setBizProfile] = useState({});

  // Profile posts related data:
  const [posts, setPosts] = useState([]);

  const fetchProfile = useCallback(async () => {
    if (!sub) return;
    try {
      setProfileLoading(true);
      const resp = await fetch(`${BASE_URL}/api/v1/profile/${sub}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store', // Bypass cache to avoid old data
      });

      if (resp.status === 404) {
        setError('Profile not found.');
        // throw new Error('Profile not found'); // This will be caught by the catch block
        toast.warn(`Profile not found. `, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'profileContext-1',
          autoClose: true,
        });
        setProfile(null);

        return;
      }

      if (!resp.ok) {
        throw new Error('Failed to fetch profile.');
      }

      const data = await resp.json();
      if (data.profile === null) {
        setProfile(null);
        return;
      }

      setProfile(data.profile);
      setBizProfile(data.bizProfile);
      setPosts(data.posts);
      setProfileLoading(false);
    } catch (e) {
      setError(e.message);
      setProfile(null);

      setProfileLoading(false);

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
          toastId: 'useProfile-1',
          autoClose: false,
        });
      }
    } finally {
      setProfileLoading(false);
    }
  }, [sub]);

  useEffect(() => {
    // Using an immediately-invoked async function inside useEffect
    (async () => {
      await fetchProfile(); // Directly await the profile fetching
    })();
  }, [fetchProfile]);

  // needed for user edit
  const updateProfile = async (updatedData) => {
    try {
      const resp = await fetch(`${BASE_URL}/api/v1/profile/user-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedData),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.message);
      }

      // Set the state directly from the update response
      setProfile(data.profile);

      // Then, re-fetch the data after the update to ensure frontend matches backend
      await fetchProfile();
      setProfileLoading(false);
    } catch (e) {
      setError(e.message);

      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error updating profile:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Error updating profile: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'useProfile-2',
          autoClose: false,
        });
      }
    }
  };

  // needed for subscriber edit
  const updateBizProfile = async (updatedBizData) => {
    try {
      const resp = await fetch(`${BASE_URL}/api/v1/profile/customer-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedBizData),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error('Error updating business profile.', data.message);
      }

      // Assuming your backend returns the updated biz profile in the same structure
      setBizProfile(data);
    } catch (e) {
      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error updating business profile:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Error updating business profile: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'useProfile-3',
          autoClose: false,
        });
      }
    }
  };

  return {
    error,
    profileLoading,
    profile,
    bizProfile,
    updateProfile,
    updateBizProfile,
    posts,
    fetchProfile, // needed for public profile data- no error missing just no data
  };
}

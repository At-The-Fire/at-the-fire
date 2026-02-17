// hooks/useFollowOperations.js
import { useEffect } from 'react';
import { useFollowStore } from '../stores/useFollowerStore.js';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const BASE_URL = process.env.REACT_APP_BASE_URL;

export const useFollowOperations = (userId) => {
  const { updateFollowStatus, incrementFollowerCount, decrementFollowerCount } = useFollowStore();

  const navigate = useNavigate();

  const handleFollow = async () => {
    try {
      await fetch(`${BASE_URL}/api/v1/followers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ followedId: userId }),
      });

      updateFollowStatus(userId, true);
      incrementFollowerCount(userId);
    } catch (e) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error fetching gallery post:', e);
      }
      useAuthStore.getState().setError(e.code);
      toast.error(`Error following user: ${e.message}`, {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'useFollowers-1',
        onClose: () => navigate('/'),
      });
    }
  };

  const handleUnfollow = async () => {
    try {
      await fetch(`${BASE_URL}/api/v1/followers/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      updateFollowStatus(userId, false);
      decrementFollowerCount(userId);
    } catch (e) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error fetching gallery post:', e);
      }
      useAuthStore.getState().setError(e.code);
      toast.error(`Error unfollowing user: ${e.message}`, {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'useFollowers-2',
        onClose: () => navigate('/'),
      });
    }
  };

  return { handleFollow, handleUnfollow };
};

export const useFollowerCount = (userId) => {
  const { followerCounts, setFollowerCounts } = useFollowStore();

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/v1/followers/count/${userId}`, {
          credentials: 'include',
        });
        const counts = await response.json();
        setFollowerCounts(userId, counts);
      } catch (error) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          console.error('Error fetching follower counts:', error);
        }
      }
    };

    if (!followerCounts[userId]) {
      fetchCounts();
    }
  }, [userId]);

  return followerCounts[userId];
};

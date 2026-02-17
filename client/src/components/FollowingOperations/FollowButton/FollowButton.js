import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../stores/useAuthStore.js';
import { Button, useMediaQuery } from '@mui/material';
import './FollowButton.css';
import { useFollowStore } from '../../../stores/useFollowerStore.js';
import { useQuery } from '../../../context/QueryContext.js';
import { useTheme } from '@emotion/react';
import { fetchFollowStatus, followUser, unfollowUser } from '../../../services/fetch-followers.js';

const FollowButton = ({ userId, initialIsFollowing = false, profileLoading }) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();

  const { setNewPostCreated } = useQuery();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    // Check initial follow status
    const checkFollowStatus = async () => {
      try {
        const status = await fetchFollowStatus(userId);
        setIsFollowing(status.isFollowing);
      } catch (error) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          console.error('Error checking follow status:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkFollowStatus();
  }, [userId]);

  const handleFollowToggle = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      if (isFollowing) {
        await unfollowUser(userId);
        useFollowStore.getState().decrementFollowerCount(userId);
        useFollowStore.getState().decrementFollowingCount(user); // logged-in user's following
      } else {
        await followUser(userId);
        useFollowStore.getState().incrementFollowerCount(userId);
        useFollowStore.getState().incrementFollowingCount(user); // logged-in user's following
      }
      setNewPostCreated((prevState) => !prevState); // Toggle newPostCreated to refresh gallery state
      setIsFollowing(!isFollowing);
    } catch (error) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        console.error('Follow toggle error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show button if it's your own profile
  if (user === userId) return null;

  return profileLoading ? (
    <div className="spinner" />
  ) : (
    <Button
      onClick={handleFollowToggle}
      variant={isFollowing ? '' : 'contained'}
      disabled={isLoading || !user}
      sx={{
        fontSize: isMobile ? '1rem' : '1rem',
        padding: '3px 8px',
        height: isMobile ? '1.5rem' : '100%',
        border: isFollowing ? '1px solid green' : '',
      }}
    >
      {isLoading ? <div className="spinner" /> : isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
};

export default FollowButton;

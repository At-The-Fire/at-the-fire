import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Avatar, Button } from '@mui/material';
import FollowButton from '../FollowButton/FollowButton.js';
import { useAuthStore } from '../../../stores/useAuthStore.js';
import { useNavigate } from 'react-router-dom';
import { fetchAllFollowing } from '../../../services/fetch-followers.js';

const FollowingList = ({ userId, setOpen }) => {
  const [following, setFollowing] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuthStore();
  const BASE_URL = process.env.REACT_APP_BASE_URL;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        setIsLoading(true);
        const following = await fetchAllFollowing(userId);
        setFollowing(following);
      } catch (err) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          console.error('Error fetching following:', err);
        }
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowing();
  }, [userId, BASE_URL]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={200}>
        <div className="spinner" />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" textAlign="center" padding={2}>
        Error loading following: {error}
      </Typography>
    );
  }

  if (following.length === 0) {
    return (
      <Typography color="text.secondary" textAlign="center" padding={2}>
        Not following anyone yet
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {following.map((followed) => (
        <Card key={followed.sub}>
          <CardContent
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px',
              margin: 0,
              '&:last-child': { padding: '4px 4px 4px 8px ' },
            }}
          >
            <Box
              onClick={() => {
                navigate(`/profile/${followed.sub}`);
                setOpen(false);
              }}
              sx={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              {' '}
              <Avatar
                src={followed.logo_image_url || followed.image_url}
                alt={`${followed.display_name || followed.first_name}'s avatar`}
              />
              <Box>
                <Typography variant="subtitle1">
                  {followed.display_name || `${followed.first_name} ${followed.last_name}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Following since {new Date(followed.following_since).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
            {user && user?.sub !== followed.sub && <FollowButton userId={followed.sub} initialIsFollowing={true} />}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default FollowingList;

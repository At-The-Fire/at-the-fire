import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Avatar } from '@mui/material';
import FollowButton from '../FollowButton/FollowButton.js';
import { useAuthStore } from '../../../stores/useAuthStore.js';
import { useNavigate } from 'react-router-dom';
import { fetchAllFollowers } from '../../../services/fetch-followers.js';

const FollowersList = ({ userId, setOpen }) => {
  const [followers, setFollowers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFollowers = async () => {
      try {
        setIsLoading(true);
        const followers = await fetchAllFollowers(userId);
        setFollowers(followers);
      } catch (err) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          console.error('Error fetching followers:', err);
        }
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowers();
  }, [userId]);

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
        Error loading followers: {error}
      </Typography>
    );
  }

  if (followers.length === 0) {
    return (
      <Typography color="text.secondary" textAlign="center" padding={2}>
        No followers yet
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {followers.map((follower) => (
        <Card key={follower.sub}>
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
                navigate(`/profile/${follower.sub}`);
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
                src={follower.logo_image_url || follower.image_url}
                alt={`${follower.display_name || follower.first_name}'s avatar`}
              />
              <Box>
                <Typography variant="subtitle1">
                  {follower.display_name || `${follower.first_name} ${follower.last_name}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Following since {new Date(follower.followed_since).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
            {user && user.sub !== follower.sub && <FollowButton userId={follower.sub} />}{' '}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default FollowersList;

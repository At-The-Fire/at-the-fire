import { Box, Container, Typography } from '@mui/material';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../../../stores/useAuthStore.js';
const logo = require('../../../assets/logo-icon-6.png');

export default function Success() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5); // Start with 5 seconds
  const { authenticateUser, isAuthenticated } = useAuthStore();
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prevCountdown) => prevCountdown - 1);
    }, 1000);

    if (countdown === 0) {
      navigate('/dashboard');
    }

    return () => clearInterval(timer); // Clear interval on component unmount
  }, [countdown, navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      authenticateUser();
    }
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}
    >
      <Container maxWidth="xs">
        <Typography
          variant="h2"
          color="primary.light"
          sx={{ fontFamily: 'monospace', marginTop: '50px' }}
        >
          Success!
        </Typography>
        <Typography variant="h4" color="primary.light">
          Welcome to
        </Typography>
        <img
          className="logo-success-page"
          width="640"
          height="360"
          src={logo}
          alt={'site logo'}
          style={{
            height: 'auto',
            objectFit: 'contain',
            maxWidth: '175px',
            borderRadius: '50%',
            scale: '1',
            margin: '2rem 0 0 0',
          }}
        />
        <Typography
          variant="h1"
          color="primary.dark"
          sx={{ fontFamily: 'Reenie Beanie', margin: '0 0 3rem 0' }}
        >
          At The Fire
        </Typography>
        <Typography variant="h6">Enjoy your subscription.</Typography>
        <Typography
          onClick={() => {
            navigate('/dashboard');
          }}
          sx={{
            display: 'block',
            cursor: 'pointer',
            width: '50%',
            margin: '2rem auto',
          }}
        >
          {' '}
          This page will redirect in {countdown} second{countdown !== 1 ? 's' : ''}, click here if
          not.
        </Typography>
      </Container>
    </Box>
  );
}

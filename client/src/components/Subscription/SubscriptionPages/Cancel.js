import { Box, Container, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteOnCancel } from '../../../services/stripe.js';

import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../../../stores/useAuthStore.js';
export default function Cancel() {
  const navigate = useNavigate();
  const { authenticateUser, isAuthenticated, error, signingOut, checkTokenExpiry } = useAuthStore();

  const [countdown, setCountdown] = useState(5); // Start with 5 seconds

  // Deletion logic
  useEffect(() => {
    async function performDeletion() {
      try {
        await deleteOnCancel();
      } catch (e) {
        if (e.code === 401 || e.code === 403) {
          useAuthStore.getState().handleAuthError(e.code, e.message);
        } else {
          if (process.env.REACT_APP_APP_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Error cancelling order:', e);
          }
          useAuthStore.getState().setError(e.code);
          toast.error(`Error cancelling order: ${e.message}`, {
            theme: 'colored',
            draggable: true,
            draggablePercent: 60,
            toastId: 'cancel-1',
            autoClose: false,
          });
        }
      }
    }
    performDeletion();
  }, []);

  // authenticate and check tokens
  useEffect(() => {
    if (!isAuthenticated && !error && !signingOut) {
      authenticateUser();
    } else if (isAuthenticated) {
      // If we are authenticated, check token expiry
      checkTokenExpiry();
    }
  }, [isAuthenticated, error, authenticateUser, signingOut, checkTokenExpiry]);

  // Navigation logic
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prevCountdown) => prevCountdown - 1);
    }, 1000);

    if (countdown === 0) {
      navigate('/subscription');
    }

    return () => clearInterval(timer);
  }, [countdown, navigate]);

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
        <Typography variant="h1" color="error">
          Canceled Operation
        </Typography>
        <Typography variant="h6">please try again, or contact support if the problem persists.</Typography>
        <Typography
          onClick={() => {
            navigate('/');
          }}
          sx={{
            display: 'block',
            cursor: 'pointer',
            width: '50%',
            margin: '2rem auto',
          }}
        >
          {' '}
          This page will redirect in {countdown} second{countdown !== 1 ? 's' : ''}, click here if not.
        </Typography>
      </Container>
    </Box>
  );
}

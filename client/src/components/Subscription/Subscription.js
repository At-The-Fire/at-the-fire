/* eslint-disable no-console */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress, Container } from '@mui/material';
import { useTheme } from '@emotion/react';
import './Subscription.css';

import useLoadingState from '../../context/LoadingContext.js';

import SubscriptionLandingPage from './SubscriptionPages/LandingPageComponents/SubscriptionLandingPage.js';
import Cancel from './SubscriptionPages/Cancel.js';
import Success from './SubscriptionPages/Success.js';

import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useSubscriptionStageManager } from '../../hooks/useSubscriptionStageManager.js';
import { useAuthStore } from '../../stores/useAuthStore.js';
export default function Subscription() {
  const { stage, setStage } = useSubscriptionStageManager();
  const { pageLoading } = useLoadingState();
  const { result } = useParams();
  const theme = useTheme();

  // Retrieve the state from local storage and set it
  useEffect(() => {
    const storedState = localStorage.getItem('subscriptionStage');
    if (storedState) {
      try {
        const parsedState = JSON.parse(storedState);
        setStage(parsedState);
      } catch (e) {
        if (e.code === 401 || e.code === 403) {
          useAuthStore.getState().handleAuthError(e.code, e.message);
        } else {
          if (process.env.REACT_APP_APP_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Error parsing stored state:', e);
          }
          useAuthStore.getState().setError(e.code);
          toast.error(`Error parsing stored state: ${e.message}`, {
            theme: 'colored',
            draggable: true,
            draggablePercent: 60,
            toastId: 'subscription-1',
            autoClose: false,
          });
        }
      }
    }
  }, [setStage]);

  return (
    <>
      {pageLoading ? (
        <CircularProgress />
      ) : (
        <Box className={'subscribe-wrapper'}>
          <Container
            className="subscribe-container"
            maxWidth="xl"
            sx={{
              gap: theme.spacing(3),
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {stage === 0 && <SubscriptionLandingPage />}
            {stage === 2 && (result === 'success' ? <Success /> : result === 'cancel' ? <Cancel /> : null)}
          </Container>
        </Box>
      )}
    </>
  );
}

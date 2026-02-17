import React, { useState, useEffect } from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import '../../Subscription.css';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { fetchStripeSubscribe } from '../../../../services/stripe.js';

import SubscriptionButtons from './SubscriptionButtons.js';
import PurchaseFormInfo from './PurchaseFormInfo.js';
import SubscriptionInputs from './SubscriptionInputs.js';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionStageManager } from '../../../../hooks/useSubscriptionStageManager.js';
import { useAuthStore } from '../../../../stores/useAuthStore.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
export default function SubscriptionFormPage() {
  const { setStage } = useSubscriptionStageManager();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');

  const { isAuthenticated, user, customerId, stripeName, stripeEmail, fetchStripeCustomerDetails } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStripeCustomerDetails();
  }, [fetchStripeCustomerDetails]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/sign-in');
      return;
    }
  }, []);

  // Prefill customer information if it exists
  useEffect(() => {
    if (customerId) {
      const [first, ...last] = stripeName.split(' ');
      setFirstName(first || '');
      setLastName(last.join(' ') || '');
      setBillingEmail(stripeEmail || '');
    }
  }, [customerId, stripeEmail, stripeName]);

  const handleClickSubscribe = async (e) => {
    const priceId = e.target.value;
    try {
      const data = await fetchStripeSubscribe({
        priceId,
        firstName,
        lastName,
        billingEmail,
        awsSub: user,
        setStage,
        customerId,
      });
      return data;
    } catch (e) {
      if (e.code !== 401 && e.code !== 403) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error subscribing:', e);
        }
        toast.error(`Error subscribing: ${e.error || e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
        });
      }
    }
  };

  return (
    <Box
      sx={{
        padding: '90px 0 0 0',
        display: 'flex',
        height: '100%',
        flexDirection: 'column',
        gap: (theme) => theme.spacing(2),
        justifyContent: 'space-evenly',
        alignItems: 'center',
      }}
    >
      <PurchaseFormInfo />

      <Container
        className="purchase-subscription-container"
        maxWidth="xs"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: (theme) => theme.spacing(2),
        }}
      >
        {customerId ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: (theme) => theme.spacing(2),
            }}
          >
            <Typography variant="h6">Your Information:</Typography>
            <Typography>
              {firstName} {lastName}
            </Typography>
            <Typography>{billingEmail}</Typography>

            <SubscriptionButtons {...{ handleClickSubscribe }} />
          </Box>
        ) : (
          <Box
            component={'form'}
            className="purchase-form"
            onClick={(e) => e.preventDefault()}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: (theme) => theme.spacing(2),
              justifyContent: 'flex-start',
            }}
          >
            <SubscriptionInputs
              {...{ firstName, setFirstName, lastName, setLastName, billingEmail, setBillingEmail }}
            />

            <SubscriptionButtons {...{ handleClickSubscribe }} />
          </Box>
        )}
      </Container>

      <Button
        variant="contained"
        color="primary"
        startIcon={<ArrowBackIcon />}
        onClick={() => (!customerId ? navigate('/subscription') : navigate('/dashboard'))}
      >
        Back
      </Button>
    </Box>
  );
}

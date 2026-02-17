import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Typography, CircularProgress, Avatar } from '@mui/material';
import './DashboardSubMgt.css';

import useLoadingState from '../../../../context/LoadingContext.js';
import useStripeCustomer from '../../../../hooks/useStripeCustomer.js';
import { fetchStripeCustomerPortal } from '../../../../services/stripe.js';
import FlamePipe from '../../../../components/FlamePipe/FlamePipe.js';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import usePostStore from '../../../../stores/usePostStore.js';
import { useAuthStore } from '../../../../stores/useAuthStore.js';
export default function Dashboard() {
  const [startDate, setStartDate] = useState();
  const [endDate, setEndDate] = useState();
  const [daysRemaining, setDaysRemaining] = useState();
  const [trialSubscription, setTrialSubscription] = useState();

  const { isAuthenticated, handleSignOut, email, setUser, setIsAuthenticated, setCustomerId, customerId, trialStatus } =
    useAuthStore();

  const { fetchBillingPeriod } = useStripeCustomer();
  const navigate = useNavigate();
  const { pageLoading, setPageLoading } = useLoadingState();
  const { restricted } = usePostStore();

  useEffect(() => {
    if (isAuthenticated && customerId) {
      const getBillingPeriod = async () => {
        try {
          const { startDate, endDate, trialStatus } = await fetchBillingPeriod();

          const { isTrialing, endsAt, daysRemaining } = trialStatus;

          // If either date is undefined or null, then don't proceed further.
          if (!startDate || !endDate) return;

          const billingStart = new Date(startDate * 1000);
          const billingEnd = new Date(endDate * 1000);
          setStartDate(billingStart.toLocaleDateString());
          setEndDate(billingEnd.toLocaleDateString());
          setDaysRemaining(daysRemaining);
          setTrialSubscription(isTrialing);
        } catch (e) {
          if (e.code === 401 || e.code === 403) {
            useAuthStore.getState().handleAuthError(e.code, e.message);
          } else {
            if (process.env.REACT_APP_APP_ENV === 'development') {
              // eslint-disable-next-line no-console
              console.error('Error fetching billing period:', e);
            }
            useAuthStore.getState().setError(e.code);
            toast.error(`Error fetching billing period: ${e.message}`, {
              theme: 'colored',
              draggable: true,
              draggablePercent: 60,
              toastId: 'dashboardSubMgt-1',
              autoClose: false,
            });
          }
        }
      };

      getBillingPeriod();
    }
  }, [
    isAuthenticated,
    navigate,
    customerId,
    fetchBillingPeriod,
    handleSignOut,
    email,
    setIsAuthenticated,
    setCustomerId,
    setUser,
  ]);

  const handleOpenCustomerPortal = async () => {
    setPageLoading(true);
    try {
      const data = await fetchStripeCustomerPortal({ customerId });
      if (!data.ok) {
        throw new Error({ code: data.status, message: data.error });
      }
      return data;
    } catch (e) {
      if (e.code !== 401 && e.code !== 403) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error contacting Stripe :', e);
        }
        toast.error(`Error contacting Stripe: Please try again later or contact support`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
        });
      } else {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      }
    } finally {
      setPageLoading(false);
    }
  };

  const oldCustomerNewSubscription = () => {
    navigate('/subscription/form');
  };

  return (
    <>
      {!pageLoading ? (
        <Box className={'dashboard-wrapper'}>
          <Container className={'dashboard-container'} maxWidth="xl">
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: (theme) => theme.spacing(2),
                border: 'solid 2px',
                borderColor: (theme) => theme.palette.primary.dark,
              }}
            >
              {!restricted ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '300px',
                    borderRadius: '5px',
                    backgroundColor: (theme) => {
                      theme.palette.primary.light;
                    },
                  }}
                >
                  <Box display={'flex'}>
                    <Box className={''}>
                      <CheckBoxOutlinedIcon
                        sx={{
                          backgroundColor: 'green',
                        }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        textAlign: 'center',
                        alignContent: 'center',
                        paddingLeft: '10px',
                        color: trialSubscription ? { color: 'yellow' } : (theme) => theme.palette.primary.light,
                      }}
                    >
                      {trialSubscription
                        ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} of your free trial remain`
                        : 'Your subscription is active'}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '16px',
                      justifyContent: 'space-between',
                      margin: '0 8px',
                    }}
                  >
                    {' '}
                    <Typography variant="body1">Subscription Started On:</Typography>
                    <Typography variant="body2">{startDate}</Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '16px',
                      margin: '0 8px',
                      justifyContent: 'space-between',
                      paddingBottom: '8px',
                    }}
                  >
                    <Typography variant="body1">Subscription Will End On:</Typography>
                    <Typography variant="body2">{endDate}</Typography>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', backgroundColor: 'yellow', color: 'black', width: '100%' }}>
                  <Box className={'expired-subscription'}></Box>
                  <Typography variant="body2" textAlign={'center'} padding={'10px'}>
                    Your subscription is no longer active!
                  </Typography>
                </Box>
              )}
            </Box>
            {!restricted ? (
              <Button
                size="small"
                variant="contained"
                onClick={handleOpenCustomerPortal}
                startIcon={<AccountBalanceOutlinedIcon />}
                sx={{ width: '300px', borderRadius: '5px', marginTop: '8px' }}
              >
                Subscription Billing
              </Button>
            ) : (
              <Button
                size="small"
                variant="contained"
                onClick={oldCustomerNewSubscription}
                sx={{ width: '300px' }}
                startIcon={<AccountBalanceOutlinedIcon />}
              >
                Renew Subscription
              </Button>
            )}
          </Container>
        </Box>
      ) : (
        <FlamePipe />
      )}
    </>
  );
}

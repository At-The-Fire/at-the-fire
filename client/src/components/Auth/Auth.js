import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Auth.css';
import { Box, Container, Paper, Button, Typography, useMediaQuery, Link } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SignUp from './AuthForms.js/SignUp.js';
import SignIn from './AuthForms.js/SignIn.js';
import ForgotPassword from './AuthForms.js/ForgotPassword.js';
import FlamePipe from '../FlamePipe/FlamePipe.js';
import useLoadingState from '../../context/LoadingContext.js';
import ChangeAuthForm from './AuthForms.js/ChangeAuthForm.js';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { toast } from 'react-toastify';
import PasswordChange from './AuthForms.js/PasswordChange.js';

export default function Auth() {
  const { type } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const {
    isAuthenticated,
    user,
    loadingAuth,
    loadingCustomerId,
    customerId,
    admin,
    signingOut,
    challengeName,
    authenticateUser,
  } = useAuthStore();

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { loginLoading, pageLoading } = useLoadingState();

  // for sign up- if user hasn't verified email yet, show toast
  const needsVerification = localStorage.getItem('needsVerification');

  // check auth
  useEffect(() => {
    if (!isAuthenticated) {
      authenticateUser();
    }
  }, []);

  useEffect(() => {
    if (needsVerification === 'true') {
      toast.success(
        `Successful sign up!  Please check your email to verify your account. (This may take a few minutes!) `,
        {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'useAuth-1',
          autoClose: false,
        }
      );
      localStorage.removeItem('needsVerification');
    }
  }, [needsVerification]);

  useEffect(() => {
    if (challengeName === 'NEW_PASSWORD_REQUIRED') {
      navigate('/auth/change-password');
    }
  }, [challengeName, navigate]);

  useEffect(() => {
    // Don't navigate while still loading
    if (loadingAuth || loadingCustomerId || signingOut) {
      return;
    }

    // Don't navigate if not authenticated or needs verification
    if (!isAuthenticated || needsVerification) {
      return;
    }

    // Don't navigate if we don't have user info
    if (!user) {
      return;
    }

    // Now we can safely navigate based on customerId
    if (customerId && admin === true) {
      navigate('/at-the-bon-fire');
    } else if (customerId) {
      navigate('/dashboard');
    } else {
      navigate(`/profile/${user}`);
    }
  }, [
    isAuthenticated,
    user,
    // customerId,
    // needsVerification,
    loadingAuth,
    loadingCustomerId,
    // navigate,
    // admin,
    // signingOut,   //! commented out trying to root out an infinite loop auth WORKS leave out for now 1.17.25
  ]);

  const authForms = () => {
    switch (type) {
      case 'sign-in':
        return <SignIn />;

      case 'sign-up':
        return <SignUp />;

      case 'forgot-password':
        return <ForgotPassword />;

      case 'change-password':
        return <PasswordChange />;
      default:
        break;
    }
  };

  const handleTermsOfServiceNav = () => {
    navigate('/terms-of-service');
  };

  return (
    <>
      {!loginLoading && !pageLoading && !loadingAuth ? (
        <Box className={'auth-form-wrapper'}>
          <Container maxWidth={'xs'} className={'auth-form-container'}>
            <Box
              sx={{
                textAlign: 'left',
                padding: '10px',
                border: '1px solid green',
                marginBottom: '10px',
              }}
            >
              {' '}
              Welcome! <span style={{ color: 'yellow' }}>Official sign up is currently disabled</span> however If you
              would like to sign up for the waiting list you may on our <Link href="/contact">Contact page</Link>
            </Box>
            <Box className="form-container" component={'form'} onSubmit={(e) => e.preventDefault()}>
              <Paper className="form-container-paper" elevation={4}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: theme.spacing(2),
                    height: '100%',
                    justifyContent: 'space-evenly',
                  }}
                >
                  {authForms()}
                </Box>
                <Container maxWidth="sm" className="sign-in-sign-out">
                  <ChangeAuthForm type={type} />
                </Container>
                {<Button onClick={handleTermsOfServiceNav}>Terms of Service</Button>}
              </Paper>
            </Box>
          </Container>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            margin: isMobile ? '150px' : '300px',
          }}
        >
          <Typography variant="h5" sx={{ color: (theme) => theme.palette.primary.light }}>
            Logging in <span className="animated-ellipsis">.</span>
            <span className="animated-ellipsis">.</span>
            <span className="animated-ellipsis ">.</span>{' '}
          </Typography>
          <FlamePipe />
        </Box>
      )}
    </>
  );
}

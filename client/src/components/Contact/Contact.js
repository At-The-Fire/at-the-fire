import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Modal,
  Typography,
  useMediaQuery,
} from '@mui/material';
import useLoadingState from '../../context/LoadingContext.js';
import './Contact.css';
import { Close } from '@mui/icons-material';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { useTheme } from '@emotion/react';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'min(calc(100vw - 48px), 600px)',
  height: 'max(calc(100vh - 150px), 500px)',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 1,
};

export default function Contact() {
  const [open, setOpen] = useState(false);
  const [googleFormSource, setGoogleFormSource] = useState('');
  const [loading, setLoading] = useState(false);

  const { authenticateUser, isAuthenticated, error, signingOut, checkTokenExpiry } = useAuthStore();

  const handleClose = () => setOpen(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { pageLoading } = useLoadingState();

  // authenticate and check tokens
  useEffect(() => {
    if (!isAuthenticated && !error && !signingOut) {
      authenticateUser();
    } else if (isAuthenticated) {
      // If we are authenticated, check token expiry
      checkTokenExpiry();
    }
  }, [isAuthenticated, error, authenticateUser, signingOut, checkTokenExpiry]);
  const handleOpen = (e) => {
    setLoading(true);

    const formName = e.currentTarget.name;
    switch (formName) {
      case 'feedback':
        setGoogleFormSource(
          'https://docs.google.com/forms/d/e/1FAIpQLSfDkaJ3-VsOtSZ97v73qLowYRxz3YC7yiTMz68NoHr_DCmJWQ/viewform?embedded=true'
        );
        break;
      case 'suggestions':
        setGoogleFormSource(
          'https://docs.google.com/forms/d/e/1FAIpQLScOne2NEcp0bSscvyJrM-WcdAEtsrwEn3Qr4uKsQN-kZCtFEg/viewform?embedded=true'
        );
        break;
      case 'bug-report':
        setGoogleFormSource(
          'https://docs.google.com/forms/d/e/1FAIpQLSfn_TeVGzzAV1C7vrQFYiDWbirYNKK_jwebyShwMm0SoIHYFA/viewform?embedded=true'
        );
        break;
      case 'contact':
        setGoogleFormSource(
          'https://docs.google.com/forms/d/e/1FAIpQLSfc36-v3ttb0s3FLwAcGJ4DnGYmzyPnkXfNGywLI93s-gri4w/viewform?embedded=true'
        );
        break;
      case 'report-scammer':
        setGoogleFormSource(
          'https://docs.google.com/forms/d/e/1FAIpQLSfFBs1VrSJ3FBPzfR-YjERmrCw-7-n2CrN2Ve52oEdmX6GxQg/viewform?embedded=true'
        );
        break;
      case 'sign-up-list':
        setGoogleFormSource(
          'https://docs.google.com/forms/d/e/1FAIpQLSd1qPyFnfSPOzq4dwRK_fzfRYz-Tfmrm0j5JAeFj-rbSV2Y1A/viewform?embedded=true'
        );
        break;

      default:
        break;
    }

    setLoading(false);
    setOpen(true);
  };

  return (
    <Box
      sx={{
        paddingTop: '80px',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      {loading || pageLoading ? (
        <CircularProgress />
      ) : (
        <Container
          maxWidth="sm"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: (theme) => theme.spacing(2),
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ textAlign: 'center' }}>
              Need to contact the developers?
            </Typography>
            <Divider sx={{ marginY: (theme) => theme.spacing(1) }} />
            <Typography variant="body1" sx={{ textAlign: 'center' }}>
              {`We value your input and are committed to making this a better platform for everyone.  Please reach out if you need help or have feedback.`}
            </Typography>
          </Box>
          <Button
            className="feedback-button"
            size="large"
            name="sign-up-list"
            onClick={handleOpen}
            variant="contained"
            sx={{
              fontSize: '1.2rem',
              fontWeight: 'bold',
              width: 'min(100%, 320px)',
              margin: '0 auto',
              mb: 1,
            }}
          >
            Join the Waitlist & Beta Testing
          </Button>
          <Button
            className="feedback-button"
            size="large"
            name="suggestions"
            onClick={handleOpen}
            variant="outlined"
            sx={{ width: 'min(100%, 320px)', margin: '0 auto', mb: 1 }}
          >
            Suggestions
          </Button>
          <Button
            className="feedback-button"
            size="large"
            name="feedback"
            onClick={handleOpen}
            variant="outlined"
            sx={{ width: 'min(100%, 320px)', margin: '0 auto', mb: 1 }}
          >
            Give Feedback
          </Button>
          <Button
            className="feedback-button"
            size="large"
            name="bug-report"
            onClick={handleOpen}
            variant="outlined"
            sx={{ width: 'min(100%, 320px)', margin: '0 auto', mb: 1 }}
          >
            Report A Bug
          </Button>
          <Button
            className="feedback-button"
            size="large"
            name="report-scammer"
            onClick={handleOpen}
            variant="outlined"
            sx={{ width: 'min(100%, 320px)', margin: '0 auto', mb: 1 }}
          >
            Report a Scammer
          </Button>
          <Button
            className="feedback-button"
            size="large"
            name="contact"
            onClick={handleOpen}
            variant="outlined"
            sx={{ width: 'min(100%, 320px)', margin: '0 auto', mb: 1 }}
          >
            Need HELP? Contact Us
          </Button>
          <Box>
            <Divider sx={{ marginY: (theme) => theme.spacing(1) }} />
            <Typography variant="h4" sx={{ textAlign: 'center', marginBottom: '40px' }}>
              Thank you, have a wonderful day!
            </Typography>
          </Box>
          <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="keep-mounted-modal-title"
            aria-describedby="keep-mounted-modal-description"
          >
            <Box content="frame-ancestors" sx={style}>
              <IconButton sx={{ padding: 0, position: 'absolute' }} onClick={handleClose}>
                <Close sx={{ mixBlendMode: 'difference' }} />
              </IconButton>
              <iframe
                style={{ border: 'none', display: 'flex', flexGrow: 1 }}
                src={googleFormSource}
                width="100%"
                height="100%"
              >
                Loading…
              </iframe>
            </Box>
          </Modal>
        </Container>
      )}
    </Box>
  );
}

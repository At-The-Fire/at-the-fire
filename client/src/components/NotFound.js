import { Box, Container, Typography, keyframes } from '@mui/material';
import React, { useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore.js';
import FlamePipe from '../components/FlamePipe/FlamePipe.js';

const bounce = keyframes`
  0%, 100% {
    transform: translate(0, 0);
  }
  8.33% {
    transform: translate(100px, 50px);
  }
  16.66% {
    transform: translate(-50px, 75px);
  }
  25% {
    transform: translate(-130px, 25px);
  }
  33.33% {
    transform: translate(-100px, -35px);
  }
  41.66% {
    transform: translate(50px, -55px);
  }
  50% {
    transform: translate(125px, -45px);
  }
  58.33% {
    transform: translate(100px, 50px);
  }
  66.66% {
    transform: translate(-75px, 25px);
  }
  75% {
    transform: translate(-115px, -35px);
  }
  83.33% {
    transform: translate(75px, -50px);
  }
  91.66% {
    transform: translate(100px, 25px);
  }
`;

export default function NotFound() {
  const { authenticateUser, isAuthenticated } = useAuthStore();

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
        marginTop: '70px',
      }}
    >
      <Container maxWidth="xs">
        <Typography
          variant="h1"
          color="error"
          sx={{
            animation: `${bounce} 30s infinite linear`,
            '&:hover': {
              animation: 'none', // Stops bouncing on hover
            },
          }}
        >
          404
        </Typography>
        <Typography variant="h6">Page Not Found - Hurting Scene</Typography>
        <FlamePipe />
      </Container>
    </Box>
  );
}

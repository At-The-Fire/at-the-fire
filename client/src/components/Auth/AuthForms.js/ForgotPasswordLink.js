import React from 'react';
import { Link, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function ForgotPasswordLink() {
  const navigate = useNavigate();
  const handleNavigateToForgotPassword = () => {
    navigate('/auth/forgot-password');
  };
  return (
    <Link
      sx={{
        cursor: 'pointer',
      }}
      onClick={handleNavigateToForgotPassword}
    >
      <Typography color="secondary.light" variant="body2" fontSize={'0.8em'}>
        Forgot Password?
      </Typography>
    </Link>
  );
}

import React from 'react';
import { Link, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/useAuthStore.js';

export default function ChangeAuthForm({ type }) {
  const setError = useAuthStore((state) => state.setError);
  let formLinkQuestion = '';
  let linkText = '';
  const navigate = useNavigate();

  switch (type) {
    case 'sign-in':
      formLinkQuestion = "Don't have an account yet?";
      linkText = 'Sign up here.';
      break;
    case 'sign-up':
      formLinkQuestion = 'Already have an account?';
      linkText = 'Sign in here.';
      break;
    case 'forgot-password':
      formLinkQuestion = 'Remember your password?';
      linkText = 'Sign in here.';
      break;
    default:
      break;
  }

  const handleChangeAuthType = () => {
    switch (type) {
      case 'sign-in':
        setError(null);
        navigate('/auth/sign-up');
        break;
      case 'sign-up':
        setError(null);
        navigate('/auth/sign-in');
        break;
      case 'forgot-password':
        setError(null);
        navigate('/auth/sign-in');
        break;
      default:
        break;
    }
  };

  return (
    <>
      <Typography variant="body2" component="p">
        {formLinkQuestion}
      </Typography>
      <Link
        onClick={handleChangeAuthType}
        sx={{
          color: (theme) => theme.palette.secondary.light,
          fontSize: (theme) => theme.typography.body2.fontSize,
          cursor: 'pointer',
        }}
      >
        {linkText}
      </Link>
    </>
  );
}

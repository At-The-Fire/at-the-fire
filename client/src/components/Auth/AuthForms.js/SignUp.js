import React from 'react';
import EmailInput from './EmailInput.js';
import PasswordInput from './PasswordInput.js';
import ConfirmPassword from './ConfirmPassword.js';
import SubmitButton from './SubmitButton.js';
import { Typography } from '@mui/material';

export default function SignUp() {
  return (
    <>
      <Typography>Sign Up</Typography>

      <EmailInput />

      <PasswordInput />

      <ConfirmPassword />

      <SubmitButton />
    </>
  );
}

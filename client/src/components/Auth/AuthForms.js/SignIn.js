import React from 'react';
import EmailInput from './EmailInput.js';
import PasswordInput from './PasswordInput.js';

import SubmitButton from './SubmitButton.js';
import ForgotPasswordLink from './ForgotPasswordLink.js';
import { Typography } from '@mui/material';

export default function SignIn() {
  return (
    <>
      <Typography>Sign In</Typography>

      <EmailInput />

      <PasswordInput />

      <SubmitButton />

      <ForgotPasswordLink />
    </>
  );
}

import React, { useState } from 'react';
import EmailInput from './EmailInput.js';
import CodeInput from './CodeInput.js';
import SubmitButton from './SubmitButton.js';
import PasswordInput from './PasswordInput.js';
import ConfirmPassword from './ConfirmPassword.js';
import { Navigate } from 'react-router-dom';
import { Typography } from '@mui/material';

export default function ForgotPassword() {
  const [stage, setStage] = useState(0); // 0 = email input, 1 = code input, 2 = navigate to sign in
  const [code, setCode] = useState('');
  return (
    <>
      {/* stage 0 === submit email to receive verification code */}
      {stage === 0 ? (
        <>
          <Typography>Forgot Password?</Typography>
          <Typography variant="body2">
            Enter your email here to receive a verification code in your inbox
          </Typography>
        </>
      ) : null}

      {stage === 0 ? <EmailInput /> : null}

      {/* stage 1 === send verification code received in email along with new password */}
      {stage === 1 ? (
        <>
          <Typography>Forgot Password?</Typography>
          <Typography variant="body2">
            Enter the verification code sent to your inbox here
          </Typography>
        </>
      ) : null}

      {stage === 1 ? (
        <>
          <CodeInput {...{ code, setCode }} />
          <PasswordInput />
          <ConfirmPassword />
        </>
      ) : null}

      {/* navigate to the sign in form */}
      {stage === 2 ? <Navigate to="/auth/sign-in" /> : null}

      <SubmitButton {...{ stage, setStage, code }} />
    </>
  );
}

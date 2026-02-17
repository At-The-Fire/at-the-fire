import { TextField } from '@mui/material';
import React from 'react';
import { useAuthStore } from '../../../stores/useAuthStore.js';

export default function CodeInput({ code, setCode }) {
  const { error, setError } = useAuthStore();

  return (
    <TextField
      id="verification-code-input"
      label="Verification Code"
      variant="filled"
      value={code}
      autoComplete="new-password"
      required
      fullWidth
      onInput={() => setError(null)}
      onChange={(e) => setCode(e.target.value)}
      error={error === 'Invalid verification code provided, please try again.' ? true : false}
      helperText={
        error === 'Invalid verification code provided, please try again.'
          ? 'Invalid code provided, please try again.'
          : ''
      }
      inputProps={{ inputMode: 'numeric', pattern: '[0-9]{6}' }}
      size="small"
    />
  );
}

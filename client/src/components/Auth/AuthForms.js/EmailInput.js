import React from 'react';
import { TextField } from '@mui/material';
import { useAuthStore } from '../../../stores/useAuthStore.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
export default function EmailInput() {
  const { email, setEmail, error, setError } = useAuthStore();
  const handleEdit = (value) => {
    if (value.length <= 255) {
      setEmail(value);
    } else {
      toast.warn('Limit of 255 characters', {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'emailInput-1',
        autoClose: true,
      });
    }
  };
  return (
    <TextField
      id="email-input"
      label="Email"
      variant="filled"
      type="email"
      value={email || ''}
      autoComplete="email"
      required
      fullWidth
      onChange={(e) => handleEdit(e.target.value)}
      helperText={
        error === 'Incorrect username or password.' ? 'Incorrect username or password.' : ''
      }
      error={error === 'Incorrect username or password.' ? true : false}
      onInput={() => setError(null)}
      size="small"
      inputProps={{ 'data-testid': 'email-input' }}
    />
  );
}

import { IconButton, InputAdornment, TextField } from '@mui/material';
import React, { useState } from 'react';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuthStore } from '../../../stores/useAuthStore.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
export default function ConfirmPassword() {
  const { cPassword, setCPassword, error, setError } = useAuthStore();
  const [showCPassword, setShowCPassword] = useState(false);
  const handleClickShowCPassword = () => setShowCPassword((show) => !show);
  const handleMouseDownCPassword = (event) => {
    event.preventDefault();
  };

  const handleEdit = (value) => {
    if (value.length <= 255) {
      setCPassword(value);
    } else {
      toast.warn('Limit of 255 characters', {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'confirmPass-1',
        autoClose: true,
      });
    }
  };

  return (
    <TextField
      fullWidth
      id="confirm-password-input"
      label="Confirm Password"
      variant="filled"
      type={showCPassword ? 'text' : 'password'}
      autoComplete="off"
      required
      value={cPassword || ''}
      onChange={(e) => handleEdit(e.target.value)}
      error={error === 'Passwords do not match' ? true : false}
      helperText={error === 'Passwords do not match' ? 'Passwords do not match' : ''}
      onInput={() => setError(null)}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              aria-label="toggle confirm password visibility"
              onClick={handleClickShowCPassword}
              onMouseDown={handleMouseDownCPassword}
            >
              {showCPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
      size="small"
      inputProps={{ 'data-testid': 'confirm-password-input' }}
    />
  );
}

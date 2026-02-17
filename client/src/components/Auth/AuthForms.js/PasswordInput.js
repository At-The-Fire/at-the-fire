import React, { useState } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuthStore } from '../../../stores/useAuthStore.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
export default function PasswordInput() {
  const { password, setPassword, error, setError } = useAuthStore();

  const [showPassword, setShowPassword] = useState(false);

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleInputError = () => {
    switch (error) {
      case 'Incorrect username or password.':
        return true;
      case 'Passwords do not match':
        return true;
      default:
        return false;
    }
  };

  const getHelperText = () => {
    switch (error) {
      case 'Incorrect username or password.':
        return 'Incorrect username or password.';
      case 'Passwords do not match':
        return 'Passwords do not match';
      default:
        return '';
    }
  };

  const handleEdit = (value) => {
    if (value.length <= 255) {
      setPassword(value);
    } else {
      toast.warn('Limit of 255 characters', {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'passwordInput-1',
        autoClose: true,
      });
    }
  };

  return (
    <TextField
      fullWidth
      id="password-input"
      label="Password"
      variant="filled"
      type={showPassword ? 'text' : 'password'}
      autoComplete="current-password"
      required
      value={password || ''}
      onChange={(e) => {
        handleEdit(e.target.value);
      }}
      error={handleInputError()}
      helperText={getHelperText()}
      onInput={() => setError(null)}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              aria-label="toggle password visibility"
              onClick={handleClickShowPassword}
              onMouseDown={handleMouseDownPassword}
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
      size="small"
      inputProps={{ 'data-testid': 'password-input' }}
    />
  );
}

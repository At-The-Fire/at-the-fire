import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthStore } from '../../../stores/useAuthStore';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function PasswordChange() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleClickShowNewPassword = () => setShowNewPassword((show) => !show);
  const handleClickShowConfirmPassword = () => setShowConfirmPassword((show) => !show);

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handlePasswordChangeSuccess = useAuthStore((state) => state.handlePasswordChangeSuccess);
  const challengeUser = useAuthStore((state) => state.challengeUser);

  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Password validation
    if (newPassword.length < 8) {
      setError(`Requirements: 8-character minimum length. 
Contains at least 1 number. 
Contains at least 1 lowercase letter. 
Contains at least 1 uppercase letter. 
Contains at least 1 special character. `);
      setLoading(false);
      return;
    }

    try {
      await new Promise((resolve, reject) => {
        challengeUser.completeNewPasswordChallenge(
          newPassword,
          {},
          {
            // Just pass empty object
            onSuccess: async (result) => {
              try {
                await handlePasswordChangeSuccess(result, navigate);
                resolve(result);
              } catch (e) {
                reject(new Error('Failed during password change: ' + e.message));
              }
            },
            onFailure: (err) => {
              reject(new Error(err.message));
            },
          }
        );
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const characterLimitWarn = () => {
    toast.warn('Limit of 255 characters', {
      theme: 'colored',
      draggable: true,
      draggablePercent: 60,
      toastId: 'confirmPass-1',
      autoClose: true,
    });
  };

  const handleNewPasswordEdit = (value) => {
    if (value.length <= 255) {
      setNewPassword(value);
    } else {
      characterLimitWarn();
    }
  };
  const handleConfirmNewPasswordEdit = (value) => {
    if (value.length <= 255) {
      setConfirmPassword(value);
    } else {
      characterLimitWarn();
    }
  };
  return (
    <Box
      sx={{
        paddingTop: '80px',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <Container
        maxWidth="sm"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: (theme) => theme.spacing(2),
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ textAlign: 'center' }}>
            Change Your Password
          </Typography>
          <Divider sx={{ marginY: (theme) => theme.spacing(1) }} />
          <Typography variant="body1" sx={{ textAlign: 'center', marginBottom: '1rem' }}>
            Please set a new password for your account
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            You will be redirected back to log in with your new password
          </Typography>
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: (theme) => theme.spacing(2),
            width: '100%',
            maxWidth: '320px',
          }}
        >
          <TextField
            required
            fullWidth
            type={showNewPassword ? 'text' : 'password'}
            label="New Password"
            value={newPassword}
            onChange={(e) => handleNewPasswordEdit(e.target.value)}
            error={!!error}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleClickShowNewPassword} onMouseDown={handleMouseDownPassword}>
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            required
            fullWidth
            type={showConfirmPassword ? 'text' : 'password'}
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => handleConfirmNewPasswordEdit(e.target.value)}
            error={!!error}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleClickShowConfirmPassword} onMouseDown={handleMouseDownPassword}>
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            helperText={error}
          />

          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={loading}
            sx={{
              marginTop: (theme) => theme.spacing(2),
              fontSize: '1.1rem',
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Change Password'}
          </Button>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link
              to="/contact"
              sx={{
                cursor: 'pointer',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Trouble?
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

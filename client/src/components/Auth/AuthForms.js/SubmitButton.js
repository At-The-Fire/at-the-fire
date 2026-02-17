import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Box,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../../stores/useAuthStore.js';

export default function SubmitButton({ code, stage, setStage }) {
  const { error, email, password, setPassword, setCPassword, cPassword, handleForgotPassword } = useAuthStore();
  const handleRegistration = useAuthStore((state) => state.handleRegistration);
  const navigate = useNavigate();

  const { type } = useParams();

  const [openDialog, setOpenDialog] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleAuthButton = (e) => {
    switch (type) {
      case 'sign-up':
        return handleRegistration(e, type, password, cPassword, navigate);

      case 'sign-in':
        return handleRegistration(e, type, password, cPassword, navigate);

      case 'forgot-password':
        return handleForgotPassword({
          code,
          stage,
          setStage,
          email,
          password,
          setPassword,
          cPassword,
          setCPassword,
        });

      default:
        break;
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleCheckboxChange = (event) => {
    setAgreed(event.target.checked);
  };
  return (
    <>
      <Button
        data-testid="submit-button"
        color={error ? 'error' : 'primary'}
        variant="contained"
        size="small"
        type="submit"
        onClick={(e) => {
          if (type === 'sign-up') {
            handleOpenDialog();
          } else {
            handleAuthButton(e);
          }
        }}
      >
        {type === 'sign-in' ? 'Sign In' : type === 'sign-up' ? 'Sign Up' : 'Submit'}
      </Button>
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Terms of Service Agreement</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Please read our{' '}
            <Link
              onClick={(e) => {
                e.preventDefault();
                navigate('/terms-of-service');
              }}
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
            >
              Terms of Service
            </Link>
            . You must agree to our Terms of Service before continuing.
          </DialogContentText>
          <Box mt={2}>
            <FormControlLabel
              control={<Checkbox checked={agreed} onChange={handleCheckboxChange} />}
              label="I have read and agree to the Terms of Service"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={(e) => {
              handleCloseDialog();
              handleAuthButton(e);
            }}
            color="primary"
            disabled={!agreed}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

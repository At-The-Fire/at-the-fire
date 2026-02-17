import { TextField } from '@mui/material';
import React, { useState } from 'react';

export default function BillingEmailInput({ billingEmail, setBillingEmail }) {
  const [emailError, setEmailError] = useState(false);

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  return (
    <TextField
      id="billing-email-input"
      label="Billing Email"
      variant="filled"
      type="email"
      defaultValue={billingEmail}
      autoComplete="email"
      required
      fullWidth
      onChange={(e) => {
        const value = e.target.value;
        setBillingEmail(value);
        setEmailError(!isValidEmail(value) && value !== '');
      }}
      error={emailError}
      helperText={emailError ? 'Please enter a valid email address' : ''}
      size="small"
      inputProps={{
        'data-testid': 'billing-email-input',
      }}
    />
  );
}

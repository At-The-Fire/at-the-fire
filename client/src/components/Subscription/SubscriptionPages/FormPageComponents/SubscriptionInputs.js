import { Box } from '@mui/material';
import React from 'react';
import FirstNameInput from './FirstNameInput.js';
import SurnameInput from './SurnameInput.js';
import BillingEmailInput from './BillingEmailInput.js';

export default function SubscriptionInputs({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  billingEmail,
  setBillingEmail,
}) {
  return (
    <Box
      className={'subscription-input-wrapper'}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: (theme) => theme.spacing(2),
      }}
    >
      <FirstNameInput {...{ firstName, setFirstName }} />

      <SurnameInput {...{ lastName, setLastName }} />

      <BillingEmailInput {...{ billingEmail, setBillingEmail }} />
    </Box>
  );
}

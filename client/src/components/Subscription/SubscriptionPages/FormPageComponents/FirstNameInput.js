import React from 'react';
import { TextField } from '@mui/material';

export default function FirstNameInput({ firstName, setFirstName }) {
  return (
    <TextField
      id="first-name-input"
      label="First Name"
      variant="filled"
      type="text"
      defaultValue={firstName}
      autoComplete="First Name"
      required
      fullWidth
      onChange={(e) => setFirstName(e.target.value)}
      size="small"
      inputProps={{ 'data-testid': 'first-name-input' }}
    />
  );
}

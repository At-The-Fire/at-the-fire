import React from 'react';
import { TextField } from '@mui/material';

export default function SurnameInput({ lastName, setLastName }) {
  return (
    <TextField
      id="last-name-input"
      label="Last Name"
      variant="filled"
      type="text"
      defaultValue={lastName}
      autoComplete="Last Name"
      required
      fullWidth
      onChange={(e) => setLastName(e.target.value)}
      size="small"
      inputProps={{ 'data-testid': 'last-name-input' }}
    />
  );
}

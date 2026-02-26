import React, { useState } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';

export default function TrackingModal({ open, onClose, onSubmit, loading }) {
  const [trackingNumber, setTrackingNumber] = useState('');

  const handleSubmit = async () => {
    const trimmed = trackingNumber.trim();
    if (!trimmed) return;
    await onSubmit(trimmed);
    setTrackingNumber('');
  };

  const handleClose = () => {
    setTrackingNumber('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Tracking Number</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Tracking Number"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !trackingNumber.trim()}
        >
          {loading ? <CircularProgress size={18} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

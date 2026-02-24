import { Box, Typography } from '@mui/material';

// Phase 3: replace internals with payment processor SDK
export default function PaymentWidget({ amount, onSuccess, onError }) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 3,
        textAlign: 'center',
        mt: 2,
      }}
    >
      <Typography variant="h6" gutterBottom>
        Payment
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
        Payment processing is coming soon.
      </Typography>
      {amount > 0 && (
        <Typography variant="body2" sx={{ mt: 1, color: 'primary.main' }}>
          Order total: ${Number(amount).toLocaleString()}
        </Typography>
      )}
    </Box>
  );
}

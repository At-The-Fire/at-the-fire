import { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { createPaymentIntent } from '../../services/fetch-purchases.js';

// Phase 3: replace internals with payment processor SDK
export default function PaymentWidget({ amount, items, onSuccess, onError }) {
  const [submitting, setSubmitting] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const last4 = (cardNumber || '').replace(/\D/g, '').slice(-4);

  const buildMockPayment = () => {
    // This mirrors a real processor flow where the client SDK returns a token/nonce.
    // The backend adapter will later translate this into an actual capture.
    return {
      provider: 'mock',
      token: `mock_tok_${last4 || '0000'}`,
      last4: last4 || null,
      expiry: expiry || null,
      cvcProvided: Boolean((cvc || '').trim()),
    };
  };

  const handlePlaceOrder = async () => {
    try {
      setSubmitting(true);
      const { intentId } = await createPaymentIntent(items);
      onSuccess(intentId, buildMockPayment());
    } catch (e) {
      onError(e);
    } finally {
      setSubmitting(false);
    }
  };

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

      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Mock card details (no real charge)
        </Typography>
        <TextField
          label="Card number"
          size="small"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          inputProps={{ inputMode: 'numeric' }}
        />
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField
            label="MM/YY"
            size="small"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            sx={{ flex: 1 }}
          />
          <TextField
            label="CVC"
            size="small"
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
            sx={{ flex: 1 }}
            inputProps={{ inputMode: 'numeric' }}
          />
        </Box>
      </Box>

      <Button
        variant="contained"
        sx={{ mt: 2 }}
        onClick={handlePlaceOrder}
        disabled={submitting || !items?.length || amount <= 0}
      >
        {submitting ? 'Placing order…' : 'Place order'}
      </Button>
    </Box>
  );
}

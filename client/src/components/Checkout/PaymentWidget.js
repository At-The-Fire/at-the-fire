import { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { createPaymentIntent } from '../../services/fetch-purchases.js';

// Phase 3: replace internals with payment processor SDK
export default function PaymentWidget({ amount, items, onSuccess, onError, disabled = false, createIntent }) {
  const [submitting, setSubmitting] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [errors, setErrors] = useState({});

  // --- Formatting helpers ---

  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  // --- Validation ---

  const validate = () => {
    const newErrors = {};

    const rawCard = cardNumber.replace(/\s/g, '');
    if (!rawCard) {
      newErrors.cardNumber = 'Card number is required';
    } else if (!/^\d{16}$/.test(rawCard)) {
      newErrors.cardNumber = 'Card number must be 16 digits';
    }

    if (!expiry) {
      newErrors.expiry = 'Expiry is required';
    } else {
      const match = expiry.match(/^(\d{2})\/(\d{2})$/);
      if (!match) {
        newErrors.expiry = 'Use MM/YY format';
      } else {
        const month = parseInt(match[1], 10);
        const year = 2000 + parseInt(match[2], 10);
        const now = new Date();
        const cardExpiry = new Date(year, month, 1); // first day of month AFTER expiry
        if (month < 1 || month > 12) {
          newErrors.expiry = 'Invalid month';
        } else if (cardExpiry <= now) {
          newErrors.expiry = 'Card has expired';
        }
      }
    }

    if (!cvc.trim()) {
      newErrors.cvc = 'CVC is required';
    } else if (!/^\d{3,4}$/.test(cvc.trim())) {
      newErrors.cvc = 'CVC must be 3 or 4 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Handlers ---

  const handleCardNumberChange = (e) => {
    setCardNumber(formatCardNumber(e.target.value));
    if (errors.cardNumber) setErrors((prev) => ({ ...prev, cardNumber: undefined }));
  };

  const handleExpiryChange = (e) => {
    setExpiry(formatExpiry(e.target.value));
    if (errors.expiry) setErrors((prev) => ({ ...prev, expiry: undefined }));
  };

  const handleCvcChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCvc(digits);
    if (errors.cvc) setErrors((prev) => ({ ...prev, cvc: undefined }));
  };

  const last4 = cardNumber.replace(/\s/g, '').slice(-4) || null;

  const buildMockPayment = () => ({
    provider: 'mock',
    token: `mock_tok_${last4 || '0000'}`,
    last4,
    expiry,
    cvcProvided: true,
  });

  const handlePlaceOrder = async () => {
    if (!validate()) return;
    try {
      setSubmitting(true);
      const intentFn = createIntent ?? (() => createPaymentIntent(items));
      const { intentId } = await intentFn();
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
        mt: 2,
      }}
    >
      <Typography variant="h6" gutterBottom>
        Payment
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
        Test mode — no real charge will be made
      </Typography>
      {amount > 0 && (
        <Typography variant="body2" sx={{ mb: 2, color: 'primary.main' }}>
          Order total: ${Number(amount).toLocaleString()}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <TextField
          label="Card number"
          size="small"
          value={cardNumber}
          onChange={handleCardNumberChange}
          placeholder="1234 5678 9012 3456"
          inputProps={{ inputMode: 'numeric' }}
          error={Boolean(errors.cardNumber)}
          helperText={errors.cardNumber}
        />
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField
            label="MM/YY"
            size="small"
            value={expiry}
            onChange={handleExpiryChange}
            placeholder="MM/YY"
            sx={{ flex: 1 }}
            error={Boolean(errors.expiry)}
            helperText={errors.expiry}
          />
          <TextField
            label="CVC"
            size="small"
            value={cvc}
            onChange={handleCvcChange}
            placeholder="123"
            sx={{ flex: 1 }}
            inputProps={{ inputMode: 'numeric' }}
            error={Boolean(errors.cvc)}
            helperText={errors.cvc}
          />
        </Box>
      </Box>

      {disabled && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
          Complete your shipping address above to place your order.
        </Typography>
      )}
      <Button
        variant="contained"
        sx={{ mt: 1 }}
        onClick={handlePlaceOrder}
        disabled={submitting || !items?.length || amount <= 0 || disabled}
      >
        {submitting ? 'Placing order…' : 'Place order'}
      </Button>
    </Box>
  );
}

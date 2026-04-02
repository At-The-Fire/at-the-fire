import { Alert, Box, Button, Divider, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { confirmPurchase, confirmAuctionPurchase, createAuctionPaymentIntent } from '../../services/fetch-purchases.js';
import PaymentWidget from './PaymentWidget.js';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '../../context/QueryContext.js';

const REQUIRED_ADDRESS_FIELDS = ['fullName', 'line1', 'city', 'state', 'zip'];
const US_STATES = new Set([
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'DC',
  'PR',
  'VI',
  'GU',
  'AS',
  'MP',
]);
const TOAST_OPTS = { theme: 'colored', draggable: true, draggablePercent: 60 };

export default function Checkout() {
  const location = useLocation();
  const item = location.state?.item;
  const shippingCost = item?.shippingCost ?? 0;
  const totalAmount = item ? item.price * item.quantity + shippingCost : 0;
  const { setNewPostCreated } = useQuery();
  const navigate = useNavigate();

  const [address, setAddress] = useState({
    fullName: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    zip: '',
  });

  const handleAddressChange = (field) => (e) => {
    setAddress((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validateAddress = () => {
    const name = address.fullName.trim();
    if (name.length < 2) {
      toast.warn('Please enter your full name', TOAST_OPTS);
      return false;
    }
    if (name.length > 100) {
      toast.warn('Full name must be 100 characters or fewer', TOAST_OPTS);
      return false;
    }

    const line1 = address.line1.trim();
    if (line1.length < 5) {
      toast.warn('Please enter a valid street address', TOAST_OPTS);
      return false;
    }
    if (line1.length > 100) {
      toast.warn('Street address must be 100 characters or fewer', TOAST_OPTS);
      return false;
    }

    if (address.line2.trim().length > 100) {
      toast.warn('Address line 2 must be 100 characters or fewer', TOAST_OPTS);
      return false;
    }

    const city = address.city.trim();
    if (city.length < 2) {
      toast.warn('Please enter a valid city', TOAST_OPTS);
      return false;
    }
    if (city.length > 100) {
      toast.warn('City must be 100 characters or fewer', TOAST_OPTS);
      return false;
    }
    if (!/^[A-Za-z\s'\-.]+$/.test(city)) {
      toast.warn('City name contains invalid characters', TOAST_OPTS);
      return false;
    }

    if (!US_STATES.has(address.state.trim().toUpperCase())) {
      toast.warn('Please enter a valid 2-letter US state code (e.g. CA)', TOAST_OPTS);
      return false;
    }

    if (!/^\d{5}(-\d{4})?$/.test(address.zip.trim())) {
      toast.warn('Please enter a valid ZIP code (e.g. 90210)', TOAST_OPTS);
      return false;
    }

    return true;
  };

  const handleSuccess = async (intentId, payment) => {
    if (!validateAddress()) return;
    try {
      const shippingAddress = {
        fullName: address.fullName.trim(),
        line1: address.line1.trim(),
        line2: address.line2.trim() || null,
        city: address.city.trim(),
        state: address.state.trim().toUpperCase(),
        zip: address.zip.trim(),
        country: 'US',
      };
      if (item.itemType === 'auction') {
        await confirmAuctionPurchase(intentId, item.auctionId, payment, shippingAddress);
      } else {
        await confirmPurchase(intentId, [item], payment, shippingAddress);
      }
      setNewPostCreated((prev) => !prev);
      toast.success('Order placed successfully!', {
        theme: 'colored',
        toastId: 'order-success',
        autoClose: 5000,
      });
      navigate('/my-purchases');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Confirm purchase error:', err);
      toast.error(`Order failed: ${err.message}`, {
        theme: 'colored',
        toastId: 'order-error',
        autoClose: false,
      });
    }
  };

  const handleError = (err) => {
    toast.error(`Payment error: ${err.message}`, {
      theme: 'colored',
      toastId: 'payment-error',
      autoClose: false,
    });
  };

  if (!item) {
    return (
      <Box sx={{ paddingTop: '100px', textAlign: 'center', p: 4 }}>
        <Typography sx={{ color: 'text.secondary', mb: 2 }}>Nothing to purchase.</Typography>
        <Button variant="contained" onClick={() => navigate('/')}>
          Browse Gallery
        </Button>
      </Box>
    );
  }

  const addressFilled = REQUIRED_ADDRESS_FIELDS.every((f) => address[f].trim());

  return (
    <Box sx={{ paddingTop: '80px', maxWidth: 600, margin: '0 auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Checkout
      </Typography>

      <Alert severity="warning" sx={{ mb: 3, fontSize: '1rem', fontWeight: 600 }}>
        Purchases are not yet available. Payment processing is being finalized — no order will be fulfilled if you
        proceed.
      </Alert>

      {/* Order Summary */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Order Summary
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">
            {item.title} × {item.quantity}
          </Typography>
          <Typography variant="body2">${(item.price * item.quantity).toLocaleString()}</Typography>
        </Box>
        {shippingCost > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Shipping</Typography>
            <Typography variant="body2">${shippingCost.toLocaleString()}</Typography>
          </Box>
        )}
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography fontWeight={600}>Total</Typography>
          <Typography fontWeight={600} color="primary.main">
            ${totalAmount.toLocaleString()}
          </Typography>
        </Box>
      </Box>

      {/* Shipping Address */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Shipping Address
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
          We currently only ship within the United States.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            label="Full Name"
            value={address.fullName}
            onChange={handleAddressChange('fullName')}
            required
            fullWidth
            size="small"
            inputProps={{ maxLength: 100 }}
          />
          <TextField
            label="Address Line 1"
            value={address.line1}
            onChange={handleAddressChange('line1')}
            required
            fullWidth
            size="small"
            inputProps={{ maxLength: 100 }}
          />
          <TextField
            label="Address Line 2 (optional)"
            value={address.line2}
            onChange={handleAddressChange('line2')}
            fullWidth
            size="small"
            inputProps={{ maxLength: 100 }}
          />
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              label="City"
              value={address.city}
              onChange={handleAddressChange('city')}
              required
              fullWidth
              size="small"
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              label="State"
              value={address.state}
              onChange={handleAddressChange('state')}
              required
              sx={{ width: '120px', flexShrink: 0 }}
              size="small"
              inputProps={{ maxLength: 2 }}
            />
          </Box>
          <TextField
            label="ZIP Code"
            value={address.zip}
            onChange={handleAddressChange('zip')}
            required
            sx={{ width: '140px' }}
            size="small"
            inputProps={{ maxLength: 10 }}
          />
        </Box>
      </Box>

      <PaymentWidget
        amount={totalAmount}
        items={[item]}
        onSuccess={handleSuccess}
        onError={handleError}
        disabled={!addressFilled}
        createIntent={item.itemType === 'auction' ? () => createAuctionPaymentIntent(item.auctionId) : undefined}
      />
    </Box>
  );
}

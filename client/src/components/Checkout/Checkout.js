import { Box, Button, Divider, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { confirmPurchase } from '../../services/fetch-purchases.js';
import PaymentWidget from './PaymentWidget.js';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '../../context/QueryContext.js';

export default function Checkout() {
  const location = useLocation();
  const item = location.state?.item;
  const shippingCost = item?.shippingCost ?? 0;
  const totalAmount = item ? item.price * item.quantity + shippingCost : 0;
  const { setNewPostCreated } = useQuery();

  const navigate = useNavigate();

  const handleSuccess = async (intentId, payment) => {
    try {
      await confirmPurchase(intentId, [item], payment);
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

  return (
    <Box sx={{ paddingTop: '80px', maxWidth: 600, margin: '0 auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Checkout
      </Typography>

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

      <PaymentWidget amount={totalAmount} items={[item]} onSuccess={handleSuccess} onError={handleError} />
    </Box>
  );
}

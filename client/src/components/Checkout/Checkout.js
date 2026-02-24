import { useEffect, useState } from 'react';
import { Box, Button, Divider, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { useCartStore } from '../../stores/useCartStore.js';
import { validateCart, confirmPurchase } from '../../services/fetch-purchases.js';
import PaymentWidget from './PaymentWidget.js';
import { useNavigate } from 'react-router-dom';

export default function Checkout() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const [validating, setValidating] = useState(true);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const navigate = useNavigate();

  // Validate cart on mount — remove unavailable items
  useEffect(() => {
    if (items.length === 0) {
      setValidating(false);
      return;
    }

    const validate = async () => {
      try {
        const result = await validateCart(items);
        const unavailable = result?.unavailable || [];

        if (unavailable.length > 0) {
          unavailable.forEach((postId) => {
            const item = items.find((i) => i.postId === postId);
            if (item) {
              removeItem(postId);
              toast.warn(`"${item.title}" is no longer available and has been removed from your cart.`, {
                theme: 'colored',
                draggable: true,
                draggablePercent: 60,
                toastId: `cart-unavailable-${postId}`,
                autoClose: 5000,
              });
            }
          });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Cart validation error:', err);
        toast.error('Could not validate cart. Please try again.', {
          theme: 'colored',
          toastId: 'cart-validate-error',
          autoClose: false,
        });
      } finally {
        setValidating(false);
      }
    };

    validate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSuccess = async (intentId) => {
    try {
      await confirmPurchase(intentId, items);
      clearCart();
      setOrderConfirmed(true);
      toast.success('Order placed successfully!', {
        theme: 'colored',
        toastId: 'order-success',
        autoClose: 5000,
      });
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

  if (validating) {
    return (
      <Box sx={{ paddingTop: '100px', textAlign: 'center' }}>
        <Typography>Validating your cart...</Typography>
      </Box>
    );
  }

  if (orderConfirmed) {
    return (
      <Box sx={{ paddingTop: '100px', textAlign: 'center', p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Order Confirmed!
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 3 }}>
          Thank you for your purchase. You will receive a confirmation shortly.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/')}>
          Continue Shopping
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ paddingTop: '80px', maxWidth: 600, margin: '0 auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Checkout
      </Typography>

      {items.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>Your cart is empty.</Typography>
          <Button variant="contained" onClick={() => navigate('/')}>
            Browse Gallery
          </Button>
        </Box>
      ) : (
        <>
          {/* Cart Summary */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            {items.map((item) => (
              <Box key={item.postId} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">
                  {item.title} × {item.quantity}
                </Typography>
                <Typography variant="body2">${(item.price * item.quantity).toLocaleString()}</Typography>
              </Box>
            ))}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography fontWeight={600}>Total</Typography>
              <Typography fontWeight={600} color="primary.main">
                ${totalAmount.toLocaleString()}
              </Typography>
            </Box>
          </Box>

          <PaymentWidget amount={totalAmount} onSuccess={handleSuccess} onError={handleError} />
        </>
      )}
    </Box>
  );
}

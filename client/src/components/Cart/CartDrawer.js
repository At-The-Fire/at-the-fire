import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCartStore } from '../../stores/useCartStore.js';
import { useNavigate } from 'react-router-dom';

export default function CartDrawer({ open, onClose }) {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const navigate = useNavigate();

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 340, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="h6">Your Cart</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />

        {/* Items */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {items.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', textAlign: 'center', mt: 4 }}>Your cart is empty</Typography>
          ) : (
            items.map((item) => (
              <Box key={item.postId} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4 }}
                    />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'primary.main' }}>
                      ${Number(item.price).toLocaleString()}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Select
                        size="small"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.postId, e.target.value)}
                        sx={{ minWidth: 60 }}
                      >
                        {Array.from({ length: item.maxQuantity }, (_, i) => i + 1).map((q) => (
                          <MenuItem key={q} value={q}>
                            {q}
                          </MenuItem>
                        ))}
                      </Select>
                      <IconButton size="small" onClick={() => removeItem(item.postId)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
                <Divider sx={{ mt: 2 }} />
              </Box>
            ))
          )}
        </Box>

        {/* Footer */}
        {items.length > 0 && (
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Total
              </Typography>
              <Typography variant="subtitle1" fontWeight={600} color="primary.main">
                ${totalAmount.toLocaleString()}
              </Typography>
            </Box>
            <Button variant="contained" fullWidth onClick={handleCheckout}>
              Proceed to Checkout
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

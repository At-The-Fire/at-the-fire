import React, { useEffect } from 'react';
import { Autocomplete, Box, TextField, Button, Typography, useMediaQuery, useTheme, Popper } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { toast } from 'react-toastify';
import usePostStore from '../../stores/usePostStore.js';
import { useAuthStore } from '../../stores/useAuthStore.js';

function renderProductOption(props, option, isMobile) {
  const totalSold = (option.sales || []).reduce((sum, s) => sum + (Number(s.quantitySold) || 0), 0);
  const remaining = Number(option.qty) - totalSold;

  if (isMobile) {
    return (
      <li {...props} key={option.id}>
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <Typography sx={{ width: '100%' }}>{option.title}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {option.category} — {remaining} left
          </Typography>
        </Box>
      </li>
    );
  }

  return (
    <li {...props} key={option.id}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: 0 }}>
        <Typography noWrap sx={{ flex: 1, minWidth: 0 }}>
          {option.title}
        </Typography>
        <Typography noWrap variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
          {option.category} — {remaining} left
        </Typography>
      </Box>
    </li>
  );
}

export default function OrderForm({
  orders,
  handleSubmit,
  selectedOrder,
  formMode,
  setFormMode,
  resetForm,
  orderDate,
  setOrderDate,
  clientName,
  setClientName,
  shipping,
  setShipping,
  items,
  setItems,
  handleFormClose,
  products,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { restricted } = usePostStore();

  const handleItemChange = (index, field, value) => {
    const newItems = items.map((item, i) => {
      if (index === i) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { itemName: '', quantity: '', rate: '', category: '', description: '', productId: null }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index, selectedProduct) => {
    if (!selectedProduct || typeof selectedProduct !== 'object') {
      handleItemChange(index, 'productId', null);
      return;
    }
    const totalSold = (selectedProduct.sales || []).reduce((sum, s) => sum + (Number(s.quantitySold) || 0), 0);
    const remaining = Number(selectedProduct.qty) - totalSold;
    if (remaining <= 0) {
      toast.warn(`"${selectedProduct.title}" is out of stock.`, {
        theme: 'dark',
        draggable: true,
        draggablePercent: 60,
        toastId: `oos-${selectedProduct.id}`,
      });
    }
    const updatedItem = {
      itemName: selectedProduct.title,
      category: selectedProduct.category,
      description: selectedProduct.description || '',
      rate: selectedProduct.price ?? '',
      productId: selectedProduct.id,
      _remaining: remaining,
      _type: selectedProduct.type,
    };
    setItems(items.map((it, i) => (i === index ? { ...it, ...updatedItem } : it)));
  };

  const getNewOrderNumber = (orders) => {
    const highestOrderNumber = orders.reduce((max, order) => {
      const currentOrderNumber = Number(order.order_number) || 0; // Ensure it's a number
      return currentOrderNumber > max ? currentOrderNumber : max;
    }, 0);
    return highestOrderNumber + 1;
  };

  const validateOrderItems = (items) => {
    return items.every(
      (item) =>
        item.itemName?.trim() &&
        !isNaN(item.quantity) &&
        item.quantity > 0 &&
        !isNaN(item.rate) &&
        item.rate >= 0 &&
        item.category?.trim()
      // Add description validation if it's required
    );
  };

  const onSubmit = (e) => {
    try {
      e.preventDefault();
      isMobile && handleFormClose();
      const newOrderNumber = getNewOrderNumber(orders);

      // Validate required fields first
      if (!orderDate || !clientName?.trim() || !items?.length) {
        throw new Error('Missing required order fields');
      }

      // Validate items array
      if (!validateOrderItems(items)) {
        throw new Error('Invalid or missing item details');
      }

      const formattedItems = items.map((item) => ({
        name: item.itemName,
        qty: parseInt(item.quantity, 10),
        rate: parseFloat(item.rate),
        category: item.category,
        description: item.description,
        productId: item.productId || null,
      }));

      // Validation for parsed numbers
      const hasInvalidNumbers = formattedItems.some((item) => isNaN(item.qty) || isNaN(item.rate));
      if (hasInvalidNumbers) {
        throw new Error('Please enter valid numbers for quantity and rate');
      }

      const orderData = {
        date: orderDate,
        client_name: clientName,
        items: JSON.stringify(formattedItems), // Convert array to JSON string
        shipping: parseFloat(shipping),
        order_number: formMode === 'new' ? newOrderNumber : selectedOrder.order_number,
      };

      handleSubmit(orderData, formMode, items);
    } catch (e) {
      if (e.message.includes('missing' || 'Missing') || e.message.includes('Please')) {
        toast.warn(`${e.message}. Please fill form out completely.`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'orderForm-1',
        });
      } else {
        if (e.code === 401 || e.code === 403) {
          useAuthStore.getState().handleAuthError(e.code, e.message);
        } else {
          if (process.env.REACT_APP_APP_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Error posting new order:', e);
          }
          useAuthStore.getState().setError(e.code);
          toast.error(`Error posting new order: ${e.message}`, {
            theme: 'colored',
            draggable: true,
            draggablePercent: 60,
            toastId: 'orderForm-2',
            autoClose: false,
          });
        }
      }
    }
  };

  useEffect(() => {
    if (formMode === 'edit' && selectedOrder) {
      setOrderDate(new Date(selectedOrder.date));
      setClientName(selectedOrder.client_name);
      setShipping(selectedOrder.shipping || 0);
      setItems(
        selectedOrder.items.map((item) => ({
          itemName: item.name, // Adjust based on actual property names
          quantity: item.qty,
          rate: item.rate,
          category: item.category,
          description: item.description,
          productId: item.productId || null,
        }))
      );
    } else {
      setOrderDate(new Date());
      setClientName('');
      setShipping(0);
      setItems([{ itemName: '', quantity: '', rate: '', category: '', description: '' }]);
    }
  }, [selectedOrder, formMode, setOrderDate, setClientName, setShipping, setItems]);

  return (
    <Box
      sx={{
        padding: 1,
        border: '1px solid',
        borderRadius: '5px',
        backgroundColor: 'background.paper',
        borderColor: (theme) => theme.palette.primary.dark,
        transform: ' translate(0%, -3%)',
      }}
    >
      {isMobile && (
        <Button
          onClick={handleFormClose}
          sx={{
            position: 'absolute',
            right: 5,
            top: 5,
            minWidth: 'auto',
            padding: 0,
          }}
        >
          <CloseIcon />
        </Button>
      )}
      <form onSubmit={onSubmit}>
        <Typography variant="h6">
          {formMode === 'new' ? 'Enter New Order' : `Edit Order #${selectedOrder.order_number}`}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Date"
              fullWidth
              value={orderDate}
              onChange={setOrderDate}
              required
              sx={{ marginBottom: 1 }}
              // renderInput={(params) => <TextField {...params} fullWidth />}
              slotProps={{
                textField: {
                  // Pass all the TextField props here
                  fullWidth: true,
                },
              }}
            />
          </LocalizationProvider>
        </Box>
        <TextField
          fullWidth
          label="Client"
          value={clientName || ''}
          onChange={(e) => setClientName(e.target.value)}
          required
          inputProps={{ maxLength: 255 }}
          sx={{ margin: '0px 0px 10px 0px' }}
        />

        {items.map((item, index) => {
          const itemHelperText = item.productId && item._remaining !== undefined ? `${item._remaining} in stock` : '';
          return (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                // Prevent layout shift when helper text appears under the Item field.
                // On desktop we lay these fields out in a row; if one grows taller,
                // `alignItems: center` causes siblings to re-center vertically.
                alignItems: isMobile ? 'stretch' : 'flex-start',
                margin: '0 5px',
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', marginBottom: 1 }}>
                <Autocomplete
                  freeSolo
                  options={products || []}
                  getOptionLabel={(option) => (typeof option === 'string' ? option : option.title)}
                  renderOption={(props, option) => renderProductOption(props, option, isMobile)}
                  PopperComponent={(popperProps) => (
                    <Popper
                      {...popperProps}
                      placement="bottom-start"
                      style={{
                        ...(popperProps.style || {}),
                        // Make the dropdown wider than the input so options don't wrap.
                        width: isMobile ? 'calc(100vw - 70px)' : 520,
                        maxWidth: 'calc(100vw - 32px)',
                      }}
                    />
                  )}
                  inputValue={item.itemName || ''}
                  onInputChange={(_, newValue) => handleItemChange(index, 'itemName', newValue)}
                  onChange={(_, sel) => handleProductSelect(index, sel)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Item"
                      required
                      sx={{ marginRight: 1, flex: 1 }}
                      helperText={itemHelperText}
                    />
                  )}
                  sx={{ marginRight: 1, flex: 1 }}
                />
                <TextField
                  label="Category"
                  value={item.category || ''}
                  onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                  required
                  inputProps={{ maxLength: 255 }}
                  sx={{ flex: 1 }}
                />
              </Box>
              <TextField
                label="Description"
                value={item.description || ''}
                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                required
                fullWidth
                inputProps={{ maxLength: 255 }}
                sx={{ marginBottom: 1 }}
              />
              <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', marginBottom: 1 }}>
                <TextField
                  label="Qty"
                  type="number"
                  value={item.quantity || ''}
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  required
                  sx={{ marginRight: 1, flex: 1 }}
                  inputProps={{ min: 0, max: 1000000 }}
                />
                <TextField
                  label="Rate"
                  type="number"
                  value={item.rate || ''}
                  onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                  required
                  sx={{ flex: 1 }}
                  inputProps={{ min: 0, max: 1000000 }}
                />
              </Box>
              <Button
                onClick={() => removeItem(index)}
                sx={{ alignSelf: isMobile ? 'flex-end' : 'center', marginBottom: 1, marginLeft: 1 }}
              >
                Remove
              </Button>
            </Box>
          );
        })}
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Button onClick={addItem} sx={{ marginBottom: 2 }}>
            Add Item
          </Button>
          <TextField
            label="Shipping"
            type="number"
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
            sx={{ marginBottom: 1, width: isMobile ? '100%' : '20%' }}
          />

          {!restricted ? (
            <Button type="submit" variant="contained" startIcon={<AddCircleIcon />}>
              {formMode === 'new' ? 'Create New Order' : 'Save Changes'}
            </Button>
          ) : (
            <Button type="submit" variant="contained" disabled>
              New Orders disabled
            </Button>
          )}

          {formMode === 'edit' && (
            <Button
              onClick={() => {
                setFormMode('new');
                resetForm();
              }}
              sx={{ marginTop: 1 }}
            >
              Cancel
            </Button>
          )}
        </Box>
      </form>
    </Box>
  );
}

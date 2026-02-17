import React, { useEffect, useState } from 'react';
import { useOrders } from '../../hooks/useOrders.js';
import { useProducts } from '../../hooks/useProducts.js';
import { deleteOrder, editOrder, insertNewOrder, updateFulfillmentStatus } from '../../services/fetch-orders.js';
import OrdersList from './OrdersList.js';
import { Box, Button, Grid, Typography, useMediaQuery } from '@mui/material';
import OrderForm from './OrderForm.js';
import FlamePipe from '../FlamePipe/FlamePipe.js';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import usePostStore from '../../stores/usePostStore.js';
import { useAuthStore } from '../../stores/useAuthStore.js';
export default function Orders() {
  //
  // state ===================================================

  const { customerId, isAuthenticated, authenticateUser } = useAuthStore();
  const { restricted } = usePostStore();

  const { orders, setOrders, orderLoading, setOrderLoading, orderError, setOrderError } = useOrders(customerId);
  const { products, setProducts } = useProducts();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const [showForm, setShowForm] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formMode, setFormMode] = useState('new'); // 'new' or 'edit'
  const [orderDate, setOrderDate] = useState(new Date());
  const [clientName, setClientName] = useState('');
  const [shipping, setShipping] = useState(0);
  const [items, setItems] = useState([{ itemName: '', quantity: '' }]);
  const resetForm = () => {
    setOrderDate(new Date());
    setClientName('');
    setShipping(0);
    setItems([{ itemName: '', quantity: '', rate: '', category: '', description: '' }]);
  };

  // functions ===================================================
  //  check auth
  useEffect(() => {
    if (!isAuthenticated) {
      authenticateUser();
    }
  }, []);

  const handleSubmit = async (orderData, formMode, rawItems) => {
    try {
      setOrderLoading(true);
      if (formMode === 'new') {
        const newOrder = await insertNewOrder(orderData);
        const updatedOrders = [...orders, newOrder];
        // Sort orders by date or order number as needed
        updatedOrders.sort((a, b) => new Date(b.date) - new Date(a.date)); // Example: Sorting by date
        setOrders(updatedOrders);
      } else if (formMode === 'edit') {
        const updatedOrder = await editOrder(selectedOrder.id, orderData);
        const newOrders = orders.map((order) => {
          if (order.id === updatedOrder.id) {
            return updatedOrder;
          }
          return order;
        });
        setOrders(newOrders);
      }
      setOrderLoading(false);
      setFormMode('new');
      setSelectedOrder(null);

      resetForm();
    } catch (e) {
      setOrderError(e.message);
      setOrderLoading(false);

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
          toastId: 'orders-1',
          autoClose: false,
        });
      }
    }
  };

  const handleToggleFulfillment = async (orderId) => {
    // Find the order being toggled
    const orderToToggle = orders.find((order) => order.id === orderId);
    if (!orderToToggle) return;

    // Update the local state first for immediate UI response
    setOrders((prevOrders) =>
      prevOrders.map((order) => (order.id === orderId ? { ...order, is_fulfilled: !order.is_fulfilled } : order))
    );

    try {
      // Then send the update to the server

      await updateFulfillmentStatus(orderId, !orderToToggle.is_fulfilled);
    } catch (e) {
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
          toastId: 'orders-3',
          autoClose: false,
        });
      }
    }
  };

  const handleDeleteOrder = async (order) => {
    try {
      await deleteOrder(order.id);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    } catch (e) {
      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error deleting order:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Error deleting order: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'orders-delete-1',
          autoClose: false,
        });
      }
    }
  };

  const handleEditClick = (order) => {
    if (isMobile) {
      setShowForm(true);
    }
    setSelectedOrder(order);
    setFormMode('edit');
  };

  const handleFormClose = () => {
    setShowForm(false); // Hide the form and show the list again
    setFormMode('new');
    resetForm();
  };

  const handleNewOrderClick = () => {
    setFormMode('new');
    resetForm();
    setShowForm(true); // Show the form for a new order
  };

  return (
    <>
      {orderLoading ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            margin: !isMobile && '150px',
          }}
        >
          <Typography variant="h5" sx={{ color: (theme) => theme.palette.primary.light }}>
            Loading Orders <span className="animated-ellipsis">.</span>
            <span className="animated-ellipsis">.</span>
            <span className="animated-ellipsis ">.</span>
          </Typography>
          <FlamePipe />
        </Box>
      ) : (
        <Box
          sx={{
            borderWidth: '1px',
            borderStyle: 'solid',
            color: (theme) => theme.palette.primary.light,
            padding: ' 1rem',
            transform: 'translateY(-5%)',
          }}
        >
          <Grid container spacing={1}>
            {!showForm && (
              <Grid item xs={12} lg={6}>
                {isMobile && (
                  <Box display="flex" justifyContent="center">
                    {
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleNewOrderClick}
                        sx={{
                          marginBottom: 2,
                          width: '100%',
                          marginTop: 0,
                          position: 'relative',
                        }}
                        disabled={restricted ? restricted : false}
                        startIcon={<AddCircleIcon />}
                      >
                        {restricted ? 'New Orders disabled' : '   Create New Order'}
                      </Button>
                    }
                  </Box>
                )}
                <OrdersList
                  orders={orders}
                  setOrders={setOrders}
                  orderLoading={orderLoading}
                  setSelectedOrder={setSelectedOrder}
                  setFormMode={setFormMode}
                  handleToggleFulfillment={handleToggleFulfillment}
                  handleEditClick={handleEditClick}
                  handleDeleteOrder={handleDeleteOrder}
                />
              </Grid>
            )}
            {(showForm || !isMobile) && (
              <Grid item xs={12} lg={6}>
                <OrderForm
                  selectedOrder={selectedOrder}
                  formMode={formMode}
                  setFormMode={setFormMode}
                  handleSubmit={handleSubmit}
                  orders={orders}
                  setOrders={setOrders}
                  resetForm={resetForm}
                  orderDate={orderDate}
                  setOrderDate={setOrderDate}
                  clientName={clientName}
                  setClientName={setClientName}
                  shipping={shipping}
                  setShipping={setShipping}
                  items={items}
                  setItems={setItems}
                  handleFormClose={handleFormClose}
                  products={products}
                />
              </Grid>
            )}
          </Grid>
        </Box>
      )}
    </>
  );
}

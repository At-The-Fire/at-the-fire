import React, { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

import FlamePipe from '../FlamePipe/FlamePipe.js';
import { useProfileContext } from '../../context/ProfileContext.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../../stores/useAuthStore.js';

export default function OrdersList({
  orders,
  orderLoading,

  handleToggleFulfillment,
  handleEditClick,
  handleDeleteOrder,
}) {
  const { bizProfile, profileLoading } = useProfileContext();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1); // Current page state
  const ordersPerPage = 5; // Number of orders to display per page

  // Calculate the current orders to display based on pagination
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);

  const [orderToDelete, setOrderToDelete] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleConfirmDelete = async () => {
    handleCloseDialog();
    if (orderToDelete) {
      await handleDeleteOrder(orderToDelete);
      setOrderToDelete(null); // Clear the stored order
    }
  };
  const preloadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = `${src}?t=${new Date().getTime()}`;
    });
  };

  const printOrder = async (order) => {
    try {
      const img = await preloadImage(bizProfile.logoImageUrl);
      const printWindow = window.open('', '_blank');

      // Wait for the window to be fully loaded
      printWindow.document.write('<html><head><title>Print Order</title>');
      printWindow.document.write('<style>');
      printWindow.document.write('body { font-family: Arial, sans-serif; }');
      printWindow.document.write('header { display: flex; justify-content: space-between; align-items: center; }');
      printWindow.document.write('header img { max-width: 100px; height: auto; }');
      printWindow.document.write('table { width: 100%; border-collapse: collapse; }');
      printWindow.document.write('th, td { border: 1px solid black; padding: 5px; text-align: left; }');
      printWindow.document.write('th { background-color: #f2f2f2; }');
      printWindow.document.write('</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write('<header>');
      printWindow.document.write(`<h1>${bizProfile.displayName || 'Your business name here'}</h1>`);
      printWindow.document.write(`<img src="${img.src}" alt="Business Logo">`);
      printWindow.document.write('</header>');
      printWindow.document.write('<h3>Order Details</h3>');
      printWindow.document.write(`<p>Date: ${formatDate(order.date)}</p>`);
      printWindow.document.write(`<p>Client Name: ${order.client_name}</p>`);
      printWindow.document.write(`<p>Order Number: ${order.order_number}</p>`);
      printWindow.document.write('<h2>Items</h2>');
      printWindow.document.write(
        '<table><thead><tr><th>Item</th><th>Category</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>'
      );

      order.items.forEach((item) => {
        printWindow.document.write(`<tr>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>${item.description}</td>
        <td style="text-align:right">${item.qty}</td>
        <td style="text-align:right">$${item.rate}</td>
        <td style="text-align:right">$${(item.qty * item.rate).toFixed(2)}</td>
      </tr>`);
      });
      const subtotal = order.items.reduce((acc, item) => acc + item.qty * item.rate, 0).toFixed(2);
      const shipping = order.shipping ? order.shipping : '0.00';
      const subtotalNumber = parseFloat(subtotal);
      const shippingNumber = parseFloat(shipping);

      const totalAmount = (subtotalNumber + shippingNumber).toFixed(2);

      printWindow.document.write(
        `<tr style="height:2rem"><td colspan="6"></td></tr><tr><td colspan="3">
        </td><td colspan="2" style="text-align:left">Subtotal</td><td style="text-align:right">$${subtotal}</td></tr>`
      );
      printWindow.document.write(
        `<tr><td colspan="3"></td><td colspan="2"  style="text-align:left">Shipping</td><td style="text-align:right">$${shipping}</td></tr>`
      );
      printWindow.document.write(
        `<tr><td colspan="3"></td><td colspan="2" style="text-align:left; font-weight:bold">Total</td><td style="text-align:right; font-weight:bold;">$${totalAmount}</td></tr>`
      );
      printWindow.document.write('</tbody></table>');
      printWindow.document.write('</body></html>');
      printWindow.document.close();

      // Wait a short moment for the image to load before printing
      setTimeout(() => {
        printWindow.print();
      }, 300);
    } catch (e) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error printing order:', e);
      }
      useAuthStore.getState().setError(e.code);
      toast.error(`Error printing order: ${e.message}`, {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'ordersList-2',
        autoClose: false,
      });
    }
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return isMobile
      ? date.toLocaleDateString('en-US', { year: '2-digit', month: 'numeric', day: 'numeric' })
      : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return orderLoading ? (
    <FlamePipe />
  ) : orders.length === 0 ? (
    <Typography>No orders saved</Typography>
  ) : (
    <Box>
      <Box display="flex" justifyContent={isMobile ? 'flex-start' : 'center'}>
        <Typography variant="h5">Orders List</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <Button onClick={() => setCurrentPage((prevPage) => Math.max(prevPage - 1, 1))} disabled={currentPage === 1}>
          Previous
        </Button>
        <Typography mx={2}>
          Page {currentPage} of {Math.ceil(orders.length / ordersPerPage)}
        </Typography>
        <Button
          onClick={() => setCurrentPage((prevPage) => (indexOfLastOrder >= orders.length ? prevPage : prevPage + 1))}
          disabled={indexOfLastOrder >= orders.length}
        >
          Next
        </Button>
      </Box>
      {currentOrders.length &&
        currentOrders.map((order) => (
          <Accordion key={order.id}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`panel${order.id}-content`}
              id={`panel${order.id}-header`}
              sx={{
                border: '1px solid',
                borderColor: order.is_fulfilled ? 'green' : 'black',
                boxShadow: order.is_fulfilled ? 'none' : 'inset 0px 0px 5px 0px yellow',
                margin: '3px 0',
              }}
            >
              <Box
                display="grid"
                gridTemplateColumns="25% 25% 25% 25%"
                width="100%"
                justifyContent="space-between"
                justifyItems={{ xs: 'center', md: 'flex-start' }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    color: (theme) => theme.palette.primary.light,
                  }}
                >
                  {formatDate(order.date)}
                </Typography>
                <Typography
                  variant={isMobile ? 'caption' : 'body2'}
                  sx={{
                    color: (theme) => theme.palette.primary.light,
                  }}
                >
                  {order.client_name}
                </Typography>
                <Typography
                  sx={{
                    color: (theme) => theme.palette.primary.light,
                  }}
                >
                  {isMobile ? ` #${order.order_number}` : `Order # ${order.order_number}`}
                </Typography>
                <Chip
                  icon={
                    order.is_fulfilled ? (
                      <CheckCircleIcon
                        sx={{
                          transform: isMobile ? 'translate(5px, 0)' : 'translate(0, 0)',
                        }}
                      />
                    ) : (
                      <ReportProblemIcon
                        sx={{
                          transform: isMobile ? 'translate(5px, 0)' : 'translate(0, 0)',
                        }}
                      />
                    )
                  }
                  label={isMobile ? '' : order.is_fulfilled ? 'Completed' : 'Unfinished'}
                  color={order.is_fulfilled ? 'success' : 'error'}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ border: '2px solid', borderColor: (theme) => theme.palette.primary.dark }}>
              {/* Table displaying the order details */}
              <TableContainer component={Paper}>
                <Table size={isMobile ? 'small' : 'medium'}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      {!isMobile && <TableCell>Category</TableCell>}
                      {!isMobile && <TableCell>Description</TableCell>}
                      <TableCell>Qty</TableCell>
                      <TableCell>Rate</TableCell>
                      <TableCell>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.name}</TableCell>
                        {!isMobile && <TableCell>{item.category}</TableCell>}
                        {!isMobile && <TableCell>{item.description}</TableCell>}
                        <TableCell>{item.qty}</TableCell>
                        <TableCell>${item.rate.toLocaleString()}</TableCell>
                        <TableCell>${(item.qty * item.rate).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={isMobile ? 3 : 5}>Subtotal</TableCell>
                      <TableCell>
                        ${order.items.reduce((acc, item) => acc + item.qty * item.rate, 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={isMobile ? 3 : 5}>Shipping</TableCell>
                      <TableCell>${order.shipping}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={isMobile ? 3 : 5}>Total</TableCell>
                      <TableCell>
                        $
                        {(
                          order.items.reduce((acc, item) => acc + item.qty * item.rate, 0) +
                          (order.shipping ? parseFloat(order.shipping) : 0)
                        ).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} justifyContent="flex-end" marginTop={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!(order && order.is_fulfilled)}
                      onChange={() => handleToggleFulfillment(order.id)}
                    />
                  }
                  label={order.is_fulfilled ? 'Order finished' : 'Mark as finished'}
                  sx={{
                    // backgroundColor: 'black',
                    border: '1px solid',
                    borderColor: (theme) => theme.palette.primary.dark,
                    color: order.is_fulfilled ? (theme) => theme.palette.primary.light : '',
                    padding: '0 10px',
                    borderRadius: '5px',
                    width: isMobile ? '100%' : '20%',
                    margin: isMobile ? '5px 0px 0px 0px' : '0px 15px 0px 0px',
                  }}
                />{' '}
                {!isMobile && (
                  <Button
                    size="small"
                    onClick={() => printOrder(order)}
                    sx={{
                      margin: '0px 15px 0px 0px',
                      border: '1px solid ',
                      padding: '0px 0px 0px 0px',
                      color: (theme) => theme.palette.primary.light,

                      borderColor: (theme) => theme.palette.primary.light,
                    }}
                  >
                    <Typography sx={{ color: (theme) => theme.palette.primary.light }}>Print</Typography>
                  </Button>
                )}
                <Button
                  size={isMobile ? 'large' : 'small'}
                  sx={{
                    margin: isMobile ? '15px 0px 15px 0px' : '0px 15px 0px 0px',
                    border: '1px solid ',
                    borderColor: (theme) => theme.palette.primary.light,
                    padding: '0px 0px 0px 0px',
                    color: '#AAAAAA',
                  }}
                  onClick={() => handleEditClick(order)}
                >
                  <Typography sx={{ color: (theme) => theme.palette.primary.light }}>Edit</Typography>
                </Button>
                <Button
                  size={isMobile ? 'large' : 'small'}
                  sx={{
                    margin: '0px 0px 0px 0px',
                    border: '1px solid ',
                    borderColor: '#E74C3C',
                    padding: '0px 5px 0px 5px',
                    color: '#AAAAAA',
                  }}
                  onClick={() => {
                    setOrderToDelete(order);
                    handleOpenDialog();
                  }}
                >
                  <Typography sx={{ color: (theme) => theme.palette.primary.light }}>Delete</Typography>
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{'Are you sure?'}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Deleting this order will remove it permanently. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="primary" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

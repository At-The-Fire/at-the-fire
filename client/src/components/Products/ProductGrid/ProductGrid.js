import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useTheme,
  useMediaQuery,
  Modal,
  Box,
  IconButton,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close'; // Import the CloseIcon
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import usePostStore from '../../../stores/usePostStore.js';
import { useNavigate } from 'react-router-dom';
import { isProductSold } from '../../../services/fetch-utils.js';

// Assuming `products` is an array of product objects and `setSelectedProduct` is the function to set the current product to edit
const ProductGrid = ({
  products,
  setSelectedProduct,
  selectedProduct,
  handleEditClick,
  handleDeleteClick,
  filteredProducts,
  paginate,
  currentPage,
  indexOfLastProduct,
  productsPerPage,
  isDeleting,
}) => {
  const { restricted } = usePostStore();
  const navigate = useNavigate();

  const [dateTotals, setDateTotals] = useState({});
  const [openModal, setOpenModal] = useState(false);
  const [modalImage, setModalImage] = useState('');

  const [productToDelete, setProductToDelete] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteGalleryPostChecked, setDeleteGalleryPostChecked] = useState(true);

  const [quantitySoldMap, setQuantitySoldMap] = useState({});

  function calcRemaining(product) {
    const qty = Number(product.qty) || 1;
    const sold =
      Array.isArray(product.sales) && product.sales.length
        ? product.sales.reduce((sum, s) => sum + (Number(s.quantitySold) || 0), 0)
        : 0;
    return qty - sold;
  }

  const handleOpenDialog = () => {
    setOpenDialog(true);
    setDeleteGalleryPostChecked(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleConfirmDelete = async () => {
    await handleDeleteClick(productToDelete, deleteGalleryPostChecked);
    handleCloseDialog();
  };

  const productTypeColors = {
    auction: '#391bfc78',
    'direct-sale': '#478dff78',
    inventory: 'rgb(91, 91, 91)',
    'prep-other': 'rgba(0, 26, 255, 0.25)',
  };

  // grab data from products for display
  useEffect(() => {
    const newDateTotals = {};
    const newQuantitySoldMap = {};

    products.forEach((product) => {
      const price = parseFloat(product.price) || 0;
      const dateStr = formatDate(product.date);
      newDateTotals[dateStr] = (newDateTotals[dateStr] || 0) + price * product.qty;

      // Calculate quantity sold for this product
      newQuantitySoldMap[product.id] = Array.isArray(product.sales)
        ? product.sales.reduce((sum, sale) => sum + (sale.quantitySold || 0), 0)
        : 0;
    });
    setQuantitySoldMap(newQuantitySoldMap);
    setDateTotals(newDateTotals);
  }, [products]);

  const formatDate = (timestamp) => {
    timestamp = Number(timestamp);
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const normalizeDate = (timestamp) => {
    const date = new Date(Number(timestamp));
    date.setHours(0, 0, 0, 0); // Normalize to the start of the day
    return date.getTime();
  };

  const isLastProductOfDate = (index) => {
    if (index < 0 || index >= products.length || !products[index]) {
      return false;
    }

    const currentProductDate = normalizeDate(products[index].date);

    if (index === products.length - 1) {
      return true;
    }

    const nextProductDate = normalizeDate(products[index + 1].date);

    return currentProductDate !== nextProductDate;
  };

  const isSameDayAsPrevious = (index) => {
    if (index <= 0) return false;

    const previousProductDate = normalizeDate(products[index - 1].date);
    const currentProductDate = normalizeDate(products[index].date);

    return previousProductDate === currentProductDate;
  };

  // This function assumes that products are sorted by date
  const getDayTotalDisplay = (product, index) => {
    // If this is the last product of the date, return the formatted date.
    if (isLastProductOfDate(index)) {
      const formattedDate = formatDate(product.date);
      const total = dateTotals[formattedDate]?.toLocaleString();

      return (
        <Box
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'flex-start',
          }}
        >
          <Typography variant="body1">{formattedDate}:</Typography>
          <Typography width={'100%'}>
            <Typography
              variant="span"
              sx={{
                color: 'text.secondary',
                marginRight: '8px',
                textAlign: 'right',
              }}
            >
              Day Total:
            </Typography>

            <Typography
              variant="span"
              sx={{
                color: product.type === 'prep-other' && total < 0 ? 'red' : 'inherit',
                fontSize: '1.1rem',
              }}
            >
              {total < 0 ? `-$${-1 * total}` : `$${total}`}
            </Typography>
          </Typography>
        </Box>
      );
    }
    return null;
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  const handleImageClick = (imageUrl) => {
    setModalImage(imageUrl);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  // Define a color index variable to keep track of the current color
  let currentColorIndex = -1;
  let lastProductDate = null;

  const getSequentialColor = (product, index) => {
    const currentProductDate = new Date(Number(product.date)).toDateString(); // Convert to a comparable string format

    if (currentProductDate !== lastProductDate) {
      currentColorIndex = (currentColorIndex + 1) % dayColors.length;
      lastProductDate = currentProductDate;
    }

    return dayColors[currentColorIndex];
  };

  const dayColors = [
    'rgba(0, 123, 255, 0.2)', // Light Blue
    'rgba(40, 167, 69, 0.2)', // Light Green
    'rgba(23, 162, 184, 0.2)', // Light Teal
    'rgba(65, 117, 125, 0.2)', // Light Grey (Neutral)
    'rgba(0, 123, 255, 0.2)', // Medium Blue
    'rgba(40, 167, 69, 0.2)', // Medium Green
    'rgba(23, 162, 184, 0.2)', // Medium Teal
  ];

  const calculateShelfTime = (product) => {
    const created = new Date(parseInt(product.date));
    const sold = isProductSold(product)
      ? new Date(parseInt(product.sales[product.sales.length - 1].dateSold))
      : new Date();
    created.setHours(0, 0, 0, 0);
    sold.setHours(0, 0, 0, 0);

    const diffTime = sold - created;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Place this helper function above the ProductGrid component
  const getCardBorder = (isSelected, isSameDay, color, isLastOfDay) => {
    if (isSelected) {
      return {
        border: '3px solid yellow',
      };
    }
    return {
      borderLeft: `2px solid ${color}`,
      borderRight: `2px solid ${color}`,
      borderBottom: isLastOfDay ? `2px solid ${color}` : 'none',
      borderTop: isSameDay ? 'none' : `2px solid ${color}`,
    };
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        <Button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
          Previous
        </Button>

        <Typography sx={{ margin: '0 15px' }}>
          Page {currentPage} of {Math.ceil(filteredProducts.length / productsPerPage)}
        </Typography>

        <Button onClick={() => paginate(currentPage + 1)} disabled={indexOfLastProduct >= filteredProducts.length}>
          Next
        </Button>
      </Box>

      <Grid container sx={{ margin: '0px 0px 0px 0px', width: '99%' }}>
        {products.map((product, index) => (
          <Grid
            item
            xs={12}
            key={product.id}
            sx={{
              marginBottom: '0px',
              transition: 'margin-bottom 0.2s',
            }}
          >
            <Card
              sx={{
                boxSizing: 'border-box',
                boxShadow: 'none',
                borderRadius: '0px',
                borderTopLeftRadius: isSameDayAsPrevious(index) ? '0px' : '8px',
                borderTopRightRadius: isSameDayAsPrevious(index) ? '0px' : '8px',
                ...getCardBorder(
                  selectedProduct?.id === product.id,
                  isSameDayAsPrevious(index),
                  getSequentialColor(product, index),
                  isLastProductOfDate(index)
                ),
                margin: '0',
                padding: '0',
                background: '#232323',
                marginTop: isSameDayAsPrevious(index) ? '0px' : '15px',
                transition: 'margin-bottom 0.2s',
                '& .MuiCardContent-root': {
                  borderBottom: isLastProductOfDate(index) ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              <CardContent
                sx={{
                  padding: '8px',
                  '&:last-child': { padding: '4px 2px 0px 2px' },
                }}
              >
                {isMobile ? (
                  // Mobile View Layout =================================================
                  // Mobile View Layout =================================================
                  <>
                    <Grid
                      item
                      sx={{
                        display: 'grid',
                        gridTemplateRows: '52px',
                        gridTemplateColumns: '60px 1fr 75px 22px',
                        gap: '8px',
                        position: 'relative',
                        '& .MuiTypography-root': {
                          fontSize: '0.9rem',
                        },
                      }}
                    >
                      <Box
                        component="img"
                        sx={{
                          height: isMobile ? 70 : 60,
                          width: isMobile ? 70 : 60,
                          borderRadius: '5px',
                          cursor: 'pointer',
                          border: product.post_id ? '2px solid ' : '',
                          borderColor: (theme) => theme.palette.primary.light,
                        }}
                        src={product.image_url}
                        alt={product.title}
                        onClick={() =>
                          product.post_id
                            ? navigate(`/gallery/${product.post_id}`)
                            : handleImageClick(product.image_url)
                        }
                      />

                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          marginLeft: '10px',
                        }}
                      >
                        <Box>
                          <Typography variant="body1" sx={{ textAlign: 'left' }}>
                            {product?.title
                              ? product.title.length > 15
                                ? `${product.title.slice(0, 15)}...`
                                : product.title
                              : ''}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              textAlign: 'left',
                            }}
                          >
                            {product.category}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            backgroundColor: 'transparent',
                            border: `2px solid ${productTypeColors[product.type] || '#FFFFFF'}`,
                            padding: '2px 4px',
                            borderRadius: '4px',
                            textTransform: 'capitalize',
                            fontSize: '0.8rem',
                            width: 'fit-content',
                          }}
                        >
                          {product.type}
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: '2px',
                        }}
                      >
                        {!isSameDayAsPrevious(index) && (
                          <Typography variant="body2">{formatDate(product.date)}</Typography>
                        )}
                        {isLastProductOfDate(index) && (
                          <>
                            {/* <Typography variant="body2">{formatDate(product.date)}</Typography> */}
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'text.secondary',
                                borderTop: '1px solid rgba(255,255,255,0.1)',
                                paddingTop: '4px',
                                marginTop: '4px',
                                width: '100%',
                                textAlign: 'right',
                              }}
                            >
                              {isLastProductOfDate(index) && isSameDayAsPrevious(index)
                                ? `${formatDate(product.date)} Total: `
                                : 'Total: '}
                              ${dateTotals[formatDate(product.date)]?.toLocaleString()}
                            </Typography>
                          </>
                        )}
                        {product.sold && product.type !== 'prep-other' ? (
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'lightgreen',
                              fontWeight: { xs: 'bold', lg: 'normal' },
                              fontSize: { xs: '1rem', lg: '0.85rem' },
                              whiteSpace: 'nowrap',
                              width: 'auto',
                            }}
                          >
                            SOLD
                          </Typography>
                        ) : !isProductSold(product) && product.type !== 'prep-other' ? (
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'orange',
                              fontWeight: { xs: 'bold', lg: 'normal' },
                              fontSize: { xs: '1rem', lg: '0.85rem' },
                              whiteSpace: 'nowrap',
                              width: 'auto',
                            }}
                          >
                            {calculateShelfTime(product) === 'no date'
                              ? 'no date'
                              : `${calculateShelfTime(product)} day${calculateShelfTime(product) === 1 ? '' : 's'}`}
                          </Typography>
                        ) : null}
                      </Box>

                      <EditOutlinedIcon
                        onClick={() => {
                          handleEditClick(product);
                          setSelectedProduct(product);
                        }}
                        disabled={restricted ? restricted : false}
                        sx={{
                          cursor: 'pointer',
                          fontSize: 'large',
                          position: 'relative',
                          top: '6px',
                        }}
                      />
                    </Grid>

                    <Grid
                      item
                      xs={12}
                      sx={{
                        display: 'grid',
                        justifyContent: 'space-between',
                        padding: '0px',
                      }}
                    >
                      <Box
                        sx={{
                          gridColumnStart: '2',
                          gridColumnEnd: '3',
                          display: 'flex',
                          gap: '8px',
                        }}
                      >
                        <DeleteForeverOutlinedIcon
                          sx={{
                            fontSize: 'large',
                            color: 'error.main',
                            cursor: 'pointer',
                            margin: '0 4px 0 0',
                            position: 'relative',
                            top: '-6px',
                          }}
                          onClick={() => {
                            handleOpenDialog();
                            setProductToDelete(product);
                          }}
                        />
                      </Box>
                    </Grid>
                  </>
                ) : (
                  // Desktop View Layout =================================================
                  // Desktop View Layout =================================================
                  // Desktop View Layout =================================================
                  <>
                    {/* <Grid container alignItems="center" sx={{ height: '100%' }}> */}
                    <Grid container sx={{ alignItems: 'center' }}>
                      <Grid
                        item
                        container
                        alignItems="center"
                        spacing={0}
                        key={product.id}
                        sx={{
                          height: '50px',
                          marginBottom: '0',
                          padding: '0',
                          position: 'relative',
                          top: '-10px',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 2fr 2fr 3fr 2fr 3fr 1fr ',
                          gridTemplateRows: '50px',
                          gap: '4px',
                        }}
                      >
                        {/* Image Column */}
                        <Grid sx={{ display: 'grid ' }}>
                          <Box
                            component="img"
                            sx={{
                              height: 54,
                              width: 54,
                              borderRadius: '5px',
                              cursor: 'pointer',
                              position: 'absolute',
                              top: '0px',
                              left: '-2px',
                              marginTop: '6px',
                              border: product.post_id ? '2px solid ' : '',
                              borderColor: (theme) => theme.palette.primary.light,
                            }}
                            src={product.image_url}
                            alt={product.title}
                            onClick={() =>
                              product.post_id
                                ? navigate(`/gallery/${product.post_id}`)
                                : handleImageClick(product.image_url)
                            }
                          />
                        </Grid>
                        {/* Date and Sold Status */}
                        <Grid
                          item
                          xs={1}
                          sx={{
                            transform: 'translateY(8px)',
                            alignSelf: 'center',
                            display: 'grid',
                          }}
                        >
                          {product.sold && product.type !== 'prep-other' ? (
                            <>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: 'lightgreen',
                                  fontWeight: { xs: 'bold', lg: 'normal' },
                                  fontSize: { xs: '1rem', lg: '0.85rem' },
                                  whiteSpace: 'nowrap',
                                  width: 'auto',
                                }}
                              >
                                SOLD
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: 'lightgreen',
                                  fontWeight: { xs: 'bold', lg: 'normal' },
                                  fontSize: { xs: '1rem', lg: '0.85rem' },
                                  whiteSpace: 'nowrap',
                                  width: 'auto',
                                }}
                              >
                                {calculateShelfTime(product) === 'no date'
                                  ? 'no date'
                                  : `${calculateShelfTime(product)} day${calculateShelfTime(product) === 1 ? '' : 's'}`}
                              </Typography>
                            </>
                          ) : !isProductSold(product) && product.type !== 'prep-other' ? (
                            <>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: 'orange',
                                  fontWeight: { xs: 'bold', lg: 'normal' },
                                  fontSize: { xs: '1rem', lg: '0.85rem' },
                                  whiteSpace: 'nowrap',
                                  width: 'auto',
                                }}
                              >
                                Available
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: 'orange',
                                  fontWeight: { xs: 'bold', lg: 'normal' },
                                  fontSize: { xs: '1rem', lg: '0.85rem' },
                                  whiteSpace: 'nowrap',
                                  width: 'auto',
                                }}
                              >
                                {calculateShelfTime(product)} days
                              </Typography>
                            </>
                          ) : null}
                        </Grid>
                        {/* Product Type */}
                        <Grid
                          item
                          sx={{
                            transform: 'translateY(6px)',
                            height: '100%',
                          }}
                        >
                          <Typography
                            sx={{
                              backgroundColor: productTypeColors[product.type] || '#FFFFFF',
                              borderRadius: '5px',
                              width: '90%',
                              textTransform: 'capitalize',
                              display: 'inline-block',
                              height: '60%',
                              paddingTop: '4px',
                            }}
                          >
                            {product.type}
                          </Typography>
                        </Grid>
                        {/* Product Title */}
                        <Grid item height="100%">
                          <Typography textAlign={'left'} sx={{ transform: 'translateY(10px)' }}>
                            {product.title}
                          </Typography>
                        </Grid>
                        {/* Product Category */}
                        <Grid item>
                          <Typography
                            color="text.secondary"
                            sx={{
                              transform: product.sold ? 'translateY(-2px)' : 'translateY(8px)',
                              textAlign: 'left',
                              pl: '2rem',
                            }}
                            variant="body2"
                          >
                            {product.category}
                          </Typography>{' '}
                          {!product.sold && (
                            <Typography
                              variant="body2"
                              sx={{
                                color: calcRemaining(product) === 0 ? 'error.main' : 'success.main',
                                transform: 'translateY(8px)',
                                textAlign: 'left',
                                pl: '2rem',
                              }}
                            >
                              In Stock: {calcRemaining(product)}
                            </Typography>
                          )}
                        </Grid>
                        {/* Product Price */}
                        <Grid item sx={{ transform: 'translateY(-2px)' }}>
                          <Typography
                            sx={{
                              borderRadius: '5px',
                              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                            }}
                            variant="body2"
                            className={
                              product.type === 'auction' && parseFloat(product.price) === 0 ? 'highlight-price' : ''
                            }
                          >
                            {product.type !== 'prep-other' ? 'Price: ' : 'Cost: '}
                            <span style={{ color: product.type === 'prep-other' ? 'red' : 'white' }}>
                              ${Number(product.price).toLocaleString()}
                            </span>{' '}
                            {product.qty > 1 ? `× ${product.qty}` : ''}
                          </Typography>
                        </Grid>
                        {/* Conditional Day Total Display */}
                        {isLastProductOfDate(index) && (
                          <Grid item sx={{ position: 'relative', top: '8px', left: '30%' }}>
                            {getDayTotalDisplay(product, index)}
                          </Grid>
                        )}{' '}
                        {/* Edit and Delete Icons */}
                        <Grid
                          item
                          sx={{
                            display: 'grid',
                            gap: '6px',
                            position: 'relative',
                            top: '10px',
                            gridColumn: '8',
                            justifySelf: 'end',
                          }}
                        >
                          {/* <Grid item> */}
                          <EditOutlinedIcon
                            onClick={() => {
                              handleEditClick(product);
                              setSelectedProduct(product);
                            }}
                            disabled={restricted}
                            sx={{ cursor: 'pointer', fontSize: 'large' }}
                          />
                          <DeleteForeverOutlinedIcon
                            onClick={() => {
                              handleOpenDialog();
                              setProductToDelete(product);
                            }}
                            sx={{ fontSize: 'extraLarge', color: 'error.main', cursor: 'pointer' }}
                          />
                        </Grid>
                      </Grid>
                    </Grid>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Modal open={openModal} onClose={handleCloseModal}>
        <Box
          sx={{
            position: 'absolute',
            top: isMobile ? '60%' : '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: isMobile ? '100%' : '45%',
            height: '100%',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
          }}
        >
          <IconButton onClick={handleCloseModal} sx={{ position: 'absolute', top: 8, right: 8 }}>
            <CloseIcon />
          </IconButton>
          <Box component="img" src={modalImage} alt="Product Image" sx={{ width: '100%' }} />
        </Box>
      </Modal>
      <Dialog
        open={openDialog}
        onClose={isDeleting ? undefined : handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{'Are you sure?'}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Deleting this product will remove it permanently. This action cannot be undone.
          </DialogContentText>
          {productToDelete?.post_id && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <input
                  type="checkbox"
                  id="delete-gallery-post-checkbox"
                  checked={deleteGalleryPostChecked}
                  onChange={(e) => setDeleteGalleryPostChecked(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <label htmlFor="delete-gallery-post-checkbox" style={{ fontSize: '1rem', cursor: 'pointer' }}>
                  Delete associated Gallery Post?
                </label>
              </Box>
              <DialogContentText id="alert-dialog-description">
                If there is a gallery post associated with this product, checking this box will also remove it and its
                images. If unchecked, only the product will be deleted.
              </DialogContentText>
            </>
          )}
        </DialogContent>
        <DialogActions>
          {!isDeleting ? (
            <Box>
              {' '}
              <Button onClick={handleCloseDialog} color="primary" sx={{ fontSize: '1rem' }}>
                Cancel
              </Button>
              <Button onClick={handleConfirmDelete} color="primary" sx={{ fontSize: '1rem' }} autoFocus>
                Confirm
              </Button>
            </Box>
          ) : (
            <Typography
              color="primary"
              sx={{
                padding: '5px',
                borderRadius: '5px',
                width: '150px',
                textAlign: 'center',
              }}
            >
              Deleting...
            </Typography>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProductGrid;

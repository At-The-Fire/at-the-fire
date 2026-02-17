import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
  ButtonGroup,
  useMediaQuery,
  useTheme,
  Checkbox,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { toast } from 'react-toastify';
import usePostStore from '../../stores/usePostStore.js';
import FlamePipe from '../FlamePipe/FlamePipe.js';
import { deleteProductSales } from '../../services/fetch-products.js';
import { isProductSold } from '../../services/fetch-utils.js';

export default function InventoryMgtForm({
  selectedButton,
  handleNewClick,
  mode,
  handleProductSubmit,
  // handleProductChange,
  product,
  products,
  dateAsNumber,
  setProduct,
  setProducts,
  files,
  setFiles,
  currentImage,
  setCurrentImage,
  handleFormClose,
  createGalleryPost,
  setCreateGalleryPost,
  formLoading,
  setOriginalThumbnail,
  isNewClick,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { restricted } = usePostStore();

  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  const [showValidation, setShowValidation] = useState(false);

  const imageText = createGalleryPost ? ' up to 10 images' : ' an image';
  const mobileMessage = `Tap to select${imageText}`;
  const desktopMessage = `Drag 'n' drop an image here, or click to select${imageText}`;

  const [productTemplates, setProductTemplates] = useState([]);

  const [isBatch, setIsBatch] = useState(false);

  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  // Calculate qty remaining
  const totalSold = (product.sales || []).reduce((sum, s) => sum + (Number(s.quantitySold) || 0), 0);
  const qtyRemaining = (Number(product.qty) || 0) - totalSold;
  // State for new sale entry
  const [newSaleQty, setNewSaleQty] = useState(1);
  const [newSaleDate, setNewSaleDate] = useState(null);

  const handleProductChange = (e) => {
    const { name, value } = e.target;

    if (value.length > 255) {
      toast.warn('Limit of 255 characters', {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'products-4',
        autoClose: true,
      });
      return;
    }

    if (name === 'price' || name === 'num_days' || name === 'qty') {
      // Check length
      if (value.length > 7) {
        toast.warn('Maximum 7 digits allowed', {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'numeric-1',
          autoClose: true,
        });
        return;
      }
      // Check if it's a valid positive number
      if (isNaN(value) || Number(value) < 0) {
        toast.warn('Please enter a valid positive number', {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'numeric-2',
          autoClose: true,
        });
        return;
      }
    }

    // if (
    //   name === 'type' ||
    //   name === 'category' ||
    //   name === 'date' ||
    //   name === 'title' ||
    //   name === 'description' ||
    //   name === 'num_days' ||
    //   name === 'sold' ||
    //   name === 'qty'
    // ) {
    //   setProduct((prev) => {
    //     const updated = {
    //       ...prev,
    //       [name]: name === 'sold' ? value === 'true' : value,
    //     };
    //     // Recalculate sold if qty or sales changes
    //     if (name === 'qty' || name === 'sales') {
    //       updated.sold = calculateSoldStatus(updated);
    //     }
    //     return updated;
    //   });
    // } else if (name === 'price' && !isNaN(value)) {
    //   setProduct((prev) => ({ ...prev, [name]: value }));
    // }
    if (name === 'type' && value === 'prep-other') {
      setProduct((prev) => {
        const updated = {
          ...prev,
          type: value,
          title: 'Prep work/ other',
          price: prev.price ? (-Math.abs(Number(prev.price))).toString() : '',
        };
        updated.sold = calculateSoldStatus(updated);
        return updated;
      });
      return;
    }

    // FIXED: Consistent state updates with proper sold calculation
    setProduct((prev) => {
      const updated = {
        ...prev,
        [name]: name === 'sold' ? value === 'true' : value,
      };

      // Recalculate sold status when relevant fields change
      if (name === 'qty' || name === 'sales') {
        updated.sold = calculateSoldStatus(updated);
      }

      // Handle sold status changes for single products
      if (name === 'sold' && !isBatch) {
        if (value === 'true') {
          // Set as sold with default sale record
          updated.sales = [
            {
              quantitySold: 1,
              dateSold: updated.sales?.[0]?.dateSold || Date.now(),
            },
          ];
          updated.sold = true;
        } else {
          // Set as available
          updated.sales = [];
          updated.sold = false;
        }
      }

      return updated;
    });
  };

  // Helper to calculate sold status
  function calculateSoldStatus(product) {
    const totalSold = (product.sales || []).reduce((sum, s) => sum + (Number(s.quantitySold) || 0), 0);
    return totalSold >= (Number(product.qty) || 1);
  }

  const handleAddSale = () => {
    if (!newSaleQty || !newSaleDate || newSaleQty < 1 || newSaleQty > qtyRemaining) return;

    const newSale = { dateSold: newSaleDate.getTime(), quantitySold: Number(newSaleQty) };

    // build updated product
    // const updated = {
    //   ...product,
    //   sales: [...(product.sales || []), newSale],
    // };
    // updated.sold = calculateSoldStatus(updated);

    // FIXED: Create updated product with proper structure
    const updatedSales = [...(product.sales || []), newSale];
    const updated = {
      ...product,
      sales: updatedSales,
    };
    updated.sold = calculateSoldStatus(updated);

    // 1) update form state
    setProduct(updated);
    // 2) mirror into parent products array
    setProducts((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
    setNewSaleQty(1);
    setNewSaleDate(null);
  };

  const handleRemoveSale = (idx) => {
    // 1) build updated product
    const updatedSales = (product.sales || []).filter((_, i) => i !== idx);
    const updated = { ...product, sales: updatedSales };
    updated.sold = calculateSoldStatus(updated);

    // 2) update form
    setProduct(updated);
    // 3) mirror to parent
    setProducts((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowValidation(true);
    const requiredFields = ['type', 'date', 'num_days', 'price', 'description'];
    if (product.type !== 'prep-other') {
      requiredFields.push('title', 'category');
    }

    if (product.type === 'prep-other') {
      product.title === 'Prep work/ other';
      product.price = (-Math.abs(product.price)).toString();
    }

    const isValid = requiredFields.every((field) => product[field]);
    const hasImage = createGalleryPost ? files.length > 0 : currentImage;

    if (isValid && hasImage) {
      handleProductSubmit(e);
      setActiveTab(0);
      setShowValidation(false);
    } else {
      const fieldLabels = {
        num_days: 'Number of Days',
        // Add any other special cases here
      };

      const missingFields = requiredFields.filter((field) => !product[field]);
      if (!hasImage) {
        missingFields.push('image');
      }

      const formattedFields = missingFields.map(
        (field) =>
          fieldLabels[field] ||
          field
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
      );

      toast.warn(`Required fields missing: ${formattedFields.join(', ')}`, {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
      });
    }
  };

  const handleTabChange = (newTab) => {
    setShowValidation(false); // Reset validation when changing tabs
    setActiveTab(newTab);
  };

  useEffect(() => {
    if (mode === 'edit' && product.image_url) {
      setCurrentImage(product.image_url);
      setFiles([]);
    }
  }, [product.image_url, mode, setFiles, setCurrentImage]);

  const onDrop = useCallback(
    (acceptedFiles) => {
      const mappedFiles = acceptedFiles.map((file) => Object.assign(file, { preview: URL.createObjectURL(file) }));

      if (createGalleryPost) {
        setFiles((prevFiles) => [...prevFiles, ...mappedFiles]);
        setCurrentImage(mappedFiles);
      } else {
        setFiles(mappedFiles);
        setCurrentImage(mappedFiles[0].preview);
      }
    },
    [createGalleryPost, setFiles, setCurrentImage]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    multiple: createGalleryPost,
    maxFiles: 10,
  });

  useEffect(() => {
    let newCategories = [
      'Beads',
      'Blunt Tips',
      'Bubblers',
      'Collabs',
      'Cups',
      'Dry Pieces',
      'Goblets',
      'Iso stations',
      'Marbles',
      'Pendants',
      'Recyclers',
      'Rigs',
      'Slides',
      'Spinner caps',
      'Terp pearls',
      'Tubes',
      'Misc',
    ];
    setCategories(newCategories);
  }, [products]);

  const handleImageDelete = (index) => {
    if (createGalleryPost) {
      setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    } else {
      setCurrentImage('');
    }
  };

  useEffect(() => {
    setOriginalThumbnail(product.image_url);
  }, [setOriginalThumbnail, product.image_url, files]);

  const renderThumbnails = () => (
    <div className="thumbnails-container">
      {createGalleryPost ? (
        files.map((file, index) => {
          return (
            <div key={file.name} className="thumbnail-wrapper">
              <img src={file.preview} alt={`Preview ${index + 1}`} className="thumbnail" />
              <button type="button" className="delete-button-form" onClick={() => handleImageDelete(index)}>
                X
              </button>
            </div>
          );
        })
      ) : (
        <div className="thumbnail-wrapper">
          {currentImage && (
            <>
              <img src={currentImage} alt="Current image" className="thumbnail" />
              <button type="button" className="delete-button-form" onClick={() => setCurrentImage('')}>
                X
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  const handleCheckboxChange = (event) => {
    setCreateGalleryPost(event.target.checked);
    setFiles([]);
  };

  const handleBatchCheckboxChange = (event) => {
    // enable input field for quantity
    setIsBatch(event.target.checked);
    setProduct((prev) => {
      const updated = { ...prev, qty: event.target.checked ? prev.qty : 1 };
      updated.sold = calculateSoldStatus(updated);
      return updated;
    });
  };

  const handleProductTemplateChange = (e) => {
    const selectedTemplate = productTemplates.find((template) => template.title === e.target.value);
    // Normalize category to match one of the allowed categories
    let normalizedCategory = '';
    if (selectedTemplate?.category) {
      const match = categories.find(
        (cat) => cat.toLowerCase().trim() === selectedTemplate.category.toLowerCase().trim()
      );
      normalizedCategory = match || '';
    }
    const updated = {
      ...selectedTemplate,
      title: selectedTemplate?.title,
      category: normalizedCategory,
      price: selectedTemplate?.price,
      description: selectedTemplate?.description,
      type: selectedTemplate?.type,
      date: selectedTemplate?.date,
      num_days: selectedTemplate?.num_days,
      sales: selectedTemplate?.sales || [],
      qty: selectedTemplate?.qty || 1,
      image_url: selectedTemplate?.image_url,
      public_id: selectedTemplate?.public_id,
      post_id: selectedTemplate?.post_id || null,
    };
    updated.sold = calculateSoldStatus(updated);
    setProduct(updated);
    setCurrentImage(selectedTemplate?.image_url);
  };

  useEffect(() => {
    const uniqueProducts = products.reduce((acc, current) => {
      if (!current.title || current.type === 'prep-other') return acc;

      const productAlreadyExists = acc.find(
        (item) => item.title.toLowerCase().trim() === current.title.toLowerCase().trim()
      );

      if (!productAlreadyExists) {
        acc.push({
          ...current,
          title: current.title,
          post_id: null,
        });
      }
      return acc;
    }, []);

    setProductTemplates(uniqueProducts);
  }, [products]);

  // near the top of InventoryMgtForm, after your hooks:
  useEffect(() => {
    if (mode === 'edit' && Number(product.qty) > 1) {
      setIsBatch(true);
    }
  }, [mode, product.qty]);

  const handleOpenTemplateModal = () => {
    setTemplateModalOpen(true);
  };

  const handleCloseTemplateModal = () => {
    setTemplateModalOpen(false);
  };

  const handleProductTemplateChangeModal = (e) => {
    handleProductTemplateChange(e);
    setTemplateModalOpen(false);
  };

  // Define tabs and their content
  const tabs = [
    {
      label: 'Basic Info',
      content: (
        <div className="tab1-wrapper">
          <FormControl variant="outlined" fullWidth sx={{ mb: 1 }}>
            <InputLabel id="product-type-label" sx={{ fontSize: '0.75rem' }}>
              Type
            </InputLabel>
            <Select
              labelId="product-type-label"
              name="type"
              value={product.type}
              onChange={handleProductChange}
              label="Type"
              required
              sx={{
                height: '45px',
                '& .MuiSelect-select:focus': {
                  backgroundColor: 'transparent',
                  height: 30,
                },
              }}
              error={showValidation && !product.type}
              helpertext={showValidation && !product.type ? 'Type is required' : ''}
            >
              <MenuItem value="auction">Auction</MenuItem>
              <MenuItem value="direct-sale">Direct Sale</MenuItem>
              <MenuItem value="inventory">Inventory</MenuItem>
              <MenuItem value="prep-other">Prep/ Other</MenuItem>
            </Select>
          </FormControl>
          {mode === 'new' && product.type !== 'prep-other' && productTemplates.length > 0 && (
            <Button variant="outlined" onClick={handleOpenTemplateModal} sx={{ mb: 1 }}>
              Load from Template
            </Button>
          )}
          <Dialog open={templateModalOpen} onClose={handleCloseTemplateModal}>
            <DialogTitle>Select Product Template</DialogTitle>
            <DialogContent>
              <FormControl fullWidth>
                <InputLabel id="template-label" sx={{ fontSize: '0.75rem' }}>
                  Saved Product Templates
                </InputLabel>
                <Select
                  labelId="template-label"
                  name="template"
                  id="template"
                  label="Template"
                  value={product.title || ''}
                  onChange={handleProductTemplateChangeModal}
                  sx={{
                    height: '45px',
                    '& .MuiSelect-select:focus': {
                      backgroundColor: 'transparent',
                      height: 30,
                    },
                  }}
                  MenuProps={{
                    anchorOrigin: {
                      vertical: 'bottom',
                      horizontal: 'left',
                    },
                    transformOrigin: {
                      vertical: 'top',
                      horizontal: 'left',
                    },
                    sx: {
                      '& .MuiPaper-root': {
                        maxHeight: '300px',
                        backgroundColor: '#121212',
                        '& .MuiList-root': {
                          paddingTop: 0,
                          '& .MuiMenuItem-root': {
                            backgroundColor: '#121212',
                            opacity: 1,
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              opacity: 1,
                            },
                            '&:first-of-type': {
                              '&:hover': {
                                backgroundColor: '#121212',
                                opacity: 1,
                              },
                            },
                          },
                        },
                      },
                    },
                  }}
                >
                  <MenuItem
                    sx={{
                      position: 'sticky',
                      top: 0,
                      backgroundColor: 'background.paper',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 16px',
                      zIndex: 1000,
                      '&.MuiButtonBase-root': {
                        backgroundColor: 'background.paper',
                        opacity: 1,
                      },
                      '&.MuiMenuItem-root': {
                        backgroundColor: 'background.paper',
                        opacity: 1,
                      },
                      '&:hover': {
                        backgroundColor: 'background.paper',
                        opacity: 1,
                      },
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const select = document.querySelector('#template');
                      if (select) {
                        select.blur();
                      }
                    }}
                    value={product.title || ''}
                  >
                    <Typography variant="subtitle2">Select Template</Typography>
                    <CloseIcon fontSize="small" />
                  </MenuItem>
                  {productTemplates.map((template) => (
                    <MenuItem key={template.id} value={template.title}>
                      <Box
                        sx={{
                          display: 'flex',
                          width: '100%',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <Box component="img" src={template.image_url} sx={{ width: '40px', height: '40px' }} />
                        <Typography variant="body1" sx={{ fontSize: '0.875rem' }}>
                          {template.title}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseTemplateModal}>Cancel</Button>
            </DialogActions>
          </Dialog>
          <LocalizationProvider
            dateAdapter={AdapterDateFns}
            error={showValidation && !product.date}
            helpertext={showValidation && !product.date ? 'Date is required' : ''}
          >
            <DatePicker
              label="Date Created"
              value={mode === 'edit' ? dateAsNumber : product.date ? new Date(product.date) : null}
              onChange={(newValue) => {
                const newDateValue = newValue ? newValue.getTime() : null;
                setProduct((prev) => ({ ...prev, date: newDateValue }));
              }}
              required
              slotProps={{
                textField: {
                  fullWidth: true,
                  sx: {
                    '& .MuiFormLabel-root': {
                      fontSize: '0.75rem',
                    },
                    '& .MuiInputBase-root': {
                      height: 45,
                    },
                  },
                },
              }}
            />
          </LocalizationProvider>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Checkbox checked={isBatch} onChange={handleBatchCheckboxChange} sx={{ mt: 1, mb: 1 }} />
            <span>Batch</span>{' '}
            <TextField
              fullWidth
              disabled={!isBatch}
              label="Number of Products"
              required
              name="qty"
              type="number"
              value={product.qty || 1}
              onChange={handleProductChange}
              inputProps={{ min: '1', step: '1', max: '1000' }}
              sx={{
                mt: 1,
                mb: 1,
                '& .MuiInputBase-root': {
                  height: 45,
                  fontSize: '0.875rem',
                  '& .MuiInputBase-input': {
                    textAlign: 'right',
                  },
                },
                '& .MuiFormLabel-root': {
                  fontSize: '0.75rem',
                },
              }}
              error={showValidation && !product.num_days}
              helpertext={showValidation && !product.num_days ? 'Number of days is required' : ''}
            />
          </Box>
          <TextField
            fullWidth
            label="Number of Days"
            required
            name="num_days"
            type="number"
            value={product.num_days || ''}
            onChange={handleProductChange}
            inputProps={{ min: '1', step: '1' }}
            sx={{
              mt: 1,
              mb: 1,
              '& .MuiInputBase-root': {
                height: 45,
                fontSize: '0.875rem',
                '& .MuiInputBase-input': {
                  textAlign: 'right',
                },
              },
              '& .MuiFormLabel-root': {
                fontSize: '0.75rem',
              },
            }}
            error={showValidation && !product.num_days}
            helpertext={showValidation && !product.num_days ? 'Number of days is required' : ''}
          />
        </div>
      ),
    },
    {
      label: 'Details',
      content: (
        <Box className={'tab2-wrapper'}>
          {product.type !== 'prep-other' && (
            <>
              <TextField
                fullWidth
                label="Title"
                name="title"
                value={product.title || ''}
                onChange={handleProductChange}
                required
                sx={{
                  mb: 1,
                  '& .MuiInputBase-root': {
                    height: 45,
                    fontSize: '0.875rem',
                  },
                }}
                error={showValidation && !product.title}
                helpertext={showValidation && !product.title ? 'Title is required' : ''}
              />
              <FormControl fullWidth variant="outlined" sx={{ mb: 1 }}>
                <InputLabel sx={{ fontSize: '0.75rem' }}>Category</InputLabel>
                <Select
                  name="category"
                  value={product.category || ''}
                  onChange={handleProductChange}
                  label="Category"
                  required
                  error={showValidation && !product.category}
                  helpertext={showValidation && !product.category ? 'Category is required' : ''}
                >
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {!isBatch && (
                <FormControl component="fieldset" sx={{ width: '100%' }}>
                  <FormLabel component="legend">Sold Status</FormLabel>
                  <RadioGroup
                    aria-label="sold status"
                    name="sold"
                    value={product.sold ? 'true' : 'false'}
                    onChange={(e) => {
                      const isSold = e.target.value === 'true';
                      setProduct((prev) => ({
                        ...prev,
                        sold: isSold,
                        sales: isSold ? [{ quantitySold: 1, dateSold: prev.sales?.[0]?.dateSold || Date.now() }] : [],
                      }));
                    }}
                    row
                    sx={{ '& .MuiTypography-root': { fontSize: '1rem' } }}
                  >
                    <FormControlLabel value="false" control={<Radio />} label="Available" />
                    <FormControlLabel value="true" control={<Radio />} label="Sold" />
                  </RadioGroup>
                </FormControl>
              )}
              {/* Batch sales table display */}
              {mode === 'edit' && isBatch && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      mb: 1,
                      color: qtyRemaining === 0 ? 'error.main' : 'success.main',
                      textAlign: 'left',
                      pl: 1,
                    }}
                  >
                    Quantity Remaining: {qtyRemaining}
                  </Typography>

                  <Box
                    component="table"
                    sx={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      background: '#181818',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <Box component="thead" sx={{ background: '#222' }}>
                      <Box component="tr">
                        <Box
                          component="th"
                          sx={{
                            p: 1,
                            borderBottom: '1px solid #333',
                            color: '#fff',
                            fontWeight: 600,
                            textAlign: 'left',
                          }}
                        >
                          # Sold
                        </Box>
                        <Box
                          component="th"
                          sx={{
                            p: 1,
                            borderBottom: '1px solid #333',
                            color: '#fff',
                            fontWeight: 600,
                            textAlign: 'left',
                          }}
                        >
                          Date Sold
                        </Box>
                        <Box
                          component="th"
                          sx={{
                            p: 1,
                            borderBottom: '1px solid #333',
                            color: '#fff',
                            fontWeight: 600,
                            textAlign: 'left',
                          }}
                        ></Box>
                      </Box>
                    </Box>
                    <Box component="tbody">
                      {(product.sales || []).map((sale, idx) => (
                        <Box component="tr" key={idx}>
                          <Box component="td" sx={{ p: 1, borderBottom: '1px solid #222', color: '#fff' }}>
                            {sale.quantitySold}
                          </Box>
                          <Box component="td" sx={{ p: 1, borderBottom: '1px solid #222', color: '#fff' }}>
                            {sale.dateSold ? new Date(Number(sale.dateSold)).toLocaleDateString() : ''}
                          </Box>
                          <Box component="td" sx={{ p: 1, borderBottom: '1px solid #222', color: '#fff' }}>
                            <Button variant="outlined" size="small" onClick={() => handleRemoveSale(idx)}>
                              Remove
                            </Button>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  {/* New sale entry */}
                  {qtyRemaining > 0 && (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, m: 1 }}>
                        <TextField
                          label="Pieces Sold"
                          type="number"
                          size="small"
                          value={newSaleQty}
                          onChange={(e) => setNewSaleQty(Math.max(1, Math.min(qtyRemaining, Number(e.target.value))))}
                          inputProps={{ min: 1, max: qtyRemaining }}
                          sx={{ width: 120 }}
                        />
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            label="Date Sold"
                            value={newSaleDate}
                            onChange={setNewSaleDate}
                            slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
                          />
                        </LocalizationProvider>
                      </Box>
                      <Button
                        variant="contained"
                        onClick={handleAddSale}
                        sx={{ width: '100%' }}
                        disabled={!newSaleQty || !newSaleDate || newSaleQty < 1 || newSaleQty > qtyRemaining}
                      >
                        Add Sale
                      </Button>
                    </>
                  )}
                </Box>
              )}
              {!isBatch && product.sold && (
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Date Sold"
                    value={product.sales[0].dateSold ? Number(product.sales[0].dateSold) : null}
                    onChange={(date) => {
                      setProduct((prev) => ({
                        ...prev,
                        sales: [
                          {
                            ...prev.sales[0],
                            quantitySold: 1,
                            dateSold: date ? date.getTime() : null,
                          },
                        ],
                      }));
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: showValidation && !(product.sales[0] && product.sales[0].dateSold),
                        helperText:
                          showValidation && !(product.sales[0] && product.sales[0].dateSold)
                            ? 'Date sold is required'
                            : '',
                        sx: {
                          mb: 1,
                          '& .MuiFormLabel-root': {
                            fontSize: '0.75rem',
                          },
                          '& .MuiInputBase-root': {
                            height: 45,
                          },
                        },
                      },
                    }}
                  />
                </LocalizationProvider>
              )}
            </>
          )}

          <TextField
            fullWidth
            label={product.type !== 'prep-other' ? 'Price' : 'Material Costs'}
            required
            name="price"
            type="number"
            value={product.price || ''}
            onChange={handleProductChange}
            inputProps={{ step: 1 }}
            sx={{
              mb: 1,
              '& .MuiInputBase-root': {
                height: 45,
                fontSize: '0.875rem',
                padding: '0 0 0 75%',
              },
            }}
            error={showValidation && !product.price}
            helpertext={showValidation && !product.price ? 'Price is required' : ''}
          />
        </Box>
      ),
    },
    {
      label: 'Images',
      content: (
        <>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description"
            required
            name="description"
            value={product.description || ''}
            onChange={handleProductChange}
            sx={{ mb: 2 }}
            error={showValidation && !product.description}
            helpertext={showValidation && !product.description ? 'Description is required' : ''}
          />

          {isNewClick && product.type !== 'prep-other' && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateRows: '1fr',
                gridTemplateColumns: '1fr 4fr',
                alignItems: 'center',
                border: '1px solid',
                borderColor: (theme) => theme.palette.primary.light,
                mb: 2,
              }}
            >
              <Checkbox checked={createGalleryPost} onChange={handleCheckboxChange} sx={{ gridColumn: '1' }} />
              <span>Create new gallery post</span>
            </Box>
          )}
          <Box
            {...getRootProps()}
            className="dropzone"
            sx={{
              borderColor: (theme) => theme.palette.primary.light,
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: '5px',
              padding: '10px',
              mb: 2,
              height: isMobile ? '45px' : '70px',
              '&:hover': {
                cursor: 'pointer',
                backgroundColor: (theme) => theme.palette.primary.main,
              },
            }}
          >
            <input {...getInputProps()} />
            <Typography>{isMobile ? mobileMessage : desktopMessage}</Typography>
          </Box>
          {currentImage && <aside className="thumbs-container">{renderThumbnails()}</aside>}
        </>
      ),
    },
  ];

  const formLabelBlock = (
    <Typography variant="body1" sx={{ mb: 0 }}>
      {mode === 'new' ? 'Enter new product:' : 'Edit product:'}
    </Typography>
  );

  return (
    <Box
      elevation={2}
      className="form-container-2"
      sx={{
        padding: 1,
        borderRadius: '5px',
        backgroundColor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0 }}>
        <ButtonGroup>
          <Button
            variant={selectedButton === 'new' ? 'contained' : 'outlined'}
            onClick={handleNewClick}
            sx={{ display: selectedButton === 'new' ? 'none' : 'block' }}
          >
            New
          </Button>
        </ButtonGroup>

        {isMobile && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            {formLabelBlock}
            <Button
              onClick={handleFormClose}
              sx={{
                minWidth: 'auto',
                padding: 0,
              }}
            >
              <CloseIcon />
            </Button>
          </Box>
        )}
      </Box>
      {!isMobile && formLabelBlock}

      {formLoading ? (
        <FlamePipe />
      ) : (
        <form onSubmit={handleSubmit} className="quota-tracking-form">
          {/* Tab Navigation */}
          <Box
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              mb: 3,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              backgroundColor: '#121212',
            }}
          >
            {tabs.map((tab, index) => (
              <Button
                key={index}
                onClick={() => setActiveTab(index)}
                sx={{
                  px: 3,
                  py: 1,
                  borderBottom: activeTab === index ? 2 : 0,
                  borderColor: 'primary.main',
                  color: activeTab === index ? 'primary.main' : 'text.primary',
                  flex: isMobile ? '1' : 'initial',
                }}
              >
                {tab.label}
              </Button>
            ))}
          </Box>

          {/* Tab Content */}
          <Box sx={{ mb: 2 }}>{tabs[activeTab].content}</Box>

          {/* Navigation and Submit Buttons */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '20px',
            }}
          >
            {mode === 'new' && !formLoading && (
              <Button variant="outlined" onClick={handleNewClick}>
                Reset
              </Button>
            )}

            <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
              {mode === 'new' && !formLoading && (
                <Button variant="outlined" onClick={() => handleTabChange(activeTab - 1)} disabled={activeTab === 0}>
                  Previous
                </Button>
              )}

              {activeTab === tabs.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={formLoading || restricted}
                  startIcon={<AddCircleIcon />}
                >
                  {(() => {
                    if (formLoading) return 'Uploading';
                    if (restricted) return 'Tracking disabled';
                    return mode === 'new' ? 'Add' : 'Save Changes';
                  })()}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="contained"
                  onClick={(e) => {
                    e.preventDefault();
                    handleTabChange(activeTab + 1);
                  }}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </form>
      )}
    </Box>
  );
}

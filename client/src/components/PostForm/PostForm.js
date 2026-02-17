import { useCallback, useEffect, useState } from 'react';
import { downloadInventoryCSV, uploadImagesAndCreatePost } from '../../services/fetch-utils.js';
import './PostForm.css';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DashboardSubMgt from '../Subscription/SubscriptionPages/DashboardSubMgt/DashboardSubMgt.js';
import { DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import usePostStore from '../../stores/usePostStore.js';
import { useAuthStore } from '../../stores/useAuthStore.js';
import imageCompression from 'browser-image-compression';
import FlamePipe from '../FlamePipe/FlamePipe.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function PostForm({
  title = '',
  description = '',
  price = '',
  category = '',
  submitHandler,
  imageUrls,
  sold = false,
  date_sold = null,
}) {
  // form wasn't showing current values in edit mode, this fixed it
  useEffect(() => {
    if (title) {
      setTitleInput(title);
      setDescriptionInput(description);
      setPriceInput(price);
      setCategoryInput(category);
      setCurrentImages(imageUrls);
      setSoldInput(sold);
      setDateSoldInput(date_sold);
    }
  }, [title, description, price, category, imageUrls, sold, date_sold]);
  const { restricted } = usePostStore();

  const [titleInput, setTitleInput] = useState(title);
  const [descriptionInput, setDescriptionInput] = useState(description);
  const [priceInput, setPriceInput] = useState(price);
  const [categoryInput, setCategoryInput] = useState(category);
  const [dateSoldInput, setDateSoldInput] = useState(date_sold);

  const [loading, setLoading] = useState(false);
  const [currentImages, setCurrentImages] = useState(imageUrls || []); // Added state for images currently in the post for display in the form
  const [deletedImages, setDeletedImages] = useState([]);

  const [soldInput, setSoldInput] = useState(sold);

  const isMobile = useMediaQuery('(max-width:767px)');

  const [files, setFiles] = useState([]);
  const onDrop = useCallback((acceptedFiles) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const validFiles = [];
    acceptedFiles.forEach((file) => {
      if (!validTypes.includes(file.type)) {
        toast.warn('Only JPG and PNG files are allowed', {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
        });
      } else if (file.size > MAX_FILE_SIZE) {
        toast.warn('File size too large, must be less than 10mb', {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
        });
      } else {
        validFiles.push(
          Object.assign(file, {
            preview: URL.createObjectURL(file),
          })
        );
      }
    });
    setFiles(validFiles);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    maxFiles: 10,
  });

  // Display thumbnails
  const thumbs = !loading && (files.length > 0 || currentImages.length > 0) && (
    <Box className="thumbnails-container" sx={{ minHeight: '100px', marginTop: '20px' }}>
      {/* Display newly selected files */}
      {files.map((file, index) => (
        <div key={file.name} className="thumbnail-wrapper">
          <img src={file.preview} alt={`New image ${index + 1}`} className="thumbnail" />
          <button
            type="button"
            className="delete-button-form"
            onClick={(e) => {
              e.preventDefault();
              handleImageDelete(index);
            }}
          >
            X
          </button>
        </div>
      ))}
      {/* Display current images */}
      {currentImages.map((url, index) => (
        <div key={url} className="thumbnail-wrapper">
          <img src={url} alt={`Current image ${index + 1}`} className="thumbnail" />
          <button
            type="button"
            className="delete-button-form"
            onClick={(e) => {
              e.preventDefault();
              handleImageDelete(files.length + index);
            }}
          >
            X
          </button>
        </div>
      ))}
    </Box>
  );

  let newOrEdit = '';

  let newProductOrEditProduct = '';
  let formFunctionMode = '';
  if (title) {
    newOrEdit = 'Edit Post';
    newProductOrEditProduct = '(This will also edit corresponding product in Products tab)';
    formFunctionMode = 'edit';
  } else {
    newOrEdit = 'New Gallery Post';
    newProductOrEditProduct = '(This will also create a new product in Products tab)';
    formFunctionMode = 'new';
  }

  // This is for deleting images from the form before submitting
  const handleImageDelete = (index) => {
    // Deleting a newly uploaded file
    if (index < files.length) {
      setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    } else {
      // Deleting an existing image
      // Adjust the index to target the correct image in currentImages
      const currentIndex = index - files.length;
      setCurrentImages((prevImages) => prevImages.filter((_, i) => i !== currentIndex));

      const deletedImageUrl = currentImages[currentIndex];
      setDeletedImages((prevDeletedImages) => [...prevDeletedImages, deletedImageUrl]);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!categoryInput) {
      toast.warn(`Category field missing`, {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
      });
      setLoading(false);
      return;
    }
    if (soldInput && !dateSoldInput) {
      toast.warn(`Date sold is required when item is marked as sold`, {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
      });
      setLoading(false);
      return;
    }
    try {
      for (let i = 0; i < files.length; i++) {
        try {
          files[i] = await imageCompression(files[i], {
            maxWidthOrHeight: 1200,
            useWebWorker: true,
          });
        } catch (error) {
          if (process.env.REACT_APP_APP_ENV === 'development') {
            //eslint-disable-next-line no-console
            console.error(`Failed to compress ${files[i].name}:`, error);
          }
          toast.error('Error processing images', {
            theme: 'colored',
            draggable: true,
            draggablePercent: 60,
            toastId: 'postForm-2',
            autoClose: false,
          });
        }
      }
      const postDetails = {
        title: titleInput,
        description: descriptionInput,
        price: priceInput,
        category: categoryInput,
        num_imgs: files.length,
        sold: soldInput,
        date_sold: dateSoldInput,
      };

      // Upload new images to S3 and get their URLs + post details
      const newPost = {
        ...(await uploadImagesAndCreatePost(files, formFunctionMode)),
        ...postDetails,
      };
      // pass new post and images to parent components
      //^ only newPost passes to NewPost, all 3 arguments pass to EditPost
      submitHandler(newPost, currentImages, deletedImages);
    } catch (e) {
      setLoading(false);
      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error editing post:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Error ${formFunctionMode === 'new' ? 'creating new ' : 'editing '}post: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'postForm-1',
          autoClose: false,
        });
      }
    }
  };

  // handle category change and update state
  const handleCategoryChange = (event) => {
    setCategoryInput(event.target.value);
  };

  const navigate = useNavigate();
  const handleNewPost = () => {
    navigate('/dashboard/new');
  };

  const handleDownloadCSV = () => {
    downloadInventoryCSV();
  };

  const handleTitleEdit = (value) => {
    if (value.length <= 50) {
      setTitleInput(value);
    } else {
      toast.warn('Limit of 50 characters', {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'postForm-1',
        autoClose: true,
      });
    }
  };

  const handleDescriptionEdit = (value) => {
    if (value.length <= 350) {
      setDescriptionInput(value);
    } else {
      toast.warn('Limit of 350 characters', {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'postForm-2',
        autoClose: true,
      });
    }
  };

  const handlePriceEdit = (value) => {
    if (value.length <= 7) {
      setPriceInput(value);
    } else {
      toast.warn('Limit of 7 figures', {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'postForm-3',
        autoClose: true,
      });
    }
  };

  const getDateSoldValue = () => {
    if (!dateSoldInput) return null;
    // If we have a title, we're in edit mode (since title is only passed in edit mode)
    return title ? new Date(Number(dateSoldInput)) : new Date(dateSoldInput);
  };

  const categoryOptions = [
    { value: 'Beads', label: 'Beads' },
    { value: 'Blunt Tips', label: 'Blunt Tips' },
    { value: 'Bubblers', label: 'Bubblers' },
    { value: 'Collabs', label: 'Collabs' },
    { value: 'Cups', label: 'Cups' },
    { value: 'Dry Pieces', label: 'Dry Pieces' },
    { value: 'Goblets', label: 'Goblets' },
    { value: 'Iso Stations', label: 'Iso Stations' },
    { value: 'Marbles', label: 'Marbles' },
    { value: 'Pendants', label: 'Pendants' },
    { value: 'Recyclers', label: 'Recyclers' },
    { value: 'Rigs', label: 'Rigs' },
    { value: 'Slides', label: 'Slides' },
    { value: 'Spinner Caps', label: 'Spinner Caps' },
    { value: 'Terp Pearls', label: 'Terp Pearls' },
    { value: 'Tubes', label: 'Tubes' },
    { value: 'Misc', label: 'Misc' },
  ];

  // ========================================================================
  // BEGINNING OF RETURN
  // ========================================================================

  return (
    <>
      <div className="form-wrapper">
        {' '}
        <aside className="admin-panel" style={{ marginTop: '70px' }}>
          <section className="admin-panel-section ">
            <div className="button-container">
              {' '}
              <h4>Post Management</h4>
              {!restricted ? (
                <Button title="New Post" size="medium" variant="outlined" onClick={handleNewPost}>
                  New Post
                </Button>
              ) : (
                <span>New Post Disabled </span>
              )}
              <Button
                variant="outlined"
                className="new-link download-button"
                title="Download Inventory CSV"
                onClick={handleDownloadCSV}
              >
                Inventory
              </Button>
              <div className="temp-fix"></div>
              <h4>Subscription Management</h4>
              <DashboardSubMgt />
            </div>
          </section>
        </aside>
        {!loading ? (
          <form className="new-post-form" onSubmit={handleFormSubmit} encType="multipart/form-data">
            <Typography
              variant="h1"
              id="form-title-header"
              sx={{
                fontSize: '1.8rem',
                fontWeight: 'bold',
                margin: 0,
                padding: 0,
                justifySelf: 'center',
                fontFamily: 'Shadows Into Light, cursive',
                letterSpacing: '2px',
                gridRow: '1',
                gridColumn: '1 / 3',
              }}
            >
              {newOrEdit}
              <Typography>{newProductOrEditProduct}</Typography>
            </Typography>
            <div className="desk-cat-input">
              <br />
              <Select
                id="category"
                value={categoryInput ? categoryInput : 'Choose category'}
                onChange={handleCategoryChange}
                className="image-input shadow-border"
                required
                sx={{ padding: '0' }}
              >
                <MenuItem value="Choose category" disabled>
                  Choose category
                </MenuItem>
                {categoryOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </div>
            <div className="desk-title-input">
              <br />
              <TextField
                required
                maxLength={50}
                placeholder="Enter title"
                className="image-input"
                type="text"
                name="title"
                value={titleInput}
                onChange={(e) => handleTitleEdit(e.target.value)}
              ></TextField>
            </div>
            <div className="desk-desc-input">
              <br />
              <TextField
                required
                maxLength={350}
                multiline
                rows={2}
                placeholder="Enter description"
                className="image-input description shadow-border"
                name="description"
                value={descriptionInput}
                onChange={(e) => handleDescriptionEdit(e.target.value)}
              ></TextField>
            </div>

            <div className="desk-price-input-wrapper">
              <div className="desk-price-input">
                <br />{' '}
                <TextField
                  required
                  placeholder="Enter price"
                  className="image-input input-with-dollar-sign"
                  type="number"
                  step="1"
                  name="price"
                  value={priceInput}
                  onChange={(e) => handlePriceEdit(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                >
                  {' '}
                  $
                </TextField>
              </div>
            </div>

            <FormControl component="fieldset" className="sold-radio-group " sx={{ marginTop: '20px' }}>
              <RadioGroup
                className=".sold-radio-group"
                aria-label="sold status"
                name="sold-status-group"
                value={soldInput ? soldInput : 'false'}
                row
              >
                <FormControlLabel
                  value="true"
                  checked={soldInput === true}
                  onChange={() => setSoldInput(true)}
                  control={<Radio />}
                  label="Sold"
                />
                <FormControlLabel
                  value="false"
                  checked={soldInput === false}
                  onChange={() => {
                    setSoldInput(false);
                    setDateSoldInput(null);
                  }}
                  control={<Radio />}
                  label="Available"
                />
              </RadioGroup>
            </FormControl>

            {soldInput && (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  className="date-sold-date-picker"
                  label="Date Sold"
                  value={getDateSoldValue()}
                  onChange={(newValue) => {
                    const newDateValue = newValue ? newValue.getTime() : null;
                    setDateSoldInput(newDateValue);
                  }}
                  required={soldInput}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: soldInput,
                      error: soldInput && !dateSoldInput,
                      helperText:
                        soldInput && !dateSoldInput ? 'Date sold is required when item is marked as sold' : '',
                      sx: {
                        mt: 1,
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

            {!restricted ? (
              <Box
                {...getRootProps()}
                className="dropzone"
                sx={{
                  marginTop: soldInput ? (isMobile ? '30px' : '100px') : '10px',
                }}
              >
                <input {...getInputProps()} />
                <label className="file-upload-label" style={{ color: 'lightgreen' }}>
                  {files.length === 0
                    ? 'Choose up to 10 images'
                    : `${files.length} file${files.length > 1 ? 's' : ''} selected`}
                </label>
              </Box>
            ) : (
              <Typography>Image Select Disabled</Typography>
            )}
            {/* {thumbs} */}
            {!restricted ? thumbs : ''}

            <Box className="btn-container" sx={{ marginBottom: '40px' }}>
              <Button variant="outlined" onClick={() => navigate('/dashboard')} sx={{ margin: '0px 15px' }}>
                Cancel
              </Button>

              {!restricted ? (
                <Button
                  type="submit"
                  variant="outlined"
                  disabled={loading || (files.length === 0 && currentImages.length === 0)}
                >
                  {loading ? 'Uploading...' : 'Upload'}
                </Button>
              ) : (
                <Typography>Upload Disabled</Typography>
              )}
            </Box>
          </form>
        ) : (
          <Box
            sx={{
              width: '100%',
              paddingTop: '200px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <FlamePipe />
          </Box>
        )}
      </div>
    </>
  );
}

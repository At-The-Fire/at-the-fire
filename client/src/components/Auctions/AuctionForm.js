import { useEffect, useState } from 'react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  InputAdornment,
  TextField,
} from '@mui/material';
import { toast } from 'react-toastify';
import './AuctionForm.css';
import {
  cancelAuction,
  createAuction,
  getAuctionDetail,
  updateAuction,
  uploadAuctionImagesToS3,
} from '../../services/fetch-auctions.js';
import { useNavigate, useParams } from 'react-router-dom';
import FlamePipe from '../FlamePipe/FlamePipe.js';
import { useAuthStore } from '../../stores/useAuthStore.js';

export default function AuctionForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [endTime, setEndTime] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const { id } = useParams();
  const [existingAuction, setExistingAuction] = useState({});
  const [existingImages, setExistingImages] = useState([]);

  const { authenticateUser, isAuthenticated, loadingAuth, hasAuthChecked, signingOut, error } = useAuthStore();

  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated && !error && !signingOut && !loadingAuth) {
      authenticateUser();
    }
  }, [isAuthenticated, error, signingOut, loadingAuth, authenticateUser]);

  useEffect(() => {
    // This route is under /dashboard; if we know the user is not authenticated, send them to sign-in.
    if (hasAuthChecked && !loadingAuth && !isAuthenticated) {
      navigate('/auth/sign-in');
    }
  }, [hasAuthChecked, loadingAuth, isAuthenticated, navigate]);

  useEffect(() => {
    if (id) {
      const auctionData = async () => {
        const currentAuction = await getAuctionDetail(id);
        if (!currentAuction.isActive) {
          navigate('/dashboard', { state: { view: 'auctions' } });
          return;
        }
        setExistingAuction(currentAuction);

        setTitle(currentAuction.title || '');
        setDescription(currentAuction.description || '');
        setExistingImages(currentAuction.imageUrls || []);
        setStartPrice(currentAuction.startPrice || '');
        setBuyNowPrice(currentAuction.buyNowPrice || '');

        if (currentAuction.endTime) {
          const formattedEndTime = new Date(currentAuction.endTime)
            .toLocaleString('sv-SE', { timeZone: 'America/Los_Angeles' })
            .replace(' ', 'T')
            .slice(0, 16);
          setEndTime(formattedEndTime);
        } else {
          setEndTime('');
        }
      };
      auctionData();
    }
  }, [id]);

  const onDrop = (acceptedFiles) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const validFiles = [];
    acceptedFiles.forEach((file) => {
      if (!validTypes.includes(file.type)) {
        toast.warn('Only JPG and PNG files are allowed', { theme: 'colored', draggable: true, draggablePercent: 60 });
      } else if (file.size > MAX_FILE_SIZE) {
        toast.warn('File size too large, must be less than 10MB', {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
        });
      } else {
        validFiles.push(Object.assign(file, { preview: URL.createObjectURL(file) }));
      }
    });
    setFiles((prev) => [...prev, ...validFiles]);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    maxFiles: 10,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const sanitizedTitle = title.trim();
    const sanitizedDescription = description.trim();

    if (!sanitizedTitle || !sanitizedDescription) {
      toast.warn('Title and description are required', { theme: 'colored', draggable: true, draggablePercent: 60 });
      setLoading(false);
      return;
    }

    if (files.length === 0 && existingImages.length === 0) {
      toast.warn('At least one image is required', { theme: 'colored', draggable: true, draggablePercent: 60 });
      setLoading(false);
      return;
    }

    try {
      let uploadedUrls = [];
      if (files.length > 0) {
        const uploaded = await uploadAuctionImagesToS3(files);
        uploadedUrls = uploaded.map((img) => img.secure_url);
      }

      const finalImageUrls = [...existingImages, ...uploadedUrls];

      const payload = {
        title: sanitizedTitle,
        description: sanitizedDescription,
        startPrice: parseInt(startPrice),
        buyNowPrice: buyNowPrice ? parseInt(buyNowPrice) : null,
        endTime: new Date(endTime).toISOString(),
        startTime: existingAuction?.startTime
          ? new Date(existingAuction.startTime).toISOString()
          : new Date().toISOString(),
        imageUrls: finalImageUrls,
        currentBid: existingAuction?.currentBid || 0,
      };

      id ? await updateAuction(id, payload) : await createAuction(payload);

      toast.success(id ? 'Auction updated successfully' : 'Auction created successfully', {
        theme: 'dark',
        draggable: true,
        draggablePercent: 60,
        toastId: id ? 'auction-update' : 'auction-create',
        autoClose: true,
      });

      if (!id) {
        setTitle('');
        setDescription('');
        setStartPrice('');
        setBuyNowPrice('');
        setEndTime('');
        setFiles([]);
        setExistingImages([]);
      }
      navigate('/dashboard', { state: { view: 'auctions' } });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error(`Error saving auction: ${err.message}`, {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'auction-error',
        autoClose: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAuction = async () => {
    try {
      await cancelAuction(id);
      toast.success('Auction cancelled', { theme: 'dark', toastId: 'auction-cancel', autoClose: true });
      navigate('/dashboard', { state: { view: 'auctions' } });
    } catch (err) {
      toast.error(err.message, { theme: 'colored', toastId: 'auction-cancel-error', autoClose: true });
    } finally {
      setCancelDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
        <FlamePipe />
      </Box>
    );
  }

  return (
    <Box className="auction-form-wrapper">
      <form className="auction-form" onSubmit={handleSubmit}>
        <h1 id="form-title-header">{id ? 'Edit Auction' : 'New Auction'}</h1>
        <Box className="desk-title-input" sx={{ position: 'relative', top: '-8px' }}>
          <TextField
            label="Title"
            required
            fullWidth
            inputProps={{ maxLength: 80 }}
            value={title || ''}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Box>
        <Box className="desk-desc-input">
          <TextField
            label="Description"
            required
            fullWidth
            multiline
            rows={4}
            inputProps={{ maxLength: 400 }}
            value={description || ''}
            onChange={(e) => setDescription(e.target.value)}
            className="auction-description"
          />
        </Box>
        <Box className="desk-price-input-wrapper">
          <TextField
            label="Start Price"
            required
            type="number"
            inputProps={{ step: 1 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            value={startPrice || ''}
            onChange={(e) => setStartPrice(e.target.value)}
          />
          <TextField
            label="Buy Now Price (optional)"
            type="number"
            inputProps={{ step: 1 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            value={buyNowPrice || ''}
            onChange={(e) => setBuyNowPrice(e.target.value)}
          />
          <TextField
            label="End Time"
            required
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            value={endTime || ''}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </Box>
        <Box {...getRootProps()} className="dropzone" sx={{ marginTop: { xs: '40px', md: '0px' } }}>
          <input {...getInputProps()} />
          <label className="file-upload-label">
            {files.length === 0 ? 'Choose images' : `${files.length} file${files.length > 1 ? 's' : ''} selected`}
          </label>
        </Box>
        {(existingImages.length > 0 || files.length > 0) && (
          <Box className="thumbnails-container">
            {[...existingImages, ...files].map((item, index) => {
              const isFile = typeof item !== 'string';
              const src = isFile ? item.preview : item;

              return (
                <Box key={isFile ? item.name : src} className="thumbnail-wrapper">
                  <img src={src} alt={`Image ${index + 1}`} className="thumbnail" />
                  <button
                    type="button"
                    className="delete-button-form"
                    onClick={(e) => {
                      e.preventDefault();
                      if (isFile) {
                        setFiles((prev) => prev.filter((_, i) => i !== index - existingImages.length));
                      } else {
                        setExistingImages((prev) => prev.filter((_, i) => i !== index));
                      }
                    }}
                  >
                    X
                  </button>
                </Box>
              );
            })}
          </Box>
        )}
        <Box className="btn-container">
          <Button variant="outlined" onClick={() => navigate('/dashboard', { state: { view: 'auctions' } })}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="outlined"
            disabled={loading || (files.length === 0 && existingImages.length === 0)}
          >
            {id ? 'Save Auction' : 'Create Auction'}
          </Button>
        </Box>

        {id && existingAuction?.isActive && (
          <Box className="cancel-auction-container">
            <Button variant="outlined" color="error" onClick={() => setCancelDialogOpen(true)}>
              Cancel Auction
            </Button>
          </Box>
        )}
      </form>

      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Cancel this auction?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will end the auction immediately. This action cannot be undone.
            {existingAuction?.currentBid && ' Note: auctions with bids cannot be cancelled.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Go Back</Button>
          <Button onClick={handleCancelAuction} color="error" autoFocus>
            Confirm Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box } from '@mui/material';
import { toast } from 'react-toastify';
import './AuctionForm.css';
import { createAuction, getAuctionDetail, updateAuction, uploadAuctionImagesToS3 } from '../../services/fetch-auctions.js';
import { useNavigate, useParams } from 'react-router-dom';
import FlamePipe from '../FlamePipe/FlamePipe.js';

export default function AuctionForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [endTime, setEndTime] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const { id } = useParams();
  const [existingAuction, setExistingAuction] = useState({});
  const [existingImages, setExistingImages] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const auctionData = async () => {
        const currentAuction = await getAuctionDetail(id);
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
    const newFiles = acceptedFiles.map((file) => Object.assign(file, { preview: URL.createObjectURL(file) }));
    setFiles((prev) => [...prev, ...newFiles]);
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

    try {
      let uploadedUrls = [];
      if (files.length > 0) {
        const uploaded = await uploadAuctionImagesToS3(files);
        uploadedUrls = uploaded.map((img) => img.secure_url);
      }

      const finalImageUrls = [...existingImages, ...uploadedUrls];

      const payload = {
        title,
        description,
        startPrice: parseInt(startPrice),
        buyNowPrice: buyNowPrice ? parseInt(buyNowPrice) : null,
        endTime: new Date(endTime).toISOString(),
        startTime: existingAuction?.startTime ? new Date(existingAuction.startTime).toISOString() : new Date().toISOString(),
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
      navigate('/auctions');
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
        <FlamePipe />
      </Box>
    );
  }

  return (
    <Box className="form-wrapper">
      <form className="new-post-form" onSubmit={handleSubmit}>
        <h1 id="form-title-header">{id ? 'Edit Auction' : 'New Auction'}</h1>
        <Box className="desk-title-input">
          <span className="labels-form-inputs">Title</span>
          <input
            required
            maxLength={80}
            placeholder="Enter auction title"
            className="image-input"
            type="text"
            value={title || ''}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Box>
        <Box className="desk-desc-input">
          <span className="labels-form-inputs">Description</span>
          <textarea
            required
            maxLength={400}
            placeholder="Enter auction description"
            className="image-input description shadow-border"
            value={description || ''}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Box>
        <Box className="price-in-form">
          <span>Start Price</span>
          <input
            required
            placeholder="Enter starting bid"
            className="image-input price-input"
            type="number"
            step="1"
            value={startPrice || ''}
            onChange={(e) => setStartPrice(e.target.value)}
          />
        </Box>
        <Box className="price-in-form">
          <span>Buy Now Price</span>
          <input
            placeholder="Enter buy now price (optional)"
            className="image-input price-input"
            type="number"
            step="1"
            value={buyNowPrice || ''}
            onChange={(e) => setBuyNowPrice(e.target.value)}
          />
        </Box>
        <Box className="price-in-form">
          <span>End Time</span>
          <input
            required
            className="image-input"
            type="datetime-local"
            value={endTime || ''}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </Box>
        <Box {...getRootProps()} className="dropzone" sx={{ marginTop: '40px' }}>
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
          <button className="submit-btn" type="submit">
            <img className="upload-icon" src="/upload.png" alt="upload" />
          </button>
        </Box>
      </form>
    </Box>
  );
}

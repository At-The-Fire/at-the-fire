import { Link } from 'react-router-dom';
import {
  Button,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Box,
  Grid,
  useMediaQuery,
  useTheme,
  Checkbox,
} from '@mui/material';

import { deleteById, deleteImage, getAdditionalImageUrlsPublicIds } from '../../services/fetch-utils.js';
import './PostCard.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '../../context/QueryContext.js';
import { deleteProduct } from '../../services/fetch-products.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../../stores/useAuthStore.js';
import usePostStore from '../../stores/usePostStore.js';
export default function PostCard({ id, post, posts, setPosts, products, setProducts }) {
  const { isAuthenticated, user, error, customerId } = useAuthStore();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const navigate = useNavigate();

  const { setNewPostCreated } = useQuery();

  const { setLoading, setPostError } = usePostStore();

  const [deletedRowId, setDeletedRowId] = useState(null);

  const [openDialog, setOpenDialog] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const [deleteProductChecked, setDeleteProductChecked] = useState(false);

  useEffect(() => {
    if (!user || !isAuthenticated || !customerId || error === 401 || error === 403) {
      return;
    }
  }, [user, isAuthenticated, customerId, error]);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleConfirmDelete = async () => {
    await handleDelete(deleteProductChecked);
    handleCloseDialog();
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/sign-in');
    }
  }, [isAuthenticated, navigate]);

  // delete the post and corresponding Product post from the database
  const handleDelete = async (shouldDeleteProduct = false) => {
    navigate(`/dashboard/`);

    setIsDeleting(true);
    try {
      setDeletedRowId(id);
      // grab urls out of my database
      const postUrls = await getAdditionalImageUrlsPublicIds(id);

      // delete all images from S3
      let filteredPostUrls = postUrls;
      const postId = id;
      const matchingProduct = products.find((product) => product.post_id === postId);
      if (!shouldDeleteProduct && matchingProduct && matchingProduct.image_url) {
        filteredPostUrls = postUrls.filter((img) => img.image_url !== matchingProduct.image_url);
      }

      for (let i = 0; i < filteredPostUrls.length; i++) {
        await deleteImage(filteredPostUrls[i].public_id, filteredPostUrls[i].resource_type);
      }

      // delete corresponding Product post from database
      if (shouldDeleteProduct && matchingProduct) {
        await deleteProduct(matchingProduct.id);

        // Update the products state to exclude the deleted product
        setProducts((prevProducts) => prevProducts.filter((product) => product.id !== matchingProduct.id));
      }

      // delete the post from my database
      await deleteById(id);

      // delete the post from state, so it doesn't show up on the page
      const updatedPosts = posts.filter((post) => post.id !== id);
      setPosts(updatedPosts);

      // After successfully deleting the post from the database and updating local state:
      setNewPostCreated((prevState) => !prevState); // Toggle newPostCreated state after post deletion
      setIsDeleting(false);
      setLoading(false);
    } catch (e) {
      setIsDeleting(false);
      setPostError(e.message);

      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error deleting post:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Error deleting post: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'postCard-1',
          autoClose: false,
        });
      }
    }
  };

  const handleEditPost = () => {
    navigate(`/dashboard/edit/${id}`);
  };

  const calculateShelfTime = (post) => {
    const created = new Date(post.created_at);
    const sold = post.sold ? new Date(Number(post.date_sold)) : new Date();
    created.setHours(0, 0, 0, 0);
    sold.setHours(0, 0, 0, 0);
    if (post.sold && !post.date_sold) return null;
    const diffTime = sold - created;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const showCheckboxForDeleteProduct = products.find((product) => product.post_id === post.id);

  return (
    <div className={`post ${id === deletedRowId ? 'grayed-out' : ''}`} key={id}>
      <Link to={`/gallery/${id}`}>
        {post.image_url && (
          <img
            className="admin-prod-img"
            src={post.image_url.endsWith('.mp4') ? `${post.image_url.slice(0, -4)}.jpg` : post.image_url}
            alt="edit"
          />
        )}
      </Link>

      <Box className="title-price-container">
        <Grid container sx={{ display: 'grid', gridTemplateRows: '20px', padding: '2px 0 0 0 ' }}>
          <Typography
            className="mobile-title"
            sx={{ '&.MuiTypography-root': { fontSize: '.8rem', fontWeight: '900' } }}
          >
            {post.title.length > 25 ? post.title.slice(0, 25) + '...' : post.title}
          </Typography>
          <Typography
            variant="body1"
            className="mobile-title-desk"
            sx={{ '&.MuiTypography-root': { fontSize: '.9rem', fontWeight: '900' } }}
          >
            {post.title}
          </Typography>
          <Typography
            variant="body1"
            sx={{ textAlign: 'left', display: 'block', '&.MuiTypography-root': { display: 'inline' } }}
          >
            ${Number(post.price).toLocaleString()}
            {isMobile &&
              (post.sold === true ? (
                <span
                  style={{
                    color: 'lightgreen',
                    fontWeight: 'bold',
                    display: 'inline',
                    fontSize: '0.75rem',
                    marginLeft: '8px',
                  }}
                >
                  Sold
                  {post.date_sold && (
                    <span
                      style={{
                        color: 'text.secondary',
                        fontWeight: 'normal',
                        fontSize: '0.75rem',
                        marginLeft: '4px',
                      }}
                    >
                      {new Date(Number(post.date_sold)).toLocaleDateString()}
                    </span>
                  )}
                </span>
              ) : (
                <span style={{ display: 'inline' }}>
                  <span
                    style={{
                      color: 'orange',
                      fontWeight: 'normal',
                      fontSize: '0.75rem',
                      marginLeft: '8px',
                      display: 'inline',
                    }}
                  >
                    Available
                  </span>
                  <Typography
                    component="span"
                    sx={{
                      lineHeight: '1.5',
                      textAlign: 'left',
                      color: post.sold ? 'success.main' : 'warning.main',
                      width: 'fit-content',
                      padding: '0 5px 0 5px',
                      fontWeight: 'normal',
                      fontSize: '0.75rem',
                    }}
                  >
                    {post.sold && !post.date_sold
                      ? 'Not recorded'
                      : `(${calculateShelfTime(post)} day${calculateShelfTime(post) === 1 ? '' : 's'}`}
                  </Typography>
                </span>
              ))}
          </Typography>
          {!isMobile && (
            <Typography component="span">
              {post.sold === true ? (
                <span
                  style={{
                    color: 'lightgreen',
                    fontWeight: 'bold',
                    fontSize: '.9rem',
                    display: 'inline',
                  }}
                >
                  Sold
                  {post.date_sold && (
                    <span
                      style={{
                        color: 'text.secondary',
                        fontWeight: 'normal',
                        fontSize: '0.75rem',
                        marginLeft: '4px',
                      }}
                    >
                      {new Date(Number(post.date_sold)).toLocaleDateString()}
                    </span>
                  )}
                </span>
              ) : (
                <span style={{ display: 'inline' }}>
                  <span
                    style={{
                      color: 'orange',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      display: 'inline',
                    }}
                  >
                    Available
                  </span>
                </span>
              )}
            </Typography>
          )}

          <Typography
            variant="body2"
            sx={{
              lineHeight: '1.5',
              textAlign: 'left',
              color: post.sold ? 'success.main' : 'warning.main',
              fontWeight: '700',
              width: 'fit-content',
              display: isMobile ? 'none' : 'block',
            }}
          >
            {post.sold && !post.date_sold
              ? 'Not recorded'
              : `${calculateShelfTime(post)} day${calculateShelfTime(post) === 1 ? '' : 's'}`}
          </Typography>
        </Grid>
      </Box>
      <Typography variant="body1" className="cat-desk">
        {post.category}
      </Typography>
      <Typography variant="body1" className="desc-desk">
        {post.description}
      </Typography>

      <div className="admin-prod-btn-cont grid-7">
        <Button
          onClick={handleEditPost}
          color="warning"
          sx={{ fontSize: '1rem', color: 'secondary' }}
          disabled={post.restricted ? post.restricted : false}
        >
          Edit
        </Button>

        <Button onClick={handleOpenDialog} color="warning" sx={{ fontSize: '1rem' }}>
          Delete
        </Button>
      </div>

      <Dialog
        open={openDialog}
        onClose={isDeleting ? undefined : handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Are you sure?</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Deleting this post will remove it permanently. This action cannot be undone.
          </DialogContentText>

          {products.length !== 0 && showCheckboxForDeleteProduct && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <Checkbox
                  checked={deleteProductChecked}
                  onChange={(e) => setDeleteProductChecked(e.target.checked)}
                  color="primary"
                  id="delete-product-checkbox"
                />

                <label htmlFor="delete-product-checkbox" style={{ fontSize: '1rem', cursor: 'pointer' }}>
                  Delete from Product Tab?
                </label>
              </Box>
              <DialogContentText id="alert-dialog-description">
                If there is a product associated with this post, checking this box will remove it from the Product Tab.
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
    </div>
  );
}

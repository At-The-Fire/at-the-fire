import { useEffect } from 'react';
import { useQuery } from '../../context/QueryContext.js';
import { postAddImages, postPost } from '../../services/fetch-utils.js';
import PostForm from '../PostForm/PostForm.js';
import { useNavigate } from 'react-router-dom';
import { postProducts } from '../../services/fetch-products.js';
import { useProducts } from '../../hooks/useProducts.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../../stores/useAuthStore.js';

export default function NewPost() {
  const { setProducts } = useProducts();
  const navigate = useNavigate();

  const { setNewPostCreated } = useQuery();
  const { authenticateUser, isAuthenticated, error, signingOut, checkTokenExpiry, loadingAuth, hasAuthChecked, hasPremiumAccess } =
    useAuthStore();

  // authenticate and check tokens
  useEffect(() => {
    if (!isAuthenticated && !error && !signingOut && !loadingAuth) {
      authenticateUser();
    } else if (isAuthenticated) {
      // If we are authenticated, check token expiry
      checkTokenExpiry();
    }
  }, [isAuthenticated, error, authenticateUser, signingOut, checkTokenExpiry, loadingAuth]);

  useEffect(() => {
    // Only redirect after we've actually checked whether the user has a session.
    // This prevents a full-refresh bounce through /auth/sign-in (which then routes to /dashboard).
    if (hasAuthChecked && !loadingAuth && !isAuthenticated) {
      navigate('/auth/sign-in');
    }
  }, [isAuthenticated, navigate, hasAuthChecked, loadingAuth]);

  const handleAddProduct = async (productData) => {
    try {
      const response = await postProducts(productData);

      if (response) {
        setProducts((prevProducts) => {
          // Create a new array with the new product
          const updatedProducts = [...prevProducts, response];

          // Sort the array by the 'date' property
          updatedProducts.sort((a, b) => Number(b.date) - Number(a.date));

          return updatedProducts;
        });
      }
    } catch (e) {
      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Failed to add post:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Failed to add post: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'new-post-1',
          autoClose: false,
        });
      }
    }
  };

  const submitHandler = async (newPost) => {
    try {
      const post = await postPost(newPost);

      // send image urls and public ids to db
      await postAddImages(newPost.additionalImages, post.id);

      // make fetch call to new controller for inserting new quota tracking entry
      const quotaEntry = {
        title: newPost.title,
        description: newPost.description,
        image_url: newPost.image_url,
        category: newPost.category,
        price: newPost.price,
        public_id: newPost.public_id,
        num_days: 1,
        type: 'inventory',
        date: new Date().setHours(0, 0, 0, 0),
        qty: newPost.quantity || 1,
        sold: newPost.sold,
        date_sold: newPost.date_sold,
        sales: [],
        post_id: post.id,
      };

      if (hasPremiumAccess) {
        handleAddProduct(quotaEntry);
      }

      setNewPostCreated((prevState) => !prevState);
      navigate('/dashboard');
    } catch (e) {
      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Failed to add post:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Failed to add post: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'new-post-1',
          autoClose: false,
        });
      }
    }
  };
  return <PostForm submitHandler={submitHandler} />;
}

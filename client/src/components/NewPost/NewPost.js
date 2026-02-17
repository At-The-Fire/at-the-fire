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
  const { authenticateUser, isAuthenticated, error, signingOut, checkTokenExpiry } = useAuthStore();

  // authenticate and check tokens
  useEffect(() => {
    if (!isAuthenticated && !error && !signingOut) {
      authenticateUser();
    } else if (isAuthenticated) {
      // If we are authenticated, check token expiry
      checkTokenExpiry();
    }
  }, [isAuthenticated, error, authenticateUser, signingOut, checkTokenExpiry]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/sign-in');
    }
  }, [isAuthenticated, navigate]);

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
      const { title, description, image_url, category, price, public_id, num_imgs, sold, date_sold } = newPost;

      // create new post with fetch call to db
      // TODO refactor to just use object- change function definition in fetch-utils
      const post = await postPost(title, description, image_url, category, price, public_id, num_imgs, sold, date_sold);

      // send image urls and public ids to db
      await postAddImages(newPost.additionalImages, post.id);

      // make fetch call to new controller for inserting new quota tracking entry
      const quotaEntry = {
        // customer_id: customerId,
        title,
        description,
        image_url,
        category,
        price,
        public_id,
        num_days: 1, // hard coded for now
        type: 'inventory',
        date: new Date().setHours(0, 0, 0, 0), // This sets the time to midnight
        qty: 1,
        sold,
        date_sold,
        sales: [],
        post_id: post.id,
      };

      handleAddProduct(quotaEntry);

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

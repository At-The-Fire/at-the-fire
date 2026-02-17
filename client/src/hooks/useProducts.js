import { useState, useEffect } from 'react';
import { fetchProducts } from '../services/fetch-products.js';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../stores/useAuthStore.js';

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState(null);
  const navigate = useNavigate();

  const { isAuthenticated, error, user, email, setUser, setError, setCustomerId, handleSignOut, customerId } =
    useAuthStore();

  const fetchAndSetProducts = async () => {
    try {
      if (!user || !isAuthenticated || !customerId || error === 401) {
        return;
      }

      setLoadingProducts(true);
      let data = await fetchProducts();

      // Set date_sold to date if sold is true and date_sold is null- //^this is for legacy data that had no date_sold field
      data.forEach((product) => {
        if (Array.isArray(product.sales) && product.sales.length > 0) {
          product.sales.dateSold = product.date;
        }
      });

      setProducts(data);
      setLoadingProducts(false);
    } catch (e) {
      setProductError(e.code);
      setError(e.code);

      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error fetching products:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Error fetching products: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'useProducts-1',
          autoClose: false,
        });
      }
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchAndSetProducts();
  }, [customerId, error, isAuthenticated, navigate, user, email, handleSignOut, setCustomerId, setError, setUser]);

  return {
    products,
    setProducts,
    loadingProducts,
    setLoadingProducts,
    productError,
    setProductError,
    fetchProducts: fetchAndSetProducts,
  };
}

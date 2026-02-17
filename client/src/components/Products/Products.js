import React, { useEffect } from 'react';
import { Box, Select, MenuItem, InputLabel, FormControl, useMediaQuery, Button, Typography } from '@mui/material';

import { useState } from 'react';

import FlamePipe from '../FlamePipe/FlamePipe.js';

import ProductGrid from './ProductGrid/ProductGrid.js';
import './ProductGrid/ProductGrid.css';
import InventoryMgtForm from './InventoryMgtForm.js';
import {
  deleteProduct,
  editProducts,
  postProducts,
  uploadProductImage,
  postProductSales,
  deleteProductSales,
} from '../../services/fetch-products.js';
import {
  deleteById,
  deleteImage,
  deleteImageData,
  getAdditionalImageUrlsPublicIds,
  getPostDetail,
  postAddImages,
  postPost,
  updatePost,
  uploadImagesAndCreatePost,
} from '../../services/fetch-utils.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import exampleProductsImageMobile from '../../assets/products-ex-m.png';
import exampleProductsImageDesktop from '../../assets/products-ex-dt.png';
import { useQuery } from '../../context/QueryContext.js';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import UpdateIcon from '@mui/icons-material/Update';
import usePostStore from '../../stores/usePostStore.js';
import { useAuthStore } from '../../stores/useAuthStore.js';
import imageCompression from 'browser-image-compression';

// Helper to calculate sold status
function calculateSoldStatus(product) {
  const totalSold = (product.sales || []).reduce((sum, s) => sum + (Number(s.quantitySold) || 0), 0);
  return totalSold >= (Number(product.qty) || 1);
}

export default function Products({ products, setProducts, loadingProducts, setLoadingProducts, fetchProducts }) {
  const { restricted, posts } = usePostStore();
  const setPosts = usePostStore((state) => state.setPosts);

  const [formLoading, setFormLoading] = useState(false);

  const { customerId, authenticateUser, isAuthenticated } = useAuthStore();

  const [mode, setMode] = useState('new');
  const [files, setFiles] = useState([]);

  // state for updating gallery page
  const { setNewPostCreated } = useQuery();

  useEffect(() => {
    fetchProducts();
  }, []);

  let [product, setProduct] = useState({
    date: null,
    type: '',
    title: '',
    category: '',
    price: '',
    description: '',
    customer_id: customerId,
    sold: false,
    qty: 1,
    sales: [],
  });

  // state ===============================================================

  // State for new/ edit buttons
  const [selectedButton, setSelectedButton] = useState('new');
  const [editedProduct, setEditedProduct] = useState(null);

  // State to track the selected product's ID
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(product); // default selected product is null

  // state for mobile form display
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('md'));
  const [showForm, setShowForm] = useState(false);

  // state for mobile auction update display
  const [showAuctionsToUpdate, setShowAuctionsToUpdate] = useState(false);
  const [createGalleryPost, setCreateGalleryPost] = useState(false);

  // State for products
  const [originalProducts, setOriginalProducts] = useState(products);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [productSelect, setProductSelect] = useState({ type: 'all' });
  const [originalPublicId, setOriginalPublicId] = useState(product.public_id || '');
  const [isNewClick, setIsNewClick] = useState(true);
  const [currentImage, setCurrentImage] = useState(product.image_url || '');

  const [originalThumbnail, setOriginalThumbnail] = useState(product.image_url || '');

  const [isDeleting, setIsDeleting] = useState(false);

  const [previousSales, setPreviousSales] = useState([]);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = isMobile ? 6 : 10;

  // --Determine the sliced products to be displayed based on current page
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  // --Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // functions ===============================================================

  // check auth
  useEffect(() => {
    if (!isAuthenticated) {
      authenticateUser();
    }
  }, []);

  const resetFormState = () => {
    setMode('new');
    setProduct({
      date: null,
      type: '',
      title: '',
      category: '',
      price: '',
      description: '',
      customer_id: customerId,
      sold: false,
      qty: 1,
      sales: [],
    });
    setFiles([]);
    setCurrentImage('');
    setSelectedProduct(null);
    setCreateGalleryPost(false);
    if (isMobile) {
      setShowForm(false);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setMode('new');
    setSelectedProduct(null);
  };

  const initializeProduct = () => ({
    date: null,
    type: '',
    title: '',
    category: '',
    price: '',
    description: '',
    num_days: '',
    customer_id: customerId,
    sold: false,
    qty: 1,
    sales: [],
    image_url: '',
    public_id: '',
    post_id: null,
  });

  const handleNewClick = () => {
    setMode('new');
    setSelectedButton('new');
    setProduct(initializeProduct());
    setFiles([]);
    setSelectedProduct(null);
    setCurrentImage(null);
    setIsNewClick(true);
    setCreateGalleryPost(false);
  };

  // EDIT button on each product
  const handleEditClick = (productToEdit) => {
    setMode('edit');
    setSelectedButton('edit');
    setProduct({ ...productToEdit, id: productToEdit.id });
    setFiles([]);
    setIsNewClick(false);
    setPreviousSales(productToEdit.sales ? [...productToEdit.sales] : []); // Track previous sales for comparison
    if (isMobile) {
      setShowForm(true);
    }
  };

  // DELETE button on each product
  const handleDeleteClick = async (product, shouldDeleteGalleryPost = true) => {
    setIsDeleting(true);
    try {
      if (shouldDeleteGalleryPost) {
        // Delete image from S3 if it exists
        if (product.public_id) {
          await deleteImage(product.public_id, 'image');
        }
        // Delete the product
        const response = await deleteProduct(product.id);
        if (response) {
          setProducts((prevProducts) => {
            const updatedProducts = prevProducts.filter((p) => p.id !== product.id);
            updatedProducts.sort((a, b) => Number(b.date) - Number(a.date));
            return updatedProducts;
          });
        }
        // Delete corresponding post if it exists
        if (product.post_id) {
          const postUrls = await getAdditionalImageUrlsPublicIds(product.post_id);
          for (let i = 0; i < postUrls.length; i++) {
            await deleteImage(postUrls[i].public_id, postUrls[i].resource_type);
          }
          await deleteById(product.post_id);
          const updatedPosts = posts.filter((p) => p.id !== product.post_id);
          setPosts(updatedPosts);
          setNewPostCreated((prevState) => !prevState);
        }
      } else {
        // Only delete the product (no image or post deletion)
        const response = await deleteProduct(product.id);
        if (response) {
          setProducts((prevProducts) => {
            const updatedProducts = prevProducts.filter((p) => p.id !== product.id);
            updatedProducts.sort((a, b) => Number(b.date) - Number(a.date));
            return updatedProducts;
          });
        }
      }
    } catch (e) {
      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error deleting product:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Error deleting product: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'products-1',
          autoClose: false,
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  //  SUBMIT on 'new' mode, handle form data and send it to the backend
  const handleAddProduct = async (productData) => {
    try {
      // Always recalculate sold before sending to backend
      productData.sold = calculateSoldStatus(productData);
      const addResponse = await postProducts(productData);
      // Post sales if present in the original productData
      if (productData.sales && productData.sales.length > 0) {
        const postedSales = [];
        for (const sale of productData.sales) {
          const result = await postProductSales({
            id: addResponse.id,
            quantitySold: sale.quantitySold,
            dateSold: sale.dateSold,
          });
          if (result) postedSales.push(result);
        }
        addResponse.sales = postedSales;
        // Recalculate sold for UI
        addResponse.sold = calculateSoldStatus(addResponse);
      }

      setFiles([]); // Reset file state
      setCurrentImage('');
      setProduct((prev) => ({ ...prev, customer_id: customerId }));
      if (addResponse) {
        setProducts((prevProducts) => {
          const updatedProducts = [...prevProducts, addResponse];
          updatedProducts.sort((a, b) => Number(b.date) - Number(a.date));
          return updatedProducts;
        });
        setFormLoading(false);
        resetFormState();
      }
    } catch (e) {
      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Failed to add product:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Failed to add product: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'products-2',
          autoClose: false,
        });
      }
    }
  };

  //  SUBMIT on 'edit' mode, handle form data and send it to the backend
  const handleEditProduct = async (productData) => {
    try {
      if (typeof productData.qty === 'undefined') productData.qty = 1;
      setProduct((prev) => ({ ...prev, id: selectedProductId }));
      setProduct((prev) => ({ ...prev, customer_id: customerId }));

      // Sort sales by dateSold ascending for consistency
      const productId = productData.id || selectedProductId;
      if (!productId) {
        throw new Error('Missing product id for edit');
      }

      const normalizedSales = (productData.sales || []).filter(Boolean);
      const persistedSales = normalizedSales.filter((s) => s.id !== null && typeof s.id !== 'undefined');
      const pendingSales = normalizedSales.filter((s) => s.id === null || typeof s.id === 'undefined');

      // Post any new sales (sales without ids). This allows multiple sales on the same day/qty.
      const postedSales = [];
      for (const pending of pendingSales) {
        const posted = await postProductSales({
          id: productId,
          quantitySold: pending.quantitySold,
          dateSold: pending.dateSold,
        });
        if (posted) postedSales.push(posted);
      }

      // Replace pending sales with the DB-returned records to avoid duplicates.
      let mergedSales = [...persistedSales, ...postedSales]
        .slice()
        .sort((a, b) => Number(a.dateSold) - Number(b.dateSold));

      productData.sales = mergedSales;

      // Recalculate sold before sending to backend
      productData.sold = calculateSoldStatus(productData);

      // Note: For batch products, sold=false simply means "not sold out".
      // Do not clear sales history when sold is false.
      let sortedSales = mergedSales;

      // Detect removed persisted sales (user removed a row in the form)
      const removedSales = (previousSales || []).filter(
        (ps) =>
          ps &&
          ps.id !== null &&
          typeof ps.id !== 'undefined' &&
          !(sortedSales || []).some((s) => s && Number(s.id) === Number(ps.id))
      );
      const editResponse = await editProducts(productData);
      if (productData.post_id && productData.image_url !== originalThumbnail) {
        // Update corresponding post in posts (gallery_posts table & post_imgs table) with edit
        await updatePost(productData.post_id, productData);

        const imageData = [
          {
            secure_url: productData.image_url,
            public_id: productData.public_id,
            resource_type: productData.resource_type,
          },
        ];
        await postAddImages(imageData, productData.post_id);

        const additionalImageData = await getAdditionalImageUrlsPublicIds(productData.post_id);

        const matchingImage = additionalImageData.find((item) => item.image_url === originalThumbnail);
        await deleteImage(matchingImage.public_id, matchingImage.resource_type);
        await deleteImageData(matchingImage.post_id, matchingImage.public_id);
      }

      setCurrentImage('');

      if (editResponse) {
        // Delete any removed persisted sales by id
        if (removedSales.length) {
          for (const removed of removedSales) {
            await deleteProductSales(editResponse.id, removed.id);
          }
        }

        setProducts((prevProducts) => {
          // Map through the existing products to update the edited product
          const updatedProducts = prevProducts.map((p) => {
            if (p.id === productData.id) {
              // Replace with the updated product data, always clear sales if not sold
              return {
                ...editResponse,
                sales: productData.sales || [],
                sold: productData.sold,
              };
            }
            return p;
          });

          // Sort the array by the 'date' property
          updatedProducts.sort((a, b) => Number(b.date) - Number(a.date));

          setFormLoading(false);

          return updatedProducts;
        });
        // Update the product state with the selected product's details

        setFormLoading(false);
        resetFormState();
        setPreviousSales([]);
      }
    } catch (e) {
      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error editing product:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Error editing product: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'products-3',
          autoClose: false,
        });
      }
    }
  };

  const handleProductSelection = (e) => {
    const selectedId = e.target.value;
    setSelectedProductId(selectedId); // Update the selected product ID
    setProduct(selectedId); // Update the product state with the selected product's ID
    const foundProduct = products.find((p) => p.id === selectedId);

    // Update the form with the selected product's details
    if (foundProduct) {
      setProduct({
        date: foundProduct.date,
        type: foundProduct.type,
        title: foundProduct.title,
        category: foundProduct.category,
        price: foundProduct.price,
        description: foundProduct.description,
        qty: foundProduct.qty || 1,
        sales: foundProduct.sales || [],
      });
    }
  };

  const handleProductEditChange = (e) => {
    setSelectedProduct((prevSelectedProduct) => ({
      ...prevSelectedProduct,
      [name]: value,
    }));

    const { name, value } = e.target;
    setEditedProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  const validateFileSize = (file) => {
    // Check file type first
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      throw new Error('Only JPG and PNG files are allowed');
    }

    // Then check size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size must be less than 10MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    }
  };

  //  MAIN SUBMIT BOTH NEW & EDIT
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    // Check if the date is valid- 'required' isn't inherently supported in MUI's DatePicker so this is a manual check mitigating that
    if (!product.date) {
      toast.warn('Date is required', { theme: 'colored', draggable: true, draggablePercent: 60 });
      setFormLoading(false);
      return;
    }

    try {
      // Always start with the full product object
      let updatedProduct = { ...product };
      let uploadedImages = [];

      // Upload images if there are files selected
      if (files.length > 0) {
        files.forEach((file) => validateFileSize(file));

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
              toastId: 'products-5',
              autoClose: false,
            });
          }
        }

        if (mode === 'edit' && product.public_id) {
          await deleteImage(product.public_id, 'image');
        }
        uploadedImages = await uploadProductImage(files);

        if (!uploadedImages) {
          throw new Error('Failed to upload images');
        }

        if (uploadedImages && uploadedImages.length > 0) {
          updatedProduct = {
            ...updatedProduct,
            image_url: uploadedImages[0].secure_url,
            public_id: uploadedImages[0].public_id,
          };
        }
      }
      // else if (mode === 'edit' && !files.length && !product.image_url) {
      //   // In edit mode, if no existing image, reset image fields
      //   updatedProduct = {
      //     ...updatedProduct,
      //     image_url: '',
      //     public_id: '',
      //   };
      // }

      // Edit post in db======================================
      if (mode === 'edit' && updatedProduct.post_id) {
        const { num_imgs } = await getPostDetail(updatedProduct.post_id);
        const { post_id, title, description, image_url, category, price, public_id, sold, date_sold, qty } =
          updatedProduct;

        const post = {
          post_id,
          title,
          description,
          image_url,
          category,
          price,
          public_id,
          num_imgs,
          sold,
          date_sold,
          qty,
        };

        await updatePost(updatedProduct.post_id, post);
      }

      let newProductPost = null;
      // If the createGalleryPost checkbox is checked so create new post in gallery
      if (createGalleryPost) {
        const { title, description, image_url, category, price, public_id, sold, date_sold, qty } = updatedProduct;

        // Create new post with fetch call to DB
        const post = await postPost(
          title,
          description,
          image_url,
          category,
          price,
          public_id,
          files.length,
          sold,
          date_sold,
          qty
        );

        const adaptedFiles = files.slice(1); // added to remove duplicate url

        // Upload new images to S3 and get their URLs + post details
        newProductPost = {
          ...(await uploadImagesAndCreatePost(adaptedFiles, mode)),
          ...post,
        };

        // send image urls and public ids to db
        await postAddImages(newProductPost.additionalImages, post.id);

        updatedProduct.post_id = post.id;

        // send image urls and public ids to db
        await postAddImages(uploadedImages, post.id);

        if (!post) {
          throw new Error('Failed to create gallery post');
        }

        setCreateGalleryPost(false);
      }
      // Recalculate sold before submit
      updatedProduct.sold = calculateSoldStatus(updatedProduct);

      // Ensure date_sold is populated when the product becomes sold.
      // Backend uses date_sold for calendar shelf-time calculations.
      if (updatedProduct.sold) {
        let latestSaleDateSold = 0;
        if (Array.isArray(updatedProduct.sales)) {
          latestSaleDateSold = updatedProduct.sales.reduce((max, sale) => {
            const value = Number(sale && sale.dateSold);
            return Number.isFinite(value) && value > max ? value : max;
          }, 0);
        }

        if (!updatedProduct.date_sold) {
          updatedProduct.date_sold = latestSaleDateSold || Date.now();
        }
      } else {
        updatedProduct.date_sold = null;
      }

      // Trigger proper mode function
      if (mode === 'edit') {
        await handleEditProduct(updatedProduct);
        // ← bundle updatedProduct into the products array
        // setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
      } else if (mode === 'new') {
        await handleAddProduct(updatedProduct);
        // ← include the new product (with its sales) in the list
        // setProducts((prev) => {
        //   const arr = [...prev, updatedProduct];
        //   arr.sort((a, b) => Number(b.date) - Number(a.date));
        //   return arr;
        // });
      }

      setNewPostCreated((prevState) => !prevState); // Toggle newPostCreated state to update gallery

      resetFormState();

      // if (mode === 'new') {
      // After adding a new product, reset currentImage
      // setCurrentImage('');
      // }

      // Clear the form and reset states
      // setSelectedProduct(null);
      // setProduct({
      //   type: '',
      //   date: null,
      //   title: '',
      //   category: '',
      //   price: '',
      //   description: '',
      //   num_days: '',
      //   sold: false,
      //   qty: 1,
      // });
      // setFiles([]); // Reset file state
      // setLoadingProducts(false);
      // setFormLoading(false);
      // resetFormState();
      // handleFormClose();
    } catch (e) {
      setFormLoading(false);

      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error creating product:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Error creating product: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'products-6',
          autoClose: false,
        });
      }
    }
  };

  useEffect(() => {
    setOriginalProducts(products);

    // Filter products based on currentFilter
    let newFilteredProducts = products;
    if (currentFilter === 'all') {
      newFilteredProducts = products;
    } else if (currentFilter === 'highlight') {
      newFilteredProducts = products.filter((product) => product.price === '0' && product.type === 'auction');
    } else {
      newFilteredProducts = products.filter((product) => product.type === currentFilter);
    }
    setFilteredProducts(newFilteredProducts);

    // Keep showAuctionsToUpdate in sync
    setShowAuctionsToUpdate(currentFilter === 'highlight');
  }, [products, currentFilter]);

  const handleTypeSelectChange = (e) => {
    const { value } = e.target;
    setProductSelect((prev) => ({ ...prev, type: value }));
    setCurrentFilter(value);
    setCurrentPage(1);
    if (value === 'all') {
      setFilteredProducts(originalProducts);
    } else if (value === 'highlight') {
      const newFilteredProducts = originalProducts.filter(
        (product) => product.price === '0' && product.type === 'auction'
      );
      setFilteredProducts(newFilteredProducts);
    } else {
      const newFilteredProducts = originalProducts.filter((product) => product.type === value);
      setFilteredProducts(newFilteredProducts);
    }
  };

  const handleShowAuctionsToUpdate = () => {
    setCurrentFilter('highlight');
    const newFilteredProducts = originalProducts.filter(
      (product) => product.price === '0' && product.type === 'auction'
    );
    setFilteredProducts(newFilteredProducts);
    setShowAuctionsToUpdate(true);
    setCurrentPage(1);
  };

  const handleShowAllProducts = () => {
    setCurrentFilter('all');
    setFilteredProducts(originalProducts);
    setShowAuctionsToUpdate(false);
  };

  // When entering edit mode, set the original public ID
  useEffect(() => {
    if (mode === 'edit' && product.public_id) {
      setOriginalPublicId(product.public_id);
    }
  }, [mode, product.public_id]);

  // this is for making the date picker work- '?' is a null check to prevent errors after submitting the form on edit
  const dateAsString = selectedProduct?.date; // e.g., "2023-11-14"
  const dateAsNumber = Number(dateAsString);

  return (
    (loadingProducts && (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          margin: !isMobile && '150px',
        }}
      >
        <Typography variant="h5" sx={{ color: (theme) => theme.palette.primary.light }}>
          Loading Products
          <span className="animated-ellipsis">.</span>
          <span className="animated-ellipsis">.</span>
          <span className="animated-ellipsis ">.</span>
        </Typography>
        <FlamePipe />
      </Box>
    )) || (
      <Box
        sx={{
          transform: isMobile ? 'translate(0%, -2.6%)' : '',
          paddingTop: '20px',
        }}
      >
        <Box
          className="admin-container-2"
          sx={{
            borderWidth: '1px',
            borderStyle: 'solid',
            color: (theme) => theme.palette.primary.light,
          }}
        >
          {/* admin-panel-2 only shows on medium to xlarge screens per css */}
          <Box sx={{ borderColor: (theme) => theme.palette.primary.dark }} className="admin-panel-2">
            <section className="admin-panel-section-2 ">
              <div className="button-container">
                <Typography variant="h5">Product List</Typography>
                <Typography variant="h6">Show Category:</Typography>
                <div className="inner-button-container">
                  <FormControl fullWidth variant="outlined">
                    <InputLabel id="product-type-label">Select Type</InputLabel>
                    <Select
                      sx={{ height: '45px' }}
                      labelId="product-category-label"
                      name="type-select"
                      value={productSelect ? productSelect.type : 'All'}
                      onChange={handleTypeSelectChange}
                      label="Type Select"
                      required
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="highlight">Auction Update</MenuItem>
                      <MenuItem value="auction">Auctions</MenuItem>
                      <MenuItem value="direct-sale">Direct Sales</MenuItem>
                      <MenuItem value="inventory">Inventory</MenuItem>
                      <MenuItem value="prep-other">Prep/ Other</MenuItem>
                    </Select>
                  </FormControl>
                </div>
              </div>
            </section>
          </Box>

          {isMobile && !showForm && (
            <>
              <Button
                variant="contained"
                size="small"
                onClick={() => setShowForm(true)}
                sx={{ maxHeight: '2rem', margin: '0 1rem 0 1rem' }}
                disabled={restricted ? restricted : false}
                startIcon={<AddCircleIcon />}
              >
                {restricted ? 'Tracking disabled' : 'Create New Product'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={showAuctionsToUpdate ? handleShowAllProducts : handleShowAuctionsToUpdate}
                sx={{ margin: '.5rem 1rem 0 1rem' }}
                startIcon={<UpdateIcon />}
              >
                {showAuctionsToUpdate ? 'Show All Products' : 'Update Auctions'}
              </Button>
              <Box
                display="flex"
                justifyContent={isMobile ? 'flex-start' : 'center'}
                sx={{
                  color: (theme) => theme.palette.primary.light,
                }}
              >
                <Typography variant="h5" sx={{ margin: '.5rem 0 0 1rem' }}>
                  {showAuctionsToUpdate ? 'Auctions to Update' : 'All Products'}
                </Typography>
              </Box>
            </>
          )}

          {!showForm && (
            <Box className="product-grid-container" sx={{}}>
              {products.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Typography sx={{ color: 'white', width: '80%', textAlign: 'left', marginTop: '20px' }}>
                    No data available. The Products tab manages your daily production and the type of sale they are
                    slated for or have sold through. Enter your products as you make them. Update auctions as they sell.
                    These values will populate the Calendar and Analysis tabs. Example display below:
                  </Typography>
                  <img
                    src={isMobile ? exampleProductsImageMobile : exampleProductsImageDesktop}
                    alt="example"
                    style={{ width: '80%' }}
                  />
                </Box>
              ) : (
                <ProductGrid
                  products={currentProducts}
                  setSelectedProduct={setSelectedProduct}
                  selectedProduct={selectedProduct}
                  handleEditClick={handleEditClick}
                  handleDeleteClick={handleDeleteClick}
                  filteredProducts={filteredProducts}
                  paginate={paginate}
                  currentPage={currentPage}
                  indexOfLastProduct={indexOfLastProduct}
                  productsPerPage={productsPerPage}
                  isDeleting={isDeleting}
                />
              )}
            </Box>
          )}

          {(showForm || !isMobile) && (
            <InventoryMgtForm
              selectedButton={selectedButton}
              handleNewClick={handleNewClick}
              handleEditClick={handleEditClick}
              mode={mode}
              handleProductSubmit={handleProductSubmit}
              // handleProductChange={handleProductChange}
              product={product}
              products={products}
              handleProductSelection={handleProductSelection}
              selectedProduct={selectedProduct}
              handleProductEditChange={handleProductEditChange}
              setEditedProduct={setEditedProduct}
              dateAsNumber={dateAsNumber}
              setProduct={setProduct}
              setProducts={setProducts}
              selectedProductId={selectedProductId}
              files={files}
              setFiles={setFiles}
              currentImage={currentImage}
              setCurrentImage={setCurrentImage}
              handleFormClose={handleFormClose}
              createGalleryPost={createGalleryPost}
              setCreateGalleryPost={setCreateGalleryPost}
              formLoading={formLoading}
              setOriginalThumbnail={setOriginalThumbnail}
              isNewClick={isNewClick}
            />
          )}
        </Box>
      </Box>
    )
  );
}

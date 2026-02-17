import { useParams } from 'react-router-dom';
import {
  deleteImage,
  deleteImageData,
  getPostDetail,
  postAddImages,
  updatePost,
  updatePostMainImage,
} from '../../services/fetch-utils.js';
import PostForm from '../PostForm/PostForm.js';
import { usePost } from '../../hooks/usePost.js';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '../../context/QueryContext.js';
import { editProducts } from '../../services/fetch-products.js';
import { useProducts } from '../../hooks/useProducts.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../../stores/useAuthStore.js';
export default function EditPost() {
  const { id } = useParams();

  const { products, setProducts } = useProducts();

  const navigate = useNavigate();
  const { postDetail, setLoading, error, imageUrls, setImageUrls, additionalImageUrlsPublicIds, additionalImages } =
    usePost(id);
  const { authenticateUser, isAuthenticated, signingOut, checkTokenExpiry } = useAuthStore();

  // authenticate and check tokens
  useEffect(() => {
    if (!isAuthenticated && !error && !signingOut) {
      authenticateUser();
    } else if (isAuthenticated) {
      // If we are authenticated, check token expiry
      checkTokenExpiry();
    }
  }, [isAuthenticated, error, authenticateUser, signingOut, checkTokenExpiry]);

  // navigate to sign in if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/sign-in');
      return;
    }
  }, [isAuthenticated, navigate, error]);

  const [deletedImagePublicIds, setDeletedImagePublicIds] = useState([]);

  const { setNewPostCreated } = useQuery(); // We can use the same context state for edits since the desired effect is the same: refresh the post list.

  if (error) return <h1>{error}</h1>;
  const getThumbnailUrl = (mediaUrl) => {
    if (mediaUrl.endsWith('.mp4')) {
      return mediaUrl.replace('.mp4', '.jpg');
    }

    return mediaUrl;
  };

  const handleEditProduct = async (productData) => {
    try {
      const response = await editProducts(productData);

      if (response) {
        setProducts((prevProducts) => {
          // Map through the existing products to update the edited product
          const updatedProducts = prevProducts.map((p) => {
            if (p.id === productData.id) {
              // Replace with the updated product data
              return response;
            }
            return p;
          });

          // Sort the array by the 'date' property
          updatedProducts.sort((a, b) => a.date - b.date);

          return updatedProducts;
        });
      }
    } catch (e) {
      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Failed to edit post:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Failed to edit post: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'edit-post-1',
          autoClose: false,
        });
      }
    }
  };

  //  submitHandler is called when the user clicks the submit button on the EditPost form
  const submitHandler = async (post, currentImages, deletedImages) => {
    setLoading(true);

    // Check if the original thumbnail (index 0) was deleted
    const thumbnailWasDeleted = deletedImages.includes(imageUrls[0]);

    try {
      const isDevServer = window.location.hostname.includes('dev');
      const prodPath = '/at-the-fire/';
      const devPath = '/at-the-fire-dev/';
      const basePath = isDevServer ? devPath : prodPath;

      // If thumbnail was deleted, explicitly set new thumbnail
      if (thumbnailWasDeleted) {
        if (post.newImages.length > 0) {
          post.image_url = post.newImages[0].secure_url;
          post.public_id = post.newImages[0].public_id;
        } else {
          post.image_url = currentImages[0];
          post.public_id = currentImages[0].split(basePath)[1];
        }
        await updatePostMainImage(postDetail.id, post.image_url, post.public_id);
      } else {
        // Regular thumbnail logic, now with public_id handling
        if (currentImages.length === 0) {
          post.image_url = post.newImages[0].secure_url;
          post.public_id = post.newImages[0].public_id;
        } else {
          post.image_url = currentImages[0];
          const urlParts = currentImages[0].split(basePath);
          post.public_id = urlParts[1]?.split('/', 2)[1];
        }
      }

      // get the number of images for the post and public_id for thumbnail
      const { num_imgs, public_id } = await getPostDetail(id);
      post.num_imgs = num_imgs;
      post.public_id = public_id;

      // Edit post in db
      await updatePost(postDetail.id, post);
      await postAddImages(post.newImages, postDetail.id);

      // Find the product that corresponds to this post
      let matchedProduct = products.find((product) => product.post_id === id);

      if (matchedProduct) {
        // If a matching product is found, handle editing the product
        matchedProduct = {
          ...matchedProduct,
          category: post.category,
          price: post.price,
          title: post.title,
          description: post.description,
          image_url: post.image_url,
          public_id: post.public_id,
          sold: post.sold,
          date_sold: post.date_sold,
        };
        await handleEditProduct(matchedProduct);
      }

      // Delete removed images from the database and S3
      for (const removedImageUrl of deletedImages) {
        const removedImage = additionalImages.find((image) => image.image_url === removedImageUrl);

        if (removedImage) {
          await deleteImage(removedImage.public_id, removedImage.resource_type);
          await deleteImageData(id, removedImage.public_id);
        }
      }
      setNewPostCreated((prevState) => !prevState); // Toggle newPostCreated state after post edit

      navigate('/dashboard');
    } catch (e) {
      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error editing this post:', e.message);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Error editing this post: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'edit-post-2',
          autoClose: false,
        });
      }
    }
  };

  return (
    <PostForm
      {...postDetail}
      submitHandler={submitHandler}
      setImageUrls={setImageUrls}
      imageUrls={imageUrls}
      additionalImageUrlsPublicIds={additionalImageUrlsPublicIds}
      additionalImages={additionalImages}
      deletedImagePublicIds={deletedImagePublicIds}
      setDeletedImagePublicIds={setDeletedImagePublicIds}
      getThumbnailUrl={getThumbnailUrl}
      products={products}
    />
  );
}

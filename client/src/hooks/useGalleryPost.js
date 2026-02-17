import { useEffect } from 'react';
import { useState } from 'react';
import { getAdditionalImageUrlsPublicIdsGallery, getGalleryPostDetail } from '../services/fetchPosts.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore.js';
export function useGalleryPost(id) {
  const [postDetail, setPostDetail] = useState({});
  const [imageUrls, setImageUrls] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDeleted, setIsDeleted] = useState(false);
  const [additionalImagesGallery, setAdditionalImagesGallery] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      try {
        const data = await getGalleryPostDetail(id);
        if (!data) {
          setError('Post not found.');
          setLoading(false);
          throw new Error('Post not found.');
        }

        const additionalImagesGallery = await getAdditionalImageUrlsPublicIdsGallery(id);
        const additionalImageUrlsPublicIds = additionalImagesGallery.map((image) => image.image_url);

        setAdditionalImagesGallery(additionalImagesGallery);

        setPostDetail(data);
        setImageUrls([...additionalImageUrlsPublicIds]);
        setLoading(false);
      } catch (e) {
        setError(e.message);

        if (e.code === 401 || e.code === 403) {
          useAuthStore.getState().handleAuthError(e.code, e.message);
        } else {
          if (process.env.REACT_APP_APP_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Error fetching gallery post:', e);
          }
          useAuthStore.getState().setError(e.code);
          toast.error(`Error fetching gallery post: ${e.message}`, {
            theme: 'colored',
            draggable: true,
            draggablePercent: 60,
            toastId: 'useGalleryPost-1',
            onClose: () => navigate('/'),
          });
        }
      }
    };
    fetchData();
  }, [id, navigate]);

  return {
    postDetail,
    setPostDetail,
    imageUrls,
    setImageUrls,
    loading,
    setLoading,
    error,
    setError,
    isDeleted,
    setIsDeleted,
    additionalImagesGallery,
    setAdditionalImagesGallery,
  };
}

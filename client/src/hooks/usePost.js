import { useEffect, useState } from 'react';
import { getPostDetail, getAdditionalImageUrlsPublicIds } from '../services/fetch-utils.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../stores/useAuthStore.js';
export function usePost(id) {
  const [postDetail, setPostDetail] = useState({});
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleted, setIsDeleted] = useState(false);
  const [additionalImages, setAdditionalImages] = useState([]);
  const { customerId, isAuthenticated, setError, error, user } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      try {
        if (!user || !isAuthenticated || !customerId || error === 401 || error === 403) {
          return;
        }
        const postDetail = await getPostDetail(id);
        const additionalImages = await getAdditionalImageUrlsPublicIds(id);
        const additionalImageUrlsPublicIds = additionalImages.map((image) => image.image_url);
        setAdditionalImages(additionalImages);

        setPostDetail(postDetail);
        setImageUrls([...additionalImageUrlsPublicIds]);
        setLoading(false);
      } catch (e) {
        setError(e.code);

        if (e.code === 401 || e.code === 403) {
          useAuthStore.getState().handleAuthError(e.code, e.message);
        } else {
          if (process.env.REACT_APP_APP_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Error fetching post details:', e);
          }
          useAuthStore.getState().setError(e.code);
          toast.error(`Error fetching post details: ${e.message}`, {
            theme: 'colored',
            draggable: true,
            draggablePercent: 60,
            toastId: 'usePost-1',
            autoClose: false,
          });
        }
      }
    };
    fetchData();
  }, []);

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
    additionalImages,
    setAdditionalImages,
  };
}

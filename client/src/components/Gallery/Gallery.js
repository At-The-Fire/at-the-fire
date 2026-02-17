import React, { useEffect } from 'react';
import './Gallery.css';
import { useQuery } from '../../context/QueryContext.js';
import UserGallery from './UserGallery.js';
import FlamePipe from '../FlamePipe/FlamePipe.js';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { useLikeStore } from '../../stores/useLikeStore.js';

export default function Gallery() {
  const { filteredData, queryLoading } = useQuery();
  const { authenticateUser, isAuthenticated, error, signingOut, checkTokenExpiry } = useAuthStore();
  const { fetchBatchLikes } = useLikeStore();

  // Authenticate and check tokens
  useEffect(() => {
    if (!isAuthenticated && !error && !signingOut) {
      authenticateUser();
    } else if (isAuthenticated) {
      checkTokenExpiry();
    }
  }, [isAuthenticated, error, authenticateUser, signingOut, checkTokenExpiry]);

  // Batch fetch likes once posts are loaded
  useEffect(() => {
    if (filteredData?.length) {
      const postIds = filteredData.map((item) => item.id);
      fetchBatchLikes(postIds);
    }
  }, [filteredData, fetchBatchLikes]);

  return (
    <>
      {queryLoading ? (
        <div className="loading-detail-2">
          <FlamePipe />
        </div>
      ) : (
        <div style={{ position: 'relative', top: '85px' }}>
          <UserGallery data={filteredData} />
        </div>
      )}
    </>
  );
}

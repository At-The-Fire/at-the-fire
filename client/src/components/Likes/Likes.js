import React, { useEffect } from 'react';
import { useLikeStore } from '../../stores/useLikeStore.js';

const LikeButton = ({ postId }) => {
  const { likes, toggleLike, fetchLikeStatus, fetchLikeCount } = useLikeStore();
  const { liked = false, count = 0 } = likes[postId] || {};

  useEffect(() => {
    fetchLikeStatus(postId);
    fetchLikeCount(postId);
  }, [postId, fetchLikeStatus, fetchLikeCount]);

  return (
    <button onClick={() => toggleLike(postId)}>
      {liked ? 'Unlike' : 'Like'} ({count})
    </button>
  );
};

export default LikeButton;

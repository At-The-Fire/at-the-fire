import React from 'react';
import IconButton from '@mui/material/IconButton';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useLikeStore } from '../../stores/useLikeStore.js';
import { useAuthStore } from '../../stores/useAuthStore.js';

export default function LikeButton({ postId }) {
  const { likes, toggleLike } = useLikeStore();
  const { liked = false, count = 0 } = likes[postId] || {};
  const { user } = useAuthStore();

  return (
    <IconButton
      onClick={() => (user ? toggleLike(postId) : null)}
      sx={{ fontSize: '0.8rem', gap: '6px' }}
    >
      {liked ? (
        <FavoriteIcon sx={{ color: 'red', transform: 'scale(1)' }} />
      ) : (
        <FavoriteBorderIcon sx={{ transform: 'scale(1)' }} />
      )}
      <span style={{ fontSize: '.9rem', marginLeft: '2px' }}>{count}</span>
    </IconButton>
  );
}

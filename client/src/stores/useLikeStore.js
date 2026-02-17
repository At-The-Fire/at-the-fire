import { create } from 'zustand';

const BASE_URL = process.env.REACT_APP_BASE_URL;

export const useLikeStore = create((set) => ({
  likes: {}, // { [postId]: { liked, count } }

  setLikeStatus: (postId, liked, count) =>
    set((state) => ({
      likes: { ...state.likes, [postId]: { liked, count } },
    })),

  toggleLike: async (postId) => {
    const res = await fetch(`${BASE_URL}/api/v1/likes/toggle/${postId}`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json();
    set((state) => ({
      likes: { ...state.likes, [postId]: { liked: data.liked, count: data.count } },
    }));
  },

  fetchLikeCount: async (postId) => {
    const res = await fetch(`${BASE_URL}/api/v1/likes/count/${postId}`);
    const { count } = await res.json();
    set((state) => ({
      likes: {
        ...state.likes,
        [postId]: { ...(state.likes[postId] || {}), count },
      },
    }));
  },

  fetchLikeStatus: async (postId) => {
    const res = await fetch(`${BASE_URL}/api/v1/likes/status/${postId}`, {
      credentials: 'include',
    });
    const { isLiked } = await res.json();
    set((state) => ({
      likes: {
        ...state.likes,
        [postId]: { ...(state.likes[postId] || {}), liked: isLiked },
      },
    }));
  },

  fetchBatchLikes: async (postIds) => {
    const res = await fetch(`${BASE_URL}/api/v1/likes/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ postIds }),
    });
    const data = await res.json();
    set((state) => ({
      likes: { ...state.likes, ...data },
    }));
  },
}));

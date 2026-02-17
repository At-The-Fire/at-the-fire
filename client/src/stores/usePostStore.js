import { create } from 'zustand';

const usePostStore = create((set) => ({
  // State
  posts: [],
  loading: true,
  postError: null,
  restricted: false,

  // Actions to update state
  setPosts: (posts) => set({ posts }),
  setLoading: (loading) => set({ loading }),
  setRestricted: (restricted) => set({ restricted }),
  setPostError: (postError) => set({ postError }),

  // Reset method if needed
  reset: () =>
    set({
      posts: [],
      loading: true,
      postError: null,
      restricted: false,
    }),
}));

export default usePostStore;

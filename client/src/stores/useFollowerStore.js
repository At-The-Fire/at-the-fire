// stores/useFollowStore.js
import { create } from 'zustand';

export const useFollowStore = create((set) => ({
  followerCounts: {},
  followingStatus: {}, // tracks who the current user is following

  setFollowerCounts: (userId, counts) =>
    set((state) => ({
      followerCounts: {
        ...state.followerCounts,
        [userId]: counts,
      },
    })),

  updateFollowStatus: (targetUserId, isFollowing) =>
    set((state) => ({
      followingStatus: {
        ...state.followingStatus,
        [targetUserId]: isFollowing,
      },
    })),

  incrementFollowingCount: (userId) =>
    set((state) => ({
      followerCounts: {
        ...state.followerCounts,
        [userId]: {
          ...state.followerCounts[userId],
          followingCount: (state.followerCounts[userId]?.followingCount || 0) + 1,
        },
      },
    })),

  decrementFollowingCount: (userId) =>
    set((state) => ({
      followerCounts: {
        ...state.followerCounts,
        [userId]: {
          ...state.followerCounts[userId],
          followingCount: (state.followerCounts[userId]?.followingCount || 0) - 1,
        },
      },
    })),

  incrementFollowerCount: (userId) =>
    set((state) => ({
      followerCounts: {
        ...state.followerCounts,
        [userId]: {
          ...state.followerCounts[userId],
          followerCount: (state.followerCounts[userId]?.followerCount || 0) + 1,
        },
      },
    })),

  decrementFollowerCount: (userId) =>
    set((state) => ({
      followerCounts: {
        ...state.followerCounts,
        [userId]: {
          ...state.followerCounts[userId],
          followerCount: (state.followerCounts[userId]?.followerCount || 0) - 1,
        },
      },
    })),
}));

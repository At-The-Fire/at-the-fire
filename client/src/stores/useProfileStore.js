import { create } from 'zustand';
import userDefaultImage from './../assets/user.png';

const useProfileStore = create((set) => ({
  // State
  profilePicture: null,
  userSub: null,

  // Actions to update state
  setProfilePicture: (picture, sub) =>
    set((state) => {
      if (state.userSub === sub) {
        return { profilePicture: picture || userDefaultImage };
      }
      return state;
    }),
  setUserSub: (sub) => set({ userSub: sub }),
  clearProfilePicture: () => set({ profilePicture: null }),
}));

export default useProfileStore;

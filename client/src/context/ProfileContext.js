import React, { createContext, useState, useContext, useEffect } from 'react';
import useProfileStore from '../stores/useProfileStore.js';
import { toast } from 'react-toastify';
import { useAuthStore } from '../stores/useAuthStore.js';

const BASE_URL = process.env.REACT_APP_BASE_URL;

const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  // context & state
  const { user } = useAuthStore();
  const [error, setError] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState({});
  const [bizProfile, setBizProfile] = useState({});
  const [posts, setPosts] = useState([]);
  const [socialMediaLinks, setSocialMediaLinks] = useState({});
  const [profileUpdated, setProfileUpdated] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    imageUrl: '',
    publicId: '',
    firstName: '',
    lastName: '',
    bio: '',
    displayName: '',
    websiteUrl: '',
    logoImageUrl: '',
    logoPublicId: '',
    email: '',
    socialMediaLinks: {
      instagram: '',
      facebook: '',
      tiktok: '',
    },
  });
  const [logoUrl, setLogoUrl] = useState(null);
  const { setProfilePicture, setUserSub } = useProfileStore();

  // functions
  // needed for viewing post detail to load as well as public profile
  const fetchProfile = async (userId) => {
    if (!userId) return;
    try {
      setProfileLoading(true);
      const resp = await fetch(`${BASE_URL}/api/v1/profile/${userId}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store', // Bypass cache to avoid old data
      });

      if (resp.status === 404) {
        setError('Profile not found.');
        toast.warn(`Profile not found. `, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'profileContext-1',
          autoClose: true,
        });
        setProfile(null);

        return;
      }

      if (!resp.ok) {
        throw new Error('Failed to fetch profile.');
      }

      // check for a wrong url/ non-existent sub which is set to null on the back end
      const data = await resp.json();
      if (data.profile === null) {
        setProfile(null);
        return;
      }

      setUserSub(data.profile.sub);
      setProfilePicture(data.profile.imageUrl, user); // Set the profile image URL in Zustand store
      setProfile(data.profile);
      setBizProfile(data.bizProfile);
      setPosts(data.posts);
      setSocialMediaLinks(data.profile.socialMediaLinks || {});
    } catch (e) {
      setError(e.message);
      setProfile(null);

      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error fetching profile:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Error fetching profile: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'profile-context-1',
          autoClose: false,
        });
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const updateProfile = async (updatedData) => {
    try {
      setProfileLoading(true);
      const resp = await fetch(`${BASE_URL}/api/v1/profile/user-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedData),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.message);
      }

      setProfile(data.profile);
      setSocialMediaLinks(data.socialMediaLinks || {});
      setPosts(data.posts);

      await fetchProfile(user); // Refetch profile data to sync UI
    } catch (e) {
      setError(e.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const updateBizProfile = async (updatedBizData) => {
    try {
      const resp = await fetch(`${BASE_URL}/api/v1/profile/customer-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedBizData),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.message);
      }

      setBizProfile(data);
    } catch (e) {
      setError(e.message);
      if (process.env.REACT_APP_APP_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile(user);
    }
  }, [user]);

  const value = {
    profile,
    bizProfile,
    posts,
    setPosts,
    profileLoading,
    setProfileLoading,
    error,
    fetchProfile,
    updateProfile,
    updateBizProfile,
    socialMediaLinks,
    setSocialMediaLinks,
    editedProfile,
    setEditedProfile,
    profileUpdated,
    setProfileUpdated,
    logoUrl,
    setLogoUrl,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export const useProfileContext = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
};

import React, { useEffect, useState } from 'react';
import userDefaultImage from './../../assets/user.png';
import instagram from './../../assets/social-icons/instagram.png';
import facebook from './../../assets/social-icons/facebook.png';
import glasspass from './../../assets/social-icons/glasspass_logo.PNG';

import tiktok from './../../assets/social-icons/tiktok.png';
import FlamePipe from '../FlamePipe/FlamePipe.js';
import '../Dashboard/Dashboard.css';

import {
  Button,
  Grid,
  Avatar,
  Typography,
  TextField,
  Card,
  CardContent,
  Link,
  Box,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  List,
  ListItem,
} from '@mui/material';

import { useNavigate, useParams } from 'react-router-dom';
import { deleteAvatarImage, deleteLogoImage, uploadAvatarImage, uploadLogoImage } from '../../services/fetch-utils.js';
import { useQuery } from '../../context/QueryContext.js';

import Tabs from '../Tabs/Tabs.js';
import { useProfileContext } from '../../context/ProfileContext.js';
import { useProfile } from '../../hooks/useProfile.js';
import { useMemo } from 'react';
import '../PostCard/PostCard.css';
import './Profile.css';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { useTheme } from '@emotion/react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../../stores/useAuthStore.js';
import imageCompression from 'browser-image-compression';
import FollowButton from '../FollowingOperations/FollowButton/FollowButton.js';
import FollowersList from '../FollowingOperations/FollowersList/FollowersList.js';
import FollowingList from '../FollowingOperations/FollowingList/FollowingList.js';
import CloseIcon from '@mui/icons-material/Close';
import { getFollowerCount } from '../../services/fetch-followers.js';
import { useFollowStore } from '../../stores/useFollowerStore.js';
const logo = require('../../assets/logo-icon-6.png');

export default function Profile() {
  const {
    profile,
    bizProfile,
    error,
    fetchProfile,
    updateProfile,
    updateBizProfile,
    socialMediaLinks,
    setSocialMediaLinks,
    editedProfile,
    setEditedProfile,
    setProfileUpdated,
    setLogoUrl,
    profileLoading,
  } = useProfileContext();

  const navigate = useNavigate();

  const { setNewPostCreated } = useQuery();
  const { user, isAuthenticated, customerId, authenticateUser, signingOut, checkTokenExpiry } = useAuthStore();
  const { sub } = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const isViewingOwnProfile = isAuthenticated && user === sub;
  const profileHookData = useProfile(sub);

  const finalProfile = isViewingOwnProfile ? profile : profileHookData.profile;
  const finalBizProfile = useMemo(() => {
    return isViewingOwnProfile ? bizProfile : profileHookData.bizProfile;
  }, [isViewingOwnProfile, bizProfile, profileHookData.bizProfile]);

  const finalSocialMediaLinks = useMemo(() => {
    return isViewingOwnProfile ? socialMediaLinks : profileHookData.profile?.socialMediaLinks || {};
  }, [isViewingOwnProfile, socialMediaLinks, profileHookData.profile?.socialMediaLinks]);

  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [userTempImage, setUserTempImage] = useState(finalProfile?.imageUrl || userDefaultImage);
  const [logoPreview, setLogoPreview] = useState(finalBizProfile?.logoImageUrl || userDefaultImage);

  // authenticate and check tokens
  useEffect(() => {
    if (!isAuthenticated && !error && !signingOut) {
      authenticateUser();
    } else if (isAuthenticated) {
      // If we are authenticated, check token expiry
      checkTokenExpiry();
    }
  }, [isAuthenticated, error, authenticateUser, signingOut, checkTokenExpiry]);

  const followerCounts = useFollowStore((state) => state.followerCounts[sub]) || {
    followerCount: 0,
    followingCount: 0,
  };

  useEffect(() => {
    const fetchCount = async () => {
      const counts = await getFollowerCount(sub);
      useFollowStore.getState().setFollowerCounts(sub, counts);
    };
    fetchCount();
  }, [sub]);

  const splitProfileData = (combinedProfile) => {
    return {
      userProfile: {
        imageUrl: combinedProfile.imageUrl,
        publicId: combinedProfile.publicId,
        firstName: combinedProfile.firstName,
        lastName: combinedProfile.lastName,
        bio: combinedProfile.bio,
        socialMediaLinks: {
          instagram: combinedProfile.socialMediaLinks?.instagram,
          facebook: combinedProfile.socialMediaLinks?.facebook,
          glasspass: combinedProfile.socialMediaLinks?.glasspass,
          tiktok: combinedProfile.socialMediaLinks?.tiktok,
        },
      },
      bizProfile: {
        displayName: combinedProfile.displayName,
        websiteUrl: combinedProfile.websiteUrl,
        logoImageUrl: combinedProfile.logoImageUrl,
        logoPublicId: combinedProfile.logoPublicId,
      },
    };
  };

  const handleAvatarUpload = async (e) => {
    try {
      let file = e.target.files[0];
      if (!file) return;

      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        toast.warn('Only JPG and PNG files are allowed', {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
        });
        e.target.value = '';
        return;
      }

      validateFileSize(file);
      try {
        file = await imageCompression(file, {
          maxWidthOrHeight: 1200,
          useWebWorker: false,
        });
      } catch (error) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          console.error(`Failed to compress ${file.name}:`, error);
        }
      }

      const previewUrl = URL.createObjectURL(file);
      setUserTempImage(previewUrl);
      setEditedProfile((prev) => ({
        ...prev,
        imageUrl: previewUrl,
        imageFileName: file.name,
      }));
      setAvatarFile(file);
    } catch (e) {
      toast.warn('File size too large, must be less than 10mb', {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
      });
    }
  };

  const handleLogoUpload = async (e) => {
    try {
      let file = e.target.files[0];
      if (!file) return;

      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        toast.warn('Only JPG and PNG files are allowed', {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
        });
        e.target.value = '';
        return;
      }
      validateFileSize(file);
      try {
        file = await imageCompression(file, {
          maxWidthOrHeight: 1200, // or whatever size you choose
          useWebWorker: false,
        });
      } catch (error) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          console.error(`Failed to compress ${file.name}:`, error);
        }
      }

      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
      setEditedProfile((prev) => ({
        ...prev,
        logoImageUrl: previewUrl,
        logoFileName: file.name,
      }));
      setLogoFile(file);
    } catch (e) {
      toast.warn('File size too large, must be less than 10mb.', {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
      });
    }
  };

  const handleEdit = (field, value) => {
    if (value.length <= 255) {
      setEditedProfile((prev) => ({ ...prev, [field]: value }));
    } else {
      toast.warn('Limit of 255 characters', {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'useAuth-3',
        autoClose: true,
      });
    }
  };

  const handleSocialMediaLinkChange = (platform, value) => {
    if (value.length <= 255) {
      setEditedProfile((prev) => {
        const updatedProfile = {
          ...prev,
          socialMediaLinks: {
            ...prev.socialMediaLinks,
            [platform]: value,
          },
        };

        return updatedProfile;
      });
    } else {
      toast.warn('Limit of 255 characters', {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'useAuth-3',
        autoClose: true,
      });
    }
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  const validateFileSize = (file) => {
    // Check file type first
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file?.type)) {
      throw new Error('Only JPG and PNG files are allowed');
    }

    // Then check size
    if (file?.size > MAX_FILE_SIZE) {
      throw new Error(`File size must be less than 10MB. Current size: ${(file?.size / (1024 * 1024)).toFixed(2)}MB`);
    }
  };

  // Submit form to update profile
  const handleSaveChanges = async (e) => {
    try {
      setIsUpdating(true);
      e.preventDefault();

      const { userProfile, bizProfile } = splitProfileData(editedProfile);

      const shouldProcessAvatarImage = !finalProfile?.imageUrl?.includes(avatarFile?.name) && !!avatarFile;
      const shouldProcessLogoImage = !finalBizProfile?.logoImageUrl?.includes(logoFile?.name) && !!logoFile;

      // Handle avatar update
      try {
        if (shouldProcessAvatarImage) {
          if (avatarFile) {
            validateFileSize(avatarFile);
            try {
              const compressedFile = await imageCompression(avatarFile, {
                maxWidthOrHeight: 1200,
                useWebWorker: false,
              });
              setAvatarFile(compressedFile);
            } catch (error) {
              if (process.env.REACT_APP_APP_ENV === 'development') {
                console.error(`Failed to compress ${avatarFile.name}:`, error);
              }
            }
            if (finalProfile.publicId) {
              await deleteAvatarImage(finalProfile.publicId);
            }

            const formData = new FormData();
            formData.append('avatar', avatarFile, avatarFile.name);

            const { publicId, secureUrl } = await uploadAvatarImage(formData);
            userProfile.publicId = publicId;
            userProfile.imageUrl = secureUrl;
          }
        }
      } catch (error) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Failed to update avatar:', error);
        }
        throw new Error(error.message || 'Failed to update profile picture. Please try again.');
      }

      // Update user profile
      try {
        await updateProfile(userProfile);
      } catch (error) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Failed to update user profile:', error);
        }
        throw new Error('Failed to save profile changes. Please try again.');
      }

      // Handle business logo update
      try {
        if (shouldProcessLogoImage) {
          if (logoFile && bizProfile) {
            // Validate logo file size before attempting upload

            validateFileSize(logoFile);

            try {
              const compressedFile = await imageCompression(logoFile, {
                maxWidthOrHeight: 1200,
                useWebWorker: false,
              });
              setLogoFile(compressedFile);
            } catch (error) {
              if (process.env.REACT_APP_APP_ENV === 'development') {
                console.error(`Failed to compress ${logoFile.name}:`, error);
              }
            }

            if (bizProfile.logoPublicId) {
              await deleteLogoImage(bizProfile.logoPublicId);
            }

            const formData = new FormData();
            formData.append('logo', logoFile, logoFile.name);

            const { publicId, secureUrl } = await uploadLogoImage(formData);
            bizProfile.logoPublicId = publicId;
            bizProfile.logoImageUrl = secureUrl;

            setLogoUrl(secureUrl);
          }
        }
      } catch (error) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Failed to update business logo:', error);
        }
        throw new Error(error.message || 'Failed to update business logo. Please try again.');
      }

      // Update business profile
      try {
        if (bizProfile && Object.values(bizProfile).some((value) => value)) {
          await updateBizProfile(bizProfile);
        }
      } catch (error) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Failed to update business profile:', error);
        }
        throw new Error('Failed to save business profile changes. Please try again.');
      }

      // Success handling
      setProfileUpdated((prev) => !prev);
      setNewPostCreated((prev) => !prev);
      setIsEditing(false);
    } catch (e) {
      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('An error occurred while saving changes. Please try again.:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`An error occurred while saving changes. Please try again.: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'profile-1',
          autoClose: false,
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBioChange = (value) => {
    if (value.length <= 255) {
      handleEdit('bio', value);
    } else {
      toast.warn('Limit of 255 characters', {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'useAuth-3',
        autoClose: true,
      });
    }
  };

  const handleMessageClick = (sub) => {
    navigate(`/messages/${sub}`);
  };

  useEffect(() => {
    if (profile === null) {
      navigate('/not-found');
    }
  });

  function getAvatarStyle(isMobile, isTablet, bizProfile) {
    let style = {
      width: '70px',
      height: '70px',
      borderRadius: '50%',
      border: '1px solid black',
    };

    // Set position first as it affects how other properties work
    style.position = isMobile || !isTablet ? '' : 'absolute';

    // Case 1
    if (isMobile && isTablet && !bizProfile) {
      style.top = '0px';
      style.left = '0px';
      style.margin = 'auto';
      return style;
    }

    // Case 2
    if (isMobile && isTablet && bizProfile) {
      style.top = '-50px';
      style.left = '85px';
      style.margin = 'auto';
      return style;
    }

    // Case 3
    if (!isMobile && isTablet && !bizProfile) {
      style.top = '-15px';
      style.left = '0px';
      return style;
    }

    // Case 4
    if (!isMobile && isTablet && bizProfile) {
      style.top = '150px';
      style.left = '150px';
      return style;
    }

    // Case 5
    if (!isMobile && !isTablet && !bizProfile) {
      style.top = '0px';
      style.left = '0px';
      style.margin = 'auto';
      return style;
    }

    // Case 6
    if (!isMobile && !isTablet && bizProfile) {
      style.top = '-50px';
      style.left = '85px';
      style.margin = 'auto';
      return style;
    }

    return style;
  }

  useEffect(() => {
    setUserTempImage(finalProfile?.imageUrl || userDefaultImage);
  }, [finalProfile?.imageUrl]);

  useEffect(() => {
    setLogoPreview(finalBizProfile?.logoImageUrl || userDefaultImage);
  }, [finalBizProfile?.logoImageUrl]);

  useEffect(() => {
    setUserTempImage(finalProfile?.imageUrl);
  }, [finalProfile?.imageUrl]);

  useEffect(() => {
    setLogoPreview(finalBizProfile?.logoImageUrl);
  }, [finalBizProfile?.logoImageUrl]);

  useEffect(() => {
    if (finalProfile) {
      const newLinks = {};

      // Define all possible social media keys
      const possibleLinks = ['instagram', 'facebook', 'glasspass', 'tiktok']; // Add more as needed

      // Iterate and set only the existing ones
      possibleLinks.forEach((key) => {
        if (finalProfile?.socialMediaLinks && finalProfile.socialMediaLinks[key]) {
          newLinks[key] = finalProfile.socialMediaLinks[key];
        }
      });

      const combinedProfile = { ...finalProfile, ...finalBizProfile };
      setEditedProfile(combinedProfile);
      setSocialMediaLinks(newLinks);
    }
  }, [finalProfile, finalBizProfile, customerId, setSocialMediaLinks, setEditedProfile]);

  useEffect(() => {
    if (sub !== null) {
      fetchProfile(sub);
    }
  }, [sub]);

  useEffect(() => {
    if (user !== finalProfile?.sub) {
      return;
    }

    if (
      ((!profileLoading || user) && profile.firstName === null) ||
      profile.lastName === null ||
      profile.imageUrl === null
    ) {
      toast.info(
        <Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              marginBottom: '8px',
              position: 'absolute',
              flexWrap: 'nowrap',
              width: '340px',
              transform: 'translateX(-45px)',
              paddingLeft: '8px',
            }}
          >
            <img
              width="640"
              height="360"
              src={logo}
              alt={'site logo'}
              style={{
                height: 'auto',
                objectFit: 'contain',
                maxWidth: '60px',
                borderRadius: '50%',
                scale: '.7',
              }}
            />

            <Typography
              sx={{
                fontSize: '1.1rem',
                textAlign: 'left',
                display: 'flex',
                transform: 'translate(0px, 18px)',
                fontWeight: '700',
              }}
            >
              Welcome to At The Fire!
            </Typography>
          </Box>
          <Box sx={{ paddingTop: '65px' }}>
            <Typography className="mb-2">Set up steps:</Typography>
            <List
              style={{
                listStyleType: 'disc',
              }}
            >
              <ListItem sx={{ fontWeight: '600', display: 'list-item' }}>Add your name and avatar (required)</ListItem>
              <ListItem sx={{ fontWeight: '600', display: 'list-item' }}>
                Add a brief description of you/ your collection
              </ListItem>
            </List>
            <Typography>
              {` Now you can follow your favorite artists and message other users. Your feed is ${
                isMobile || isTablet ? 'in the hamburger menu' : 'available'
              } up top. `}
            </Typography>
            <Typography sx={{ marginTop: '1rem' }}>
              Thank you for using At The Fire and helping get the bugs worked out! Your time and support is very much
              appreciated! Hope you enjoy the platform.
            </Typography>
            <Typography
              sx={{
                backgroundColor: '#121212',
                marginTop: '25px',
                textAlign: 'left',
                padding: '5px 20px',
                borderRadius: '15px',
                color: 'yellow',
                fontSize: '.7rem',
              }}
            >
              Once your avatar/ first/ last name are uploaded this message will no longer appear.
            </Typography>
          </Box>
        </Box>,
        {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          onClick: () => newSubscriberProfileNav(),
          toastId: 'brand-new-subscriber',
          className: 'new-subscriber',
          autoClose: false,
        }
      );
    }
  }, []);

  const renderProfileHeader = () => {
    if (finalBizProfile) {
      return finalBizProfile.displayName;
    }

    if (finalProfile?.firstName) {
      return `${finalProfile.firstName}'s Profile Page`;
    }
    return "New Member's Profile Page";
  };

  const newSubscriberProfileNav = () => {
    toast.dismiss('brand-new-subscriber');
  };

  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  const [listType, setListType] = useState(null); // 'followers' or 'following'

  const showFollowers = () => {
    setListType('followers');
    setOpen(true);
  };

  const showFollowing = () => {
    setListType('following');
    setOpen(true);
  };

  /*
  

      RETURN STARTS HERE========================================================================
      RETURN STARTS HERE========================================================================
      RETURN STARTS HERE========================================================================

  
  */

  return isUpdating || profileLoading || error ? (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        margin: isMobile ? '0px' : '300px',
        marginTop: isMobile ? '100px' : '300px',
        width: '400px',
      }}
    >
      <Typography variant="h5" sx={{ color: (theme) => theme.palette.primary.light }}>
        Loading profile <span className="animated-ellipsis">.</span>
        <span className="animated-ellipsis">.</span>
        <span className="animated-ellipsis ">.</span>{' '}
      </Typography>
      <FlamePipe />
    </Box>
  ) : (
    <>
      <Box style={{ maxWidth: '1200px', padding: '90px 0 30px 0', margin: 'auto' }}>
        {profile && (
          <Typography
            variant="h4"
            sx={{
              borderBottom: '1px solid',
              borderColor: 'green',
              borderWidth: '8px',
            }}
          >
            {renderProfileHeader()}
          </Typography>
        )}
        <Box
          sx={{
            display: 'flex',
            width: isMobile ? '100%' : '45%',
            justifyContent: 'space-around',
            justifySelf: 'center',
            paddingTop: '5px',
          }}
        >
          {' '}
          <Box
            sx={{
              display: 'grid',
              gridTemplatRows: '1fr 1fr',
              gap: '.1rem',
              marginBottom: '8px',
              cursor: 'pointer',
              backgroundColor: 'green',
              padding: '2px 8px 6px 8px',
              borderRadius: '5px',
            }}
            onClick={showFollowers}
          >
            <Typography variant="body1" sx={{ fontWeight: '900', height: '1rem' }}>
              {followerCounts.followerCount}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: '500', height: '1rem', letterSpacing: '1px' }}>
              Followers
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplatRows: '1fr 1fr',
              gap: '.1rem',
              marginBottom: '8px',
              cursor: 'pointer',
              backgroundColor: 'green',
              padding: '2px 8px 6px 8px',
              borderRadius: '5px',
            }}
            onClick={showFollowing}
          >
            <Typography variant="body1" sx={{ fontWeight: '900', height: '1rem' }}>
              {followerCounts.followingCount}
            </Typography>{' '}
            <Typography variant="body2" sx={{ fontWeight: '500', height: '1rem', letterSpacing: '1px' }}>
              Following
            </Typography>
          </Box>
        </Box>
        <Grid container spacing={3}>
          {/* Left column: Avatar & Logo */}
          <Grid item xs={12} sm={12} md={4} lg={3}>
            <Card
              variant="outlined"
              sx={{
                borderWidth: '1px',
                borderColor: (theme) => theme.palette.primary.light,
                borderRadius: (theme) => theme.spacing(1),
                minWidth: '250px',
              }}
            >
              {isViewingOwnProfile && (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  {' '}
                  <Box
                    sx={{
                      padding: '0px',
                      display: 'flex',
                      justifyContent: isEditing ? 'space-between' : 'flex-end',
                    }}
                  >
                    {' '}
                    {isViewingOwnProfile && isEditing && (
                      <Button variant="contained" color="primary" onClick={handleSaveChanges}>
                        {isUpdating ? 'Updating...' : 'Save Changes'}
                      </Button>
                    )}
                    {isEditing ? (
                      <CancelOutlinedIcon
                        sx={{ cursor: 'pointer', fontSize: 'large', margin: '8px 8px 0 0' }}
                        onClick={() => setIsEditing(!isEditing)}
                      />
                    ) : (
                      <Box onClick={() => setIsEditing(!isEditing)} sx={{ cursor: 'pointer' }}>
                        Edit <EditOutlinedIcon sx={{ cursor: 'pointer', fontSize: 'large', margin: '8px 8px 0 0' }} />
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
              <CardContent
                sx={{
                  display: 'flex',
                  padding: '10px',
                  flexDirection: isMobile || !isTablet ? 'column' : 'row',
                }}
              >
                {/* Display Name */}

                {finalBizProfile && (
                  <>
                    <div style={{ margin: '0 0' }}>
                      {isEditing && (
                        <TextField
                          fullWidth
                          variant="outlined"
                          label="Display Name"
                          value={editedProfile?.displayName || ''}
                          onChange={(e) => handleEdit('displayName', e.target.value)}
                        />
                      )}
                    </div>
                  </>
                )}
                {/* Business Logo & User Avatar */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: isMobile || !isTablet || isEditing ? '1fr' : '1fr 1fr 1fr',
                    gridTemplateRows: '1fr',
                    gap: '10px',
                    justifyItems: 'center',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: isMobile || !isTablet ? 'wrap' : '',
                      gap: '10px',
                      width: '100%',
                      flexDirection: isMobile || !isTablet ? 'column' : 'row',
                      justifyContent: 'space-between',
                      position: 'relative',
                    }}
                  >
                    {/* Business Logo */}
                    {finalBizProfile && isEditing ? (
                      <>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            padding: '10px',
                            margin: '0px auto 0 auto',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderColor: (theme) => theme.palette.primary.light,
                            width: '180px',
                          }}
                        >
                          <Box
                            component="img"
                            src={logoPreview || userDefaultImage}
                            style={{
                              width: '100px',
                              height: '100px',
                              objectFit: 'cover',
                            }}
                          />
                          {/* {' '} */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Custom Button */}
                            <Button
                              variant="contained"
                              component="label"
                              sx={{
                                padding: '10px 20px',
                                backgroundColor: 'green',
                                color: 'white',
                              }}
                            >
                              Select Logo
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png"
                                onChange={handleLogoUpload}
                                hidden
                              />
                            </Button>
                          </Box>
                        </Box>
                      </>
                    ) : (
                      finalBizProfile && (
                        <Box
                          component="img"
                          src={finalBizProfile?.logoImageUrl || userDefaultImage}
                          sx={{
                            width: '200px',
                            height: '200px',
                            margin: 'auto',
                            boxShadow: '2px 2px 15px 2px #FFFFFF2a',
                          }}
                        />
                      )
                    )}
                    {/* User Avatar */}
                    {isEditing ? (
                      <>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            padding: '10px',
                            margin: '0px auto 0 auto',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderColor: (theme) => theme.palette.primary.light,
                            width: '180px',
                          }}
                        >
                          <Box
                            component="img"
                            src={
                              avatarFile ? URL.createObjectURL(avatarFile) : finalProfile?.imageUrl || userDefaultImage
                            }
                            style={{
                              width: '100px',
                              height: '100px',
                              objectFit: 'cover',
                            }}
                          />{' '}
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Custom Button */}
                            <Button
                              variant="contained"
                              component="label"
                              sx={{
                                padding: '10px 20px',
                                backgroundColor: 'green',
                                color: 'white',
                              }}
                            >
                              Select Avatar
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png"
                                name="avatar"
                                onChange={handleAvatarUpload}
                                hidden
                              />
                            </Button>

                            {/* File name display */}
                          </Box>
                        </Box>
                      </>
                    ) : (
                      <Avatar
                        src={finalProfile?.imageUrl || userDefaultImage}
                        sx={getAvatarStyle(isMobile, isTablet, bizProfile)}
                      />
                    )}
                  </Box>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1rem',
                      alignItems: 'center',
                    }}
                  >
                    {' '}
                    {/* DISPLAY First Name & Last Name */}
                    <div style={{ display: 'flex', marginTop: '0px', flexWrap: 'wrap' }}>
                      {isEditing ? (
                        <>
                          <TextField
                            inputProps={{ maxLength: 25 }}
                            variant="outlined"
                            label="First Name"
                            value={editedProfile?.firstName || ''}
                            onChange={(e) => handleEdit('firstName', e.target.value)}
                            style={{ marginRight: '5px' }}
                          />

                          <TextField
                            inputProps={{ maxLength: 25 }}
                            variant="outlined"
                            label="Last Name"
                            value={editedProfile?.lastName || ''}
                            onChange={(e) => handleEdit('lastName', e.target.value)}
                          />
                        </>
                      ) : (
                        <>
                          {/* EDIT First Name & Last Name */}
                          <Typography variant="body1" display="inline" sx={{ marginRight: '5px' }}>
                            {finalProfile?.firstName}
                          </Typography>
                          <Typography variant="body1" display="inline">
                            {finalProfile?.lastName}
                          </Typography>{' '}
                        </>
                      )}
                    </div>
                    {user && <FollowButton userId={sub} initialIsFollowing={false} profileLoading={profileLoading} />}
                  </Box>
                  {/* DISPLAY Website & Social Media Links */}
                  {finalBizProfile && !isEditing && (
                    <Typography
                      variant="body1"
                      sx={{
                        textAlign: 'left',
                        marginTop: '0px;',
                        gridRowStart: isMobile || !isTablet ? '' : 1,
                        gridColumnStart: isMobile || !isTablet ? '' : 3,
                      }}
                    >
                      Website:{'  '}
                      <Link
                        href={`https://${finalBizProfile?.websiteUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bizProfileLink"
                      >
                        {finalBizProfile?.websiteUrl}
                      </Link>
                    </Typography>
                  )}{' '}
                  {user && user !== profile.sub && (
                    <Button
                      variant="contained"
                      sx={{ height: '100%' }}
                      onClick={() => handleMessageClick([profile.sub])}
                    >
                      Send Message
                    </Button>
                  )}
                  {/* EDITING Website & Social Media Links */}
                  {finalBizProfile && isEditing ? (
                    <>
                      <TextField
                        inputProps={{ maxLength: 50 }}
                        fullWidth
                        variant="outlined"
                        label="http://"
                        value={editedProfile.websiteUrl || ''}
                        onChange={(e) => handleEdit('websiteUrl', e.target.value)}
                      />
                      <Typography variant="caption" textAlign={'left'}>
                        Socials:
                      </Typography>
                      <TextField
                        inputProps={{ maxLength: 50 }}
                        fullWidth
                        variant="outlined"
                        label="instagram.com/"
                        value={editedProfile.socialMediaLinks?.instagram || ''}
                        onChange={(e) => handleSocialMediaLinkChange('instagram', e.target.value)}
                      />
                      <TextField
                        fullWidth
                        inputProps={{ maxLength: 50 }}
                        variant="outlined"
                        label="facebook.com/"
                        value={editedProfile.socialMediaLinks?.facebook || ''}
                        onChange={(e) => handleSocialMediaLinkChange('facebook', e.target.value)}
                      />
                      <TextField
                        fullWidth
                        inputProps={{ maxLength: 50 }}
                        variant="outlined"
                        label="glasspass.com/users/"
                        value={editedProfile.socialMediaLinks?.glasspass || ''}
                        onChange={(e) => handleSocialMediaLinkChange('glasspass', e.target.value)}
                      />
                      <TextField
                        fullWidth
                        inputProps={{ maxLength: 50 }}
                        variant="outlined"
                        label="tiktok.com/"
                        value={editedProfile.socialMediaLinks?.tiktok || ''}
                        onChange={(e) => handleSocialMediaLinkChange('tiktok', e.target.value)}
                      />
                    </>
                  ) : (
                    <Box
                      marginTop={0}
                      sx={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-around',
                        gridRowStart: isMobile || !isTablet ? '' : '1',
                        gridColumnStart: isMobile || !isTablet ? '' : '3',
                        marginTop: isMobile || !isTablet ? '' : '3rem',
                      }}
                    >
                      {bizProfile && finalSocialMediaLinks?.instagram && (
                        <Link href={`https://www.instagram.com/${finalSocialMediaLinks.instagram}`} target="_blank">
                          <Avatar
                            src={instagram}
                            sx={{
                              width: '62px',
                              marginTop: '7px',
                              height: 'auto',

                              borderRadius: '15px',
                              boxShadow: '2px 2px 15px 2px #FFFFFF2a;',
                            }}
                          />
                        </Link>
                      )}
                      {bizProfile && finalSocialMediaLinks?.facebook && (
                        <Link href={`https://www.facebook.com/${finalSocialMediaLinks.facebook}`} target="_blank">
                          <Avatar
                            src={facebook}
                            sx={{
                              width: '62px',
                              marginTop: '7px',
                              height: 'auto',
                              borderRadius: '15px',
                              boxShadow: '2px 2px 15px 2px #FFFFFF2a;',
                            }}
                          />
                        </Link>
                      )}
                      {bizProfile && finalSocialMediaLinks?.glasspass && (
                        <Link
                          href={`https://www.glasspass.com/users/${finalSocialMediaLinks.glasspass}`}
                          target="_blank"
                        >
                          <Avatar
                            src={glasspass}
                            sx={{
                              width: '62px',
                              marginTop: '7px',
                              height: 'auto',
                              borderRadius: '15px',
                              boxShadow: '2px 2px 15px 2px #FFFFFF2a;',
                            }}
                          />
                        </Link>
                      )}
                      {bizProfile && finalSocialMediaLinks?.tiktok && (
                        <Link href={`https://www.tiktok.com/${finalSocialMediaLinks.tiktok}`} target="_blank">
                          <Avatar
                            src={tiktok}
                            sx={{
                              width: '62px',
                              marginTop: '7px',
                              height: 'auto',
                              borderRadius: '15px',
                              boxShadow: '2px 2px 15px 2px #FFFFFF2a;',
                            }}
                          />
                        </Link>
                      )}
                    </Box>
                  )}{' '}
                  {/* {user && user !== profile.sub && (
                    <Button
                      variant="contained"
                      sx={{ height: '100%' }}
                      onClick={() => handleMessageClick(profile.sub)}
                    >
                      Send Message
                    </Button>
                  )} */}
                  {/* //TODO This should be optional- add checkbox in edit mode to turn this on or not */}
                  {/* Contact Email */}
                  {/* {finalBizProfile && isEditing ? (
                  // Optional Email editing fields here
                  <></>
                ) : finalBizProfile?.email && finalBizProfile?.displayName ? (
                  <Typography
                    variant="body1"
                    sx={{
                      gridRowStart: isMobile || !isTablet ? '' : 2,
                      gridColumnStart: isMobile || !isTablet ? '' : 3,
                    }}
                  >
                    <Link href={`mailto:${finalBizProfile.email}`}>
                      {`Email ${finalBizProfile.displayName}`}
                    </Link>
                  </Typography>
                ) : finalBizProfile?.email && !finalBizProfile?.displayName ? (
                  <Typography
                    variant="body1"
                    sx={{
                      display: 'grid',
                      gridRowStart: isMobile || !isTablet ? '' : 1,
                      gridColumnStart: isMobile || !isTablet ? '' : 3,
                    }}
                  >
                    <Link href={`mailto:${finalBizProfile.email}`}>{`Email this artist`}</Link>
                  </Typography>
                ) : null} */}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Right column: Rest of the details */}
          <Grid item xs={12} sm={12} md={8} lg={9}>
            <Card
              variant="outlined"
              sx={{
                borderWidth: '1px',
                borderColor: (theme) => theme.palette.primary.light,
                borderRadius: (theme) => theme.spacing(1),
              }}
            >
              <CardContent
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  textAlign: 'left',
                  gap: (theme) => theme.spacing(1),
                }}
              >
                {/* Bio */}
                {isEditing ? (
                  <TextField
                    fullWidth
                    variant="outlined"
                    label="Bio"
                    multiline
                    rows={4}
                    value={editedProfile.bio || ''}
                    onChange={(e) => handleBioChange(e.target.value)}
                    helperText={`${editedProfile.bio?.length || 0}/255`}
                  />
                ) : (
                  <Typography variant="body1" paragraph>
                    {finalProfile?.bio || 'New user here!  Still getting everything set up- come back soon.'}
                  </Typography>
                )}
              </CardContent>
            </Card>
            <Tabs />
          </Grid>
        </Grid>
      </Box>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {listType === 'followers' ? 'Followers' : 'Following'}
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {listType === 'followers' ? (
            <FollowersList userId={sub} setOpen={setOpen} />
          ) : (
            <FollowingList userId={sub} setOpen={setOpen} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

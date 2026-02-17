import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, Box, Button, Typography, Modal, IconButton, useMediaQuery } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import { useGalleryPost } from '../../hooks/useGalleryPost.js';
import FlamePipe from '../FlamePipe/FlamePipe.js';
import { useSwipeable } from 'react-swipeable';
import userDefaultImage from './../../assets/user.png';
import FollowButton from '../FollowingOperations/FollowButton/FollowButton.js';
import { useAuthStore } from '../../stores/useAuthStore.js';
import LikeButton from '../Likes/LikeButton.js';
import { useTheme } from '@emotion/react';

export default function GalleryPostDetail() {
  const { id } = useParams();
  const { postDetail, imageUrls, loading, error } = useGalleryPost(id);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const navigate = useNavigate();

  const theme = useTheme();
  const M = useMediaQuery(theme.breakpoints.down('sm'));

  const handleLogoNavigation = () => navigate(`/profile/${postDetail.sub}`);

  const { authenticateUser, isAuthenticated, signingOut, checkTokenExpiry, user } = useAuthStore();

  // authenticate and check tokens
  useEffect(() => {
    if (!isAuthenticated && !error && !signingOut) {
      authenticateUser();
    } else if (isAuthenticated) {
      // If we are authenticated, check token expiry
      checkTokenExpiry();
    }
  }, [isAuthenticated, error, authenticateUser, signingOut, checkTokenExpiry]);

  // functions

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : prevIndex));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex < imageUrls.length - 1 ? prevIndex + 1 : prevIndex));
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleNext,
    onSwipedRight: handlePrevious,
  });

  // if (error) return;
  const handleMessageClick = (sub) => {
    navigate(`/messages/${sub}`);
  };

  return loading ? (
    <div className="loading-detail-2">
      <FlamePipe />
    </div>
  ) : (
    <Box
      sx={{
        paddingTop: '70px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Main Content Area */}

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: (theme) => theme.palette.primary.light,
          paddingX: (theme) => theme.spacing(2),
          paddingY: (theme) => theme.spacing(2),
          borderRadius: (theme) => theme.spacing(1),
          width: 'min(100%, 800px)',
        }}
      >
        {' '}
        <Button onClick={handleLogoNavigation} sx={{ marginRight: 2 }}>
          <Avatar
            src={postDetail.logo_image_url ? postDetail.logo_image_url : userDefaultImage}
            alt="site logo"
            variant="rounded"
          />
          <Typography variant={M ? 'h6' : 'h4'} sx={{ marginLeft: '1rem' }}>
            {postDetail.display_name}{' '}
          </Typography>
        </Button>{' '}
        <Box
          sx={
            {
              // display: 'flex',
              // flexDirection: imageUrls.length > 1 ? 'row' : 'column',
            }
          }
        >
          {/* Carousel Section */}
          {M ? (
            // [MOBILE LAYOUT START]
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Main Carousel Image with Swipe Handlers */}
              <Box sx={{ width: '100%', position: 'relative' }} {...swipeHandlers}>
                <img
                  src={imageUrls[currentIndex]}
                  alt={`post-${currentIndex}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: 4,
                    cursor: 'pointer',
                    objectFit: 'cover',
                  }}
                  onClick={() => setModalIsOpen(true)}
                />

                {/* Mobile Navigation Arrows */}
                {imageUrls.length > 1 && (
                  <>
                    {currentIndex > 0 && (
                      <IconButton
                        onClick={handlePrevious}
                        sx={{
                          position: 'absolute',
                          left: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
                        }}
                      >
                        <NavigateBeforeIcon />
                      </IconButton>
                    )}
                    {currentIndex < imageUrls.length - 1 && (
                      <IconButton
                        onClick={handleNext}
                        sx={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
                        }}
                      >
                        <NavigateNextIcon />
                      </IconButton>
                    )}
                  </>
                )}
              </Box>

              {/* Mobile Dot Indicators */}
              {imageUrls.length > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  {imageUrls.map((_, index) => (
                    <Box
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor:
                          index === currentIndex ? theme.palette.primary.main : 'grey',
                        mx: 0.5,
                        cursor: 'pointer',
                        marginBottom: '1rem',
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          ) : (
            // [MOBILE LAYOUT END]
            // [DESKTOP LAYOUT START]
            <Box sx={{ display: 'flex', flexDirection: 'row' }}>
              {/* Fixed Thumbnail Column to Maintain Layout Balance */}
              <Box
                sx={{
                  width: '120px', // <-- Fixed width for thumbnails
                  mr: 2,
                  display: imageUrls.length === 1 ? 'none' : 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  overflowY: imageUrls.length > 5 ? 'auto' : 'hidden',
                  height: '630px',
                }}
              >
                {imageUrls.map((imageUrl, index) => (
                  <Box
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    sx={{
                      border:
                        index === currentIndex
                          ? `2px solid ${theme.palette.primary.main}`
                          : '2px solid transparent',
                      '&:hover': { cursor: 'pointer' },
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt={`thumbnail-gallery-${index}`}
                      style={{ width: '100%', display: 'block' }}
                    />
                  </Box>
                ))}
              </Box>

              {/* Main Image Area */}
              <Box sx={{ flex: 1, position: 'relative' }} onClick={() => setModalIsOpen(true)}>
                <img
                  src={imageUrls[currentIndex]}
                  alt={`post-${currentIndex}`}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </Box>
            </Box>
          )}

          {!M && (
            <Modal open={modalIsOpen} onClose={() => setModalIsOpen(false)}>
              <Box
                {...swipeHandlers} // Attach swipe handlers here
                sx={{
                  position: 'relative',
                  maxWidth: '90%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  margin: '20px auto',
                  padding: 2,
                  '& img': {
                    maxWidth: '90vh',
                    maxHeight: '90vh',
                    display: 'block',
                    margin: '0 auto',
                  },
                }}
              >
                <img
                  src={imageUrls[currentIndex]}
                  alt={`modal-post-${currentIndex}`}
                  style={{ width: '100%' }}
                />
                <IconButton
                  onClick={() => setModalIsOpen(false)}
                  sx={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'red' }}
                >
                  <CloseIcon />
                </IconButton>
                {currentIndex > 0 && (
                  <IconButton
                    onClick={() => setCurrentIndex((prev) => prev - 1)}
                    sx={{ position: 'absolute', left: 0, top: '50%' }}
                  >
                    <NavigateBeforeIcon />
                  </IconButton>
                )}
                {currentIndex < imageUrls.length - 1 && (
                  <IconButton
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    sx={{ position: 'absolute', right: 0, top: '50%' }}
                  >
                    <NavigateNextIcon />
                  </IconButton>
                )}
              </Box>
            </Modal>
          )}
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 2,
            width: !M && imageUrls.length > 1 ? '80%' : '100%',
            alignSelf: 'end',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              paddingLeft: '1rem',
              position: 'relative',
              top: '-10px',
              marginTop: M ? 0 : '1rem',
            }}
          >
            <Box
              sx={{
                display: M ? 'grid' : 'flex',
                gap: 1,
                position: 'relative',
                top: M && imageUrls.length > 1 ? '-35px' : !M ? '-18px' : 0,
              }}
            >
              {<LikeButton postId={id} sx={{ display: 'flex', gap: 2 }} />}
            </Box>
            <Box sx={{ display: M ? 'flex' : 'flex', gap: 1, position: 'relative', top: '15px' }}>
              {user && (
                <FollowButton
                  userId={postDetail.sub}
                  initialIsFollowing={false}
                  // profileLoading={profileLoading}
                />
              )}{' '}
              {user && user !== postDetail.sub && (
                <Button
                  variant="contained"
                  sx={{
                    height: M ? '1.5rem' : '100%',
                  }}
                  onClick={() => handleMessageClick(postDetail.sub)}
                >
                  Send Message
                </Button>
              )}{' '}
            </Box>
          </Box>
        </Box>
        <Box
          sx={{
            display: M ? 'grid' : 'flex',
            justifyContent: 'space-between',
            marginBottom: 2,
            textAlign: 'left',
          }}
        >
          <Typography variant="h6" sx={{ marginLeft: '.5rem', textTransform: 'capitalize' }}>
            {postDetail.title}{' '}
          </Typography>
          <Typography sx={{ marginLeft: '1.5rem' }}>Category: {postDetail.category}</Typography>

          <Box sx={{ display: 'flex' }}>
            <Typography
              sx={{
                marginLeft: '1.5rem',
                fontWeight: '700',
                letterSpacing: '.3px',
                display: postDetail.sold ? 'block' : 'none',
              }}
            >
              {postDetail.sold ? 'SOLD' : ''}
            </Typography>
            <Typography
              sx={{
                marginLeft: '1.5rem',
                fontWeight: '700',
                letterSpacing: '.3px',
                color: postDetail.sold ? 'red' : '',
                textDecoration: postDetail.sold ? 'line-through' : '',
              }}
            >
              ${Number(postDetail.price).toLocaleString()}
            </Typography>
          </Box>
        </Box>
        <Typography sx={{ marginLeft: '1.5rem', textAlign: 'left' }}>
          {postDetail.description}
        </Typography>
      </Box>
    </Box>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { Box, Grid, Typography, Paper, Avatar, useMediaQuery } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import userDefaultImage from './../../assets/user.png'; // Fix the path as needed
import { useTheme } from '@emotion/react';
import LikeButton from '../Likes/LikeButton.js';

export default function GalleryCard({ item }) {
  //
  // State and Refs
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const imageRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const { sub } = useParams();

  // Handle image load to update state
  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  // Handle card click navigation
  const handleCardClick = async (postId) => {
    navigate(`/gallery/${postId}`);
  };

  // Observer to handle lazy-loading images
  useEffect(() => {
    const observerCallback = (entries) => {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
        if (observer) observer.disconnect(); // Disconnect observer once it's loaded
      }
    };

    let observer;
    if (imageRef.current) {
      observer = new IntersectionObserver(observerCallback, {
        threshold: 0.1, // Trigger when 10% of the image is visible
      });

      observer.observe(imageRef.current);
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, [imageRef]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Grid
      item
      xs={sub ? 6 : 6}
      sm={sub ? 4 : 4}
      md={sub ? 4 : 3}
      lg={sub ? 4 : 2}
      xl={sub ? 3 : 2}
      key={item.id}
      sx={{ padding: 0 }}
    >
      <Box
        onClick={() => handleCardClick(item.id)}
        sx={{
          cursor: 'pointer',
          width: '100%',
          height: '100%',
          borderRadius: '4px',
          boxShadow: '0 0px 3px 2px rgba(255,255,255, .6)',
          '&:hover': { cursor: 'pointer', boxShadow: '0 0px 5px 3px rgba(255,255,255, .3)' },
          minWidth: '135px',
          overflow: 'hidden',
        }}
      >
        <Paper
          elevation={4}
          className="gallery-item"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            padding: 0,
            margin: 0,
            borderRadius: '4px',
          }}
        >
          {' '}
          {/* User Info Section */}
          {/* Image Placeholder and Loading */}
          <Box
            ref={imageRef}
            sx={{
              position: 'relative',
              width: '100%',
              height: 0,
              paddingBottom: '100%', // Maintain aspect ratio (e.g., 1:1)
              marginTop: '4px',
              borderRadius: '4px',
            }}
          >
            {/* Placeholder Box */}
            {!isLoaded && (
              <Box
                className="loading-placeholder"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                }}
              ></Box>
            )}

            {/* Actual Image */}
            <Typography
              sx={{
                fontSize: '.8rem',
                position: 'absolute',
                zIndex: 300,
                color: (theme) => theme.palette.primary.light,
                fontWeight: 900,
                backgroundColor: '#121212',
                padding: '5px',
                lineHeight: '1rem',
                display: item.sold ? 'block' : 'none',
              }}
            >
              {item.sold ? 'SOLD' : ''}
            </Typography>
            {isVisible && (
              <img
                onLoad={handleImageLoad}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: isLoaded ? 1 : 0,
                  transition: 'opacity 0.5s ease-in-out',
                }}
                src={item.image_url}
                alt={item.title}
              />
            )}
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 8px',
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateRows: '1fr',
                gridTemplateColumns: '40px 4fr 1fr',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <Avatar
                alt={item.category}
                src={item.logo_image_url || userDefaultImage}
                sx={{
                  boxShadow: '0 3px 4px 0 rgba(0, 0, 0, 0.1)',
                  marginRight: isMobile ? '5px' : '0px',
                  width: '30px',
                  height: '30px',
                }}
              />
              <Typography
                sx={{
                  fontSize: isMobile ? '.7rem' : '.8rem',
                  fontWeight: '600',
                  letterSpacing: '.5px',
                  textAlign: 'left',
                  maxHeight: '1rem',
                  textTransform: 'capitalize',
                  position: 'relative',
                  top: '-7px',
                }}
              >
                {item.title.length > 25 ? `${item.title.slice(0, 25)}...` : item.title}
              </Typography>{' '}
              {
                <Box onClick={(e) => e.stopPropagation()}>
                  <LikeButton postId={item.id} />
                </Box>
              }
            </Box>
          </Box>
        </Paper>
      </Box>
    </Grid>
  );
}

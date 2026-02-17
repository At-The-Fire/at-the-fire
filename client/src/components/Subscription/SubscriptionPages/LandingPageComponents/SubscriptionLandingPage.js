import React, { useState } from 'react';
import { Box, Button, Grid, Paper, Typography, useMediaQuery, IconButton, List, ListItem } from '@mui/material';
import '../../Subscription.css';
import LandingPageInfo from './LandingPageInfo.js';
import { useNavigate } from 'react-router-dom';
import PromotionalVideo from './PromotionalVideo.js';
import { useTheme } from '@emotion/react';
import { useSubscriptionStageManager } from '../../../../hooks/useSubscriptionStageManager.js';
import { useAuthStore } from '../../../../stores/useAuthStore.js';
import { styled } from '@mui/material/styles';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';

export default function SubscriptionLandingPage() {
  const { setStage } = useSubscriptionStageManager();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const HEADER_OFFSET = 70;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSignInToSubscribe = () => {
    navigate('/auth/sign-up');
  };

  const handleStageChange = () => {
    setStage(1);
    navigate('/subscription/form');
  };

  const userGuideScreenshots = [
    '1-dashboard.png',
    '2-a-post-tracking.png',
    '2-b-post-tracking.png',
    '3-orders.png',
    '4-products.png',
    '5-calendar-1.png',
    '5-calendar-2.png',
    '6-analysis.png',
  ];

  const mobileUserGuideScreenshots = [
    '1-mobile-dash-1.png',
    '1-mobile-dash-2.png',
    '2-mobile-a-tracking.png',
    '2-mobile-b-tracking.png',
    '2-mobile-c-tracking.png',
    '3-mobile-orders.png',
    '4-mobile-products.png',
    '5-mobile-calendar-1.png',
    '5-mobile-calendar-2.png',
    'mobile-calendar-3.png',
    '6-mobile-analysis-1.png',
    '6-mobile-analysis-2.png',
  ];

  const features = [
    'Create your own gallery and profile page with the ability to create content.',
    'Keep track of post inventory valuations over time. Download CSV file from your dashboard for spreadsheets, etc. Track orders and print invoices.',
    'Set goals for monthly and daily quotas to manage your production.',
    'See how your business is doing at a glance with a color coded calendar. You can always review what you made, when, and for how much $ to stay consistent with your product.',
    'Monthly analysis with user data based graphs.',
    'Peace of mind that your data is encrypted with AES-256 encryption- no one is stealing your data. ',
  ];

  const StyledPaper = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    scrollMarginTop: `${HEADER_OFFSET + 16}px`,
  }));

  const screenshots = isMobile ? mobileUserGuideScreenshots : userGuideScreenshots;
  const handlePrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : prevIndex));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex < screenshots.length - 1 ? prevIndex + 1 : prevIndex));
  };
  return (
    <Box sx={{ flexGrow: 1, p: isMobile ? 0 : 2, position: 'absolute', top: '70px' }}>
      <Typography variant="h4" textAlign={'left'} sx={{ borderBottom: '2px solid green' }}>
        Become a subscriber!
      </Typography>
      <Grid item xs={12} md={6}>
        <Box textAlign="center">
          {isAuthenticated ? (
            <Box>
              <Button
                color="primary"
                variant="contained"
                onClick={handleStageChange}
                sx={{ fontSize: '1.5rem', mt: '25px' }}
              >
                Purchase a Subscription
              </Button>
              <Typography
                variant="h6"
                sx={{
                  color: 'success.main',
                  fontWeight: 'bold',
                  mt: 1,
                  textAlign: 'center',
                }}
              >
                Start with a 60-day free trial!
              </Typography>
            </Box>
          ) : (
            <Box>
              <Button
                color="primary"
                variant="contained"
                onClick={handleSignInToSubscribe}
                sx={{ fontSize: '1.5rem', mt: '25px' }}
              >
                Sign-up to Subscribe
              </Button>
              <Typography
                variant="h6"
                sx={{
                  color: 'success.main',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  mt: '.3rem',
                }}
              >
                Start with a 60-day free trial!
              </Typography>
            </Box>
          )}
        </Box>
      </Grid>
      <Grid container spacing={4} alignItems="start" sx={{ padding: '20px' }}>
        {/* Text and Video Section */}
        <Grid
          item
          xs={12}
          md={8}
          sx={{
            margin: 'auto',
            '&.MuiGrid-item': { paddingLeft: '15px' },
          }}
        >
          {' '}
          <Typography variant="h3" gutterBottom>
            At The Fire
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <Box
              component="img"
              src="https://d5fmwpj8iaraa.cloudfront.net/atf-assets/logo-icon-6-192.png"
              alt="At The Fire Logo"
              sx={{ width: 80, height: 80, mr: 2 }}
            />
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignContent: 'center',
              }}
            >
              <Typography variant="h6" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                A Gallery, Business & Inventory Management Platform for Artists and Collectors
              </Typography>
            </Box>
          </Box>
          {/* Bulleted List of Features */}
          <Box
            sx={{
              borderBottom: '1px solid ',
              padding: '0px',
              overflow: 'hidden',
              marginBottom: '2rem',
            }}
          >
            {' '}
            <Typography variant="h5" textAlign="left" sx={{ letterSpacing: '.1rem', marginBottom: '10px' }}>
              Our platform offers:
            </Typography>
            <Box
              sx={{
                height: isMobile ? '50vh' : 'content',
                overflowY: isMobile ? 'scroll' : '',
                backgroundColor: (theme) => theme.palette.primary.dark,
              }}
            >
              <List sx={{ listStyleType: 'disc', margin: '0 0 0 20px', padding: '10px' }}>
                {features.map((feature, index) => (
                  <ListItem key={index} sx={{ display: 'list-item' }}>
                    <Typography variant="body1" sx={{ letterSpacing: '.1rem' }}>
                      {feature}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>
          <Paper sx={{ padding: '15px 20px', margin: '2rem 0' }}>
            <Typography variant="body1" paragraph sx={{ textAlign: 'left' }}>
              <em>At The Fire</em> is a subscription-based social media, business software, and gallery site designed
              for artists to showcase their collections and offer their work for sale. Collectors are welcome to
              subscribe as well. The platform features a tiered subscription model- basic accounts are free, while a
              paid subscription unlocks business accounting and sales analysis tools. Artists can create posts, manage
              inventory, track sales, and analyze production while having a clear picture of what is helping them to
              achieve their goals. If you&apos;d like to take a deeper dive into how things work, check out our{' '}
              <span
                onClick={() => {
                  navigate('/user-guide');
                }}
                style={{ color: 'lightgreen', cursor: 'pointer' }}
              >
                User Guide
              </span>{' '}
              after taking a look at the sample images and video below!
            </Typography>
          </Paper>
          <StyledPaper
            elevation={2}
            id="quick-start"
            sx={{ '&.MuiPaper-root': { padding: isMobile ? '1rem 0 0 0 ' : '' } }}
          >
            <Typography variant="h6" margin="0 1rem 1.5rem 1rem">
              Let&apos;s take a look inside the <span style={{ fontWeight: 700 }}>Workspace!</span>
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: '1px solid green',
              }}
            >
              {/* Main Carousel Image */}
              <Box
                sx={{
                  width: '100%',
                  height: 0,
                  paddingBottom: isMobile ? '100%' : '70%',
                  position: 'relative',
                }}
              >
                <img
                  src={`https://d5fmwpj8iaraa.cloudfront.net/atf-assets/${screenshots[currentIndex]}`}
                  alt={`post-${currentIndex}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: 4,
                    cursor: 'pointer',
                    objectFit: 'cover',
                  }}
                />

                {/* Mobile Navigation Arrows */}
                {screenshots.length > 1 && (
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
                    {currentIndex < screenshots.length - 1 && (
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
              {screenshots.length > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  {screenshots.map((_, index) => (
                    <Box
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: index === currentIndex ? theme.palette.primary.main : 'grey',
                        mx: 0.5,
                        cursor: 'pointer',
                        marginBottom: '1rem',
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </StyledPaper>
          <Paper
            sx={{
              padding: '15px 20px',
              margin: '2rem 0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
            }}
          >
            {' '}
            <Typography variant="h5" gutterBottom>
              The purpose is to set a goal for daily/ monthly production and stick to it.
            </Typography>
            <Typography variant="body1" gutterBottom sx={{ textAlign: 'left' }}>
              Use At The Fire to manage your quota with graphs, a calendar, and analysis. Take the pulse of your
              business at a glance with color coded display in the calendar &, monthly summaries. Publish your work for
              sale or display, link to other platforms e.g. GlassPass, Instagram, etc. Create invoices for orders and
              keep track of what is completed or still in progress. At The FIre is here to help you run your business
              more effectively so you can reach those goals.
            </Typography>
          </Paper>
          <Box>
            <PromotionalVideo />
          </Box>
          <Typography sx={{ textAlign: 'center', mt: 3 }}>
            Click the button below to purchase a monthly or yearly subscription.
          </Typography>
          {/* Action Button */}
          <Box textAlign="center">
            {isAuthenticated ? (
              <Box>
                <Button
                  color="primary"
                  variant="contained"
                  onClick={handleStageChange}
                  sx={{ fontSize: '1.5rem', mt: '25px' }}
                >
                  Purchase a Subscription
                </Button>
                <Typography
                  variant="h6"
                  sx={{
                    color: 'success.main',
                    fontWeight: 'bold',
                    mt: 1,
                    textAlign: 'center',
                  }}
                >
                  Start with a 60-day free trial!
                </Typography>
              </Box>
            ) : (
              <Box>
                <Button
                  color="primary"
                  variant="contained"
                  onClick={handleSignInToSubscribe}
                  sx={{ fontSize: '1.5rem', mt: '25px' }}
                >
                  Sign-up to Subscribe
                </Button>
                <Typography
                  variant="h6"
                  sx={{
                    color: 'success.main',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    mt: '.3rem',
                  }}
                >
                  Start with a 60-day free trial!
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>
        <Grid
          item
          xs={12}
          // md={12}
          sx={{
            // margin: 'auto',
            overflow: 'hidden',
            '&.MuiGrid-item': { paddingLeft: '15px' },
          }}
        >
          <LandingPageInfo
            isMobile={isMobile}
            handleStageChange={handleStageChange}
            handleSignInToSubscribe={handleSignInToSubscribe}
            navigate={navigate}
          />
        </Grid>
      </Grid>
    </Box>
  );
}

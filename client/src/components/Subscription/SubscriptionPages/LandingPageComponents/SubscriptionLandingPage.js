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
    'Start free with a public profile, gallery posting, and inventory snapshots.',
    'Show work, build your audience, and keep your catalog organized from day one.',
    'Run seller activity across gallery listings and auctions while buyers track bids and purchases in one account.',
    'Use the cart and checkout flow as it rolls toward full payment processor launch.',
    'Upgrade to Premium for the locked workspace tabs: Orders, Products, Calendar, and Analysis.',
    'Track production goals, sales history, inventory movement, and performance trends in one place.',
    'Keep account and business data protected with encrypted storage and secure subscription billing through Stripe.',
  ];

  const renderPrimaryCta = () =>
    isAuthenticated ? (
      <Box>
        <Button color="primary" variant="contained" onClick={handleStageChange} sx={{ fontSize: '1.5rem', mt: '25px' }}>
          Upgrade to Premium
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
          Premium starts with a 60-day free trial.
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
          Create Account to Upgrade
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
          Premium starts with a 60-day free trial.
        </Typography>
      </Box>
    );

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
        Free to join. Premium to run the business side.
      </Typography>
      <Grid item xs={12} md={6}>
        <Box textAlign="center">{renderPrimaryCta()}</Box>
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
                A gallery and seller workspace for artists, collectors, auctions, and direct sales.
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
              What the offer looks like now:
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
              <em>At The Fire</em> now has a much clearer split between free access and Premium workspace tools. Free
              accounts can create a profile, publish gallery content, build inventory snapshots, and participate in the
              marketplace side of the platform. Premium is for sellers who want the deeper operating system: orders,
              products, calendar visibility, and analysis. If you&apos;d like to take a deeper dive into how things
              work, check out our{' '}
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
              Premium is about clarity after the work is posted.
            </Typography>
            <Typography variant="body1" gutterBottom sx={{ textAlign: 'left' }}>
              Post for free, then upgrade when you need operational depth. Premium brings together order management,
              product tracking, production planning, and analysis so you can see what sold, what is in progress, and
              where your momentum is coming from. Sellers can use that layer to stay organized while the public-facing
              gallery, auctions, and buyer experience continue to expand.
            </Typography>
          </Paper>
          <Box>
            <PromotionalVideo />
          </Box>
          <Typography sx={{ textAlign: 'center', mt: 3 }}>
            Upgrade when you want the Premium workspace tools behind your gallery.
          </Typography>
          {/* Action Button */}
          <Box textAlign="center">{renderPrimaryCta()}</Box>
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

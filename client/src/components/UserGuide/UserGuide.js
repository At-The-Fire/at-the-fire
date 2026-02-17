import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Link,
  useMediaQuery,
  IconButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTheme } from '@emotion/react';
import { useAuthStore } from '../../stores/useAuthStore.js';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
const HEADER_OFFSET = 70;

// Styled components
const GuideContainer = styled(Box)(({ theme }) => ({
  maxWidth: '64rem',
  margin: '0 auto',
  marginTop: HEADER_OFFSET,
  padding: theme.spacing(3),
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  scrollMarginTop: `${HEADER_OFFSET + 16}px`,
}));

const TableOfContents = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  '& a': {
    textDecoration: 'none',
    display: 'block',
    marginBottom: theme.spacing(1),
    color: theme.palette.primary.main,
    '&:hover': {
      textDecoration: 'underline',
    },
  },
}));

const GuideItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  marginBottom: theme.spacing(1.5),
  '&:last-child': {
    marginBottom: 0,
  },
}));

const ItemTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(0.5),
}));

const ItemDescription = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
}));

const StyledAccordion = styled(Accordion)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  '&:before': {
    display: 'none',
  },
}));

const AccordionContent = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

const FeatureList = styled(Box)(({ theme }) => ({
  '& > *': {
    marginBottom: theme.spacing(1.5),
  },
}));

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

export default function UserGuide() {
  const { authenticateUser, isAuthenticated, error, signingOut, checkTokenExpiry } = useAuthStore();

  // authenticate and check tokens
  useEffect(() => {
    if (!isAuthenticated && !error && !signingOut) {
      authenticateUser();
    } else if (isAuthenticated) {
      // If we are authenticated, check token expiry
      checkTokenExpiry();
    }
  }, [isAuthenticated, error, authenticateUser, signingOut, checkTokenExpiry]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const screenshots = isMobile ? mobileUserGuideScreenshots : userGuideScreenshots;

  // Prevent default scroll behavior and implement smooth scroll with offset
  const handleNavClick = (event, targetId) => {
    event.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      const yOffset = -HEADER_OFFSET - 16; // Match the scrollMarginTop
      const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : prevIndex));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex < screenshots.length - 1 ? prevIndex + 1 : prevIndex));
  };

  useEffect(() => {
    // If the URL has a hash, remove it to prevent browser jump
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    // Scroll to the top of the page
    window.scrollTo(0, 0);
  }, []);

  return (
    <GuideContainer sx={{ '&.MuiBox-root': { padding: isMobile ? '1rem 0' : '' } }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <Typography
          variant={isMobile ? 'h5' : 'h2'}
          noWrap
          sx={{
            mr: 2,
            // display: { xs: 'none', md: 'flex' },
            // fontFamily: 'Reenie Beanie',
            fontWeight: 700,
            textShadow: '3px 3px 1px #000000',
            letterSpacing: '.3rem',
            color: (theme) => theme.palette.primary.light,
            textDecoration: 'none',
          }}
        >
          Subscriber User Guide
        </Typography>
      </Box>
      {/* Introduction */}
      <StyledPaper elevation={2} id="introduction">
        {/*  IMAGE GALLERY */}
        <Typography variant="h5" gutterBottom fontWeight="bold">
          Welcome to the User Guide!
        </Typography>
        <Typography variant="body2" paragraph sx={{ textAlign: 'left' }}>
          This guide will help you navigate through all the subscription features and capabilities of our platform.
          Whether you&apos;re just getting started or looking to make the most of advanced features, you&apos;ll find
          everything you need to know here.
        </Typography>
      </StyledPaper>
      {/* Table of Contents First */}
      <StyledPaper elevation={2} sx={{ '&.MuiPaper-root': { padding: '1rem 0' } }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Contents
        </Typography>
        <TableOfContents sx={{ textAlign: 'left', marginLeft: '8%' }}>
          <Link href="#quick-start" onClick={(e) => handleNavClick(e, 'quick-start')}>
            Where do I start?
          </Link>
          <Link href="#introduction" onClick={(e) => handleNavClick(e, 'quick-start')}>
            Introduction
          </Link>
          <Link href="#tools" onClick={(e) => handleNavClick(e, 'tools')}>
            Your Tools at a Glance
          </Link>
          <Link href="#detailed-features" onClick={(e) => handleNavClick(e, 'detailed-features')}>
            Detailed Features Guide
          </Link>
          <Box sx={{ pl: 2 }}>
            <Link href="#dashboard" onClick={(e) => handleNavClick(e, 'dashboard')}>
              • Dashboard Tab
            </Link>
            <Link href="#post-tracking" onClick={(e) => handleNavClick(e, 'post-tracking')}>
              • Posts Tracking Tab
            </Link>
            <Link href="#orders" onClick={(e) => handleNavClick(e, 'orders')}>
              • Orders Tab
            </Link>
            <Link href="#products" onClick={(e) => handleNavClick(e, 'products')}>
              • Products Tab
            </Link>
            <Link href="#calendar" onClick={(e) => handleNavClick(e, 'calendar')}>
              • Calendar Tab
            </Link>
            <Link href="#analysis" onClick={(e) => handleNavClick(e, 'analysis')}>
              • Analysis Tab
            </Link>
          </Box>
        </TableOfContents>
      </StyledPaper>

      {/* Workspace tabs image gallery */}
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
          <Box sx={{ width: '100%', position: 'relative' }}>
            <img
              src={`https://atf-main-storage.s3.us-west-2.amazonaws.com/atf-assets/${screenshots[currentIndex]}`}
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

      {/* Quick Start Section */}
      <StyledPaper elevation={2} id="introduction" sx={{ padding: '0 1.5rem' }}>
        <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ textAlign: 'left' }}>
          Introduction
        </Typography>
        <Typography variant="body2" paragraph gutterBottom sx={{ textAlign: 'left' }}>
          How does <span style={{ fontWeight: '700' }}>At The Fire</span> work?
        </Typography>

        <Typography variant="body2" paragraph gutterBottom sx={{ textAlign: 'left' }}>
          You enter what you make, you set your goals, and it shows you if you&apos;re meeting those goals are not. It
          also helps you keep track of inventory and sales/ cashflow. Familiarize yourself with the subsequent list of{' '}
          <span style={{ fontWeight: '900' }}>Dashboard Tabs</span> and their use.
        </Typography>
        <Typography variant="body2" paragraph gutterBottom sx={{ textAlign: 'left' }}>
          This software keeps track of not only what you make, but the kind of sale it is slated for. This helps you
          keep track of your actual inventory, and also your direct sales including auction cash flows- and most
          importantly how that measures up to your goals! The <span style={{ fontWeight: '900' }}>Analysis </span>tab
          shows all values together in graph and table format: your goals, your cash flows, your new inventory, and your
          results.
        </Typography>
        <Typography variant="body2" paragraph gutterBottom sx={{ textAlign: 'left' }}>
          This site also functions as a gallery for your work- and when you create a new post, a new product with an
          &apos;Inventory&apos; category is automatically created adding to your data. Independent from your{' '}
          <span style={{ fontWeight: '900' }}>Products</span> inventory- the{' '}
          <span style={{ fontWeight: '900' }}>Post Tracking</span> tab shows your total inventory value in your gallery
          via snapshots you can take once a day.
        </Typography>

        <FeatureList sx={{ width: isMobile ? '100%' : '70%' }}>
          <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ textAlign: 'left' }}>
            Where Do I Start?
          </Typography>
          <GuideItem>
            <ItemTitle sx={{ textAlign: 'left' }} variant="subtitle2">
              Set up your profile first!
            </ItemTitle>
            <ItemDescription sx={{ textAlign: 'left', marginLeft: '20px' }}>
              Add your business logo, website URL, and social media accounts to customize your posts so everyone knows
              who you are and how to get in touch.
            </ItemDescription>
          </GuideItem>
          <GuideItem>
            <ItemTitle sx={{ textAlign: 'left' }} variant="subtitle2">
              Create content, or data
            </ItemTitle>
            <ItemDescription sx={{ textAlign: 'left', marginLeft: '20px' }}>
              Upload your first gallery post in the <span style={{ fontWeight: '900' }}>Posts</span> tab, or a private
              Product in the <span style={{ fontWeight: '900' }}>Products</span> tab. Creating a Post automatically
              creates a Product with the &apos;Inventory&apos; category. This is then tracked and displayed in both the{' '}
              <span style={{ fontWeight: '900' }}>Calendar</span> tab or the{' '}
              <span style={{ fontWeight: '900' }}>Analysis</span> tabs. If needed, when creating a product, a gallery
              post can be created for categories other than &apos;Inventory&apos;.
            </ItemDescription>
          </GuideItem>
          <GuideItem>
            <ItemTitle sx={{ textAlign: 'left' }} variant="subtitle2">
              Set your goals
            </ItemTitle>
            <ItemDescription sx={{ textAlign: 'left', marginLeft: '20px' }}>
              Head to the <span style={{ fontWeight: '900' }}>Calendar</span> tab or the{' '}
              <span style={{ fontWeight: '900' }}>Analysis</span> tab to set your monthly goal and # of workdays
              scheduled in order to calculate your daily quota. This quota goal is the basis for the color coding
              through these 2 tabs- change the goal and you&apos;ll see the colors update to reflect the new goals.
            </ItemDescription>
          </GuideItem>
          <GuideItem>
            <ItemTitle sx={{ textAlign: 'left' }} variant="subtitle2">
              Track Your Progress
            </ItemTitle>
            <ItemDescription sx={{ textAlign: 'left', marginLeft: '20px' }}>
              Use Products to log your daily activities and view them in the Calendar tab, see your Monthly summaries,
              and watch your Analysis tab&apos;s graph and table show how things are going in the big picture.
            </ItemDescription>
          </GuideItem>
        </FeatureList>
      </StyledPaper>

      {/* Main Features Overview */}
      <StyledPaper elevation={2} id="tools" sx={{ padding: '0 1rem' }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Your Dashboard Tabs at a Glance
        </Typography>
        <FeatureList sx={{ width: isMobile ? '100%' : '70%' }}>
          <GuideItem>
            <ItemTitle sx={{ textAlign: 'left' }} variant="subtitle2">
              Dashboard
            </ItemTitle>
            <ItemDescription sx={{ textAlign: 'left', marginLeft: '20px' }}>
              Create posts, manage listings, download your data, and manage subscription via Stripe Customer Portal
            </ItemDescription>
          </GuideItem>
          <GuideItem>
            <ItemTitle sx={{ textAlign: 'left' }} variant="subtitle2">
              Post Tracking
            </ItemTitle>
            <ItemDescription sx={{ textAlign: 'left', marginLeft: '20px' }}>
              Graphical display of total value of all gallery posts over time.
            </ItemDescription>
          </GuideItem>
          <GuideItem>
            <ItemTitle sx={{ textAlign: 'left' }} variant="subtitle2">
              Orders
            </ItemTitle>
            <ItemDescription sx={{ textAlign: 'left', marginLeft: '20px' }}>
              Create and store invoices for orders.
            </ItemDescription>
          </GuideItem>
          <GuideItem>
            <ItemTitle sx={{ textAlign: 'left' }} variant="subtitle2">
              Products
            </ItemTitle>
            <ItemDescription sx={{ textAlign: 'left', marginLeft: '20px' }}>
              Track your production of product along with whether it is slated for an auction, direct sale, inventory,
              or prep work/ other.
            </ItemDescription>
          </GuideItem>
          <GuideItem>
            <ItemTitle sx={{ textAlign: 'left' }} variant="subtitle2">
              Calendar
            </ItemTitle>
            <ItemDescription sx={{ textAlign: 'left', marginLeft: '20px' }}>
              Set/ view goals and daily work summaries with color-coded work days, showing your posts and earnings for
              each tracked day as well as the entire month.
            </ItemDescription>
          </GuideItem>
          <GuideItem>
            <ItemTitle sx={{ textAlign: 'left' }} variant="subtitle2">
              Analysis
            </ItemTitle>
            <ItemDescription sx={{ textAlign: 'left', marginLeft: '20px' }}>
              Set/ view goals and all your post and product data summarized over time in graphical and table formats.
            </ItemDescription>
          </GuideItem>
        </FeatureList>
      </StyledPaper>

      <Divider sx={{ my: 2 }} />

      {/* Detailed Features */}
      <StyledPaper elevation={2} id="detailed-features">
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Detailed Features Guide
        </Typography>

        <StyledAccordion id="dashboard">
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: '48px' }}>
            <Typography variant="subtitle1" fontWeight="medium">
              Dashboard
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, pb: 1 }}>
            <AccordionContent>
              <Typography variant="body1" gutterBottom sx={{ textAlign: 'left' }}>
                The Posts tab is your command center for creating and managing posts
              </Typography>
              <FeatureList>
                <GuideItem>
                  <ItemTitle variant="subtitle" sx={{ textAlign: 'left', marginLeft: '20px' }}>
                    Create new post or product (or both!)
                  </ItemTitle>
                  <ItemDescription sx={{ textAlign: 'left', marginLeft: '40px' }}>
                    Add multiple images, set prices, and include detailed item information. Creating a new post in the
                    Posts tab automatically creates a product in the Products tab which is all funneled into the
                    Calendar tab&apos;s display. All new Posts in the gallery create a new product in the Product tab,
                    but only if you select &apos;Create Gallery Post&apos; while entering a new product will a new post
                    in the Posts tab be created automatically.
                  </ItemDescription>
                </GuideItem>
                <GuideItem>
                  <ItemTitle variant="subtitle" sx={{ textAlign: 'left', marginLeft: '20px' }}>
                    Get help figuring out what to make!
                  </ItemTitle>
                  <ItemDescription sx={{ textAlign: 'left', marginLeft: '40px' }}>
                    The current inventory list is color coded- red for no items in stock, and colors cool to orange,
                    yetllow, green, and purple to indicate 0-5 items (this will be customizable in V2). Some days you
                    get out to the shop and simply don&apos;t have a clear idea of what to make. Have a list with a
                    bunch of red items helps you know which things to focus on, and at least helps get things moving in
                    the direction it needs to go.
                  </ItemDescription>
                </GuideItem>
                <GuideItem>
                  <ItemTitle variant="subtitle" sx={{ textAlign: 'left', marginLeft: '20px' }}>
                    Manage existing listings
                  </ItemTitle>
                  <ItemDescription sx={{ textAlign: 'left', marginLeft: '40px' }}>
                    Edit, update, or remove posts as needed
                  </ItemDescription>
                </GuideItem>
                <GuideItem>
                  <ItemTitle variant="subtitle" sx={{ textAlign: 'left', marginLeft: '20px' }}>
                    Download data
                  </ItemTitle>
                  <ItemDescription sx={{ textAlign: 'left', marginLeft: '40px' }}>
                    Download a .csv file with all posts from the Posts tab to use in accounting and/ or spreadsheets.
                  </ItemDescription>
                </GuideItem>
              </FeatureList>
            </AccordionContent>
          </AccordionDetails>
        </StyledAccordion>

        <StyledAccordion id="post-tracking">
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: '48px' }}>
            <Typography variant="subtitle1" fontWeight="medium">
              Post Tracking{' '}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, pb: 1 }}>
            <AccordionContent>
              <Typography variant="body1" gutterBottom sx={{ textAlign: 'left' }}>
                Manage post inventory snapshots
              </Typography>
              <FeatureList>
                <GuideItem>
                  <ItemTitle variant="subtitle2" sx={{ textAlign: 'left', marginLeft: '20px' }}>
                    Save snapshots of total post value
                  </ItemTitle>
                  <ItemDescription sx={{ textAlign: 'left', marginLeft: '40px' }}>
                    Click &apos;Save Snapshot&apos; to add data to the table and graph. Update snapshot as needed to
                    have most current data- the last snapshot taken will be the only one saved for that day.
                  </ItemDescription>
                </GuideItem>
                <GuideItem>
                  <ItemTitle variant="subtitle2" sx={{ textAlign: 'left', marginLeft: '20px' }}>
                    Granular view of data
                  </ItemTitle>
                  <ItemDescription sx={{ textAlign: 'left', marginLeft: '40px' }}>
                    View daily, weekly, monthly, or yearly displays of data in graph and table.
                  </ItemDescription>
                </GuideItem>
              </FeatureList>
            </AccordionContent>
          </AccordionDetails>
        </StyledAccordion>

        <StyledAccordion id="orders">
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: '48px' }}>
            <Typography variant="subtitle1" fontWeight="medium">
              Orders
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, pb: 1 }}>
            <AccordionContent>
              <FeatureList>
                <GuideItem>
                  <ItemTitle variant="subtitle2" sx={{ textAlign: 'left', marginLeft: '20px' }}>
                    Create/ print/ manage
                  </ItemTitle>
                  <ItemDescription sx={{ textAlign: 'left', marginLeft: '40px' }}>
                    Simple invoice tool to keep track of orders as well as provide a print out for mail orders.
                  </ItemDescription>
                </GuideItem>
                <GuideItem>
                  <ItemTitle variant="subtitle2" sx={{ textAlign: 'left', marginLeft: '20px' }}>
                    Keep track of what to do
                  </ItemTitle>
                  <ItemDescription sx={{ textAlign: 'left', marginLeft: '40px' }}>
                    Incomplete orders are bright red while completed are set to green- at a glance you can know which
                    orders you need to work on.
                  </ItemDescription>
                </GuideItem>
              </FeatureList>
            </AccordionContent>
          </AccordionDetails>
        </StyledAccordion>

        <StyledAccordion id="products">
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: '48px' }}>
            <Typography variant="subtitle1" fontWeight="medium">
              Products{' '}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, pb: 1 }}>
            <AccordionContent>
              <Typography variant="body1" gutterBottom sx={{ textAlign: 'left' }}>
                Keep track of how your days are spent
              </Typography>
              <FeatureList>
                <GuideItem>
                  <ItemTitle variant="subtitle2" sx={{ textAlign: 'left', marginLeft: '20px' }}>
                    Keep list of all products created as well as any time spent on prep work/ misc. tasks
                  </ItemTitle>
                  <ItemDescription sx={{ textAlign: 'left', marginLeft: '40px' }}>
                    Each day lists all products entered and calculates a subtotal. Determine whether the product is
                    slated for auction, a direct sale, inventory. (This sales data is tracked and summarized with
                    graphical display on you Analysis tab.)
                  </ItemDescription>
                </GuideItem>
                <GuideItem>
                  <ItemTitle variant="subtitle2" sx={{ textAlign: 'left', marginLeft: '20px' }}>
                    Create gallery post tied to product
                  </ItemTitle>
                  <ItemDescription sx={{ textAlign: 'left', marginLeft: '40px' }}>
                    Easily distinguish which products have a public post which is easily viewable.
                  </ItemDescription>
                </GuideItem>
                <GuideItem>
                  <ItemTitle variant="subtitle2" sx={{ textAlign: 'left', marginLeft: '20px' }}>
                    Instantly filter auctions out of list for updating once closed
                  </ItemTitle>
                  <ItemDescription sx={{ textAlign: 'left', marginLeft: '40px' }}>
                    Enter auction when it is listed, and once sold easily update without having to search.
                  </ItemDescription>
                </GuideItem>
              </FeatureList>
            </AccordionContent>
          </AccordionDetails>
        </StyledAccordion>

        <StyledAccordion id="calendar">
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: '48px' }}>
            <Typography variant="subtitle1" fontWeight="medium">
              Calendar
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, pb: 1 }}>
            <AccordionContent>
              <Typography variant="body2" gutterBottom sx={{ textAlign: 'left' }}>
                Observe your productivity at a glance:
              </Typography>
              <FeatureList>
                <GuideItem>
                  <ItemTitle variant="subtitle2" sx={{ textAlign: 'left', marginLeft: '20px' }}>
                    Color Coded Work Days
                  </ItemTitle>
                  <ItemDescription sx={{ textAlign: 'left', marginLeft: '40px' }}>
                    Once your monthly and workday goals are set, your daily goal is automatically calculated. The
                    calendar displays a range of colors based on the % of the goal- simply put red is bad ( less than
                    goal), green is good (more than goal)- and colors in between give you an indication of how close you
                    came. See not only what days you worked, but what % of your goal you made that day based on a
                    spectrum of red/ orange/ yellow/ green/ dark green which helps you see at a glance how your week/
                    month has been going.
                  </ItemDescription>
                </GuideItem>
                <GuideItem>
                  <ItemTitle variant="subtitle2" sx={{ textAlign: 'left', marginLeft: '20px' }}>
                    Color Coded Montly Summarys
                  </ItemTitle>
                  <ItemDescription sx={{ textAlign: 'left', marginLeft: '40px' }}>
                    Without even looking at the numbers you can see at a glance what the state of your monthly goal is
                    looking like. See how you measure up to your set goals.
                  </ItemDescription>
                </GuideItem>
                <GuideItem>
                  <ItemTitle variant="subtitle2" sx={{ textAlign: 'left', marginLeft: '20px' }}>
                    Set/ edit your goals
                  </ItemTitle>
                  <ItemDescription sx={{ textAlign: 'left', marginLeft: '40px' }}>
                    What&apos;s your monthly revenue goal? How many days are you working this month? Set these goals and
                    the system calculates your daily quota. This quota is the basis for all the color coding in the
                    Calendar- change the goals and the colors will correspond.
                  </ItemDescription>
                </GuideItem>
              </FeatureList>
            </AccordionContent>
          </AccordionDetails>
        </StyledAccordion>

        <StyledAccordion id="analysis">
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: '48px' }}>
            <Typography variant="subtitle1" fontWeight="medium">
              Analysis{' '}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, pb: 1 }}>
            <AccordionContent>
              <Typography variant="body1" gutterBottom sx={{ textAlign: 'left' }}>
                Full stock of data in graph and table
              </Typography>
              <FeatureList>
                <GuideItem>
                  <ItemTitle variant="subtitle2" sx={{ textAlign: 'left', marginLeft: '20px' }}>
                    3 history options
                  </ItemTitle>
                  <ItemDescription sx={{ textAlign: 'left', marginLeft: '40px' }}>
                    View data from the last 6 months, 1 yr, or 2yrs.
                  </ItemDescription>
                </GuideItem>
                <GuideItem>
                  <ItemTitle variant="subtitle2" sx={{ textAlign: 'left', marginLeft: '20px' }}>
                    Color coded graph and table
                  </ItemTitle>
                  <ItemDescription sx={{ textAlign: 'left', marginLeft: '40px' }}>
                    Colors in graph match the Product list categories &apos;Auction&apos;, &apos;Direct Sale&apos;, and
                    &apos;Website Inventory&apos;. Colors in table summaries reflect % toward monthly financial goals
                    factoring in # of workdays.
                  </ItemDescription>
                </GuideItem>

                <GuideItem>
                  <ItemTitle variant="subtitle2" sx={{ textAlign: 'left', marginLeft: '20px' }}>
                    Set/ edit your goals
                  </ItemTitle>
                  <ItemDescription sx={{ textAlign: 'left', marginLeft: '40px' }}>
                    What&apos;s your monthly revenue goal? How many days are you working this month? Set these goals and
                    the system calculates your daily quota. This quota is the basis for the goal line in the graph-
                    change the goals and the graph will reflect that.
                  </ItemDescription>
                </GuideItem>
              </FeatureList>
            </AccordionContent>
          </AccordionDetails>
        </StyledAccordion>
      </StyledPaper>
    </GuideContainer>
  );
}

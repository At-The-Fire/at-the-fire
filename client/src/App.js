import React, { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';

import ModeNightIcon from '@mui/icons-material/ModeNight';
import LightModeIcon from '@mui/icons-material/LightMode';

import Subscription from './components/Subscription/Subscription.js';
import './App.css';

import Auth from './components/Auth/Auth.js';
import ResponsiveAppBar from './components/ResponsiveAppBar/ResponsiveAppBar.js';
import Gallery from './components/Gallery/Gallery.js';
import NotFound from './components/NotFound.js';
import Contact from './components/Contact/Contact.js';
import GalleryPostDetail from './components/Gallery/GalleryPostDetail.js';
import NewPost from './components/NewPost/NewPost.js';
import EditPost from './components/EditPost/EditPost.js';
import Profile from './components/Profile/Profile.js';
import StripeReturn from './components/StripeReturn/StripeReturn.js';
import About from './components/About/About.js';
import DashboardTabs from './components/DashboardTabs/DashboardTabs.js';
import { ToastContainer } from 'react-toastify';
import TermsOfService from './components/TermsOfService/TermsOfService.js';
import SubscriptionFormPage from './components/Subscription/SubscriptionPages/FormPageComponents/SubscriptionFormPage.js';
import { useAuthStore } from './stores/useAuthStore.js';
import AdminDashboard from './components/AdminDashboard/AdminDashboard.js';
import UserGuide from './components/UserGuide/UserGuide.js';
import AboutProject from './components/About/AboutProject.js';
import MessagingContainer from './components/Messaging/MessagingContainer.js';
import { useNotificationStore } from './stores/useNotificationStore.js';
import PasswordChange from './components/Auth/AuthForms.js/PasswordChange.js';

//? this is referenced in ResponsiveAppBar for replacing title to display which development local/ deploy is in the browser tab
window.REACT_APP_BASE_URL = window.location.origin;

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1f8e3d',
    },
    secondary: {
      main: '#1565c0',
    },
  },
  props: {
    MuiTooltip: {
      arrow: true,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0c410c', // Keeping your brand green
    },
    secondary: {
      main: '#1565c0',
    },
    background: {
      default: '#f8f9fa', // Slightly off-white background
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
  },
  components: {
    // Your existing components
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    // Add some subtle shadows to cards and paper components
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        },
      },
    },
  },
});

function App() {
  const [theme, setTheme] = useState(darkTheme);
  const { isAuthenticated } = useAuthStore();
  const fetchUnreadCount = useNotificationStore((state) => state.fetchUnreadCount);

  // auth check
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
    }
  }, [isAuthenticated, fetchUnreadCount]);

  const location = useLocation();
  const clearActiveConversationId = useNotificationStore((state) => state.clearActiveConversationId);

  useEffect(() => {
    // if you're not on a /messages route, clear the selection so new notification display
    if (!location.pathname.startsWith('/messages')) {
      clearActiveConversationId();
    }
  }, [location, clearActiveConversationId]);

  return (
    <>
      {' '}
      <ToastContainer position="top-center" />
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box className={'App'}>
          <ResponsiveAppBar />
          <Routes>
            <Route path="/" element={<Gallery />} />
            <Route path="/auth/change-password" element={<PasswordChange />} />
            <Route path="/at-the-bon-fire" element={<AdminDashboard />} />
            <Route path="/user-guide" element={<UserGuide />} />
            <Route path="/gallery/:id" element={<GalleryPostDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/about-project" element={<AboutProject />} />
            <Route path="/stripe-return" element={<StripeReturn />} />
            <Route path="/dashboard" element={<DashboardTabs />} />
            <Route path="/dashboard/new" element={<NewPost />} />
            <Route path="/dashboard/edit/:id" element={<EditPost />} />
            <Route path="/profile/:sub" element={<Profile />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/messages" element={<MessagingContainer />} />
            <Route path="/messages/:sub" element={<MessagingContainer />} />
            <Route path="/subscription/form" element={<SubscriptionFormPage />} />
            <Route path="/subscription/:result?" element={<Subscription />} />
            <Route path="/auth/:type" element={<Auth />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="*" element={<NotFound />} />
          </Routes>

          {theme === darkTheme ? (
            <ModeNightIcon onClick={() => setTheme(lightTheme)} className="theme-icon" />
          ) : (
            <LightModeIcon onClick={() => setTheme(darkTheme)} className="theme-icon" />
          )}
        </Box>
      </ThemeProvider>
    </>
  );
}

export default App;

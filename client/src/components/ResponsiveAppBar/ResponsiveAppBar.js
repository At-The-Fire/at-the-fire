import React, { useEffect, useState } from 'react';
import { useRef } from 'react';
import {
  AppBar,
  Toolbar,
  Container,
  Box,
  InputBase,
  Button,
  IconButton,
  useMediaQuery,
  Typography,
} from '@mui/material';
import MobileNavMenu from './ResponsiveAppBarComponents/MobileNavMenu.js';
import DesktopNavMenu from './ResponsiveAppBarComponents/DesktopNavMenu.js';
import UserMenu from './ResponsiveAppBarComponents/UserMenu.js';
import styled from '@emotion/styled';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '../../context/QueryContext.js';
import { useNavigate } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@emotion/react';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { useNotificationStore } from '../../stores/useNotificationStore.js';
import { useAuctionEventsStore } from '../../stores/useAuctionEventsStore.js';
import { Badge } from '@mui/material';
import './ResponsiveAppBar.css';
import { useMessagingSocket } from '../../hooks/useMessagingSocket.js'; //! often looks unused due to commenting out socket for local dev DO NOT DELETE

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  transition: theme.transitions.create('width'),
  width: '0ch', // Initially hidden
  '&.expanded': {
    width: '20ch', // Expand when active (you can adjust this width)
  },
  [theme.breakpoints.up('sm')]: {
    width: 'auto', // Normal behavior on larger screens
  },
}));

export default function ResponsiveAppBar() {
  const { isAuthenticated, customerId, loadingCustomerId, admin, email, user, isConfirmed } = useAuthStore();

  const [searchExpanded, setSearchExpanded] = useState(false); // State to toggle the search bar expansion
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElUser, setAnchorElUser] = useState(null);

  const { isFeedView } = useQuery();

  const { query, setQuery } = useQuery();
  const navigate = useNavigate();
  const { unreadCount } = useNotificationStore();
  const pendingShipmentsCount = useAuctionEventsStore((s) => s.pendingShipmentsCount);

  useMessagingSocket();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  let userMenuItems = [];

  const messages = unreadCount === 0 ? 'Messages' : `Messages (${unreadCount})`;

  const timerRef = useRef(null);
  let isLocal = window.REACT_APP_BASE_URL.includes('localhost');

  const isDevelopmentEnvironment =
    window.REACT_APP_BASE_URL &&
    (window.REACT_APP_BASE_URL.includes('-dev') || window.REACT_APP_BASE_URL.includes('localhost'));

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setQuery(value), 300);
  };

  userMenuItems =
    isAuthenticated && !loadingCustomerId
      ? [messages, 'Workspace', 'Purchases', 'Profile', 'User Guide', 'Logout']
      : [];

  const pages = user
    ? [isFeedView ? 'Gallery' : 'Feed', 'Auctions', 'Sign Up', 'Sign In', 'About', 'Contact']
    : ['Auctions', 'Sign Up', 'Sign In', 'About', 'Contact'];
  // Handles expanding and collapsing search input on mobile
  const handleSearchToggle = () => {
    setSearchExpanded(!searchExpanded);
  };

  // Navigates to dashboard
  const handleHomeDashboard = () => {
    if (admin) {
      navigate('/at-the-bon-fire');
    } else {
      navigate('/dashboard');
    }
    setAnchorElUser(null);
  };

  // Navigates to subscription
  const handleSubscriptionNav = () => {
    navigate('/subscription');
  };

  return (
    <>
      <AppBar position="fixed" sx={{ maxHeight: '68.5px', top: '0px' }}>
        {isDevelopmentEnvironment && (
          <Box
            sx={{
              backgroundColor: isLocal ? 'yellow' : 'orange',
              color: 'black',
              padding: 1,
              position: 'absolute',
              left: isMobile ? '30%' : '40%',
            }}
          >
            {`DEV: ${isLocal ? 'LOCAL' : 'DEPLOY'}`}
          </Box>
        )}
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            <MobileNavMenu
              {...{
                setAnchorElNav,
                setAnchorElUser,
                anchorElNav,
                pages,
                type: window.location.pathname.split('/')[1],
              }}
            />
            <DesktopNavMenu
              {...{
                setAnchorElNav,
                setAnchorElUser,
                pages,
                type: window.location.pathname.split('/')[1],
              }}
            />

            <Box
              sx={{
                flexGrow: isAuthenticated ? 1 : 0,
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: (theme) => theme.spacing(1),
                padding: (theme) => theme.spacing(1),
              }}
            >
              {/* Show search icon and functionality only on mobile (xs and sm screens) */}
              {!window.location.pathname.split('/')[1] && (
                <Box
                  sx={{
                    display: 'flex',
                    border: '1px solid',
                    borderColor: 'green',
                    paddingLeft: searchExpanded ? '18px' : '0px',
                    borderRadius: '10px',
                    left: searchExpanded ? '56px;' : ' 0px',
                    backgroundColor: '#202020',
                    zIndex: 9,
                    right: isMobile ? '0px' : '60px',
                  }}
                >
                  {!searchExpanded ? (
                    <IconButton onClick={handleSearchToggle} aria-label="search">
                      <SearchIcon />
                    </IconButton>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <StyledInputBase
                        className={searchExpanded ? 'expanded' : ''}
                        placeholder="Search…"
                        inputProps={{ 'aria-label': 'search' }}
                        defaultValue={query}
                        onChange={(e) => handleInputChange(e)}
                      />
                      <IconButton onClick={handleSearchToggle} aria-label="close search">
                        <CloseIcon />
                      </IconButton>
                    </Box>
                  )}
                </Box>
              )}

              {!loadingCustomerId && isAuthenticated ? (
                <Box sx={{ display: 'grid' }}>
                  <Badge
                    badgeContent={pendingShipmentsCount > 0 ? pendingShipmentsCount : null}
                    color="warning"
                    sx={{ display: isTablet && searchExpanded ? 'none' : 'block' }}
                  >
                    <Button
                      onClick={handleHomeDashboard}
                      style={{
                        margin: '0 10px',
                        color: 'white',
                        display: isTablet && searchExpanded ? 'none' : 'flex',
                        padding: '0',
                      }}
                      variant="outlined"
                    >
                      {admin ? '🔥   Admin    🔥' : 'Workspace'}
                    </Button>
                  </Badge>

                  <Typography
                    sx={{
                      fontSize: '.8rem',
                      color: (theme) => theme.palette.primary.light,
                      display: isTablet && searchExpanded ? 'none' : 'flex',
                    }}
                  >
                    {` ${!isMobile ? email : ''}`}
                  </Typography>
                </Box>
              ) : null}
              <Box
                sx={{
                  display: isMobile && searchExpanded ? 'none' : 'flex',
                  gap: '10px',
                }}
              >
                {isAuthenticated && (
                  <UserMenu
                    {...{
                      setAnchorElNav,
                      setAnchorElUser,
                      anchorElUser,
                      userMenuItems,
                    }}
                  />
                )}
              </Box>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    </>
  );
}

import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useQuery } from '../context/QueryContext.js';
import { useNotificationStore } from '../stores/useNotificationStore.js';

export default function useAppBar({ setAnchorElNav, setAnchorElUser }) {
  const {
    customerId,
    setCustomerId,
    handleSignOut,
    setEmail,
    setPassword,
    setCPassword,
    email,
    setUser,
    setIsAuthenticated,
    user,
  } = useAuthStore();
  const navigate = useNavigate();

  const { unreadCount } = useNotificationStore();
  const mobileOpen = useNotificationStore((state) => state.mobileOpen);
  const setMobileOpen = useNotificationStore((state) => state.setMobileOpen);

  const { toggleFeedView, isFeedView } = useQuery();

  const handleLogoNavigation = () => {
    if (isFeedView) {
      toggleFeedView();
    }
    navigate('/');
  };

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const closeNavHelper = (url) => {
    setAnchorElNav(null);
    navigate(`/${url}`);
  };

  const handleCloseNavMenu = (e) => {
    switch (e.target.textContent) {
      case 'Gallery':
      case 'Feed':
        toggleFeedView();
        closeNavHelper('');
        break;
      case 'Sign Up':
        closeNavHelper('auth/sign-up');
        break;
      case 'Sign In':
        closeNavHelper('auth/sign-in');
        break;
      case 'About':
        closeNavHelper('about');
        break;
      case 'Contact':
        closeNavHelper('contact');
        break;
      default:
        setAnchorElNav(null);
        break;
    }
  };
  const messages = unreadCount === 0 ? 'Messages' : `Messages (${unreadCount})`;

  const closeNavMenuHelper = (url) => {
    setAnchorElUser(null);
    navigate(url);
  };

  const handleCloseUserMenu = (e) => {
    switch (e.target.textContent) {
      case 'Logout':
        handleSignOut(email, setUser, setIsAuthenticated, setCustomerId);
        setEmail('');
        setPassword('');
        setCPassword('');
        closeNavMenuHelper('auth/sign-in');
        return;
      case 'Subscription':
        if (customerId === null || customerId === undefined) {
          closeNavMenuHelper('subscription');
        } else {
          closeNavMenuHelper('dashboard');
        }
        break;
      case messages:
        if (!mobileOpen) setMobileOpen(true);
        closeNavMenuHelper('messages');
        break;
      case 'Workspace':
        closeNavMenuHelper('dashboard');
        break;
      case 'Profile':
        closeNavMenuHelper(`profile/${user}`);
        break;
      case 'User Guide':
        closeNavMenuHelper('/user-guide');

        break;
      default:
        break;
    }
    setAnchorElUser(null);
  };

  return {
    handleLogoNavigation,
    handleOpenNavMenu,
    handleOpenUserMenu,
    handleCloseNavMenu,
    handleCloseUserMenu,
  };
}

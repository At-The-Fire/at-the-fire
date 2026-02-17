//TODO
//! More dashboard functionality could be implemented- some ideas commented out- left for brainstorming/ implementing?
import React, { useEffect, useState } from 'react';
import './AdminDashboard.css';
import { fetchUserData, deleteUser, deleteSubscriber, fetchInvoices } from '../../services/fetch-atf.js';
import userDefaultImage from './../../assets/user.png';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import FlamePipe from '../FlamePipe/FlamePipe.js';
import { useTheme } from '@emotion/react';

const AdminDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDesktop = useMediaQuery(theme.breakpoints.down('lg'));

  const [activeView, setActiveView] = useState('users');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [coordinatedUsers, setCoordinatedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { authenticateUser, isAuthenticated, error, signingOut, checkTokenExpiry, customerId } = useAuthStore();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // '2024-01' format
  const [monthlyRevenue, setMonthlyRevenue] = useState({});

  const [stats, setStats] = useState({
    users: {
      total: 0,
      active: 0,
      premium: 0,
      // growth: '+12.3%',
    },
    content: {
      total: 0,
      pending: 0,
      flagged: 0,
    },
    revenue: {
      monthly: '$0',
      // growth: '+8.4%',
    },
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [allInvoices, setAllInvoices] = useState([]);

  const [openPostsModal, setOpenPostsModal] = useState(false);
  const [modalPosts, setModalPosts] = useState([]);
  const [modalUser, setModalUser] = useState(null);

  // functions
  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = coordinatedUsers.filter((user) => user.id > 5).slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(coordinatedUsers.filter((user) => user.id > 5).length / itemsPerPage);

  const getUserStatus = (subscription) => {
    if (subscription?.isActive) return 'active';
    if (subscription?.status === 'trialing') return 'trial';
    return 'inactive';
  };

  const coordinateUserData = (users, customers, posts, subscriptions) => {
    const customerMap = new Map(customers.map((customer) => [customer.customerId, customer]));

    const postsByCustomer = new Map();
    posts?.forEach((post) => {
      const customerId = post.customer_id;
      if (!postsByCustomer.has(customerId)) {
        postsByCustomer.set(customerId, []);
      }
      postsByCustomer.get(customerId).push(post);
    });

    const subscriptionsByCustomer = new Map();
    subscriptions?.forEach((subscription) => {
      const customerId = subscription.customerId;
      if (!subscriptionsByCustomer.has(customerId)) {
        subscriptionsByCustomer.set(customerId, []);
      }
      subscriptionsByCustomer.get(customerId).push(subscription);
    });

    return users.map((user) => {
      const customer = customerMap.get(user.customerId);
      const userPosts = postsByCustomer.get(user.customerId) || [];
      const userSubscription = subscriptionsByCustomer.get(user.customerId) || [];

      return {
        id: user.id,
        sub: user.sub,
        customerId: user.customerId,
        createdAt: user.createdAt,
        firstName: user?.firstName || user.name || ' -- ',
        lastName: user?.lastName || user.name || ' -- ',
        email: user?.email || 'No Email',
        image_url: user?.imageUrl || userDefaultImage,
        postsCount: userPosts.length,
        userPosts,
        status: getUserStatus(userSubscription[0]),
        trial_status: userSubscription[0]?.trial_status,
        subscription_status: userSubscription[0]?.interval ? `${userSubscription[0].interval}ly` : 'N / A',
        last_login: customer?.last_login || 'N/A',
        logo_image_url: customer?.logoImageUrl || 'N/A',
      };
    });
  };

  const handleDeleteUser = async (user) => {
    try {
      setLoading(true);

      if (user.customerId) {
        await deleteSubscriber(user.sub);
        await deleteUser(user.sub);
      } else {
        await deleteUser(user.sub);
      }

      // Remove user from state/refresh list
      setCoordinatedUsers((prev) => prev.filter((u) => u.id !== user.id));
      setStats((prev) => ({
        ...prev,
        users: {
          ...prev.users,
          total: prev.users.total - 1,
          active: user.customerId ? prev.users.active - 1 : prev.users.active,
        },
      }));

      toast.success('User successfully deleted! ', {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
      });
    } catch (error) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        console.error('Error deleting user:', error);
      }
      toast.error('Failed to delete user: ' + error.message, {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        autoClose: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // Load user data function
  const loadUsers = async () => {
    try {
      const data = await fetchUserData();

      const coordinated = coordinateUserData(
        data.users || [],
        data.customers || [],
        data.posts || [],
        data.subscriptions || []
      );

      setCoordinatedUsers(coordinated);

      setStats((prevStats) => ({
        users: {
          ...prevStats.users,
          total: coordinated.length,
          active: coordinated.filter((user) => user.status === 'active').length,
        },
        content: {
          ...prevStats.content,
          total: (data.posts || []).length,
        },
        revenue: {
          ...prevStats.revenue,
        },
      }));
    } catch (e) {
      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          console.error('Error fetching data:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Error fetching data: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'admin-dash-1',
          autoClose: false,
        });
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadUsers(), loadInvoices()]); // Load both in parallel
    setIsRefreshing(false);
  };

  // authenticate and check tokens
  useEffect(() => {
    if (!isAuthenticated && !error && !signingOut) {
      authenticateUser();
    } else if (isAuthenticated) {
      // If we are authenticated, check token expiry
      checkTokenExpiry();
    }
  }, [isAuthenticated, error, authenticateUser, signingOut, checkTokenExpiry]);

  // navigate to sign in if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/sign-in');
      return;
    }
  }, [isAuthenticated, navigate, error]);

  const loadInvoices = async () => {
    try {
      const data = await fetchInvoices();
      setAllInvoices(data);
      const monthlyData = organizeByMonth(data);
      setMonthlyRevenue(monthlyData);
    } catch (e) {
      toast.error(`Failed to load invoice data: ${e.message}`, {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'admin-dash-2',
        autoClose: false,
      });
    }
  };

  useEffect(() => {
    const monthlyData = organizeByMonth(allInvoices);
    setMonthlyRevenue(monthlyData);
  }, [currentMonth, allInvoices]);

  useEffect(() => {
    loadUsers();
    loadInvoices();
  }, []);

  const organizeByMonth = (invoices) => {
    return invoices.reduce((months, invoice) => {
      const date = new Date(invoice.startDate * 1000); // Convert Unix timestamp
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!months[monthKey]) {
        months[monthKey] = 0;
      }
      months[monthKey] += parseFloat(invoice.amountPaid);
      return months;
    }, {});
  };

  // Add this function to format the date display
  const formatMonthDisplay = (dateString) => {
    const [year, month] = dateString.split('-');
    return new Date(year, month - 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const handleSelectAdminMenu = (setting) => {
    setIsMenuOpen(false);
    setActiveView(setting);
  };

  return loading ? (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: '300px' }}>
      <FlamePipe />
    </Box>
  ) : (
    <Box className="admin-dashboard">
      <Box
        className={`sidebar ${isMenuOpen ? 'sidebar-open' : ''}`}
        sx={{
          backgroundColor: (theme) => {
            theme.palette.primary.dark;
          },
        }}
      >
        <Box className="sidebar-header" sx={{ color: (theme) => theme.palette.primary.light }}>
          <Typography variant="h5" sx={{ translate: '20px -4px' }}>
            Mission Control
          </Typography>
          {isDesktop && (
            <Button
              className="menu-close"
              onClick={() => setIsMenuOpen(false)}
              sx={{ fontSize: '2rem', lineHeight: '1rem', translate: '20px -6px' }}
            >
              ×
            </Button>
          )}
        </Box>

        <nav className="sidebar-nav">
          <Box
            className={`nav-item ${activeView === 'users' ? 'active' : ''}`}
            onClick={() => handleSelectAdminMenu('users')}
          >
            <Typography className="nav-icon">👥</Typography>
            Users
          </Box>
          <Box
            className={`nav-item ${activeView === 'content' ? 'active' : ''}`}
            onClick={() => handleSelectAdminMenu('content')}
          >
            <Typography className="nav-icon">📄</Typography>
            Content
          </Box>
          <Box
            className={`nav-item ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => handleSelectAdminMenu('analytics')}
          >
            <Typography className="nav-icon">📊</Typography>
            Analytics
          </Box>
          <Box
            className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => handleSelectAdminMenu('settings')}
          >
            <Typography className="nav-icon">⚙️</Typography>
            Settings
          </Box>
        </nav>
      </Box>

      <main className="main-content">
        <header className="main-header">
          {isDesktop && (
            <Button
              className="menu-toggle"
              onClick={() => setIsMenuOpen(true)}
              sx={{ fontSize: '2rem', padding: '0', margin: '0', lineHeight: '1.5rem' }}
            >
              ⋮
            </Button>
          )}
          <Box className="search-bar">
            {/* <input
              type="text"
              placeholder="Search users, content, or settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Typography className="search-icon">🔍</Typography> */}
          </Box>
          <Box className="header-actions">
            {/*   <button className="action-button">
              <Typography className="notification-badge">3</Typography>
              🔔
            </button>
           <Box className="admin-profile">
              <img src={bizProfile.logoImageUrl} alt="Admin" className="admin-avatar" />
              <Typography className="admin-name">Admin</Typography>
            </Box> */}
          </Box>
        </header>

        <section className="stats-overview">
          <Box className="stat-card users">
            <Box className="stat-header">
              <Typography variant={isMobile ? 'h6' : 'h5'}> Users</Typography>
              {/* <Typography className="trend positive">{stats.users.growth}</Typography> */}
            </Box>

            <Box sx={{ display: isMobile ? 'flex' : 'grid', justifyContent: 'space-between' }}>
              <Box className="stat-value-sub">{stats.users.total - 5 - stats.users.active} basic users</Box>
              <Box className="stat-value-sub">{stats.users.active} subscribers</Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
              {/* <Box className="stat-value" sx={{ marginTop: '10px', fontSize: '1rem' }}> */}
              <Box className="stat-value" sx={{ marginTop: '10px', fontSize: isMobile ? '1rem' : '2rem' }}>
                Total Users
              </Box>
              {/* <Box className="stat-value">{stats.users.total - 5} </Box> */}
              <Box className="stat-value" sx={{ fontSize: isMobile ? '1rem' : '2rem' }}>
                {stats.users.total - 5}{' '}
              </Box>
            </Box>
            <Box className="stat-details"></Box>
          </Box>

          <Box className="stat-card posts">
            <Box className="stat-header">
              <Typography variant={isMobile ? 'h6' : 'h5'}>Posts</Typography>
            </Box>
            <Box
              sx={{
                marginLeft: '20px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
              className="stat-value"
            >
              <Box>Total Posts</Box>
              <Box>{stats.content.total}</Box>
            </Box>
          </Box>

          {/* 
          <Box className="stat-card warning">
            <Box className="stat-header">
              <Typography variant="h5">Monthly Revenue</Typography>
              <Typography className="trend positive">{stats.revenue.growth}</Typography>
            </Box>
            <Box className="stat-value">{invoiceTotals}</Box>
            <Box className="stat-details">
              {' '}
              <Typography>Projected +15%</Typography>{' '}
            </Box>
          </Box> */}

          <Box className="stat-card monthly-revenue">
            <Box className="stat-header">
              <Typography variant={isMobile ? 'h6' : 'h5'}> Revenue</Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}
            >
              <Button
                onClick={() => {
                  const [year, month] = currentMonth.split('-');
                  const date = new Date(year, month - 1);
                  date.setMonth(date.getMonth() - 1);
                  setCurrentMonth(date.toISOString().slice(0, 7));
                }}
              >
                ◀◀
              </Button>
              {formatMonthDisplay(currentMonth)}
              <Button
                onClick={() => {
                  const [year, month] = currentMonth.split('-');
                  const date = new Date(year, month - 1);
                  date.setMonth(date.getMonth() + 1);
                  setCurrentMonth(date.toISOString().slice(0, 7));
                }}
              >
                ▶▶
              </Button>
            </Box>
            <Box
              className="stat-value"
              sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Box>Monthly Total</Box>
              <Box>${(monthlyRevenue[currentMonth] / 100 || 0).toFixed(2)}</Box>
            </Box>
          </Box>
        </section>

        <section className="main-view">
          <Box className="view-header">
            <h2>User Management</h2>
            <Box className="view-actions">
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="refresh-button"
                sx={{
                  minWidth: '40px',
                  mr: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                Refresh:
                <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
              </Button>
              {/* <button className="button secondary">Export</button>
              <button className="button primary">Add User</button> */}
            </Box>
          </Box>
          <Box className="data-table">
            <Box className="data-grid">
              <Box className="grid-header">
                <Box className="user-cell">Users</Box>
                <Box className="desktop-info">
                  <Box className="cell-joined">Joined</Box>
                  <Box className="cell-status">Status</Box>
                  <Box className="cell-content">Content</Box>
                  <Box className="cell-subscription">Subscription</Box>
                  <Box className="cell-actions">Actions</Box>
                </Box>
              </Box>

              {currentUsers
                .filter((user) => user.id > 5)
                .map((user, i) => (
                  <Box key={user.id || i} className="grid-row" sx={{ padding: '0' }}>
                    {/* Main user info - always visible */}
                    <Box className="user-cell">
                      {user.logo_image_url && user.logo_image_url !== 'N/A' ? (
                        <Box
                          component="img"
                          sx={{
                            height: isMobile ? '50px' : '80px',
                            width: isMobile ? '50px' : '80px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            border: '2px solid',
                            borderColor: (theme) => theme.palette.primary.light,
                          }}
                          src={user.logo_image_url}
                          alt="User"
                          onClick={() => navigate(`/profile/${user.sub}`)}
                        />
                      ) : (
                        <Box
                          component="img"
                          sx={{
                            height: isMobile ? '50px' : '80px',
                            width: isMobile ? '50px' : '80px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            border: '2px solid',
                            borderColor: (theme) => theme.palette.primary.light,
                          }}
                          src={user.image_url}
                          alt="User"
                          onClick={() => navigate(`/profile/${user.sub}`)}
                        />
                      )}
                      <Box className="user-info">
                        <Box className="user-name">
                          {user.firstName} {user.lastName}
                        </Box>
                        <Box className="user-email" sx={{ fontSize: '0.8em', textAlign: 'left' }}>
                          {user.email.length > 20 ? user.email.slice(0, 20) + '...' : user.email}
                        </Box>

                        {!isMobile && (
                          <>
                            <Box sx={{ fontSize: '0.8em', color: '#888', textAlign: 'left', lineHeight: '1.2' }}>
                              sub: {user.sub}
                            </Box>
                            <Box sx={{ fontSize: '0.8em', color: '#888', textAlign: 'left', lineHeight: '1.2' }}>
                              customerId: <span style={{ fontWeight: 'bold', color: '#888' }}>{user.customerId}</span>
                            </Box>
                          </>
                        )}
                      </Box>
                    </Box>

                    {/* Desktop view - additional info */}
                    <Box className="desktop-info">
                      <Box className="cell-joined">
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                          month: 'numeric',
                          day: 'numeric',
                          year: '2-digit',
                        })}
                      </Box>
                      <Box className="cell-status">
                        <span className={`status-badge ${user.status}`}>{user.status}</span>
                      </Box>
                      {/* <Box className="cell-status">
                        <span className={`status-badge ${user.subscription_status}`}>{user.trial_status}</span>
                      </Box> */}
                      <Box className="cell-content">
                        <Button
                          variant="outlined"
                          style={{ cursor: 'pointer', width: '100%' }}
                          onClick={() => {
                            setModalPosts(user.userPosts);
                            setModalUser(user);
                            setOpenPostsModal(true);
                          }}
                        >
                          {user.postsCount} posts
                        </Button>
                      </Box>
                      <Box className="cell-subscription">
                        <span className={`subscription-badge ${user.subscription_status}`}>
                          {user.subscription_status}
                        </span>
                      </Box>
                      <Box className="cell-actions">
                        {customerId !== user.customerId ? (
                          <Box sx={{ minWidth: '70px' }}>
                            <button className="icon-button edit">✏️</button>
                            <button
                              className="icon-button delete"
                              onClick={() => {
                                setUserToDelete(user);
                                handleOpenDialog();
                              }}
                              disabled={loading}
                            >
                              {loading ? '...' : '🗑️'}
                            </button>
                          </Box>
                        ) : (
                          <Box sx={{ minWidth: '70px' }}>🔥</Box>
                        )}
                      </Box>
                    </Box>

                    {/* Mobile view - critical info inline */}
                    <Box className="mobile-info">
                      <span className={`status-badge ${user.status}`}>{user.status}</span>
                      <span className={`subscription-badge ${user.subscription_status}`}>
                        {user.subscription_status}
                      </span>
                      {customerId !== user.customerId ? (
                        <Box sx={{ minWidth: '20px' }}>
                          {' '}
                          <button
                            className="icon-button delete"
                            onClick={() => {
                              setUserToDelete(user);
                              handleOpenDialog();
                            }}
                            disabled={loading}
                          >
                            {loading ? '...' : '🗑️'}
                          </button>
                        </Box>
                      ) : (
                        <Box sx={{ minWidth: '35px' }}>🔥</Box>
                      )}
                    </Box>
                  </Box>
                ))}
            </Box>
          </Box>

          <Box className="pagination">
            <Button
              className="page-button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              ←
            </Button>

            {[...Array(totalPages)].map((_, index) => {
              const pageNumber = index + 1;
              if (
                pageNumber === 1 ||
                pageNumber === totalPages ||
                (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
              ) {
                return (
                  <Button
                    key={pageNumber}
                    className={`page-button ${currentPage === pageNumber ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                );
              } else if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                return (
                  <Typography key={pageNumber} className="page-ellipsis">
                    ...
                  </Typography>
                );
              }
              return null;
            })}

            <Button
              className="page-button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              →
            </Button>
          </Box>
        </section>
      </main>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" sx={{ minWidth: isMobile ? '0' : '600px' }}>
          {`Delete user ${userToDelete?.firstName} ${userToDelete?.lastName}?`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {userToDelete && (
              <Box>
                Are you sure you want to proceed? Double check!
                <Box sx={{ padding: '10px', marginTop: '15px' }}>
                  {' '}
                  <span
                    style={{
                      fontWeight: '700',
                      fontSize: isMobile ? '.8rem' : '1rem',
                      display: 'block',
                      marginLeft: '0px',
                      backgroundColor: 'yellow',
                      color: 'black',
                      padding: '5px 0 0 15px',
                      borderTopLeftRadius: '10px',
                      borderTopRightRadius: '10px',
                    }}
                  >
                    name: {userToDelete.firstName} {userToDelete.lastName}
                  </span>
                  <span
                    style={{
                      fontWeight: '700',
                      fontSize: isMobile ? '.8rem' : '1rem',
                      display: 'block',
                      marginLeft: '0px',
                      backgroundColor: 'yellow',
                      color: 'black',
                      padding: '5px 0 5px 15px',
                      borderBottomLeftRadius: '10px',
                      borderBottomRightRadius: '10px',
                    }}
                  >
                    {' '}
                    email: {userToDelete.email}
                  </span>
                </Box>
                <Typography variant="h5" sx={{ color: 'red', textAlign: 'center', marginTop: '20px' }}>
                  This action cannot be undone!
                </Typography>
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            sx={{
              width: '100%',
              fontSize: '1rem',
              color: 'lightgreen',
              border: '2px solid lightgreen',
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: 'lightgreen',
                border: '2px solid lightgreen',
                color: 'green',
              },
            }}
            onClick={handleCloseDialog}
          >
            Cancel
          </Button>
          <Button
            sx={{
              width: '100%',
              fontSize: '1rem',
              color: 'orangered',
              border: '2px solid orangered',
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: 'orangered',
                color: 'yellow',
                border: '2px solid orangered',
              },
            }}
            onClick={() => {
              handleDeleteUser(userToDelete);
              handleCloseDialog();
            }}
            autoFocus
          >
            CONFIRM
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openPostsModal} onClose={() => setOpenPostsModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Posts by {modalUser?.firstName} {modalUser?.lastName}
        </DialogTitle>
        <DialogContent dividers>
          {modalPosts.length === 0 ? (
            <Typography>No posts found for this user.</Typography>
          ) : (
            <Box>
              {modalPosts.map((post) => (
                <Box
                  key={post.id}
                  sx={{ display: 'flex', alignItems: 'center', mb: 2, cursor: 'pointer' }}
                  onClick={() => window.open(`/gallery/${post.id}`, '_blank')}
                >
                  <Box
                    component="img"
                    src={post.image_url}
                    alt={post.title}
                    sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1, mr: 2, border: '1px solid #ccc' }}
                  />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {post.title || 'Untitled'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {post.created_at ? new Date(post.created_at).toLocaleDateString() : ''}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPostsModal(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;

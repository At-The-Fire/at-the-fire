import PostCard from '../PostCard/PostCard.js';
import { useNavigate, useLocation } from 'react-router-dom';
import './Dashboard.css';
import DashboardSubMgt from '../Subscription/SubscriptionPages/DashboardSubMgt/DashboardSubMgt.js';
import { downloadInventoryCSV } from '../../services/fetch-utils.js';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  List,
  ListItem,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { fetchStripeCustomerPortal } from '../../services/stripe.js';
import useLoadingState from '../../context/LoadingContext.js';
import Inventory from '../Inventory/Inventory.js';
import { useEffect, useState } from 'react';
import FlamePipe from '../FlamePipe/FlamePipe.js';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTheme } from '@emotion/react';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import UploadIcon from '@mui/icons-material/Upload';
import { usePosts } from '../../hooks/usePosts.js';
import usePostStore from '../../stores/usePostStore.js';
import { useProfileContext } from '../../context/ProfileContext.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { getSellerAuctions, updateAuctionTracking } from '../../services/fetch-auctions.js';
import { getSellerPurchases, updatePurchaseTracking } from '../../services/fetch-purchases.js';
import TrackingModal from '../shared/TrackingModal.js';
import { getTrackingUrl } from '../../utils/tracking.js';
const logo = require('../../assets/logo-icon-6.png');

export default function Dashboard({ products, setProducts, customerId }) {
  // state
  const { bizProfile, profileLoading } = useProfileContext();
  const { user, authenticateUser, isAuthenticated, isConfirmed } = useAuthStore();

  const { restricted, loading, posts, setPosts } = usePostStore();
  usePosts();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isLargeTablet = useMediaQuery('(max-width:1024px)');
  const { setPageLoading } = useLoadingState();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expanded, setExpanded] = useState(!isLargeTablet);
  const postsPerPage = 6;

  // Posts / Auctions toggle
  const location = useLocation();
  const [dashboardView, setDashboardView] = useState(location.state?.view === 'auctions' ? 'auctions' : 'posts');
  const [sellerAuctions, setSellerAuctions] = useState([]);
  const [auctionsLoading, setAuctionsLoading] = useState(false);
  const [auctionFilter, setAuctionFilter] = useState('all');

  // Sales (seller tracking) state
  const [sellerPurchases, setSellerPurchases] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [trackingModal, setTrackingModal] = useState({ open: false, type: null, id: null });
  const [trackingLoading, setTrackingLoading] = useState(false);

  const dashboardToggleButtonGroupSx = {
    '& .MuiToggleButton-root': {
      textTransform: 'none',
    },
  };

  // auction filter
  const filteredAuctions = sellerAuctions.filter((a) => {
    if (auctionFilter === 'active') return a.isActive;
    if (auctionFilter === 'closed') return !a.isActive;
    return true;
  });

  // pagination
  const postsFilteredByCategory = posts.filter((post) => !selectedCategory || post.category === selectedCategory);
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  // Slice the postsFilteredByCategory to show only the posts for the current page
  const currentPosts = postsFilteredByCategory.slice(indexOfFirstPost, indexOfLastPost);

  const newSubscriberProfileNav = () => {
    toast.dismiss('new-subscriber');
    navigate(`/profile/${user}`);
  };

  // check auth
  useEffect(() => {
    if (!isAuthenticated) {
      authenticateUser();
    }
  }, []);

  useEffect(() => {
    if (!bizProfile?.logoImageUrl && !profileLoading && isAuthenticated && isConfirmed) {
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
              Welcome to your dashboard!
            </Typography>
          </Box>

          <Box sx={{ paddingTop: '65px' }}>
            {' '}
            <Typography>Your branding steps:</Typography>
            <List sx={{ listStyleType: 'disc' }}>
              <ListItem sx={{ display: 'list-item', fontWeight: '600' }}>
                {' '}
                Add your business name and logo (required)
              </ListItem>
              <ListItem sx={{ display: 'list-item', fontWeight: '600' }}>Add your website URL</ListItem>
              <ListItem sx={{ display: 'list-item', fontWeight: '600' }}>Connect your social media accounts</ListItem>
            </List>
            <Typography>
              Your business logo will then appear on your posts. Your posts (data) will populate the graphs, calendar,
              and accounting summaries in the other tabs, as well as create tabs in your profile categorizing all your
              work.
            </Typography>
            <Typography sx={{ marginTop: '1rem' }}>
              Please see our User Guide (in the menu) if you would like some guidance on how everything works.
            </Typography>
            <Typography
              variant="body2"
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
              Click on this message or navigate to your profile through the menu on the top right. Once your logo is
              uploaded this message will no longer appear.
            </Typography>
          </Box>
        </Box>,
        {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          onClick: () => newSubscriberProfileNav(),
          toastId: 'new-subscriber',
          className: 'new-subscriber',
          autoClose: false,
        }
      );
    }
  }, []);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(postsFilteredByCategory.length / postsPerPage));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [postsFilteredByCategory.length, currentPage, postsPerPage]);

  // functions
  const navigate = useNavigate();

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };
  const handleDownloadCSV = () => {
    downloadInventoryCSV();
  };

  const handleNewPost = () => {
    navigate('/dashboard/new');
  };

  const handleOpenCustomerPortal = async () => {
    setPageLoading(true);
    const data = await fetchStripeCustomerPortal({ customerId });

    return data;
  };

  const handleNavToRenewSubscription = () => {
    navigate('/subscription');
  };

  const handleAccordionChange = (event, isExpanded) => {
    setExpanded(isExpanded);
  };

  useEffect(() => {
    if (dashboardView !== 'sales') return;
    setSalesLoading(true);
    Promise.all([getSellerPurchases(), user ? getSellerAuctions(user) : Promise.resolve([])])
      .then(([purchases, auctions]) => {
        setSellerPurchases(Array.isArray(purchases) ? purchases : []);
        setSellerAuctions(Array.isArray(auctions) ? auctions : []);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Error fetching sales:', err);
        toast.error('Failed to load sales');
      })
      .finally(() => setSalesLoading(false));
  }, [dashboardView, user]);

  const handleTrackingSubmit = async (trackingNumber) => {
    setTrackingLoading(true);
    try {
      if (trackingModal.type === 'purchase') {
        await updatePurchaseTracking(trackingModal.id, trackingNumber);
        setSellerPurchases((prev) => prev.map((p) => (p.id === trackingModal.id ? { ...p, trackingNumber } : p)));
      } else {
        await updateAuctionTracking(trackingModal.id, trackingNumber);
        setSellerAuctions((prev) => prev.map((a) => (a.id === trackingModal.id ? { ...a, trackingNumber } : a)));
      }
      toast.success('Tracking number saved');
      setTrackingModal({ open: false, type: null, id: null });
    } catch (err) {
      toast.error(err.message || 'Failed to save tracking');
    } finally {
      setTrackingLoading(false);
    }
  };

  useEffect(() => {
    if (dashboardView !== 'auctions' || !user) return;
    setAuctionsLoading(true);
    getSellerAuctions(user)
      .then((data) => {
        const all = Array.isArray(data) ? data : [];
        setSellerAuctions(all);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Error fetching seller auctions:', err);
      })
      .finally(() => setAuctionsLoading(false));
  }, [dashboardView, user]);

  const renderAuctionsContent = () => {
    if (auctionsLoading) {
      return <Typography>Loading auctions...</Typography>;
    }
    if (filteredAuctions.length === 0) {
      return (
        <Typography sx={{ color: 'text.secondary' }}>
          {sellerAuctions.length === 0 ? 'No auctions yet.' : 'No auctions match this filter.'}
        </Typography>
      );
    }
    return filteredAuctions.map((auction) => (
      <Box
        key={auction.id}
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: { xs: '60px 1fr auto', sm: '100px 1fr auto', md: '100px 1fr 160px auto' },
          alignItems: 'center',
          minHeight: { xs: '60px', sm: '100px' },
          border: '1px solid',
          borderColor: 'divider',
          mb: '4px',
          backgroundColor: 'rgba(255,255,255,0.07)',
          overflow: 'hidden',
        }}
      >
        {/* Thumbnail */}
        {auction.imageUrls?.[0] ? (
          <Box
            component="img"
            src={auction.imageUrls[0]}
            alt={auction.title}
            sx={{
              width: { xs: '60px', sm: '100px' },
              height: { xs: '60px', sm: '100px' },
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
            }}
          />
        ) : (
          <Box
            sx={{
              width: { xs: '60px', sm: '100px' },
              height: { xs: '60px', sm: '100px' },
              backgroundColor: 'rgba(255,255,255,0.05)',
            }}
          />
        )}

        {/* Title + status + bid */}
        <Box sx={{ px: 1.5, overflow: 'hidden' }}>
          <Typography
            fontWeight={700}
            sx={{
              fontSize: { xs: '.8rem', sm: '.9rem' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: { xs: 'nowrap', sm: 'normal' },
            }}
          >
            {auction.title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: { xs: '.7rem', sm: '.8rem' } }}>
            {auction.isActive ? '🟢 Active' : '⚫ Closed'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: { xs: '.7rem', sm: '.8rem' } }}>
            Bid: ${Number(auction.currentBid || auction.startPrice).toLocaleString()}
          </Typography>
        </Box>

        {/* End date — md+ only */}
        <Box sx={{ display: { xs: 'none', md: 'block' }, px: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '.8rem', whiteSpace: 'nowrap' }}>
            Ends {new Date(auction.endTime).toLocaleDateString()}
          </Typography>
        </Box>

        {/* Edit button */}
        <Box sx={{ pr: 1.5 }}>
          <Button size="small" variant="outlined" disabled={!auction.isActive} onClick={() => navigate(`/dashboard/auctions/${auction.id}/edit`)}>
            Edit
          </Button>
        </Box>
      </Box>
    ));
  };

  return (
    (loading && (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          margin: !isMobile && '150px',
        }}
      >
        <Typography variant="h5" sx={{ color: (theme) => theme.palette.primary.light }}>
          Loading Dashboard <span className="animated-ellipsis">.</span>
          <span className="animated-ellipsis">.</span>
          <span className="animated-ellipsis ">.</span>
        </Typography>
        <FlamePipe />
      </Box>
    )) || (
      <Box sx={{ paddingTop: 0 }}>
        {/* Posts / Auctions view toggle */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
            top: '-50px',
            // border: '2px solid red',
          }}
        >
          <ToggleButtonGroup
            value={dashboardView}
            exclusive
            onChange={(_, val) => val && setDashboardView(val)}
            size="small"
            sx={{
              marginTop: '22px',
              ...dashboardToggleButtonGroupSx,
            }}
          >
            <ToggleButton value="posts">Posts</ToggleButton>
            <ToggleButton value="auctions">Auctions</ToggleButton>
            <ToggleButton value="sales">Sales</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Auctions view */}
        {dashboardView === 'auctions' && (
          <>
            {/* Mobile buttons bar — mirrors posts mobile bar */}
            <Box className="mobile-dashboard-buttons">
              <Button
                size="small"
                variant="contained"
                onClick={() => navigate('/dashboard/auctions/new')}
                sx={{ fontSize: '.7rem', padding: '10px 5px' }}
              >
                New Auction
              </Button>
            </Box>

            {/* 3-column container — same structure as posts */}
            <Box
              className="admin-container dashboard-admin-container"
              sx={{
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: (theme) => theme.palette.primary.dark,
                boxSizing: 'border-box',
                width: '100%',
                maxWidth: '100%',
                overflowX: 'hidden',
                padding: 0,
                display: isMobile ? '' : 'grid',
                transform: 'translate(0px, -5%)',
              }}
            >
              {/* LEFT PANEL */}
              <aside className="admin-panel">
                <section className="admin-panel-section">
                  <div className="button-container">
                    <Typography variant="h5">Auction Management</Typography>
                    <div className="inner-button-container">
                      <Button
                        size="medium"
                        variant="contained"
                        onClick={() => navigate('/dashboard/auctions/new')}
                        startIcon={<UploadIcon />}
                        sx={{ width: '300px', marginTop: '20px' }}
                      >
                        New Auction
                      </Button>
                    </div>

                    {/* Stats + filter (left-panel small-screen slot) */}
                    <Box
                      sx={{
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: (theme) => theme.palette.primary.dark,
                      }}
                      className="small-size-inventory"
                    >
                      <Typography variant="subtitle2" sx={{ p: 1, fontWeight: 700 }}>
                        Summary
                      </Typography>
                      <Box sx={{ px: 1, pb: 1 }}>
                        <Typography variant="body2">Total: {sellerAuctions.length}</Typography>
                        <Typography variant="body2" sx={{ color: 'success.main' }}>
                          Active: {sellerAuctions.filter((a) => a.isActive).length}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Closed: {sellerAuctions.filter((a) => !a.isActive).length}
                        </Typography>
                      </Box>

                      <Typography variant="subtitle2" sx={{ p: 1, fontWeight: 700 }}>
                        Filter by Status
                      </Typography>
                      <ToggleButtonGroup
                        value={auctionFilter}
                        exclusive
                        onChange={(_, val) => val && setAuctionFilter(val)}
                        size="small"
                        orientation="vertical"
                        sx={{ width: '100%', px: 1, pb: 1, ...dashboardToggleButtonGroupSx }}
                      >
                        <ToggleButton value="all" sx={{ justifyContent: 'flex-start' }}>
                          All ({sellerAuctions.length})
                        </ToggleButton>
                        <ToggleButton value="active" sx={{ justifyContent: 'flex-start', color: 'success.main' }}>
                          Active ({sellerAuctions.filter((a) => a.isActive).length})
                        </ToggleButton>
                        <ToggleButton value="closed" sx={{ justifyContent: 'flex-start' }}>
                          Closed ({sellerAuctions.filter((a) => !a.isActive).length})
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>

                    <div className="temp-fix"></div>

                    <Typography variant="h5" style={{ textAlign: 'center', paddingLeft: '0px', marginTop: '2rem' }}>
                      Subscription Management
                    </Typography>
                    <DashboardSubMgt />
                  </div>
                </section>
              </aside>

              {/* CENTER LIST */}
              <div className="list-container">
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    margin: 'auto',
                    justifySelf: 'center',
                  }}
                >
                  <Typography sx={{ color: 'green' }}>
                    {filteredAuctions.length} auction{filteredAuctions.length !== 1 ? 's' : ''}
                    {auctionFilter !== 'all' ? ` · ${auctionFilter}` : ''}
                  </Typography>
                </Box>
                {renderAuctionsContent()}
              </div>

              {/* RIGHT PANEL — visible at 1600px+ */}
              <Box
                sx={{
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: (theme) => theme.palette.primary.dark,
                }}
                className="large-size-inventory"
              >
                <Accordion
                  expanded={expanded}
                  onChange={handleAccordionChange}
                  disabled={!isLargeTablet}
                  sx={{ backgroundColor: 'rgb(40, 40, 40)' }}
                >
                  {isLargeTablet && (
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>Filter / Status</AccordionSummary>
                  )}
                  <AccordionDetails>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                      Summary
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      Total: {sellerAuctions.length}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'success.main', mb: 0.5 }}>
                      Active: {sellerAuctions.filter((a) => a.isActive).length}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      Closed: {sellerAuctions.filter((a) => !a.isActive).length}
                    </Typography>

                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                      Filter by Status
                    </Typography>
                    <ToggleButtonGroup
                      value={auctionFilter}
                      exclusive
                      onChange={(_, val) => val && setAuctionFilter(val)}
                      size="small"
                      orientation="vertical"
                      sx={{ width: '100%', ...dashboardToggleButtonGroupSx }}
                    >
                      <ToggleButton value="all" sx={{ justifyContent: 'flex-start' }}>
                        All ({sellerAuctions.length})
                      </ToggleButton>
                      <ToggleButton value="active" sx={{ justifyContent: 'flex-start', color: 'success.main' }}>
                        Active ({sellerAuctions.filter((a) => a.isActive).length})
                      </ToggleButton>
                      <ToggleButton value="closed" sx={{ justifyContent: 'flex-start' }}>
                        Closed ({sellerAuctions.filter((a) => !a.isActive).length})
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </AccordionDetails>
                </Accordion>
              </Box>
            </Box>
          </>
        )}

        {/* Sales view — seller tracking */}
        {dashboardView === 'sales' && (
          <>
            <Box
              className="admin-container dashboard-admin-container"
              sx={{
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: (theme) => theme.palette.primary.dark,
                padding: 0,
                boxSizing: 'border-box',
                width: '100%',
                maxWidth: '100%',
                overflowX: 'hidden',
                display: isMobile ? '' : 'grid',
                flexDirection: { xs: 'column', sm: 'column' },
                alignItems: { xs: 'stretch', sm: 'stretch' },
                transform: 'translate(0px, -5%)',
              }}
            >
              {/* LEFT PANEL */}
              <aside className="admin-panel">
                <section className="admin-panel-section">
                  <div className="button-container">
                    <Typography variant="h5">Sales &amp; Shipping</Typography>

                    <Box
                      sx={{
                        mt: 2,
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <Box
                        sx={{
                          px: 1,
                          pb: 1,
                          display: 'grid',
                          gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) minmax(0, 1fr)' },
                          columnGap: 2,
                          rowGap: 1,
                        }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, width: '100%' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'left' }}>
                              Gallery Sales:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>
                              {sellerPurchases.length}
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, width: '100%' }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'left' }}>
                              Need tracking:
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'right' }}>
                              {sellerPurchases.filter((s) => !s.trackingNumber).length}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, width: '100%' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'left' }}>
                              Closed Auctions:
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700, textAlign: 'right', marginRight: '.5rem' }}
                            >
                              {sellerAuctions.filter((a) => !a.isActive).length}
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, width: '100%' }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'left' }}>
                              Need tracking:
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: 'text.secondary', textAlign: 'right', marginRight: '.5rem' }}
                            >
                              {sellerAuctions.filter((a) => !a.isActive && !a.trackingNumber).length}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>

                    <div className="temp-fix"></div>

                    <Typography variant="h5" style={{ textAlign: 'center', paddingLeft: '0px', marginTop: '2rem' }}>
                      Subscription Management
                    </Typography>
                    <DashboardSubMgt />
                  </div>
                </section>
              </aside>

              {/* CENTER LIST */}
              <div
                className="list-container"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: isMobile ? '0 8px' : undefined,
                  maxWidth: '100%',
                  marginTop: '1rem',
                  overflowX: 'hidden',
                }}
              >
                {salesLoading ? (
                  <Typography>Loading sales...</Typography>
                ) : (
                  <>
                    {/* Gallery Post Sales */}
                    <Typography variant="h6" sx={{ margin: '0 0 4px 10px', fontWeight: 700 }}>
                      Gallery Post Sales ({sellerPurchases.length})
                    </Typography>
                    {sellerPurchases.length === 0 ? (
                      <Typography sx={{ color: 'text.secondary', mb: 3 }}>No gallery sales yet.</Typography>
                    ) : (
                      sellerPurchases.map((sale) => (
                        <Box
                          key={sale.id}
                          sx={{
                            width: '100%',
                            display: 'grid',
                            gridTemplateColumns: {
                              xs: '60px 1fr auto',
                              sm: '80px 1fr auto',
                              md: '80px minmax(0, 1fr) 160px 200px auto',
                              lg: '80px minmax(0, 1fr) 200px 260px auto',
                            },
                            alignItems: 'center',
                            border: '1px solid',
                            borderColor: 'divider',
                            mb: 1,
                            borderRadius: 1,
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            overflow: 'hidden',
                          }}
                        >
                          {sale.imageUrls?.[0] ? (
                            <Box
                              component="img"
                              src={sale.imageUrls[0]}
                              alt={sale.title}
                              sx={{ width: { xs: 60, sm: 80 }, height: { xs: 60, sm: 80 }, objectFit: 'cover' }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: { xs: 60, sm: 80 },
                                height: { xs: 60, sm: 80 },
                                backgroundColor: 'rgba(255,255,255,0.05)',
                              }}
                            />
                          )}
                          <Box sx={{ px: 1.5, overflow: 'hidden' }}>
                            <Typography
                              fontWeight={700}
                              sx={{
                                fontSize: { xs: '.8rem', sm: '.9rem' },
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                textAlign: 'left',
                              }}
                            >
                              {sale.title || `Post #${sale.itemId}`}
                            </Typography>

                            {/* Mobile / small-screen details */}
                            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                              <Typography
                                variant="body2"
                                sx={{ color: 'text.secondary', fontSize: '.75rem', textAlign: 'left' }}
                              >
                                ${Number(sale.amountPaid).toFixed(2)} · qty {sale.quantity} ·{' '}
                                {new Date(sale.createdAt).toLocaleDateString()}
                              </Typography>
                              {sale.trackingNumber ? (
                                (() => {
                                  const tr = getTrackingUrl(sale.trackingNumber);
                                  return (
                                    <Typography variant="body2" sx={{ fontSize: '.75rem', textAlign: 'left' }}>
                                      📦{tr.carrier ? ` ${tr.carrier}: ` : ' '}
                                      <a
                                        href={tr.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'inherit' }}
                                      >
                                        {sale.trackingNumber}
                                      </a>
                                    </Typography>
                                  );
                                })()
                              ) : (
                                <Typography
                                  variant="body2"
                                  sx={{ fontSize: '.75rem', color: 'text.secondary', textAlign: 'left' }}
                                >
                                  No tracking yet
                                </Typography>
                              )}
                            </Box>
                          </Box>

                          {/* Desktop columns */}
                          <Box sx={{ display: { xs: 'none', md: 'block' }, px: 1.5 }}>
                            <Typography
                              variant="body2"
                              sx={{ color: 'text.secondary', fontSize: '.8rem', textAlign: 'left' }}
                            >
                              ${Number(sale.amountPaid).toFixed(2)}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: 'text.secondary', fontSize: '.8rem', textAlign: 'left' }}
                            >
                              qty {sale.quantity}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: 'text.secondary', fontSize: '.8rem', textAlign: 'left' }}
                            >
                              {new Date(sale.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>

                          <Box sx={{ display: { xs: 'none', md: 'block' }, px: 1.5, overflow: 'hidden' }}>
                            {sale.trackingNumber ? (
                              (() => {
                                const tr = getTrackingUrl(sale.trackingNumber);
                                return (
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: '.8rem',
                                      textAlign: 'left',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    📦{tr.carrier ? ` ${tr.carrier}: ` : ' '}
                                    <a
                                      href={tr.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: 'inherit' }}
                                    >
                                      {sale.trackingNumber}
                                    </a>
                                  </Typography>
                                );
                              })()
                            ) : (
                              <Typography
                                variant="body2"
                                sx={{ fontSize: '.8rem', color: 'text.secondary', textAlign: 'left' }}
                              >
                                No tracking yet
                              </Typography>
                            )}
                          </Box>

                          <Box sx={{ pr: 1.5 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setTrackingModal({ open: true, type: 'purchase', id: sale.id })}
                            >
                              {sale.trackingNumber ? 'Update' : 'Add Tracking'}
                            </Button>
                          </Box>
                        </Box>
                      ))
                    )}

                    {/* Closed Auction Results */}
                    <Typography variant="h6" sx={{ margin: '0 0 0 10px', fontWeight: 700 }}>
                      Closed Auctions ({sellerAuctions.filter((a) => !a.isActive).length})
                    </Typography>
                    {sellerAuctions.filter((a) => !a.isActive).length === 0 ? (
                      <Typography sx={{ color: 'text.secondary' }}>No closed auctions yet.</Typography>
                    ) : (
                      sellerAuctions
                        .filter((a) => !a.isActive)
                        .map((auction) => (
                          <Box
                            key={auction.id}
                            sx={{
                              width: '100%',
                              display: 'grid',
                              gridTemplateColumns: {
                                xs: '60px 1fr auto',
                                sm: '80px 1fr auto',
                                md: '80px minmax(0, 1fr) 160px 200px auto',
                                lg: '80px minmax(0, 1fr) 200px 260px auto',
                              },
                              alignItems: 'center',
                              border: '1px solid',
                              borderColor: 'divider',
                              mb: 1,
                              borderRadius: 1,
                              backgroundColor: 'rgba(255,255,255,0.05)',
                              overflow: 'hidden',
                            }}
                          >
                            {auction.imageUrls?.[0] ? (
                              <Box
                                component="img"
                                src={auction.imageUrls[0]}
                                alt={auction.title}
                                sx={{ width: { xs: 60, sm: 80 }, height: { xs: 60, sm: 80 }, objectFit: 'cover' }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: { xs: 60, sm: 80 },
                                  height: { xs: 60, sm: 80 },
                                  backgroundColor: 'rgba(255,255,255,0.05)',
                                }}
                              />
                            )}
                            <Box sx={{ px: 1.5, overflow: 'hidden' }}>
                              <Typography
                                fontWeight={700}
                                sx={{
                                  fontSize: { xs: '.8rem', sm: '.9rem' },
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  textAlign: 'left',
                                }}
                              >
                                {auction.title}
                              </Typography>

                              {/* Mobile / small-screen details */}
                              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                                <Typography
                                  variant="body2"
                                  sx={{ color: 'text.secondary', fontSize: '.75rem', textAlign: 'left' }}
                                >
                                  Final bid: ${Number(auction.currentBid || auction.startPrice).toLocaleString()}
                                </Typography>
                                {auction.trackingNumber ? (
                                  (() => {
                                    const tr = getTrackingUrl(auction.trackingNumber);
                                    return (
                                      <Typography variant="body2" sx={{ fontSize: '.75rem', textAlign: 'left' }}>
                                        📦{tr.carrier ? ` ${tr.carrier}: ` : ' '}
                                        <a
                                          href={tr.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ color: 'inherit' }}
                                        >
                                          {auction.trackingNumber}
                                        </a>
                                      </Typography>
                                    );
                                  })()
                                ) : (
                                  <Typography
                                    variant="body2"
                                    sx={{ fontSize: '.75rem', color: 'text.secondary', textAlign: 'left' }}
                                  >
                                    No tracking yet
                                  </Typography>
                                )}
                              </Box>
                            </Box>

                            {/* Desktop columns */}
                            <Box sx={{ display: { xs: 'none', md: 'block' }, px: 1.5 }}>
                              <Typography
                                variant="body2"
                                sx={{ color: 'text.secondary', fontSize: '.8rem', textAlign: 'left' }}
                              >
                                Final bid
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ color: 'text.secondary', fontSize: '.8rem', textAlign: 'left' }}
                              >
                                ${Number(auction.currentBid || auction.startPrice).toLocaleString()}
                              </Typography>
                            </Box>

                            <Box sx={{ display: { xs: 'none', md: 'block' }, px: 1.5, overflow: 'hidden' }}>
                              {auction.trackingNumber ? (
                                (() => {
                                  const tr = getTrackingUrl(auction.trackingNumber);
                                  return (
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontSize: '.8rem',
                                        textAlign: 'left',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      📦{tr.carrier ? ` ${tr.carrier}: ` : ' '}
                                      <a
                                        href={tr.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'inherit' }}
                                      >
                                        {auction.trackingNumber}
                                      </a>
                                    </Typography>
                                  );
                                })()
                              ) : (
                                <Typography
                                  variant="body2"
                                  sx={{ fontSize: '.8rem', color: 'text.secondary', textAlign: 'left' }}
                                >
                                  No tracking yet
                                </Typography>
                              )}
                            </Box>

                            <Box sx={{ pr: 1.5 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setTrackingModal({ open: true, type: 'auction', id: auction.id })}
                              >
                                {auction.trackingNumber ? 'Update' : 'Add Tracking'}
                              </Button>
                            </Box>
                          </Box>
                        ))
                    )}
                  </>
                )}
              </div>

              {/* Shipping Summary — show on mobile/mid only (desktop has left-panel summary) */}
              {isLargeTablet && (
                <Box
                  sx={{
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: (theme) => theme.palette.primary.dark,
                    position: 'static',
                    width: '100%',
                    order: { xs: -1, sm: -1 },
                  }}
                  className="large-size-inventory"
                >
                  <Box sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75, textAlign: 'center' }}>
                      Shipping Summary
                    </Typography>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: 'minmax(0, 1fr) minmax(0, 1fr)',
                          sm: 'minmax(0, 1fr) minmax(0, 1fr)',
                        },
                        columnGap: 2,
                        rowGap: 0,
                        width: '100%',
                        textAlign: 'left',
                        paddingLeft: '.5rem',
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, width: '100%' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'left' }}>
                            Gallery Sales:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>
                            {sellerPurchases.length}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, width: '100%' }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'left' }}>
                            Need tracking:
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'right' }}>
                            {sellerPurchases.filter((s) => !s.trackingNumber).length}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, width: '100%' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'left' }}>
                            Closed Auctions:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>
                            {sellerAuctions.filter((a) => !a.isActive).length}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, width: '100%' }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'left' }}>
                            Need tracking:
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'right' }}>
                            {sellerAuctions.filter((a) => !a.isActive && !a.trackingNumber).length}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>

            <TrackingModal
              open={trackingModal.open}
              onClose={() => setTrackingModal({ open: false, type: null, id: null })}
              onSubmit={handleTrackingSubmit}
              loading={trackingLoading}
            />
          </>
        )}

        {/* Posts view — only render when dashboardView === 'posts' */}
        {dashboardView === 'posts' && (
          <>
            <Box className="mobile-dashboard-buttons">
              <Button
                size="small"
                variant="contained"
                onClick={handleNewPost}
                sx={{
                  fontSize: '.7rem',
                  padding: '10px 5px',
                }}
                disabled={restricted ? restricted : false}
              >
                New Post
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleDownloadCSV}
                sx={{ fontSize: '.7rem', padding: '10px 5px' }}
              >
                Inventory CSV
              </Button>
              {!restricted ? (
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleOpenCustomerPortal}
                  sx={{ fontSize: '.7rem', padding: '10px 5px' }}
                >
                  Manage Subscription
                </Button>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    backgroundColor: 'yellow',
                    color: 'black',
                    borderRadius: '5px',
                    width: '100px',
                  }}
                >
                  <Button
                    size="small"
                    textAlign={'center'}
                    padding={'10px'}
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      backgroundColor: 'yellow',
                      color: 'black',
                      borderRadius: '5px',
                      width: '100px',
                      fontSize: '.7rem',
                      lineHeight: '1rem',
                    }}
                    onClick={handleNavToRenewSubscription}
                  >
                    Subscription Expired!
                  </Button>
                </Box>
              )}
            </Box>

            <Box
              className="admin-container dashboard-admin-container"
              sx={{
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: (theme) => theme.palette.primary.dark,
                padding: 0,
                display: isMobile ? '' : 'grid',
                transform: 'translate(0px, -5%)',
              }}
            >
              <aside className="admin-panel ">
                <section className="admin-panel-section ">
                  <div className="button-container">
                    <Typography variant="h5">Post Management</Typography>
                    <div className="inner-button-container">
                      {
                        <Button
                          title="New Post"
                          size="medium"
                          variant="contained"
                          onClick={handleNewPost}
                          disabled={restricted ? restricted : false}
                          startIcon={<UploadIcon />}
                          sx={{ width: '300px', marginTop: '20px' }}
                        >
                          {restricted ? 'New Post disabled' : 'New Post'}
                        </Button>
                      }
                      <Button
                        size="medium"
                        variant="outlined"
                        className="new-link download-button"
                        title="Download Inventory CSV"
                        onClick={handleDownloadCSV}
                        startIcon={<CloudDownloadIcon />}
                        sx={{ width: '300px' }}
                      >
                        Inventory CSV
                      </Button>
                    </div>
                    <Box
                      sx={{
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: (theme) => theme.palette.primary.dark,
                      }}
                      className="small-size-inventory"
                    >
                      <Button disabled={!selectedCategory} onClick={() => setSelectedCategory(null)}>
                        Show All Categories
                      </Button>
                      <Inventory
                        posts={posts}
                        onCategorySelect={setSelectedCategory}
                        selectedCategory={selectedCategory}
                      />
                    </Box>
                    <div className="temp-fix"></div>

                    <Typography variant="h5" style={{ textAlign: 'center', paddingLeft: '0px', marginTop: '2rem' }}>
                      Subscription Management
                    </Typography>
                    <DashboardSubMgt />
                  </div>
                </section>
              </aside>

              <div className="list-container">
                {/* Pagination Controls */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    margin: 'auto',
                    justifySelf: 'center',
                  }}
                >
                  <Button
                    onClick={() => setCurrentPage((prevPage) => Math.max(prevPage - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Typography mx={2} sx={{ color: 'green' }}>
                    Page {postsFilteredByCategory.length === 0 ? 0 : currentPage} of{' '}
                    {Math.ceil(postsFilteredByCategory.length / postsPerPage)}
                  </Typography>
                  <Button
                    onClick={() =>
                      setCurrentPage((prevPage) =>
                        currentPage >= Math.ceil(postsFilteredByCategory.length / postsPerPage)
                          ? prevPage
                          : prevPage + 1
                      )
                    }
                    disabled={currentPage >= Math.ceil(postsFilteredByCategory.length / postsPerPage)}
                  >
                    Next
                  </Button>
                </Box>

                {postsFilteredByCategory.length === 0 ? (
                  <>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifySelf: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {posts.length === 0 ? (
                        <>
                          <Typography variant="h5">No posts yet!</Typography>
                          <FlamePipe />
                        </>
                      ) : (
                        <Typography variant="h5" marginTop="50px">
                          No posts for selected category
                        </Typography>
                      )}
                    </Box>
                  </>
                ) : (
                  currentPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      id={post.id}
                      post={post}
                      setPosts={setPosts}
                      posts={posts}
                      products={products}
                      setProducts={setProducts}
                      restricted={restricted}
                    />
                  ))
                )}
              </div>

              <Box
                sx={{
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: (theme) => theme.palette.primary.dark,
                }}
                className="large-size-inventory"
              >
                <Accordion
                  expanded={expanded}
                  onChange={handleAccordionChange}
                  disabled={!isLargeTablet}
                  sx={{ backgroundColor: 'rgb(40, 40, 40)' }}
                >
                  {isLargeTablet && (
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>Inventory/ Category Selector</AccordionSummary>
                  )}
                  <AccordionDetails>
                    <Button
                      style={{ marginTop: '0px' }}
                      disabled={!selectedCategory}
                      onClick={() => {
                        setSelectedCategory(null);
                        setCurrentPage(1);
                      }}
                    >
                      {selectedCategory ? 'Show All Categories' : 'Select Category'}
                    </Button>

                    <Inventory
                      posts={posts}
                      selectedCategory={selectedCategory}
                      onCategorySelect={handleCategorySelect}
                    />
                  </AccordionDetails>
                </Accordion>
              </Box>
              {/*  */}
              {/*  */}
            </Box>
          </>
        )}
      </Box>
    )
  );
}

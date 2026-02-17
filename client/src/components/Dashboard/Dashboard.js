import PostCard from '../PostCard/PostCard.js';
import { Link, useNavigate } from 'react-router-dom';
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
      <Box>
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
          className="admin-container"
          sx={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: (theme) => theme.palette.primary.dark,
            padding: 0,
            display: isMobile ? '' : 'grid',
            transform: 'translate(0px, -2.5%)',
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
                  <Inventory posts={posts} onCategorySelect={setSelectedCategory} selectedCategory={selectedCategory} />
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
                    currentPage >= Math.ceil(postsFilteredByCategory.length / postsPerPage) ? prevPage : prevPage + 1
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

                <Inventory posts={posts} selectedCategory={selectedCategory} onCategorySelect={handleCategorySelect} />
              </AccordionDetails>
            </Accordion>
          </Box>
          {/*  */}
          {/*  */}
        </Box>
      </Box>
    )
  );
}

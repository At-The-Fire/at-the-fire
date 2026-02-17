import React, { useEffect, useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { CssBaseline, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import Dashboard from '../Dashboard/Dashboard.js';
import Products from '../Products/Products.js';
import Analysis from '../Analysis/Analysis.js';
import { useProducts } from '../../hooks/useProducts.js';
import Calendar from '../Calendar/Calendar.js';
import { useNavigate } from 'react-router-dom';
import PostTracking from '../PostTracking/PostTracking.js';
import { postNewSnapshot } from '../../services/fetch-inventory.js';
import Orders from '../Orders/Orders.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import usePostStore from '../../stores/usePostStore.js';
import useSnapshotStore from '../../stores/useSnapshotStore.js';
import { useAuthStore } from '../../stores/useAuthStore.js';

// TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  const navigate = useNavigate();
  const { authenticateUser, isAuthenticated, error, signingOut, checkTokenExpiry } = useAuthStore();

  // Authenticate and check tokens
  useEffect(() => {
    if (!isAuthenticated && !error && !signingOut) {
      authenticateUser();
    } else if (isAuthenticated) {
      checkTokenExpiry();
    }
  }, [isAuthenticated, error, authenticateUser, signingOut, checkTokenExpiry]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/sign-in');
      return;
    }
  }, [isAuthenticated, navigate, error]);

  return (
    <div
      style={{ marginTop: '0px' }}
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ padding: '24px 0 0 0 ' }}>{children}</Box>}
    </div>
  );
}
TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};
function createTabs(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}
export default function BasicTabs() {
  // Initial state now tries to get from localStorage, falling back to 0
  const [value, setValue] = useState(() => {
    const savedTab = localStorage.getItem('dashboardTab');
    return savedTab !== null ? parseInt(savedTab) : 0;
  });

  const addSnapshot = useSnapshotStore((state) => state.addSnapshot);
  const snapshots = useSnapshotStore((state) => state.snapshots);

  const { products, setProducts, loadingProducts, setLoadingProducts, fetchProducts } = useProducts();

  const { error, customerId, loadingCustomerId, verifyAuth, isConfirmed } = useAuthStore();

  const handleChange = async (event, newValue) => {
    const isValid = await verifyAuth('tabs');

    if (!isValid) {
      return;
    }
    setValue(newValue);
    localStorage.setItem('dashboardTab', newValue.toString());
  };

  const { restricted, posts, loading, setPosts, postError } = usePostStore();
  //
  const navigate = useNavigate();

  // state/ functions for inventory tracking

  useEffect(() => {
    if (!customerId && !loadingCustomerId) {
      navigate('/auth/sign-in');
    }
  }, [customerId, navigate, loadingCustomerId]);

  let postCategoryCounts = {};
  let postPriceCounts = {};

  const handleSaveSnapshot = async () => {
    // Calculate fresh counts here, before creating the snapshot
    const freshCategoryCounts = {};
    const freshPriceCounts = {};
    for (let post of posts) {
      if (freshCategoryCounts[post.category]) {
        freshCategoryCounts[post.category]++;
      } else {
        freshCategoryCounts[post.category] = 1;
      }

      if (freshPriceCounts[post.category]) {
        freshPriceCounts[post.category] += parseFloat(post.price) || 0;
      } else {
        freshPriceCounts[post.category] = parseFloat(post.price) || 0;
      }
    }

    const snapshot = {
      category_count: freshCategoryCounts,
      price_count: freshPriceCounts,
    };

    try {
      const newSnapshot = await postNewSnapshot(snapshot);

      if (newSnapshot.willBeNewSnapShot === false) {
        toast.warn('No new data to display', {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          autoClose: true,
        });
        return;
      }
      addSnapshot(newSnapshot);
      // setSnapshots((prevSnapshots) => [...prevSnapshots, newSnapshot]);
      // setTableData;
    } catch (e) {
      if (e.code === 401 || e.code === 403) {
        useAuthStore.getState().handleAuthError(e.code, e.message);
      } else {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error saving snapshots:', e);
        }
        useAuthStore.getState().setError(e.code);
        toast.error(`Error saving snapshots: ${e.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'dashboardTabs-1',
          autoClose: false,
        });
      }
    }
  };

  // TODO trying to get snapshots to update when a new post is created  - haven't figured it out yet 12/4
  // console.log('posts in DashboardTabs', posts);
  // console.log('snapshots in DashboardTabs', snapshots);
  // useEffect(() => {
  //   // refreshInventoryData();
  //   handleSaveSnapshot();
  // });
  const [tableData, setTableData] = useState({});
  return !isConfirmed || error === 403 ? (
    <Box sx={{ paddingTop: '200px', width: '350px', margin: 'auto', textAlign: 'left' }}>
      <Typography sx={{ marginBottom: '20px', fontWeight: '700' }}>
        You do not have permission to view this page.
      </Typography>
      {customerId && (
        <Typography marginBottom={'20px'}>{`You seem to have a customer ID ${isConfirmed ? 'and' : 'but'} your customer 
        status in our database is ${isConfirmed ? 'confirmed so something went wrong.' : 'unconfirmed.'}`}</Typography>
      )}

      <Typography>
        {`${
          isConfirmed
            ? 'Please reach out to our support on our contact page and let us know.'
            : 'This indicates a problem with the transaction, please reach out to let us know.'
        }`}
      </Typography>
    </Box>
  ) : (
    <Box sx={{ margin: '80px auto 0 auto', width: '100%' }}>
      <CssBaseline />
      <Box sx={{ borderBottom: 0, borderColor: 'divider', height: '55px', margin: '0px' }}>
        <Tabs
          variant="scrollable"
          scrollButtons
          allowScrollButtonsMobile
          value={value}
          onChange={handleChange}
          aria-label="main dashboard navigation tabs"
          sx={{
            transform: 'translate(0%, -8%)',
          }}
        >
          <Tab label="Dashboard" {...createTabs(0)} />
          <Tab label="Post Tracking" {...createTabs(1)} />
          <Tab label="Orders" {...createTabs(2)} />
          <Tab label="Products" {...createTabs(3)} />
          <Tab label="Calendar" {...createTabs(4)} />
          <Tab label="Analysis" {...createTabs(5)} />
        </Tabs>
      </Box>

      <TabPanel value={value} index={0}>
        <Dashboard
          products={products}
          setProducts={setProducts}
          error={error}
          postError={postError}
          restricted={restricted}
          posts={posts}
          loading={loading}
          setPosts={setPosts}
          customerId={customerId}
        />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <PostTracking
          customerId={customerId}
          postCategoryCounts={postCategoryCounts}
          postPriceCounts={postPriceCounts}
          error={error}
          postError={postError}
          loading={loading}
          handleSaveSnapshot={handleSaveSnapshot}
          tableData={tableData}
          setTableData={setTableData}
          snapshots={snapshots}
        />
      </TabPanel>

      <TabPanel value={value} index={2}>
        <Orders error={error} />
      </TabPanel>
      <TabPanel value={value} index={3}>
        <Products
          products={products}
          setProducts={setProducts}
          fetchProducts={fetchProducts}
          error={error}
          postError={postError}
          loadingProducts={loadingProducts}
          setLoadingProducts={setLoadingProducts}
        />
      </TabPanel>
      <TabPanel value={value} index={4}>
        <Calendar products={products} error={error} />
      </TabPanel>
      <TabPanel value={value} index={5}>
        <Analysis
          products={products}
          error={error}
          postError={postError}
          loading={loading}
          sx={{ width: '100%', height: '100%' }}
        />
      </TabPanel>
    </Box>
  );
}

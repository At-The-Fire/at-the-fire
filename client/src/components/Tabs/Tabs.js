import * as React from 'react';
import PropTypes from 'prop-types';
import Tabs, { tabsClasses } from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { CssBaseline } from '@mui/material';
import UserGallery from '../Gallery/UserGallery.js';
// import { useProfile } from '../../hooks/useProfile.js';
import { useParams } from 'react-router-dom';
import './Tabs.css';
import { useProfile } from '../../hooks/useProfile.js';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default function BasicTabs() {
  const [value, setValue] = React.useState(0);
  const { sub } = useParams();
  const { posts } = useProfile(sub); // posts from the profile hook instead of usePosts/ useGalleryPosts since they are public but also need to be filtered by the user
  // const { posts } = useProfileContext(); // posts from the profile hook instead of usePosts/ useGalleryPosts since they are public but also need to be filtered by the user

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const beadsPosts = posts.filter((post) => post.category === 'Beads');
  const bluntTipsPosts = posts.filter((post) => post.category === 'Blunt Tips');
  const bubblersPosts = posts.filter((post) => post.category === 'Bubblers');
  const collabsPosts = posts.filter((post) => post.category === 'Collabs');
  const cupsPosts = posts.filter((post) => post.category === 'Cups');
  const dryPiecesPosts = posts.filter((post) => post.category === 'Dry Pieces');
  const gobletsPosts = posts.filter((post) => post.category === 'Goblets');
  const isoStationsPosts = posts.filter((post) => post.category === 'Iso Stations');
  const marblesPosts = posts.filter((post) => post.category === 'Marbles');
  const pendantsPosts = posts.filter((post) => post.category === 'Pendants');
  const recyclersPosts = posts.filter((post) => post.category === 'Recyclers');
  const rigsPosts = posts.filter((post) => post.category === 'Rigs');
  const slidesPosts = posts.filter((post) => post.category === 'Slides');
  const spinnerCapsPosts = posts.filter((post) => post.category === 'Spinner Caps');
  const terpPearlsPosts = posts.filter((post) => post.category === 'Terp Pearls');
  const miscPosts = posts.filter((post) => post.category === 'Misc.');

  const categories = [
    { label: 'All Posts', data: posts },
    { label: 'Beads', data: beadsPosts },
    { label: 'Blunt Tips', data: bluntTipsPosts },
    { label: 'Bubblers', data: bubblersPosts },
    { label: 'Collabs', data: collabsPosts },
    { label: 'Cups', data: cupsPosts },
    { label: 'Dry Pieces', data: dryPiecesPosts },
    { label: 'Goblets', data: gobletsPosts },
    { label: 'Iso Stations', data: isoStationsPosts },
    { label: 'Marbles', data: marblesPosts },
    { label: 'Pendants', data: pendantsPosts },
    { label: 'Recyclers', data: recyclersPosts },
    { label: 'Rigs', data: rigsPosts },
    { label: 'Slides', data: slidesPosts },
    { label: 'Spinner Caps', data: spinnerCapsPosts },
    { label: 'Terp Pearls', data: terpPearlsPosts },
    { label: 'Misc.', data: miscPosts },
  ];
  const filteredCategories = categories.filter((category) => category.data.length > 0);

  // actual function return ===========================
  return (
    <Box
      sx={{
        width: '100%',
        '& .css-19kzrtu': {
          // backgroundColor: 'blue',
          padding: '20px 0 0 0',
          // position: 'relative',
          // top: '15px',
        },
      }}
    >
      <CssBaseline />
      <Box sx={{ borderBottom: 1, borderColor: 'divider', height: '65px' }}>
        <Tabs
          variant="scrollable"
          scrollButtons
          allowScrollButtonsMobile
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
          sx={{
            // selects all of the non-active tabs for styling
            '& .MuiTab-root[aria-selected=false]': {
              color: 'lightgreen',
              opacity: 0.4,
              transition: '250ms ease-in-out',
            },
            // the highlighted tab
            '& .Mui-selected': {
              color: '#42ad52 !important',
              opacity: '1 !important',
              transition: '250ms ease-in-out',
            },
            // scroll buttons on either side of the tabsList
            [`& .${tabsClasses.scrollButtons}`]: {
              color: 'lightgreen',
              '&.Mui-disabled': {
                color: 'lightgreen',
                opacity: 0.3,
              },
            },
            [`& .${tabsClasses.indicator}`]: {
              backgroundColor: '#42ad52',
            },
            zIndex: '500',
          }}
        >
          {filteredCategories.map((category, index) => (
            <Tab key={index} label={category.label} {...a11yProps(index)} />
          ))}
        </Tabs>
      </Box>

      {filteredCategories.map((category, index) => (
        <TabPanel key={index} value={value} index={index}>
          <Box className="gallery-tab-container">
            <UserGallery data={category.data} />
          </Box>
        </TabPanel>
      ))}
    </Box>
  );
}

import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTheme } from '@mui/material/styles';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { getPurchases } from '../../services/fetch-purchases.js';
import { getTrackingUrl } from '../../utils/tracking.js';

const BASE_URL = process.env.REACT_APP_BASE_URL;

async function getUserAuctions(sub) {
  const resp = await fetch(`${BASE_URL}/api/v1/auctions/user-auctions/${sub}`, {
    credentials: 'include',
  });
  if (!resp.ok) throw new Error('Failed to fetch auctions');
  return resp.json();
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

function TrackingDisplay({ trackingNumber }) {
  if (!trackingNumber)
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  const result = getTrackingUrl(trackingNumber);
  return (
    <Link
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      underline="none"
      color="text.primary"
      sx={{
        display: 'inline-block',
        position: 'relative',
        fontWeight: 500,
        textDecoration: 'none',
        '&::after': {
          content: '""',
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -2,
          height: 2,
          backgroundColor: 'currentColor',
          opacity: 0,
          transition: 'opacity 420ms cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '&:hover': {
          '&::after': {
            opacity: 1,
          },
        },
        '&:focus-visible': {
          '&::after': {
            opacity: 1,
          },
          outline: '2px solid',
          outlineColor: (theme) => theme.palette.text.primary,
          outlineOffset: 2,
          borderRadius: 2,
        },
        '@media (prefers-reduced-motion: reduce)': {
          '&::after': {
            transition: 'none',
          },
        },
      }}
    >
      {result.carrier ? `${result.carrier}: ` : ''}
      {trackingNumber}
    </Link>
  );
}

export default function MyPurchases() {
  const { user: sub } = useAuthStore();
  const [purchases, setPurchases] = useState([]);
  const [activeBids, setActiveBids] = useState([]);
  const [wonAuctions, setWonAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expandedSection, setExpandedSection] = useState('gallery');

  useEffect(() => {
    if (!sub) return;

    async function fetchAll() {
      try {
        setLoading(true);
        const [purchasesData, auctionData] = await Promise.all([getPurchases(), getUserAuctions(sub)]);
        setPurchases(purchasesData);
        setActiveBids(auctionData.activeAuctionBids || []);
        setWonAuctions(auctionData.wonAuctions || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [sub]);

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <CircularProgress />
      </Box>
    );
  if (error)
    return (
      <Typography color="error" sx={{ m: 4 }}>
        {error}
      </Typography>
    );

  const handleSectionChange = (sectionId) => (_event, isExpanded) => {
    setExpandedSection(isExpanded ? sectionId : false);
  };

  const SectionWrapper = ({ id, title, count, children }) => {
    if (!isMobile) {
      return (
        <>
          <Typography variant="h6" sx={{ mt: 4, mb: 1, textAlign: 'left' }}>
            {title}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {children}
        </>
      );
    }

    return (
      <Accordion
        disableGutters
        elevation={0}
        expanded={expandedSection === id}
        onChange={handleSectionChange(id)}
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          '&:before': { display: 'none' },
          mb: 2,
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls={`${id}-content`}
          id={`${id}-header`}
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            backgroundColor: 'background.paper',
            borderBottom: 1,
            borderBottomColor: 'divider',
            '& .MuiAccordionSummary-content': {
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              my: 1,
            },
          }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
          <Chip label={count} size="small" variant="outlined" />
        </AccordionSummary>
        <AccordionDetails
          sx={{
            maxHeight: '60vh',
            overflowY: 'auto',
            p: 2,
          }}
        >
          {children}
        </AccordionDetails>
      </Accordion>
    );
  };

  const galleryContent =
    purchases.length === 0 ? (
      <Typography color="text.secondary">No purchases yet.</Typography>
    ) : (
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={isMobile ? { minWidth: 720 } : undefined}>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Tracking</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchases.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {p.imageUrls?.[0] && (
                      <Box
                        component="img"
                        src={p.imageUrls[0]}
                        alt={p.title || 'Item'}
                        sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }}
                      />
                    )}
                    <Typography variant="body2" sx={{ textAlign: 'left' }}>
                      {p.title || `Item #${p.itemId}`}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{formatDate(p.createdAt)}</TableCell>
                <TableCell align="right">{p.quantity}</TableCell>
                <TableCell align="right">{formatCurrency(p.amountPaid)}</TableCell>
                <TableCell>
                  <Chip
                    label={p.status}
                    size="small"
                    color={p.status === 'completed' ? 'success' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <TrackingDisplay trackingNumber={p.trackingNumber} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );

  const activeBidsContent =
    activeBids.length === 0 ? (
      <Typography color="text.secondary">No active bids.</Typography>
    ) : (
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={isMobile ? { minWidth: 720 } : undefined}>
          <TableHead>
            <TableRow>
              <TableCell>Auction</TableCell>
              <TableCell align="right">Your Bid</TableCell>
              <TableCell align="right">Current Bid</TableCell>
              <TableCell align="right">Ends</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activeBids.map((bid) => (
              <TableRow key={bid.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {bid.imageUrls?.[0] && (
                      <Box
                        component="img"
                        src={bid.imageUrls[0]}
                        alt={bid.title || 'Auction'}
                        sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }}
                      />
                    )}
                    <Typography variant="body2" sx={{ textAlign: 'left' }}>
                      {bid.title || `Auction #${bid.auctionId}`}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">{formatCurrency(bid.bidAmount)}</TableCell>
                <TableCell align="right">
                  {bid.currentBid ? formatCurrency(bid.currentBid) : '—'}
                  {bid.currentBid && bid.currentBid > bid.bidAmount && (
                    <Chip label="Outbid" size="small" color="warning" sx={{ ml: 1 }} />
                  )}
                </TableCell>
                <TableCell align="right">{bid.endTime ? formatDate(bid.endTime) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );

  const wonAuctionsContent =
    wonAuctions.length === 0 ? (
      <Typography color="text.secondary">No won auctions.</Typography>
    ) : (
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={isMobile ? { minWidth: 720 } : undefined}>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell align="right">Final Bid</TableCell>
              <TableCell>Won On</TableCell>
              <TableCell>Payment</TableCell>
              <TableCell>Tracking</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {wonAuctions.map((w) => (
              <TableRow key={w.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {w.imageUrls?.[0] && (
                      <Box
                        component="img"
                        src={w.imageUrls[0]}
                        alt={w.title || 'Auction'}
                        sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }}
                      />
                    )}
                    <Typography variant="body2" sx={{ textAlign: 'left' }}>
                      {w.title || `Auction #${w.auctionId}`}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">{formatCurrency(w.finalBid)}</TableCell>
                <TableCell>{formatDate(w.closedAt)}</TableCell>
                <TableCell>
                  <Chip
                    label={w.isPaid ? 'Paid' : 'Unpaid'}
                    size="small"
                    color={w.isPaid ? 'success' : 'warning'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <TrackingDisplay trackingNumber={w.trackingNumber} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        My Orders
      </Typography>

      <SectionWrapper
        id="gallery"
        title="Gallery Purchases"
        count={`${purchases.length} ${purchases.length === 1 ? 'purchase' : 'purchases'}`}
      >
        {galleryContent}
      </SectionWrapper>

      <SectionWrapper
        id="activeBids"
        title="Active Bids"
        count={`${activeBids.length} ${activeBids.length === 1 ? 'bid' : 'bids'}`}
      >
        {activeBidsContent}
      </SectionWrapper>

      <SectionWrapper
        id="wonAuctions"
        title="Won Auctions"
        count={`${wonAuctions.length} ${wonAuctions.length === 1 ? 'auction' : 'auctions'}`}
      >
        {wonAuctionsContent}
      </SectionWrapper>
    </Box>
  );
}

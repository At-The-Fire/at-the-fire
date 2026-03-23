import { useEffect, useState } from 'react';
import './UserAuctions.css';
import { getUserAuctions, getAuctionDetail } from '../../services/fetch-auctions.js';
import { useNavigate } from 'react-router-dom';
import { useAuctionEventsStore } from '../../stores/useAuctionEventsStore.js';
import { Button } from '@mui/material';

export default function UserAuctions({ userId }) {
  const [activeBids, setActiveBids] = useState([]);
  const [wonAuctions, setWonAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const lastAuctionPaid = useAuctionEventsStore((s) => s.lastAuctionPaid);
  const lastTrackingUpdate = useAuctionEventsStore((s) => s.lastTrackingUpdate);

  useEffect(() => {
    if (!lastAuctionPaid) return;
    const { id, isPaid } = lastAuctionPaid;
    setWonAuctions((prev) => prev.map((a) => (a.auctionId === id || a.id === id ? { ...a, isPaid } : a)));
  }, [lastAuctionPaid]);

  useEffect(() => {
    if (!lastTrackingUpdate) return;
    const { id, trackingNumber } = lastTrackingUpdate;
    setWonAuctions((prev) =>
      prev.map((a) => (a.auctionId === id || a.id === id ? { ...a, trackingNumber } : a))
    );
  }, [lastTrackingUpdate]);

  useEffect(() => {
    const loadUserAuctions = async () => {
      try {
        const data = await getUserAuctions();

        const rawActive = Array.isArray(data?.activeAuctionBids) ? data.activeAuctionBids : [];
        const rawWon = Array.isArray(data?.wonAuctions) ? data.wonAuctions : [];

        const hydrated = await Promise.all(
          rawActive.map(async (bid) => {
            try {
              const auction = await getAuctionDetail(bid.auctionId);
              return { bid, auction };
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error('getAuctionDetail failed for', bid.auctionId, e);
              return { bid, auction: null };
            }
          })
        );

        const activeHydration = hydrated.filter((a) => a.auction?.isActive);
        setActiveBids(activeHydration);
        setWonAuctions(rawWon);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error loading user auctions:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserAuctions();
  }, [userId]);

  const handleAuctionNav = (id) => {
    navigate(`/auctions/${id}`);
  };

  const handleTrackingClick = (trackingNumber) => {
    if (!trackingNumber) return;
    const url = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`;
    window.open(url, '_blank');
  };

  const renderActiveBidCard = ({ bid, auction }) => {
    const img = auction?.imageUrls?.[0];
    const title = auction?.title || `Auction #${bid.auctionId}`;
    const currentBid = auction?.currentBid ?? auction?.startPrice;
    const endsAt = auction?.endTime ? new Date(auction.endTime).toLocaleString() : null;

    return (
      <>
        {img ? (
          <img src={img} alt={title} className="auction-mini-img auction-mini-card-image" />
        ) : (
          <div className="auction-mini-img placeholder" />
        )}
        <div className="auction-mini-info">
          <h4>{title}</h4>
          <p>
            <span>Your bid: </span>${Number(bid.bidAmount).toLocaleString()}
          </p>
          {typeof currentBid !== 'undefined' && (
            <p>
              <span>Current bid: </span>${Number(currentBid).toLocaleString()}
            </p>
          )}
          <p>
            <span>Placed: </span>
            {new Date(bid.createdAt).toLocaleString()}
          </p>
          {endsAt && (
            <p>
              <span>Ends: </span>
              {endsAt}
            </p>
          )}
        </div>
      </>
    );
  };

  const WonCard = ({ auction }) => (
    <div>
      {auction.imageUrls?.[0] ? (
        <img
          onClick={() => handleAuctionNav(auction.auctionId)}
          src={auction.imageUrls[0]}
          alt={auction.title}
          className="auction-mini-img auction-mini-card-image"
        />
      ) : (
        <div className="auction-mini-img placeholder" />
      )}

      <div className="auction-mini-info">
        {!auction.isPaid && (
          <Button
            variant="contained"
            color="error"
            size="small"
            sx={{ mb: 1 }}
            onClick={(e) => {
              e.stopPropagation();
              navigate('/checkout', {
                state: {
                  item: {
                    itemType: 'auction',
                    auctionId: auction.auctionId,
                    title: auction.title || `Auction #${auction.auctionId}`,
                    price: auction.finalBid,
                    quantity: 1,
                    shippingCost: auction.shippingCost ?? 0,
                  },
                },
              });
            }}
          >
            Pay Now
          </Button>
        )}

        <h4>{auction.title || `Auction #${auction.auctionId}`}</h4>

        <p className="won-card-p">
          <span>Final bid: </span>${Number(auction.finalBid).toLocaleString()}
        </p>

        {typeof auction.buyNowPrice !== 'undefined' && (
          <p className="won-card-p">
            <span>Buy now price: </span>${Number(auction.buyNowPrice).toLocaleString()}
          </p>
        )}

        <p className="won-card-p">
          <span>Closed: </span>
          {new Date(auction.closedAt).toLocaleString([], {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>

        <p className="won-card-p">
          <span>Reason: </span>
          {auction.closedReason === 'buy_now' ? 'Bought instantly' : 'Expired'}
        </p>

        {auction.isPaid && (!auction.trackingNumber || auction.trackingNumber === '0') && (
          <span style={{ color: 'yellow', padding: '2px 6px', fontSize: '1rem', fontWeight: 'bold' }}>
            <span style={{ marginRight: '1.5rem', color: 'green' }}>Paid </span> Shipping Soon
          </span>
        )}

        {auction.trackingNumber && auction.trackingNumber !== '0' && (
          <div
            className="tracking-link"
            onClick={() => handleTrackingClick(auction.trackingNumber)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTrackingClick(auction.trackingNumber);
            }}
          >
            <img
              alt="USPS"
              style={{ width: '50px', height: '50px', margin: '.5rem 0 0 .25rem' }}
              src="/usps.png"
            />
            <p style={{ textAlign: 'left', margin: 0 }}>
              <span>Tracking number: </span>
              <span>{auction.trackingNumber}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="user-auctions-widget">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="user-auctions-widget">
      <span className="new-work-msg">
        <strong>Your Auction Bids &amp; Wins</strong>
      </span>

      <p className="empty-msg">
        Waiting for your item(s)? You can find your tracking number &amp; link in the Won section below.
      </p>

      <h3>Active bids</h3>
      {activeBids.length > 0 ? (
        <div className="auction-mini-grid">
          {activeBids.map(({ bid, auction }) => (
            <div key={bid.id} className="auction-mini-card" onClick={() => handleAuctionNav(auction.id)}>
              {renderActiveBidCard({ bid, auction })}
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-msg">No active bids.</p>
      )}

      <h3>Won</h3>
      {wonAuctions.length > 0 ? (
        <div className="auction-mini-grid">
          {wonAuctions.map((a) => (
            <div
              key={a.id}
              className="auction-mini-card won"
              style={{ border: a.isPaid ? '1px solid green' : '1px solid red' }}
            >
              <WonCard auction={a} />
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-msg">No completed wins yet.</p>
      )}
    </div>
  );
}

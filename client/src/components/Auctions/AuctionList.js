import { useCallback, useEffect, useMemo, useState } from 'react';
import './AuctionList.css';
import { getAuctions } from '../../services/fetch-auctions.js';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { getBids } from '../../services/fetch-bids.js';
import { useAuctionEventsStore } from '../../stores/useAuctionEventsStore.js';
import AuctionPreviewItem from './AuctionPreviewItem.js';

export default function AuctionList() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, admin } = useAuthStore();

  const lastBidUpdate = useAuctionEventsStore((s) => s.lastBidUpdate);
  const lastBuyNowId = useAuctionEventsStore((s) => s.lastBuyNowId);
  const lastAuctionEnded = useAuctionEventsStore((s) => s.lastAuctionEnded);
  const lastAuctionCreated = useAuctionEventsStore((s) => s.lastAuctionCreated);
  const lastAuctionExtended = useAuctionEventsStore((s) => s.lastAuctionExtended);

  // fetch auctions
  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        setLoading(true);
        const data = await getAuctions();
        setAuctions(data);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error fetching auctions', err);
        toast.error(`Error fetching auctions: ${err.message}`, {
          theme: 'colored',
          draggable: true,
          draggablePercent: 60,
          toastId: 'auction-list-1',
          autoClose: false,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAuctions();
  }, []);

  // update current bid on bid-placed event
  useEffect(() => {
    if (!lastBidUpdate) return;
    (async () => {
      try {
        const aId = lastBidUpdate.id;
        const data = await getBids(aId);
        const newHigh = Array.isArray(data) && data.length ? data[0].bidAmount : null;
        setAuctions((prev) => prev.map((a) => (a.id === aId ? { ...a, currentBid: newHigh ?? a.currentBid } : a)));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error updating currentBid after bid-placed:', err);
      }
    })();
  }, [lastBidUpdate]);

  // new auction created
  useEffect(() => {
    if (!lastAuctionCreated) return;
    setAuctions((prev) => [...prev, lastAuctionCreated]);
  }, [lastAuctionCreated]);

  // auction closed via buy-it-now
  useEffect(() => {
    if (!lastBuyNowId) return;
    const aId = Number(lastBuyNowId);
    setAuctions((prev) => prev.map((a) => (Number(a.id) === aId ? { ...a, isActive: false } : a)));
  }, [lastBuyNowId]);

  // auction ended by timer
  useEffect(() => {
    if (!lastAuctionEnded) return;
    const aId = Number(lastAuctionEnded);
    setAuctions((prev) => prev.map((a) => (a.id === aId ? { ...a, isActive: false } : a)));
  }, [lastAuctionEnded]);

  // auction extended
  useEffect(() => {
    if (!lastAuctionExtended) return;
    const { id, newEndTime } = lastAuctionExtended;
    setAuctions((prev) => prev.map((a) => (Number(a.id) === Number(id) ? { ...a, endTime: newEndTime } : a)));
  }, [lastAuctionExtended]);

  const displayAuctions = useMemo(() => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const active = auctions.filter((a) => a.isActive);
    const recentEnded = auctions.filter(
      (a) => !a.isActive && new Date(a.endTime).getTime() >= twoHoursAgo
    );
    return [...active, ...recentEnded];
  }, [auctions]);

  const handleItemClick = useCallback((id) => navigate(`/auctions/${id}`), [navigate]);

  if (loading) {
    return (
      <div className="messages-container">
        <div className="messages-content">
          <p>Loading auctions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container">
      <div className="messages-content">
        {user && admin && (
          <button className="add-edit-auctions" onClick={() => navigate('/dashboard/auctions/new')}>
            Add / Edit Auctions
          </button>
        )}
        <div className="messages-header">
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '0.9rem',
              cursor: 'pointer',
              marginBottom: '1rem',
              padding: 0,
            }}
          >
            ← Back
          </button>
          <h1 style={{ margin: 0 }}>Glass Art Auctions</h1>
          <p style={{ margin: 0, padding: 0 }}>Bid, watch, or buy instantly.</p>
          <p style={{ margin: '.5rem .5rem' }}>
            <span
              onClick={() => navigate('/auctions/archive')}
              style={{ color: '#aaa', fontSize: '.9rem', cursor: 'pointer' }}
            >
              View archive
            </span>
          </p>
        </div>
        <div className="auction-list">
          {displayAuctions.length === 0 ? (
            <p>No auctions right now.</p>
          ) : (
            <div className="auction-grid">
              {displayAuctions.map((auction) => (
                <AuctionPreviewItem
                  key={auction.id}
                  auction={auction}
                  onClick={handleItemClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

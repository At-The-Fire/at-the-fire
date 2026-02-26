import { useEffect, useState } from 'react';
import './AuctionList.css';
import { getAuctions } from '../../services/fetch-auctions.js';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { getBids } from '../../services/fetch-bids.js';
import { useAuctionEventsStore } from '../../stores/useAuctionEventsStore.js';

function AuctionPreviewItem({ auction, onClick }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!auction?.endTime) return;

    const updateCountdown = () => {
      const diff = new Date(auction.endTime) - new Date();

      if (diff <= 0) {
        setTimeLeft('Auction ended');
        return;
      }

      const totalHours = Math.floor(diff / 3600000);
      const days = Math.floor(totalHours / 24);
      const hrs = totalHours % 24;
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      if (totalHours >= 24) {
        setTimeLeft(`${days}d ${hrs}h ${mins}m ${secs}s`);
      } else {
        setTimeLeft(`${hrs}h ${mins}m ${secs}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [auction?.endTime]);

  const hasEnded = !auction.isActive;

  const highBid =
    auction.currentBid && auction.currentBid > 0 ? `$${auction.currentBid}` : `Starts at $${auction.startPrice}`;

  return (
    <div className="auction-preview-item" onClick={onClick}>
      <img src={auction.imageUrls?.[0]} alt={auction.title} className="auction-preview-img" />
      <div style={{ marginTop: '.4rem' }}>
        {hasEnded ? (
          <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>closed</div>
        ) : (
          <>
            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#ffd500' }}>{highBid}</div>
            <div style={{ fontSize: '.9rem', opacity: 0.9, color: '#ffd500' }}>{timeLeft}</div>
          </>
        )}
      </div>
    </div>
  );
}

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

  if (loading) {
    return (
      <div className="messages-container">
        <div className="messages-content">
          <p>Loading auctions...</p>
        </div>
      </div>
    );
  }

  const now = Date.now();
  const active = auctions.filter((a) => a.isActive);
  const ended = auctions.filter((a) => !a.isActive);
  const recentEnded = ended.filter((a) => now - new Date(a.endTime).getTime() < 48 * 60 * 60 * 1000);
  const displayAuctions = [...active, ...recentEnded];

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
                  onClick={() => navigate(`/auctions/${auction.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

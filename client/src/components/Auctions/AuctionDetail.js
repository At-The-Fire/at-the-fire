import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAuctions } from '../../services/fetch-auctions.js';
import AuctionCard from './AuctionCard.js';
import { useAuctionEventsStore } from '../../stores/useAuctionEventsStore.js';
import './AuctionList.css';

export default function AuctionDetail() {
  const { id } = useParams();
  const auctionId = Number(id);

  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const lastAuctionExtended = useAuctionEventsStore((s) => s.lastAuctionExtended);
  useEffect(() => {
    if (!lastAuctionExtended) return;
    if (lastAuctionExtended.id !== auctionId) return;
    setAuction((prev) => (prev ? { ...prev, endTime: lastAuctionExtended.newEndTime } : prev));
  }, [lastAuctionExtended, auctionId]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        const all = await getAuctions();
        const found = all.find((a) => Number(a.id) === auctionId) || null;
        if (isMounted) setAuction(found);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [auctionId]);

  useEffect(() => {
    if (!loading && !auction) {
      const timeout = setTimeout(() => {
        navigate('/auctions');
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [auction, loading, navigate]);

  if (loading) {
    return (
      <div className="messages-container">
        <div className="messages-content">
          <p>Loading auction...</p>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="messages-container">
        <div className="messages-content">
          <p>Not found. Redirecting in 3 seconds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container">
      <div className="messages-content">
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
        <AuctionCard auction={auction} />
      </div>
    </div>
  );
}

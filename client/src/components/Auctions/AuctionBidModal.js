import { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { placeBid, getBids } from '../../services/fetch-bids.js';

export default function AuctionBidModal({ isOpen, onClose, highestBid, auction, id, user, setBids, setHighestBid }) {
  const [bidAmount, setBidAmount] = useState('');

  if (!isOpen) return null;

  const handleBidSubmit = async () => {
    try {
      const hasBids = highestBid > 0;
      const startPrice = auction.startPrice || 0;
      const amt = Number(bidAmount);

      if (!Number.isFinite(amt)) {
        toast.warn('Enter a valid number', { theme: 'dark', autoClose: 3000 });
        return;
      }

      if (!hasBids && amt < startPrice) {
        toast.warn(`Bid must be greater than or equal to $${startPrice}`, { theme: 'dark', autoClose: 3000 });
        return;
      } else if (hasBids && amt <= highestBid) {
        toast.warn(`Bid must be greater than $${highestBid}`, { theme: 'dark', autoClose: 3000 });
        return;
      }

      await placeBid({ auctionId: id, userId: user, bidAmount: amt });
      const updated = await getBids(id);
      setBids(updated);
      if (updated && updated.length > 0) setHighestBid(updated[0].bidAmount);
      setBidAmount('');
      onClose();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error placing bid:', err);
      toast.warn(err.message, { theme: 'dark', autoClose: 3000 });
    }
  };

  return createPortal(
    <div className="bid-modal-overlay" role="dialog" aria-modal="true">
      <div className="bid-modal">
        <h3>Place a Bid</h3>
        <p>
          {highestBid === 0 ? (
            'No bids yet'
          ) : (
            <>
              Current High bid: <strong>${highestBid}</strong>
            </>
          )}
        </p>

        <div>
          {(() => {
            const hasBids = highestBid > 0;
            const minBid = hasBids ? highestBid : auction.startPrice;
            const comparisonText =
              hasBids || auction.startPrice === 0
                ? `greater than $${highestBid}`
                : `equal to or greater than $${auction.startPrice}`;

            return (
              <>
                <span>Your bid must be {comparisonText}</span>
                <input
                  type="number"
                  min={minBid}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="Enter bid amount"
                  className="bid-input"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      await handleBidSubmit();
                    }
                  }}
                />
              </>
            );
          })()}
        </div>

        <div className="modal-actions">
          <button onClick={handleBidSubmit} className="confirm-bid-btn">
            Submit Bid
          </button>
          <button onClick={() => onClose()} className="cancel-bid-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

import { memo } from 'react';

function formatCountdown(diff) {
  if (diff <= 0) return 'Auction ended';
  const totalHours = Math.floor(diff / 3600000);
  const days = Math.floor(totalHours / 24);
  const hrs = totalHours % 24;
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return totalHours >= 24 ? `${days}d ${hrs}h ${mins}m ${secs}s` : `${hrs}h ${mins}m ${secs}s`;
}

function AuctionPreviewItem({ auction, onClick, now }) {
  const hasEnded = !auction.isActive;
  const timeLeft = auction.endTime ? formatCountdown(new Date(auction.endTime) - now) : '';
  const highBid =
    auction.currentBid && auction.currentBid > 0
      ? `$${auction.currentBid}`
      : `Starts at $${auction.startPrice}`;

  return (
    <div className="auction-preview-item" onClick={() => onClick(auction.id)}>
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

export default memo(AuctionPreviewItem);

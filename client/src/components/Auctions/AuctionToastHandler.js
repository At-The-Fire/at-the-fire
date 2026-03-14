import { useEffect } from 'react';
import { toast } from 'react-toastify';
import websocketService from '../../services/websocketService.js';
import { useAuctionNotificationStore } from '../../stores/useAuctionNotificationStore.js';

export default function AuctionToastHandler() {
  useEffect(() => {
    const handleWon = ({ auctionId }) => {
      toast.success('You won the auction! Check your Purchases.', {
        toastId: `won-${auctionId}`,
        autoClose: 8000,
      });
      useAuctionNotificationStore.getState().incrementWonCount();
    };

    const handleOutbid = ({ auctionId, newBidAmount }) => {
      toast.warning(`You've been outbid ($${Number(newBidAmount).toLocaleString()}). Check your active bids.`, {
        toastId: `outbid-${auctionId}`,
        autoClose: 8000,
      });
      useAuctionNotificationStore.getState().incrementOutbidCount();
    };

    const handleSold = ({ auctionId }) => {
      toast.success('Your auction sold! Go to Dashboard → Sales to enter tracking.', {
        toastId: `sold-${auctionId}`,
        autoClose: 10000,
      });
    };

    websocketService.on('user-won', handleWon);
    websocketService.on('user-outbid', handleOutbid);
    websocketService.on('auction-sold', handleSold);

    return () => {
      websocketService.off('user-won', handleWon);
      websocketService.off('user-outbid', handleOutbid);
      websocketService.off('auction-sold', handleSold);
    };
  }, []);

  return null;
}

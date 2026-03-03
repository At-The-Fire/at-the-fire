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

    websocketService.on('user-won', handleWon);
    websocketService.on('user-outbid', handleOutbid);

    return () => {
      websocketService.off('user-won', handleWon);
      websocketService.off('user-outbid', handleOutbid);
    };
  }, []);

  return null;
}

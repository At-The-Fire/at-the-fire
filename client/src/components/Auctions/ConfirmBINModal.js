import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmBINModal({ isOpen, onClose, onConfirm, auction }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        try {
          await onConfirm();
        } finally {
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="bid-modal-overlay" role="dialog" aria-modal="true">
      <div className="bid-modal">
        <h3>Confirm Purchase</h3>
        <p style={{ marginBottom: '0.5rem' }}>
          Are you sure you want to buy <strong>{auction.title}</strong>?
        </p>
        {auction.shippingCost > 0 ? (
          <p style={{ marginBottom: '1rem' }}>
            ${auction.buyNowPrice} + ${auction.shippingCost} shipping ={' '}
            <strong>${Number(auction.buyNowPrice) + Number(auction.shippingCost)}</strong>
          </p>
        ) : (
          <p style={{ marginBottom: '1rem' }}>
            Total: <strong>${auction.buyNowPrice}</strong>
          </p>
        )}
        <div className="modal-actions">
          <button
            onClick={async () => {
              try {
                await onConfirm();
              } finally {
                onClose();
              }
            }}
            className="confirm-bid-btn"
          >
            Yes, Buy Now
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

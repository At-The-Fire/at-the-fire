import './AuctionRulesModal.css';

export default function AuctionRulesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="auction-rules-modal-wrapper" onClick={onClose}>
      <div className="rules-modal-text" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>Auction Rules</h2>

        <ul style={{ paddingLeft: '1rem' }}>
          <li>Bids must be increments of at least $1.</li>
          <li>
            Auction ends at scheduled end time unless the 5 minute rule applies: If a bid is placed within the final
            minute, the auction extends 5 minutes. This prevents sniping and keeps things fair for everyone.
          </li>
          <li>
            &quot;Buy It Now&quot; immediately ends the auction and secures the piece for you. Please only use it when
            ready to complete payment.
          </li>
        </ul>
        <p>And of course, please reach out if you have any problems or technical issues using the platform.</p>
        <h4>Thank you everyone, and good luck!</h4>

        <button className="close-button-rules-modal" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

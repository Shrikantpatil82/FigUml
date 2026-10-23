import './Modal.css';

export default function Modal({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmDanger = false }) {
    if (!open) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal__header">
                    <h3>{title}</h3>
                    <button className="modal__close" onClick={onClose}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>
                <p className="modal__message">{message}</p>
                <div className="modal__actions">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className={`btn ${confirmDanger ? 'btn-danger' : 'btn-primary'}`}
                        onClick={() => { onConfirm(); onClose(); }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

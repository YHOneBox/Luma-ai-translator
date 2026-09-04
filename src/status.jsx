import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function StatusBar() {
  const [message, setMessage] = useState('Working…');
  const [variant, setVariant] = useState('loading');

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onStatusMessage) return undefined;

    api.onStatusMessage((data) => {
      if (data?.message) setMessage(data.message);
      if (data?.variant) setVariant(data.variant);
    });

    return undefined;
  }, []);

  return (
    <div
      className={`status-bar status-bar--${variant}`}
      role="status"
      aria-live="polite"
    >
      {variant === 'loading' ? (
        <span className="status-bar-spinner" aria-hidden="true" />
      ) : (
        <span className="status-bar-icon" aria-hidden="true">
          {variant === 'success' ? '✓' : '!'}
        </span>
      )}
      <span className="status-bar-text">{message}</span>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<StatusBar />);

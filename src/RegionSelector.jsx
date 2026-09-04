import { useEffect, useRef, useState } from 'react';
import { useI18n } from './i18n';

export default function RegionSelector() {
  const { t } = useI18n();
  const [selection, setSelection] = useState(null);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('region-page');
    document.documentElement.classList.add('region-page');

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        window.electronAPI?.regionCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('region-page');
      document.documentElement.classList.remove('region-page');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMouseDown = (e) => {
    startRef.current = {
      screenX: e.screenX,
      screenY: e.screenY,
      clientX: e.clientX,
      clientY: e.clientY,
    };
    setDragging(true);
    setSelection(null);
  };

  const handleMouseMove = (e) => {
    if (!dragging || !startRef.current) return;

    const start = startRef.current;

    setSelection({
      display: {
        x: Math.min(start.clientX, e.clientX),
        y: Math.min(start.clientY, e.clientY),
        width: Math.abs(e.clientX - start.clientX),
        height: Math.abs(e.clientY - start.clientY),
      },
      region: {
        x: Math.min(start.screenX, e.screenX),
        y: Math.min(start.screenY, e.screenY),
        width: Math.abs(e.screenX - start.screenX),
        height: Math.abs(e.screenY - start.screenY),
      },
    });
  };

  const handleMouseUp = (e) => {
    setDragging(false);

    if (!startRef.current) return;

    const start = startRef.current;
    const region = {
      x: Math.min(start.screenX, e.screenX),
      y: Math.min(start.screenY, e.screenY),
      width: Math.abs(e.screenX - start.screenX),
      height: Math.abs(e.screenY - start.screenY),
    };

    if (region.width > 10 && region.height > 10) {
      window.electronAPI?.regionComplete(region);
    } else {
      startRef.current = null;
      setSelection(null);
    }
  };

  return (
    <div
      className="region-overlay"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {selection?.display && (
        <div
          className="region-box"
          style={{
            left: selection.display.x,
            top: selection.display.y,
            width: selection.display.width,
            height: selection.display.height,
          }}
        />
      )}
      <div className="region-hint">
        {t('region.hint')}
      </div>
    </div>
  );
}

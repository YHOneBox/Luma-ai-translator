import { useEffect, useRef, useState } from 'react';

export default function ModelSelect({ value, options, onChange, placeholder = 'Select a model' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selected = options.find((m) => m.id === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="model-select" ref={rootRef}>
      <button
        type="button"
        className={`model-select-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{selected?.displayName || selected?.id || placeholder}</span>
        <span className="model-select-chevron">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <ul className="model-select-menu">
          {options.length === 0 ? (
            <li className="model-select-empty">Scan models first</li>
          ) : (
            options.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={m.id === value ? 'selected' : ''}
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                >
                  <span className="model-select-label">{m.displayName || m.id}</span>
                  <span className="model-select-id">{m.id}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

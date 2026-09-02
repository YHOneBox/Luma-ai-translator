import { useEffect, useState, useCallback } from 'react';
import Settings from './Settings';
import { formatDisplay } from './HotkeyInput';

export default function MainApp() {
  const [view, setView] = useState('home');
  const [hotkeys, setHotkeys] = useState({
    screen: 'Ctrl + Shift + T',
    region: 'Ctrl + Shift + R',
    selection: 'Ctrl + Shift + S',
  });

  useEffect(() => {
    window.electronAPI?.getSettings().then((s) => {
      setHotkeys({
        screen: formatDisplay(s.hotkeyScreen),
        region: formatDisplay(s.hotkeyRegion),
        selection: formatDisplay(s.hotkeySelection),
      });
    });
  }, [view]);

  const translateScreen = useCallback(() => {
    window.electronAPI?.translateScreen();
  }, []);

  const translateRegion = useCallback(() => {
    window.electronAPI?.translateRegion();
  }, []);

  const translateSelection = useCallback(() => {
    window.electronAPI?.translateSelection();
  }, []);

  if (view === 'settings') {
    return <Settings onBack={() => setView('home')} />;
  }

  return (
    <div className="main-app">
      <header className="main-header">
        <img src="./logo.png" alt="AI Translate" className="main-logo" />
        <div className="header-text">
          <h1>AI Translate</h1>
          <p className="subtitle">Screen translation powered by Gemini</p>
        </div>
        <button
          className="settings-btn"
          onClick={() => setView('settings')}
          aria-label="Settings"
          title="Settings"
        >
          ⚙
        </button>
      </header>

      <section className="actions">
        <button className="action-btn primary" onClick={translateScreen}>
          <span className="action-icon">⬚</span>
          <span className="action-text">
            <strong>Translate Screen</strong>
            <small>{hotkeys.screen}</small>
          </span>
        </button>
        <button className="action-btn" onClick={translateRegion}>
          <span className="action-icon">◫</span>
          <span className="action-text">
            <strong>Select Region</strong>
            <small>{hotkeys.region}</small>
          </span>
        </button>
        <button className="action-btn" onClick={translateSelection}>
          <span className="action-icon">T</span>
          <span className="action-text">
            <strong>Translate Selection</strong>
            <small>{hotkeys.selection}</small>
          </span>
        </button>
      </section>

      <section className="content">
        <div className="idle-state">
          <p>Results appear in a popup near your cursor.</p>
          <p className="hint">
            Highlight any text, then press your selection hotkey to translate it
            instantly — works in browsers, PDFs, and other apps.
          </p>
          <p className="hint">
            Customize hotkeys in Settings if they conflict with other apps.
          </p>
          <p className="hint">
            Closing this window keeps AI Translate running in the system tray.
          </p>
        </div>
      </section>

      <footer className="main-footer">
        Hotkeys stay active in the background
      </footer>
    </div>
  );
}

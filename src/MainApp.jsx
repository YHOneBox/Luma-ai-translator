import { useEffect, useState, useCallback } from 'react';
import Settings from './Settings';
import { formatDisplay } from './HotkeyInput';

export default function MainApp() {
  const [view, setView] = useState('home');
  const [appVersion, setAppVersion] = useState('');
  const [hotkeys, setHotkeys] = useState({
    screen: 'Alt + T',
    region: 'Alt + C',
    selection: 'Alt + X',
    replace: 'Alt + R',
    grammar: 'Alt + G',
  });

  useEffect(() => {
    window.electronAPI?.getAppVersion?.().then((v) => {
      if (v) setAppVersion(v);
    });
  }, []);

  useEffect(() => {
    window.electronAPI?.getSettings().then((s) => {
      setHotkeys({
        screen: formatDisplay(s.hotkeyScreen),
        region: formatDisplay(s.hotkeyRegion),
        selection: formatDisplay(s.hotkeySelection),
        replace: formatDisplay(s.hotkeyReplace),
        grammar: formatDisplay(s.hotkeyGrammar),
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

  const translateReplace = useCallback(() => {
    window.electronAPI?.translateReplace();
  }, []);

  const translateGrammar = useCallback(() => {
    window.electronAPI?.translateGrammar();
  }, []);

  if (view === 'settings') {
    return <Settings onBack={() => setView('home')} />;
  }

  return (
    <div className="main-app">
      <header className="main-header">
        <img src="./logo.png" alt="Luma" className="main-logo" />
        <div className="header-text">
          <h1>Luma</h1>
          <p className="subtitle">Screen translation powered by Gemini</p>
          <p className="author-credit">
            by{' '}
            <a
              href="https://yhonebox.github.io/yh/"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI?.openDictionary(
                  'https://yhonebox.github.io/yh/'
                );
              }}
            >
              Yi-Ho Chang
            </a>
            {appVersion ? <span className="app-version"> · v{appVersion}</span> : null}
          </p>
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
        <button className="action-btn" onClick={translateReplace}>
          <span className="action-icon">⇄</span>
          <span className="action-text">
            <strong>Replace Selection</strong>
            <small>{hotkeys.replace}</small>
          </span>
        </button>
        <button className="action-btn" onClick={translateGrammar}>
          <span className="action-icon">✎</span>
          <span className="action-text">
            <strong>Fix Grammar</strong>
            <small>{hotkeys.grammar}</small>
          </span>
        </button>
      </section>

      <section className="content">
        <div className="idle-state">
          <p>Results appear in a popup near your cursor.</p>
          <p className="hint">
            Highlight text, then use selection lookup, replace translation, or
            fix grammar — each pastes or shows results without leaving your app.
          </p>
          <p className="hint">
            Customize hotkeys and languages in Settings.
          </p>
          <p className="hint">
            Closing this window keeps Luma running in the system tray.
          </p>
        </div>
      </section>

      <footer className="main-footer">
        {appVersion ? (
          <>
            <span>v{appVersion}</span>
            <span className="footer-sep">·</span>
          </>
        ) : null}
        Hotkeys stay active in the background
        <span className="footer-sep">·</span>
        <a
          href="https://yhonebox.github.io/yh/"
          onClick={(e) => {
            e.preventDefault();
            window.electronAPI?.openDictionary(
              'https://yhonebox.github.io/yh/'
            );
          }}
        >
          Yi-Ho Chang
        </a>
      </footer>
    </div>
  );
}

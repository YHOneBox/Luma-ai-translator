import { useEffect, useState, useCallback } from 'react';
import Settings from './Settings';
import LanguageOnboarding from './LanguageOnboarding';
import { formatDisplay } from './HotkeyInput';
import { useI18n } from './i18n';

export default function MainApp() {
  const { t, ready } = useI18n();
  const [view, setView] = useState('home');
  const [appVersion, setAppVersion] = useState('');
  const [needsOnboarding, setNeedsOnboarding] = useState(null);
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
      setNeedsOnboarding(!s.hasChosenUiLocale);
      setHotkeys({
        screen: formatDisplay(s.hotkeyScreen),
        region: formatDisplay(s.hotkeyRegion),
        selection: formatDisplay(s.hotkeySelection),
        replace: formatDisplay(s.hotkeyReplace),
        grammar: formatDisplay(s.hotkeyGrammar),
      });
    });
  }, [view, ready]);

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

  if (needsOnboarding === null || !ready) {
    return (
      <div className="main-app">
        <div className="loading-state">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return <LanguageOnboarding onComplete={() => setNeedsOnboarding(false)} />;
  }

  if (view === 'settings') {
    return <Settings onBack={() => setView('home')} />;
  }

  return (
    <div className="main-app">
      <header className="main-header">
        <img src="./logo.png" alt={t('app.name')} className="main-logo" />
        <div className="header-text">
          <h1>{t('app.name')}</h1>
          <p className="subtitle">{t('app.subtitle')}</p>
          <p className="author-credit">
            {t('app.by')}{' '}
            <a
              href="https://yhonebox.github.io/e-portfolio/"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI?.openDictionary(
                  'https://yhonebox.github.io/e-portfolio/'
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
          aria-label={t('app.settings')}
          title={t('app.settings')}
        >
          ⚙
        </button>
      </header>

      <section className="actions">
        <button className="action-btn primary" onClick={translateScreen}>
          <span className="action-icon">⬚</span>
          <span className="action-text">
            <strong>{t('app.actions.translateScreen')}</strong>
            <small>{hotkeys.screen}</small>
          </span>
        </button>
        <button className="action-btn" onClick={translateRegion}>
          <span className="action-icon">◫</span>
          <span className="action-text">
            <strong>{t('app.actions.selectRegion')}</strong>
            <small>{hotkeys.region}</small>
          </span>
        </button>
        <button className="action-btn" onClick={translateSelection}>
          <span className="action-icon">T</span>
          <span className="action-text">
            <strong>{t('app.actions.translateSelection')}</strong>
            <small>{hotkeys.selection}</small>
          </span>
        </button>
        <button className="action-btn" onClick={translateReplace}>
          <span className="action-icon">⇄</span>
          <span className="action-text">
            <strong>{t('app.actions.replaceSelection')}</strong>
            <small>{hotkeys.replace}</small>
          </span>
        </button>
        <button className="action-btn" onClick={translateGrammar}>
          <span className="action-icon">✎</span>
          <span className="action-text">
            <strong>{t('app.actions.fixGrammar')}</strong>
            <small>{hotkeys.grammar}</small>
          </span>
        </button>
      </section>

      <section className="content">
        <div className="idle-state">
          <p>{t('app.hints.popup')}</p>
          <p className="hint">{t('app.hints.workflows')}</p>
          <p className="hint">{t('app.hints.customize')}</p>
          <p className="hint">{t('app.hints.tray')}</p>
        </div>
      </section>

      <footer className="main-footer">
        {appVersion ? (
          <>
            <span>v{appVersion}</span>
            <span className="footer-sep">·</span>
          </>
        ) : null}
        {t('app.footerHotkeys')}
        <span className="footer-sep">·</span>
        <a
          href="https://yhonebox.github.io/e-portfolio/"
          onClick={(e) => {
            e.preventDefault();
            window.electronAPI?.openDictionary(
              'https://yhonebox.github.io/e-portfolio/'
            );
          }}
        >
          Yi-Ho Chang
        </a>
      </footer>
    </div>
  );
}

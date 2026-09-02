import { useEffect, useState, useCallback, useRef } from 'react';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightWord(text, word) {
  if (!text || !word) return text;

  const pattern = new RegExp(`(${escapeRegExp(word)})`, 'gi');
  const parts = text.split(pattern);

  return parts.map((part, index) =>
    part.toLowerCase() === word.toLowerCase() ? (
      <mark key={index} className="word-highlight">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function SpeakerIcon({ active }) {
  return (
    <svg
      className={`icon-speaker ${active ? 'active' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      className="icon-copy"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export default function App() {
  const [state, setState] = useState('loading');
  const [message, setMessage] = useState('Translating...');
  const [data, setData] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef(null);

  const closePopup = useCallback(() => {
    window.electronAPI?.closePopup();
  }, []);

  useEffect(() => {
    document.body.classList.add('popup-page');
    document.documentElement.classList.add('popup-page');

    const api = window.electronAPI;
    if (!api) return;

    api.onTranslationLoading(({ message: msg }) => {
      setState('loading');
      setMessage(msg || 'Translating...');
      setData(null);
      setPlaying(false);
      setCopied(false);
    });

    api.onTranslationResult((result) => {
      setState('success');
      setData(result);
    });

    api.onTranslationPronunciation((pronunciation) => {
      setData((prev) => (prev ? { ...prev, ...pronunciation } : pronunciation));
    });

    api.onTranslationError(({ message: msg }) => {
      setState('error');
      setMessage(msg || 'Something went wrong.');
      setData(null);
    });

    return () => {
      document.body.classList.remove('popup-page');
      document.documentElement.classList.remove('popup-page');
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const playPronunciation = () => {
    const url = data?.audioUs || data?.audioUk;
    if (!url) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    setPlaying(true);

    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    audio.play().catch(() => setPlaying(false));
  };

  const copyTranslation = async () => {
    if (!data?.translation) return;

    try {
      await navigator.clipboard.writeText(data.translation);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const displayWord =
    data?.base_word || data?.sourceText || data?.lookupWord || data?.translation || '';
  const highlightTarget = data?.base_word || data?.sourceText || '';
  const hasAudio = Boolean(data?.audioUs || data?.audioUk);
  const phoneticDisplay = data?.phonetic
    ? data.phonetic.startsWith('/')
      ? data.phonetic
      : `/${data.phonetic}/`
    : '';

  return (
    <div className="popup-shell">
      <div className="popup-card">
        <header className="popup-titlebar">
          <div className="popup-titlebar-drag">
            {state === 'loading' ? message : 'AI Translate'}
          </div>
          <button
            className="close-btn no-drag"
            onClick={closePopup}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {state === 'loading' && (
          <div className="loading-state">
            <div className="spinner" />
            <p>{message}</p>
          </div>
        )}

        {state === 'error' && (
          <div className="error-state">
            <p className="error-icon">!</p>
            <p>{message}</p>
            <button className="btn-secondary" onClick={closePopup}>
              Close
            </button>
          </div>
        )}

        {state === 'success' && data && (
          <div className="result-state">
            <header className="word-header">
              <div className="word-title-row">
                <h1 className="word-title">{displayWord}</h1>
                {data.isSingleWord && (
                  <div className="word-phonetic-row">
                    {phoneticDisplay ? (
                      <span className="phonetic-inline">{phoneticDisplay}</span>
                    ) : !hasAudio ? (
                      <span className="phonetic-inline phonetic-muted">Loading…</span>
                    ) : null}
                    {hasAudio && (
                      <button
                        type="button"
                        className={`icon-btn ${playing ? 'active' : ''}`}
                        onClick={playPronunciation}
                        aria-label="Play pronunciation"
                      >
                        <SpeakerIcon active={playing} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <p className="pos-translation">
                {data.part_of_speech && (
                  <span className="part-of-speech">{data.part_of_speech}</span>
                )}
                <span className="main-translation">{data.translation}</span>
              </p>
            </header>

            {data.example_sentence && (
              <section className="example-section">
                <p className="example-en">
                  {highlightWord(data.example_sentence, highlightTarget)}
                </p>
                {data.example_translation && (
                  <p className="example-target">{data.example_translation}</p>
                )}
              </section>
            )}

            {(data.context_explanation || data.usage_in_context) && (
              <section className="context-card">
                <div className="context-card-header">
                  <span className="context-word">{data.translation}</span>
                  <div className="context-actions">
                    {hasAudio && (
                      <button
                        type="button"
                        className={`icon-btn ${playing ? 'active' : ''}`}
                        onClick={playPronunciation}
                        aria-label="Play pronunciation"
                      >
                        <SpeakerIcon active={playing} />
                      </button>
                    )}
                    <button
                      type="button"
                      className={`icon-btn ${copied ? 'active' : ''}`}
                      onClick={copyTranslation}
                      aria-label="Copy translation"
                      title={copied ? 'Copied' : 'Copy translation'}
                    >
                      <CopyIcon />
                    </button>
                  </div>
                </div>
                {data.context_explanation && (
                  <p className="context-text">{data.context_explanation}</p>
                )}
                {data.usage_in_context && (
                  <div className="context-usage">
                    <span className="context-usage-label">In this context</span>
                    <p className="context-text">{data.usage_in_context}</p>
                  </div>
                )}
              </section>
            )}

            {data.modelUsed && (
              <p className="model-footer">{data.modelUsed}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useI18n } from './i18n';

export default function LanguageOnboarding({ onComplete }) {
  const { t, locales, setLocale, locale } = useI18n();
  const [selected, setSelected] = useState(locale || 'en');
  const [saving, setSaving] = useState(false);

  const options = useMemo(() => locales || [], [locales]);

  const continueWith = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await setLocale(selected, { markChosen: true });
      onComplete?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <img src="./logo.png" alt="Luma" className="onboarding-logo" />
        <h1>{t('onboarding.title')}</h1>
        <p className="onboarding-subtitle">{t('onboarding.subtitle')}</p>

        <div className="language-grid" role="listbox" aria-label={t('onboarding.title')}>
          {options.map((item) => (
            <button
              key={item.code}
              type="button"
              role="option"
              aria-selected={selected === item.code}
              className={`language-option ${selected === item.code ? 'selected' : ''}`}
              onClick={() => setSelected(item.code)}
            >
              <strong>{item.nativeName}</strong>
              <span>{item.englishName}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn-primary onboarding-continue"
          onClick={continueWith}
          disabled={!selected || saving}
        >
          {t('onboarding.continue')}
        </button>
      </div>
    </div>
  );
}

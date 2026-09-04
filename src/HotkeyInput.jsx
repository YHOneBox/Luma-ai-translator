import { useState } from 'react';
import { useI18n } from './i18n';

export function formatDisplay(accelerator) {
  if (!accelerator) return '';
  return accelerator
    .split('+')
    .map((part) => {
      const map = {
        CommandOrControl: 'Ctrl',
        Control: 'Ctrl',
        Command: 'Cmd',
        Alt: 'Alt',
        Shift: 'Shift',
        Super: 'Win',
        Space: 'Space',
        Plus: '+',
        Up: '↑',
        Down: '↓',
        Left: '←',
        Right: '→',
      };
      return map[part] || part;
    })
    .join(' + ');
}

export default function HotkeyInput({ label, value, onChange, defaultValue, onReset }) {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');

  const startRecording = async () => {
    setError('');
    setRecording(true);

    try {
      const accel = await window.electronAPI.recordHotkey();

      if (accel) {
        onChange(accel);
      }
    } catch (err) {
      setError(err.message || t('hotkey.recordFailed'));
    } finally {
      setRecording(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');

    if (onReset) {
      await onReset();
    } else if (defaultValue) {
      onChange(defaultValue);
    }
  };

  const isDefault = defaultValue && value === defaultValue;

  return (
    <div className="field hotkey-field">
      <span>{label}</span>
      <div className="hotkey-row">
        <div className={`hotkey-display ${recording ? 'recording' : ''}`}>
          {recording
            ? t('hotkey.listeningHint')
            : formatDisplay(value) || t('hotkey.empty')}
        </div>
        <button
          type="button"
          className="btn-secondary small hotkey-set"
          onClick={startRecording}
          disabled={recording}
        >
          {recording ? t('hotkey.listening') : t('hotkey.setKey')}
        </button>
        {defaultValue && (
          <button
            type="button"
            className="btn-secondary small hotkey-reset"
            onClick={handleReset}
            disabled={isDefault || recording}
            title={isDefault ? t('hotkey.alreadyDefault') : t('hotkey.resetTitle')}
          >
            {t('hotkey.reset')}
          </button>
        )}
      </div>
      {error && <small className="hotkey-error">{error}</small>}
    </div>
  );
}

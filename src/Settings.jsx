import { useEffect, useState, useCallback } from 'react';
import ModelSelect from './ModelSelect';
import HotkeyInput from './HotkeyInput';

export default function Settings({ onBack }) {
  const [settings, setSettings] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [models, setModels] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) return;

    const [current, defaultSettings] = await Promise.all([
      api.getSettings(),
      api.getDefaultSettings(),
    ]);
    setSettings(current);
    setDefaults(defaultSettings);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateField = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const scanModels = async () => {
    setScanning(true);
    setStatus('');
    try {
      const list = await window.electronAPI.scanModels();
      setModels(list);
      setStatus(`Found ${list.length} available model${list.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setStatus(err.message || 'Failed to scan models.');
    } finally {
      setScanning(false);
    }
  };

  const toggleFallback = (modelId) => {
    setSettings((prev) => {
      const current = prev.fallbackModels || [];
      const next = current.includes(modelId)
        ? current.filter((id) => id !== modelId)
        : [...current, modelId];
      return { ...prev, fallbackModels: next };
    });
  };

  const moveFallback = (modelId, direction) => {
    setSettings((prev) => {
      const list = [...(prev.fallbackModels || [])];
      const index = list.indexOf(modelId);
      if (index === -1) return prev;

      const target = index + direction;
      if (target < 0 || target >= list.length) return prev;

      [list[index], list[target]] = [list[target], list[index]];
      return { ...prev, fallbackModels: list };
    });
  };

  const save = async () => {
    setSaving(true);
    setStatus('');
    try {
      const saved = await window.electronAPI.saveSettings(settings);
      setSettings(saved);
      setStatus('Settings saved.');
    } catch (err) {
      setStatus(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const resetPrompt = () => {
    if (defaults) {
      updateField('systemPrompt', defaults.systemPrompt);
    }
  };

  const resetAll = async () => {
    const reset = await window.electronAPI.resetSettings();
    setSettings(reset);
    setStatus('Settings reset to defaults.');
  };

  const saveHotkey = async (key, value) => {
    if (!settings) return;

    const next = { ...settings, [key]: value };
    setSettings(next);

    try {
      const saved = await window.electronAPI.saveSettings(next);
      setSettings(saved);
      setStatus('Hotkey saved.');
    } catch (err) {
      setStatus(err.message || 'Failed to save hotkey.');
    }
  };

  const resetHotkey = async (key, defaultVal) => {
    if (!settings || !defaultVal) return;

    const next = { ...settings, [key]: defaultVal };
    setSettings(next);

    try {
      const saved = await window.electronAPI.saveSettings(next);
      setSettings(saved);
      setStatus('Hotkey reset and saved.');
    } catch (err) {
      setStatus(err.message || 'Failed to reset hotkey.');
    }
  };

  const resetAllHotkeys = async () => {
    if (!settings || !defaults) return;

    const next = {
      ...settings,
      hotkeyScreen: defaults.hotkeyScreen,
      hotkeyRegion: defaults.hotkeyRegion,
      hotkeySelection: defaults.hotkeySelection,
    };

    try {
      const saved = await window.electronAPI.saveSettings(next);
      setSettings(saved);
      setStatus('All hotkeys reset to defaults.');
    } catch (err) {
      setStatus(err.message || 'Failed to reset hotkeys.');
    }
  };

  if (!settings) {
    return (
      <div className="settings-page">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  const modelOptions =
    models.length > 0
      ? models
      : [
          { id: settings.primaryModel, displayName: settings.primaryModel },
          ...(settings.fallbackModels || []).map((id) => ({ id, displayName: id })),
        ];

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button className="back-btn" onClick={onBack} aria-label="Back">
          ←
        </button>
        <h1>Settings</h1>
      </header>

      <div className="settings-body">
        <section className="settings-section">
          <h2>Basic</h2>

          <label className="field">
            <span>Target language</span>
            <input
              type="text"
              value={settings.targetLanguage}
              onChange={(e) => updateField('targetLanguage', e.target.value)}
              placeholder="English"
            />
            <small>Used in the system prompt via {'{targetLanguage}'}.</small>
          </label>
        </section>

        <section className="settings-section">
          <div className="section-row">
            <h2>Hotkeys</h2>
            <button
              type="button"
              className="btn-secondary small"
              onClick={resetAllHotkeys}
            >
              Reset all hotkeys
            </button>
          </div>
          <small className="settings-section-hint">
            Click <strong>Set key</strong>, then press your shortcut. Saves automatically.
          </small>

          <HotkeyInput
            label="Translate screen"
            value={settings.hotkeyScreen}
            defaultValue={defaults?.hotkeyScreen}
            onChange={(v) => saveHotkey('hotkeyScreen', v)}
            onReset={() => resetHotkey('hotkeyScreen', defaults?.hotkeyScreen)}
          />
          <HotkeyInput
            label="Select region"
            value={settings.hotkeyRegion}
            defaultValue={defaults?.hotkeyRegion}
            onChange={(v) => saveHotkey('hotkeyRegion', v)}
            onReset={() => resetHotkey('hotkeyRegion', defaults?.hotkeyRegion)}
          />
          <HotkeyInput
            label="Translate selection"
            value={settings.hotkeySelection}
            defaultValue={defaults?.hotkeySelection}
            onChange={(v) => saveHotkey('hotkeySelection', v)}
            onReset={() => resetHotkey('hotkeySelection', defaults?.hotkeySelection)}
          />
        </section>

        <section className="settings-section">
          <div className="section-row">
            <h2>Models</h2>
            <button
              className="btn-secondary small"
              onClick={scanModels}
              disabled={scanning}
            >
              {scanning ? 'Scanning...' : 'Scan Available Models'}
            </button>
          </div>

          <label className="field">
            <span>Primary model</span>
            <ModelSelect
              value={settings.primaryModel}
              options={modelOptions}
              onChange={(id) => updateField('primaryModel', id)}
              placeholder="Scan models to choose"
            />
          </label>

          <div className="field">
            <span>Fallback models</span>
            <small>Tried in order if the primary model fails.</small>

            {modelOptions.length === 0 ? (
              <p className="settings-note">Scan models to configure fallbacks.</p>
            ) : (
              <ul className="fallback-list">
                {modelOptions
                  .filter((m) => m.id !== settings.primaryModel)
                  .map((m) => {
                    const selected = (settings.fallbackModels || []).includes(m.id);
                    const order = (settings.fallbackModels || []).indexOf(m.id);

                    return (
                      <li key={m.id} className={selected ? 'selected' : ''}>
                        <label className="fallback-check">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleFallback(m.id)}
                          />
                          <span>{m.displayName || m.id}</span>
                          {selected && <span className="order-badge">#{order + 1}</span>}
                        </label>
                        {selected && (
                          <span className="fallback-actions">
                            <button
                              type="button"
                              onClick={() => moveFallback(m.id, -1)}
                              disabled={order === 0}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveFallback(m.id, 1)}
                              disabled={order === (settings.fallbackModels?.length ?? 0) - 1}
                            >
                              ↓
                            </button>
                          </span>
                        )}
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </section>

        <section className="settings-section">
          <div className="section-row">
            <h2>System Prompt</h2>
            <button className="btn-secondary small" onClick={resetPrompt}>
              Reset to Default
            </button>
          </div>

          <label className="field">
            <textarea
              rows={10}
              value={settings.systemPrompt}
              onChange={(e) => updateField('systemPrompt', e.target.value)}
              spellCheck={false}
            />
            <small>
              Customize how the model interprets screenshots. Use {'{targetLanguage}'} as a
              placeholder.
            </small>
          </label>
        </section>
      </div>

      <footer className="settings-footer">
        {status && <p className="settings-status">{status}</p>}
        <div className="settings-actions">
          <button className="btn-secondary" onClick={resetAll}>
            Reset All
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </footer>
    </div>
  );
}

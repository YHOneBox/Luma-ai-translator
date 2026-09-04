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
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [addingKey, setAddingKey] = useState(false);
  const [showAddKeyForm, setShowAddKeyForm] = useState(false);

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
      hotkeyReplace: defaults.hotkeyReplace,
      hotkeyGrammar: defaults.hotkeyGrammar,
    };

    try {
      const saved = await window.electronAPI.saveSettings(next);
      setSettings(saved);
      setStatus('All hotkeys reset to defaults.');
    } catch (err) {
      setStatus(err.message || 'Failed to reset hotkeys.');
    }
  };

  const addApiKey = async () => {
    if (!newKeyValue.trim()) {
      setStatus('Enter an API key before adding.');
      return;
    }

    setAddingKey(true);
    setStatus('');
    try {
      const saved = await window.electronAPI.addApiKey({
        label: newKeyLabel.trim() || 'API Key',
        key: newKeyValue.trim(),
      });
      setSettings(saved);
      setNewKeyLabel('');
      setNewKeyValue('');
      setShowAddKeyForm(false);
      setStatus('API key added.');
    } catch (err) {
      setStatus(err.message || 'Failed to add API key.');
    } finally {
      setAddingKey(false);
    }
  };

  const cancelAddApiKey = () => {
    setShowAddKeyForm(false);
    setNewKeyLabel('');
    setNewKeyValue('');
  };

  const activateApiKey = async (id) => {
    setStatus('');
    try {
      const saved = await window.electronAPI.setActiveApiKey(id);
      setSettings(saved);
      setStatus('Active API key updated.');
    } catch (err) {
      setStatus(err.message || 'Failed to set active API key.');
    }
  };

  const deleteApiKey = async (id) => {
    setStatus('');
    try {
      const saved = await window.electronAPI.removeApiKey(id);
      setSettings(saved);
      setStatus('API key removed.');
    } catch (err) {
      setStatus(err.message || 'Failed to remove API key.');
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
          <h2>API Keys</h2>
          <small className="settings-section-hint">
            Add your Gemini API key here. Keys are stored locally on this device and never
            uploaded to GitHub. Get a key from{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.electronAPI?.openDictionary('https://aistudio.google.com/apikey');
              }}
            >
              Google AI Studio
            </a>
            .
          </small>

          {settings.hasEnvApiKey && (settings.apiKeys?.length ?? 0) === 0 && (
            <p className="settings-note api-key-env-note">
              A key was found in your local <code>.env</code> file and will be used until you
              add a key below.
            </p>
          )}

          {(settings.apiKeys?.length ?? 0) > 0 ? (
            <ul className="api-key-list">
              {settings.apiKeys.map((entry) => (
                <li key={entry.id} className={entry.isActive ? 'active' : ''}>
                  <label className="api-key-radio">
                    <input
                      type="radio"
                      name="activeApiKey"
                      checked={entry.isActive}
                      onChange={() => activateApiKey(entry.id)}
                    />
                    <span className="api-key-meta">
                      <strong>{entry.label}</strong>
                      <span className="api-key-mask">{entry.maskedKey}</span>
                    </span>
                  </label>
                  <button
                    type="button"
                    className="btn-secondary small api-key-delete"
                    onClick={() => deleteApiKey(entry.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="settings-note">No saved API keys yet.</p>
          )}

          {showAddKeyForm ? (
            <div className="api-key-add">
              <label className="field">
                <span>Label (optional)</span>
                <input
                  type="text"
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  placeholder="Personal / Work"
                  autoFocus
                />
              </label>
              <label className="field">
                <span>Gemini API key</span>
                <input
                  type="password"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  placeholder="AIza..."
                  autoComplete="off"
                />
              </label>
              <div className="api-key-add-actions">
                <button
                  type="button"
                  className="btn-secondary small"
                  onClick={cancelAddApiKey}
                  disabled={addingKey}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary small"
                  onClick={addApiKey}
                  disabled={addingKey}
                >
                  {addingKey ? 'Adding...' : 'Save key'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn-secondary small"
              onClick={() => setShowAddKeyForm(true)}
            >
              + Add API Key
            </button>
          )}
        </section>

        <section className="settings-section">
          <h2>Basic</h2>

          <label className="field">
            <span>Target language</span>
            <input
              type="text"
              value={settings.targetLanguage}
              onChange={(e) => updateField('targetLanguage', e.target.value)}
              placeholder="Chinese (Traditional)"
            />
            <small>
              Language for screen / selection lookup results via {'{targetLanguage}'}.
            </small>
          </label>

          <label className="field">
            <span>Replace language</span>
            <input
              type="text"
              value={settings.replaceLanguage || ''}
              onChange={(e) => updateField('replaceLanguage', e.target.value)}
              placeholder="English"
            />
            <small>
              Language used when replacing selected text in place (Replace Selection hotkey).
            </small>
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
          <HotkeyInput
            label="Replace selection"
            value={settings.hotkeyReplace}
            defaultValue={defaults?.hotkeyReplace}
            onChange={(v) => saveHotkey('hotkeyReplace', v)}
            onReset={() => resetHotkey('hotkeyReplace', defaults?.hotkeyReplace)}
          />
          <HotkeyInput
            label="Fix grammar"
            value={settings.hotkeyGrammar}
            defaultValue={defaults?.hotkeyGrammar}
            onChange={(v) => saveHotkey('hotkeyGrammar', v)}
            onReset={() => resetHotkey('hotkeyGrammar', defaults?.hotkeyGrammar)}
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

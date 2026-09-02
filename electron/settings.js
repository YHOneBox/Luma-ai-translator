const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULT_SYSTEM_PROMPT = `You are a professional translator and language tutor.
Look at the screenshot and identify any text visible in the image.
Translate the most prominent or selected text into {targetLanguage}.
If the text is already in {targetLanguage}, provide a clear definition and usage explanation instead.

Return structured JSON with:
- translation: the translation or definition in {targetLanguage}
- example_sentence: a natural example sentence using the word/phrase in the source language
- example_translation: translation of the example sentence into {targetLanguage}
- context_explanation: brief explanation of meaning and when to use it, in {targetLanguage}
- part_of_speech: part of speech abbreviation (e.g. n., v., adj.) when applicable, otherwise empty string
- base_word: the primary English dictionary headword (lowercase, single word or short phrase suitable for Cambridge Dictionary lookup)`;

const DEFAULT_SETTINGS = {
  primaryModel: 'gemini-3.6-flash',
  fallbackModels: ['gemini-3.5-flash', 'gemini-3.5-flash-lite'],
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  targetLanguage: 'English',
  hotkeyScreen: 'CommandOrControl+Shift+T',
  hotkeyRegion: 'CommandOrControl+Shift+R',
  hotkeySelection: 'CommandOrControl+Shift+S',
};

const DEPRECATED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]);

function migrateSettings(settings) {
  const migrated = { ...DEFAULT_SETTINGS, ...settings };
  let changed = false;

  if (DEPRECATED_MODELS.has(migrated.primaryModel)) {
    migrated.primaryModel = DEFAULT_SETTINGS.primaryModel;
    changed = true;
  }

  const filteredFallbacks = (migrated.fallbackModels || []).filter(
    (id) => !DEPRECATED_MODELS.has(id)
  );
  if (filteredFallbacks.length !== (migrated.fallbackModels || []).length) {
    migrated.fallbackModels = filteredFallbacks;
    changed = true;
  }

  for (const key of ['hotkeyScreen', 'hotkeyRegion', 'hotkeySelection']) {
    if (!migrated[key]) {
      migrated[key] = DEFAULT_SETTINGS[key];
      changed = true;
    }
  }

  return { migrated, changed };
}

let settingsCache = null;
let settingsPath = null;

function getSettingsPath() {
  if (!settingsPath) {
    settingsPath = path.join(app.getPath('userData'), 'settings.json');
  }
  return settingsPath;
}

function loadSettings() {
  if (settingsCache) return settingsCache;

  try {
    const filePath = getSettingsPath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const { migrated, changed } = migrateSettings({
        ...DEFAULT_SETTINGS,
        ...JSON.parse(raw),
      });
      settingsCache = migrated;
      if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(settingsCache, null, 2), 'utf8');
      }
      return settingsCache;
    }
  } catch {
    // fall through to defaults
  }

  settingsCache = { ...DEFAULT_SETTINGS };
  return settingsCache;
}

function saveSettings(updates) {
  const current = loadSettings();
  settingsCache = {
    ...current,
    ...updates,
    fallbackModels: Array.isArray(updates.fallbackModels)
      ? updates.fallbackModels
      : current.fallbackModels,
  };

  fs.mkdirSync(path.dirname(getSettingsPath()), { recursive: true });
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settingsCache, null, 2), 'utf8');
  return settingsCache;
}

function getDefaultSettings() {
  return { ...DEFAULT_SETTINGS };
}

function resetSettings() {
  settingsCache = { ...DEFAULT_SETTINGS };
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settingsCache, null, 2), 'utf8');
  return settingsCache;
}

function resolveSystemPrompt(settings) {
  const language = settings.targetLanguage || DEFAULT_SETTINGS.targetLanguage;
  return (settings.systemPrompt || DEFAULT_SYSTEM_PROMPT).replace(
    /\{targetLanguage\}/g,
    language
  );
}

module.exports = {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  getDefaultSettings,
  resetSettings,
  resolveSystemPrompt,
};

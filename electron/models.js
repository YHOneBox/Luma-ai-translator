const { GoogleGenAI } = require('@google/genai');

const SCAN_TIMEOUT_MS = 20000;

const BLOCKED_FRAGMENTS = [
  'embedding',
  'embed',
  'tts',
  'computer-use',
  'native-audio',
  'lyria',
  'imagen',
  'aqa',
  'gemma',
  'learnlm',
  'image-preview',
  'flash-image',
  'pro-image',
  'lite-image',
  'customtools',
  'preview-tts',
  'omni',
  '-latest',
  'lite-preview',
  'exp',
  'experimental',
];

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function normalizeModelId(name) {
  if (!name) return '';
  return name.replace(/^models\//, '');
}

function isTranslationModel(id) {
  if (!id.startsWith('gemini')) return false;

  const lower = id.toLowerCase();
  if (BLOCKED_FRAGMENTS.some((fragment) => lower.includes(fragment))) {
    return false;
  }

  return lower.includes('flash') || lower.includes('pro');
}

function isUsableForGenerate(model, id) {
  if (!isTranslationModel(id)) return false;

  const actions = model.supportedActions ?? [];
  if (actions.length === 0) return true;

  return actions.includes('generateContent');
}

async function collectModels(pager, limit = 100) {
  const models = [];
  for await (const model of pager) {
    models.push(model);
    if (models.length >= limit) break;
  }
  return models;
}

/**
 * Fetch Gemini models available to this API key for screenshot translation.
 * Uses the models.list API — only models your key can access are returned.
 */
async function scanAvailableModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Add your key in the .env file.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const pager = await withTimeout(
    ai.models.list({ config: { pageSize: 100, queryBase: true } }),
    SCAN_TIMEOUT_MS,
    'Model list request timed out. Check your network and API key.'
  );

  const listed = await withTimeout(
    collectModels(pager),
    SCAN_TIMEOUT_MS,
    'Reading model list timed out.'
  );

  const available = [];

  for (const model of listed) {
    const id = normalizeModelId(model.name);
    if (!id || !isUsableForGenerate(model, id)) continue;

    available.push({
      id,
      displayName: model.displayName || id,
      description: model.description || '',
    });
  }

  available.sort((a, b) => a.id.localeCompare(b.id));
  return available;
}

module.exports = { scanAvailableModels };

const { GoogleGenAI, Type } = require('@google/genai');
const { loadSettings, resolveSystemPrompt } = require('./settings');

const MODEL_TIMEOUT_MS = 45000;

const TRANSLATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    translation: {
      type: Type.STRING,
      description: 'The translated text.',
    },
    example_sentence: {
      type: Type.STRING,
      description: 'An example sentence using the source word or phrase in context (in the source language).',
    },
    example_translation: {
      type: Type.STRING,
      description: 'Translation of the example sentence into the target language.',
    },
    context_explanation: {
      type: Type.STRING,
      description: 'A brief explanation of the meaning and usage context in the target language.',
    },
    part_of_speech: {
      type: Type.STRING,
      description: 'Part of speech abbreviation, e.g. n., v., adj., adv.',
    },
    base_word: {
      type: Type.STRING,
      description:
        'The primary English dictionary headword for lookup (lowercase, no punctuation).',
    },
  },
  required: [
    'translation',
    'example_sentence',
    'example_translation',
    'context_explanation',
    'base_word',
    'part_of_speech',
  ],
  propertyOrdering: [
    'translation',
    'example_sentence',
    'example_translation',
    'context_explanation',
    'part_of_speech',
    'base_word',
  ],
};

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function getModelChain(settings) {
  const chain = [settings.primaryModel, ...(settings.fallbackModels || [])].filter(Boolean);
  return [...new Set(chain)];
}

function formatResult(parsed, modelUsed, extra = {}) {
  const baseWord = String(parsed.base_word || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

  return {
    translation: parsed.translation ?? '',
    example_sentence: parsed.example_sentence ?? '',
    example_translation: parsed.example_translation ?? '',
    context_explanation: parsed.context_explanation ?? '',
    part_of_speech: parsed.part_of_speech ?? '',
    base_word: parsed.base_word ?? '',
    dictionaryUrl: `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(baseWord)}`,
    modelUsed,
    ...extra,
  };
}

function shortenError(err) {
  const message = err?.message || 'failed';

  try {
    const parsed = JSON.parse(message);
    return parsed?.error?.message || message;
  } catch {
    return message;
  }
}

async function generateWithFallback(ai, settings, systemPrompt, contents, onProgress) {
  const modelsToTry = getModelChain(settings);
  if (modelsToTry.length === 0) {
    throw new Error('No models configured. Open Settings and select a primary model.');
  }

  const errors = [];

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    const attempt = i + 1;

    onProgress?.(
      modelsToTry.length > 1
        ? `Translating (${attempt}/${modelsToTry.length}): ${model}...`
        : `Translating with ${model}...`
    );

    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseJsonSchema: TRANSLATION_SCHEMA,
          },
        }),
        MODEL_TIMEOUT_MS,
        `Timed out after ${MODEL_TIMEOUT_MS / 1000}s`
      );

      const text = response.text;
      if (!text) {
        throw new Error('Empty response from model.');
      }

      return { parsed: JSON.parse(text), model };
    } catch (err) {
      errors.push(`${model}: ${shortenError(err)}`);
    }
  }

  throw new Error(`All models failed:\n${errors.join('\n')}`);
}

async function translateScreenshot(imageBuffer, onProgress) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.');
  }

  const settings = loadSettings();
  const systemPrompt = resolveSystemPrompt(settings);
  const ai = new GoogleGenAI({ apiKey });

  const { parsed, model } = await generateWithFallback(
    ai,
    settings,
    systemPrompt,
    [
      {
        role: 'user',
        parts: [
          { text: 'Analyze the screenshot and return the structured translation.' },
          {
            inlineData: {
              mimeType: 'image/png',
              data: imageBuffer.toString('base64'),
            },
          },
        ],
      },
    ],
    onProgress
  );

  return formatResult(parsed, model);
}

async function translateText(text, onProgress) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.');
  }

  const settings = loadSettings();
  const systemPrompt = resolveSystemPrompt(settings);
  const ai = new GoogleGenAI({ apiKey });

  onProgress?.('Reading selection...');

  const { parsed, model } = await generateWithFallback(
    ai,
    settings,
    systemPrompt,
    [
      {
        role: 'user',
        parts: [
          {
            text: `Translate the following selected text and return structured JSON:\n\n${text}`,
          },
        ],
      },
    ],
    onProgress
  );

  return formatResult(parsed, model, { sourceText: text });
}

module.exports = { translateScreenshot, translateText };

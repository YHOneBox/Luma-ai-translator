const PRONUNCIATION_TIMEOUT_MS = 35000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}

function normalizeAudioUrl(url) {
  if (!url) return null;
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

function isSingleEnglishWord(text) {
  const word = String(text || '').trim();
  if (!word || /\s/.test(word)) return false;
  return /^[a-zA-Z'-]+$/.test(word);
}

function pickPhoneticAndAudio(phonetics, entryPhonetic) {
  let phonetic = entryPhonetic || '';
  let audioUk = null;
  let audioUs = null;
  let audioAny = null;

  for (const item of phonetics || []) {
    if (item.text && !phonetic) {
      phonetic = item.text;
    }

    const url = normalizeAudioUrl(item.audio);
    if (!url) continue;

    const lower = url.toLowerCase();
    if (lower.includes('-uk') || lower.includes('_gb_') || lower.includes('/uk_')) {
      audioUk = audioUk || url;
    } else if (lower.includes('-us') || lower.includes('_us_') || lower.includes('/us_')) {
      audioUs = audioUs || url;
    } else {
      audioAny = audioAny || url;
    }
  }

  if (!audioUs && audioAny) audioUs = audioAny;
  if (!audioUk && audioAny && audioAny !== audioUs) audioUk = audioAny;

  return {
    phonetic: phonetic.trim(),
    audioUk,
    audioUs,
  };
}

/**
 * @param {string} word
 */
async function fetchPronunciation(word) {
  const clean = String(word || '')
    .trim()
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z'-]+$/g, '');

  if (!clean || !isSingleEnglishWord(clean)) return null;

  const response = await withTimeout(
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`),
    PRONUNCIATION_TIMEOUT_MS
  );

  if (!response.ok) return null;

  const entries = await response.json();
  const entry = entries[0];
  if (!entry) return null;

  const { phonetic, audioUk, audioUs } = pickPhoneticAndAudio(
    entry.phonetics,
    entry.phonetic
  );

  if (!phonetic && !audioUk && !audioUs) return null;

  return { phonetic, audioUk, audioUs, lookupWord: clean };
}

function resolveLookupWord(result) {
  const candidates = [result.base_word, result.translation, result.sourceText];

  for (const candidate of candidates) {
    const word = String(candidate || '').trim().split(/\s+/)[0];
    if (isSingleEnglishWord(word)) {
      return word.toLowerCase();
    }
  }

  return null;
}

async function enrichWithPronunciation(result) {
  const lookupWord = resolveLookupWord(result);

  if (!lookupWord) {
    return { ...result, isSingleWord: false };
  }

  const base = { ...result, isSingleWord: true, lookupWord };

  try {
    const pronunciation = await fetchPronunciation(lookupWord);
    if (!pronunciation) return base;

    return {
      ...base,
      phonetic: pronunciation.phonetic || '',
      audioUk: pronunciation.audioUk || null,
      audioUs: pronunciation.audioUs || null,
    };
  } catch {
    return base;
  }
}

module.exports = {
  fetchPronunciation,
  enrichWithPronunciation,
  isSingleEnglishWord,
  resolveLookupWord,
};

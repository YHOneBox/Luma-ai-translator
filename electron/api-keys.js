const crypto = require('crypto');

function generateApiKeyId() {
  return crypto.randomUUID();
}

function maskApiKey(key) {
  const value = String(key || '').trim();
  if (!value) return '';
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}${'•'.repeat(Math.min(12, value.length - 8))}${value.slice(-4)}`;
}

function resolveApiKey(settings) {
  const keys = settings?.apiKeys || [];
  const activeId = settings?.activeApiKeyId;

  if (activeId) {
    const active = keys.find((entry) => entry.id === activeId);
    if (active?.key?.trim()) return active.key.trim();
  }

  const first = keys.find((entry) => entry.key?.trim());
  if (first) return first.key.trim();

  return process.env.GEMINI_API_KEY?.trim() || '';
}

function getApiKeysPublic(settings) {
  const keys = settings?.apiKeys || [];
  const activeId =
    settings?.activeApiKeyId || (keys.length > 0 ? keys[0].id : null);

  return keys.map((entry) => ({
    id: entry.id,
    label: entry.label || 'API Key',
    maskedKey: maskApiKey(entry.key),
    isActive: entry.id === activeId,
  }));
}

function addApiKey(settings, { label, key }) {
  const trimmedKey = String(key || '').trim();
  if (!trimmedKey) {
    throw new Error('API key cannot be empty.');
  }

  const entry = {
    id: generateApiKeyId(),
    label: String(label || '').trim() || 'API Key',
    key: trimmedKey,
    createdAt: new Date().toISOString(),
  };

  const apiKeys = [...(settings.apiKeys || []), entry];
  const activeApiKeyId = settings.activeApiKeyId || entry.id;

  return { apiKeys, activeApiKeyId };
}

function removeApiKey(settings, id) {
  const apiKeys = (settings.apiKeys || []).filter((entry) => entry.id !== id);
  let activeApiKeyId = settings.activeApiKeyId;

  if (activeApiKeyId === id) {
    activeApiKeyId = apiKeys[0]?.id || null;
  }

  return { apiKeys, activeApiKeyId };
}

function setActiveApiKey(settings, id) {
  const exists = (settings.apiKeys || []).some((entry) => entry.id === id);
  if (!exists) {
    throw new Error('API key not found.');
  }

  return { activeApiKeyId: id };
}

function updateApiKeyLabel(settings, id, label) {
  const apiKeys = (settings.apiKeys || []).map((entry) =>
    entry.id === id
      ? { ...entry, label: String(label || '').trim() || 'API Key' }
      : entry
  );

  return { apiKeys };
}

module.exports = {
  resolveApiKey,
  getApiKeysPublic,
  maskApiKey,
  addApiKey,
  removeApiKey,
  setActiveApiKey,
  updateApiKeyLabel,
};

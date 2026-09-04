const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  translateScreen: () => ipcRenderer.send('translate:screen'),
  translateRegion: () => ipcRenderer.send('translate:region'),
  translateSelection: () => ipcRenderer.send('translate:selection'),
  translateReplace: () => ipcRenderer.send('translate:replace'),
  translateGrammar: () => ipcRenderer.send('translate:grammar'),
  onTranslationLoading: (callback) => {
    ipcRenderer.on('translation:loading', (_event, data) => callback(data));
  },
  onTranslationResult: (callback) => {
    ipcRenderer.on('translation:result', (_event, data) => callback(data));
  },
  onTranslationError: (callback) => {
    ipcRenderer.on('translation:error', (_event, data) => callback(data));
  },
  onTranslationPronunciation: (callback) => {
    ipcRenderer.on('translation:pronunciation', (_event, data) => callback(data));
  },
  closePopup: () => ipcRenderer.send('popup:close'),
  openDictionary: (url) => ipcRenderer.send('dictionary:open', url),
  regionComplete: (region) => ipcRenderer.send('region:complete', region),
  regionCancel: () => ipcRenderer.send('region:cancel'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  getDefaultSettings: () => ipcRenderer.invoke('settings:getDefaults'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  addApiKey: (payload) => ipcRenderer.invoke('apiKeys:add', payload),
  removeApiKey: (id) => ipcRenderer.invoke('apiKeys:remove', id),
  setActiveApiKey: (id) => ipcRenderer.invoke('apiKeys:setActive', id),
  updateApiKeyLabel: (payload) => ipcRenderer.invoke('apiKeys:updateLabel', payload),
  scanModels: () => ipcRenderer.invoke('models:scan'),
  recordHotkey: () => ipcRenderer.invoke('hotkey:record'),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getI18nBundle: () => ipcRenderer.invoke('i18n:getBundle'),
  getSupportedLocales: () => ipcRenderer.invoke('i18n:getLocales'),
  setUiLocale: (payload) => ipcRenderer.invoke('i18n:setLocale', payload),
  onStatusMessage: (callback) => {
    ipcRenderer.on('status:message', (_event, data) => callback(data));
  },
});

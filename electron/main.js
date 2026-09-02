require('dotenv').config();

const path = require('path');

// Optional .env next to the portable .exe (developer / power-user fallback)
require('dotenv').config({ path: path.join(path.dirname(process.execPath), '.env') });

const { app } = require('electron');
const { configureAppPaths, cleanupPortableCache } = require('./app-paths');

configureAppPaths();

// Reduce disk footprint for packaged builds
if (app.isPackaged) {
  app.commandLine.appendSwitch('disable-http-cache');
}

const {
  BrowserWindow,
  globalShortcut,
  ipcMain,
  shell,
  Tray,
  Menu,
  screen,
  nativeImage,
} = require('electron');
const { captureScreen } = require('./capture');
const { translateScreenshot, translateText } = require('./gemini');
const { getSelectedText } = require('./selection');
const {
  loadSettings,
  saveSettings,
  saveApiKeyState,
  getDefaultSettings,
  resetSettings,
  getPublicSettings,
} = require('./settings');
const {
  addApiKey,
  removeApiKey,
  setActiveApiKey,
  updateApiKeyLabel,
} = require('./api-keys');
const { scanAvailableModels } = require('./models');
const { validateHotkeys } = require('./hotkey-utils');
const { enrichWithPronunciation, enrichPhraseResult, resolveLookupWord } = require('./pronunciation');
const { resolveLayoutMode } = require('./translate-mode');
const { recordHotkey } = require('./hotkey-recorder');

const isDev = !app.isPackaged;
const ICON_PATH = path.join(__dirname, '../assets/logo.png');

let tray = null;
let mainWindow = null;
let popupWindow = null;
let regionWindow = null;
let appIsQuitting = false;

function getPageUrl(page) {
  const file = page === 'main' ? 'index' : page;
  if (isDev) {
    return `http://localhost:5173/${file}.html`;
  }
  return `file://${path.join(__dirname, '../dist', `${file}.html`)}`;
}

function createTrayIcon() {
  const image = nativeImage.createFromPath(ICON_PATH);
  if (process.platform === 'win32') {
    return image.resize({ width: 32, height: 32 });
  }
  return image;
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('AI Translate');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open AI Translate', click: () => showMainWindow() },
    { type: 'separator' },
    { label: 'Translate Screen', click: () => startTranslation(null) },
    { label: 'Translate Selection', click: () => startSelectionTranslation() },
    { label: 'Select Region', click: () => openRegionSelector() },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        appIsQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => showMainWindow());
}

function showMainWindow() {
  createMainWindow();
  mainWindow.show();
  mainWindow.focus();
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 460,
    height: 720,
    minWidth: 400,
    minHeight: 560,
    title: 'AI Translate',
    icon: ICON_PATH,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(getPageUrl('main'));

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  mainWindow.on('close', (e) => {
    if (!appIsQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function createPopupWindow() {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.close();
  }

  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const popupWidth = 460;
  const popupHeight = 520;

  let x = cursor.x + 16;
  let y = cursor.y + 16;

  if (x + popupWidth > display.bounds.x + display.bounds.width) {
    x = display.bounds.x + display.bounds.width - popupWidth - 16;
  }
  if (y + popupHeight > display.bounds.y + display.bounds.height) {
    y = display.bounds.y + display.bounds.height - popupHeight - 16;
  }

  popupWindow = new BrowserWindow({
    width: popupWidth,
    height: popupHeight,
    minWidth: 340,
    minHeight: 380,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: true,
    movable: true,
    ...(process.platform === 'win32' ? { thickFrame: true } : {}),
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  popupWindow.loadURL(getPageUrl('popup'));

  popupWindow.once('ready-to-show', () => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.show();
      popupWindow.focus();
    }
  });

  popupWindow.on('closed', () => {
    popupWindow = null;
  });

  return popupWindow;
}

function openRegionSelector() {
  if (regionWindow && !regionWindow.isDestroyed()) {
    regionWindow.focus();
    return;
  }

  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { x, y, width, height } = display.bounds;

  regionWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  regionWindow.loadURL(getPageUrl('region'));

  regionWindow.on('closed', () => {
    regionWindow = null;
  });
}

async function waitForPopupReady() {
  if (!popupWindow || popupWindow.isDestroyed()) return;

  if (popupWindow.webContents.isLoading()) {
    await new Promise((resolve) => {
      popupWindow.webContents.once('did-finish-load', resolve);
    });
  }
}

function sendToPopup(channel, data) {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.webContents.send(channel, data);
  }
}

async function runWithPopup(task) {
  createPopupWindow();
  await waitForPopupReady();

  const sendProgress = (message) => {
    sendToPopup('translation:loading', { message });
  };

  try {
    const result = await task(sendProgress);
    const layoutMode = resolveLayoutMode(result);
    let enriched;

    if (layoutMode === 'word') {
      sendProgress('Loading pronunciation...');
      enriched = await enrichWithPronunciation(result);
    } else {
      sendProgress('Loading audio...');
      const { targetLanguage } = loadSettings();
      enriched = await enrichPhraseResult(result, targetLanguage);
    }

    sendToPopup('translation:result', {
      ...enriched,
      layoutMode: enriched.layoutMode || layoutMode,
      isSingleWord: layoutMode === 'word' && Boolean(enriched.isSingleWord),
      lookupWord: enriched.lookupWord || resolveLookupWord(enriched) || undefined,
    });
  } catch (err) {
    sendToPopup('translation:error', {
      message: err.message || 'Translation failed.',
    });
  }
}

async function startTranslation(region) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
  if (regionWindow && !regionWindow.isDestroyed()) {
    regionWindow.hide();
  }

  await new Promise((resolve) => setTimeout(resolve, 200));

  await runWithPopup(async (sendProgress) => {
    sendProgress('Capturing screen...');
    const imageBuffer = await captureScreen(region);
    return translateScreenshot(imageBuffer, sendProgress);
  });
}

async function startSelectionTranslation() {
  let text;

  try {
    text = await getSelectedText();
  } catch (err) {
    createPopupWindow();
    await waitForPopupReady();
    sendToPopup('translation:error', {
      message: err.message || 'Could not read selected text.',
    });
    return;
  }

  await runWithPopup(async (sendProgress) => translateText(text, sendProgress));
}

function registerHotkeys() {
  globalShortcut.unregisterAll();

  const settings = loadSettings();
  const bindings = [
    { accel: settings.hotkeyScreen, action: () => startTranslation(null) },
    { accel: settings.hotkeyRegion, action: () => openRegionSelector() },
    { accel: settings.hotkeySelection, action: () => startSelectionTranslation() },
  ];

  const failed = [];

  for (const { accel, action } of bindings) {
    if (!accel) continue;
    const ok = globalShortcut.register(accel, action);
    if (!ok) failed.push(accel);
  }

  if (failed.length > 0) {
    console.warn('Failed to register hotkeys (may be in use):', failed.join(', '));
  }
}

function setupIpc() {
  ipcMain.on('translate:screen', () => startTranslation(null));
  ipcMain.on('translate:region', () => openRegionSelector());
  ipcMain.on('translate:selection', () => startSelectionTranslation());

  ipcMain.on('popup:close', () => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.close();
    }
  });

  ipcMain.on('dictionary:open', (_event, url) => {
    if (url) shell.openExternal(url);
  });

  ipcMain.on('region:complete', (_event, region) => {
    if (regionWindow && !regionWindow.isDestroyed()) {
      regionWindow.close();
    }
    startTranslation(region);
  });

  ipcMain.on('region:cancel', () => {
    if (regionWindow && !regionWindow.isDestroyed()) {
      regionWindow.close();
    }
  });

  ipcMain.handle('settings:get', () => getPublicSettings());
  ipcMain.handle('settings:getDefaults', () => getDefaultSettings());
  ipcMain.handle('settings:save', (_event, updates) => {
    validateHotkeys({ ...loadSettings(), ...updates });
    saveSettings(updates);
    registerHotkeys();
    return getPublicSettings();
  });
  ipcMain.handle('settings:reset', () => {
    resetSettings();
    registerHotkeys();
    return getPublicSettings();
  });

  ipcMain.handle('apiKeys:add', (_event, payload) => {
    const current = loadSettings();
    const next = addApiKey(current, payload);
    saveApiKeyState(next);
    return getPublicSettings();
  });

  ipcMain.handle('apiKeys:remove', (_event, id) => {
    const current = loadSettings();
    const next = removeApiKey(current, id);
    saveApiKeyState(next);
    return getPublicSettings();
  });

  ipcMain.handle('apiKeys:setActive', (_event, id) => {
    const current = loadSettings();
    const next = setActiveApiKey(current, id);
    saveApiKeyState(next);
    return getPublicSettings();
  });

  ipcMain.handle('apiKeys:updateLabel', (_event, { id, label }) => {
    const current = loadSettings();
    const next = updateApiKeyLabel(current, id, label);
    saveApiKeyState(next);
    return getPublicSettings();
  });
  ipcMain.handle('models:scan', async () => {
    try {
      return await scanAvailableModels();
    } catch (err) {
      throw new Error(err.message || 'Failed to scan models.');
    }
  });

  ipcMain.handle('hotkey:record', (event) =>
    recordHotkey(event.sender, registerHotkeys)
  );
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.aitranslate.app');
  }

  createTray();
  createMainWindow();
  registerHotkeys();
  setupIpc();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  cleanupPortableCache();
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('activate', () => {
  showMainWindow();
});

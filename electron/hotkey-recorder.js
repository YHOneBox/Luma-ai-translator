const { BrowserWindow, globalShortcut } = require('electron');
const { inputToAccelerator } = require('./hotkey-utils');

let activeRecording = null;

/**
 * Record a keyboard shortcut from the main process (reliable multi-key capture).
 * @param {import('electron').WebContents} webContents
 * @param {() => void} restoreHotkeys
 * @returns {Promise<string|null>}
 */
function recordHotkey(webContents, restoreHotkeys) {
  if (activeRecording) {
    activeRecording.cancel();
  }

  const win = BrowserWindow.fromWebContents(webContents);
  if (!win) {
    return Promise.reject(new Error('Settings window not available.'));
  }

  globalShortcut.unregisterAll();

  return new Promise((resolve) => {
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      win.webContents.removeListener('before-input-event', handler);
      activeRecording = null;
      restoreHotkeys();
      resolve(value);
    };

    const cancel = () => finish(null);

    activeRecording = { cancel };

    const timeout = setTimeout(() => finish(null), 30000);

    const handler = (_event, input) => {
      if (input.type !== 'keyDown') return;

      if (input.key === 'Escape') {
        finish(null);
        return;
      }

      const accel = inputToAccelerator(input);
      if (accel) {
        finish(accel);
      }
    };

    win.webContents.on('before-input-event', handler);
    win.show();
    win.focus();
  });
}

module.exports = { recordHotkey };

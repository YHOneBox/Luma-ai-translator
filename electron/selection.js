const { clipboard, BrowserWindow } = require('electron');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function saveClipboard() {
  return {
    text: clipboard.readText(),
    html: clipboard.readHTML(),
    hasImage: !clipboard.readImage().isEmpty(),
    image: clipboard.readImage(),
  };
}

function restoreClipboard(saved) {
  if (saved.hasImage && !saved.image.isEmpty()) {
    clipboard.writeImage(saved.image);
  } else if (saved.html) {
    clipboard.write({ text: saved.text, html: saved.html });
  } else {
    clipboard.writeText(saved.text);
  }
}

async function simulateCopyWindows() {
  await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-Sta',
    '-Command',
    [
      '$ErrorActionPreference = "Stop"',
      'Add-Type -AssemblyName System.Windows.Forms',
      'Start-Sleep -Milliseconds 80',
      '[System.Windows.Forms.SendKeys]::SendWait("^c")',
    ].join('; '),
  ]);
}

async function simulateCopyMac() {
  await execFileAsync('osascript', [
    '-e',
    'tell application "System Events" to keystroke "c" using command down',
  ]);
}

async function simulateCopyLinux() {
  await execFileAsync('xdotool', ['key', '--clearmodifiers', 'ctrl+c']);
}

async function simulateCopy() {
  if (process.platform === 'win32') {
    await simulateCopyWindows();
  } else if (process.platform === 'darwin') {
    await simulateCopyMac();
  } else {
    await simulateCopyLinux();
  }
}

async function simulatePasteWindows() {
  await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-Sta',
    '-Command',
    [
      '$ErrorActionPreference = "Stop"',
      'Add-Type -AssemblyName System.Windows.Forms',
      'Start-Sleep -Milliseconds 80',
      '[System.Windows.Forms.SendKeys]::SendWait("^v")',
    ].join('; '),
  ]);
}

async function simulatePasteMac() {
  await execFileAsync('osascript', [
    '-e',
    'tell application "System Events" to keystroke "v" using command down',
  ]);
}

async function simulatePasteLinux() {
  await execFileAsync('xdotool', ['key', '--clearmodifiers', 'ctrl+v']);
}

async function simulatePaste() {
  if (process.platform === 'win32') {
    await simulatePasteWindows();
  } else if (process.platform === 'darwin') {
    await simulatePasteMac();
  } else {
    await simulatePasteLinux();
  }
}

async function hideAppWindows() {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    // Keep the replace status bar visible while work is in progress.
    if (win.getTitle() === 'Luma Status') continue;
    win.hide();
  }
  await sleep(200);
}

/**
 * Copy the current text selection from the foreground application.
 * Must be called BEFORE opening any app window so focus stays on the source app.
 * @returns {Promise<string>}
 */
async function getSelectedText() {
  await hideAppWindows();
  await sleep(100);

  const saved = saveClipboard();
  const previousText = saved.text;

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      await simulateCopy();
      await sleep(attempt === 0 ? 350 : 500);

      const text = clipboard.readText().trim();
      if (text && text !== previousText) {
        restoreClipboard(saved);
        return text;
      }
    }

    throw new Error(
      'Could not copy selected text. Highlight a word in another app first, then use the hotkey (do not click this app before pressing it).'
    );
  } catch (err) {
    restoreClipboard(saved);
    throw err;
  }
}

/**
 * Paste text into the focused app (replaces the current selection when still selected).
 * Keeps Luma windows hidden so focus stays on the source app.
 * @param {string} text
 */
async function replaceSelectedText(text) {
  const value = String(text || '');
  if (!value) {
    throw new Error('Nothing to paste.');
  }

  await hideAppWindows();
  await sleep(100);

  const saved = saveClipboard();

  try {
    clipboard.writeText(value);
    await sleep(80);
    await simulatePaste();
    await sleep(200);
  } finally {
    restoreClipboard(saved);
  }
}

module.exports = { getSelectedText, replaceSelectedText };

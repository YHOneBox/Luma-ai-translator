const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let dataRoot = null;

/**
 * Keep all persistent files next to the portable .exe (not in AppData).
 * electron-builder sets PORTABLE_EXECUTABLE_DIR for portable builds.
 */
function configureAppPaths() {
  if (!app.isPackaged) {
    return null;
  }

  const portableExeDir =
    process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);

  dataRoot = path.join(portableExeDir, 'AI-Translate-Data');

  app.setPath('userData', path.join(dataRoot, 'userData'));
  app.setPath('cache', path.join(dataRoot, 'cache'));
  app.setPath('sessionData', path.join(dataRoot, 'session'));

  fs.mkdirSync(app.getPath('userData'), { recursive: true });

  const readmePath = path.join(dataRoot, 'README.txt');
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(
      readmePath,
      `# AI Translate — local data folder
# Safe to delete this entire "AI-Translate-Data" folder to remove all saved settings.
# The portable app does NOT write to Windows AppData or the registry.

# Contents:
#   userData/settings.json  — hotkeys, models, API keys (if saved in Settings)
#   cache/                  — temporary cache (cleared when the app exits)
#   session/                — temporary session files (cleared when the app exits)
`,
      'utf8'
    );
  }

  return dataRoot;
}

function getDataRoot() {
  return dataRoot;
}

/**
 * Remove disposable Chromium cache on exit. Settings are kept until user deletes the data folder.
 */
function cleanupPortableCache() {
  if (!app.isPackaged || !dataRoot) return;

  for (const subfolder of ['cache', 'session']) {
    const dir = path.join(dataRoot, subfolder);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

module.exports = {
  configureAppPaths,
  getDataRoot,
  cleanupPortableCache,
};

const { desktopCapturer, screen, nativeImage } = require('electron');

const MAX_DIMENSION = 1920;

function optimizeImage(image) {
  const { width, height } = image.getSize();
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return image;
  }

  if (width >= height) {
    return image.resize({ width: MAX_DIMENSION, quality: 'good' });
  }

  return image.resize({ height: MAX_DIMENSION, quality: 'good' });
}

/**
 * Capture the screen under the cursor as a PNG buffer.
 */
async function captureScreen(region = null) {
  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);
  const { width, height } = display.size;
  const scaleFactor = display.scaleFactor;

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.round(width * scaleFactor),
      height: Math.round(height * scaleFactor),
    },
  });

  const source =
    sources.find((s) => s.display_id === String(display.id)) ?? sources[0];

  if (!source) {
    throw new Error('No screen source available for capture.');
  }

  let image = source.thumbnail;

  if (region) {
    const cropX = Math.round((region.x - display.bounds.x) * scaleFactor);
    const cropY = Math.round((region.y - display.bounds.y) * scaleFactor);
    const cropW = Math.round(region.width * scaleFactor);
    const cropH = Math.round(region.height * scaleFactor);

    image = image.crop({
      x: Math.max(0, cropX),
      y: Math.max(0, cropY),
      width: Math.min(cropW, image.getSize().width - cropX),
      height: Math.min(cropH, image.getSize().height - cropY),
    });
  }

  return optimizeImage(image).toPNG();
}

module.exports = { captureScreen };

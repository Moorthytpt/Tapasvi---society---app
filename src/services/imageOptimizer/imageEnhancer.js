/**
 * imageEnhancer.js
 * -----------------------------------------------------------------------
 * Pure pixel-level enhancement filters. Each function takes a canvas and
 * returns a NEW canvas (never mutates the input), so the caller can keep
 * "original" and "optimized" versions side by side.
 *
 * These are lightweight, dependency-free canvas filters — not a full
 * computer-vision pipeline. They're tuned for photographed paper
 * documents (registers, forms) under normal indoor lighting.
 * -----------------------------------------------------------------------
 */

function cloneCanvas(canvas) {
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height;
  out.getContext('2d').drawImage(canvas, 0, 0);
  return out;
}

/**
 * Removes uneven shadows by estimating a smoothed "background" brightness
 * map (via a large-radius box blur) and dividing each pixel by it. This
 * flattens gradual lighting falloff across a page (e.g. one side of a
 * photographed register darker than the other).
 */
export function removeShadows(canvas) {
  const w = canvas.width,
    h = canvas.height;
  const src = canvas.getContext('2d').getImageData(0, 0, w, h);

  // Build a heavily downscaled + blurred luminance map as the background estimate.
  const bgCanvas = document.createElement('canvas');
  const bgScale = 0.1;
  bgCanvas.width = Math.max(1, Math.round(w * bgScale));
  bgCanvas.height = Math.max(1, Math.round(h * bgScale));
  const bgCtx = bgCanvas.getContext('2d');
  bgCtx.filter = 'blur(4px)';
  bgCtx.drawImage(canvas, 0, 0, bgCanvas.width, bgCanvas.height);
  const bgData = bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height);

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const outCtx = out.getContext('2d');
  const outData = outCtx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    const by = Math.min(bgCanvas.height - 1, Math.floor(y * bgScale));
    for (let x = 0; x < w; x++) {
      const bx = Math.min(bgCanvas.width - 1, Math.floor(x * bgScale));
      const bIdx = (by * bgCanvas.width + bx) * 4;
      const bgLum = (bgData.data[bIdx] + bgData.data[bIdx + 1] + bgData.data[bIdx + 2]) / 3 || 1;

      const idx = (y * w + x) * 4;
      // Normalize against local background, then rescale to target ~230 white point.
      const factor = 230 / Math.max(30, bgLum);
      outData.data[idx] = Math.min(255, src.data[idx] * factor);
      outData.data[idx + 1] = Math.min(255, src.data[idx + 1] * factor);
      outData.data[idx + 2] = Math.min(255, src.data[idx + 2] * factor);
      outData.data[idx + 3] = src.data[idx + 3];
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return out;
}

/** Brightness + contrast adjustment. brightness/contrast in range -100..100. */
export function adjustBrightnessContrast(canvas, brightness = 15, contrast = 20) {
  const out = cloneCanvas(canvas);
  const ctx = out.getContext('2d');
  const imageData = ctx.getImageData(0, 0, out.width, out.height);
  const data = imageData.data;

  const b = brightness;
  const c = (contrast / 100) + 1; // contrast factor
  const intercept = 128 * (1 - c);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(data[i] * c + intercept + b);
    data[i + 1] = clamp(data[i + 1] * c + intercept + b);
    data[i + 2] = clamp(data[i + 2] * c + intercept + b);
  }
  ctx.putImageData(imageData, 0, 0);
  return out;
}

/** Simple 3x3 unsharp-mask style sharpening kernel to make handwriting/text edges crisper. */
export function sharpen(canvas, strength = 0.5) {
  const w = canvas.width,
    h = canvas.height;
  const ctx = canvas.getContext('2d');
  const src = ctx.getImageData(0, 0, w, h);

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const outCtx = out.getContext('2d');
  const dst = outCtx.createImageData(w, h);

  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        dst.data[idx] = src.data[idx];
        dst.data[idx + 1] = src.data[idx + 1];
        dst.data[idx + 2] = src.data[idx + 2];
        dst.data[idx + 3] = src.data[idx + 3];
        continue;
      }
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let k = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const nIdx = ((y + ky) * w + (x + kx)) * 4 + c;
            sum += src.data[nIdx] * kernel[k++];
          }
        }
        const original = src.data[idx + c];
        dst.data[idx + c] = clamp(original + (sum - original) * strength);
      }
      dst.data[idx + 3] = src.data[idx + 3];
    }
  }

  outCtx.putImageData(dst, 0, 0);
  return out;
}

/** Light noise reduction via a small median-ish box blur — smooths sensor grain without destroying text edges. */
export function reduceNoise(canvas, radius = 1) {
  const out = cloneCanvas(canvas);
  const ctx = out.getContext('2d');
  // A gentle blur is a reasonable, cheap approximation of denoising for
  // photographed paper; heavier denoising would blur handwriting.
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';
  return out;
}

/**
 * Crops away a thin black border strip (common artifact from phone-camera
 * document scanning apps / poor crops) by scanning inward from each edge
 * until brightness rises above a "not black" threshold.
 */
export function removeBlackBorders(canvas, threshold = 25, maxBorderRatio = 0.08) {
  const w = canvas.width,
    h = canvas.height;
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, w, h).data;

  const luminanceAt = (x, y) => {
    const idx = (y * w + x) * 4;
    return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  };

  const maxBorder = Math.floor(Math.min(w, h) * maxBorderRatio);

  let top = 0;
  while (top < maxBorder && rowIsDark(luminanceAt, w, top, threshold)) top++;
  let bottom = h - 1;
  while (bottom > h - 1 - maxBorder && rowIsDark(luminanceAt, w, bottom, threshold)) bottom--;
  let left = 0;
  while (left < maxBorder && colIsDark(luminanceAt, h, left, threshold)) left++;
  let right = w - 1;
  while (right > w - 1 - maxBorder && colIsDark(luminanceAt, h, right, threshold)) right--;

  const cropW = Math.max(1, right - left + 1);
  const cropH = Math.max(1, bottom - top + 1);

  const out = document.createElement('canvas');
  out.width = cropW;
  out.height = cropH;
  out.getContext('2d').drawImage(canvas, left, top, cropW, cropH, 0, 0, cropW, cropH);
  return out;
}

function rowIsDark(luminanceAt, w, y, threshold) {
  let dark = 0;
  const sample = 20;
  for (let i = 0; i < sample; i++) {
    const x = Math.floor((i / sample) * (w - 1));
    if (luminanceAt(x, y) < threshold) dark++;
  }
  return dark / sample > 0.8;
}

function colIsDark(luminanceAt, h, x, threshold) {
  let dark = 0;
  const sample = 20;
  for (let i = 0; i < sample; i++) {
    const y = Math.floor((i / sample) * (h - 1));
    if (luminanceAt(x, y) < threshold) dark++;
  }
  return dark / sample > 0.8;
}

function clamp(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * Runs the standard enhancement pipeline in a sensible order.
 * Individual steps can be toggled off via options for future flexibility.
 */
export function enhanceDocumentImage(canvas, options = {}) {
  const {
    shadows = true,
    brightnessContrast = true,
    sharpenText = true,
    noiseReduction = true,
    blackBorders = true,
  } = options;

  let working = canvas;
  if (blackBorders) working = removeBlackBorders(working);
  if (shadows) working = removeShadows(working);
  if (noiseReduction) working = reduceNoise(working, 1);
  if (brightnessContrast) working = adjustBrightnessContrast(working, 12, 18);
  if (sharpenText) working = sharpen(working, 0.5);

  return working;
}


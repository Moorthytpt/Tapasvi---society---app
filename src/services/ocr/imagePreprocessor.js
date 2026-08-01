// src/services/ocr/imagePreprocessor.js
//
// Reusable, engine-agnostic image preprocessing functions. These are real,
// working implementations (not mocks) — pure canvas operations with no
// dependency on any specific OCR engine, so both tesseractOcr.js and
// paddleOcr.js (or any future engine) can use them identically.

/**
 * Loads a File/Blob into an HTMLCanvasElement.
 * @param {File|Blob} file
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function toCanvas(file) {
  const bitmap = await createImageBitmap(file).catch(async () => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    return img;
  });
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width || bitmap.naturalWidth;
  canvas.height = bitmap.height || bitmap.naturalHeight;
  canvas.getContext("2d").drawImage(bitmap, 0, 0);
  return canvas;
}

/**
 * Downscales a canvas so its longest side is at most maxDim. No-op if the
 * image is already smaller. Keeps OCR fast and avoids some OCR engines'
 * failures on very large source photos.
 * @param {HTMLCanvasElement} canvas
 * @param {number} maxDim
 * @returns {HTMLCanvasElement}
 */
export function resizeImage(canvas, maxDim = 1800) {
  const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height));
  if (scale === 1) return canvas;
  const out = document.createElement("canvas");
  out.width = Math.round(canvas.width * scale);
  out.height = Math.round(canvas.height * scale);
  out.getContext("2d").drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

/**
 * Converts a canvas to grayscale in place (returns a new canvas).
 * @param {HTMLCanvasElement} canvas
 * @returns {HTMLCanvasElement}
 */
export function toGrayscale(canvas) {
  const out = document.createElement("canvas");
  out.width = canvas.width; out.height = canvas.height;
  const ctx = out.getContext("2d");
  ctx.drawImage(canvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, out.width, out.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = lum;
  }
  ctx.putImageData(imgData, 0, 0);
  return out;
}

/**
 * Increases contrast (and optionally brightness) — genuinely helps OCR on
 * dim/uneven field photos.
 * @param {HTMLCanvasElement} canvas
 * @param {number} contrast e.g. 1.15 = +15%
 * @param {number} brightness e.g. 10 = +10 levels
 * @returns {HTMLCanvasElement}
 */
export function increaseContrast(canvas, contrast = 1.15, brightness = 10) {
  const out = document.createElement("canvas");
  out.width = canvas.width; out.height = canvas.height;
  const ctx = out.getContext("2d");
  ctx.drawImage(canvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, out.width, out.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp((d[i] - 128) * contrast + 128 + brightness);
    d[i + 1] = clamp((d[i + 1] - 128) * contrast + 128 + brightness);
    d[i + 2] = clamp((d[i + 2] - 128) * contrast + 128 + brightness);
  }
  ctx.putImageData(imgData, 0, 0);
  return out;
}

/**
 * Simple 3x3 unsharp-mask style sharpen. Cheap, helps thin handwriting
 * strokes stand out a little more before OCR.
 * @param {HTMLCanvasElement} canvas
 * @returns {HTMLCanvasElement}
 */
export function sharpen(canvas) {
  const { width, height } = canvas;
  const ctx = canvas.getContext("2d");
  const src = ctx.getImageData(0, 0, width, height);
  const out = ctx.createImageData(width, height);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0, k = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += src.data[idx] * kernel[k++];
          }
        }
        out.data[(y * width + x) * 4 + c] = clamp(sum);
      }
      out.data[(y * width + x) * 4 + 3] = 255;
    }
  }
  const result = document.createElement("canvas");
  result.width = width; result.height = height;
  result.getContext("2d").putImageData(out, 0, 0);
  return result;
}

/**
 * Light noise reduction via a 3x3 box blur. Trades a small amount of
 * sharpness for fewer stray "specks" that can confuse OCR on grainy phone
 * photos. Use sparingly — call before sharpen(), not after.
 * @param {HTMLCanvasElement} canvas
 * @returns {HTMLCanvasElement}
 */
export function reduceNoise(canvas) {
  const { width, height } = canvas;
  const ctx = canvas.getContext("2d");
  const src = ctx.getImageData(0, 0, width, height);
  const out = ctx.createImageData(width, height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            sum += src.data[((y + ky) * width + (x + kx)) * 4 + c];
          }
        }
        out.data[(y * width + x) * 4 + c] = sum / 9;
      }
      out.data[(y * width + x) * 4 + 3] = 255;
    }
  }
  const result = document.createElement("canvas");
  result.width = width; result.height = height;
  result.getContext("2d").putImageData(out, 0, 0);
  return result;
}

/**
 * PLACEHOLDER — full rotation/deskew correction (detecting the page's true
 * angle and rotating to compensate) needs real line/edge detection. Returns
 * the canvas unchanged for now. See TableDetector's estimateSkewAngle() in
 * the existing layout-aware OCR pipeline for a working reference approach
 * (angle search maximizing a row ink-projection profile) to port in here
 * during the next integration phase.
 * @param {HTMLCanvasElement} canvas
 * @returns {HTMLCanvasElement}
 */
export function correctRotation(canvas) {
  // TODO: port a real deskew implementation here.
  return canvas;
}

/**
 * Convenience pipeline: resize -> grayscale -> contrast. Sharpen/noise
 * reduction/rotation are available individually above but are not chained
 * by default (they're more situational and slower on large images).
 * @param {File|Blob} file
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function preprocessImage(file) {
  let canvas = await toCanvas(file);
  canvas = resizeImage(canvas);
  canvas = increaseContrast(canvas);
  return canvas;
}

function clamp(v) {
  return Math.max(0, Math.min(255, v));
}


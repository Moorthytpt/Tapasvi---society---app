// src/services/ocr/imagePreprocessor.js
//
// Reusable, engine-agnostic image preprocessing + layout-geometry functions.
// Phase 2 update: enhanceImageForOcr(), the TableDetector (detectTableGrid),
// CellCropper (cropCell), and the RegisterTemplateManager helpers
// (buildTemplateFromGrid / applyTemplateToImage) were migrated here verbatim
// from App.jsx's SmartBeneficiaryImportModule OCR pipeline — same logic,
// same behavior, just relocated. Nothing below was rewritten or simplified.

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
 * image is already smaller.
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
 * Converts a canvas to grayscale (returns a new canvas).
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
 * Increases contrast (and optionally brightness).
 * @param {HTMLCanvasElement} canvas
 * @param {number} contrast
 * @param {number} brightness
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
 * Simple 3x3 unsharp-mask style sharpen.
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
 * Light noise reduction via a 3x3 box blur.
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
 * PLACEHOLDER — full rotation/deskew correction still needs real
 * line/edge detection beyond what estimateSkewAngle() below does for the
 * table pipeline specifically. Returns the canvas unchanged.
 * @param {HTMLCanvasElement} canvas
 * @returns {HTMLCanvasElement}
 */
export function correctRotation(canvas) {
  // TODO: port a general-purpose deskew implementation here.
  return canvas;
}

/**
 * MIGRATED VERBATIM from App.jsx (was: enhanceImageForOcr). Draws the
 * uploaded photo onto a canvas — downscaled if larger than maxDim — with a
 * mild brightness/contrast lift. This is the real preprocessing step the
 * working OCR pipeline uses before every recognize() call; it fixes
 * Tesseract.js's "File could not be read! Code=0" failure on large phone
 * photos and speeds up OCR on slow connections.
 * @param {File|Blob} file
 * @param {number} maxDim
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function enhanceImageForOcr(file, maxDim = 1800) {
  const bitmap = await createImageBitmap(file).catch(async () => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    return img;
  });
  const srcW = bitmap.width || bitmap.naturalWidth;
  const srcH = bitmap.height || bitmap.naturalHeight;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(srcW * scale);
  canvas.height = Math.round(srcH * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  const contrast = 1.15, brightness = 12;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp((d[i] - 128) * contrast + 128 + brightness);
    d[i + 1] = clamp((d[i + 1] - 128) * contrast + 128 + brightness);
    d[i + 2] = clamp((d[i + 2] - 128) * contrast + 128 + brightness);
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/* ============================================================
   LAYOUT GEOMETRY — migrated verbatim from App.jsx.
   TableDetector (detectTableGrid), CellCropper (cropCell), and the
   RegisterTemplateManager (buildTemplateFromGrid/applyTemplateToImage)
   all live here since they're pure image-geometry operations with no
   OCR-engine dependency — any engine's batch worker can consume their
   output the same way.
   ============================================================ */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} threshold
 * @returns {{ bin: Uint8Array, width: number, height: number }}
 */
export function binarizeCanvas(canvas, threshold = 150) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const bin = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    bin[p] = lum < threshold ? 1 : 0;
  }
  return { bin, width, height };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} deg
 * @returns {HTMLCanvasElement}
 */
export function rotateCanvas(canvas, deg) {
  const rad = (deg * Math.PI) / 180;
  const w = canvas.width, h = canvas.height;
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  const ctx = out.getContext("2d");
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rad);
  ctx.drawImage(canvas, -w / 2, -h / 2);
  return out;
}

/**
 * @param {Float64Array|number[]} arr
 * @param {number} minCount
 * @param {number} minGap
 * @returns {number[]}
 */
export function findPeaks(arr, minCount, minGap) {
  const peaks = [];
  for (let i = 1; i < arr.length - 1; i++) {
    if (arr[i] >= minCount && arr[i] >= arr[i - 1] && arr[i] >= arr[i + 1]) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minGap) peaks.push(i);
      else if (arr[i] > arr[peaks[peaks.length - 1]]) peaks[peaks.length - 1] = i;
    }
  }
  return peaks;
}

/**
 * Coarse deskew: the angle whose horizontal ink-projection profile has the
 * highest variance wins.
 * @param {HTMLCanvasElement} canvas
 * @returns {number}
 */
export function estimateSkewAngle(canvas) {
  let bestAngle = 0, bestScore = -Infinity;
  for (let deg = -6; deg <= 6; deg += 1.5) {
    const rotated = deg === 0 ? canvas : rotateCanvas(canvas, deg);
    const { bin, width, height } = binarizeCanvas(rotated);
    const rowSums = new Float64Array(height);
    for (let y = 0; y < height; y++) { let s = 0; for (let x = 0; x < width; x++) s += bin[y * width + x]; rowSums[y] = s; }
    const mean = rowSums.reduce((a, b) => a + b, 0) / height;
    const variance = rowSums.reduce((a, b) => a + (b - mean) ** 2, 0) / height;
    if (variance > bestScore) { bestScore = variance; bestAngle = deg; }
  }
  return bestAngle;
}

/**
 * TableDetector — deskews, then finds ruled horizontal/vertical line
 * positions via ink-density projection profiles. Returns null if the page
 * doesn't look like a ruled table.
 * @param {HTMLCanvasElement} canvas
 * @returns {{ canvas: HTMLCanvasElement, rows: number[], cols: number[], angle: number } | null}
 */
export function detectTableGrid(canvas) {
  const angle = estimateSkewAngle(canvas);
  const working = Math.abs(angle) > 0.4 ? rotateCanvas(canvas, angle) : canvas;
  const { bin, width, height } = binarizeCanvas(working);

  const rowSums = new Float64Array(height);
  for (let y = 0; y < height; y++) { let s = 0; for (let x = 0; x < width; x++) s += bin[y * width + x]; rowSums[y] = s; }
  const colSums = new Float64Array(width);
  for (let x = 0; x < width; x++) { let s = 0; for (let y = 0; y < height; y++) s += bin[y * width + x]; colSums[x] = s; }

  const rowPeaks = findPeaks(rowSums, width * 0.35, Math.max(12, height * 0.02));
  const colPeaks = findPeaks(colSums, height * 0.25, Math.max(12, width * 0.02));
  if (rowPeaks.length < 3 || colPeaks.length < 3) return null;

  const rows = [0, ...rowPeaks, height].filter((v, i, a) => i === 0 || v - a[i - 1] > 8);
  const cols = [0, ...colPeaks, width].filter((v, i, a) => i === 0 || v - a[i - 1] > 8);
  if (rows.length < 3 || cols.length < 3) return null;
  return { canvas: working, rows, cols, angle };
}

/**
 * RegisterTemplateManager — remembers a confidently-detected page's column
 * layout as fractions of page width, resolution-independent.
 * @param {{ canvas: HTMLCanvasElement, cols: number[] }} grid
 * @param {Array} headerMap
 * @returns {{ colFractions: number[], headerMap: Array }}
 */
export function buildTemplateFromGrid(grid, headerMap) {
  const w = grid.canvas.width;
  return {
    colFractions: grid.cols.map(x => x / w),
    headerMap,
  };
}

/**
 * Snaps each template column fraction to the nearest real ink line found
 * near that expected position on this image.
 * @param {HTMLCanvasElement} canvas
 * @param {{ colFractions: number[] }} template
 * @returns {{ canvas: HTMLCanvasElement, rows: number[], cols: number[] } | null}
 */
export function applyTemplateToImage(canvas, template) {
  const { bin, width, height } = binarizeCanvas(canvas);
  const colSums = new Float64Array(width);
  for (let x = 0; x < width; x++) { let s = 0; for (let y = 0; y < height; y++) s += bin[y * width + x]; colSums[x] = s; }

  const searchWindow = Math.max(6, Math.round(width * 0.02));
  const cols = template.colFractions.map(f => {
    const expected = Math.round(f * width);
    let best = expected, bestScore = -1;
    for (let x = Math.max(0, expected - searchWindow); x <= Math.min(width - 1, expected + searchWindow); x++) {
      if (colSums[x] > bestScore) { bestScore = colSums[x]; best = x; }
    }
    return best;
  });

  const rowSums = new Float64Array(height);
  for (let y = 0; y < height; y++) { let s = 0; for (let x = 0; x < width; x++) s += bin[y * width + x]; rowSums[y] = s; }
  const rowPeaks = findPeaks(rowSums, width * 0.3, Math.max(10, height * 0.015));
  const rows = [0, ...rowPeaks, height].filter((v, i, a) => i === 0 || v - a[i - 1] > 8);
  if (rows.length < 3) return null;

  return { canvas, rows, cols };
}

/**
 * CellCropper.
 * @param {HTMLCanvasElement} canvas
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 * @param {number} pad
 * @returns {HTMLCanvasElement}
 */
export function cropCell(canvas, x0, y0, x1, y1, pad = 4) {
  const w = Math.max(1, x1 - x0 - pad * 2);
  const h = Math.max(1, y1 - y0 - pad * 2);
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  out.getContext("2d").drawImage(canvas, x0 + pad, y0 + pad, w, h, 0, 0, w, h);
  return out;
}

/**
 * PHASE 3A — ROW DETECTION ONLY. No OCR, no field extraction, no mapping.
 * Reuses the existing TableDetector (detectTableGrid) to find the table
 * and its row boundaries, then crops each data row (skipping the header
 * band) into its own full-width image. That's the entire job — this
 * function never calls any OCR engine.
 * @param {HTMLCanvasElement} canvas - an already-enhanced page image
 * @returns {{ rowImages: HTMLCanvasElement[], count: number } | null}
 *   null if no table/rows could be confidently detected on this page.
 */
export function cropTableRows(canvas) {
  const grid = detectTableGrid(canvas);
  if (!grid || grid.rows.length < 3) return null; // need at least a header band + 1 data row

  const rowImages = [];
  // grid.rows[0]..grid.rows[1] is the header band — skipped, rows[1] onward are data rows.
  for (let r = 1; r < grid.rows.length - 1; r++) {
    const y0 = grid.rows[r], y1 = grid.rows[r + 1];
    if (y1 - y0 < 8) continue; // skip degenerate/near-zero-height bands
    rowImages.push(cropCell(grid.canvas, 0, y0, grid.canvas.width, y1, 2));
  }
  return { rowImages, count: rowImages.length };
}

/**
 * Convenience pipeline: resize -> contrast (kept from Phase 1 for callers
 * that just want a generic preprocess without the OCR-specific tuning of
 * enhanceImageForOcr above).
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

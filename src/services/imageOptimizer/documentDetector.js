/**
 * documentDetector.js
 * -----------------------------------------------------------------------
 * Estimates the document's four corners in a photographed image and
 * provides auto-crop / auto-rotate / perspective-correction utilities.
 *
 * HONEST SCOPE NOTE: this is a lightweight, dependency-free heuristic
 * (edge-contrast scanning), not a full computer-vision contour pipeline
 * like OpenCV. It works well for the common case — a reasonably plain
 * background behind a paper register/form — and degrades gracefully
 * (falls back to using the full frame) when it can't find a confident
 * boundary, rather than producing a bad crop.
 * -----------------------------------------------------------------------
 */

function getGray(canvas) {
  const w = canvas.width,
    h = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const data = ctx.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return { gray, w, h };
}

/**
 * Estimates document corners by scanning inward from each edge of the
 * frame along many parallel lines, looking for the first strong
 * brightness transition (background -> page). Falls back to the full
 * frame bounds if no confident edge is found.
 *
 * Returns { topLeft, topRight, bottomLeft, bottomRight }, each {x, y}
 * in source-canvas pixel coordinates.
 */
export function detectDocumentCorners(canvas) {
  const { gray, w, h } = getGray(canvas);
  const lines = 24;
  const edgeThreshold = 18;

  const scanFromTop = [];
  const scanFromBottom = [];
  const scanFromLeft = [];
  const scanFromRight = [];

  for (let i = 0; i < lines; i++) {
    const x = Math.floor(((i + 0.5) / lines) * w);
    scanFromTop.push(findEdge(gray, w, h, x, 0, 0, 1, edgeThreshold)); // {x,y}
    scanFromBottom.push(findEdge(gray, w, h, x, h - 1, 0, -1, edgeThreshold));
  }
  for (let i = 0; i < lines; i++) {
    const y = Math.floor(((i + 0.5) / lines) * h);
    scanFromLeft.push(findEdge(gray, w, h, 0, y, 1, 0, edgeThreshold));
    scanFromRight.push(findEdge(gray, w, h, w - 1, y, -1, 0, edgeThreshold));
  }

  const topBound = medianOf(scanFromTop.map((p) => p?.y).filter(isNum), 0, Math.floor(h * 0.2));
  const bottomBound = medianOf(
    scanFromBottom.map((p) => p?.y).filter(isNum),
    h - 1,
    Math.floor(h * 0.2)
  );
  const leftBound = medianOf(scanFromLeft.map((p) => p?.x).filter(isNum), 0, Math.floor(w * 0.2));
  const rightBound = medianOf(
    scanFromRight.map((p) => p?.x).filter(isNum),
    w - 1,
    Math.floor(w * 0.2)
  );

  // Sanity check: require a plausible document region (not the whole
  // frame collapsed to nothing). Fall back to full frame otherwise.
  const validRegion =
    rightBound - leftBound > w * 0.3 && bottomBound - topBound > h * 0.3;

  if (!validRegion) {
    return {
      topLeft: { x: 0, y: 0 },
      topRight: { x: w - 1, y: 0 },
      bottomLeft: { x: 0, y: h - 1 },
      bottomRight: { x: w - 1, y: h - 1 },
      confident: false,
    };
  }

  return {
    topLeft: { x: leftBound, y: topBound },
    topRight: { x: rightBound, y: topBound },
    bottomLeft: { x: leftBound, y: bottomBound },
    bottomRight: { x: rightBound, y: bottomBound },
    confident: true,
  };
}

function isNum(v) {
  return typeof v === 'number' && !Number.isNaN(v);
}

function medianOf(values, fallback, maxDeviationFromFallback) {
  if (values.length < 4) return fallback;
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (Math.abs(median - fallback) > maxDeviationFromFallback * 3) return fallback;
  return median;
}

/** Walks from (x0,y0) in direction (dx,dy) until a brightness jump exceeds threshold, or hits the frame edge. */
function findEdge(gray, w, h, x0, y0, dx, dy, threshold) {
  const maxSteps = dx !== 0 ? w : h;
  const windowSize = 6;
  let x = x0,
    y = y0;
  let prevAvg = null;

  for (let step = 0; step < maxSteps - windowSize; step += windowSize) {
    let sum = 0;
    for (let k = 0; k < windowSize; k++) {
      const sx = Math.min(w - 1, Math.max(0, x + dx * k));
      const sy = Math.min(h - 1, Math.max(0, y + dy * k));
      sum += gray[sy * w + sx];
    }
    const avg = sum / windowSize;
    if (prevAvg !== null && Math.abs(avg - prevAvg) > threshold) {
      return { x, y };
    }
    prevAvg = avg;
    x += dx * windowSize;
    y += dy * windowSize;
  }
  return null;
}

/** Simple axis-aligned crop to the detected corner bounding box. Use when the page is already roughly square-on. */
export function autoCrop(canvas, corners) {
  const x = Math.min(corners.topLeft.x, corners.bottomLeft.x);
  const y = Math.min(corners.topLeft.y, corners.topRight.y);
  const right = Math.max(corners.topRight.x, corners.bottomRight.x);
  const bottom = Math.max(corners.bottomLeft.y, corners.bottomRight.y);
  const cropW = Math.max(1, right - x);
  const cropH = Math.max(1, bottom - y);

  const out = document.createElement('canvas');
  out.width = cropW;
  out.height = cropH;
  out.getContext('2d').drawImage(canvas, x, y, cropW, cropH, 0, 0, cropW, cropH);
  return out;
}

/** Rotates the canvas by a given angle (degrees) around its center, expanding the canvas so nothing is clipped. */
export function autoRotate(canvas, angleDeg) {
  if (!angleDeg) return canvas;
  const rad = (angleDeg * Math.PI) / 180;
  const w = canvas.width,
    h = canvas.height;
  const newW = Math.ceil(Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad)));
  const newH = Math.ceil(Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad)));

  const out = document.createElement('canvas');
  out.width = newW;
  out.height = newH;
  const ctx = out.getContext('2d');
  ctx.translate(newW / 2, newH / 2);
  ctx.rotate(rad);
  ctx.drawImage(canvas, -w / 2, -h / 2);
  return out;
}

// ---------------------------------------------------------------------
// Perspective correction (4-point homography warp)
// ---------------------------------------------------------------------

/** Solves the 3x3 homography mapping src quad -> dst quad using Gaussian elimination on the 8x8 linear system. */
function computeHomography(src, dst) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const { x: sx, y: sy } = src[i];
    const { x: dx, y: dy } = dst[i];
    A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
    b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
    b.push(dy);
  }
  const h = solveLinearSystem(A, b);
  if (!h) return null;
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function solveLinearSystem(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row;
    }
    if (Math.abs(M[pivot][col]) < 1e-10) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col] / M[col][col];
      for (let k = col; k <= n; k++) M[row][k] -= factor * M[col][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/**
 * Warps the quadrilateral defined by `corners` in the source canvas into
 * a straightened rectangular output of (outW x outH).
 * Falls back to a plain crop if the homography can't be solved.
 */
export function correctPerspective(canvas, corners, outW, outH) {
  const src = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  const dst = [
    { x: 0, y: 0 },
    { x: outW, y: 0 },
    { x: outW, y: outH },
    { x: 0, y: outH },
  ];

  // Homography mapping OUTPUT -> SOURCE (so we can inverse-sample per output pixel).
  const H = computeHomography(dst, src);
  if (!H) return autoCrop(canvas, corners);

  const srcCtx = canvas.getContext('2d', { willReadFrequently: true });
  const srcData = srcCtx.getImageData(0, 0, canvas.width, canvas.height);

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const outCtx = out.getContext('2d');
  const outData = outCtx.createImageData(outW, outH);

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const w = H[6] * x + H[7] * y + 1;
      const sx = (H[0] * x + H[1] * y + H[2]) / w;
      const sy = (H[3] * x + H[4] * y + H[5]) / w;

      const outIdx = (y * outW + x) * 4;
      if (sx >= 0 && sx < canvas.width - 1 && sy >= 0 && sy < canvas.height - 1) {
        bilinearSampleInto(srcData, canvas.width, canvas.height, sx, sy, outData.data, outIdx);
        outData.data[outIdx + 3] = 255;
      } else {
        outData.data[outIdx] = 255;
        outData.data[outIdx + 1] = 255;
        outData.data[outIdx + 2] = 255;
        outData.data[outIdx + 3] = 255;
      }
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return out;
}

/**
 * Samples imageData at (x,y) with bilinear interpolation and writes the
 * RGB result directly into dst at dstIdx — no temporary arrays, so this
 * stays fast even at several million pixels (a full-resolution phone
 * photo). The previous version allocated 4 new arrays per pixel via
 * .slice(), which was fast enough to test but froze real phone photos
 * for a very long time — that was the "stuck on Optimizing..." bug.
 */
function bilinearSampleInto(imageData, w, h, x, y, dst, dstIdx) {
  const data = imageData.data;
  const x0 = x | 0;
  const y0 = y | 0;
  const x1 = x0 + 1 < w ? x0 + 1 : x0;
  const y1 = y0 + 1 < h ? y0 + 1 : y0;
  const fx = x - x0;
  const fy = y - y0;

  const i00 = (y0 * w + x0) * 4;
  const i10 = (y0 * w + x1) * 4;
  const i01 = (y1 * w + x0) * 4;
  const i11 = (y1 * w + x1) * 4;

  const w00 = (1 - fx) * (1 - fy);
  const w10 = fx * (1 - fy);
  const w01 = (1 - fx) * fy;
  const w11 = fx * fy;

  dst[dstIdx] = data[i00] * w00 + data[i10] * w10 + data[i01] * w01 + data[i11] * w11;
  dst[dstIdx + 1] = data[i00 + 1] * w00 + data[i10 + 1] * w10 + data[i01 + 1] * w01 + data[i11 + 1] * w11;
  dst[dstIdx + 2] = data[i00 + 2] * w00 + data[i10 + 2] * w10 + data[i01 + 2] * w01 + data[i11 + 2] * w11;
}

/**
 * Full detect + straighten pipeline: finds corners, then either does a
 * perspective warp (if the quad looks skewed) or a simple crop (if it's
 * already roughly axis-aligned), returning a new canvas.
 */
export function autoDetectAndStraighten(canvas) {
  const corners = detectDocumentCorners(canvas);
  if (!corners.confident) {
    return { canvas, corners, method: 'none' };
  }

  let outW = Math.round(corners.topRight.x - corners.topLeft.x);
  let outH = Math.round(corners.bottomLeft.y - corners.topLeft.y);

  // Cap the long edge so the pixel-by-pixel warp below never has to
  // process an unbounded number of pixels, no matter how high-res the
  // source photo is (modern phone cameras easily exceed 4000px).
  const MAX_DIM = 1400;
  const longEdge = Math.max(outW, outH);
  if (longEdge > MAX_DIM) {
    const scale = MAX_DIM / longEdge;
    outW = Math.max(1, Math.round(outW * scale));
    outH = Math.max(1, Math.round(outH * scale));
  }

  const straightened = correctPerspective(canvas, corners, outW, outH);
  return { canvas: straightened, corners, method: 'perspective' };
}

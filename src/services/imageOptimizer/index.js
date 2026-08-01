/**
 * src/services/imageOptimizer/index.js
 * -----------------------------------------------------------------------
 * Public entry point for the Smart Image Optimizer.
 * Only this file (and the pieces it exports) should be imported by UI
 * components — keeps the internal pixel-processing functions swappable
 * later (e.g. replacing documentDetector's heuristic scan with an
 * OpenCV.js-backed version) without touching component code.
 * -----------------------------------------------------------------------
 */

import {
  detectDocumentCorners,
  autoCrop,
  autoRotate,
  correctPerspective,
  autoDetectAndStraighten,
} from './documentDetector';

import { enhanceDocumentImage, removeShadows, adjustBrightnessContrast, sharpen, reduceNoise, removeBlackBorders } from './imageEnhancer';

import { analyzeImageQuality } from './qualityChecker';

/**
 * Reads the EXIF "Orientation" tag (1-8) directly from JPEG bytes.
 * Phone cameras often store photos in sensor orientation and rely on
 * this tag to say "display rotated N degrees" — <canvas> ignores that
 * tag when drawing, which is why photos can come out sideways even
 * when the phone was held correctly. Returns 1 (normal) if no tag is
 * found or the file isn't a JPEG with EXIF data.
 */
function readExifOrientation(file) {
  return new Promise((resolve) => {
    let settled = false;
    const safeResolve = (v) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    // Absolute safety net: never let orientation detection block the
    // pipeline for more than a second, no matter what goes wrong.
    setTimeout(() => safeResolve(1), 1000);

    const reader = new FileReader();
    reader.onload = (e) => {
      const view = new DataView(e.target.result);
      if (view.getUint16(0, false) !== 0xffd8) return resolve(1); // not a JPEG
      const length = view.byteLength;
      let offset = 2;
      let iterations = 0;
      while (offset < length - 1) {
        // Fail-safe: this loop should always terminate quickly (JPEG
        // headers have only a handful of segments), but if the byte
        // layout is ever unexpected, bail out instead of risking an
        // infinite loop that would freeze the whole page.
        iterations += 1;
        if (iterations > 500) return resolve(1);

        const marker = view.getUint16(offset, false);
        offset += 2;
        if (marker === 0xffe1) {
          // APP1 (EXIF) segment
          if (view.getUint32(offset + 2, false) !== 0x45786966) return resolve(1); // "Exif"
          const little = view.getUint16(offset + 8, false) === 0x4949;
          const tiffOffset = offset + 6;
          const firstIfdOffset = view.getUint32(tiffOffset + 4, little);
          const dirStart = tiffOffset + firstIfdOffset;
          if (dirStart < 0 || dirStart + 2 > length) return resolve(1);
          const entries = view.getUint16(dirStart, little);
          for (let i = 0; i < entries && dirStart + 2 + i * 12 + 10 <= length; i++) {
            const entryOffset = dirStart + 2 + i * 12;
            if (view.getUint16(entryOffset, little) === 0x0112) {
              return resolve(view.getUint16(entryOffset + 8, little));
            }
          }
          return resolve(1);
        } else if ((marker & 0xff00) !== 0xff00) {
          break;
        } else {
          const segmentLength = view.getUint16(offset, false);
          // A zero (or too-small) length would leave offset unchanged
          // forever — treat that as "can't parse this" and stop.
          if (segmentLength < 2) return resolve(1);
          offset += segmentLength;
        }
      }
      resolve(1);
    };
    reader.onerror = () => resolve(1);
    // Only need the first ~128KB — EXIF header is always near the start.
    reader.readAsArrayBuffer(file.slice(0, 131072));
  });
}

/** Loads a File/Blob into a canvas at its natural resolution, corrected for EXIF orientation so the image is always upright. */
export function fileToCanvas(file) {
  return new Promise((resolve, reject) => {
    readExifOrientation(file).then((orientation) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const w = img.naturalWidth;
        const h = img.naturalHeight;

        // Orientations 5-8 involve a 90/270 degree rotation, so width/height swap.
        if (orientation >= 5 && orientation <= 8) {
          canvas.width = h;
          canvas.height = w;
        } else {
          canvas.width = w;
          canvas.height = h;
        }

        switch (orientation) {
          case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;
          case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
          case 4: ctx.transform(1, 0, 0, -1, 0, h); break;
          case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
          case 6: ctx.transform(0, 1, -1, 0, h, 0); break;
          case 7: ctx.transform(0, -1, -1, 0, h, w); break;
          case 8: ctx.transform(0, -1, 1, 0, 0, w); break;
          default: break; // orientation 1 (or unknown) needs no transform
        }

        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(img.src);
        resolve(canvas);
      };
      img.onerror = (e) => reject(e);
      img.src = URL.createObjectURL(file);
    });
  });
}

export function canvasToDataUrl(canvas, quality = 0.9) {
  return canvas.toDataURL('image/jpeg', quality);
}

export function canvasToBlob(canvas, quality = 0.9) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/** Returns a canvas scaled down so its longer edge is at most maxDim (returns the same canvas untouched if already smaller). */
function capWorkingSize(canvas, maxDim = 1800) {
  const longEdge = Math.max(canvas.width, canvas.height);
  if (longEdge <= maxDim) return canvas;
  const scale = maxDim / longEdge;
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(canvas.width * scale));
  out.height = Math.max(1, Math.round(canvas.height * scale));
  out.getContext('2d').drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

/**
 * Full pipeline for one captured/uploaded image:
 * detect document -> straighten -> enhance -> quality-check.
 * Returns { originalCanvas, optimizedCanvas, quality, method }
 */
export async function processDocumentImage(file) {
  const originalCanvas = await fileToCanvas(file);

  // Phone cameras commonly produce 3000-4000px+ photos. Every step below
  // (corner scan, perspective warp, enhancement filters) is a per-pixel
  // loop, so working at full resolution made the whole pipeline take a
  // very long time on-device — this is what "stuck on Optimizing..."
  // actually was. 1800px is plenty for both on-screen preview and for a
  // future AI model to read handwriting from.
  const working = capWorkingSize(originalCanvas, 1800);

  const { canvas: straightened, method } = autoDetectAndStraighten(working);
  const enhanced = enhanceDocumentImage(straightened);
  const quality = analyzeImageQuality(enhanced);

  return {
    originalCanvas,
    optimizedCanvas: enhanced,
    method, // 'perspective' | 'none'
    quality,
  };
}

export {
  detectDocumentCorners,
  autoCrop,
  autoRotate,
  correctPerspective,
  autoDetectAndStraighten,
  enhanceDocumentImage,
  removeShadows,
  adjustBrightnessContrast,
  sharpen,
  reduceNoise,
  removeBlackBorders,
  analyzeImageQuality,
};

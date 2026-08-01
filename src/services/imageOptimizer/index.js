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

/** Loads a File/Blob into a canvas at its natural resolution. */
export function fileToCanvas(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);
      resolve(canvas);
    };
    img.onerror = (e) => reject(e);
    img.src = URL.createObjectURL(file);
  });
}

export function canvasToDataUrl(canvas, quality = 0.9) {
  return canvas.toDataURL('image/jpeg', quality);
}

export function canvasToBlob(canvas, quality = 0.9) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Full pipeline for one captured/uploaded image:
 * detect document -> straighten -> enhance -> quality-check.
 * Returns { originalCanvas, optimizedCanvas, quality, method }
 */
export async function processDocumentImage(file) {
  const originalCanvas = await fileToCanvas(file);

  const { canvas: straightened, method } = autoDetectAndStraighten(originalCanvas);
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


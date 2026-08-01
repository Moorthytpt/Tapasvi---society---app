/**
 * qualityChecker.js
 * -----------------------------------------------------------------------
 * Pure image-quality analysis. No UI, no side effects.
 * Given a canvas (already loaded with an image), returns numeric scores
 * for blur, lighting, rotation/skew, and document visibility, plus a
 * combined star rating and a human-readable verdict.
 *
 * All functions operate on a 2D canvas context so they can be reused by
 * both the live camera preview and gallery-uploaded images.
 * -----------------------------------------------------------------------
 */

/** Downscale a canvas for faster analysis (quality checks don't need full res). */
function getSampledImageData(canvas, maxDim = 600) {
  const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height));
  const w = Math.max(1, Math.round(canvas.width * scale));
  const h = Math.max(1, Math.round(canvas.height * scale));

  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = w;
  sampleCanvas.height = h;
  const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

function toGrayscale(imageData) {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // luminance-weighted grayscale
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return { gray, width, height };
}

/**
 * Blur detection via Laplacian variance.
 * Sharp images have high-variance edges; blurry images have low variance.
 * Returns a 0-100 score (higher = sharper).
 */
function computeBlurScore(gray, width, height) {
  const laplacian = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const value =
        4 * gray[idx] -
        gray[idx - 1] -
        gray[idx + 1] -
        gray[idx - width] -
        gray[idx + width];
      laplacian.push(value);
    }
  }
  if (laplacian.length === 0) return 0;

  const mean = laplacian.reduce((a, b) => a + b, 0) / laplacian.length;
  const variance =
    laplacian.reduce((a, b) => a + (b - mean) * (b - mean), 0) / laplacian.length;

  // Empirically, variance > ~400 is sharp, < ~50 is very blurry.
  // Map to a 0-100 score with a soft ceiling.
  const score = Math.min(100, (variance / 400) * 100);
  return Math.round(score);
}

/**
 * Lighting quality: checks average brightness and how much of the
 * histogram is clipped into pure black / pure white (over/under exposed).
 * Returns a 0-100 score (higher = better lit).
 */
function computeLightingScore(gray) {
  let sum = 0;
  let darkClipped = 0;
  let brightClipped = 0;
  for (let i = 0; i < gray.length; i++) {
    sum += gray[i];
    if (gray[i] < 15) darkClipped++;
    if (gray[i] > 240) brightClipped++;
  }
  const avg = sum / gray.length;
  const clippedRatio = (darkClipped + brightClipped) / gray.length;

  // Ideal average brightness is roughly 110-190 for a paper document.
  const distanceFromIdeal = avg < 110 ? 110 - avg : avg > 190 ? avg - 190 : 0;
  let score = 100 - distanceFromIdeal * 0.8 - clippedRatio * 150;
  score = Math.max(0, Math.min(100, score));
  return Math.round(score);
}

/**
 * Rotation/skew estimate via dominant edge angle.
 * This is a lightweight approximation (not a full Hough transform):
 * it samples strong horizontal-ish edges and estimates their average
 * angle deviation from 0/90 degrees. Good enough to flag "clearly
 * crooked" photos; not a precise skew-angle measurement.
 * Returns { angleDeg, score } where score is 0-100 (higher = straighter).
 */
function computeRotationScore(gray, width, height) {
  const angles = [];
  const step = 4;
  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      const idx = y * width + x;
      const gx = gray[idx + 1] - gray[idx - 1];
      const gy = gray[idx + width] - gray[idx - width];
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      if (magnitude > 40) {
        const angle = (Math.atan2(gy, gx) * 180) / Math.PI;
        // fold into 0-90 range, then distance from nearest axis (0/90)
        let a = Math.abs(angle % 90);
        if (a > 45) a = 90 - a;
        angles.push(a);
      }
    }
  }
  if (angles.length < 20) {
    return { angleDeg: 0, score: 60 }; // not enough edge data, neutral score
  }
  angles.sort((a, b) => a - b);
  const median = angles[Math.floor(angles.length / 2)];
  const score = Math.max(0, 100 - median * 8); // 12.5deg skew -> 0
  return { angleDeg: Math.round(median * 10) / 10, score: Math.round(score) };
}

/**
 * Document visibility: rough estimate of whether a document-like
 * rectangular region fills a reasonable portion of the frame, based on
 * contrast between a central region and the border region.
 * Returns 0-100 (higher = document clearly fills frame).
 */
function computeVisibilityScore(gray, width, height) {
  const centerXStart = Math.floor(width * 0.25);
  const centerXEnd = Math.floor(width * 0.75);
  const centerYStart = Math.floor(height * 0.25);
  const centerYEnd = Math.floor(height * 0.75);

  let centerSum = 0,
    centerCount = 0;
  let borderSum = 0,
    borderCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = gray[y * width + x];
      const inCenter =
        x >= centerXStart && x <= centerXEnd && y >= centerYStart && y <= centerYEnd;
      if (inCenter) {
        centerSum += v;
        centerCount++;
      } else {
        borderSum += v;
        borderCount++;
      }
    }
  }

  const centerAvg = centerCount ? centerSum / centerCount : 0;
  const borderAvg = borderCount ? borderSum / borderCount : 0;
  const contrast = Math.abs(centerAvg - borderAvg);

  // Some contrast between page and surrounding surface is expected.
  const score = Math.max(0, Math.min(100, 40 + contrast * 1.2));
  return Math.round(score);
}

function scoreToStars(score) {
  return Math.max(1, Math.min(5, Math.round(score / 20)));
}

/**
 * Main entry point. Pass a canvas already drawn with the candidate image.
 * Returns a full quality report.
 */
export function analyzeImageQuality(canvas) {
  const imageData = getSampledImageData(canvas);
  const { gray, width, height } = toGrayscale(imageData);

  const blurScore = computeBlurScore(gray, width, height);
  const lightingScore = computeLightingScore(gray);
  const rotation = computeRotationScore(gray, width, height);
  const visibilityScore = computeVisibilityScore(gray, width, height);

  const overallScore = Math.round(
    blurScore * 0.4 + lightingScore * 0.3 + rotation.score * 0.15 + visibilityScore * 0.15
  );
  const stars = scoreToStars(overallScore);

  let verdict = 'good';
  let message = 'Image quality looks good.';

  if (blurScore < 30) {
    verdict = 'blurry';
    message = 'Image too blurry. Please retake.';
  } else if (lightingScore < 30) {
    verdict = 'poor_lighting';
    message = 'Lighting is too dark or too bright. Please retake in better light.';
  } else if (rotation.score < 40) {
    verdict = 'crooked';
    message = 'Photo looks tilted. Try to align the page edges with the frame.';
  } else if (visibilityScore < 30) {
    verdict = 'low_visibility';
    message = 'Document edges are not clear. Move closer or use a plain background.';
  } else if (overallScore < 55) {
    verdict = 'usable';
    message = 'Usable, but retaking may improve accuracy.';
  }

  return {
    blurScore,
    lightingScore,
    rotationAngleDeg: rotation.angleDeg,
    rotationScore: rotation.score,
    visibilityScore,
    overallScore,
    stars,
    verdict, // 'good' | 'usable' | 'blurry' | 'poor_lighting' | 'crooked' | 'low_visibility'
    message,
  };
}


/**
 * src/services/aiPrompt/share.js
 * -----------------------------------------------------------------------
 * Gets an optimized image ready to attach in an external AI app.
 * Tries the Web Share API first (native share sheet on mobile — the
 * user can often pick the AI app directly there, or "Save to Photos").
 * Falls back to triggering a normal browser download when Web Share
 * (or file sharing specifically) isn't supported, so the image still
 * ends up somewhere findable (Downloads / gallery).
 *
 * Read-only user of the Image Optimizer's public output (canvasToBlob
 * from services/imageOptimizer) — does not modify that module.
 * -----------------------------------------------------------------------
 */

import { canvasToBlob } from '../imageOptimizer';

/** Decodes a data: URL into a Blob synchronously (no await) — keeps navigator.share() close to the user's tap, since some browsers only allow it within a very short window after a click. */
function dataUrlToBlobSync(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function imageToFile(item, filename) {
  // Prefer the already-computed dataUrl (synchronous decode) over the
  // async canvas.toBlob path — see note above.
  const blob = item.dataUrl ? dataUrlToBlobSync(item.dataUrl) : await canvasToBlob(item.canvas);
  return new File([blob], filename, { type: 'image/jpeg' });
}

/**
 * @param {{ id: string, canvas?: HTMLCanvasElement, dataUrl?: string }} item
 * @returns {Promise<{ method: 'share'|'download'|'none', ok: boolean, cancelled?: boolean }>}
 */
export async function shareOrDownloadImage(item) {
  if (!item) return { method: 'none', ok: false };

  const filename = `tapasvi-register-${item.id || Date.now()}.jpg`;
  let file;
  try {
    file = await imageToFile(item, filename);
  } catch (e) {
    return { method: 'none', ok: false };
  }

  if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: 'TAPASVI register photo' });
      return { method: 'share', ok: true };
    } catch (e) {
      if (e?.name === 'AbortError') {
        // User closed the share sheet without picking anything — don't fall back to a download they didn't ask for.
        return { method: 'share', ok: false, cancelled: true };
      }
      // Any other share failure: fall through to the download fallback below.
    }
  }

  try {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { method: 'download', ok: true };
  } catch (e) {
    return { method: 'none', ok: false };
  }
}

export default shareOrDownloadImage;


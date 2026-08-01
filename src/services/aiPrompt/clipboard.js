/**
 * src/services/aiPrompt/clipboard.js
 * -----------------------------------------------------------------------
 * Small clipboard helper. Tries the modern navigator.clipboard API first
 * (needs a secure context — fine on the deployed https Vercel site) and
 * falls back to a hidden-textarea + execCommand('copy') approach for
 * older/embedded browsers where that API isn't available.
 * -----------------------------------------------------------------------
 */

export async function copyToClipboard(text) {
  if (!text) return false;

  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Fall through to the legacy approach below.
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch (e) {
    return false;
  }
}

export default copyToClipboard;


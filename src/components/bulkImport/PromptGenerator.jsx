import React, { useState } from 'react';
import { generatePrompt, copyToClipboard, shareOrDownloadImage, AI_APP_LINKS } from '../../services/aiPrompt';

/**
 * PromptGenerator
 * -----------------------------------------------------------------------
 * "Generate AI Prompt" feature. Builds a ready-to-copy, professional
 * transcription prompt and gives one-tap links to open ChatGPT, Gemini,
 * or Claude in a new tab. No API calls, no authentication — the buttons
 * only open the provider's website; the field worker does the upload
 * and copy/paste themselves, same as they already do today.
 *
 * Before opening the app, the first optimized image (if any were
 * passed in via `images`) is handed to the OS share sheet (or, if that
 * isn't supported, downloaded) so it's already saved/ready to attach —
 * no digging through the gallery for it.
 *
 * Standalone component: does not touch AI Review, the Image Optimizer,
 * the existing Paste AI Output textarea, or the Preview Records screen.
 *
 * Usage: <PromptGenerator images={capturedImages} />
 * -----------------------------------------------------------------------
 */
export default function PromptGenerator({ images }) {
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareNote, setShareNote] = useState('');

  const handleGenerate = () => {
    setPrompt(generatePrompt());
    setCopied(false);
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(prompt);
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(false), 2500);
  };

  const openApp = async (key) => {
    const firstImage = images && images[0];
    if (firstImage) {
      setSharing(true);
      setShareNote('');
      const result = await shareOrDownloadImage(firstImage);
      setSharing(false);
      if (result.cancelled) {
        // User backed out of the share sheet on purpose — don't open the AI app or show a note.
        return;
      }
      if (result.method === 'share') {
        setShareNote('Image shared. If you picked "Save" or a Files app, it\'s ready to attach.');
      } else if (result.method === 'download') {
        setShareNote('Image saved to your device — attach it once the AI app opens.');
      } else {
        setShareNote("Couldn't prepare the image automatically — please attach it manually.");
      }
    }
    window.open(AI_APP_LINKS[key], '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
      <p className="text-[12.5px] font-bold text-[#111827] mb-1">Generate AI Prompt</p>
      <p className="text-[10.5px] text-[#6B7280] mb-3">
        Get a ready-made prompt for ChatGPT, Gemini, or Claude — copy it, open the app, upload your photo,
        paste the prompt, then bring the AI's reply back to Section 2 below.
      </p>

      {!prompt ? (
        <button
          type="button"
          onClick={handleGenerate}
          className="w-full rounded-xl py-3 text-[12.5px] font-bold text-white"
          style={{ background: '#7C3AED', minHeight: 44 }}
        >
          Generate AI Prompt
        </button>
      ) : (
        <>
          <textarea
            readOnly
            value={prompt}
            rows={8}
            className="w-full rounded-xl border border-[#E5E7EB] p-3 text-[10.5px] mb-3"
            style={{ background: '#F8FAFC', color: '#374151' }}
          />

          <button
            type="button"
            onClick={handleCopy}
            className="w-full rounded-xl py-3 text-[12.5px] font-bold text-white mb-2"
            style={{ background: copied ? '#16A34A' : '#7C3AED', minHeight: 44 }}
          >
            {copied ? '✓ Copied!' : 'Copy Prompt'}
          </button>

          <div className="flex gap-2 mb-2">
            <button
              type="button"
              disabled={sharing}
              onClick={() => openApp('chatgpt')}
              className="flex-1 rounded-xl border-2 py-2.5 text-[11px] font-bold disabled:opacity-40"
              style={{ borderColor: '#7C3AED', color: '#7C3AED', minHeight: 40 }}
            >
              {sharing ? 'Preparing...' : 'Open ChatGPT'}
            </button>
            <button
              type="button"
              disabled={sharing}
              onClick={() => openApp('gemini')}
              className="flex-1 rounded-xl border-2 py-2.5 text-[11px] font-bold disabled:opacity-40"
              style={{ borderColor: '#7C3AED', color: '#7C3AED', minHeight: 40 }}
            >
              {sharing ? 'Preparing...' : 'Open Gemini'}
            </button>
            <button
              type="button"
              disabled={sharing}
              onClick={() => openApp('claude')}
              className="flex-1 rounded-xl border-2 py-2.5 text-[11px] font-bold disabled:opacity-40"
              style={{ borderColor: '#7C3AED', color: '#7C3AED', minHeight: 40 }}
            >
              {sharing ? 'Preparing...' : 'Open Claude'}
            </button>
          </div>

          {shareNote && (
            <p className="text-[10px] font-semibold text-[#6D28D9] mb-2">{shareNote}</p>
          )}

          {images && images.length > 1 && (
            <p className="text-[9.5px] text-[#9CA3AF] mb-2">
              Only the first image is auto-attached — share the rest from Section 1 above if needed.
            </p>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            className="w-full text-[10.5px] font-semibold text-[#6B7280] py-1"
          >
            Regenerate prompt
          </button>
        </>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { generatePrompt, copyToClipboard, AI_APP_LINKS } from '../../services/aiPrompt';

/**
 * PromptGenerator
 * -----------------------------------------------------------------------
 * "Generate AI Prompt" feature. Builds a ready-to-copy, professional
 * transcription prompt and gives one-tap links to open ChatGPT, Gemini,
 * or Claude in a new tab. No API calls, no authentication — the buttons
 * only open the provider's website; the field worker does the upload
 * and copy/paste themselves, same as they already do today.
 *
 * Standalone component: does not touch AI Review, the Image Optimizer,
 * the existing Paste AI Output textarea, or the Preview Records screen.
 * -----------------------------------------------------------------------
 */
export default function PromptGenerator() {
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    setPrompt(generatePrompt());
    setCopied(false);
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(prompt);
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(false), 2500);
  };

  const openApp = (key) => {
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
              onClick={() => openApp('chatgpt')}
              className="flex-1 rounded-xl border-2 py-2.5 text-[11px] font-bold"
              style={{ borderColor: '#7C3AED', color: '#7C3AED', minHeight: 40 }}
            >
              Open ChatGPT
            </button>
            <button
              type="button"
              onClick={() => openApp('gemini')}
              className="flex-1 rounded-xl border-2 py-2.5 text-[11px] font-bold"
              style={{ borderColor: '#7C3AED', color: '#7C3AED', minHeight: 40 }}
            >
              Open Gemini
            </button>
            <button
              type="button"
              onClick={() => openApp('claude')}
              className="flex-1 rounded-xl border-2 py-2.5 text-[11px] font-bold"
              style={{ borderColor: '#7C3AED', color: '#7C3AED', minHeight: 40 }}
            >
              Open Claude
            </button>
          </div>

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

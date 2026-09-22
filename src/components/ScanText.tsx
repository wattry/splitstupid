import React, { useState } from 'react';

interface Props {
  /** Raw OCR text, whitespace intact so columns line up in monospace. */
  text: string;
  onHide: () => void;
}

// The receipt as OCR read it. Read-only but selectable, in monospace with
// whitespace preserved so the printed columns still roughly line up. Shown
// collapsed under the processed image; tap to open the full text in a modal.
export function ScanText({ text, onHide }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — the text is still selectable.
    }
  };

  const copyButton = (
    <button type="button" className="scan-text__copy" onClick={copy}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  );

  return (
    <>
      <figure className="scan-text">
        <button
          type="button"
          className="scan-text__open"
          onClick={() => setOpen(true)}
          aria-label="Expand OCR text"
        >
          <pre className="scan-text__body">{text}</pre>
        </button>
        <figcaption>
          OCR text — tap to enlarge
          {copyButton}
          <button
            type="button"
            className="scan-preview__close"
            onClick={onHide}
            aria-label="Hide OCR text"
          >
            ×
          </button>
        </figcaption>
      </figure>

      {open && (
        <div
          className="calc"
          role="dialog"
          aria-label="OCR text"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="calc__card scan-text__card">
            <pre className="scan-text__body scan-text__body--full">{text}</pre>
            <div className="scan-text__actions">
              <button
                type="button"
                className="scan-btn scan-btn--ghost"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
              <button type="button" className="scan-btn" onClick={copy}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

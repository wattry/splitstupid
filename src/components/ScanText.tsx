import React, { useState } from 'react';

interface Props {
  /** Raw OCR text, whitespace intact so columns line up in monospace. */
  text: string;
  /**
   * Parse the (possibly edited) text into the bill. Returns the number of
   * line items imported: 0 means none were found and the editor stays open
   * with a hint.
   */
  onImport: (text: string) => number;
  /** Keep the edited text (it goes into the share link and save file) without touching the rows. */
  onSave: (text: string) => void;
  onHide: () => void;
}

// The receipt as OCR read it. Under the processed image it's a read-only,
// selectable monospace block with whitespace preserved so the printed columns
// still roughly line up. Tapping it opens an editor: fix what OCR got wrong,
// then Import re-parses the text into line items.
export function ScanText({ text, onImport, onSave, onHide }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(text);
  const [copied, setCopied] = useState(false);
  const [nothingFound, setNothingFound] = useState(false);

  const openEditor = () => {
    setDraft(text);
    setNothingFound(false);
    setOpen(true);
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — the text is still selectable.
    }
  };

  const saveDraft = () => {
    onSave(draft);
    setOpen(false);
  };

  const importDraft = () => {
    const count = onImport(draft);
    if (count === 0) {
      setNothingFound(true);
      return;
    }
    setOpen(false);
  };

  return (
    <>
      <figure className="scan-text">
        <button
          type="button"
          className="scan-text__open"
          onClick={openEditor}
          aria-label="Edit OCR text"
        >
          <pre className="scan-text__body">{text}</pre>
        </button>
        <figcaption>
          OCR text — tap to edit
          <button type="button" className="scan-text__copy" onClick={() => copy(text)}>
            {copied ? 'Copied' : 'Copy'}
          </button>
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
          aria-label="Edit OCR text"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="calc__card scan-text__card">
            <textarea
              className="scan-text__body scan-text__editor"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setNothingFound(false);
              }}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="OCR text"
            />
            <div className="scan-text__meta">
              {nothingFound
                ? <span className="hint" role="alert">No line items found. A line needs a price like 12.50.</span>
                : <span className="hint hint--muted">Fix anything OCR misread. Save keeps the text; Import rebuilds the lines.</span>}
              <button type="button" className="scan-text__copy" onClick={() => copy(draft)}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="scan-text__actions">
              <button
                type="button"
                className="scan-btn scan-btn--ghost"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
              <button type="button" className="scan-btn scan-btn--ghost" onClick={saveDraft}>
                Save
              </button>
              <button type="button" className="scan-btn" onClick={importDraft}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

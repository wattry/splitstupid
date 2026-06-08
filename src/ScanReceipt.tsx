import React, { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, Dispatch, ReactElement, SetStateAction } from 'react';
import { scanReceipt } from './lib/ocr.js';
import { parseLineItems } from './lib/parseLineItems.js';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import CameraCapture from './CameraCapture.js';
import CropImage from './CropImage.js';
import type { Item, MakeRow } from './types.js';

const round2 = (n: number) => Math.round(n * 100) / 100

interface ScanReceiptProps {
  items: Item[];
  perUnit: boolean;
  setItems: Dispatch<SetStateAction<Item[]>>;
  makeRow: MakeRow;
};

/**
 * "Scan Receipt" controls. Offers two ways to supply the image — upload an
 * existing photo, or take a new one with the camera. Either path goes through a
 * crop step, then OCRs the cropped region, parses qty/desc/price line items,
 * and replaces the item rows (asking before overwriting existing rows).
 *
 * @param props
 */
export default function ScanReceipt(props: ScanReceiptProps): ReactElement {
  const {
    items,
    setItems,
    perUnit,
    makeRow
  } = props;

  const uploadRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('idle') // 'idle' | 'scanning' | 'error'
  const [progress, setProgress] = useState(0)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null) // object URL pending crop
  const [preview, setPreview] = useState<string | null>(null) // preprocessed image data URL
  const [expanded, setExpanded] = useState(false) // preview lightbox open

  // Close the lightbox on Escape.
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => { // DOM KeyboardEvent (window listener)
      if (e.key === 'Escape') {
        setExpanded(false)
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded])

  // True when the user already has real item content worth protecting.
  const hasContent = items.some(
    (it) => String(it.desc).trim() || parseFloat(it.price) > 0
  )

  // Hand an image off to the crop step. Accepts a File (upload) or Blob (camera).
  const openCrop = (imageLike: Blob) => {
    setCropSrc(URL.createObjectURL(imageLike))
  }

  const closeCrop = () => {
    setCropSrc((url) => {
      if (url) URL.revokeObjectURL(url)
      return null
    })
  }

  // OCR an image (cropped Blob) and replace the item rows.
  const processImage = async (image: Blob) => {
    setStatus('scanning')
    setProgress(0)
    setPreview(null)

    try {
      const text = await scanReceipt(image, {
        onProgress: setProgress,
        onPreview: setPreview,
      })
      const parsed = parseLineItems(text)

      if (parsed.length === 0) {
        setStatus('error')
        return
      }

      if (
        hasContent &&
        !window.confirm('Replace your current items with the scanned ones?')
      ) {
        setStatus('idle')
        return
      }

      setItems(
        parsed.map(({ units, desc, lineTotal }) =>
          makeRow({
            units: String(units),
            yours: '1',
            desc,
            // Price column follows the toggle: per-unit, or total for all units.
            price: String(perUnit ? round2(lineTotal / units) : lineTotal),
          })
        )
      )
      setStatus('idle')
    } catch (err) {
      console.error('Receipt scan failed:', err)
      setStatus('error')
    }
  }

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // let the user re-pick the same file later
    if (file) openCrop(file)
  }

  const onCapture = (blob: Blob) => {
    setCameraOpen(false)
    openCrop(blob)
  }

  const onCropConfirm = (blob: Blob) => {
    closeCrop()
    processImage(blob)
  }

  const scanning = status === 'scanning'

  return (
    <div className="field">
      <span className="field__label">Scan Receipt</span>
      <div className="scan-actions">
        <button
          type="button"
          className="scan-btn"
          onClick={() => uploadRef.current?.click()}
          disabled={scanning}
        >
          <UploadIcon />
          {scanning ? `Scanning… ${Math.round(progress * 100)}%` : 'Upload'}
        </button>
        <button
          type="button"
          className="scan-btn scan-btn--camera"
          onClick={() => setCameraOpen(true)}
          disabled={scanning}
        >
          <CameraIcon />
          Take Photo
        </button>
      </div>

      {/* Upload: any image from the device. */}
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onFile}
      />

      {status === 'error' && (
        <span className="hint">Couldn’t read prices — type them manually.</span>
      )}

      {preview && (
        <figure className="scan-preview">
          <button
            type="button"
            className="scan-preview__open"
            onClick={() => setExpanded(true)}
            aria-label="Expand processed image"
          >
            <img src={preview} alt="Processed receipt sent to OCR" />
          </button>
          <figcaption>
            Processed image — tap to enlarge
            <button
              type="button"
              className="scan-preview__close"
              onClick={() => setPreview(null)}
              aria-label="Hide preview"
            >
              ×
            </button>
          </figcaption>
        </figure>
      )}

      {expanded && preview && (
        <div
          className="lightbox"
          role="dialog"
          aria-label="Processed image"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            className="lightbox__close"
            onClick={() => setExpanded(false)}
            aria-label="Close"
          >
            ×
          </button>
          {/* Stop taps on the image from closing; taps on the dark area close. */}
          <div className="lightbox__inner" onClick={(e) => e.stopPropagation()}>
            <TransformWrapper doubleClick={{ mode: 'toggle' }} centerOnInit>
              <TransformComponent
                wrapperClass="lightbox__stage"
                contentClass="lightbox__content"
              >
                <img src={preview} alt="Processed receipt sent to OCR" />
              </TransformComponent>
            </TransformWrapper>
          </div>
          <span className="lightbox__hint">tap outside or × to close · pinch to zoom</span>
        </div>
      )}

      {cameraOpen && (
        <CameraCapture onCapture={onCapture} onClose={() => setCameraOpen(false)} />
      )}

      {cropSrc && (
        <CropImage src={cropSrc} onConfirm={onCropConfirm} onCancel={closeCrop} />
      )}
    </div>
  )
}

function UploadIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

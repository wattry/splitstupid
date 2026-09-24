import React, { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { Area } from 'react-easy-crop';
import { usePostHog } from '@posthog/react';
import { scanPhotos, mergeScans, joinScanTexts, splitScanTexts } from './lib/scanPhotos.js';
import { scanWarnings } from './lib/scanWarnings.js';
import { exportFileName } from './lib/exportName.js';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import CameraCapture from './CameraCapture.js';
import CropImage from './CropImage.js';
import { ScanText } from './components/ScanText.js';
import { isIOS } from './lib/platform.js';
import type { Item, MakeRow, ParsedTotals } from './types.js';

const round2 = (n: number) => Math.round(n * 100) / 100

/** Most photos one scan may hold; the grid is sized for a 3x3. */
export const MAX_PHOTOS = 9

interface Photo {
  id: string;
  /** Object URL of the original image; revoked when the photo is removed. */
  src: string;
  /** Saved crop framing; absent means scan the whole photo. */
  crop?: { area: Area; x: number; y: number; zoom: number };
}

interface ScanReceiptProps {
  items: Item[];
  /** Current bill name, used to name the saved processed image. */
  billName: string;
  perUnit: boolean;
  makeRow: MakeRow;
  /**
   * Receives the parsed totals, item rows and sanity-check warnings; the
   * parent replaces the whole bill and shows the warnings.
   */
  onScanned: (totals: ParsedTotals, rows: Item[], warnings: string[]) => void;
  /** Raw OCR text of the last scan (or from a shared link); '' when none. Owned by App so it travels with the link. */
  scanText: string;
  setScanText: (text: string) => void;
  /** True when the subtotal/tax/tip fields already hold user-entered values. */
  hasTotals: boolean;
};

/**
 * "Scan Receipt" controls. The user collects up to MAX_PHOTOS photos of one
 * bill — uploaded or taken with the camera — into a thumbnail grid, optionally
 * crops any of them, then taps Scan once. Every photo is OCR'd in order and
 * the merged line items and totals replace the bill (asking first if the form
 * already has content).
 *
 * @param props
 */
export default function ScanReceipt(props: ScanReceiptProps): ReactElement {
  const {
    items,
    billName,
    perUnit,
    makeRow,
    onScanned,
    scanText,
    setScanText,
    hasTotals
  } = props;

  const posthog = usePostHog() // undefined outside the prod PostHogProvider
  const [photos, setPhotos] = useState<Photo[]>([])
  const [status, setStatus] = useState('idle') // 'idle' | 'scanning' | 'error'
  const [progress, setProgress] = useState({ index: 0, fraction: 0 })
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cropId, setCropId] = useState<string | null>(null) // photo open in the crop step
  // Live framing while the crop step is open; seeded from the photo's saved crop.
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [preview, setPreview] = useState<string | null>(null) // last preprocessed image data URL
  const [expanded, setExpanded] = useState(false) // preview lightbox open
  const [capHint, setCapHint] = useState(false) // "only 9 photos" notice
  const uploadRef = useRef<HTMLInputElement>(null)

  // Mirrors `photos` for the unmount cleanup below, which must see the latest list.
  const photosRef = useRef(photos)
  photosRef.current = photos

  // Revoke every photo's object URL when the component unmounts.
  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.src))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Auto-hide the cap notice.
  useEffect(() => {
    if (!capHint) return
    const t = window.setTimeout(() => setCapHint(false), 4000)
    return () => window.clearTimeout(t)
  }, [capHint])

  // True when the user already has real item content worth protecting.
  const hasContent = items.some(
    (it) => String(it.desc).trim() || parseFloat(it.price) > 0
  )

  // Append images (File from upload, Blob from camera) up to the cap.
  const addPhotos = (images: Blob[]) => {
    const room = MAX_PHOTOS - photos.length
    if (images.length > room) setCapHint(true)
    const added = images.slice(0, Math.max(room, 0)).map((img) => ({
      id: crypto.randomUUID(),
      src: URL.createObjectURL(img),
    }))
    setPhotos((prev) => [...prev, ...added])
  }

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const gone = prev.find((p) => p.id === id)
      if (gone) URL.revokeObjectURL(gone.src)
      return prev.filter((p) => p.id !== id)
    })
  }

  const openCrop = (photo: Photo) => {
    setCrop(photo.crop ? { x: photo.crop.x, y: photo.crop.y } : { x: 0, y: 0 })
    setZoom(photo.crop?.zoom ?? 1)
    setCropId(photo.id)
  }

  const closeCrop = () => setCropId(null)

  const onCropConfirm = (area: Area) => {
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === cropId ? { ...p, crop: { area, x: crop.x, y: crop.y, zoom } } : p
      )
    )
    closeCrop()
  }

  // Parse OCR text (fresh from a scan, or edited by the user) into the bill.
  // Returns how many line items were imported; 0 leaves the bill untouched.
  const importTexts = (
    texts: string[],
    source: 'scan' | 'edit',
    stats: { photo_count: number; cropped_count: number; started: number }
  ): number => {
    const { totals, items: parsed } = mergeScans(texts)
    const found = {
      items: parsed.length,
      totals: Object.keys(totals).filter((k) => totals[k as keyof ParsedTotals] !== undefined),
    }
    // Usage metric: is multi-photo scanning used, does it work, and do people
    // fix the text by hand?
    posthog?.capture('receipt_scanned', {
      ...stats,
      source,
      outcome: parsed.length === 0 ? 'no_items' : 'ok',
      items_found: found.items,
      totals_found: found.totals,
      duration_ms: Math.round(performance.now() - stats.started),
    })
    if (parsed.length === 0) return 0

    onScanned(
      totals,
      parsed.map(({ units, desc, lineTotal }) =>
        makeRow({
          units: String(units),
          desc,
          // Price column follows the toggle: per-unit, or total for all units.
          price: String(perUnit ? round2(lineTotal / units) : lineTotal),
        })
      ),
      scanWarnings(totals, parsed)
    )
    return parsed.length
  }

  const confirmReplace = () =>
    !(hasContent || hasTotals) ||
    window.confirm('Replace your current bill with the scanned one?')

  const photoStats = () => ({
    photo_count: photos.length,
    cropped_count: photos.filter((p) => p.crop).length,
    started: performance.now(),
  })

  // OCR every photo in order and replace the bill with the merged result.
  const scanAll = async () => {
    if (photos.length === 0) return
    if (!confirmReplace()) return

    setStatus('scanning')
    setProgress({ index: 0, fraction: 0 })
    setPreview(null)
    setScanText('')
    const stats = photoStats()

    try {
      const texts = await scanPhotos(
        photos.map((p) => (p.crop ? { src: p.src, area: p.crop.area } : { src: p.src })),
        {
          onProgress: (index, fraction) => setProgress({ index, fraction }),
          onPreview: setPreview,
        }
      )
      // Kept before parsing: when nothing parses, the raw text is what the
      // user needs to see (and fix).
      setScanText(joinScanTexts(texts))
      setStatus(importTexts(texts, 'scan', stats) === 0 ? 'error' : 'idle')
    } catch (err) {
      console.error('Receipt scan failed:', err)
      posthog?.capture('receipt_scanned', { ...stats, source: 'scan', outcome: 'error', duration_ms: Math.round(performance.now() - stats.started) })
      setStatus('error')
    }
  }

  // Re-import the OCR text after the user edited it. No "replace?" confirm:
  // the rows came from this same text moments ago, and re-importing is the
  // whole point of editing.
  const importEdited = (text: string): number => {
    const count = importTexts(splitScanTexts(text), 'edit', photoStats())
    if (count > 0) {
      setScanText(text)
      setStatus('idle')
    }
    return count
  }

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // let the user re-pick the same files later
    if (files.length) addPhotos(files)
  }

  const scanning = status === 'scanning'
  const full = photos.length >= MAX_PHOTOS
  const ios = isIOS(navigator.userAgent, navigator.maxTouchPoints)
  const cropping = photos.find((p) => p.id === cropId)
  const columns = photos.length <= 1 ? 1 : photos.length <= 4 ? 2 : 3

  return (
    <div className="field">
      <span className="field__label">Scan Receipt</span>
      <div className="scan-actions">
        {/* iOS's file picker already offers "Take Photo", so Take would be a duplicate there. */}
        {!ios && <button
          type="button"
          className="scan-btn scan-btn--camera"
          onClick={() => setCameraOpen(true)}
          disabled={scanning || full}
        >
          <CameraIcon />
          Take
        </button>}
        <button
          type="button"
          className="scan-btn scan-btn--camera"
          onClick={() => uploadRef.current?.click()}
          disabled={scanning || full}
        >
          <UploadIcon />
          Upload
        </button>
        {/* Upload: any images from the device, several at once. */}
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={onFiles}
        />
        {photos.length > 0 && (
          <button
            type="button"
            className="scan-btn"
            onClick={scanAll}
            disabled={scanning}
          >
            <ScanIcon />
            {scanning
              ? `${progress.index + 1} of ${photos.length}… ${Math.round(progress.fraction * 100)}%`
              : photos.length === 1 ? 'Scan' : `Scan ${photos.length}`}
          </button>
        )}
      </div>

      {capHint && (
        <span className="hint">Up to {MAX_PHOTOS} photos per scan — extras were skipped.</span>
      )}

      {status === 'error' && (
        <span className="hint">Couldn’t read prices — type them manually.</span>
      )}

      {photos.length > 0 && (
        <ul className="photo-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {photos.map((photo, i) => (
            <li
              key={photo.id}
              className={`photo-grid__cell${progress.index === i && scanning ? ' photo-grid__cell--busy' : ''}`}
            >
              <button
                type="button"
                className="photo-grid__open"
                onClick={() => openCrop(photo)}
                disabled={scanning}
                aria-label={`Crop photo ${i + 1}`}
              >
                <img src={photo.src} alt={`Receipt photo ${i + 1}`} />
              </button>
              {photo.crop && <span className="photo-grid__badge">cropped</span>}
              <button
                type="button"
                className="photo-grid__remove"
                onClick={() => removePhoto(photo.id)}
                disabled={scanning}
                aria-label={`Remove photo ${i + 1}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
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
            <a
              className="scan-preview__save"
              href={preview}
              download={exportFileName(billName, 'jpg')}
            >
              Save
            </a>
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

      {scanText && (
        <ScanText
          text={scanText}
          onImport={importEdited}
          onSave={setScanText}
          onHide={() => setScanText('')}
        />
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
        <CameraCapture
          count={photos.length}
          max={MAX_PHOTOS}
          onCapture={(blob) => addPhotos([blob])}
          onClose={() => setCameraOpen(false)}
          onUpload={() => { setCameraOpen(false); uploadRef.current?.click() }}
        />
      )}

      {cropping && (
        <CropImage
          src={cropping.src}
          crop={crop}
          zoom={zoom}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onConfirm={onCropConfirm}
          onCancel={closeCrop}
        />
      )}
    </div>
  )
}

function ScanIcon() {
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
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
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

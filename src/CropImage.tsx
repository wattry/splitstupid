import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area, MediaSize } from 'react-easy-crop'
import { getCroppedBlob } from './lib/cropImage.js'

interface CropImageProps {
  src: string;
  /** Controlled framing (lives in the parent so a rescan can restore it). */
  crop: { x: number; y: number };
  zoom: number;
  onCropChange: (crop: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

/**
 * Full-screen crop step. Lets the user drag/zoom to frame the part of the
 * receipt to scan, then produces a cropped JPEG Blob. Crop position and zoom
 * are controlled by the parent so reopening the same image (rescan) starts
 * from where the user left off.
 */
export default function CropImage({ src, crop, zoom, onCropChange, onZoomChange, onConfirm, onCancel }: CropImageProps) {
  const [areaPixels, setAreaPixels] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  // Crop box matches the image's own shape, so at zoom 1 the whole photo
  // (including a tall receipt) fits inside it; the user zooms in to trim.
  const [aspect, setAspect] = useState<number | undefined>(undefined)

  const onMediaLoaded = useCallback((media: MediaSize) => {
    if (media.naturalWidth && media.naturalHeight) {
      setAspect(media.naturalWidth / media.naturalHeight)
    }
  }, [])

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setAreaPixels(pixels)
  }, [])

  const confirm = async () => {
    if (!areaPixels) return
    setBusy(true)
    const blob = await getCroppedBlob(src, areaPixels)
    if (blob) onConfirm(blob)
    else setBusy(false)
  }

  return (
    <div className="camera" role="dialog" aria-label="Crop the receipt">
      <p className="camera__hint">Frame the items you want to scan</p>
      <div className="camera__stage camera__stage--crop">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onMediaLoaded={onMediaLoaded}
          minZoom={1}
          maxZoom={5}
          restrictPosition={false}
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onCropComplete={onCropComplete}
        />
      </div>
      <input
        type="range"
        className="camera__zoom"
        min={1}
        max={5}
        step={0.1}
        value={zoom}
        onChange={(e) => onZoomChange(Number(e.target.value))}
        aria-label="Zoom"
      />
      <div className="camera__actions">
        <button
          type="button"
          className="scan-btn scan-btn--camera"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="button"
          className="scan-btn"
          onClick={confirm}
          disabled={!areaPixels || busy}
        >
          {busy ? 'Cropping…' : 'Scan This'}
        </button>
      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { getCroppedBlob } from './lib/cropImage.js'

/**
 * Full-screen crop step. Lets the user drag/zoom to frame the part of the
 * receipt to scan, then produces a cropped JPEG Blob.
 *
 * @param {{ src: string, onConfirm: (blob: Blob) => void, onCancel: () => void }} props
 */
export default function CropImage({ src, onConfirm, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [areaPixels, setAreaPixels] = useState(null)
  const [busy, setBusy] = useState(false)

  const onCropComplete = useCallback((_area, pixels) => {
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
          minZoom={1}
          maxZoom={5}
          restrictPosition={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
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
        onChange={(e) => setZoom(Number(e.target.value))}
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

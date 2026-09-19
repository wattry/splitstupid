import React, { useEffect, useRef, useState } from 'react'

interface CameraCaptureProps {
  /** Photos already taken this session, shown as a counter. */
  count: number;
  /** Cap on photos; Capture is disabled once reached. */
  max: number;
  onCapture: (blob: Blob) => void;
  /** "Done": close the overlay, keeping whatever was captured. */
  onClose: () => void;
}

/**
 * Live camera capture overlay. Requests photo access via getUserMedia, shows a
 * preview, and on "Capture" grabs a still frame as a JPEG Blob. Stays open so the user can take several photos; "Done" closes it.
 *
 * Works on desktop and mobile over a secure context (HTTPS / localhost).
 */
export default function CameraCapture({ count, max, onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.error('Camera access failed:', err)
        if (!cancelled) setError('Camera unavailable — check permissions or use Upload.')
      }
    }

    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob)
      },
      'image/jpeg',
      0.92
    )
  }

  return (
    <div className="camera" role="dialog" aria-label="Take a receipt photo">
      <div className="camera__stage">
        {error ? (
          <p className="camera__error">{error}</p>
        ) : (
          <video ref={videoRef} className="camera__video" autoPlay playsInline muted />
        )}
      </div>
      <p className="camera__hint">
        {count === 0 ? 'Take a photo of the receipt' : `${count}/${max} photos`}
        {count >= max ? ' — limit reached' : ''}
      </p>
      <div className="camera__actions">
        <button type="button" className="scan-btn scan-btn--camera" onClick={onClose}>
          {count === 0 ? 'Cancel' : 'Done'}
        </button>
        <button
          type="button"
          className="scan-btn"
          onClick={capture}
          disabled={!!error || count >= max}
        >
          Capture
        </button>
      </div>
    </div>
  )
}

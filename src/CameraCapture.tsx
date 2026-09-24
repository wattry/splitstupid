import React, { useCallback, useEffect, useRef, useState } from 'react'
import { cameraError, cameraSupported } from './lib/cameraError.js'
import type { CameraError } from './lib/cameraError.js'
import { detectPlatform } from './lib/venmo.js'

interface CameraCaptureProps {
  /** Photos already taken this session, shown as a counter. */
  count: number;
  /** Cap on photos; Capture is disabled once reached. */
  max: number;
  onCapture: (blob: Blob) => void;
  /** "Done": close the overlay, keeping whatever was captured. */
  onClose: () => void;
  /** "Use Upload": close the overlay and open the file picker instead. */
  onUpload: () => void;
}

/**
 * Live camera capture overlay. Requests photo access via getUserMedia, shows a
 * preview, and on "Capture" grabs a still frame as a JPEG Blob. Stays open so the user can take several photos; "Done" closes it.
 *
 * Works on desktop and mobile over a secure context (HTTPS / localhost).
 * Browsers only prompt for permission once; after a "Don't allow" they fail
 * silently, so failures are turned into per-platform instructions with a
 * Try again button.
 */
export default function CameraCapture({ count, max, onCapture, onClose, onUpload }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<CameraError | null>(null)
  // Bumped by "Try again" to re-run the effect that asks for the camera.
  const [attempt, setAttempt] = useState(0)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    let cancelled = false
    const platform = detectPlatform(navigator.userAgent)

    async function start() {
      setError(null)
      if (!cameraSupported(navigator.mediaDevices)) {
        setError(cameraError(new TypeError('getUserMedia unavailable'), platform))
        return
      }
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
        if (!cancelled) setError(cameraError(err, platform))
      }
    }

    start()
    return () => {
      cancelled = true
      stop()
    }
  }, [attempt, stop])

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
          <div className="camera__error">
            <p className="camera__error-title">{error.title}</p>
            <ol>
              {error.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <div className="camera__actions">
              {error.retry && (
                <button type="button" className="scan-btn" onClick={() => setAttempt((n) => n + 1)}>
                  Try again
                </button>
              )}
              <button type="button" className="scan-btn scan-btn--camera" onClick={onUpload}>
                Use Upload
              </button>
            </div>
          </div>
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

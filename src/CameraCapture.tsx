import { useEffect, useRef, useState } from 'react'

/**
 * Live camera capture overlay. Requests photo access via getUserMedia, shows a
 * preview, and on "Capture" grabs a still frame as a JPEG Blob.
 *
 * Works on desktop and mobile over a secure context (HTTPS / localhost).
 *
 * @param {{ onCapture: (blob: Blob) => void, onClose: () => void }} props
 */
export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
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
    canvas.getContext('2d').drawImage(video, 0, 0)
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
      <div className="camera__actions">
        <button type="button" className="scan-btn scan-btn--camera" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="scan-btn" onClick={capture} disabled={!!error}>
          Capture
        </button>
      </div>
    </div>
  )
}

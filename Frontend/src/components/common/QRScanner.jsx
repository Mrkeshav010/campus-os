import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

// Opens the camera and calls onScan(text) once when a QR is read.
// The camera is released BEFORE onScan runs, and on unmount/cancel, by stopping
// the scanner and every camera track directly, so the camera light always goes off.
export default function QRScanner({ onScan, onError }) {
  const boxRef = useRef(null)
  const cbRef = useRef({ onScan, onError })
  cbRef.current = { onScan, onError }

  useEffect(() => {
    const el = document.createElement('div')
    el.id = `qr-${Math.random().toString(36).slice(2)}`
    boxRef.current.appendChild(el)

    const scanner = new Html5Qrcode(el.id)
    let stream = null
    let closed = false

    const releaseCamera = async () => {
      try {
        if (scanner.isScanning) await scanner.stop()
      } catch {
        /* already stopped */
      }
      const video = el.querySelector('video')
      ;[stream, video?.srcObject].filter(Boolean).forEach((s) => s.getTracks().forEach((t) => t.stop()))
      if (video) video.srcObject = null
      try {
        scanner.clear()
      } catch {
        /* nothing to clear */
      }
    }

    const started = scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => {
          if (closed) return
          closed = true
          releaseCamera().finally(() => cbRef.current.onScan(text))
        },
        () => {}
      )
      .then(() => {
        stream = el.querySelector('video')?.srcObject || null
        if (closed) return releaseCamera() // unmounted while the camera was still opening
      })
      .catch((err) => {
        cbRef.current.onError?.(String(err?.message || err))
      })

    return () => {
      closed = true
      started.finally(async () => {
        await releaseCamera()
        el.remove()
      })
    }
  }, [])

  return <div ref={boxRef} className="w-full overflow-hidden rounded-xl bg-black" />
}
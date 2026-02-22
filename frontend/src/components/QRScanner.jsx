/**
 * QRScanner.jsx — Camera + Image QR code scanner
 * Uses html5-qrcode. Supports live camera scan AND file/image upload scan.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScanner({ onScan, onError, scanning = true }) {
  const html5QrRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | starting | active | error | stopped
  const [errorMsg, setErrorMsg] = useState('')
  const mountedRef = useRef(true)
  const hasScannedRef = useRef(false)
  const containerIdRef = useRef('qr-reader-' + Math.random().toString(36).slice(2, 8))
  const fileInputRef = useRef(null)

  const cleanup = useCallback(async () => {
    if (html5QrRef.current) {
      try {
        const st = html5QrRef.current.getState?.()
        if (st === 2) await html5QrRef.current.stop()
      } catch { /* ok */ }
      try { html5QrRef.current.clear() } catch { /* ok */ }
      html5QrRef.current = null
    }
  }, [])

  // Start live camera scanner
  const startCamera = useCallback(async () => {
    const cid = containerIdRef.current
    setStatus('starting')
    hasScannedRef.current = false

    await new Promise(r => setTimeout(r, 300))
    if (!mountedRef.current) return

    const el = document.getElementById(cid)
    if (!el) { setStatus('error'); setErrorMsg('Scanner container missing'); return }
    el.innerHTML = ''

    try {
      await cleanup()
      const qr = new Html5Qrcode(cid)
      html5QrRef.current = qr

      // Use facingMode — most compatible approach
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => {
          if (hasScannedRef.current) return
          hasScannedRef.current = true
          if (navigator.vibrate) navigator.vibrate([100, 50, 100])
          if (mountedRef.current && onScan) onScan(decoded)
        },
        () => {}
      )
      if (mountedRef.current) { setStatus('active'); setErrorMsg('') }
    } catch (err1) {
      // facingMode failed — try 'user' (front camera)
      try {
        await cleanup()
        const el2 = document.getElementById(cid)
        if (el2) el2.innerHTML = ''
        const qr2 = new Html5Qrcode(cid)
        html5QrRef.current = qr2
        await qr2.start(
          { facingMode: 'user' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            if (hasScannedRef.current) return
            hasScannedRef.current = true
            if (navigator.vibrate) navigator.vibrate([100, 50, 100])
            if (mountedRef.current && onScan) onScan(decoded)
          },
          () => {}
        )
        if (mountedRef.current) { setStatus('active'); setErrorMsg('') }
      } catch (err2) {
        console.error('Camera start failed:', err2)
        if (mountedRef.current) {
          const msg = typeof err2 === 'string' ? err2 : err2?.message || 'Camera access failed'
          setStatus('error')
          setErrorMsg(msg)
          if (onError) onError(msg)
        }
      }
    }
  }, [cleanup, onScan, onError])

  // Scan from uploaded image file
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const cid = containerIdRef.current
    hasScannedRef.current = false

    try {
      await cleanup()
      const el = document.getElementById(cid)
      if (el) el.innerHTML = ''

      const qr = new Html5Qrcode(cid)
      html5QrRef.current = qr

      const result = await qr.scanFile(file, true)
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])
      if (mountedRef.current && onScan) onScan(result)
    } catch (err) {
      console.error('File scan failed:', err)
      if (mountedRef.current) {
        setStatus('error')
        setErrorMsg('Could not find a QR code in this image. Try a clearer photo.')
      }
    }
    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [cleanup, onScan])

  useEffect(() => {
    mountedRef.current = true
    if (!scanning) {
      cleanup()
      setStatus('stopped')
      return
    }
    setStatus('idle')
    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [scanning, cleanup])

  const cid = containerIdRef.current
  const isActive = status === 'active'

  return (
    <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
      {/* Action buttons — always visible */}
      {status !== 'active' && status !== 'starting' && (
        <div style={{
          display: 'flex', gap: '10px', justifyContent: 'center',
          marginBottom: '16px', flexWrap: 'wrap'
        }}>
          <button
            className="btn btn-primary"
            onClick={startCamera}
            style={{ padding: '14px 24px', fontSize: '15px' }}
          >
            Open Camera
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '14px 24px', fontSize: '15px' }}
          >
            Upload QR Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture={false}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Starting state */}
      {status === 'starting' && (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          background: 'rgba(10,10,20,0.95)',
          borderRadius: '16px', border: '2px solid rgba(255,255,255,0.1)',
          marginBottom: '8px'
        }}>
          <div className="spinner" style={{ margin: '0 auto 14px' }} />
          <div style={{ color: '#94a3b8', fontSize: '14px' }}>Opening camera...</div>
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '6px' }}>
            Allow camera permission when prompted
          </div>
        </div>
      )}

      {/* Scanner container — html5-qrcode injects video here */}
      <div
        id={cid}
        style={{
          width: '100%',
          borderRadius: '16px',
          overflow: 'hidden',
          border: isActive ? '3px solid rgba(0,255,136,0.6)' : '2px solid rgba(255,255,255,0.06)',
          transition: 'border-color 0.3s ease',
          background: '#0a0a14',
          display: (status === 'active' || status === 'starting') ? 'block' : 'none',
        }}
      />

      {/* Active indicator */}
      {isActive && (
        <div style={{ textAlign: 'center', marginTop: '14px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(0,255,136,0.1)', borderRadius: '20px', padding: '8px 16px'
          }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: '#00ff88', boxShadow: '0 0 10px #00ff88',
              animation: 'qrPulse 1.5s ease-in-out infinite'
            }} />
            <span style={{ color: '#00ff88', fontSize: '14px', fontWeight: 600 }}>
              Scanning — point at QR code
            </span>
          </div>
          <div style={{ marginTop: '12px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => { cleanup(); setStatus('idle') }}
              style={{ fontSize: '12px', padding: '6px 16px' }}
            >
              ✕ Stop Camera
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div style={{
          background: 'rgba(255,82,82,0.08)',
          border: '1px solid rgba(255,82,82,0.2)',
          borderRadius: '12px', padding: '20px', textAlign: 'center',
          marginTop: '8px'
        }}>
          <div style={{ marginBottom: '8px' }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff5252" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <div style={{ color: '#ff5252', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
            {errorMsg.includes('image') || errorMsg.includes('QR code') ? 'QR Not Found' : 'Camera Error'}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5, marginBottom: '14px' }}>
            {errorMsg.includes('NotAllowed') || errorMsg.includes('denied')
              ? 'Camera permission denied. Allow camera in browser settings.'
              : errorMsg.includes('NotFound') || errorMsg.includes('Requested device')
                ? 'No camera found. Use Upload QR Image instead.'
                : errorMsg}
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => { setStatus('idle'); setErrorMsg('') }}
              style={{ fontSize: '13px' }}>
              ↩ Back
            </button>
            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: '13px' }}>
              Upload Image Instead
            </button>
          </div>
        </div>
      )}

      {/* Idle prompt */}
      {status === 'idle' && (
        <div style={{
          textAlign: 'center', padding: '20px',
          background: 'rgba(0,217,255,0.04)', borderRadius: '12px',
          border: '1px dashed rgba(0,217,255,0.15)'
        }}>
          <div style={{ marginBottom: '8px' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></div>
          <div style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.6 }}>
            <strong style={{ color: '#e2e8f0' }}>Open Camera</strong> to scan live QR<br />
            or <strong style={{ color: '#e2e8f0' }}>Upload QR Image</strong> to scan from a photo
          </div>
        </div>
      )}

      <style>{`
        @keyframes qrPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.92); }
        }
      `}</style>
    </div>
  )
}

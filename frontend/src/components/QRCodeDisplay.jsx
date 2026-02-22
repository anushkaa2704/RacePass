/**
 * QRCodeDisplay.jsx — Real scannable QR code using qrcode.react
 * Replaces the old fake SVG QR pattern with a real, camera-scannable QR code.
 */

import { QRCodeSVG } from 'qrcode.react'

export default function QRCodeDisplay({ value, size = 200, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{
        background: '#ffffff',
        padding: '16px',
        borderRadius: '16px',
        display: 'inline-flex',
        boxShadow: '0 0 30px rgba(0, 255, 136, 0.15)',
        border: '2px solid rgba(0, 255, 136, 0.2)'
      }}>
        <QRCodeSVG
          value={value}
          size={size}
          bgColor="#ffffff"
          fgColor="#0a0a14"
          level="H"
          includeMargin={false}
          imageSettings={{
            src: '',
            height: 0,
            width: 0,
            excavate: false,
          }}
        />
      </div>
      {label && (
        <div style={{
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#00ff88',
          background: 'rgba(0,0,0,0.3)',
          padding: '8px 16px',
          borderRadius: '8px',
          wordBreak: 'break-all',
          textAlign: 'center',
          maxWidth: `${size + 32}px`
        }}>
          {label}
        </div>
      )}
    </div>
  )
}

/**
 * ConcertPage.jsx - Third-Party Event Demo
 *
 * Showcases multiple event types with different age requirements.
 * 3D animated event cards with perspective transforms and tilt effects.
 * The event website NEVER sees personal data.
 */

import { useState } from 'react'
import { verifyForThirdParty } from '../utils/api'

const EVENTS = [
  {
    id: 'concert',
    name: 'Electric Dreams Festival 2025',
    emoji: '🎸',
    tagline: 'The biggest music event of the year!',
    minAge: 18,
    gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)',
    ticketLabel: 'VIP TICKET',
    shadowColor: 'rgba(255, 107, 107, 0.3)'
  },
  {
    id: 'bar',
    name: 'Skyline Sports Bar',
    emoji: '🍺',
    tagline: 'Watch the finals with a cold one.',
    minAge: 21,
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    ticketLabel: 'ENTRY PASS',
    shadowColor: 'rgba(99, 102, 241, 0.3)'
  },
  {
    id: 'gallery',
    name: 'Modern Art Exhibition',
    emoji: '🎨',
    tagline: 'Open to all art lovers.',
    minAge: 0,
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    ticketLabel: 'GALLERY PASS',
    shadowColor: 'rgba(6, 182, 212, 0.3)'
  }
]

function EventCard3D({ event, index, onClick }) {
  return (
    <div
      className="card event-card"
      style={{
        width: '270px',
        textAlign: 'center',
        cursor: 'pointer',
        animationDelay: `${0.1 * index}s`
      }}
      onClick={onClick}
    >
      <div style={{ fontSize: '48px', marginBottom: '10px' }}>{event.emoji}</div>
      <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>{event.name}</h3>
      <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '15px' }}>{event.tagline}</p>
      <div className={`status-badge ${event.minAge > 0 ? 'status-pending' : 'status-verified'}`}
        style={{ fontSize: '12px' }}>
        {event.minAge > 0 ? `${event.minAge}+ Only` : 'All Ages'}
      </div>
      <button className="btn btn-primary" style={{ width: '100%', marginTop: '15px', fontSize: '14px' }}>
        🧪 Verify & Enter
      </button>
    </div>
  )
}

function ConcertPage({ isWalletConnected, walletAddress, onConnectWallet, selectedNetwork }) {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [status, setStatus] = useState(null)
  const [fingerprint, setFingerprint] = useState(null)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')

  async function handleVerify(event) {
    setSelectedEvent(event)

    if (!isWalletConnected) {
      onConnectWallet()
      return
    }

    setStatus('checking')
    setError('')
    setFingerprint(null)
    setReason('')

    try {
      const result = await verifyForThirdParty(
        walletAddress,
        selectedNetwork || 'ethereum',
        event.minAge,
        event.id
      )

      if (result.verified) {
        setFingerprint(result.fingerprint || null)
        setStatus('verified')
      } else if (result.reason === 'age_restricted') {
        setReason(result.message || `You must be ${event.minAge}+ for this event.`)
        setStatus('age-blocked')
      } else if (result.reason === 'expired') {
        setReason('Your RacePass has expired. Please renew it.')
        setStatus('not-verified')
      } else {
        setStatus('not-verified')
      }
    } catch (err) {
      setError(err.message || 'Verification failed.')
      setStatus('not-verified')
    }
  }

  function handleBack() {
    setStatus(null)
    setSelectedEvent(null)
    setFingerprint(null)
    setError('')
    setReason('')
  }

  // ── Event selector (initial view) ──
  if (!status) {
    return (
      <div>
        <div className="concert-header" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' }}>
          <h1 className="concert-title">🎪 Event Marketplace</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)' }}>Choose an event to test RacePass age-gated verification</p>
        </div>

        <div className="page-center" style={{ minHeight: 'calc(100vh - 300px)' }}>
          <div style={{
            display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center',
            maxWidth: '920px'
          }}>
            {EVENTS.map((event, i) => (
              <EventCard3D
                key={event.id}
                event={event}
                index={i}
                onClick={() => handleVerify(event)}
              />
            ))}
          </div>

          {/* How it works */}
          <div className="card glass-card" style={{
            maxWidth: '720px', width: '100%', marginTop: '30px',
            animation: 'fadeUp 0.5s 0.2s both'
          }}>
            <h3 style={{ color: '#00d9ff', marginBottom: '15px' }}>How It Works</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#94a3b8' }}>
              {[
                { step: 1, text: 'Connect your wallet' },
                { step: 2, text: 'We check your RacePass credential' },
                { step: 3, text: 'Access granted or denied instantly' }
              ].map(s => (
                <div key={s.step} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{
                    background: 'linear-gradient(135deg, #00d9ff, #6366f1)', color: '#0a0a14',
                    borderRadius: '50%', width: '32px', height: '32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', flexShrink: 0
                  }}>{s.step}</span>
                  <span>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Result views ──
  const event = selectedEvent || EVENTS[0]

  return (
    <div>
      <div className="concert-header" style={{ background: event.gradient }}>
        <h1 className="concert-title">{event.emoji} {event.name}</h1>
        <p style={{ color: 'rgba(255,255,255,0.9)' }}>{event.tagline}</p>
      </div>

      <div className="page-center" style={{ minHeight: 'calc(100vh - 300px)' }}>
        <div className="card glass-card" style={{
          maxWidth: '500px', width: '100%', textAlign: 'center',
          animation: 'emerge3D 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>

          {/* Checking */}
          {status === 'checking' && (
            <>
              <div className="spinner" style={{ margin: '40px auto' }}></div>
              <h2 style={{ color: '#00d9ff' }}>Verifying...</h2>
              <p style={{ color: '#94a3b8', marginTop: '10px' }}>Checking your RacePass {event.minAge > 0 ? `(${event.minAge}+ required)` : ''}</p>
            </>
          )}

          {/* Verified */}
          {status === 'verified' && (
            <>
              <div style={{ fontSize: '80px', marginBottom: '10px', animation: 'bounceIn3D 0.8s' }}>🎉</div>
              <h2 style={{ color: '#00ff88' }}>Access Granted!</h2>

              <div className="ticket-card-3d" style={{
                background: event.gradient,
                borderRadius: '16px',
                padding: '24px',
                color: 'white',
                margin: '20px 0',
                overflow: 'hidden',
                cursor: 'default'
              }}>
                <div style={{ position: 'absolute', top: '8px', right: '12px', fontSize: '10px', opacity: 0.7 }}>
                  {event.minAge > 0 ? `${event.minAge}+ ✓` : 'All Ages'}
                </div>
                <div style={{ fontSize: '28px', marginBottom: '10px', animation: 'floatY 4s ease-in-out infinite' }}>🎫 {event.ticketLabel}</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{event.name}</div>
                <div style={{ fontSize: '14px', marginTop: '10px', opacity: 0.9, fontFamily: 'monospace' }}>
                  {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
                </div>
              </div>

              {fingerprint && (
                <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '5px' }}>Verified Fingerprint:</div>
                  <div className="fingerprint" style={{ fontSize: '10px' }}>{fingerprint}</div>
                </div>
              )}

              <div className="alert alert-success">
                🔒 Your identity was verified without sharing any personal data.
              </div>

              <button className="btn btn-secondary" onClick={handleBack} style={{ marginTop: '15px' }}>← Back to Events</button>
            </>
          )}

          {/* Age Blocked */}
          {status === 'age-blocked' && (
            <>
              <div style={{ fontSize: '80px', marginBottom: '10px', animation: 'bounceIn 0.6s' }}>🚫</div>
              <h2 style={{ color: '#ffc107' }}>Age Restricted</h2>
              <p style={{ color: '#94a3b8', margin: '15px 0' }}>{reason}</p>

              <div className="alert" style={{ background: 'rgba(255,193,7,0.1)', border: '1px solid #ffc107', color: '#ffc107' }}>
                Your identity IS verified, but this event requires age {event.minAge}+. Your RacePass indicates you don't meet the requirement. No personal data was exposed.
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                <button className="btn btn-secondary" onClick={handleBack}>← Back to Events</button>
              </div>
            </>
          )}

          {/* Not Verified */}
          {status === 'not-verified' && (
            <>
              <div style={{ fontSize: '80px', marginBottom: '10px', animation: 'bounceIn 0.6s' }}>❌</div>
              <h2 style={{ color: '#ff5252' }}>Not Verified</h2>
              <p style={{ color: '#94a3b8', margin: '15px 0' }}>
                {reason || 'Your wallet is not verified yet.'}
              </p>

              {error && <div className="alert alert-error">{error}</div>}

              <div style={{
                background: 'rgba(255, 82, 82, 0.08)',
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '20px',
                textAlign: 'left',
                border: '1px solid rgba(255, 82, 82, 0.15)'
              }}>
                <div style={{ color: '#ff5252', fontWeight: 'bold', marginBottom: '10px' }}>To get access:</div>
                <ol style={{ paddingLeft: '20px', color: '#94a3b8', fontSize: '14px' }}>
                  <li>Go to RacePass Signup and complete KYC</li>
                  <li>Come back here and try again</li>
                </ol>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => window.location.href = '/signup'}>Get RacePass</button>
                <button className="btn btn-secondary" onClick={handleBack}>← Back</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConcertPage

/**
 * DashboardPage.jsx - User Dashboard
 *
 * Features:
 * - RacePass Active/Not Active status with 3D animated icon
 * - Privacy Score meter
 * - Credential expiry countdown
 * - Activity / audit log
 * - Revoke credential button
 * - Age category display
 * - 3D card animations, perspective transforms
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  checkVerificationStatus, revokeCredential,
  getActivityLog as fetchActivityLog,
  getReputation
} from '../utils/api'

/** Animated counter that counts up from 0 to target */
function AnimatedNumber({ target, duration = 1000, suffix = '' }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (target === 0) { setDisplay(0); return }
    const start = performance.now()
    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])

  return <>{display}{suffix}</>
}

function DashboardPage({
  isWalletConnected,
  walletAddress,
  isVerified,
  setIsVerified,
  selectedNetwork,
  setSelectedNetwork
}) {
  const [issuedAt, setIssuedAt] = useState(null)
  const [expiresAt, setExpiresAt] = useState(null)
  const [isAdult, setIsAdult] = useState(null)
  const [ageCategory, setAgeCategory] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)

  const [activities, setActivities] = useState([])
  const [revoking, setRevoking] = useState(false)
  const [revokeConfirm, setRevokeConfirm] = useState(false)
  const [countdown, setCountdown] = useState('')

  // V2 crypto state
  const [onChainDetails, setOnChainDetails] = useState(null)
  const [reputation, setReputation] = useState(null)
  const [revoked, setRevoked] = useState(false)

  // 3D tilt removed for performance

  const loadData = useCallback(async () => {
    if (!walletAddress) return
    setIsLoading(true)
    setError('')
    try {
      const result = await checkVerificationStatus(walletAddress)
      if (result.expired) {
        setExpired(true)
        setIsVerified(false)
      } else if (result.isVerifiedOnAny) {
        setIsVerified(true)
        setIssuedAt(result.issuedAt || null)
        setExpiresAt(result.expiresAt || null)
        setIsAdult(result.isAdult)
        setAgeCategory(result.ageCategory || null)
        setExpired(false)
        // V2 fields
        setOnChainDetails(result.onChainDetails || null)
        setRevoked(result.revoked || false)
        if (result.reputation) {
          setReputation(result.reputation)
        }
      } else {
        setIsVerified(false)
        setRevoked(result.revoked || false)
      }

      // Fetch reputation                                                                                                   
      try {
        const repRes = await getReputation(walletAddress)
        if (repRes.success && repRes.reputation) {
          setReputation(repRes.reputation)
        }
      } catch { /* reputation not critical */ }

      try {
        const logRes = await fetchActivityLog(walletAddress)
        setActivities(logRes.activities || [])
      } catch { /* ignore if no log */ }
    } catch (err) {
      setError('Could not connect to backend. Make sure it is running on port 3001.')
      setIsVerified(false)
    }
    setIsLoading(false)
  }, [walletAddress, setIsVerified])

  useEffect(() => {
    if (isWalletConnected && walletAddress) {
      loadData()
    } else {
      setIsLoading(false)
    }
  }, [isWalletConnected, walletAddress, loadData])

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return
    function update() {
      const diff = new Date(expiresAt) - new Date()
      if (diff <= 0) {
        setCountdown('Expired')
        setExpired(true)
        return
      }
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      setCountdown(`${days}d ${hours}h ${mins}m`)
    }
    update()
    const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [expiresAt])

  async function handleRevoke() {
    setRevoking(true)
    setError('')
    try {
      await revokeCredential(walletAddress)
      setIsVerified(false)
      setRevokeConfirm(false)
      await loadData()
    } catch (err) {
      setError(err.message)
    }
    setRevoking(false)
  }

  if (!isWalletConnected) {
    return (
      <div className="page-center">
        <div className="dashboard" style={{ animation: 'emerge3D 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <div className="dashboard-icon" style={{ background: '#555' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
          <h1 className="dashboard-title">Connect Your Wallet</h1>
          <p className="dashboard-subtitle">Connect MetaMask to view your dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-center">
      {/* ── Status Card ── */}
      <div className="dashboard">
        <div
          className="dashboard-icon glow-ring"
          style={{
            background: isVerified
              ? 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)'
              : expired
                ? 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)'
                : 'linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)'
          }}
        >
          {isLoading ? '...' : isVerified ? '✓' : expired ? '!' : '✕'}
        </div>

        <h1 className="dashboard-title">
          {isLoading ? 'Checking...' : isVerified ? 'RacePass Active' : expired ? 'RacePass Expired' : 'RacePass Not Active'}
        </h1>

        <p className="dashboard-subtitle">
          {isLoading ? 'Checking status...'
            : isVerified ? 'Identity verified'
            : expired ? 'Credential expired. Please re-register.'
            : 'Complete KYC to activate.'}
        </p>

        {!isLoading && (
          <div className={`status-badge ${isVerified ? 'status-verified' : expired ? 'status-pending' : 'status-not-verified'}`}
>
            {isVerified ? '● Verified' : expired ? '● Expired' : '○ Not Verified'}
          </div>
        )}
        {isLoading && <div className="spinner" style={{ margin: '20px auto' }}></div>}
      </div>

      {/* ── Verification Shield ── */}
      {isVerified && (
        <div className="card glass-card" style={{
          maxWidth: '600px', width: '100%', marginTop: '20px',
          animation: 'slideUp3D 0.5s 0.1s both', overflow: 'hidden', position: 'relative'
        }}>
          {/* Animated background glow */}
          <div style={{
            position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
            background: 'radial-gradient(circle at 50% 50%, rgba(0,255,136,0.04) 0%, transparent 50%)',
            animation: 'rotate360 12s linear infinite', pointerEvents: 'none'
          }} />

          <div style={{ position: 'relative', textAlign: 'center', padding: '20px 0' }}>
            {/* Central Shield SVG */}
            <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 20px' }}>
              {/* Outer rotating ring */}
              <svg width="140" height="140" viewBox="0 0 140 140" style={{ position: 'absolute', animation: 'rotate360 8s linear infinite' }}>
                <circle cx="70" cy="70" r="66" fill="none" stroke="rgba(0,255,136,0.08)" strokeWidth="1" strokeDasharray="8 4" />
              </svg>
              {/* Middle pulsing ring */}
              <svg width="140" height="140" viewBox="0 0 140 140" style={{ position: 'absolute', animation: 'pulse 3s ease-in-out infinite' }}>
                <circle cx="70" cy="70" r="56" fill="none" stroke="rgba(0,255,136,0.15)" strokeWidth="2" />
              </svg>
              {/* Inner glow ring */}
              <svg width="140" height="140" viewBox="0 0 140 140" style={{ position: 'absolute' }}>
                <circle cx="70" cy="70" r="46" fill="rgba(0,255,136,0.03)" stroke="rgba(0,255,136,0.25)" strokeWidth="2" />
              </svg>
              {/* Shield icon */}
              <svg width="140" height="140" viewBox="0 0 140 140" style={{ position: 'absolute' }}>
                <g transform="translate(46, 38)">
                  <path d="M24 0L48 12v18c0 16.5-9 31.5-24 36C8.9 61.5 0 46.5 0 30V12L24 0z" fill="rgba(0,255,136,0.12)" stroke="#00ff88" strokeWidth="2" />
                  <polyline points="16 32 22 38 34 26" fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              </svg>
            </div>

            <h3 style={{ color: '#e2e8f0', fontSize: '18px', margin: '0 0 4px' }}>Identity Verified</h3>
            <div style={{ color: '#64748b', fontSize: '13px' }}>
              Protected by zero-knowledge cryptography
            </div>

            {/* Verification layers */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
              {[
                { label: 'Identity', active: true },
                { label: 'On-Chain', active: !!onChainDetails },
                { label: 'Reputation', active: !!reputation },
                { label: 'Privacy', active: true }
              ].map((layer, i) => (
                <div key={i} style={{
                  padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  background: layer.active ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${layer.active ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  color: layer.active ? '#00ff88' : '#475569',
                  animation: `fadeInUp3D 0.4s ${0.1 * i + 0.3}s both`
                }}>
                  {layer.active && <span style={{ marginRight: 4 }}>●</span>}
                  {layer.label}
                </div>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px',
            background: 'rgba(255,255,255,0.04)', borderRadius: '12px', overflow: 'hidden', marginTop: '8px'
          }}>
            <div style={{ background: '#0a0a0a', padding: '16px', textAlign: 'center' }}>
              <div style={{ color: '#00ff88', fontSize: '22px', fontWeight: 700 }}>
                {countdown ? countdown.split(' ')[0] : '—'}
              </div>
              <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>Days Left</div>
            </div>
            <div style={{ background: '#0a0a0a', padding: '16px', textAlign: 'center' }}>
              <div style={{ color: '#00ff88', fontSize: '22px', fontWeight: 700 }}>
                <AnimatedNumber target={reputation?.score || 50} />
              </div>
              <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>Trust Score</div>
            </div>
            <div style={{ background: '#0a0a0a', padding: '16px', textAlign: 'center' }}>
              <div style={{ color: '#00ff88', fontSize: '22px', fontWeight: 700 }}>
                <AnimatedNumber target={reputation?.attendance || 0} />
              </div>
              <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>Events</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Trust Metrics ── */}
      {isVerified && reputation && (
        <div className="card glass-card" style={{
          maxWidth: '600px', width: '100%', marginTop: '20px',
          animation: 'slideUp3D 0.5s 0.15s both'
        }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            Trust Metrics
          </h3>

          {/* Circular gauge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', padding: '12px 0' }}>
            <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none" stroke="#00ff88" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(reputation.score || 50) * 3.27} 327`}
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dasharray 2s cubic-bezier(0.16, 1, 0.3, 1)', filter: 'drop-shadow(0 0 6px rgba(0,255,136,0.4))' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ color: '#e2e8f0', fontSize: '28px', fontWeight: 700, lineHeight: 1 }}>
                  <AnimatedNumber target={reputation.score || 50} />
                </div>
                <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Score</div>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Attendance', value: reputation.attendance || 0, max: 20 },
                { label: 'Verification', value: 100, max: 100 },
                { label: 'Consistency', value: Math.min((reputation.attendance || 0) * 20, 100), max: 100 }
              ].map((m, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>{m.label}</span>
                    <span style={{ color: '#00ff88', fontSize: '12px', fontWeight: 600 }}>
                      {m.label === 'Attendance' ? m.value : `${m.value}%`}
                    </span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(m.value / m.max) * 100}%`, height: '100%',
                      background: 'linear-gradient(90deg, #00cc66, #00ff88)',
                      borderRadius: '4px',
                      transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: '0 0 8px rgba(0,255,136,0.3)'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tier badge */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            marginTop: '8px', padding: '12px', borderRadius: '12px',
            background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)'
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: (reputation.tier || 'Bronze') === 'Gold' ? 'rgba(255,193,7,0.15)'
                : (reputation.tier || 'Bronze') === 'Silver' ? 'rgba(148,163,184,0.15)' : 'rgba(205,127,50,0.15)',
              border: `1px solid ${(reputation.tier || 'Bronze') === 'Gold' ? 'rgba(255,193,7,0.3)'
                : (reputation.tier || 'Bronze') === 'Silver' ? 'rgba(148,163,184,0.3)' : 'rgba(205,127,50,0.3)'}`
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={
                (reputation.tier || 'Bronze') === 'Gold' ? '#ffc107'
                : (reputation.tier || 'Bronze') === 'Silver' ? '#94a3b8' : '#cd7f32'
              }><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div>
              <div style={{
                color: (reputation.tier || 'Bronze') === 'Gold' ? '#ffc107'
                  : (reputation.tier || 'Bronze') === 'Silver' ? '#94a3b8' : '#cd7f32',
                fontSize: '15px', fontWeight: 700
              }}>{reputation.tier || 'Bronze'} Tier</div>
              <div style={{ color: '#475569', fontSize: '11px' }}>
                {(reputation.tier || 'Bronze') === 'Gold' ? 'Top-tier verified user' : (reputation.tier || 'Bronze') === 'Silver' ? 'Consistently trusted' : 'Getting started'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Privacy Architecture ── */}
      {isVerified && (
        <div className="card glass-card" style={{
          maxWidth: '600px', width: '100%', marginTop: '20px',
          animation: 'slideUp3D 0.5s 0.2s both'
        }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Privacy Architecture
          </h3>

          {/* ZK Stack visualization */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '16px' }}>
            {[
              { label: 'Application Layer', desc: 'Events, tickets, attendance — no PII exposed', pct: 100 },
              { label: 'Zero-Knowledge Proofs', desc: 'Boolean claims verified without data revelation', pct: 85 },
              { label: 'Cryptographic Attestations', desc: 'ECDSA signed identity claims', pct: 70 },
              { label: 'Blockchain Anchoring', desc: 'Tamper-proof verification on Ethereum & Polygon', pct: 55 }
            ].map((layer, i) => (
              <div key={i} style={{
                padding: '14px 16px', position: 'relative', overflow: 'hidden',
                borderRadius: i === 0 ? '12px 12px 2px 2px' : i === 3 ? '2px 2px 12px 12px' : '2px',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(0,255,136,0.06)',
                animation: `fadeInUp3D 0.4s ${0.1 * i + 0.3}s both`
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${layer.pct}%`,
                  background: `linear-gradient(90deg, rgba(0,255,136,${0.03 + i * 0.01}), transparent)`,
                  transition: 'width 1.5s ease'
                }} />
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 600 }}>{layer.label}</div>
                    <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>{layer.desc}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* Privacy score */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '14px', borderRadius: '12px',
            background: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.1)'
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,255,136,0.08)', border: '2px solid rgba(0,255,136,0.25)'
            }}>
              <span style={{ color: '#00ff88', fontSize: '18px', fontWeight: 700 }}>
                <AnimatedNumber target={100} suffix="%" />
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>Full Privacy Protection</div>
              <div style={{ color: '#64748b', fontSize: '12px' }}>Your data is never shared — only boolean proofs leave the system</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Activity Log ── */}
      {activities.length > 0 && (
        <div className="card glass-card" style={{
          maxWidth: '600px', width: '100%', marginTop: '20px',
          animation: 'slideUp3D 0.5s 0.3s both'
        }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Activity Log</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {activities.slice().reverse().map((a, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                fontSize: '13px',
                animation: `fadeIn 0.3s ${0.05 * i}s both`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', background: a.action === 'AGE_GATE_BLOCKED' ? '#ff5252' : a.action === 'CREDENTIAL_REVOKED' ? '#ff9800' : '#00ff88' }} />
                  <span style={{ color: '#ccc' }}>
                    {a.action.replace(/_/g, ' ')}
                    {a.eventType ? ` (${a.eventType})` : ''}
                  </span>
                </div>
                <span style={{ color: '#64748b', fontSize: '12px' }}>
                  {new Date(a.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Wallet Info ── */}
      <div className="card glass-card" style={{ maxWidth: '600px', width: '100%', marginTop: '20px', animation: 'slideUp3D 0.5s 0.4s both' }}>
        <h3 className="card-title">Wallet</h3>
        <div style={{ color: '#00ff88', fontSize: '14px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
          {walletAddress}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="alert alert-error" style={{ maxWidth: '600px', width: '100%', marginTop: '20px' }}>
          {error}
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '25px', flexWrap: 'wrap', justifyContent: 'center', animation: 'fadeInUp3D 0.5s 0.5s both' }}>
        {!isVerified && !isLoading && (
          <Link to="/signup" className="btn btn-primary btn-glow">Complete KYC</Link>
        )}
        {isVerified && (
          <Link to="/concert" className="btn btn-primary">Try Event Demo</Link>
        )}
        <button className="btn btn-secondary" onClick={loadData} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* ── Revoke ── */}
      {isVerified && (
        <div style={{ marginTop: '30px', textAlign: 'center', animation: 'fadeIn 0.5s 0.6s both' }}>
          {!revokeConfirm ? (
            <button
              className="btn"
              style={{ background: 'transparent', border: '1px solid #ff5252', color: '#ff5252', fontSize: '13px' }}
              onClick={() => setRevokeConfirm(true)}
            >
              Revoke My RacePass
            </button>
          ) : (
            <div className="card glass-card" style={{
              maxWidth: '400px', margin: '0 auto', border: '1px solid #ff5252',
              animation: 'emerge3D 0.4s'
            }}>
              <p style={{ color: '#ff5252', fontWeight: 'bold', marginBottom: '10px' }}>Are you sure?</p>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '15px' }}>
                This will delete your RacePass. You can re-register later.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  className="btn"
                  style={{ background: '#ff5252', color: 'white', fontSize: '13px' }}
                  onClick={handleRevoke}
                  disabled={revoking}
                >
                  {revoking ? 'Revoking...' : 'Yes, Revoke'}
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '13px' }}
                  onClick={() => setRevokeConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DashboardPage

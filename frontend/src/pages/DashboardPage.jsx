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
import { checkVerificationStatus, revokeCredential, getActivityLog as fetchActivityLog } from '../utils/api'

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
  const [fingerprint, setFingerprint] = useState(null)
  const [credentialId, setCredentialId] = useState(null)
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
        setFingerprint(result.fingerprint || null)
        setCredentialId(result.credentialId || null)
        setIssuedAt(result.issuedAt || null)
        setExpiresAt(result.expiresAt || null)
        setIsAdult(result.isAdult)
        setAgeCategory(result.ageCategory || null)
        setExpired(false)
      } else {
        setIsVerified(false)
        setFingerprint(null)
      }

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
      setFingerprint(null)
      setCredentialId(null)
      setRevokeConfirm(false)
      await loadData()
    } catch (err) {
      setError(err.message)
    }
    setRevoking(false)
  }

  const privacyScore = isVerified ? 100 : 0
  const privacyItems = [
    { label: 'Your data stays private', ok: true },
    { label: 'Verified on blockchain', ok: true },
    { label: 'No personal info shared with events', ok: true },
    { label: 'Revoke anytime — full control', ok: true }
  ]

  if (!isWalletConnected) {
    return (
      <div className="page-center">
        <div className="dashboard" style={{ animation: 'emerge3D 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <div className="dashboard-icon" style={{ background: '#555' }}>🔒</div>
          <h1 className="dashboard-title">Connect Your Wallet</h1>
          <p className="dashboard-subtitle">Please connect MetaMask to view your dashboard.</p>
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
          {isLoading ? '⏳' : isVerified ? '✓' : expired ? '⏰' : '✕'}
        </div>

        <h1 className="dashboard-title">
          {isLoading ? 'Checking...' : isVerified ? 'RacePass Active' : expired ? 'RacePass Expired' : 'RacePass Not Active'}
        </h1>

        <p className="dashboard-subtitle">
          {isLoading ? 'Checking your verification status...'
            : isVerified ? 'Your identity is verified!'
            : expired ? 'Your credential has expired. Please re-register.'
            : 'Complete KYC to activate your RacePass.'}
        </p>

        {!isLoading && (
          <div className={`status-badge ${isVerified ? 'status-verified' : expired ? 'status-pending' : 'status-not-verified'}`}
>
            {isVerified ? '● Verified' : expired ? '⏰ Expired' : '○ Not Verified'}
          </div>
        )}
        {isLoading && <div className="spinner" style={{ margin: '20px auto' }}></div>}
      </div>

      {/* ── Credential Details ── */}
      {isVerified && (
        <div className="card glass-card" style={{
          maxWidth: '600px', width: '100%', marginTop: '20px',
          animation: 'slideUp3D 0.5s 0.1s both'
        }}>
          <h3 className="card-title">Credential Details</h3>

          <div className="grid-2" style={{ gap: '15px', marginBottom: '15px' }}>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Age Status</div>
              <div className={`status-badge ${isAdult ? 'status-verified' : 'status-pending'}`} style={{ fontSize: '13px' }}>
                {ageCategory === '21+' ? '🟢 21+' : isAdult ? '🟢 18+' : '🟡 Under 18'}
              </div>
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Expires In</div>
              <div style={{ color: '#00d9ff', fontSize: '16px', fontWeight: 'bold' }}>
                ⏱️ {countdown || '...'}
              </div>
            </div>
          </div>

          {credentialId && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Credential ID</div>
              <div style={{ color: '#00d9ff', fontSize: '13px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {credentialId}
              </div>
            </div>
          )}

          {fingerprint && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Fingerprint (SHA-256)</div>
              <div className="fingerprint">{fingerprint}</div>
            </div>
          )}

          {issuedAt && (
            <div>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Issued At</div>
              <div style={{ color: '#ccc', fontSize: '14px' }}>{new Date(issuedAt).toLocaleString()}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Privacy Score ── */}
      {isVerified && (
        <div className="card glass-card" style={{
          maxWidth: '600px', width: '100%', marginTop: '20px',
          animation: 'slideUp3D 0.5s 0.2s both'
        }}>
          <h3 className="card-title">🛡️ Privacy Score</h3>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>Data Protection Level</span>
              <span style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '20px' }}>
                <AnimatedNumber target={privacyScore} suffix="%" />
              </span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '10px', height: '14px', overflow: 'hidden', position: 'relative' }}>
              <div style={{
                width: `${privacyScore}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #00ff88, #00d9ff)',
                borderRadius: '10px',
                transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 0 15px rgba(0, 255, 136, 0.3)'
              }}></div>
            </div>
          </div>

          {privacyItems.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', fontSize: '14px',
              animation: `fadeInUp3D 0.4s ${0.1 * i}s both`
            }}>
              <span style={{ color: '#00ff88', fontSize: '16px' }}>✓</span>
              <span style={{ color: '#ccc' }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Activity Log ── */}
      {activities.length > 0 && (
        <div className="card glass-card" style={{
          maxWidth: '600px', width: '100%', marginTop: '20px',
          animation: 'slideUp3D 0.5s 0.3s both'
        }}>
          <h3 className="card-title">📋 Activity Log</h3>
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
                  <span>{
                    a.action === 'KYC_SUBMITTED' ? '📝' :
                    a.action === 'THIRD_PARTY_VERIFIED' ? '✅' :
                    a.action === 'AGE_GATE_BLOCKED' ? '🚫' :
                    a.action === 'CREDENTIAL_REVOKED' ? '🗑️' : '📌'
                  }</span>
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
        <div style={{ color: '#00d9ff', fontSize: '14px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
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
          <Link to="/concert" className="btn btn-primary">🎸 Try Event Demo</Link>
        )}
        <button className="btn btn-secondary" onClick={loadData} disabled={isLoading}>
          {isLoading ? 'Loading...' : '🔄 Refresh'}
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
              🗑️ Revoke My RacePass
            </button>
          ) : (
            <div className="card glass-card" style={{
              maxWidth: '400px', margin: '0 auto', border: '1px solid #ff5252',
              animation: 'emerge3D 0.4s'
            }}>
              <p style={{ color: '#ff5252', fontWeight: 'bold', marginBottom: '10px' }}>Are you sure?</p>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '15px' }}>
                This will permanently delete your RacePass. You will lose access to all events.
                You can re-register later.
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

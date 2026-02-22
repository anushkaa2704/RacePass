/**
 * ProfilePage.jsx - User Profile
 *
 * Shows:
 * - Wallet address & verification status
 * - Credential/Token ID with Sepolia etherscan link
 * - Age category, issuance & expiry dates
 * - Events the user has registered for (from activity log)
 * - Activity timeline
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getCredential, getActivityLog, checkVerificationStatus } from '../utils/api'

const SEPOLIA_EXPLORER = 'https://sepolia.etherscan.io'

function ProfilePage({ isWalletConnected, walletAddress, isVerified }) {
  const [credential, setCredential] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProfile = useCallback(async () => {
    if (!walletAddress) return
    setLoading(true)
    setError('')

    try {
      // Fetch credential and activity data in parallel
      const [credRes, actRes] = await Promise.all([
        getCredential(walletAddress).catch(() => null),
        getActivityLog(walletAddress).catch(() => ({ activities: [] }))
      ])

      if (credRes?.data) setCredential(credRes.data)
      setActivities(actRes?.activities || [])
    } catch (err) {
      setError('Could not load profile data. Make sure the backend is running.')
    }
    setLoading(false)
  }, [walletAddress])

  useEffect(() => {
    if (isWalletConnected && walletAddress) {
      loadProfile()
    } else {
      setLoading(false)
    }
  }, [isWalletConnected, walletAddress, loadProfile])

  // Derive registered events from activity log
  const registeredEvents = activities
    .filter(a => a.action === 'THIRD_PARTY_VERIFIED')
    .map(a => ({
      eventType: a.eventType || 'general',
      timestamp: a.timestamp,
      minAge: a.minAge,
      userAge: a.userAge,
      movieName: a.movieName,
      siteName: a.siteName,
      status: 'confirmed'
    }))

  // Derive blocked (denied) attempts from activity log
  const blockedAttempts = activities
    .filter(a => a.action === 'AGE_GATE_BLOCKED')
    .map(a => ({
      eventType: a.eventType || 'general',
      timestamp: a.timestamp,
      minAge: a.minAge,
      userAge: a.userAge,
      movieName: a.movieName,
      siteName: a.siteName,
      message: a.message,
      status: 'denied'
    }))

  // Combined booking history — both confirmed and denied, sorted newest first
  const bookingHistory = [...registeredEvents, ...blockedAttempts]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  // Get blockchain tx hashes
  const txHashes = []
  if (credential?.blockchainResults) {
    const br = credential.blockchainResults
    if (br.ethereum?.transactionHash) {
      txHashes.push({ chain: 'Ethereum Sepolia', hash: br.ethereum.transactionHash, block: br.ethereum.blockNumber })
    }
    if (br.polygon?.transactionHash) {
      txHashes.push({ chain: 'Polygon Amoy', hash: br.polygon.transactionHash, block: br.polygon.blockNumber })
    }
  }

  const eventDisplayNames = {
    concert: 'Electric Dreams Festival 2025',
    bar: 'Skyline Sports Bar',
    gallery: 'Modern Art Exhibition',
    general: 'General Event'
  }

  if (!isWalletConnected) {
    return (
      <div className="page-center">
        <div className="dashboard" style={{ animation: 'fadeUp 0.5s ease' }}>
          <div className="dashboard-icon" style={{ background: '#555' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
          <h1 className="dashboard-title">Connect Your Wallet</h1>
          <p className="dashboard-subtitle">Connect MetaMask to view your profile.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page-center">
        <div className="dashboard" style={{ animation: 'fadeUp 0.5s ease' }}>
          <div className="spinner" style={{ margin: '40px auto' }}></div>
          <h2 style={{ color: '#00ff88' }}>Loading Profile...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="page-center">
      {/* Profile Header */}
      <div className="dashboard" style={{ animation: 'fadeUp 0.5s ease' }}>
        <div
          className="dashboard-icon"
          style={{
            background: isVerified
              ? 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)'
              : 'linear-gradient(135deg, #2a2a3a 0%, #3a3a4a 100%)'
          }}
        >
          {isVerified ? '✓' : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
        </div>

        <h1 className="dashboard-title">My Profile</h1>

        <div className={`status-badge ${isVerified ? 'status-verified' : 'status-pending'}`}>
          {isVerified ? '● Verified' : 'Pending Verification'}
        </div>

        {!isVerified && (
          <div style={{ marginTop: '16px' }}>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>
              Complete KYC to activate your RacePass
            </p>
            <Link to="/signup" className="btn btn-primary" style={{ fontSize: '14px' }}>
              Get Verified →
            </Link>
          </div>
        )}
      </div>

      {/* Wallet Info */}
      <div className="card glass-card" style={{
        maxWidth: '600px', width: '100%', marginTop: '20px',
        animation: 'fadeUp 0.4s 0.1s both'
      }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>Wallet</h3>
        <div style={{ color: '#00ff88', fontSize: '14px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
          {walletAddress}
        </div>
        <a
          href={`${SEPOLIA_EXPLORER}/address/${walletAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#00cc66', fontSize: '13px', marginTop: '8px', display: 'inline-block' }}
        >
          View on Etherscan ↗
        </a>
      </div>

      {/* Credential / Token ID */}
      {credential && (
        <div className="card glass-card" style={{
          maxWidth: '600px', width: '100%', marginTop: '20px',
          animation: 'fadeUp 0.4s 0.15s both'
        }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M2 7h20"/></svg>Credential Details</h3>

          <div style={{ marginBottom: '15px' }}>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Expires</div>
            <div style={{ color: '#00ff88', fontSize: '14px', fontWeight: 'bold' }}>
              {credential.expiresAt ? new Date(credential.expiresAt).toLocaleDateString() : '—'}
            </div>
          </div>

          <div className="grid-2" style={{ gap: '15px' }}>
            {credential.issuanceDate && (
              <div>
                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Issued</div>
                <div style={{ color: '#ccc', fontSize: '13px' }}>{new Date(credential.issuanceDate).toLocaleString()}</div>
              </div>
            )}
            {credential.createdAt && (
              <div>
                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Created</div>
                <div style={{ color: '#ccc', fontSize: '13px' }}>{new Date(credential.createdAt).toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>
      )}



      {/* ══════════ Booking History ══════════ */}
      <div className="card glass-card" style={{
        maxWidth: '600px', width: '100%', marginTop: '20px',
        animation: 'fadeUp 0.4s 0.25s both'
      }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/></svg>Booking History</h3>
        {bookingHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ marginBottom: '10px' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12l5 5L22 2"/><rect x="1" y="3" width="15" height="18" rx="2"/></svg></div>
            <p style={{ color: '#64748b', fontSize: '14px' }}>No booking attempts yet</p>
            <p style={{ color: '#475569', fontSize: '12px', marginTop: '6px' }}>
              Visit events to see your history here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bookingHistory.map((item, i) => {
              const isConfirmed = item.status === 'confirmed'
              return (
                <div key={i} style={{
                  padding: '16px',
                  background: isConfirmed
                    ? 'rgba(0, 255, 136, 0.04)'
                    : 'rgba(255, 107, 107, 0.04)',
                  borderRadius: '12px',
                  border: `1px solid ${isConfirmed
                    ? 'rgba(0, 255, 136, 0.12)'
                    : 'rgba(255, 107, 107, 0.12)'}`,
                }}>
                  {/* Header row: movie name + status badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>
                        {item.movieName || item.eventType || 'Unknown'}
                      </div>
                      {item.siteName && (
                        <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '3px' }}>
                          on {item.siteName}
                        </div>
                      )}
                    </div>
                    <span style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                      whiteSpace: 'nowrap',
                      background: isConfirmed
                        ? 'rgba(0, 255, 136, 0.15)'
                        : 'rgba(255, 107, 107, 0.15)',
                      color: isConfirmed ? '#00ff88' : '#ff6b6b',
                      border: `1px solid ${isConfirmed ? 'rgba(0,255,136,0.25)' : 'rgba(255,107,107,0.25)'}`,
                    }}>
                      {isConfirmed ? 'Booking Confirmed' : 'Booking Denied'}
                    </span>
                  </div>

                  {/* Details row */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', borderRadius: '8px',
                    background: isConfirmed
                      ? 'rgba(0, 255, 136, 0.06)'
                      : 'rgba(255, 107, 107, 0.06)',
                    fontSize: '12px',
                  }}>
                    <div>
                      {item.minAge > 0 ? (
                        <span style={{ color: isConfirmed ? '#00ff88' : '#ff9999' }}>
                          Required: <strong>{item.minAge}+</strong>
                        </span>
                      ) : (
                        <span style={{ color: '#00ff88' }}>Identity verification{isConfirmed ? ' passed' : ' required'}</span>
                      )}
                      {!isConfirmed && item.minAge > 0 && (
                        <div style={{ color: '#ff6b6b', marginTop: '4px', fontSize: '11px' }}>
                          Does not meet the {item.minAge}+ requirement
                        </div>
                      )}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '11px', textAlign: 'right', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                      {new Date(item.timestamp).toLocaleDateString()}
                      <br />
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Activity Timeline — 3D Animated */}
      {activities.length > 0 && (
        <div className="card glass-card" style={{
          maxWidth: '600px', width: '100%', marginTop: '20px',
          animation: 'fadeUp 0.4s 0.3s both'
        }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Activity Timeline
          </h3>
          <div style={{ position: 'relative', padding: '8px 0 8px 32px', maxHeight: '350px', overflowY: 'auto' }}>
            {/* Vertical line */}
            <div style={{
              position: 'absolute', left: '11px', top: 0, bottom: 0, width: '2px',
              background: 'linear-gradient(to bottom, #00ff88 0%, rgba(0,255,136,0.1) 100%)'
            }} />

            {activities.slice().reverse().map((a, i) => {
              const isKYC = a.action === 'KYC_SUBMITTED'
              const isVerified = a.action === 'THIRD_PARTY_VERIFIED'
              const isBlocked = a.action === 'AGE_GATE_BLOCKED'
              const isRevoked = a.action === 'CREDENTIAL_REVOKED'
              const nodeColor = isBlocked ? '#ff5252' : isRevoked ? '#ff9800' : '#00ff88'

              return (
                <div key={i} style={{
                  position: 'relative', marginBottom: '20px',
                  animation: `fadeInUp3D 0.5s ${0.08 * i}s both`,
                  perspective: '600px'
                }}>
                  {/* Node dot */}
                  <div style={{
                    position: 'absolute', left: '-27px', top: '4px',
                    width: '14px', height: '14px', borderRadius: '50%',
                    background: nodeColor,
                    boxShadow: `0 0 12px ${nodeColor}60, 0 0 4px ${nodeColor}40`,
                    border: '2px solid #0a0a0a',
                    animation: i === 0 ? 'pulse 2s ease-in-out infinite' : 'none',
                    zIndex: 2
                  }} />

                  {/* Card */}
                  <div style={{
                    padding: '14px 16px', borderRadius: '12px',
                    background: 'rgba(0,0,0,0.25)',
                    border: `1px solid ${isBlocked ? 'rgba(255,82,82,0.15)' : 'rgba(0,255,136,0.08)'}`,
                    transform: 'translateZ(0)',
                    transition: 'all 0.3s ease',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>
                          {isKYC ? 'KYC Completed' :
                           isVerified ? `Event Verified${a.movieName ? ` — ${a.movieName}` : ''}${a.siteName ? ` on ${a.siteName}` : ''}` :
                           isBlocked ? `Access Denied${a.movieName ? ` — ${a.movieName}` : ''}` :
                           isRevoked ? 'Credential Revoked' :
                           a.action.replace(/_/g, ' ')}
                        </div>
                        {isBlocked && a.minAge && (
                          <div style={{ color: '#ff9999', fontSize: '11px' }}>
                            Required: {a.minAge}+
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontSize: '10px', color: '#475569', whiteSpace: 'nowrap',
                        padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)'
                      }}>
                        {new Date(a.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-error" style={{ maxWidth: '600px', width: '100%', marginTop: '20px' }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '25px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {isVerified && (
          <Link to="/marketplace" className="btn btn-primary">Browse Events</Link>
        )}
        <Link to="/dashboard" className="btn btn-secondary">Dashboard</Link>
        <button className="btn btn-secondary" onClick={loadProfile} disabled={loading}>
          Refresh
        </button>
      </div>
    </div>
  )
}

export default ProfilePage

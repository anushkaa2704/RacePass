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
      minAge: a.minAge
    }))

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
    concert: '🎸 Electric Dreams Festival 2025',
    bar: '🍺 Skyline Sports Bar',
    gallery: '🎨 Modern Art Exhibition',
    general: '📌 General Event'
  }

  if (!isWalletConnected) {
    return (
      <div className="page-center">
        <div className="dashboard" style={{ animation: 'fadeUp 0.5s ease' }}>
          <div className="dashboard-icon" style={{ background: '#555' }}>👤</div>
          <h1 className="dashboard-title">Connect Your Wallet</h1>
          <p className="dashboard-subtitle">Please connect MetaMask to view your profile.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page-center">
        <div className="dashboard" style={{ animation: 'fadeUp 0.5s ease' }}>
          <div className="spinner" style={{ margin: '40px auto' }}></div>
          <h2 style={{ color: '#00d9ff' }}>Loading Profile...</h2>
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
              : 'linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)'
          }}
        >
          {isVerified ? '✓' : '✕'}
        </div>

        <h1 className="dashboard-title">My Profile</h1>
        <p className="dashboard-subtitle">
          {isVerified ? 'Your RacePass is active' : 'Your RacePass is not active'}
        </p>

        <div className={`status-badge ${isVerified ? 'status-verified' : 'status-not-verified'}`}>
          {isVerified ? '● Verified' : '○ Not Verified'}
        </div>
      </div>

      {/* Wallet Info */}
      <div className="card glass-card" style={{
        maxWidth: '600px', width: '100%', marginTop: '20px',
        animation: 'fadeUp 0.4s 0.1s both'
      }}>
        <h3 className="card-title">🔗 Wallet</h3>
        <div style={{ color: '#00d9ff', fontSize: '14px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
          {walletAddress}
        </div>
        <a
          href={`${SEPOLIA_EXPLORER}/address/${walletAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#6366f1', fontSize: '13px', marginTop: '8px', display: 'inline-block' }}
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
          <h3 className="card-title">🪪 Credential Details</h3>

          <div className="grid-2" style={{ gap: '15px', marginBottom: '15px' }}>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Age Status</div>
              <div className={`status-badge ${credential.isAdult ? 'status-verified' : 'status-pending'}`} style={{ fontSize: '13px' }}>
                {credential.ageCategory === '21+' ? '🟢 21+' : credential.isAdult ? '🟢 18+' : '🟡 Under 18'}
              </div>
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Expires</div>
              <div style={{ color: '#00d9ff', fontSize: '14px', fontWeight: 'bold' }}>
                {credential.expiresAt ? new Date(credential.expiresAt).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>

          {credential.credentialId && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Token / Credential ID</div>
              <div style={{
                color: '#00d9ff', fontSize: '12px', wordBreak: 'break-all',
                fontFamily: 'monospace', background: 'rgba(0, 217, 255, 0.06)',
                padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(0, 217, 255, 0.1)'
              }}>
                {credential.credentialId}
              </div>
            </div>
          )}

          {credential.fingerprint && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Fingerprint (SHA-256)</div>
              <div className="fingerprint">{credential.fingerprint}</div>
            </div>
          )}

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

      {/* Blockchain Transactions */}
      {txHashes.length > 0 && (
        <div className="card glass-card" style={{
          maxWidth: '600px', width: '100%', marginTop: '20px',
          animation: 'fadeUp 0.4s 0.2s both'
        }}>
          <h3 className="card-title">⛓️ On-Chain Records</h3>
          {txHashes.map((tx, i) => (
            <div key={i} style={{
              padding: '12px', marginBottom: i < txHashes.length - 1 ? '10px' : 0,
              background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ color: '#00d9ff', fontSize: '13px', fontWeight: 'bold' }}>{tx.chain}</span>
                {tx.block && <span style={{ color: '#64748b', fontSize: '11px' }}>Block #{tx.block}</span>}
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8', wordBreak: 'break-all' }}>
                {tx.hash}
              </div>
              <a
                href={`${tx.chain.includes('Sepolia') ? SEPOLIA_EXPLORER : 'https://www.oklink.com/amoy'}/tx/${tx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#6366f1', fontSize: '12px', marginTop: '6px', display: 'inline-block' }}
              >
                View Transaction ↗
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Registered Events */}
      <div className="card glass-card" style={{
        maxWidth: '600px', width: '100%', marginTop: '20px',
        animation: 'fadeUp 0.4s 0.25s both'
      }}>
        <h3 className="card-title">🎪 Registered Events</h3>
        {registeredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px', opacity: 0.5 }}>🎫</div>
            <p style={{ color: '#64748b', fontSize: '14px' }}>No events yet</p>
            <Link to="/concert" className="btn btn-primary" style={{ marginTop: '12px', fontSize: '13px' }}>
              Browse Events
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {registeredEvents.map((evt, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px', background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div>
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                    {eventDisplayNames[evt.eventType] || `📌 ${evt.eventType}`}
                  </div>
                  {evt.minAge > 0 && (
                    <span style={{ color: '#00ff88', fontSize: '11px' }}>Age {evt.minAge}+ ✓</span>
                  )}
                </div>
                <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'right' }}>
                  {new Date(evt.timestamp).toLocaleDateString()}
                  <br />
                  <span style={{ fontSize: '11px' }}>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      {activities.length > 0 && (
        <div className="card glass-card" style={{
          maxWidth: '600px', width: '100%', marginTop: '20px',
          animation: 'fadeUp 0.4s 0.3s both'
        }}>
          <h3 className="card-title">📋 Activity Timeline</h3>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {activities.slice().reverse().map((a, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                fontSize: '13px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{
                    a.action === 'KYC_SUBMITTED' ? '📝' :
                    a.action === 'THIRD_PARTY_VERIFIED' ? '✅' :
                    a.action === 'AGE_GATE_BLOCKED' ? '🚫' :
                    a.action === 'CREDENTIAL_REVOKED' ? '🗑️' : '📌'
                  }</span>
                  <span style={{ color: '#ccc' }}>
                    {a.action === 'KYC_SUBMITTED' ? 'KYC Completed' :
                     a.action === 'THIRD_PARTY_VERIFIED' ? `Event Verified${a.eventType ? ` (${a.eventType})` : ''}` :
                     a.action === 'AGE_GATE_BLOCKED' ? `Blocked${a.eventType ? ` (${a.eventType})` : ''}` :
                     a.action === 'CREDENTIAL_REVOKED' ? 'Credential Revoked' :
                     a.action.replace(/_/g, ' ')}
                  </span>
                </div>
                <span style={{ color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
                  {new Date(a.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
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
        {!isVerified && (
          <Link to="/signup" className="btn btn-primary">Complete KYC</Link>
        )}
        {isVerified && (
          <Link to="/concert" className="btn btn-primary">🎸 Browse Events</Link>
        )}
        <Link to="/dashboard" className="btn btn-secondary">Dashboard</Link>
        <button className="btn btn-secondary" onClick={loadProfile} disabled={loading}>
          🔄 Refresh
        </button>
      </div>
    </div>
  )
}

export default ProfilePage

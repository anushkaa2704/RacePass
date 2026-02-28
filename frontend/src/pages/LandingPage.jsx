/**
 * LandingPage.jsx — Role Selection
 *
 * Two login paths: Organizer & User.
 * Wallet connects automatically, then the user picks a role.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerUser } from '../utils/api'

function LandingPage({ isWalletConnected, walletAddress, onConnectWallet, setUserRole }) {
  const navigate = useNavigate()
  const [step, setStep] = useState('choose') // choose | form
  const [role, setRole] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRolePick(r) {
    if (!isWalletConnected) {
      onConnectWallet()
      return
    }
    setRole(r)
    setStep('form')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setLoading(true)
    setError('')
    try {
      await registerUser(walletAddress, role, name.trim(), email.trim())
      localStorage.setItem('racepass_role', role)
      if (setUserRole) setUserRole(role)
      navigate(role === 'organizer' ? '/organizer' : '/marketplace')
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="page-center" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '48px', animation: 'fadeUp 0.6s ease' }}>
        <div style={{ marginBottom: '16px' }}><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg></div>
        <h1 className="page-title" style={{ fontSize: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '48px', height: '48px' }} />
          Welcome to <span className="gradient-text">RacePass</span>
        </h1>
        <p className="page-description" style={{ maxWidth: '560px' }}>
          Privacy-preserving identity verification for events.
          Verify once, attend everywhere — zero personal data shared.
        </p>
      </div>

      {step === 'choose' && (
        <div style={{
          display: 'flex', gap: '28px', flexWrap: 'wrap',
          justifyContent: 'center', animation: 'fadeUp 0.6s 0.1s both'
        }}>
          {/* Organizer Card */}
          <div
            className="card glass-card"
            style={{
              width: '320px', textAlign: 'center', cursor: 'pointer',
              transition: 'transform 0.3s, box-shadow 0.3s, border-color 0.3s'
            }}
            onClick={() => handleRolePick('organizer')}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(0,255,136,0.4)'
              e.currentTarget.style.transform = 'translateY(-8px)'
              e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,255,136,0.15)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = ''
              e.currentTarget.style.transform = ''
              e.currentTarget.style.boxShadow = ''
            }}
          >
            <div style={{ marginBottom: '16px' }}><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg></div>
            <h2 style={{ color: '#00ff88', fontSize: '22px', marginBottom: '8px' }}>Event Organizer</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
              Create events, set verification requirements,
              and manage attendee check-ins.
            </p>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#64748b',
              textAlign: 'left', padding: '12px', background: 'rgba(0,255,136,0.04)',
              borderRadius: '10px', border: '1px solid rgba(0,255,136,0.1)'
            }}>
              <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><polyline points="20 6 9 17 4 12" /></svg> Create unlimited events</span>
              <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><polyline points="20 6 9 17 4 12" /></svg> Set age & identity requirements</span>
              <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><polyline points="20 6 9 17 4 12" /></svg> Real-time registration alerts</span>
              <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><polyline points="20 6 9 17 4 12" /></svg> QR ticket scanning at entry</span>
            </div>
            <button className="btn btn-primary" style={{
              width: '100%', marginTop: '20px'
            }}>
              Continue as Organizer →
            </button>
          </div>

          {/* User Card */}
          <div
            className="card glass-card"
            style={{
              width: '320px', textAlign: 'center', cursor: 'pointer',
              transition: 'transform 0.3s, box-shadow 0.3s, border-color 0.3s'
            }}
            onClick={() => handleRolePick('user')}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(0,255,136,0.4)'
              e.currentTarget.style.transform = 'translateY(-8px)'
              e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,255,136,0.15)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = ''
              e.currentTarget.style.transform = ''
              e.currentTarget.style.boxShadow = ''
            }}
          >
            <div style={{ marginBottom: '16px' }}><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#00cc66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg></div>
            <h2 style={{ color: '#00cc66', fontSize: '22px', marginBottom: '8px' }}>Event Attendee</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
              Browse events, verify your identity with zero-knowledge proofs,
              and get instant QR tickets.
            </p>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#64748b',
              textAlign: 'left', padding: '12px', background: 'rgba(0,255,136,0.04)',
              borderRadius: '10px', border: '1px solid rgba(0,255,136,0.1)'
            }}>
              <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><polyline points="20 6 9 17 4 12" /></svg> Browse all events</span>
              <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><polyline points="20 6 9 17 4 12" /></svg> ZKP age verification (no data shared)</span>
              <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><polyline points="20 6 9 17 4 12" /></svg> Instant QR ticket generation</span>
              <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><polyline points="20 6 9 17 4 12" /></svg> One KYC for all events</span>
            </div>
            <button className="btn btn-primary" style={{
              width: '100%', marginTop: '20px'
            }}>
              Continue as Attendee →
            </button>
          </div>
        </div>
      )}

      {step === 'form' && (
        <div className="card glass-card" style={{
          maxWidth: '440px', width: '100%', animation: 'emerge3D 0.5s ease'
        }}>
          <h2 style={{ color: role === 'organizer' ? '#00ff88' : '#00cc66', marginBottom: '8px', textAlign: 'center' }}>
            {role === 'organizer' ? 'Organizer Profile' : 'Attendee Profile'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', marginBottom: '24px' }}>
            Quick setup — just your display name
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Display Name *</label>
              <input
                className="form-input"
                placeholder={role === 'organizer' ? 'Your organization name' : 'Your name'}
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email (optional)</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div style={{
              background: 'rgba(0,255,136,0.04)',
              border: '1px solid rgba(0,255,136,0.1)',
              borderRadius: '10px', padding: '12px', marginBottom: '20px',
              fontSize: '12px', color: '#64748b'
            }}>
              Wallet: <span style={{ color: '#00ff88', fontFamily: 'monospace' }}>
                {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
              </span>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button className="btn btn-primary btn-glow" type="submit" disabled={loading}
              style={{ width: '100%', marginBottom: '10px' }}>
              {loading ? 'Setting up...' : `Enter as ${role === 'organizer' ? 'Organizer' : 'Attendee'}`}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setStep('choose')}
              style={{ width: '100%', fontSize: '13px' }}>
              ← Back
            </button>
          </form>
        </div>
      )}

      {/* Trust Bar */}
      <div className="trust-bar" style={{
        display: 'flex', gap: '24px', justifyContent: 'center',
        marginTop: '48px', flexWrap: 'wrap', animation: 'fadeUp 0.5s 0.3s both'
      }}>
        {[
          { icon: '', text: 'Zero-Knowledge Proofs' },
          { icon: '', text: 'Blockchain Verified' },
          { icon: '', text: 'No Data Shared' },
          { icon: '', text: 'Self-Sovereign' }
        ].map((b, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            color: '#475569', fontSize: '13px', fontWeight: 500
          }}>
            <span>{b.icon}</span> {b.text}
          </div>
        ))}
      </div>
    </div>
  )
}

export default LandingPage

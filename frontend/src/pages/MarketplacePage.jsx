/**
 * MarketplacePage.jsx — User Event Marketplace
 *
 * Browse events, see ZKP requirements, register with selective disclosure,
 * and get QR entry tickets.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  listEvents, checkZKPDisclosures, registerForEvent,
  getMyTickets, validateTicket
} from '../utils/api'
import QRCodeDisplay from '../components/QRCodeDisplay'

function MarketplacePage({ isWalletConnected, walletAddress, onConnectWallet }) {
  const [events, setEvents] = useState([])
  const [myTickets, setMyTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('browse') // browse | event | ticket | mytickets
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [zkpData, setZkpData] = useState(null)
  const [zkpLoading, setZkpLoading] = useState(false)
  const [regResult, setRegResult] = useState(null)
  const [regLoading, setRegLoading] = useState(false)
  const [showTicket, setShowTicket] = useState(null)

  const fetchEvents = useCallback(async () => {
    try {
      const res = await listEvents()
      setEvents(res.events || [])
    } catch { }
    setLoading(false)
  }, [])

  const fetchTickets = useCallback(async () => {
    if (!walletAddress) return
    try {
      const res = await getMyTickets(walletAddress)
      setMyTickets(res.tickets || [])
    } catch { }
  }, [walletAddress])

  useEffect(() => { fetchEvents(); fetchTickets() }, [fetchEvents, fetchTickets])

  async function handleSelectEvent(ev) {
    if (!isWalletConnected) { onConnectWallet(); return }
    setSelectedEvent(ev)
    setRegResult(null)
    setZkpData(null)
    setView('event')

    // Fetch ZKP disclosure info
    setZkpLoading(true)
    try {
      const res = await checkZKPDisclosures(walletAddress, ev.id)
      setZkpData(res)
    } catch { }
    setZkpLoading(false)
  }

  async function handleRegister() {
    setRegLoading(true)
    try {
      const res = await registerForEvent(walletAddress, selectedEvent.id)
      setRegResult(res)
      if (res.success && res.verified) {
        fetchTickets()
        fetchEvents()
      }
    } catch (err) {
      setRegResult({ success: false, message: err.message })
    }
    setRegLoading(false)
  }

  function handleShowTicket(ticket) {
    setShowTicket(ticket)
    setView('ticket')
  }

  // ── Browse Events ──
  if (view === 'browse') {
    return (
      <div>
        <div className="concert-header" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' }}>
          <h1 className="concert-title">Event Marketplace</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)' }}>Browse events — register with zero-knowledge proofs</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '20px 0' }}>
          <button className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 18px' }}>Browse Events</button>
          <button className="btn btn-secondary" onClick={() => setView('mytickets')}
            style={{ fontSize: '13px', padding: '8px 18px' }}>
            My Tickets {myTickets.length > 0 && `(${myTickets.length})`}
          </button>
        </div>

        <div className="page-center" style={{ minHeight: 'calc(100vh - 350px)', paddingTop: '0' }}>
          {loading ? (
            <div className="spinner" />
          ) : events.length === 0 ? (
            <div className="card glass-card" style={{ textAlign: 'center', padding: '60px', maxWidth: '500px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>
              <h3 style={{ color: '#94a3b8' }}>No events available yet</h3>
              <p style={{ color: '#64748b', fontSize: '14px' }}>Check back soon or ask organizers to create events.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px', maxWidth: '960px', width: '100%'
            }}>
              {events.map((ev, i) => {
                const hasTicket = myTickets.some(t => t.eventId === ev.id)
                return (
                  <div key={ev.id} className="card event-card" style={{
                    padding: 0, overflow: 'hidden', cursor: 'pointer',
                    animationDelay: `${0.05 * i}s`
                  }} onClick={() => hasTicket ? null : handleSelectEvent(ev)}>
                    {/* Gradient header */}
                    <div style={{
                      background: ev.gradient, padding: '24px 20px',
                      textAlign: 'center', position: 'relative'
                    }}>
                      <div style={{ fontSize: '40px', marginBottom: '8px' }}>{ev.emoji}</div>
                      <h3 style={{ color: '#fff', fontSize: '16px', margin: 0 }}>{ev.name}</h3>
                      {ev.organizerName && (
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '4px' }}>
                          by {ev.organizerName}
                        </div>
                      )}
                      {hasTicket && (
                        <div style={{
                          position: 'absolute', top: '8px', right: '8px',
                          background: 'rgba(0,255,136,0.9)', color: '#0a0a14',
                          borderRadius: '8px', padding: '2px 8px', fontSize: '11px', fontWeight: 700
                        }}>Registered</div>
                      )}
                    </div>

                    <div style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                        {ev.date} • {ev.time}
                        {ev.venue && <><br />{ev.venue}</>}
                      </div>

                      {/* ZKP requirement badges */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {ev.minAge > 0 && (
                          <span style={{
                            fontSize: '11px', background: 'rgba(255,193,7,0.1)', color: '#ffc107',
                            padding: '3px 8px', borderRadius: '10px'
                          }}>{ev.minAge}+</span>
                        )}
                        {ev.requireIdentity && (
                          <span style={{
                            fontSize: '11px', background: 'rgba(0,255,136,0.08)', color: '#00ff88',
                            padding: '3px 8px', borderRadius: '10px'
                          }}>Identity</span>
                        )}
                        {ev.requireCountry && (
                          <span style={{
                            fontSize: '11px', background: 'rgba(0, 255, 136,0.08)', color: '#00ff88',
                            padding: '3px 8px', borderRadius: '10px'
                          }}>Country</span>
                        )}
                      </div>

                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', fontSize: '13px'
                      }}>
                        <span style={{ color: '#64748b' }}>
                          {ev.spotsLeft}/{ev.capacity}
                        </span>
                        <span style={{ color: ev.price > 0 ? '#00ff88' : '#94a3b8', fontWeight: 600 }}>
                          {ev.price > 0 ? `₹${ev.price}` : 'Free'}
                        </span>
                      </div>

                      {hasTicket ? (
                        <button className="btn btn-success" style={{ width: '100%', marginTop: '12px', fontSize: '13px' }}
                          onClick={(e) => { e.stopPropagation(); handleShowTicket(myTickets.find(t => t.eventId === ev.id)) }}>
                          View Ticket
                        </button>
                      ) : (
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: '12px', fontSize: '13px' }}>
                          Register Now →
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Event Detail + ZKP Disclosure + Registration ──
  if (view === 'event' && selectedEvent) {
    const ev = selectedEvent
    return (
      <div>
        <div className="concert-header" style={{ background: ev.gradient }}>
          <h1 className="concert-title">{ev.emoji} {ev.name}</h1>
          <p style={{ color: 'rgba(255,255,255,0.9)' }}>{ev.description || ev.category}</p>
        </div>

        <div className="page-center" style={{ minHeight: 'calc(100vh - 300px)' }}>
          <div className="card glass-card" style={{
            maxWidth: '560px', width: '100%',
            animation: 'emerge3D 0.5s ease'
          }}>

            {/* Event info */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
              marginBottom: '20px', fontSize: '14px', color: '#94a3b8'
            }}>
              <div>{ev.date}</div>
              <div>{ev.time}</div>
              <div>{ev.venue || 'TBD'}</div>
              <div>{ev.spotsLeft} spots left</div>
              <div>{ev.organizerName}</div>
              <div style={{ color: ev.price > 0 ? '#00ff88' : '#94a3b8', fontWeight: 600 }}>
                {ev.price > 0 ? `₹${ev.price}` : 'Free'}
              </div>
            </div>

            <div className="form-divider"><span>Attestation-Based Verification</span></div>

            {/* ZKP Disclosure Checkboxes */}
            {zkpLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : !zkpData?.hasCredential ? (
              <div className="alert alert-error" style={{ marginBottom: '20px' }}>
                No credential found. {zkpData?.message || 'Please complete KYC first.'}
                <button className="btn btn-primary" style={{ display: 'block', width: '100%', marginTop: '12px' }}
                  onClick={() => window.location.href = '/signup'}>
                  Get RacePass →
                </button>
              </div>
            ) : zkpData.revoked ? (
              <div className="alert alert-error" style={{ marginBottom: '20px' }}>
                Your credential has been revoked. Cannot register for events.
              </div>
            ) : (
              <>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>
                  Eligibility is verified via ECDSA-signed attestations — only booleans are shared.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {zkpData.zkpProofs && Object.entries(zkpData.zkpProofs).map(([key, proof]) => {
                    if (!proof.required && key === 'ageAboveMin' && ev.minAge === 0) return null
                    return (
                      <div key={key} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 14px', borderRadius: '10px',
                        background: proof.canProve ? 'rgba(0,255,136,0.04)' : 'rgba(255,82,82,0.04)',
                        border: `1px solid ${proof.canProve ? 'rgba(0,255,136,0.12)' : 'rgba(255,82,82,0.12)'}`
                      }}>
                <div style={{ fontSize: '24px' }}>{proof.canProve ? <span style={{ color: '#00ff88' }}>✓</span> : <span style={{ color: '#ff5252' }}>✕</span>}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>
                            "{proof.label}"
                          </div>
                          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                            {proof.description}
                          </div>
                          {proof.cryptoMethod && (
                            <div style={{ color: '#475569', fontSize: '10px', marginTop: '2px', fontFamily: 'monospace' }}>
                              {proof.cryptoMethod}
                            </div>
                          )}
                        </div>
                        {proof.required && (
                          <span style={{
                            fontSize: '10px', background: 'rgba(255,193,7,0.1)', color: '#ffc107',
                            padding: '2px 8px', borderRadius: '8px'
                          }}>Required</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div style={{
                  background: 'rgba(0, 255, 136,0.04)', border: '1px solid rgba(0, 255, 136,0.1)',
                  borderRadius: '10px', padding: '12px', marginBottom: '20px',
                  fontSize: '12px', color: '#00ff88', textAlign: 'center'
                }}>
                  {zkpData.privacyNote}
                </div>

                {/* Registration result */}
                {regResult ? (
                  regResult.verified ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '64px', marginBottom: '12px', animation: 'bounceIn3D 0.8s' }}><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                      <h2 style={{ color: '#00ff88', marginBottom: '8px' }}>Registered!</h2>
                      <p style={{ color: '#94a3b8', marginBottom: '20px' }}>{regResult.message}</p>

                      {/* Attestation Disclosure Summary */}
                      <div style={{
                        background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)',
                        borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'left'
                      }}>
                        <div style={{ color: '#00ff88', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                          Attestations Shared (ECDSA-signed):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
                          {regResult.disclosures?.ageAboveMin != null && (
                            <div style={{ color: '#94a3b8' }}>
                              Age {ev.minAge}+: {regResult.disclosures.ageAboveMin ? 'Yes' : 'No'}
                              <span style={{ color: '#475569' }}> (exact age NOT revealed)</span>
                            </div>
                          )}
                          {regResult.disclosures?.identityVerified != null && (
                            <div style={{ color: '#94a3b8' }}>
                              Identity: {regResult.disclosures.identityVerified ? 'Verified' : 'Not Verified'}
                              <span style={{ color: '#475569' }}> (name NOT revealed)</span>
                            </div>
                          )}
                          {regResult.disclosures?.countryResident != null && (
                            <div style={{ color: '#94a3b8' }}>
                              India Resident: {regResult.disclosures.countryResident ? 'Yes' : 'No'}
                              <span style={{ color: '#475569' }}> (Aadhaar NOT revealed)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Crypto Proof Details */}
                      {regResult.cryptoProofs && (
                        <div style={{
                          background: 'rgba(0, 255, 136,0.04)', border: '1px solid rgba(0, 255, 136,0.12)',
                          borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'left'
                        }}>
                          <div style={{ color: '#00ff88', fontWeight: 600, fontSize: '13px', marginBottom: '10px' }}>
                            Cryptographic Proof Details
                          </div>
                          {regResult.cryptoProofs.attestations && regResult.cryptoProofs.attestations.length > 0 && (
                            <div style={{ marginBottom: '10px' }}>
                              <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>Attestations ({regResult.cryptoProofs.attestations.length})</div>
                              {regResult.cryptoProofs.attestations.map((a, i) => (
                                <div key={i} style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>
                                  ✓ <span style={{ color: '#e2e8f0' }}>{a.claim}</span>
                                  <span style={{ color: '#475569', fontFamily: 'monospace' }}> sig: {a.signature?.slice(0, 20)}...</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ marginBottom: '6px' }}>
                            <div style={{ color: '#64748b', fontSize: '11px' }}>Ticket Hash</div>
                            <div style={{ color: '#00ff88', fontSize: '10px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                              {regResult.cryptoProofs.ticketHash}
                            </div>
                          </div>
                          <div style={{ marginBottom: '6px' }}>
                            <div style={{ color: '#64748b', fontSize: '11px' }}>Ticket Signature</div>
                            <div style={{ color: '#00ff88', fontSize: '10px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                              {regResult.cryptoProofs.ticketSignature?.slice(0, 42)}...
                            </div>
                          </div>
                          <div style={{ fontSize: '10px', color: '#475569', marginTop: '8px' }}>
                            {regResult.cryptoProofs.note}
                          </div>
                        </div>
                      )}

                      {/* Show QR immediately */}
                      {regResult.qrToken && (
                        <div style={{
                          background: 'linear-gradient(145deg, #0f0f1e, #161630)',
                          border: '1px solid rgba(0, 255, 136,0.15)',
                          borderRadius: '16px', padding: '24px',
                          marginBottom: '20px'
                        }}>
                          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', letterSpacing: '0.1em' }}>YOUR QR ENTRY TICKET</div>
                          <QRCodeDisplay value={regResult.qrToken} size={200} label={regResult.qrToken} />
                          <div style={{ fontSize: '11px', color: '#475569', marginTop: '12px' }}>
                            Show this QR code to the organizer's scanner at entry
                          </div>
                        </div>
                      )}

                      <button className="btn btn-secondary" onClick={() => { setView('browse'); setSelectedEvent(null); setRegResult(null) }}>
                        ← Back to Events
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={regResult.reason === 'age_restricted' ? '#ffc107' : '#ff5252'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      </div>
                      <h2 style={{ color: regResult.reason === 'age_restricted' ? '#ffc107' : '#ff5252' }}>
                        {regResult.reason === 'age_restricted' ? 'Age Restricted' : 'Registration Failed'}
                      </h2>
                      <p style={{ color: '#94a3b8', margin: '12px 0' }}>{regResult.message}</p>

                      {regResult.disclosures && (
                        <div style={{
                          background: 'rgba(255,193,7,0.04)', border: '1px solid rgba(255,193,7,0.15)',
                          borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'left'
                        }}>
                          <div style={{ color: '#ffc107', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                            ZKP Disclosure:
                          </div>
                          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                            Age {ev.minAge}+: {regResult.disclosures.ageAboveMin ? 'Passed' : 'Failed'}
                            <span style={{ color: '#475569' }}> (exact age NOT revealed)</span>
                          </div>
                        </div>
                      )}

                      <div className="alert alert-info" style={{ textAlign: 'left' }}>
                        This event requires age {ev.minAge}+. No personal data was exposed.
                      </div>

                      <button className="btn btn-secondary" onClick={() => { setView('browse'); setSelectedEvent(null); setRegResult(null) }}
                        style={{ marginTop: '16px' }}>
                        ← Back to Events
                      </button>
                    </div>
                  )
                ) : (
                  <button className="btn btn-primary btn-glow" onClick={handleRegister}
                    disabled={regLoading}
                    style={{ width: '100%' }}>
                    {regLoading ? 'Generating Attestation Proofs...' : 'Register with Attestation Verification'}
                  </button>
                )}
              </>
            )}

            {!regResult && (
              <button className="btn btn-secondary" onClick={() => { setView('browse'); setSelectedEvent(null); setZkpData(null) }}
                style={{ width: '100%', marginTop: '10px' }}>
                ← Back to Events
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Ticket View ──
  if (view === 'ticket' && showTicket) {
    const t = showTicket
    return (
      <div>
        <div className="concert-header" style={{ background: t.gradient || 'linear-gradient(135deg, #00cc66, #00ff88)' }}>
          <h1 className="concert-title">{t.eventEmoji} {t.eventName}</h1>
        </div>

        <div className="page-center">
          <div className="ticket-card-3d card glass-card" style={{
            maxWidth: '420px', width: '100%', textAlign: 'center',
            animation: 'ticketReveal 0.8s ease'
          }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', letterSpacing: '0.1em' }}>
              RACEPASS ENTRY TICKET
            </div>

            {/* QR Code */}
            <div style={{ marginBottom: '20px' }}>
              <QRCodeDisplay value={t.qrToken} size={220} label={t.qrToken} />
            </div>

            {/* Details */}
            <div style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
              padding: '16px', marginBottom: '20px', textAlign: 'left'
            }}>
              {[
                { label: 'Event', value: t.eventName },
                { label: 'Date', value: t.eventDate },
                { label: 'Time', value: t.eventTime },
                { label: 'Venue', value: t.venue || 'TBD' },
                { label: 'Wallet', value: walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : '' }
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  fontSize: '13px'
                }}>
                  <span style={{ color: '#64748b' }}>{row.label}</span>
                  <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {t.usedAt ? (
              <div className="alert alert-warning">Ticket already scanned at {new Date(t.usedAt).toLocaleString()}</div>
            ) : (
              <div className="alert alert-success">Valid — Show this QR at event entrance</div>
            )}

            <button className="btn btn-secondary" onClick={() => { setView('mytickets'); setShowTicket(null) }}
              style={{ marginTop: '16px', width: '100%' }}>
              ← Back to My Tickets
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── My Tickets ──
  if (view === 'mytickets') {
    return (
      <div>
        <div className="concert-header" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' }}>
          <h1 className="concert-title">My Tickets</h1>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '20px 0' }}>
          <button className="btn btn-secondary" onClick={() => setView('browse')}
            style={{ fontSize: '13px', padding: '8px 18px' }}>Browse Events</button>
          <button className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 18px' }}>
            My Tickets ({myTickets.length})
          </button>
        </div>

        <div className="page-center" style={{ minHeight: 'calc(100vh - 350px)', paddingTop: 0 }}>
          {myTickets.length === 0 ? (
            <div className="card glass-card" style={{ textAlign: 'center', padding: '60px', maxWidth: '500px' }}>
              <div style={{ marginBottom: '16px', opacity: 0.5 }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>
              <h3 style={{ color: '#94a3b8' }}>No tickets yet</h3>
              <p style={{ color: '#64748b', fontSize: '14px' }}>Register for events to get your QR tickets.</p>
              <button className="btn btn-primary" onClick={() => setView('browse')} style={{ marginTop: '16px' }}>
                Browse Events →
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px', maxWidth: '900px', width: '100%'
            }}>
              {myTickets.map(t => (
                <div key={t.qrToken} className="card" style={{
                  padding: 0, overflow: 'hidden', cursor: 'pointer'
                }} onClick={() => handleShowTicket(t)}>
                  <div style={{
                    background: t.gradient || 'linear-gradient(135deg, #00cc66, #00ff88)',
                    padding: '16px', textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '32px' }}>{t.eventEmoji}</span>
                    <h3 style={{ color: '#fff', fontSize: '15px', margin: '6px 0 0' }}>{t.eventName}</h3>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
                      {t.eventDate} • {t.eventTime}
                    </div>
                    <div style={{
                      fontFamily: 'monospace', fontSize: '12px', color: '#00ff88',
                      background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px',
                      overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {t.qrToken}
                    </div>
                    {t.usedAt ? (
                      <div style={{ color: '#ffc107', fontSize: '12px', marginTop: '8px' }}>Already scanned</div>
                    ) : (
                      <div style={{ color: '#00ff88', fontSize: '12px', marginTop: '8px' }}>Valid</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}

export default MarketplacePage

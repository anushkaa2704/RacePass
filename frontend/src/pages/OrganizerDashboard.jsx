/**
 * OrganizerDashboard.jsx — Organizer Portal
 *
 * - Create new events with requirements (age, identity, country)
 * - View created events + registrations
 * - Real-time notification bell
 * - QR ticket scanner
 */

import { useState, useEffect, useCallback } from 'react'
import {
  createEvent, getOrganizerEvents, getNotifications,
  markNotificationsRead, scanTicket, markAttendance
} from '../utils/api'
import QRScanner from '../components/QRScanner'

const CATEGORIES = [
  { value: 'concert', label: 'Concert', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)' },
  { value: 'brewery', label: 'Brewery Tour', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
  { value: 'gallery', label: 'Art Gallery', gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' },
  { value: 'racing', label: 'Racing Event', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
  { value: 'casino', label: 'Casino Night', gradient: 'linear-gradient(135deg, #00ff88 0%, #7c3aed 100%)' },
  { value: 'sports', label: 'Sports', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
  { value: 'general', label: 'General', gradient: 'linear-gradient(135deg, #00cc66 0%, #00ff88 100%)' }
]

const ICONS = ['C', 'B', 'A', 'R', 'S', 'G', 'M', 'L', 'T', 'E', 'P', 'V']

const PLANS = [
  { id: 'starter', name: 'Starter', price: '₹999/mo', events: 10, features: ['10 events/month', 'QR ticket scanning', 'Basic analytics', 'Email support'] },
  { id: 'pro', name: 'Pro', price: '₹2,499/mo', events: 50, features: ['50 events/month', 'Priority scanning', 'Advanced analytics', 'Priority support', 'Custom branding'], popular: true },
  { id: 'enterprise', name: 'Enterprise', price: '₹4,999/mo', events: 999, features: ['Unlimited events', 'Dedicated scanner', 'Full analytics suite', '24/7 support', 'White-label', 'API access'] }
]

const FREE_TRIAL_LIMIT = 2

function OrganizerDashboard({ walletAddress }) {
  const [view, setView] = useState('events') // events | create | notifications | scanner | subscription
  const [myEvents, setMyEvents] = useState([])
  const [notifs, setNotifs] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [scanResult, setScanResult] = useState(null)
  const [scanInput, setScanInput] = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [scanMode, setScanMode] = useState('camera') // camera | manual
  const [cameraScanning, setCameraScanning] = useState(true)
  const [attendanceStatus, setAttendanceStatus] = useState(null)
  const [attendanceSaving, setAttendanceSaving] = useState(false)

  // Subscription state
  const subKey = `racepass_sub_${walletAddress?.toLowerCase()}`
  const [subscription, setSubscription] = useState(() => {
    try { return JSON.parse(localStorage.getItem(subKey)) || null } catch { return null }
  })

  const totalEventsCreated = myEvents.length
  const freeTrialUsed = totalEventsCreated >= FREE_TRIAL_LIMIT
  const hasActiveSubscription = subscription?.active === true
  const canCreateEvent = !freeTrialUsed || hasActiveSubscription
  const freeTrialRemaining = Math.max(0, FREE_TRIAL_LIMIT - totalEventsCreated)

  function handleSubscribe(plan) {
    const sub = { active: true, plan: plan.id, planName: plan.name, subscribedAt: new Date().toISOString(), eventsLimit: plan.events }
    setSubscription(sub)
    localStorage.setItem(subKey, JSON.stringify(sub))
    setView('create')
  }

  // Event form
  const [form, setForm] = useState({
    name: '', description: '', emoji: 'E', category: 'general',
    date: '', time: '19:00', venue: '', price: 0, capacity: 100,
    minAge: 0, requireIdentity: true, requireAge: true, requireCountry: false
  })
  const [createLoading, setCreateLoading] = useState(false)
  const [createMsg, setCreateMsg] = useState('')

  const fetchData = useCallback(async () => {
    if (!walletAddress) return
    try {
      const [evRes, notifRes] = await Promise.all([
        getOrganizerEvents(walletAddress),
        getNotifications(walletAddress)
      ])
      setMyEvents(evRes.events || [])
      setNotifs(notifRes.notifications || [])
      setUnreadCount(notifRes.unreadCount || 0)
    } catch { }
    setLoading(false)
  }, [walletAddress])

  useEffect(() => { fetchData() }, [fetchData])

  // Poll notifications
  useEffect(() => {
    if (!walletAddress) return
    const interval = setInterval(async () => {
      try {
        const res = await getNotifications(walletAddress)
        setNotifs(res.notifications || [])
        setUnreadCount(res.unreadCount || 0)
      } catch { }
    }, 5000)
    return () => clearInterval(interval)
  }, [walletAddress])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim()) { setCreateMsg('Event name is required'); return }
    setCreateLoading(true)
    setCreateMsg('')
    try {
      const cat = CATEGORIES.find(c => c.value === form.category)
      await createEvent({
        walletAddress,
        ...form,
        gradient: cat?.gradient || CATEGORIES[6].gradient
      })
      setCreateMsg('Event created successfully!')
      setForm(f => ({ ...f, name: '', description: '', venue: '', price: 0, capacity: 100, minAge: 0 }))
      fetchData()
      setTimeout(() => { setView('events'); setCreateMsg('') }, 1200)
    } catch (err) {
      setCreateMsg(`Error: ${err.message}`)
    }
    setCreateLoading(false)
  }

  async function handleMarkRead() {
    try {
      await markNotificationsRead(walletAddress)
      setUnreadCount(0)
      setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    } catch { }
  }

  async function handleScan() {
    if (!scanInput.trim()) return
    setScanLoading(true)
    setScanResult(null)
    try {
      const res = await scanTicket(scanInput.trim(), walletAddress)
      setScanResult(res)
      setScanInput('')
    } catch (err) {
      setScanResult({ success: false, message: err.message })
    }
    setScanLoading(false)
  }

  const selectedCat = CATEGORIES.find(c => c.value === form.category) || CATEGORIES[6]

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Header */}
      <div className="concert-header" style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)' }}>
        <h1 className="concert-title">Organizer Dashboard</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Manage events, registrations & tickets</p>
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: '8px', justifyContent: 'center',
        padding: '20px 0', flexWrap: 'wrap'
      }}>
        {[
          { key: 'events', label: 'My Events' },
          { key: 'create', label: 'Create Event' },
          { key: 'notifications', label: `Notifications ${unreadCount > 0 ? `(${unreadCount})` : ''}` },
          { key: 'scanner', label: 'Scan Ticket' },
          { key: 'subscription', label: hasActiveSubscription ? `${subscription.planName}` : 'Upgrade' }
        ].map(tab => (
          <button
            key={tab.key}
            className={`btn ${view === tab.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setView(tab.key)}
            style={{ fontSize: '13px', padding: '8px 18px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Subscription Banner */}
      {!hasActiveSubscription && (
        <div style={{
          maxWidth: '900px', margin: '0 auto 16px', padding: '12px 20px',
          background: 'linear-gradient(135deg, rgba(0,255,136,0.06) 0%, rgba(0,204,102,0.04) 100%)',
          border: '1px solid rgba(0,255,136,0.15)', borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'
        }}>
          <div>
            <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>
              Free Trial: {freeTrialRemaining} of {FREE_TRIAL_LIMIT} events remaining
            </div>
            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
              Upgrade to create unlimited events with premium features
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setView('subscription')} style={{ fontSize: '13px', padding: '8px 20px' }}>
            View Plans →
          </button>
        </div>
      )}

      {/* ── My Events ── */}
      {view === 'events' && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : myEvents.length === 0 ? (
            <div className="card glass-card" style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="8" x2="22" y2="8"/></svg></div>
              <h3 style={{ color: '#94a3b8' }}>No events yet</h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>Create your first event to get started.</p>
              <button className="btn btn-primary" onClick={() => setView('create')} style={{ marginTop: '20px' }}>
                + Create Event
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {myEvents.map(ev => (
                <div key={ev.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                  <div style={{ background: ev.gradient, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '32px' }}>{ev.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ color: '#fff', fontSize: '18px', margin: 0 }}>{ev.name}</h3>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginTop: '4px' }}>
                        {ev.date} • {ev.time} • {ev.venue || 'TBD'}
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(0,0,0,0.3)', borderRadius: '12px',
                      padding: '8px 14px', textAlign: 'center', color: '#fff'
                    }}>
                      <div style={{ fontSize: '22px', fontWeight: 800 }}>{ev.registeredCount}</div>
                      <div style={{ fontSize: '10px', opacity: 0.8 }}>Registered</div>
                    </div>
                  </div>

                  <div style={{ padding: '16px 20px' }}>
                    {/* Requirements badges */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {ev.minAge > 0 && (
                        <span className="status-badge status-pending" style={{ fontSize: '11px' }}>{ev.minAge}+ Only</span>
                      )}
                      {ev.requireIdentity && (
                        <span className="status-badge status-verified" style={{ fontSize: '11px' }}>Identity Required</span>
                      )}
                      {ev.requireCountry && (
                        <span className="status-badge" style={{ fontSize: '11px', background: 'rgba(0, 255, 136,0.1)', color: '#00ff88' }}>Country Check</span>
                      )}
                      <span className="status-badge" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                        {ev.spotsLeft}/{ev.capacity} left
                      </span>
                      {ev.price > 0 && (
                        <span className="status-badge" style={{ fontSize: '11px', background: 'rgba(0,255,136,0.1)', color: '#00ff88' }}>₹{ev.price}</span>
                      )}
                    </div>

                    {/* Registrations list */}
                    {ev.registrations && ev.registrations.length > 0 && (
                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                        <div style={{ fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Recent Registrations:</div>
                        {ev.registrations.slice(0, 5).map((r, i) => (
                          <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '6px 10px', background: 'rgba(255,255,255,0.02)',
                            borderRadius: '6px', marginBottom: '4px'
                          }}>
                            <span style={{ fontFamily: 'monospace', color: '#00ff88' }}>
                              {r.wallet.slice(0, 8)}...{r.wallet.slice(-4)}
                            </span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {r.disclosures?.ageAboveMin && <span title="Age verified" style={{ color: '#00ff88', fontSize: '11px' }}>Age ✓</span>}
                              {r.disclosures?.identityVerified && <span title="Identity verified" style={{ color: '#00ff88', fontSize: '11px' }}>ID ✓</span>}
                              {r.disclosures?.countryResident && <span title="Country verified" style={{ color: '#00ff88', fontSize: '11px' }}>Country ✓</span>}
                            </div>
                            <span style={{ fontSize: '11px', color: '#475569' }}>
                              {new Date(r.registeredAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create Event ── */}
      {view === 'create' && !canCreateEvent && (
        <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
          <div className="card glass-card" style={{ padding: '48px 32px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
              background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h2 style={{ color: '#e2e8f0', fontSize: '22px', marginBottom: '8px' }}>Free Trial Exhausted</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
              You've used all {FREE_TRIAL_LIMIT} free events. Choose a plan to continue creating events with full access.
            </p>
            <button className="btn btn-primary btn-glow" onClick={() => setView('subscription')} style={{ padding: '14px 36px', fontSize: '15px' }}>
              View Plans
            </button>
          </div>
        </div>
      )}
      {view === 'create' && canCreateEvent && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="card glass-card">
            {/* Preview */}
            <div style={{
              background: selectedCat.gradient, borderRadius: '12px',
              padding: '20px', marginBottom: '24px', textAlign: 'center'
            }}>
              <span style={{ fontSize: '40px' }}>{form.emoji}</span>
              <h3 style={{ color: '#fff', marginTop: '8px' }}>{form.name || 'Event Name'}</h3>
              {form.minAge > 0 && <span style={{
                background: 'rgba(0,0,0,0.3)', borderRadius: '12px',
                padding: '4px 12px', fontSize: '12px', color: '#ffc107', marginTop: '8px', display: 'inline-block'
              }}>{form.minAge}+ Only</span>}
            </div>

            <form onSubmit={handleCreate}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Event Name *</label>
                  <input className="form-input" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Electric Dreams Festival" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input" value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Tell attendees about your event..."
                  style={{ resize: 'vertical', minHeight: '80px' }} />
              </div>

              <div className="form-group">
                <label className="form-label">Event Icon</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {ICONS.map(e => (
                    <button key={e} type="button"
                      onClick={() => setForm(f => ({ ...f, emoji: e }))}
                      style={{
                        fontSize: '16px', fontWeight: 700, width: 38, height: 38, borderRadius: '8px', border: 'none',
                        cursor: 'pointer', color: form.emoji === e ? '#00ff88' : '#94a3b8',
                        background: form.emoji === e ? 'rgba(0, 255, 136,0.2)' : 'rgba(255,255,255,0.04)',
                        outline: form.emoji === e ? '2px solid #00ff88' : 'none',
                        transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Time</label>
                  <input className="form-input" type="time" value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Venue</label>
                  <input className="form-input" value={form.venue}
                    onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                    placeholder="Phoenix Marketcity, Mumbai" />
                </div>
                <div className="form-group">
                  <label className="form-label">Price (₹)</label>
                  <input className="form-input" type="number" value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Capacity</label>
                  <input className="form-input" type="number" value={form.capacity}
                    onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Minimum Age</label>
                  <input className="form-input" type="number" value={form.minAge}
                    onChange={e => setForm(f => ({ ...f, minAge: Number(e.target.value) }))}
                    placeholder="0 = all ages" />
                </div>
              </div>

              {/* ZKP Requirements */}
              <div className="form-divider"><span>Verification Requirements (ZKP)</span></div>
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '12px',
                background: 'rgba(0, 255, 136,0.03)', borderRadius: '12px',
                padding: '16px', border: '1px solid rgba(0, 255, 136,0.08)', marginBottom: '20px'
              }}>
                {[
                  { key: 'requireIdentity', label: 'Require Identity Verification', desc: '"I am a verified person" — no name revealed' },
                  { key: 'requireAge', label: `Require Age ${form.minAge || 18}+`, desc: `"I am ${form.minAge || 18}+" — exact age never revealed` },
                  { key: 'requireCountry', label: 'Require India Residency', desc: '"I am from India" — Aadhaar number never revealed' }
                ].map(req => (
                  <label key={req.key} style={{
                    display: 'flex', gap: '12px', alignItems: 'flex-start',
                    padding: '10px', borderRadius: '8px', cursor: 'pointer',
                    background: form[req.key] ? 'rgba(0,255,136,0.04)' : 'transparent',
                    border: `1px solid ${form[req.key] ? 'rgba(0,255,136,0.15)' : 'transparent'}`,
                    transition: 'all 0.2s'
                  }}>
                    <input type="checkbox" checked={form[req.key]}
                      onChange={e => setForm(f => ({ ...f, [req.key]: e.target.checked }))}
                      style={{ marginTop: '3px', accentColor: '#00ff88' }} />
                    <div>
                      <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>{req.label}</div>
                      <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>{req.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{
                background: 'rgba(0, 255, 136,0.06)', border: '1px solid rgba(0, 255, 136,0.15)',
                borderRadius: '10px', padding: '12px', marginBottom: '20px',
                fontSize: '12px', color: '#00ff88'
              }}>
                Only boolean proofs are shared. No personal data is revealed.
              </div>

              {createMsg && (
                <div className={`alert ${createMsg.startsWith('Event') ? 'alert-success' : 'alert-error'}`}>{createMsg}</div>
              )}

              <button className="btn btn-primary btn-glow" type="submit" disabled={createLoading}
                style={{ width: '100%' }}>
                {createLoading ? 'Creating...' : 'Create Event'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Notifications ── */}
      {view === 'notifications' && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {unreadCount > 0 && (
            <div style={{ textAlign: 'right', marginBottom: '12px' }}>
              <button className="btn btn-secondary" onClick={handleMarkRead} style={{ fontSize: '12px', padding: '6px 14px' }}>
                ✓ Mark all read
              </button>
            </div>
          )}
          {notifs.length === 0 ? (
            <div className="card glass-card" style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ fontSize: '20px', marginBottom: '16px' }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
              <h3 style={{ color: '#94a3b8' }}>No notifications yet</h3>
              <p style={{ color: '#64748b', fontSize: '14px' }}>Notifications appear when attendees register.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {notifs.map(n => (
                <div key={n.id} className="card" style={{
                  padding: '14px 18px',
                  borderLeft: `3px solid ${n.read ? 'rgba(255,255,255,0.05)' : '#00ff88'}`,
                  background: n.read ? undefined : 'rgba(0, 255, 136,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                        New Registration — {n.eventName}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                        Wallet: <span style={{ fontFamily: 'monospace', color: '#00ff88' }}>
                          {n.userWallet.slice(0, 8)}...{n.userWallet.slice(-4)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {n.disclosures?.ageAboveMin && (
                          <span style={{ fontSize: '11px', background: 'rgba(0,255,136,0.1)', color: '#00ff88', padding: '2px 8px', borderRadius: '10px' }}>
                            Age
                          </span>
                        )}
                        {n.disclosures?.identityVerified && (
                          <span style={{ fontSize: '11px', background: 'rgba(0, 255, 136,0.1)', color: '#00ff88', padding: '2px 8px', borderRadius: '10px' }}>
                            Identity
                          </span>
                        )}
                        {n.disclosures?.countryResident && (
                          <span style={{ fontSize: '11px', background: 'rgba(0, 255, 136,0.1)', color: '#00ff88', padding: '2px 8px', borderRadius: '10px' }}>
                            Country
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#475569', whiteSpace: 'nowrap' }}>
                      {new Date(n.registeredAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── QR Scanner ── */}
      {view === 'scanner' && (
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '0 8px' }}>
          <div className="card glass-card" style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '8px' }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>
            <h2 style={{ color: '#00ff88', marginBottom: '6px', fontSize: '22px' }}>Ticket Scanner</h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
              Scan QR tickets via camera, image upload, or manual entry
            </p>

            {/* Scan Mode Tabs */}
            {!scanResult && (
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '18px', flexWrap: 'wrap' }}>
                {[
                  { key: 'camera', label: 'Camera', icon: '' },
                  { key: 'manual', label: 'Manual', icon: '' }
                ].map(m => (
                  <button
                    key={m.key}
                    className={`btn ${scanMode === m.key ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setScanMode(m.key); setCameraScanning(true); setScanResult(null); setAttendanceStatus(null) }}
                    style={{ fontSize: '13px', padding: '9px 18px' }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {/* Camera / Image Scanner */}
            {scanMode === 'camera' && !scanResult && !scanLoading && (
              <QRScanner
                scanning={cameraScanning}
                onScan={async (decodedText) => {
                  setCameraScanning(false)
                  setScanLoading(true)
                  setScanResult(null)
                  setAttendanceStatus(null)
                  try {
                    const res = await scanTicket(decodedText.trim(), walletAddress)
                    setScanResult(res)
                  } catch (err) {
                    setScanResult({ success: false, message: err.message })
                  }
                  setScanLoading(false)
                }}
                onError={(err) => console.log('Scanner error:', err)}
              />
            )}

            {/* Manual Input */}
            {scanMode === 'manual' && !scanResult && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '10px' }}>
                  Enter the ticket token (shown below the QR code):
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="form-input"
                    placeholder="RP-XXXXXXXX..."
                    value={scanInput}
                    onChange={e => setScanInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleScan()}
                    style={{ flex: 1, fontSize: '15px', padding: '14px' }}
                  />
                  <button className="btn btn-primary" onClick={handleScan} disabled={scanLoading}
                    style={{ padding: '14px 22px', whiteSpace: 'nowrap', fontSize: '15px' }}>
                    {scanLoading ? '...' : 'Verify'}
                  </button>
                </div>
              </div>
            )}

            {/* Loading */}
            {scanLoading && (
              <div style={{ padding: '30px', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                <div style={{ color: '#94a3b8', fontSize: '14px' }}>Verifying ticket...</div>
              </div>
            )}

            {/* ══════ SCAN RESULT — Full Event Details + Attendance ══════ */}
            {scanResult && (
              <div style={{ marginTop: '8px' }}>
                {/* Valid Ticket */}
                {(scanResult.valid || scanResult.ticket) ? (
                  <div>
                    {/* Status Banner */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(0,255,136,0.12) 0%, rgba(0, 255, 136,0.08) 100%)',
                      border: '1px solid rgba(0,255,136,0.25)',
                      borderRadius: '16px', padding: '20px',
                      animation: 'emerge3D 0.4s ease'
                    }}>
                      <div style={{ fontSize: '52px', marginBottom: '8px' }}><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                      <h3 style={{ color: '#00ff88', fontSize: '22px', margin: '0 0 4px' }}>Ticket Verified!</h3>
                      <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                        {scanResult.message || 'Valid ticket — mark attendance below'}
                      </p>
                    </div>

                    {/* Event Details Card */}
                    {scanResult.ticket && (
                      <div style={{
                        marginTop: '16px', borderRadius: '16px', overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.08)'
                      }}>
                        {/* Event Header with gradient */}
                        <div style={{
                          background: 'linear-gradient(135deg, #00cc66 0%, #00ff88 100%)',
                          padding: '16px 20px',
                          display: 'flex', alignItems: 'center', gap: '12px'
                        }}>
                          <span style={{ fontSize: '36px' }}>{scanResult.ticket.eventEmoji || 'E'}</span>
                          <div style={{ textAlign: 'left', flex: 1 }}>
                            <div style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>
                              {scanResult.ticket.eventName}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '2px' }}>
                              {scanResult.ticket.eventCategory?.toUpperCase() || 'EVENT'}
                            </div>
                          </div>
                        </div>

                        {/* Event Info Grid */}
                        <div style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.25)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</div>
                              <div style={{ color: '#e2e8f0', fontSize: '14px', marginTop: '2px' }}>
                                {scanResult.ticket.eventDate || 'TBD'}
                              </div>
                            </div>
                            <div>
                              <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</div>
                              <div style={{ color: '#e2e8f0', fontSize: '14px', marginTop: '2px' }}>
                                {scanResult.ticket.eventTime || 'TBD'}
                              </div>
                            </div>
                            <div>
                              <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Venue</div>
                              <div style={{ color: '#e2e8f0', fontSize: '14px', marginTop: '2px' }}>
                                {scanResult.ticket.eventVenue || 'TBD'}
                              </div>
                            </div>
                            <div>
                              <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Organizer</div>
                              <div style={{ color: '#e2e8f0', fontSize: '14px', marginTop: '2px' }}>
                                {scanResult.ticket.organizerName || 'Unknown'}
                              </div>
                            </div>
                            <div>
                              <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Capacity</div>
                              <div style={{ color: '#e2e8f0', fontSize: '14px', marginTop: '2px' }}>
                                {scanResult.ticket.registeredCount || 0} / {scanResult.ticket.eventCapacity || '∞'}
                              </div>
                            </div>
                            {scanResult.ticket.minAge > 0 && (
                              <div>
                                <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Min Age</div>
                                <div style={{ color: '#e2e8f0', fontSize: '14px', marginTop: '2px' }}>
                                  {scanResult.ticket.minAge}+
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Attendee Wallet */}
                          <div style={{
                            marginTop: '14px', padding: '10px 12px',
                            background: 'rgba(0,0,0,0.2)', borderRadius: '10px',
                            display: 'flex', alignItems: 'center', gap: '8px'
                          }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M16 12h2"/></svg>
                            <span style={{ fontFamily: 'monospace', color: '#00ff88', fontSize: '13px', wordBreak: 'break-all' }}>
                              {scanResult.ticket.wallet}
                            </span>
                          </div>

                          {/* Crypto verification badge */}
                          {scanResult.ticket.signatureVerified && (
                            <div style={{
                              marginTop: '10px', padding: '8px 12px',
                              background: 'rgba(0,255,136,0.06)', borderRadius: '8px',
                              display: 'flex', alignItems: 'center', gap: '6px',
                              border: '1px solid rgba(0,255,136,0.15)'
                            }}>
                              <span style={{ color: '#00ff88', fontSize: '13px' }}>ECDSA ticket signature verified</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ══════ ATTENDANCE TOGGLE ══════ */}
                    {scanResult.ticket && (
                      <div style={{
                        marginTop: '16px', padding: '20px',
                        background: 'rgba(0,0,0,0.2)', borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.08)'
                      }}>
                        <div style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
                          Mark Attendance
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                          <button
                            className="btn"
                            disabled={attendanceSaving}
                            onClick={async () => {
                              setAttendanceSaving(true)
                              try {
                                await markAttendance(scanResult.ticket.qrToken, 'present')
                                setAttendanceStatus('present')
                              } catch { setAttendanceStatus('present') }
                              setAttendanceSaving(false)
                            }}
                            style={{
                              flex: 1, padding: '14px', fontSize: '16px', fontWeight: 700,
                              background: attendanceStatus === 'present'
                                ? 'rgba(0,255,136,0.2)' : 'rgba(0,255,136,0.05)',
                              border: attendanceStatus === 'present'
                                ? '2px solid #00ff88' : '2px solid rgba(0,255,136,0.15)',
                              color: attendanceStatus === 'present' ? '#00ff88' : '#94a3b8',
                              borderRadius: '12px', cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              transform: attendanceStatus === 'present' ? 'scale(1.02)' : 'scale(1)'
                            }}
                          >
                            Present
                          </button>
                          <button
                            className="btn"
                            disabled={attendanceSaving}
                            onClick={async () => {
                              setAttendanceSaving(true)
                              try {
                                await markAttendance(scanResult.ticket.qrToken, 'absent')
                                setAttendanceStatus('absent')
                              } catch { setAttendanceStatus('absent') }
                              setAttendanceSaving(false)
                            }}
                            style={{
                              flex: 1, padding: '14px', fontSize: '16px', fontWeight: 700,
                              background: attendanceStatus === 'absent'
                                ? 'rgba(255,82,82,0.2)' : 'rgba(255,82,82,0.05)',
                              border: attendanceStatus === 'absent'
                                ? '2px solid #ff5252' : '2px solid rgba(255,82,82,0.15)',
                              color: attendanceStatus === 'absent' ? '#ff5252' : '#94a3b8',
                              borderRadius: '12px', cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              transform: attendanceStatus === 'absent' ? 'scale(1.02)' : 'scale(1)'
                            }}
                          >
                            Absent
                          </button>
                        </div>
                        {attendanceStatus && (
                          <div style={{
                            marginTop: '12px', padding: '8px',
                            background: attendanceStatus === 'present' ? 'rgba(0,255,136,0.08)' : 'rgba(255,82,82,0.08)',
                            borderRadius: '8px',
                            color: attendanceStatus === 'present' ? '#00ff88' : '#ff5252',
                            fontSize: '13px', fontWeight: 600
                          }}>
                            {attendanceStatus === 'present' ? '✓ Marked as PRESENT' : '✗ Marked as ABSENT'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Invalid Ticket */
                  <div className="card" style={{
                    background: 'rgba(255,82,82,0.06)',
                    border: '1px solid rgba(255,82,82,0.2)',
                    textAlign: 'center', padding: '24px',
                    animation: 'emerge3D 0.4s ease'
                  }}>
                    <div style={{ marginBottom: '8px' }}><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
                    <h3 style={{ color: '#ff5252', fontSize: '20px', marginBottom: '8px' }}>Entry Denied</h3>
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                      {scanResult.message || 'Invalid or expired ticket'}
                    </p>
                  </div>
                )}

                {/* Scan Next */}
                <button
                  className="btn btn-primary btn-glow"
                  onClick={() => {
                    setScanResult(null)
                    setScanInput('')
                    setAttendanceStatus(null)
                    setCameraScanning(true)
                  }}
                  style={{ width: '100%', marginTop: '16px', padding: '14px', fontSize: '15px' }}
                >
                  Scan Next Ticket
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Subscription Plans ── */}
      {view === 'subscription' && (
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ color: '#e2e8f0', fontSize: '28px', marginBottom: '8px' }}>Choose Your Plan</h2>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              {hasActiveSubscription
                ? `You're on the ${subscription.planName} plan`
                : `${freeTrialRemaining} of ${FREE_TRIAL_LIMIT} free events remaining`}
            </p>
          </div>

          {/* Pricing Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {PLANS.map(plan => {
              const isCurrentPlan = hasActiveSubscription && subscription.plan === plan.id
              return (
                <div key={plan.id} style={{
                  position: 'relative',
                  background: plan.popular
                    ? 'linear-gradient(135deg, rgba(0,255,136,0.06) 0%, rgba(0,204,102,0.03) 100%)'
                    : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${plan.popular ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '20px', padding: '32px 24px', textAlign: 'center',
                  transition: 'all 0.3s ease',
                  transform: plan.popular ? 'scale(1.03)' : 'scale(1)',
                }}>
                  {plan.popular && (
                    <div style={{
                      position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #00ff88, #00cc66)', color: '#050505',
                      fontSize: '11px', fontWeight: 700, padding: '4px 16px', borderRadius: '20px',
                      textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>Most Popular</div>
                  )}
                  {isCurrentPlan && (
                    <div style={{
                      position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #3b82f6, #60a5fa)', color: '#fff',
                      fontSize: '11px', fontWeight: 700, padding: '4px 16px', borderRadius: '20px',
                      textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>Current Plan</div>
                  )}

                  <h3 style={{ color: '#e2e8f0', fontSize: '20px', marginBottom: '4px' }}>{plan.name}</h3>
                  <div style={{ color: '#00ff88', fontSize: '32px', fontWeight: 700, marginBottom: '4px' }}>{plan.price}</div>
                  <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>
                    Up to {plan.events === 999 ? 'unlimited' : plan.events} events/month
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', textAlign: 'left' }}>
                    {plan.features.map((f, i) => (
                      <li key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '6px 0', color: '#94a3b8', fontSize: '13px'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`btn ${plan.popular ? 'btn-primary btn-glow' : 'btn-secondary'}`}
                    onClick={() => handleSubscribe(plan)}
                    disabled={isCurrentPlan}
                    style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 600 }}
                  >
                    {isCurrentPlan ? 'Active' : 'Get Started'}
                  </button>
                </div>
              )
            })}
          </div>

          {/* FAQ / Info */}
          <div style={{
            marginTop: '32px', padding: '20px', textAlign: 'center',
            background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
              All plans include zero-knowledge proof verification, QR ticket generation, and real-time attendance tracking.
              Plans can be upgraded or canceled anytime.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrganizerDashboard

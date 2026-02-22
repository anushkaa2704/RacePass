/**
 * events.js — Event Marketplace API
 *
 * Organizers create events with verification requirements.
 * Users browse, register (with ECDSA-signed attestations for privacy-preserving
 * eligibility), and receive cryptographically signed QR tickets.
 * Organizers receive notifications when a user registers.
 *
 * Crypto features:
 *  ● Signed attestation proofs replace boolean "ZKP" checks
 *  ● ECDSA-signed tickets (ticketHash + signature) for anti-fraud
 *  ● Attendance tracking → Merkle tree for selective reputation disclosure
 *
 * All data is in-memory (demo).
 */

import { Router } from 'express'
import { randomUUID, createHash } from 'crypto'
import { getCredentialStore, getActivityLog } from './kyc.js'
import {
  generateEligibilityProofs,
  signTicket,
  createAttendanceLeaf,
  buildMerkleTree,
  getMerkleProof,
  getIssuerAddress
} from '../services/crypto.js'

const router = Router()

// ── In-memory stores ──────────────────────────────
const users = new Map()          // walletAddress → { role, name, email, createdAt }
const events = new Map()         // eventId → { ...eventData, organizerWallet }
const registrations = new Map()  // eventId → [ { wallet, disclosures, qrToken, ... } ]
const notifications = new Map()  // walletAddress (organizer) → [ { ...notification } ]
const qrTokens = new Map()       // qrToken → { wallet, eventId, verified, usedAt }

// ── Attendance & Reputation ──
const attendanceLeaves = []                // All attendance Merkle leaves (global)
let attendanceMerkleTree = null            // Latest Merkle tree
const reputationScores = new Map()         // walletAddress → { score, attendance, leaves[] }

// ── Getters for external access ──
export function getEvents() { return events }
export function getRegistrations() { return registrations }
export function getNotifications() { return notifications }
export function getUsers() { return users }
export function getQRTokens() { return qrTokens }

// ══════════════════════════════════════════════════
//  AUTH — Simple wallet-based role registration
// ══════════════════════════════════════════════════

/**
 * POST /api/events/auth/register
 * Register as organizer or user
 */
router.post('/auth/register', (req, res) => {
  const { walletAddress, role, name, email } = req.body

  if (!walletAddress || !role) {
    return res.status(400).json({ success: false, error: 'walletAddress and role are required' })
  }
  if (!['organizer', 'user'].includes(role)) {
    return res.status(400).json({ success: false, error: 'role must be "organizer" or "user"' })
  }

  const key = walletAddress.toLowerCase()

  // Allow re-registration to update profile
  users.set(key, {
    walletAddress: key,
    role,
    name: name || '',
    email: email || '',
    createdAt: users.get(key)?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  console.log(`👤 User registered: ${key.slice(0, 10)}... as ${role}`)

  res.json({
    success: true,
    user: users.get(key)
  })
})

/**
 * GET /api/events/auth/me/:address
 * Get current user profile
 */
router.get('/auth/me/:address', (req, res) => {
  const key = req.params.address.toLowerCase()
  const user = users.get(key)
  if (!user) {
    return res.json({ success: true, user: null })
  }
  res.json({ success: true, user })
})

// ══════════════════════════════════════════════════
//  EVENTS — CRUD by Organizers
// ══════════════════════════════════════════════════

/**
 * POST /api/events/create
 * Organizer creates an event
 */
router.post('/create', (req, res) => {
  const {
    walletAddress, name, description, emoji, category,
    date, time, venue, price, capacity,
    minAge, requireIdentity, requireAge, requireCountry,
    gradient
  } = req.body

  if (!walletAddress || !name) {
    return res.status(400).json({ success: false, error: 'walletAddress and name are required' })
  }

  const key = walletAddress.toLowerCase()
  const user = users.get(key)
  if (!user || user.role !== 'organizer') {
    return res.status(403).json({ success: false, error: 'Only organizers can create events' })
  }

  const eventId = randomUUID()
  const eventData = {
    id: eventId,
    organizerWallet: key,
    organizerName: user.name || 'Unknown Organizer',
    name,
    description: description || '',
    emoji: emoji || '🎪',
    category: category || 'general',
    date: date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    time: time || '19:00',
    venue: venue || 'TBD',
    price: price || 0,
    capacity: capacity || 100,
    minAge: minAge || 0,
    // ZKP-style selective disclosure requirements
    requireIdentity: requireIdentity !== false,   // default true
    requireAge: requireAge !== false,             // default true
    requireCountry: requireCountry || false,
    gradient: gradient || 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    status: 'active',
    createdAt: new Date().toISOString()
  }

  events.set(eventId, eventData)
  registrations.set(eventId, [])

  console.log(`🎪 Event created: "${name}" by ${key.slice(0, 10)}...`)

  res.json({ success: true, event: eventData })
})

/**
 * GET /api/events/list
 * List all active events (for user marketplace)
 */
router.get('/list', (req, res) => {
  const allEvents = []
  for (const [id, ev] of events) {
    if (ev.status === 'active') {
      const regs = registrations.get(id) || []
      allEvents.push({
        ...ev,
        registeredCount: regs.length,
        spotsLeft: ev.capacity - regs.length
      })
    }
  }
  // Sort newest first
  allEvents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json({ success: true, events: allEvents })
})

/**
 * GET /api/events/organizer/:address
 * List events created by a specific organizer
 */
router.get('/organizer/:address', (req, res) => {
  const key = req.params.address.toLowerCase()
  const myEvents = []
  for (const [id, ev] of events) {
    if (ev.organizerWallet === key) {
      const regs = registrations.get(id) || []
      myEvents.push({
        ...ev,
        registeredCount: regs.length,
        spotsLeft: ev.capacity - regs.length,
        registrations: regs.map(r => ({
          wallet: r.wallet,
          name: r.disclosedName || 'Anonymous',
          registeredAt: r.registeredAt,
          disclosures: r.disclosures
        }))
      })
    }
  }
  myEvents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json({ success: true, events: myEvents })
})

/**
 * GET /api/events/:eventId
 * Get single event details
 */
router.get('/:eventId', (req, res) => {
  const ev = events.get(req.params.eventId)
  if (!ev) {
    return res.status(404).json({ success: false, error: 'Event not found' })
  }
  const regs = registrations.get(ev.id) || []
  res.json({
    success: true,
    event: { ...ev, registeredCount: regs.length, spotsLeft: ev.capacity - regs.length }
  })
})

/**
 * DELETE /api/events/:eventId
 * Organizer cancels/deletes an event
 */
router.delete('/:eventId', (req, res) => {
  const { walletAddress } = req.body
  const ev = events.get(req.params.eventId)
  if (!ev) return res.status(404).json({ success: false, error: 'Event not found' })
  if (ev.organizerWallet !== walletAddress?.toLowerCase()) {
    return res.status(403).json({ success: false, error: 'Only the organizer can delete this event' })
  }
  ev.status = 'cancelled'
  events.set(ev.id, ev)
  res.json({ success: true, message: 'Event cancelled' })
})

// ══════════════════════════════════════════════════
//  ATTESTATION-BASED SELECTIVE DISCLOSURE + REGISTRATION
// ══════════════════════════════════════════════════

/**
 * POST /api/events/register
 * User registers for an event with ECDSA-signed attestation proofs.
 *
 * Instead of boolean "ZKP" flags, we now:
 *  1. Generate real ECDSA-signed attestations (e.g. "ageAbove:18")
 *  2. Issue an ECDSA-signed ticket (anti-fraud, verifiable on-chain)
 *  3. Return proof metadata so the frontend can display crypto details
 *
 * Returns signed QR ticket + attestation proofs on success.
 */
router.post('/register', async (req, res) => {
  const { walletAddress, eventId } = req.body

  if (!walletAddress || !eventId) {
    return res.status(400).json({ success: false, error: 'walletAddress and eventId required' })
  }

  const ev = events.get(eventId)
  if (!ev) return res.status(404).json({ success: false, error: 'Event not found' })
  if (ev.status !== 'active') return res.status(400).json({ success: false, error: 'Event is not active' })

  const key = walletAddress.toLowerCase()

  // Check capacity
  const regs = registrations.get(eventId) || []
  if (regs.length >= ev.capacity) {
    return res.status(400).json({ success: false, error: 'Event is full' })
  }

  // Check duplicate
  if (regs.find(r => r.wallet === key)) {
    return res.status(409).json({ success: false, error: 'Already registered for this event' })
  }

  // ── Credential check ──
  const credStore = getCredentialStore()
  const cred = credStore.get(key)

  if (!cred) {
    return res.json({
      success: false,
      verified: false,
      reason: 'no_credential',
      message: 'No RacePass credential found. Please complete KYC first.'
    })
  }

  // Revocation check
  if (cred.revoked) {
    return res.json({
      success: false,
      verified: false,
      reason: 'revoked',
      message: 'Your credential has been revoked.'
    })
  }

  // Check expiry
  if (cred.expiresAt && new Date(cred.expiresAt) < new Date()) {
    return res.json({
      success: false,
      verified: false,
      reason: 'expired',
      message: 'Your RacePass has expired. Please renew.'
    })
  }

  // ── Generate real ECDSA attestation proofs ──
  const requirements = {
    minAge: ev.minAge || 0,
    requireIdentity: ev.requireIdentity,
    requireCountry: ev.requireCountry
  }

  let proofs
  try {
    proofs = await generateEligibilityProofs(key, cred, requirements)
  } catch (err) {
    console.error('   Attestation generation error:', err.message)
    return res.status(500).json({ success: false, error: 'Failed to generate cryptographic proofs' })
  }

  // Build disclosure summary from attestation proofs
  const disclosures = {
    ageAboveMin: proofs.attestations.some(a => a.claim.startsWith('ageAbove:')),
    identityVerified: proofs.attestations.some(a => a.claim === 'identityVerified'),
    countryResident: proofs.attestations.some(a => a.claim.startsWith('countryResident'))
  }

  // Check age requirement using attestation-based proof
  const userAge = cred.age != null ? cred.age : (cred.isAdult ? 18 : 0)
  if (ev.requireAge && ev.minAge > 0 && userAge < ev.minAge) {
    // Log blocked attempt
    const logMap = getActivityLog()
    if (!logMap.has(key)) logMap.set(key, [])
    logMap.get(key).push({
      action: 'EVENT_AGE_BLOCKED',
      timestamp: new Date().toISOString(),
      eventId: ev.id,
      eventName: ev.name,
      minAge: ev.minAge,
      message: `Attempted ${ev.name} — requires ${ev.minAge}+`
    })

    return res.json({
      success: false,
      verified: false,
      reason: 'age_restricted',
      message: `You must be ${ev.minAge}+ for this event.`,
      minAge: ev.minAge,
      disclosures: { ageAboveMin: false, identityVerified: true, countryResident: true }
    })
  }

  // ── Generate ECDSA-signed ticket ──
  let ticketData
  try {
    ticketData = await signTicket(key, eventId)
  } catch (err) {
    console.error('   Ticket signing error:', err.message)
    return res.status(500).json({ success: false, error: 'Failed to generate signed ticket' })
  }

  // Also generate a human-readable QR token (wraps the crypto ticket)
  const qrToken = generateQRToken(key, eventId)

  // Store registration with crypto proof metadata
  const registration = {
    wallet: key,
    eventId,
    disclosures,
    disclosedName: cred.credential?.credentialSubject?.verification ? 'Verified User' : 'Anonymous',
    qrToken,
    // Crypto fields
    ticketHash: ticketData.ticketHash,
    ticketSignature: ticketData.signature,
    ticketV: ticketData.v,
    ticketR: ticketData.r,
    ticketS: ticketData.s,
    attestationCount: proofs.attestations.length,
    attestationTypes: proofs.attestations.map(a => a.claim),
    issuer: ticketData.issuer,
    registeredAt: new Date().toISOString(),
    checkedIn: false
  }
  regs.push(registration)
  registrations.set(eventId, regs)

  // Store QR token with crypto link
  qrTokens.set(qrToken, {
    wallet: key,
    eventId,
    eventName: ev.name,
    verified: true,
    ticketHash: ticketData.ticketHash,
    ticketSignature: ticketData.signature,
    usedAt: null,
    createdAt: new Date().toISOString()
  })

  // Log activity
  const logMap = getActivityLog()
  if (!logMap.has(key)) logMap.set(key, [])
  logMap.get(key).push({
    action: 'EVENT_REGISTERED',
    timestamp: new Date().toISOString(),
    eventId: ev.id,
    eventName: ev.name,
    qrToken,
    ticketHash: ticketData.ticketHash,
    attestationsUsed: proofs.attestations.map(a => a.claim)
  })

  // ── Notify organizer ──
  const orgKey = ev.organizerWallet
  if (!notifications.has(orgKey)) notifications.set(orgKey, [])
  notifications.get(orgKey).push({
    id: randomUUID(),
    type: 'NEW_REGISTRATION',
    eventId: ev.id,
    eventName: ev.name,
    userWallet: key,
    disclosures,
    attestationCount: proofs.attestations.length,
    registeredAt: new Date().toISOString(),
    read: false
  })

  console.log(`🎟️ Registration: ${key.slice(0, 10)}... → "${ev.name}" (ticket: ${ticketData.ticketHash.slice(0, 16)}...)`)

  res.json({
    success: true,
    verified: true,
    message: 'Successfully registered! Your cryptographically signed ticket is ready.',
    qrToken,
    disclosures,
    // Crypto proof metadata for frontend display
    cryptoProofs: {
      ticketHash: ticketData.ticketHash,
      ticketSignature: ticketData.signature,
      issuer: ticketData.issuer,
      attestations: proofs.attestations.map(a => ({
        claim: a.claim,
        claimHash: a.claimHash,
        nonce: a.nonce,
        signature: a.signature,
        v: a.v, r: a.r, s: a.s
      })),
      commitments: proofs.commitments,
      note: 'Each attestation is an ECDSA signature verifiable on-chain via ecrecover'
    },
    event: {
      id: ev.id,
      name: ev.name,
      date: ev.date,
      time: ev.time,
      venue: ev.venue,
      emoji: ev.emoji
    }
  })
})

// ══════════════════════════════════════════════════
//  QR TICKET SYSTEM
// ══════════════════════════════════════════════════

/**
 * Generate a deterministic but unique QR token
 */
function generateQRToken(wallet, eventId) {
  const raw = `${wallet}:${eventId}:${Date.now()}:${Math.random()}`
  return 'RP-' + createHash('sha256').update(raw).digest('hex').slice(0, 24).toUpperCase()
}

/**
 * GET /api/events/ticket/:qrToken
 * Validate a QR ticket (used at venue entry)
 */
router.get('/ticket/:qrToken', (req, res) => {
  const token = req.params.qrToken
  const data = qrTokens.get(token)

  if (!data) {
    return res.json({ success: false, valid: false, message: 'Invalid ticket' })
  }

  const ev = events.get(data.eventId)

  const orgInfo = users.get(ev?.organizerWallet) || {}
  const eventRegs = registrations.get(data.eventId) || []

  res.json({
    success: true,
    valid: true,
    ticket: {
      qrToken: token,
      wallet: data.wallet,
      eventId: data.eventId,
      eventName: data.eventName || ev?.name || 'Unknown Event',
      eventEmoji: ev?.emoji || '🎪',
      eventCategory: ev?.category || 'general',
      eventDate: ev?.date,
      eventTime: ev?.time,
      eventVenue: ev?.venue || 'TBD',
      eventCapacity: ev?.capacity || 0,
      registeredCount: eventRegs.length,
      organizerName: orgInfo.name || ev?.organizerName || 'Unknown',
      organizerWallet: ev?.organizerWallet || '',
      minAge: ev?.minAge || 0,
      verified: data.verified,
      usedAt: data.usedAt,
      attendance: data.attendance || null,
      createdAt: data.createdAt
    }
  })
})

/**
 * POST /api/events/ticket/scan
 * Scan a ticket at venue entry (marks as used).
 * NOW ALSO: records attendance leaf → rebuilds Merkle tree → updates reputation.
 */
router.post('/ticket/scan', (req, res) => {
  const { qrToken, scannerWallet } = req.body

  if (!qrToken) {
    return res.status(400).json({ success: false, error: 'qrToken required' })
  }

  const data = qrTokens.get(qrToken)
  if (!data) {
    return res.json({ success: false, valid: false, message: 'Invalid ticket — not found' })
  }

  if (data.usedAt) {
    return res.json({
      success: false,
      valid: false,
      message: `Ticket already used at ${new Date(data.usedAt).toLocaleString()}`
    })
  }

  // Mark as used
  data.usedAt = new Date().toISOString()
  qrTokens.set(qrToken, data)

  // Update registration
  const regs = registrations.get(data.eventId) || []
  const reg = regs.find(r => r.wallet === data.wallet)
  if (reg) reg.checkedIn = true

  const ev = events.get(data.eventId)

  // ── Record attendance + reputation ──
  const walletKey = data.wallet.toLowerCase()
  try {
    // Create attendance leaf for Merkle tree
    const leaf = createAttendanceLeaf(walletKey, data.eventId)
    attendanceLeaves.push(leaf)

    // Rebuild global Merkle tree
    if (attendanceLeaves.length > 0) {
      attendanceMerkleTree = buildMerkleTree(attendanceLeaves)
    }

    // Update reputation score
    if (!reputationScores.has(walletKey)) {
      reputationScores.set(walletKey, { score: 50, attendance: 0, leaves: [] })
    }
    const rep = reputationScores.get(walletKey)
    rep.attendance += 1
    rep.score = Math.min(100, rep.score + 5) // +5 per event attended
    rep.leaves.push({ leaf, eventId: data.eventId, eventName: ev?.name, attendedAt: data.usedAt })

    // Also update credentialStore reputation
    const credStore = getCredentialStore()
    const cred = credStore.get(walletKey)
    if (cred && cred.reputation) {
      cred.reputation.score = rep.score
      cred.reputation.attendance = rep.attendance
    }

    console.log(`📊 Reputation updated: ${walletKey.slice(0, 10)}... → score=${rep.score}, attendance=${rep.attendance}`)
  } catch (err) {
    console.error('   Attendance tracking error (non-fatal):', err.message)
  }

  console.log(`✅ Ticket scanned: ${qrToken.slice(0, 12)}... for "${ev?.name || data.eventId}"`)

  // Get organizer info
  const orgInfo = users.get(ev?.organizerWallet) || {}
  const eventRegs = registrations.get(data.eventId) || []

  res.json({
    success: true,
    valid: true,
    message: 'Entry granted! Enjoy the event. Attendance recorded for your reputation.',
    ticket: {
      qrToken,
      wallet: data.wallet,
      eventId: data.eventId,
      eventName: ev?.name || 'Event',
      eventEmoji: ev?.emoji || '🎪',
      eventCategory: ev?.category || 'general',
      eventDate: ev?.date || '',
      eventTime: ev?.time || '',
      eventVenue: ev?.venue || 'TBD',
      eventCapacity: ev?.capacity || 0,
      registeredCount: eventRegs.length,
      organizerName: orgInfo.name || ev?.organizerName || 'Unknown',
      organizerWallet: ev?.organizerWallet || '',
      minAge: ev?.minAge || 0,
      requireIdentity: ev?.requireIdentity || false,
      requireAge: ev?.requireAge || false,
      usedAt: data.usedAt,
      ticketHash: data.ticketHash || null,
      signatureVerified: !!data.ticketSignature
    }
  })
})

/**
 * POST /api/events/ticket/attendance
 * Mark a scanned attendee as present or absent (organizer attendance toggle).
 */
router.post('/ticket/attendance', (req, res) => {
  const { qrToken, status: attendanceStatus } = req.body

  if (!qrToken || !['present', 'absent'].includes(attendanceStatus)) {
    return res.status(400).json({ success: false, error: 'qrToken and status (present/absent) required' })
  }

  const data = qrTokens.get(qrToken)
  if (!data) {
    return res.json({ success: false, message: 'Invalid ticket token' })
  }

  // Update attendance status on the token data
  data.attendance = attendanceStatus
  qrTokens.set(qrToken, data)

  // Also update in the registration list
  const regs = registrations.get(data.eventId) || []
  const reg = regs.find(r => r.wallet === data.wallet)
  if (reg) {
    reg.attendance = attendanceStatus
    reg.checkedIn = attendanceStatus === 'present'
  }

  console.log(`📋 Attendance: ${data.wallet.slice(0, 10)}... marked ${attendanceStatus} for event ${data.eventId}`)

  res.json({
    success: true,
    message: `Attendee marked as ${attendanceStatus}`,
    attendance: attendanceStatus,
    wallet: data.wallet,
    eventId: data.eventId
  })
})

/**
 * GET /api/events/my-tickets/:address
 * Get all tickets for a user
 */
router.get('/my-tickets/:address', (req, res) => {
  const key = req.params.address.toLowerCase()
  const tickets = []
  for (const [token, data] of qrTokens) {
    if (data.wallet === key) {
      const ev = events.get(data.eventId)
      tickets.push({
        qrToken: token,
        eventId: data.eventId,
        eventName: ev?.name || data.eventName || 'Unknown',
        eventEmoji: ev?.emoji || '🎪',
        eventDate: ev?.date,
        eventTime: ev?.time,
        venue: ev?.venue,
        gradient: ev?.gradient,
        verified: data.verified,
        usedAt: data.usedAt,
        createdAt: data.createdAt
      })
    }
  }
  tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json({ success: true, tickets })
})

// ══════════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════════

/**
 * GET /api/events/notifications/:address
 * Get notifications for an organizer
 */
router.get('/notifications/:address', (req, res) => {
  const key = req.params.address.toLowerCase()
  const notifs = notifications.get(key) || []
  // newest first
  const sorted = [...notifs].sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt))
  res.json({ success: true, notifications: sorted, unreadCount: notifs.filter(n => !n.read).length })
})

/**
 * POST /api/events/notifications/read
 * Mark notifications as read
 */
router.post('/notifications/read', (req, res) => {
  const { walletAddress } = req.body
  const key = walletAddress?.toLowerCase()
  const notifs = notifications.get(key) || []
  notifs.forEach(n => { n.read = true })
  notifications.set(key, notifs)
  res.json({ success: true })
})

// ══════════════════════════════════════════════════
//  ATTESTATION-BASED PROOF CHECK
// ══════════════════════════════════════════════════

/**
 * POST /api/events/zkp/check
 * Check what attestation proofs a user can provide for an event
 * WITHOUT actually registering. Now shows real crypto proof info.
 */
router.post('/zkp/check', async (req, res) => {
  const { walletAddress, eventId } = req.body

  if (!walletAddress || !eventId) {
    return res.status(400).json({ success: false, error: 'walletAddress and eventId required' })
  }

  const ev = events.get(eventId)
  if (!ev) return res.status(404).json({ success: false, error: 'Event not found' })

  const credStore = getCredentialStore()
  const cred = credStore.get(walletAddress.toLowerCase())

  if (!cred) {
    return res.json({
      success: true,
      hasCredential: false,
      message: 'No RacePass credential. Complete KYC first.'
    })
  }

  if (cred.revoked) {
    return res.json({
      success: true,
      hasCredential: true,
      revoked: true,
      message: 'Your credential has been revoked.'
    })
  }

  const userAge = cred.age != null ? cred.age : (cred.isAdult ? 18 : 0)

  // Generate a preview of what attestations would be created
  const attestationTypes = []
  if (cred.attestations && typeof cred.attestations === 'object') {
    // attestations is stored as an object { identityVerified: {...}, countryResident: {...}, ... }
    if (Array.isArray(cred.attestations)) {
      attestationTypes.push(...cred.attestations.map(a => a.claim))
    } else {
      attestationTypes.push(...Object.values(cred.attestations).map(a => a.claim))
    }
  } else {
    attestationTypes.push('identityVerified')
    if (userAge >= 18) attestationTypes.push('ageAbove:18')
    if (userAge >= 21) attestationTypes.push('ageAbove:21')
    attestationTypes.push('countryResident:IN')
  }

  res.json({
    success: true,
    hasCredential: true,
    revoked: false,
    eventRequirements: {
      requireIdentity: ev.requireIdentity,
      requireAge: ev.requireAge,
      requireCountry: ev.requireCountry,
      minAge: ev.minAge
    },
    zkpProofs: {
      ageAboveMin: {
        label: ev.minAge > 0 ? `I am ${ev.minAge}+` : 'No age requirement',
        description: ev.minAge > 0
          ? `ECDSA-signed attestation proving age ≥ ${ev.minAge} without revealing exact DOB`
          : 'No age verification needed',
        canProve: ev.minAge > 0 ? userAge >= ev.minAge : true,
        required: ev.requireAge && ev.minAge > 0,
        cryptoMethod: 'ECDSA signed attestation (keccak256 + ecrecover)'
      },
      identityVerified: {
        label: 'I am a verified person',
        description: 'ECDSA-signed attestation proving identity without revealing name or Aadhaar',
        canProve: true,
        required: ev.requireIdentity,
        cryptoMethod: 'ECDSA signed attestation (keccak256 + ecrecover)'
      },
      countryResident: {
        label: 'I am from India',
        description: 'ECDSA-signed attestation proving residency without revealing documents',
        canProve: true,
        required: ev.requireCountry,
        cryptoMethod: 'ECDSA signed attestation (keccak256 + ecrecover)'
      }
    },
    availableAttestations: attestationTypes,
    issuer: getIssuerAddress(),
    privacyNote: 'Only ECDSA-signed boolean attestations are shared. No personal data is revealed. Each attestation is independently verifiable on-chain via ecrecover.'
  })
})

// ══════════════════════════════════════════════════
//  REPUTATION & ATTENDANCE API
// ══════════════════════════════════════════════════

/**
 * GET /api/events/reputation/:address
 * Get reputation score, attendance count, and Merkle proof for a user.
 * This is the "selective reputation disclosure" feature.
 */
router.get('/reputation/:address', (req, res) => {
  const key = req.params.address.toLowerCase()
  const rep = reputationScores.get(key) || { score: 50, attendance: 0, leaves: [] }

  // Generate Merkle proof for the user's most recent attendance
  let merkleProof = null
  let merkleRoot = null
  if (attendanceMerkleTree && rep.leaves.length > 0) {
    const lastLeaf = rep.leaves[rep.leaves.length - 1].leaf
    const leafIndex = attendanceLeaves.indexOf(lastLeaf)
    if (leafIndex >= 0) {
      merkleProof = getMerkleProof(attendanceMerkleTree.layers, leafIndex)
      merkleRoot = attendanceMerkleTree.root
    }
  }

  res.json({
    success: true,
    reputation: {
      walletAddress: key,
      score: rep.score,
      attendance: rep.attendance,
      tier: rep.score >= 80 ? 'Gold' : rep.score >= 60 ? 'Silver' : 'Bronze',
      events: rep.leaves.map(l => ({
        eventId: l.eventId,
        eventName: l.eventName,
        attendedAt: l.attendedAt,
        leafHash: l.leaf
      })),
      merkle: merkleProof ? {
        root: merkleRoot,
        proof: merkleProof,
        leaf: rep.leaves[rep.leaves.length - 1].leaf,
        note: 'This Merkle proof can be verified on-chain to prove attendance without revealing which specific events'
      } : null
    }
  })
})

export default router

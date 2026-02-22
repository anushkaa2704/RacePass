/**
 * server.js - Main Backend Server
 * 
 * This is the entry point for our backend.
 * 
 * What is Express?
 * - A web framework for Node.js
 * - Makes it easy to create API endpoints
 * - Handles HTTP requests and responses
 * 
 * What is CORS?
 * - "Cross-Origin Resource Sharing"
 * - Allows frontend (port 5173) to talk to backend (port 3001)
 */

// Load environment variables from .env file
import dotenv from 'dotenv'
dotenv.config()

// Import Express and middleware
import express from 'express'
import cors from 'cors'

// Import our routes
import kycRoutes from './routes/kyc.js'
import verifyRoutes from './routes/verify.js'
import thirdPartyRoutes from './routes/thirdParty.js'
import eventsRoutes from './routes/events.js'

// Create the Express app
const app = express()

// ============================================
// MIDDLEWARE
// ============================================

// Enable CORS - allows frontend and Chrome extension to call our API
// Chrome extension service workers send origin as chrome-extension://EXTENSION_ID
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Chrome extension background scripts)
    if (!origin) return callback(null, true)
    // Allow localhost and chrome extensions
    const allowed = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5678'
    ]
    if (allowed.includes(origin) || origin.startsWith('chrome-extension://')) {
      return callback(null, true)
    }
    callback(null, true) // allow all for local demo
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}))

// Parse JSON bodies (with size limit)
app.use(express.json({ limit: '1mb' }))

// Log all requests
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`)
  next()
})

// Timeout middleware — abort requests that take too long
app.use((req, res, next) => {
  res.setTimeout(15000, () => {
    console.error('⏰ Request timed out:', req.path)
    if (!res.headersSent) {
      res.status(408).json({ success: false, error: 'Request timed out. Please try again.' })
    }
  })
  next()
})

// ============================================
// ROUTES
// ============================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'RacePass Backend is running!' })
})

// KYC routes - handles credential creation
app.use('/api/kyc', kycRoutes)

// Verify routes - check verification status
app.use('/api/verify', verifyRoutes)

// Third-party routes - for concert/event websites
app.use('/api/third-party', thirdPartyRoutes)

// Event marketplace routes - organizers, events, tickets, ZKP
app.use('/api/events', eventsRoutes)

// ============================================
// ERROR HANDLING
// ============================================

// Handle 404 - Route not found
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` })
})

// Handle errors (malformed JSON, etc.)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Invalid JSON in request body' })
  }
  console.error('❌ Unhandled server error:', err.message)
  res.status(500).json({ success: false, error: 'Internal server error' })
})

// Handle uncaught exceptions so server doesn’t crash
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message)
})
process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason)
})

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3001

app.listen(PORT, '0.0.0.0', () => {
  console.log('')
  console.log('🚀 ================================')
  console.log('   RacePass Backend Started!')
  console.log('================================')
  console.log(`📍 Server: http://localhost:${PORT}`)
  console.log(`📱 LAN:    http://0.0.0.0:${PORT} (accessible from phone)`)
  console.log(`❤️  Health: http://localhost:${PORT}/health`)
  console.log('================================')
  console.log('')
})

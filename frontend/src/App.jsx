/**
 * App.jsx - Main Application Component
 *
 * Features:
 * - Global Error Boundary (catches any React crash)
 * - Offline / Online detection banner
 * - Wallet connection + routing
 * - 3D animated nav, page transitions
 */

import { useState, useEffect, Component } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'

import HomePage from './pages/HomePage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import ConcertPage from './pages/ConcertPage'
import ProfilePage from './pages/ProfilePage'

import { connectWallet, getWalletAddress, checkIfWalletConnected } from './utils/wallet'

/* ─────────── Error Boundary ─────────── */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', background: '#0a0a14', color: '#fff', padding: '40px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px', animation: 'bounceIn3D 0.8s' }}>💥</div>
          <h1 style={{ color: '#ff5252', marginBottom: '10px' }}>Something went wrong</h1>
          <p style={{ color: '#94a3b8', maxWidth: '500px', textAlign: 'center', marginBottom: '20px' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            className="btn btn-primary btn-glow"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}
          >
            ↻ Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

/* ─────────── Offline Banner ─────────── */
function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'linear-gradient(90deg, #ffc107, #ff9800)',
      color: '#1a1a2e', textAlign: 'center',
      padding: '10px', fontWeight: 'bold', fontSize: '14px',
      animation: 'alertSlide 0.4s ease'
    }}>
      ⚠️ You are offline — some features may not work.
    </div>
  )
}

/* ─────────── Page Transition Wrapper ─────────── */
function PageTransition({ children }) {
  const location = useLocation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [location.pathname])

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {children}
    </div>
  )
}

/* ─────────── App ─────────── */
function App() {
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState('ethereum')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [scrolled, setScrolled] = useState(false)

  // Track scroll for header glass effect
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 30) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    checkExistingConnection()

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setIsWalletConnected(false)
          setWalletAddress('')
          setIsVerified(false)
        } else {
          setWalletAddress(accounts[0])
        }
      })
    }
  }, [])

  async function checkExistingConnection() {
    try {
      const connected = await checkIfWalletConnected()
      if (connected) {
        const address = await getWalletAddress()
        setWalletAddress(address)
        setIsWalletConnected(true)
      }
    } catch {
      // silently fail
    }
  }

  async function handleConnectWallet() {
    setIsLoading(true)
    setError('')
    try {
      const address = await connectWallet()
      setWalletAddress(address)
      setIsWalletConnected(true)
    } catch (err) {
      setError(err.message)
    }
    setIsLoading(false)
  }

  function shortenAddress(addr) {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <BrowserRouter>
        <div className="app-container">
          <header className="header" style={{
            backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'blur(10px)',
            borderBottom: scrolled ? '1px solid rgba(0, 217, 255, 0.08)' : '1px solid transparent',
            boxShadow: scrolled ? '0 4px 30px rgba(0, 0, 0, 0.3)' : 'none',
            transition: 'all 0.4s ease'
          }}>
            <Link to="/" className="logo">Race<span>Pass</span></Link>
            <nav className="nav">
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/signup" className="nav-link">Signup</Link>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/concert" className="nav-link">Events</Link>
              {isWalletConnected ? (
                <Link to="/profile" className="wallet-info" style={{
                  animation: 'fadeUp 0.4s ease',
                  background: 'rgba(0, 255, 136, 0.08)',
                  border: '1px solid rgba(0, 255, 136, 0.2)',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  textDecoration: 'none',
                  cursor: 'pointer'
                }}>
                  <span>🟢</span>
                  <span className="wallet-address">{shortenAddress(walletAddress)}</span>
                </Link>
              ) : (
                <button className="btn btn-primary btn-glow" onClick={handleConnectWallet} disabled={isLoading}>
                  {isLoading ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </nav>
          </header>

          {error && (
            <div className="alert alert-error" style={{ animation: 'alertSlide 0.4s ease' }}>
              {error}
            </div>
          )}

          <PageTransition>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/signup" element={
                <SignupPage isWalletConnected={isWalletConnected} walletAddress={walletAddress}
                  onConnectWallet={handleConnectWallet} setIsVerified={setIsVerified} />
              } />
              <Route path="/dashboard" element={
                <DashboardPage isWalletConnected={isWalletConnected} walletAddress={walletAddress}
                  isVerified={isVerified} setIsVerified={setIsVerified}
                  selectedNetwork={selectedNetwork} setSelectedNetwork={setSelectedNetwork} />
              } />
              <Route path="/concert" element={
                <ConcertPage isWalletConnected={isWalletConnected} walletAddress={walletAddress}
                  onConnectWallet={handleConnectWallet} selectedNetwork={selectedNetwork} />
              } />
              <Route path="/profile" element={
                <ProfilePage isWalletConnected={isWalletConnected} walletAddress={walletAddress}
                  isVerified={isVerified} />
              } />
            </Routes>
          </PageTransition>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App

/**
 * HomePage.jsx - Landing Page
 *
 * 3D hero section + floating particles + animated features + how-it-works
 */

import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

const FEATURES = [
  { icon: '🔒', title: 'Privacy First', desc: 'Verify your identity once — no personal data is ever stored or shared.', color: '#00d9ff' },
  { icon: '📷', title: 'Quick KYC', desc: 'Upload your document, get verified in seconds, and you\'re good to go.', color: '#8b5cf6' },
  { icon: '🎂', title: 'Age Verification', desc: 'Events instantly know if you meet the age requirement — nothing more.', color: '#00ff88' },
  { icon: '⚡', title: 'Cross-Chain', desc: 'Verify on Ethereum and Polygon testnets. One identity, multiple chains.', color: '#ffc107' },
  { icon: '✅', title: 'One-Time KYC', desc: 'Verify once, use everywhere. No need to re-submit for every service.', color: '#06b6d4' },
  { icon: '🗑️', title: 'Self-Sovereign', desc: 'You own your identity. Revoke your RacePass anytime — full control, zero lock-in.', color: '#ff6b6b' }
]

/** Lightweight floating particles (8 instead of 20, no rotate) */
function FloatingParticles() {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    size: 3 + Math.random() * 4,
    left: Math.random() * 100,
    delay: Math.random() * 10,
    duration: 18 + Math.random() * 12,
    color: ['rgba(0,217,255,0.08)', 'rgba(99,102,241,0.08)', 'rgba(0,255,136,0.06)'][i % 3]
  }))

  return (
    <div className="floating-particles">
      {particles.map(p => (
        <div key={p.id} className="particle" style={{
          width: p.size,
          height: p.size,
          left: `${p.left}%`,
          background: p.color,
          animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`
        }} />
      ))}
    </div>
  )
}

/** Intersection Observer for scroll-triggered animations */
function useScrollReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible(true)
    }, { threshold: 0.15 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, visible]
}

function HomePage() {
  const [featuresRef, featuresVisible] = useScrollReveal()
  const [stepsRef, stepsVisible] = useScrollReveal()

  return (
    <div className="page-center" style={{ paddingTop: '60px', position: 'relative' }}>
      <FloatingParticles />

      {/* ── Hero ── */}
      <div style={{ animation: 'fadeUp 0.6s ease', padding: '20px' }}>
        <h1 className="page-title" style={{ fontSize: '52px', lineHeight: 1.12 }}>
          Your Identity,
          <br />
          <span className="gradient-text" style={{ fontSize: '56px' }}>
            Your Control
          </span>
        </h1>

        <p className="page-description" style={{ fontSize: '17px', marginTop: '16px' }}>
          RacePass lets you verify your identity once and use it everywhere.
          Get verified in seconds and access events — all while keeping your data private.
        </p>
      </div>



      {/* ── CTA ── */}
      <div style={{
        display: 'flex', gap: '14px', marginBottom: '60px',
        animation: 'fadeUp 0.5s 0.2s both'
      }}>
        <Link to="/signup" className="btn btn-primary btn-glow" style={{ padding: '15px 36px', fontSize: '16px' }}>
          🚀 Get Started
        </Link>
        <Link to="/concert" className="btn btn-secondary" style={{ padding: '15px 36px', fontSize: '16px' }}>
          🎪 Try Events Demo
        </Link>
      </div>

      {/* ── How It Works ── */}
      <div
        ref={stepsRef}
        className="card glass-card how-it-works"
        style={{
          maxWidth: '820px', width: '100%',
          opacity: stepsVisible ? 1 : 0,
          transform: stepsVisible ? 'perspective(800px) rotateX(0) translateY(0)' : 'perspective(800px) rotateX(8deg) translateY(40px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <h2 className="card-title" style={{ textAlign: 'center' }}>How It Works</h2>
        <div className="steps">
          {['Connect Wallet', 'Upload Document', 'Get Verified', 'Access Events'].map((label, i) => (
            <div key={i} className="step active" style={{
              opacity: stepsVisible ? 1 : 0,
              transform: stepsVisible ? 'translateY(0)' : 'translateY(15px)',
              transition: `all 0.4s ${0.1 * i}s ease`
            }}>
              <div className="step-number" style={{
                background: 'linear-gradient(135deg, #00d9ff, #6366f1)',
                color: 'white',
                boxShadow: '0 4px 20px rgba(0, 217, 255, 0.3)'
              }}>{i + 1}</div>
              <div className="step-label" style={{ color: '#94a3b8' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <div
        ref={featuresRef}
        style={{ maxWidth: '900px', width: '100%', marginTop: '24px' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="card feature-card"
              style={{
                padding: '28px',
                opacity: featuresVisible ? 1 : 0,
                transform: featuresVisible ? 'translateY(0)' : 'translateY(25px)',
                transition: `opacity 0.4s ${0.06 * i}s ease, transform 0.4s ${0.06 * i}s ease`
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '14px', display: 'inline-block' }}>{f.icon}</div>
              <h3 style={{ color: f.color, marginBottom: '8px', fontSize: '17px', fontWeight: 700 }}>{f.title}</h3>
              <p style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>


    </div>
  )
}

export default HomePage

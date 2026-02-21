/**
 * HomePage.jsx - Landing Page
 *
 * 3D hero section + floating particles + animated features + how-it-works
 */

import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

const FEATURES = [
  { icon: '🔒', title: 'Privacy First', desc: 'Your personal data never touches the blockchain. Only a cryptographic fingerprint is stored.', color: '#00d9ff' },
  { icon: '📷', title: 'Aadhaar OCR', desc: 'Upload your Aadhaar card — we extract DOB automatically using in-browser OCR. No data leaves your device.', color: '#8b5cf6' },
  { icon: '🎂', title: 'Age Verification', desc: 'Events get a simple "is 18+" boolean. They never see your name, DOB, or Aadhaar number.', color: '#00ff88' },
  { icon: '⚡', title: 'Cross-Chain', desc: 'Verify on Ethereum and Polygon testnets. One identity, multiple chains.', color: '#ffc107' },
  { icon: '✅', title: 'One-Time KYC', desc: 'Verify once, use everywhere. No need to re-submit for every service.', color: '#06b6d4' },
  { icon: '🗑️', title: 'Self-Sovereign', desc: 'You own your identity. Revoke your RacePass anytime — full control, zero lock-in.', color: '#ff6b6b' }
]

const STATS = [
  { value: '256-bit', label: 'Encryption' },
  { value: '0', label: 'PII Stored' },
  { value: '<3s', label: 'Verification' },
  { value: '100%', label: 'Privacy Score' }
]

/** Mouse-tracking 3D tilt for a card */
function useTilt3D() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function handleMove(e) {
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      el.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateZ(10px)`
    }

    function handleLeave() {
      el.style.transform = 'perspective(800px) rotateY(0) rotateX(0) translateZ(0)'
      el.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
    }

    function handleEnter() {
      el.style.transition = 'transform 0.1s ease'
    }

    el.addEventListener('mousemove', handleMove)
    el.addEventListener('mouseleave', handleLeave)
    el.addEventListener('mouseenter', handleEnter)
    return () => {
      el.removeEventListener('mousemove', handleMove)
      el.removeEventListener('mouseleave', handleLeave)
      el.removeEventListener('mouseenter', handleEnter)
    }
  }, [])

  return ref
}

/** Floating particle background */
function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: 3 + Math.random() * 6,
    left: Math.random() * 100,
    delay: Math.random() * 15,
    duration: 12 + Math.random() * 18,
    color: ['rgba(0,217,255,0.15)', 'rgba(99,102,241,0.15)', 'rgba(0,255,136,0.12)'][i % 3]
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
  const heroTilt = useTilt3D()
  const [featuresRef, featuresVisible] = useScrollReveal()
  const [stepsRef, stepsVisible] = useScrollReveal()

  return (
    <div className="page-center" style={{ paddingTop: '60px', position: 'relative' }}>
      <FloatingParticles />

      {/* ── Hero ── */}
      <div
        ref={heroTilt}
        style={{
          animation: 'title3DIn 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
          transformStyle: 'preserve-3d',
          padding: '20px',
          borderRadius: '24px',
          cursor: 'default'
        }}
      >
        <h1 className="page-title" style={{ fontSize: '52px', lineHeight: 1.12 }}>
          Your Identity,
          <br />
          <span className="gradient-text" style={{ fontSize: '56px' }}>
            Your Control
          </span>
        </h1>

        <p className="page-description" style={{ fontSize: '17px', marginTop: '16px' }}>
          RacePass lets you verify your identity once and use it everywhere.
          Upload your Aadhaar, get verified in seconds, and access events — all while keeping your data private.
        </p>
      </div>

      {/* ── Stats Bar ── */}
      <div style={{
        display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center',
        marginBottom: '20px', animation: 'fadeInUp3D 0.8s 0.3s both'
      }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            textAlign: 'center',
            padding: '12px 20px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.06)',
            minWidth: '100px',
            transition: 'all 0.3s',
          }}>
            <div style={{ color: '#00d9ff', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>{s.value}</div>
            <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── CTA ── */}
      <div style={{
        display: 'flex', gap: '14px', marginBottom: '60px',
        animation: 'fadeInUp3D 0.8s 0.4s both',
        perspective: '600px'
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
          {['Connect Wallet', 'Upload Aadhaar', 'Get Verified', 'Access Events'].map((label, i) => (
            <div key={i} className="step active" style={{
              animationDelay: `${0.1 * i}s`,
              animation: stepsVisible ? `fadeInUp3D 0.5s ${0.15 * i}s both` : 'none'
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
                transform: featuresVisible ? 'perspective(800px) rotateX(0) translateY(0) translateZ(0)' : 'perspective(800px) rotateX(15deg) translateY(50px) translateZ(-40px)',
                transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 * i}s`
              }}
            >
              <div style={{
                fontSize: '36px', marginBottom: '14px',
                display: 'inline-block',
                animation: featuresVisible ? `floatY 4s ${0.5 * i}s ease-in-out infinite` : 'none'
              }}>{f.icon}</div>
              <h3 style={{ color: f.color, marginBottom: '8px', fontSize: '17px', fontWeight: 700 }}>{f.title}</h3>
              <p style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trust Bar ── */}
      <div className="trust-bar" style={{
        marginTop: '40px', padding: '18px 28px', borderRadius: '16px',
        background: 'rgba(0, 255, 136, 0.04)', border: '1px solid rgba(0, 255, 136, 0.1)',
        display: 'flex', gap: '28px', flexWrap: 'wrap', justifyContent: 'center',
        fontSize: '13px', color: '#64748b',
        backdropFilter: 'blur(8px)'
      }}>
        <span>🔐 <strong style={{ color: '#00ff88' }}>Zero-Knowledge</strong> design</span>
        <span>🧠 <strong style={{ color: '#00d9ff' }}>In-browser</strong> OCR processing</span>
        <span>⛓️ <strong style={{ color: '#8b5cf6' }}>On-chain</strong> fingerprint only</span>
        <span>🗑️ <strong style={{ color: '#ff6b6b' }}>Revocable</strong> anytime</span>
      </div>
    </div>
  )
}

export default HomePage

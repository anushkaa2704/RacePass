/**
 * HomePage.jsx - Landing Page
 *
 * 3D hero section + floating particles + animated features + how-it-works
 */
import Spline from "@splinetool/react-spline"
import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useSpring, useTransform, AnimatePresence } from 'framer-motion'

const FEATURE_ICONS = {
  lock: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  camera: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  shield: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  zap: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  check: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  user: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}

const FEATURES = [
  { icon: FEATURE_ICONS.lock, title: 'Privacy First', desc: 'Your personal data never touches the blockchain. Only a cryptographic fingerprint is stored.', color: '#00ff88' },
  { icon: FEATURE_ICONS.camera, title: 'Aadhaar OCR', desc: 'Upload your Aadhaar card \u2014 we extract DOB automatically using in-browser OCR. No data leaves your device.', color: '#00cc66' },
  { icon: FEATURE_ICONS.shield, title: 'Age Verification', desc: 'Events get a simple "is 18+" boolean. They never see your name, DOB, or Aadhaar number.', color: '#00ff88' },
  { icon: FEATURE_ICONS.zap, title: 'Cross-Chain', desc: 'Verify on Ethereum and Polygon testnets. One identity, multiple chains.', color: '#00ff88' },
  { icon: FEATURE_ICONS.check, title: 'One-Time KYC', desc: 'Verify once, use everywhere. No need to re-submit for every service.', color: '#00cc66' },
  { icon: FEATURE_ICONS.user, title: 'Self-Sovereign', desc: 'You own your identity. Revoke your RacePass anytime \u2014 full control, zero lock-in.', color: '#00ff88' }
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
    color: ['rgba(0,255,136,0.15)', 'rgba(0,204,102,0.15)', 'rgba(0,255,234,0.12)'][i % 3]
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

/** Full-screen "Swift Car" Preloader */
function PageLoader() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#050505',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      {/* High-speed car streak */}
      <motion.div
        initial={{ x: '-100vw' }}
        animate={{ x: '100vw' }}
        transition={{
          duration: 1.2,
          ease: [0.76, 0, 0.24, 1], // Custom fast-in-fast-out
          repeat: 0
        }}
        style={{
          width: '200px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        <svg viewBox="0 0 100 50" style={{ width: '100%', filter: 'drop-shadow(0 0 30px #00ff88)' }}>
          <path d="M10 25 L30 10 L80 10 L95 25 L80 40 L30 40 Z" fill="#00ff88" />
          <path d="M35 15 L75 15 L85 25 L75 35 L35 35 Z" fill="#050505" />
          <motion.path
            d="M 5 25 L -40 25"
            stroke="#00ff88"
            strokeWidth="4"
            strokeDasharray="10 5"
            animate={{ strokeDashoffset: [0, 50] }}
            transition={{ duration: 0.2, repeat: Infinity, ease: "linear" }}
          />
        </svg>
      </motion.div>

      {/* Loading Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          position: 'absolute',
          bottom: '10%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div className="logo" style={{ fontSize: '32px' }}>
          Race<span>Pass</span>
        </div>
        <div style={{ color: '#00cc66', fontSize: '12px', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Initializing Identity Engine...
        </div>
      </motion.div>
    </motion.div>
  )
}

/** Grey Carbon Exhaust system for Lightning McQueen */
function ExhaustSmoke({ scrollProgress }) {
  const count = 18
  const path = "M 500 40 C 100 40, 100 240, 500 240 S 900 440, 500 440"

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const delay = i * 0.012
        const progress = useTransform(scrollProgress, (v) => Math.max(0, v - delay) * 100 + "%")
        const opac = useTransform(scrollProgress, (v) => v > delay ? Math.max(0, 0.7 - (i * 0.04)) : 0)

        return (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: '28px',
              height: '28px',
              background: 'radial-gradient(circle, rgba(100, 100, 100, 0.5) 0%, transparent 80%)',
              borderRadius: '50%',
              filter: 'blur(8px)',
              zIndex: 1,
              pointerEvents: 'none',
              offsetPath: `path("${path}")`,
              offsetDistance: progress,
              opacity: opac
            }}
            animate={{
              scale: [1, 3, 5],
              x: [0, (i % 2 === 0 ? 15 : -15)], // Drifting smoke
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
        )
      })}
    </>
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate initial sequence
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1800)
    return () => clearTimeout(timer)
  }, [])

  const { scrollYProgress } = useScroll({
    target: stepsRef,
    offset: ["start center", "end center"]
  })
  const scrollProgressSpring = useSpring(scrollYProgress, { stiffness: 30, damping: 20 })
  const carDistance = useTransform(scrollProgressSpring, [0, 1], ["0%", "100%"])

  return (
    <>
      <AnimatePresence>
        {loading && <PageLoader />}
      </AnimatePresence>

      <div className="home-wrapper">
        {/* ── Background Spline ── */}
        <div className="page-center">
          {/* ── Hero Split ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '40px',
            paddingTop: '80px',
            marginBottom: '60px',
            flexWrap: 'wrap'
          }}>
            {/* LEFT: Identity Text */}
            <div
              ref={heroTilt}
              style={{
                flex: '1 1 500px',
                animation: 'title3DIn 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
                transformStyle: 'preserve-3d',
                textAlign: 'left'
              }}
            >
              <h1 className="page-title" style={{ fontSize: '64px', lineHeight: 1.1, marginBottom: '20px' }}>
                Your Identity,<br />
                <span className="gradient-text" style={{ fontSize: '72px', color: '#00ff88' }}>
                  Your Control
                </span>
              </h1>

              <p className="page-description" style={{ fontSize: '18px', maxWidth: '540px', color: '#94a3b8' }}>
                RacePass lets you verify once and use everywhere.
                Upload your Aadhaar, get verified in seconds, and stay private.
              </p>

              {/* CTA Buttons in Hero */}
              <div style={{
                display: 'flex', gap: '16px', marginTop: '40px',
                animation: 'fadeInUp3D 0.8s 0.4s both',
                perspective: '600px'
              }}>
                <Link to="/signup" className="btn btn-primary btn-glow" style={{ padding: '16px 40px', fontSize: '16px' }}>
                  Get Started
                </Link>
                <Link to="/concert" className="btn btn-secondary" style={{ padding: '16px 40px', fontSize: '16px' }}>
                  Try Events
                </Link>
              </div>
            </div>

            {/* RIGHT: Spline Interaction */}
            <div style={{
              flex: '1 1 400px',
              height: '500px',
              animation: 'emerge3D 1s cubic-bezier(0.16, 1, 0.3, 1)',
              minWidth: '350px'
            }}>
              <Spline
                scene="https://prod.spline.design/1C5t0fuuM-SHmRA8/scene.splinecode"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>

          {/* ── Stats Bar (Centered) ── */}
          <div style={{
            display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center',
            marginBottom: '60px', animation: 'fadeInUp3D 0.8s 0.3s both'
          }}>
            {STATS.map((s, i) => (
              <div key={i} style={{
                textAlign: 'center',
                padding: '16px 30px',
                background: 'rgba(0, 255, 136, 0.03)',
                borderRadius: '18px',
                border: '1px solid rgba(0, 255, 136, 0.1)',
                minWidth: '130px',
                transition: 'all 0.3s',
              }}>
                <div style={{ color: '#00ff88', fontSize: '24px', fontWeight: 800 }}>{s.value}</div>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── How It Works (3D S-Curve Track) ── */}
          <section
            ref={stepsRef}
            style={{
              width: '100%',
              maxWidth: '1100px',
              margin: '100px 0',
              position: 'relative',
              padding: '60px 0',
              perspective: '1200px'
            }}
          >
            <div style={{
              transform: 'rotateX(15deg)',
              transformStyle: 'preserve-3d',
              position: 'relative',
              width: '100%',
              height: '600px'
            }}>
              <h2 className="card-title" style={{
                textAlign: 'center',
                fontSize: '48px',
                marginBottom: '60px',
                color: '#00ff88',
                textShadow: '0 0 30px rgba(0, 255, 136, 0.3)'
              }}>
                Your Journey to Identity
              </h2>

              {/* SVG Track */}
              <svg
                viewBox="0 0 1000 500"
                fill="none"
                style={{
                  position: 'absolute',
                  top: '120px',
                  left: 0,
                  width: '100%',
                  height: '480px',
                  zIndex: 0,
                  overflow: 'visible'
                }}
              >
                {/* Main S-Path Road Background */}
                <path
                  d="M 500 40 C 100 40, 100 240, 500 240 S 900 440, 500 440"
                  stroke="rgba(0, 255, 136, 0.05)"
                  strokeWidth="80"
                  strokeLinecap="round"
                />
                <path
                  d="M 500 40 C 100 40, 100 240, 500 240 S 900 440, 500 440"
                  stroke="#0a0a0a"
                  strokeWidth="70"
                  strokeLinecap="round"
                />

                {/* Glowing Edges */}
                <path
                  d="M 500 40 C 100 40, 100 240, 500 240 S 900 440, 500 440"
                  stroke="rgba(0, 255, 136, 0.2)"
                  strokeWidth="72"
                  strokeLinecap="round"
                  strokeDasharray="4 8"
                />

                {/* Active Progress Line */}
                <motion.path
                  d="M 500 40 C 100 40, 100 240, 500 240 S 900 440, 500 440"
                  stroke="#00ff88"
                  strokeWidth="4"
                  strokeLinecap="round"
                  style={{
                    pathLength: scrollProgressSpring,
                    filter: 'drop-shadow(0 0 15px #00ff88)'
                  }}
                />
              </svg>

              {/* Nodes */}
              {[
                { x: 500, y: 70, label: 'Connect Wallet', icon: 'W' },
                { x: 180, y: 220, label: 'Upload Aadhaar', icon: 'ID' },
                { x: 820, y: 380, label: 'Get Verified', icon: 'V' },
                { x: 500, y: 520, label: 'Access Events', icon: 'E' }
              ].map((node, i) => (
                <motion.div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${node.x / 10}%`,
                    top: `${node.y}px`,
                    transform: 'translate(-50%, -50%) translateZ(20px)',
                    zIndex: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2, type: 'spring', stiffness: 100 }}
                >
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '24px',
                    background: 'rgba(5, 5, 5, 0.9)',
                    border: '2px solid #00ff88',
                    color: '#00ff88',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    boxShadow: '0 0 40px rgba(0, 255, 136, 0.2), inset 0 0 20px rgba(0, 255, 136, 0.1)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    {i + 1}
                  </div>
                  <div style={{
                    background: 'rgba(5, 5, 5, 0.8)',
                    padding: '16px 28px',
                    borderRadius: '16px',
                    border: '1px solid rgba(0, 255, 136, 0.2)',
                    backdropFilter: 'blur(20px)',
                    textAlign: 'center',
                    minWidth: '220px',
                    boxShadow: '0 15px 45px rgba(0,0,0,0.6)'
                  }}>
                    <div style={{ fontSize: '12px', color: '#00cc66', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{node.icon} STEP 0{i + 1}</div>
                    <div style={{ color: '#ffffff', fontSize: '20px', fontWeight: 800 }}>{node.label}</div>
                  </div>
                </motion.div>
              ))}

              {/* Grey Carbon Exhaust */}
              <ExhaustSmoke scrollProgress={scrollProgressSpring} />

              {/* Lightning McQueen (Top View) */}
              <motion.div
                style={{
                  position: 'absolute',
                  top: '120px',
                  left: 0,
                  width: '100%',
                  height: '480px',
                  zIndex: 3,
                  pointerEvents: 'none'
                }}
              >
                <motion.div
                  style={{
                    width: '100px',
                    height: '50px',
                    offsetPath: 'path("M 500 40 C 100 40, 100 240, 500 240 S 900 440, 500 440")',
                    offsetDistance: carDistance,
                    offsetRotate: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <svg viewBox="0 0 100 50" style={{ width: '100px', filter: 'drop-shadow(0 0 15px rgba(255, 0, 0, 0.4))' }}>
                    {/* Lightning McQueen Body */}
                    <rect x="5" y="10" width="90" height="30" rx="12" fill="#e12e2a" />
                    {/* Roof */}
                    <rect x="35" y="13" width="30" height="24" rx="6" fill="#f44336" />
                    {/* Lightning Bolt Livery */}
                    <path d="M40 32 L70 25 L50 35 Z" fill="#ffeb3b" />
                    <path d="M40 18 L70 25 L50 15 Z" fill="#ffeb3b" />
                    {/* Number 95 */}
                    <text x="45" y="28" fill="#ffffff" style={{ fontSize: '12px', fontWeight: 900, fontFamily: 'Arial Black' }}>95</text>
                    {/* Rear Spoiler */}
                    <rect x="5" y="5" width="10" height="40" rx="2" fill="#b71c1c" />
                    {/* Wheels */}
                    <rect x="20" y="5" width="15" height="8" rx="2" fill="#111" />
                    <rect x="20" y="37" width="15" height="8" rx="2" fill="#111" />
                    <rect x="65" y="5" width="15" height="8" rx="2" fill="#111" />
                    <rect x="65" y="37" width="15" height="8" rx="2" fill="#111" />
                  </svg>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* ── Features ── */}
          <div
            style={{ maxWidth: '900px', width: '100%', marginTop: '60px', marginBottom: '80px' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  className="card feature-card"
                  initial={{ opacity: 0, y: 40, rotateX: 15, scale: 0.9 }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                    rotateX: 0,
                    scale: 1
                  }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{
                    duration: 0.7,
                    delay: i * 0.1,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  whileHover={{
                    y: -8,
                    boxShadow: '0 20px 40px rgba(0, 255, 136, 0.1)',
                    borderColor: 'rgba(0, 255, 136, 0.4)'
                  }}
                  style={{
                    padding: '32px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  <div style={{
                    fontSize: '42px',
                    marginBottom: '20px',
                    display: 'inline-block',
                    filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))'
                  }}>{f.icon}</div>
                  <h3 style={{ color: f.color, marginBottom: '12px', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.01em' }}>{f.title}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: 1.7 }}>{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── Trust Bar ── */}
          <div className="trust-bar" style={{
            marginTop: '40px', padding: '18px 28px', borderRadius: '16px',
            background: 'rgba(0, 255, 136, 0.04)', border: '1px solid rgba(0, 255, 136, 0.1)',
            display: 'flex', gap: '28px', flexWrap: 'wrap', justifyContent: 'center',
            fontSize: '13px', color: '#64748b',
            backdropFilter: 'blur(8px)',
            marginBottom: '100px'
          }}>
            <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'4px'}}><polyline points="20 6 9 17 4 12"/></svg> <strong style={{ color: '#00ff88' }}>Zero-Knowledge</strong> design</span>
            <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'4px'}}><polyline points="20 6 9 17 4 12"/></svg> <strong style={{ color: '#00ff88' }}>In-browser</strong> OCR processing</span>
            <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'4px'}}><polyline points="20 6 9 17 4 12"/></svg> <strong style={{ color: '#00ff88' }}>On-chain</strong> fingerprint only</span>
            <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'4px'}}><polyline points="20 6 9 17 4 12"/></svg> <strong style={{ color: '#00ff88' }}>Revocable</strong> anytime</span>
          </div>

          {/* ── Footer ── */}
          <footer style={{
            width: '100%',
            borderTop: '1px solid rgba(0, 255, 136, 0.1)',
            padding: '80px 0 40px',
            background: 'linear-gradient(to bottom, transparent, rgba(0, 255, 136, 0.02))',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Decorative glow line */}
            <div style={{
              position: 'absolute', top: 0, left: '10%', right: '10%',
              height: '1px', background: 'linear-gradient(90deg, transparent, #00ff88, transparent)',
              opacity: 0.3
            }} />

            <div style={{
              maxWidth: '1100px', margin: '0 auto', padding: '0 20px',
              display: 'flex', justifyContent: 'space-between', gap: '60px', flexWrap: 'wrap'
            }}>
              {/* Logo Section */}
              <div style={{ flex: '1 1 300px' }}>
                <div className="logo" style={{ marginBottom: '20px', display: 'inline-block' }}>
                  Race<span>Pass</span>
                </div>
                <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, maxWidth: '280px' }}>
                  The ultimate decentralized identity layer for events.
                  Private, secure, and lightning fast.
                </p>
              </div>

              {/* Quick Links */}
              <div style={{ display: 'flex', gap: '80px', flexWrap: 'wrap' }}>
                <div>
                  <h4 style={{ color: '#00ff88', marginBottom: '20px', fontSize: '16px', fontWeight: 700 }}>Platform</h4>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <li><Link to="/signup" className="nav-link" style={{ fontSize: '14px' }}>Get Started</Link></li>
                    <li><Link to="/concert" className="nav-link" style={{ fontSize: '14px' }}>Marketplace</Link></li>
                    <li><Link to="/dashboard" className="nav-link" style={{ fontSize: '14px' }}>Identity</Link></li>
                  </ul>
                </div>

                <div>
                  <h4 style={{ color: '#00ff88', marginBottom: '20px', fontSize: '16px', fontWeight: 700 }}>Contact</h4>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <li><a href="#" className="nav-link" style={{ fontSize: '14px' }}>Twitter</a></li>
                    <li><a href="#" className="nav-link" style={{ fontSize: '14px' }}>Discord</a></li>
                    <li><a href="mailto:hello@racepass.io" className="nav-link" style={{ fontSize: '14px' }}>Support</a></li>
                  </ul>
                </div>
              </div>
            </div>

            <div style={{
              maxWidth: '1100px', margin: '60px auto 0', padding: '0 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '30px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px'
            }}>
              <div style={{ color: '#475569', fontSize: '14px' }}>
                © {new Date().getFullYear()} RacePass. All rights reserved. Built for the decentralized web.
              </div>
              <div style={{ display: 'flex', gap: '24px' }}>
                <span style={{ color: '#475569', fontSize: '14px', cursor: 'pointer' }}>Privacy Policy</span>
                <span style={{ color: '#475569', fontSize: '14px', cursor: 'pointer' }}>Terms of Service</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}

export default HomePage

/**
 * SignupPage.jsx - KYC Signup Page
 *
 * Features:
 * - Aadhaar card image upload with OCR (Tesseract.js, runs in-browser)
 * - Auto-extracts DOB, name, aadhaar number, gender from the card
 * - Validates the image is an actual Aadhaar card
 * - Image preview with drag-and-drop
 * - Live age calculation + minor warning
 * - MetaMask not-installed fallback
 * - Duplicate (409) and rate-limit (429) handling
 * - 3D card tilt, animated steps, perspective transforms
 */

import { useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitKYC } from '../utils/api'
import { isMetaMaskInstalled } from '../utils/wallet'
import { extractAadhaarData } from '../utils/aadhaarOCR'

function SignupPage({ isWalletConnected, walletAddress, onConnectWallet, setIsVerified }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const cardRef = useRef(null)

  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    aadhaarNumber: ''
  })

  // Image / OCR
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrRunning, setOcrRunning] = useState(false)
  const [ocrDone, setOcrDone] = useState(false)
  const [ocrError, setOcrError] = useState('')
  const [isAadhaar, setIsAadhaar] = useState(null)

  // Steps & status
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resultData, setResultData] = useState(null)

  // Drag state for the drop zone
  const [dragging, setDragging] = useState(false)

  // 3D tilt removed for performance

  // ── Live age calculation ──
  const age = useMemo(() => {
    if (!formData.dateOfBirth) return null
    const birth = new Date(formData.dateOfBirth)
    const today = new Date()
    let a = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--
    return a
  }, [formData.dateOfBirth])

  const isMinor = age !== null && age < 18
  const isInvalidAge = age !== null && (age < 0 || age > 150)
  const aadhaarComplete = formData.aadhaarNumber.length === 12

  // ── Handlers ──
  function handleInputChange(e) {
    const { name, value } = e.target
    if (name === 'aadhaarNumber' && value !== '' && !/^\d*$/.test(value)) return
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const processImage = useCallback(async (file) => {
    if (!file.type.startsWith('image/')) {
      setOcrError('Please upload an image file (JPG, PNG, etc.)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setOcrError('Image too large. Maximum 5 MB.')
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setOcrError('')
    setOcrDone(false)
    setIsAadhaar(null)
    setOcrRunning(true)
    setOcrProgress(0)

    try {
      const result = await extractAadhaarData(file, (p) => setOcrProgress(p))

      if (!result.isAadhaar) {
        setIsAadhaar(false)
        setOcrError('This does not appear to be an Aadhaar card. Please upload a valid Aadhaar card image.')
        setOcrRunning(false)
        return
      }

      setIsAadhaar(true)
      setFormData(prev => ({
        fullName: result.name || prev.fullName,
        dateOfBirth: result.dob || prev.dateOfBirth,
        aadhaarNumber: result.aadhaarNumber || prev.aadhaarNumber
      }))
      setOcrDone(true)
    } catch (err) {
      setOcrError('OCR failed: ' + (err.message || 'Could not read the image. Try a clearer photo.'))
    }

    setOcrRunning(false)
  }, [])

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (file) processImage(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processImage(file)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function handleRemoveImage() {
    setImageFile(null)
    setImagePreview(null)
    setOcrDone(false)
    setIsAadhaar(null)
    setOcrError('')
    setOcrProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (!imageFile) throw new Error('Please upload your Aadhaar card image')
      if (isAadhaar === false) throw new Error('Please upload a valid Aadhaar card image')
      if (!formData.fullName.trim()) throw new Error('Please enter your full name')
      if (!formData.dateOfBirth) throw new Error('Date of birth is required — it should be extracted from the Aadhaar')
      if (isInvalidAge) throw new Error('Invalid date of birth')
      if (!aadhaarComplete) throw new Error('Aadhaar must be exactly 12 digits')

      const result = await submitKYC(formData, walletAddress)
      setSuccess(true)
      setResultData(result.data || result)
      setIsVerified(true)
      setTimeout(() => navigate('/dashboard'), 2500)
    } catch (err) {
      setError(err.message || 'Submission failed.')
    }

    setIsLoading(false)
  }

  // Auto-advance step
  if (isWalletConnected && currentStep === 1) {
    setCurrentStep(2)
  }

  // ── MetaMask not installed ──
  if (!isMetaMaskInstalled()) {
    return (
      <div className="page-center">
        <div className="card glass-card" style={{ maxWidth: '480px', textAlign: 'center', animation: 'emerge3D 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', animation: 'float3D 6s ease-in-out infinite' }}>🦊</div>
          <h2 style={{ color: '#ff5252', marginBottom: '12px' }}>MetaMask Not Detected</h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '15px' }}>
            RacePass requires MetaMask to connect your blockchain wallet.
          </p>
          <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Install MetaMask
          </a>
          <p style={{ color: '#64748b', fontSize: '12px', marginTop: '14px' }}>After installing, refresh this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-center" style={{ position: 'relative' }}>
      <h1 className="page-title" style={{ animation: 'title3DIn 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        Get Your <span className="gradient-text">RacePass</span>
      </h1>
      <p className="page-description" style={{ animation: 'fadeInUp3D 0.8s 0.2s both' }}>
        Upload your Aadhaar card — we'll extract your details automatically.
        <br />
        <span style={{ color: '#00ff88', fontSize: '14px' }}>Everything runs locally in your browser. No image is sent to any server.</span>
      </p>

      {/* Steps indicator */}
      <div className="steps" style={{ marginBottom: '35px', animation: 'fadeInUp3D 0.6s 0.1s both' }}>
        {[
          { num: 1, label: 'Connect Wallet' },
          { num: 2, label: 'Upload Aadhaar' },
          { num: 3, label: 'Get Verified' }
        ].map(s => (
          <div key={s.num} className={`step ${currentStep >= s.num ? 'active' : ''} ${currentStep > s.num || (s.num === 3 && success) ? 'completed' : ''}`}>
            <div className="step-number">{currentStep > s.num || (s.num === 3 && success) ? '✓' : s.num}</div>
            <div className="step-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div
        ref={cardRef}
        className="card glass-card"
        style={{
          maxWidth: '540px', width: '100%',
          animation: 'slideUp3D 0.6s 0.2s both',
          transformStyle: 'preserve-3d',
          willChange: 'transform'
        }}
      >

        {/* ── Step 1: Connect Wallet ── */}
        {currentStep === 1 && (
          <div style={{ textAlign: 'center', padding: '20px 0', animation: 'bounceIn3D 0.6s' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'floatY 4s ease-in-out infinite' }}>🔗</div>
            <h2 className="card-title" style={{ textAlign: 'center' }}>Connect Your Wallet</h2>
            <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '15px' }}>
              Connect MetaMask to link your blockchain identity.
            </p>
            <button className="btn btn-primary btn-glow" onClick={onConnectWallet} style={{ padding: '14px 32px', fontSize: '16px' }}>
              🦊 Connect MetaMask
            </button>
          </div>
        )}

        {/* ── Step 2: Upload & Form ── */}
        {currentStep === 2 && !success && (
          <form onSubmit={handleSubmit}>
            <h2 className="card-title">
              <span style={{ marginRight: '8px' }}>🪪</span> KYC Verification
            </h2>

            {/* Wallet badge */}
            <div className="alert alert-info" style={{ marginBottom: '24px', fontSize: '13px', padding: '10px 14px' }}>
              <span style={{ marginRight: '6px' }}>🟢</span>
              {walletAddress?.slice(0, 10)}...{walletAddress?.slice(-6)}
            </div>

            {/* ── Aadhaar Image Upload ── */}
            <div className="form-group">
              <label className="form-label">
                Aadhaar Card Image <span style={{ color: '#ff5252' }}>*</span>
              </label>

              {!imagePreview ? (
                <div
                  className={`upload-zone ${dragging ? 'upload-zone-active' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={() => setDragging(false)}
                >
                  <div style={{ fontSize: '44px', marginBottom: '10px', animation: 'floatY 3s ease-in-out infinite' }}>📷</div>
                  <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>
                    {dragging ? 'Drop your Aadhaar here' : 'Upload Aadhaar Card'}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '13px' }}>
                    Drag & drop or click to browse • JPG / PNG • Max 5 MB
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <div className="image-preview-container" style={{ animation: 'slideUp3D 0.4s' }}>
                    <img src={imagePreview} alt="Aadhaar Preview" className="image-preview" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="image-remove-btn"
                      title="Remove image"
                    >✕</button>
                  </div>

                  {/* OCR progress */}
                  {ocrRunning && (
                    <div style={{ marginTop: '12px', animation: 'fadeIn 0.3s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>🔍 Scanning Aadhaar card...</span>
                        <span style={{ color: '#00d9ff', fontSize: '13px', fontWeight: 600 }}>{ocrProgress}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${ocrProgress}%` }}></div>
                      </div>
                    </div>
                  )}

                  {/* Validation badges */}
                  {!ocrRunning && isAadhaar === true && (
                    <div className="ocr-badge ocr-badge-success">
                      ✅ Valid Aadhaar card detected — details extracted
                    </div>
                  )}
                  {!ocrRunning && isAadhaar === false && (
                    <div className="ocr-badge ocr-badge-error">
                      ❌ Not an Aadhaar card — please upload a valid Aadhaar
                    </div>
                  )}
                </div>
              )}

              {ocrError && !ocrRunning && (
                <div className="alert alert-error" style={{ marginTop: '10px', fontSize: '13px' }}>
                  {ocrError}
                </div>
              )}
            </div>

            <div className="form-divider">
              <span>Extracted Details</span>
            </div>

            {/* Full Name */}
            <div className="form-group">
              <label className="form-label">Full Name <span style={{ color: '#ff5252' }}>*</span></label>
              <input
                type="text"
                name="fullName"
                className="form-input"
                placeholder={ocrDone ? 'Auto-filled from Aadhaar' : 'Will be extracted from Aadhaar'}
                value={formData.fullName}
                onChange={handleInputChange}
                required
                autoComplete="name"
              />
            </div>

            {/* DOB */}
            <div className="form-group">
              <label className="form-label">Date of Birth <span style={{ color: '#ff5252' }}>*</span></label>
              <input
                type="date"
                name="dateOfBirth"
                className="form-input"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                max={new Date().toISOString().split('T')[0]}
                required
              />
              {age !== null && !isInvalidAge && (
                <div style={{
                  marginTop: '8px', fontSize: '13px',
                  color: isMinor ? '#ffc107' : '#00ff88',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  animation: 'fadeIn 0.3s'
                }}>
                  {isMinor ? '⚠️' : '✅'} Age: {age}
                  {isMinor && ' — Under 18. Some age-restricted events won\'t be accessible.'}
                </div>
              )}
              {isInvalidAge && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#ff5252' }}>❌ Invalid date of birth</div>
              )}
              {ocrDone && formData.dateOfBirth && (
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                  📋 Auto-filled from Aadhaar OCR. You can edit if needed.
                </div>
              )}
            </div>

            {/* Aadhaar number */}
            <div className="form-group">
              <label className="form-label">Aadhaar Number <span style={{ color: '#ff5252' }}>*</span></label>
              <input
                type="text"
                name="aadhaarNumber"
                className="form-input"
                placeholder={ocrDone ? 'Auto-filled from Aadhaar' : 'Will be extracted from Aadhaar'}
                value={formData.aadhaarNumber}
                onChange={handleInputChange}
                maxLength={12}
                inputMode="numeric"
                required
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <small style={{ color: '#64748b', fontSize: '12px' }}>
                  {ocrDone ? '📋 Extracted from Aadhaar card' : '12-digit number from Aadhaar'}
                </small>
                <small style={{ color: aadhaarComplete ? '#00ff88' : '#64748b', fontSize: '12px', fontWeight: aadhaarComplete ? 600 : 400 }}>
                  {formData.aadhaarNumber.length}/12 {aadhaarComplete && '✓'}
                </small>
              </div>
            </div>

            {/* Minor warning */}
            {isMinor && (
              <div className="alert alert-warning" style={{ marginBottom: '16px', fontSize: '14px' }}>
                ⚠️ <strong>Under 18:</strong> You can still get a RacePass, but age-restricted events
                (concerts 18+, bars 21+) will deny access.
              </div>
            )}

            {error && <div className="alert alert-error" style={{ fontSize: '14px' }}>{error}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-glow"
              style={{ width: '100%', padding: '14px', fontSize: '16px', marginTop: '8px' }}
              disabled={isLoading || isInvalidAge || ocrRunning || isAadhaar === false}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></span>
                  Verifying...
                </span>
              ) : '🚀 Submit KYC'}
            </button>
          </form>
        )}

        {/* ── Step 3: Success ── */}
        {success && (
          <div style={{ textAlign: 'center', padding: '30px 10px', animation: 'emerge3D 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ fontSize: '80px', marginBottom: '16px', animation: 'bounceIn3D 0.8s' }}>🎉</div>
            <h2 style={{ color: '#00ff88', marginBottom: '10px' }}>Verification Successful!</h2>
            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
              Your RacePass has been activated. Redirecting to dashboard...
            </p>
            <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
            {resultData?.isAdult === false && (
              <div className="alert alert-warning">
                Note: Your RacePass is active but marked as under-18. Some events may be restricted.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Privacy notice */}
      <div style={{
        maxWidth: '540px', textAlign: 'center', marginTop: '20px',
        color: '#64748b', fontSize: '12px', lineHeight: '1.6',
        animation: 'fadeInUp3D 0.8s 0.5s both'
      }}>
        🔒 <strong>Privacy guarantee:</strong> Your Aadhaar image is processed
        <strong> entirely in your browser</strong> using Tesseract.js OCR.
        No image or personal data is ever sent to any server.
        Only a SHA-256 fingerprint is stored on-chain.
      </div>
    </div>
  )
}

export default SignupPage

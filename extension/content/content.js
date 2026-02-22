/**
 * content.js — RacePass Content Script
 *
 * Three modes of operation:
 *
 * MODE 1 — Explicit: sites with data-racepass="true" get a verify button.
 *
 * MODE 2 — BookMyShow book-button interceptor:
 *   Lets the movie page load normally so users can browse details.
 *   When the user clicks "Book Tickets" / "Book Pass", the attractive
 *   RacePass verification overlay appears. If verified → booking proceeds.
 *   If age is insufficient → access denied.
 *
 * MODE 3 — Generic: any other site with "18+" text near a booking button.
 *
 * MODE 4 — Paytm instant blocker:
 *   Shows full-page age gate immediately on paytm.com.
 *   18+ required to use any financial services.
 *   If verified → site unlocks. If underage → blocked.
 */

(function () {
  'use strict'

  if (window.__racepassInjected) return
  window.__racepassInjected = true

  var verifiedUpToAge = -1  // highest minAge level successfully verified this session

  // ════════════════════════════════════════════
  //  UTILITY: extract movie/event name from page
  // ════════════════════════════════════════════
  function getMovieName() {
    // Paytm pages — describe the current page/section
    if (location.hostname.includes('paytm.com')) {
      var path = location.pathname.toLowerCase()
      if (path.includes('/login') || path.includes('/signin')) return 'Paytm Sign In'
      if (path.includes('/wealth') || path.includes('/mutual-fund')) return 'Paytm Investments'
      if (path.includes('/insurance')) return 'Paytm Insurance'
      if (path.includes('/credit-card') || path.includes('/bank')) return 'Paytm Banking'
      if (path.includes('/loan') || path.includes('/lending')) return 'Paytm Loans'
      if (path.includes('/gold') || path.includes('/digital-gold')) return 'Paytm Gold'
      if (path.includes('/stocks') || path.includes('/trading')) return 'Paytm Stocks'
      var h1 = document.querySelector('h1')
      if (h1 && h1.textContent.trim().length > 0 && h1.textContent.trim().length < 80) {
        return h1.textContent.trim()
      }
      return 'Paytm'
    }
    // Try H1 first (BMS movie pages have the title as H1)
    var h1 = document.querySelector('h1')
    if (h1 && h1.textContent.trim().length > 0 && h1.textContent.trim().length < 100) {
      return h1.textContent.trim()
    }
    // Try OG title meta tag
    var ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle && ogTitle.content) return ogTitle.content.trim()
    // Fallback to document title
    var title = document.title.replace(/\s*[-|]\s*BookMyShow.*$/i, '').trim()
    return title || 'Unknown Content'
  }

  function getSiteName() {
    if (location.hostname.includes('bookmyshow.com')) return 'BookMyShow'
    if (location.hostname.includes('paytm.com')) return 'Paytm'
    if (location.protocol === 'file:') return 'Demo Site'
    return location.hostname.replace(/^www\./, '')
  }

  // ════════════════════════════════════════════
  //  UTILITY: verify with background script
  // ════════════════════════════════════════════
  async function verifyWithRacePass(minAge, eventType) {
    var movieName = getMovieName()
    var siteName = getSiteName()
    var response = await chrome.runtime.sendMessage({
      type: 'VERIFY_FOR_SITE', minAge: minAge, eventType: eventType,
      movieName: movieName, siteName: siteName
    })

    if (response.error === 'No wallet connected') {
      var address = prompt(
        'Connect your MetaMask wallet to RacePass\n\n' +
        'Paste your wallet address (MetaMask → click account → copy):'
      )
      if (!address || !address.startsWith('0x') || address.length !== 42) {
        return { verified: false, error: address ? 'Invalid address' : 'cancelled' }
      }
      await chrome.runtime.sendMessage({ type: 'CONNECT_WALLET', walletAddress: address })
      response = await chrome.runtime.sendMessage({
        type: 'VERIFY_FOR_SITE', walletAddress: address, minAge: minAge, eventType: eventType,
        movieName: movieName, siteName: siteName
      })
    }
    return response
  }

  // ═══════════════════════════════════════════════════
  //  FULL-PAGE BLOCKER (used by Mode 2 & Mode 3)
  // ═══════════════════════════════════════════════════
  function showFullPageBlocker(minAge, ratingLabel, eventType, originalTarget) {
    // Don't double-inject
    if (document.getElementById('racepass-fullpage-blocker')) return

    // Freeze the page — no scroll, no click-through
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'

    var overlay = document.createElement('div')
    overlay.id = 'racepass-fullpage-blocker'
    overlay.className = 'racepass-blocker-overlay'

    var titleText = minAge > 0 ? 'Age-Restricted Content' : 'Identity Verification Required'
    var subtitleText = minAge > 0
      ? 'This content is rated <strong>' + ratingLabel + '</strong>.<br>You must be <strong>' + minAge + '+</strong> to view this page.'
      : 'This content is rated <strong>' + ratingLabel + '</strong>.<br>Please verify your identity to continue.'

    overlay.innerHTML =
      '<div class="racepass-blocker-card">' +
        '<div class="racepass-blocker-icon">🔒</div>' +
        '<h2 class="racepass-blocker-title">' + titleText + '</h2>' +
        '<p class="racepass-blocker-subtitle">' + subtitleText + '</p>' +
        '<div class="racepass-blocker-divider"></div>' +
        '<p class="racepass-blocker-desc">' +
          'Verify your age instantly with <strong>RacePass</strong> — your identity stays private. ' +
          'No personal data is shared with this website.' +
        '</p>' +
        '<div id="racepass-blocker-btn-area"></div>' +
        '<div class="racepass-blocker-footer">' +
          '<span class="racepass-blocker-badge">🛡️ Privacy First</span>' +
          '<span class="racepass-blocker-badge">⛓️ Blockchain Verified</span>' +
          '<span class="racepass-blocker-badge">🔐 Zero Data Shared</span>' +
        '</div>' +
      '</div>'

    document.body.appendChild(overlay)

    // Build verify button
    var btnArea = document.getElementById('racepass-blocker-btn-area')
    var verifyBtn = document.createElement('button')
    verifyBtn.className = 'racepass-blocker-verify-btn'
    verifyBtn.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 20 20" fill="none">' +
        '<rect width="20" height="20" rx="4" fill="#00d9ff"/>' +
        '<path d="M6 10l3 3 5-6" stroke="#0a0a14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>' +
      '<span>Verify Age with RacePass</span>'

    verifyBtn.addEventListener('click', async function (e) {
      e.preventDefault()
      e.stopPropagation()
      verifyBtn.disabled = true
      verifyBtn.innerHTML = '<div class="racepass-spinner-injected"></div><span>Verifying your identity...</span>'

      try {
        var res = await verifyWithRacePass(minAge, eventType)

        if (res.error === 'cancelled') {
          resetVerifyBtn()
          return
        }

        if (res.verified) {
          verifiedUpToAge = Math.max(verifiedUpToAge, minAge)

          // Success animation
          verifyBtn.innerHTML = '<span style="font-size:22px">✅</span><span>Verified! Unlocking page...</span>'
          verifyBtn.classList.add('racepass-blocker-btn-success')

          fireVerifiedEvents(res.walletAddress, eventType)

          // Fade out, remove blocker, then re-trigger original book action
          setTimeout(function () {
            overlay.classList.add('racepass-blocker-fadeout')
            setTimeout(function () {
              overlay.remove()
              document.documentElement.style.overflow = ''
              document.body.style.overflow = ''
              // Automatically click the original book button
              if (originalTarget) {
                setTimeout(function () { originalTarget.click() }, 100)
              }
            }, 400)
          }, 800)

        } else if (res.reason === 'age_restricted') {
          verifyBtn.innerHTML = '<span style="font-size:22px">🚫</span><span>Access Denied — You are ' + (res.userAge != null ? res.userAge : '?') + ' yrs old, need ' + minAge + '+</span>'
          verifyBtn.classList.add('racepass-blocker-btn-error')
          setTimeout(resetVerifyBtn, 5000)

        } else {
          verifyBtn.innerHTML = '<span style="font-size:22px">❌</span><span>Not Verified — Complete KYC on RacePass first</span>'
          verifyBtn.classList.add('racepass-blocker-btn-error')
          setTimeout(resetVerifyBtn, 4000)
        }
      } catch (err) {
        verifyBtn.innerHTML = '<span style="font-size:22px">⚠️</span><span>Connection error — try again</span>'
        verifyBtn.classList.add('racepass-blocker-btn-error')
        setTimeout(resetVerifyBtn, 3000)
      }
    })

    function resetVerifyBtn() {
      verifyBtn.disabled = false
      verifyBtn.classList.remove('racepass-blocker-btn-success', 'racepass-blocker-btn-error')
      verifyBtn.innerHTML =
        '<svg width="22" height="22" viewBox="0 0 20 20" fill="none">' +
          '<rect width="20" height="20" rx="4" fill="#00d9ff"/>' +
          '<path d="M6 10l3 3 5-6" stroke="#0a0a14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>' +
        '<span>Verify Age with RacePass</span>'
    }

    btnArea.appendChild(verifyBtn)

    // Also add a "Go Back" link
    var backLink = document.createElement('button')
    backLink.className = 'racepass-blocker-back-btn'
    backLink.textContent = '← Go Back to Safety'
    backLink.addEventListener('click', function () {
      if (window.history.length > 1) {
        window.history.back()
      } else if (isPaytm) {
        window.location.href = 'https://paytm.com'
      } else {
        window.location.href = 'https://in.bookmyshow.com'
      }
    })
    btnArea.appendChild(backLink)
  }

  function fireVerifiedEvents(walletAddress, eventType) {
    window.dispatchEvent(new CustomEvent('racepass:verified', {
      detail: { verified: true, walletAddress: walletAddress, eventType: eventType }
    }))
    window.postMessage({
      source: 'racepass-extension',
      type: 'VERIFICATION_RESULT',
      verified: true,
      walletAddress: walletAddress
    }, '*')
  }

  // ════════════════════════════════════════════
  //  MODE 1: Explicit data-racepass integration
  // ════════════════════════════════════════════
  function injectExplicitButtons() {
    var targets = document.querySelectorAll('[data-racepass]')
    for (var i = 0; i < targets.length; i++) {
      var target = targets[i]
      if (target.querySelector('.racepass-btn-injected')) continue
      var minAge = parseInt(target.dataset.minAge) || 0
      var eventType = target.dataset.eventType || 'general'
      var label = minAge > 0 ? 'Verify Age with RacePass' : 'Continue with RacePass'

      var container = document.createElement('div')
      container.className = 'racepass-container-injected'
      var divider = document.createElement('div')
      divider.className = 'racepass-divider-injected'
      divider.innerHTML = '<span>or</span>'

      var btn = document.createElement('button')
      btn.className = 'racepass-btn-injected'
      btn.innerHTML =
        '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="flex-shrink:0">' +
          '<rect width="20" height="20" rx="4" fill="#00d9ff"/>' +
          '<path d="M6 10l3 3 5-6" stroke="#0a0a14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>' +
        '<span>' + label + '</span>'

      ;(function (button, age, type) {
        button.addEventListener('click', async function (e) {
          e.preventDefault()
          e.stopPropagation()
          button.disabled = true
          button.innerHTML = '<div class="racepass-spinner-injected"></div><span>Verifying...</span>'

          try {
            var res = await verifyWithRacePass(age, type)
            if (res.error === 'cancelled') { restoreBtn(); return }
            if (res.verified) {
              ageVerifiedForSession = true
              button.innerHTML = '<span style="font-size:18px">✅</span><span>Verified!</span>'
              button.classList.add('racepass-btn-success')
              fireVerifiedEvents(res.walletAddress, type)
            } else {
              button.innerHTML = '<span style="font-size:18px">❌</span><span>' +
                (res.reason === 'age_restricted' ? 'Age Restricted' : 'Not Verified') + '</span>'
              button.classList.add('racepass-btn-error')
            }
          } catch (err) {
            button.innerHTML = '<span style="font-size:18px">⚠️</span><span>Error</span>'
            button.classList.add('racepass-btn-error')
          }
          setTimeout(restoreBtn, 4000)

          function restoreBtn() {
            button.disabled = false
            button.classList.remove('racepass-btn-success', 'racepass-btn-error')
            button.innerHTML =
              '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="flex-shrink:0">' +
                '<rect width="20" height="20" rx="4" fill="#00d9ff"/>' +
                '<path d="M6 10l3 3 5-6" stroke="#0a0a14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
              '</svg>' +
              '<span>' + label + '</span>'
          }
        })
      })(btn, minAge, eventType)

      container.appendChild(divider)
      container.appendChild(btn)
      target.appendChild(container)
    }
  }

  // ════════════════════════════════════════════
  //  MODE 2: BookMyShow book-button interceptor
  // ════════════════════════════════════════════
  var isBMS = location.hostname.includes('bookmyshow.com')
  var isPaytm = location.hostname.includes('paytm.com')
  var bookInterceptorAttached = false

  function isMovieDetailPage() {
    // On real BookMyShow: movie detail pages have URLs like
    //   /movies/mumbai/kill/ET00364562
    //   /mumbai/movies/animal/ET00123456
    // Listing pages look like:
    //   /explore/movies-mumbai
    var path = location.pathname.toLowerCase()
    if (isBMS) {
      // Real BMS: block on movie detail pages (contains /movies/ but NOT /explore/)
      var isDetail = /\/movies\/[^/]+\/[^/]+/.test(path) || /\/[^/]+\/movies\/[^/]+/.test(path)
      var isListing = path.includes('/explore/')
      return isDetail && !isListing
    }
    // For local demo site: detect age-restricted content via the page text
    return true
  }

  function detectAgeRating() {
    // Returns { restricted: true/false, minAge: number, label: '...' }
    // Detects ALL CBFC certifications so every movie triggers the gate.
    if (!document.body) return { restricted: false }
    var body = document.body.innerText || ''

    // ── Check for "A" rating (18+) ──
    var aPatterns = [
      /\bA\s*[•·|]\s*\d+h/,                  // "A • 2h 15m"
      /\bA\s*[•·|]\s*[A-Za-z]+\s*[•·|]/,     // "A • Hindi •"
      /Censorship[:\s]+A\b/i,
      /Certificate[:\s]+A\b/i,
      /Rated\s+A\b/i,
      /\(A\)/,
      /Adults?\s*Only/i,
    ]
    for (var p = 0; p < aPatterns.length; p++) {
      if (aPatterns[p].test(body)) {
        return { restricted: true, minAge: 18, label: 'A (Adults Only — 18+)' }
      }
    }

    // ── Check for "UA 16+" rating ──
    if (/UA\s*16\+/i.test(body) || /U\/A\s*16\+/i.test(body)) {
      return { restricted: true, minAge: 16, label: 'UA 16+ (16 and above)' }
    }

    // ── Check for "UA 13+" / "U/A 13+" rating ──
    if (/UA\s*13\+/i.test(body) || /U\/A\s*13\+/i.test(body)) {
      return { restricted: true, minAge: 13, label: 'UA 13+ (13 and above)' }
    }

    // ── Check for any "UA <number>+" pattern (e.g. UA7+, UA 7+, UA 10+) ──
    var uaNumMatch = body.match(/UA\s*(\d+)\+/i) || body.match(/U\/A\s*(\d+)\+/i)
    if (uaNumMatch) {
      var n = parseInt(uaNumMatch[1])
      return { restricted: true, minAge: n, label: 'UA ' + n + '+ (' + n + ' and above)' }
    }

    // ── Check for general "UA" / "U/A" rating (parental guidance, default 13+) ──
    var uaPatterns = [
      /\bUA\s*[•·|]\s*\d+h/,                  // "UA • 2h 15m"
      /\bU\/A\s*[•·|]\s*\d+h/,                // "U/A • 2h 15m"
      /\bUA\s*[•·|]\s*[A-Za-z]+\s*[•·|]/,     // "UA • Hindi •"
      /\bU\/A\s*[•·|]\s*[A-Za-z]+\s*[•·|]/,   // "U/A • Hindi •"
      /Certificate[:\s]+UA\b/i,
      /Rated\s+UA\b/i,
      /\(UA\)/,
      /\(U\/A\)/,
    ]
    for (var s = 0; s < uaPatterns.length; s++) {
      if (uaPatterns[s].test(body)) {
        return { restricted: true, minAge: 13, label: 'UA (Parental Guidance — 13+)' }
      }
    }

    // ── Check for "U" rating (universal — anyone can watch) ──
    var uPatterns = [
      /\bU\s*[•·|]\s*\d+h/,                   // "U • 2h 15m"
      /\bU\s*[•·|]\s*[A-Za-z]+\s*[•·|]/,      // "U • Hindi •"
      /Certificate[:\s]+U\b/i,
      /Rated\s+U\b/i,
    ]
    for (var t = 0; t < uPatterns.length; t++) {
      if (uPatterns[t].test(body)) {
        return { restricted: true, minAge: 0, label: 'U (Universal)' }
      }
    }

    // ── Check Movie runtime pattern (e.g. "Movie runtime: 2h 25m") — means we're on a movie page ──
    if (/Movie runtime[:\s]*\d+h/i.test(body) || /runtime[:\s]*\d+h/i.test(body)) {
      return { restricted: true, minAge: 0, label: 'Movie' }
    }

    // ── Check certification badge DOM elements ──
    var badgeSelectors = '[class*="cert"],[class*="Cert"],[class*="censor"],[class*="Censor"],[data-certification]'
    try {
      var badges = document.querySelectorAll(badgeSelectors)
      for (var b = 0; b < badges.length; b++) {
        var text = badges[b].textContent.trim()
        if (text === 'A' || text === '(A)') {
          return { restricted: true, minAge: 18, label: 'A (Adults Only — 18+)' }
        }
        if (/UA\s*16\+/i.test(text)) {
          return { restricted: true, minAge: 16, label: 'UA 16+ (16 and above)' }
        }
        if (/UA\s*13\+/i.test(text) || /U\/A\s*13\+/i.test(text)) {
          return { restricted: true, minAge: 13, label: 'UA 13+ (13 and above)' }
        }
        // Any UA <number>+ badge
        var badgeMatch = text.match(/UA\s*(\d+)\+/i) || text.match(/U\/A\s*(\d+)\+/i)
        if (badgeMatch) {
          var bn = parseInt(badgeMatch[1])
          return { restricted: true, minAge: bn, label: 'UA ' + bn + '+ (' + bn + ' and above)' }
        }
        if (text === 'UA' || text === 'U/A' || text === '(UA)') {
          return { restricted: true, minAge: 13, label: 'UA (Parental Guidance — 13+)' }
        }
        if (text === 'U' || text === '(U)') {
          return { restricted: true, minAge: 0, label: 'U (Universal)' }
        }
      }
    } catch (e) {}

    return { restricted: false }
  }

  function interceptBookButtons() {
    if (bookInterceptorAttached) return
    bookInterceptorAttached = true
    // Capture-phase listener intercepts book button clicks before site handlers
    document.addEventListener('click', handleBookButtonClick, true)
  }

  function handleBookButtonClick(e) {
    // Find the nearest clickable element
    var target = e.target.closest('button, a, [role="button"]')
    if (!target) return

    var text = (target.textContent || '').trim()
    var href = (target.href || '').toLowerCase()

    // Detect "Book" type buttons — covers real BookMyShow and similar sites
    var isBook = /book\s*(ticket|pass|now|seat)?s?/i.test(text) ||
                 /buy\s*(ticket|now|pass)?s?/i.test(text) ||
                 target.id === 'book-btn' ||
                 target.classList.contains('book-btn') ||
                 /buytickets|\/booking/i.test(href) ||
                 // Real BMS uses various classes/attributes for the book button
                 target.closest('[data-action="book"]') ||
                 target.closest('.__book-btn') ||
                 target.closest('[class*="BookButton"]') ||
                 target.closest('[class*="book-button"]') ||
                 target.closest('[class*="bookButton"]') ||
                 // Catch any link/button with just "Book" text on BMS movie pages
                 (isBMS && isMovieDetailPage() && /^book$/i.test(text))

    // Paytm-specific: intercept pay/invest/apply/proceed buttons
    var isPayAction = /proceed\s*(to)?\s*(pay|invest|apply)?/i.test(text) ||
                      /verify\s*&?\s*proceed/i.test(text) ||
                      /pay\s*now/i.test(text) ||
                      /invest\s*now/i.test(text) ||
                      /apply\s*now/i.test(text) ||
                      /start\s*(sip|investing|trading)/i.test(text) ||
                      /open\s*demat/i.test(text) ||
                      /buy\s*(gold|insurance|stocks?)/i.test(text) ||
                      target.id === 'action-btn' ||
                      target.classList.contains('action-btn')

    if (!isBook && !isPayAction) return

    // Detect age rating on the page
    var rating = detectAgeRating()
    if (!rating.restricted) {
      if (isBMS && isMovieDetailPage()) {
        rating = { restricted: true, minAge: 0, label: 'Movie' }
      } else if (isPaytm || isPayAction) {
        // Paytm financial services — check for 18+ context
        var bodyText = document.body ? (document.body.innerText || '') : ''
        if (/18\+|adults?\s*only|age\s*verif|SEBI|RBI|demat|invest|insurance|loan|credit/i.test(bodyText)) {
          rating = { restricted: true, minAge: 18, label: '18+ (Financial Service)' }
        }
      } else if (!isBMS && document.body) {
        var bodyText = document.body.innerText || ''
        if (/movie|film|cinema|showtime/i.test(bodyText)) {
          rating = { restricted: true, minAge: 0, label: 'Movie' }
        }
      }
    }

    if (!rating.restricted) return

    // Already verified for this or higher age level? Let it through.
    if (verifiedUpToAge >= rating.minAge) return

    // Intercept the click — show the verification overlay
    e.preventDefault()
    e.stopImmediatePropagation()

    var evtType = (isPaytm || isPayAction) ? 'finance' : 'movie'
    showFullPageBlocker(rating.minAge, rating.label, evtType, target)
  }

  // ════════════════════════════════════════════
  //  MODE 4: Paytm — immediate full-page blocker
  // ════════════════════════════════════════════
  var paytmBlocked = false

  function tryPaytmBlock() {
    if (!isPaytm) return
    if (paytmBlocked) return
    if (verifiedUpToAge >= 18) return
    if (document.getElementById('racepass-fullpage-blocker')) return
    if (!document.body) return

    paytmBlocked = true
    showFullPageBlocker(18, '18+ (Financial Platform)', 'finance', null)
  }

  // ════════════════════════════════════════════
  //  MODE 3: Generic sites with 18+ content
  // ════════════════════════════════════════════
  var genericBlocked = false

  function tryGenericBlock() {
    if (genericBlocked || isBMS || isPaytm || verifiedUpToAge >= 0) return
    if (document.querySelector('[data-racepass]')) return
    if (document.getElementById('racepass-fullpage-blocker')) return
    if (!document.body) return

    // Skip if a movie rating is detected (handled by book button interceptor)
    var movieRating = detectAgeRating()
    if (movieRating.restricted) return

    var body = document.body.innerText || ''
    var has18 = /\b18\+\b|adults?\s*only|age\s*restrict/i.test(body)
    // Also check for 16+ if it's an event/movie context
    var has16 = /\b16\+\b/i.test(body)
    if (!has18 && !has16) return

    // Only block if there's some kind of booking/ticket context
    var hasBookingContext = /book|ticket|buy|purchase|register|sign\s*up/i.test(body)
    if (!hasBookingContext) return

    genericBlocked = true
    var minAge = has18 ? 18 : 16
    var label = has18 ? '18+ (Adults Only)' : '16+ (Age Restricted)'
    showFullPageBlocker(minAge, label, 'general')
  }

  // ════════════════════════════════════════════
  //  Listen for messages from background/popup
  // ════════════════════════════════════════════
  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === 'VERIFICATION_RESULT') {
      fireVerifiedEvents(message.walletAddress)
    }
    // Popup asks: what does this page require?
    if (message.type === 'GET_PAGE_INFO') {
      var rating = detectAgeRating()
      sendResponse({
        restricted: rating.restricted || false,
        minAge: rating.minAge || 0,
        label: rating.label || '',
        movieName: getMovieName(),
        siteName: getSiteName(),
        url: location.href
      })
      return
    }
    sendResponse({ received: true })
  })

  // ════════════════════════════════════════════
  //  Initialize + SPA observer
  // ════════════════════════════════════════════
  function runAll() {
    injectExplicitButtons()
    interceptBookButtons()
    tryPaytmBlock()
    if (!isBMS && !isPaytm) tryGenericBlock()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAll)
  } else {
    runAll()
  }

  // SPA: re-scan when DOM changes (debounced)
  var debounceTimer = null
  var observer = new MutationObserver(function () {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(runAll, 600)
  })
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true })
  }

  // SPA: detect URL changes (BookMyShow uses client-side routing)
  var lastUrl = location.href
  setInterval(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      genericBlocked = false
      paytmBlocked = false
      // Remove existing blocker if URL changed (new page might not be restricted)
      var existing = document.getElementById('racepass-fullpage-blocker')
      if (existing) {
        existing.remove()
        document.documentElement.style.overflow = ''
        document.body.style.overflow = ''
      }
      setTimeout(runAll, 800)
    }
  }, 800)

})()

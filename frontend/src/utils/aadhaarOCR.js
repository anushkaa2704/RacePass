/**
 * aadhaarOCR.js — Aadhaar Card OCR Utility
 *
 * Uses Tesseract.js (client-side) to:
 * 1. Extract text from an uploaded Aadhaar card image
 * 2. Validate the image looks like an Aadhaar card
 * 3. Extract DOB, Name, Aadhaar number, and Gender
 *
 * Privacy: everything runs IN THE BROWSER — no image is sent to any server.
 */

import Tesseract from 'tesseract.js'

/**
 * Run OCR on the given image file and return structured Aadhaar data.
 *
 * @param {File} imageFile - The uploaded image (jpg/png)
 * @param {(p: number) => void} onProgress - Optional progress callback (0–100)
 * @returns {{ isAadhaar: boolean, dob: string|null, name: string|null, aadhaarNumber: string|null, gender: string|null, rawText: string, confidence: number }}
 */
export async function extractAadhaarData(imageFile, onProgress) {
  // Run Tesseract OCR
  const result = await Tesseract.recognize(imageFile, 'eng', {
    logger: (info) => {
      if (info.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(info.progress * 100))
      }
    }
  })

  const rawText = result.data.text
  const confidence = result.data.confidence
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)

  // ─── Aadhaar validation keywords ───
  const aadhaarKeywords = [
    'aadhaar', 'aadhar', 'adhar', 'uidai', 'uid',
    'government of india', 'govt of india', 'unique identification',
    'enrolment', 'enrollment', 'male', 'female',
    'year of birth', 'date of birth', 'dob', 'yob',
    '/male', '/female'
  ]

  const textLower = rawText.toLowerCase()
  const keywordMatches = aadhaarKeywords.filter(kw => textLower.includes(kw))
  const isAadhaar = keywordMatches.length >= 2

  // ─── Extract DOB ───
  // Formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, or "Year of Birth : YYYY", "DOB : DD/MM/YYYY"
  let dob = null

  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dobRegex = /(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/g
  const dobMatches = [...rawText.matchAll(dobRegex)]
  for (const m of dobMatches) {
    const day = parseInt(m[1], 10)
    const month = parseInt(m[2], 10)
    const year = parseInt(m[3], 10)
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2025) {
      // Format as YYYY-MM-DD for <input type="date">
      dob = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      break
    }
  }

  // Fallback: "Year of Birth" or standalone 4-digit year near keyword
  if (!dob) {
    const yobRegex = /(?:year\s*of\s*birth|yob|dob)\s*[:\-]?\s*(\d{4})/i
    const yobMatch = rawText.match(yobRegex)
    if (yobMatch) {
      const year = parseInt(yobMatch[1], 10)
      if (year >= 1900 && year <= 2025) {
        dob = `${year}-01-01` // default to Jan 1 if only year available
      }
    }
  }

  // ─── Extract Aadhaar Number ───
  // 12-digit number, usually formatted as XXXX XXXX XXXX
  let aadhaarNumber = null
  const aadhaarNumRegex = /\b(\d{4}\s?\d{4}\s?\d{4})\b/g
  const aadhaarNumMatches = [...rawText.matchAll(aadhaarNumRegex)]
  for (const m of aadhaarNumMatches) {
    const digits = m[1].replace(/\s/g, '')
    if (digits.length === 12) {
      aadhaarNumber = digits
      break
    }
  }

  // ─── Extract Gender ───
  let gender = null
  if (/\bmale\b/i.test(rawText) && !/\bfemale\b/i.test(rawText)) gender = 'Male'
  else if (/\bfemale\b/i.test(rawText)) gender = 'Female'
  else if (/\btransgender\b/i.test(rawText)) gender = 'Transgender'

  // ─── Extract Name (heuristic: line before DOB or after "Name") ───
  let name = null
  // Look for line containing DOB and take the line before it
  for (let i = 0; i < lines.length; i++) {
    if (dobRegex.test(lines[i]) || /year\s*of\s*birth/i.test(lines[i])) {
      // Name is likely the line just above the DOB
      if (i > 0) {
        const candidate = lines[i - 1].replace(/[^a-zA-Z\s]/g, '').trim()
        if (candidate.length >= 3 && candidate.length <= 60) {
          name = candidate
        }
      }
      break
    }
  }

  return {
    isAadhaar,
    dob,
    name,
    aadhaarNumber,
    gender,
    rawText,
    confidence,
    keywordMatches
  }
}

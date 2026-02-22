/**
 * faceMatch.js — Face matching utility using face-api.js
 *
 * Compares a live selfie against an Aadhaar card photo.
 * Models are loaded from CDN (one-time) — no local weights needed.
 */

import * as faceapi from 'face-api.js'

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model'

let modelsLoaded = false

/**
 * Load face-api.js models (idempotent — only loads once)
 */
export async function loadFaceModels(onProgress) {
  if (modelsLoaded) return

  onProgress?.('Loading face detection model...')
  await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)

  onProgress?.('Loading face landmark model...')
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)

  onProgress?.('Loading face recognition model...')
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)

  modelsLoaded = true
  onProgress?.('Models ready')
}

/**
 * Create an HTMLImageElement from a source (data URL, blob URL, or File)
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(new Error('Failed to load image'))
    if (src instanceof File || src instanceof Blob) {
      img.src = URL.createObjectURL(src)
    } else {
      img.src = src
    }
  })
}

/**
 * Detect a single face and return its 128-d descriptor
 */
async function getFaceDescriptor(imageSource) {
  const img = await loadImage(imageSource)
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) {
    throw new Error('NO_FACE')
  }

  return detection.descriptor
}

/**
 * Compare two face images and return { match, distance, score }
 *
 * @param {string|File} selfieSource  - live photo data URL
 * @param {string|File} aadhaarSource - Aadhaar card image (File or data URL)
 * @param {number}      threshold     - max Euclidean distance to consider a match (default 0.6)
 * @returns {{ match: boolean, distance: number, score: number }}
 */
export async function compareFaces(selfieSource, aadhaarSource, threshold = 0.6) {
  // Ensure models are loaded
  await loadFaceModels()

  // Get descriptors for both faces
  let selfieDescriptor, aadhaarDescriptor

  try {
    selfieDescriptor = await getFaceDescriptor(selfieSource)
  } catch (e) {
    if (e.message === 'NO_FACE') {
      throw new Error('No face detected in your selfie. Please retake with good lighting and face the camera directly.')
    }
    throw e
  }

  try {
    aadhaarDescriptor = await getFaceDescriptor(aadhaarSource)
  } catch (e) {
    if (e.message === 'NO_FACE') {
      throw new Error('No face detected on the Aadhaar card. Please upload a clearer image of the front of your Aadhaar.')
    }
    throw e
  }

  // Euclidean distance between descriptors
  const distance = faceapi.euclideanDistance(selfieDescriptor, aadhaarDescriptor)

  // Convert distance to a 0-100 confidence score (lower distance = higher score)
  // distance of 0 = 100%, distance >= 1.0 = 0%
  const score = Math.round(Math.max(0, Math.min(100, (1 - distance) * 100)))

  return {
    match: distance < threshold,
    distance: Math.round(distance * 1000) / 1000,
    score
  }
}

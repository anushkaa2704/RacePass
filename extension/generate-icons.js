/**
 * generate-icons.js
 * Run this once: node generate-icons.js
 * Creates PNG icons for the Chrome extension
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { deflateSync } from 'zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))

function createChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeBuffer = Buffer.from(type)
  const crcData = Buffer.concat([typeBuffer, data])
  let crc = 0xFFFFFFFF
  for (let i = 0; i < crcData.length; i++) {
    crc ^= crcData[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  crc ^= 0xFFFFFFFF
  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc >>> 0)
  return Buffer.concat([length, typeBuffer, data, crcBuffer])
}

function createPNG(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)
  ihdrData[8] = 8; ihdrData[9] = 2; ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0
  const ihdr = createChunk('IHDR', ihdrData)

  const rowSize = 1 + size * 3
  const rawData = Buffer.alloc(rowSize * size)
  for (let y = 0; y < size; y++) {
    rawData[y * rowSize] = 0
    for (let x = 0; x < size; x++) {
      const offset = y * rowSize + 1 + x * 3
      const t = (x + y) / (size + size)
      rawData[offset] = Math.round(10 + t * 89)
      rawData[offset + 1] = Math.round(10 + (1 - t) * 207)
      rawData[offset + 2] = Math.round(20 + (1 - t) * 235)
    }
  }

  const compressed = deflateSync(rawData)
  const idat = createChunk('IDAT', compressed)
  const iend = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

for (const size of [16, 48, 128]) {
  const png = createPNG(size)
  writeFileSync(join(__dirname, 'icons', `icon${size}.png`), png)
  console.log(`Created icon${size}.png (${size}x${size})`)
}
console.log('Done!')

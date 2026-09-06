import type { LyricData, LyricWord } from './types'

const PUNCTUATION = /[\p{P}\p{S}]/u

export function formatTimeDisplay(ms: number): string {
  if (ms <= 0) return '--:--.--'
  const rounded = Math.round(ms)
  const totalSec = Math.floor(rounded / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  const milli = rounded % 1000
  const centi = Math.floor(milli / 10)
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(centi).padStart(2, '0')}`
}

export function splitTextToWords(text: string): LyricWord[] {
  if (!text) return []
  const chars = Array.from(text)
  const words: LyricWord[] = []
  for (const c of chars) {
    const isPunct = PUNCTUATION.test(c)
    if (isPunct && words.length > 0) {
      words[words.length - 1].text += c
    } else {
      words.push({ text: c, startTime: 0, duration: 0 })
    }
  }
  return words
}

export function encodeText(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer
}

export function decodeBuffer(buf: ArrayBuffer): string {
  return new TextDecoder('utf-8').decode(new Uint8Array(buf))
}

export function clearAllTimestamps(data: LyricData): LyricData {
  return {
    ...data,
    lines: data.lines.map((line) => ({
      ...line,
      startTime: 0,
      duration: 0,
      words: line.words.map((w) => ({ ...w, startTime: 0, duration: 0 })),
    })),
  }
}
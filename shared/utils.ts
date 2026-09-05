import type { LyricWord } from './types'

const PUNCTUATION = /[\p{P}\p{S}]/u

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
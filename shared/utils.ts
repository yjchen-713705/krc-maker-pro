import type { LyricData, LyricWord } from './types'

const PUNCTUATION = /[\p{P}\p{S}]/u

function isCJK(char: string): boolean {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(char)
}

function mergeStandalonePunctuation(tokens: string[]): string[] {
  const result: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const isPunctOnly = /^[\p{P}\p{S}]+$/u.test(token)

    if (isPunctOnly) {
      if (result.length > 0) {
        result[result.length - 1] += token
      } else if (i + 1 < tokens.length) {
        tokens[i + 1] = token + tokens[i + 1]
      }
    } else {
      result.push(token)
    }
  }
  return result
}

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

export function splitTextToWords(text: string, mixedMode: boolean = false): LyricWord[] {
  if (!text) return []

  let tokens: string[]

  if (mixedMode) {
    const result: string[] = []
    let currentLatinBlock = ''

    for (const char of text) {
      if (isCJK(char)) {
        if (currentLatinBlock) {
          result.push(currentLatinBlock)
          currentLatinBlock = ''
        }
        if (PUNCTUATION.test(char) && result.length > 0) {
          result[result.length - 1] += char
        } else if (!/\s/.test(char)) {
          result.push(char)
        }
      } else if (/\s/.test(char)) {
        if (currentLatinBlock) {
          result.push(currentLatinBlock)
          currentLatinBlock = ''
        }
      } else {
        currentLatinBlock += char
      }
    }

    if (currentLatinBlock) {
      result.push(currentLatinBlock)
    }

    tokens = mergeStandalonePunctuation(result)
  } else {
    const hasCJK = [...text].some(isCJK)

    if (hasCJK) {
      const words: string[] = []
      for (const char of text) {
        if (PUNCTUATION.test(char) && words.length > 0) {
          words[words.length - 1] += char
        } else if (!/\s/.test(char)) {
          words.push(char)
        }
      }
      tokens = words
    } else {
      const split = text.split(/[\s]+/).filter((t) => t.length > 0)
      tokens = mergeStandalonePunctuation(split)
    }
  }

  return tokens.map((t) => ({ text: t, startTime: 0, duration: 0 }))
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
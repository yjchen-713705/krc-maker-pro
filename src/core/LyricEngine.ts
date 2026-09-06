import Lyric, { LyricController } from '@jyostudio/lyric'
import type { LyricData, LyricLine, LyricMetadata } from '@shared/types'
import { splitTextToWords, encodeText } from '@shared/utils'
import type { LyricFormat } from '@shared/constants'

function formatTime(ms: number): string {
  const rounded = Math.round(ms)
  const totalSeconds = Math.floor(rounded / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const millis = rounded % 1000
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0').slice(0, 2)}`
}

interface LyricLineInternal {
  startTime: number
  duration: number
  words?: LyricWordInternal[]
  text?: string
  translation?: string
  state?: string
  progress?: number
  renderProgress?: number
}

interface LyricWordInternal {
  startTime?: number
  duration?: number
  text: string
  state?: string
  progress?: number
}

interface LyricInternal {
  lines: LyricLineInternal[]
  metadata?: Record<string, string>
  setCurrentTime(ms: number): { lineIndex: number; wordIndex: number }
}

export class LyricEngine {
  private lyric: LyricInternal | null = null

  parseFromArrayBuffer(buffer: ArrayBuffer): LyricData {
    this.lyric = new Lyric(buffer) as unknown as LyricInternal
    return this.toLyricData()
  }

  parseFromTextContent(textContent: string): LyricData {
    if (!textContent.trim()) return { lines: [], metadata: {} }
    if (!/\[\d{1,2}:\d{2}[\.:]\d{1,3}\]/.test(textContent)) {
      return this.parsePlainLines(textContent.split('\n'))
    }
    const buf = encodeText(textContent)
    const lyric = new Lyric(buf) as unknown as LyricInternal
    this.lyric = lyric
    return this.toLyricData()
  }

  parsePlainLines(rawLines: string[]): LyricData {
    const lines: LyricLine[] = rawLines
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text) => ({
        text,
        startTime: 0,
        duration: 0,
        words: splitTextToWords(text),
      }))
    this.lyric = null
    return { lines, metadata: {} }
  }

  generate(lyricData: LyricData, format: Exclude<LyricFormat, 'txt'>): ArrayBuffer {
    const lrcText = this.toLrcText(lyricData)
    const lyric = new Lyric(encodeText(lrcText))
    return Lyric.generate(lyric, format)
  }

  private toLrcText(lyricData: LyricData): string {
    const lines: string[] = []
    const md = lyricData.metadata
    if (md.title) lines.push(`[ti:${md.title}]`)
    if (md.artist) lines.push(`[ar:${md.artist}]`)
    if (md.album) lines.push(`[al:${md.album}]`)

    for (const line of lyricData.lines) {
      if (line.startTime > 0) {
        lines.push(`[${formatTime(line.startTime)}]${line.text}`)
      } else {
        lines.push(line.text)
      }
    }
    return lines.join('\n')
  }

  updateCurrentTime(ms: number, lyricData?: LyricData): { lineIndex: number; wordIndex: number } {
    if (this.lyric) {
      return this.lyric.setCurrentTime(ms)
    }
    if (!lyricData) return { lineIndex: -1, wordIndex: -1 }

    const lines = lyricData.lines
    let bestLineIndex = -1
    let bestStartTime = -1

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.startTime > 0 && line.startTime <= ms && line.startTime > bestStartTime) {
        bestStartTime = line.startTime
        bestLineIndex = i
      }
    }

    if (bestLineIndex < 0) return { lineIndex: -1, wordIndex: -1 }

    const line = lines[bestLineIndex]
    let bestWordIndex = -1
    let bestWordTime = -1

    if (line.words && line.words.length > 0) {
      for (let i = 0; i < line.words.length; i++) {
        const w = line.words[i]
        if (w.startTime > 0 && w.startTime <= ms && w.startTime > bestWordTime) {
          bestWordTime = w.startTime
          bestWordIndex = i
        }
      }
    }

    return { lineIndex: bestLineIndex, wordIndex: bestWordIndex }
  }

  getLyricController(): LyricController | null {
    if (!this.lyric) return null
    return null
  }

  private toLyricData(): LyricData {
    if (!this.lyric) return { lines: [], metadata: {} }

    const lines: LyricLine[] = this.lyric.lines.map((line) => {
      const wordsFromLib = (line.words || []).map((w) => ({
        text: w.text,
        startTime: w.startTime ?? 0,
        duration: w.duration ?? 0,
      }))

      let text = line.text || ''
      if (!text && wordsFromLib.length > 0) {
        text = wordsFromLib.map((w) => w.text).join('')
      }

      const startTime =
        line.startTime > 0
          ? line.startTime
          : wordsFromLib.length > 0
            ? wordsFromLib[0].startTime
            : 0

      const endTime =
        wordsFromLib.length > 0
          ? wordsFromLib[wordsFromLib.length - 1].startTime +
            wordsFromLib[wordsFromLib.length - 1].duration
          : line.startTime + line.duration

      const hasAnyWordTimestamp = wordsFromLib.some((w) => w.startTime > 0)

      const finalWords = hasAnyWordTimestamp ? wordsFromLib : splitTextToWords(text)

      return {
        text,
        startTime,
        duration: Math.max(0, endTime - startTime),
        words: finalWords,
      }
    })

    const metadata: LyricMetadata = {}
    if (this.lyric.metadata) {
      metadata.title = this.lyric.metadata.ti
      metadata.artist = this.lyric.metadata.ar
      metadata.album = this.lyric.metadata.al
    }

    return { lines, metadata }
  }
}
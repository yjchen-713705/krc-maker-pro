import Lyric, { LyricController } from '@jyostudio/lyric'
import type { LyricData, LyricLine, LyricMetadata } from '@shared/types'
import { splitTextToWords, encodeText } from '@shared/utils'
import type { LyricFormat } from '@shared/constants'
import { useLyricStore } from '@/store/lyricStore'

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

  parseFromArrayBuffer(buffer: ArrayBuffer, fileExt?: string): LyricData {
    try {
      this.lyric = new Lyric(buffer) as unknown as LyricInternal
      return this.toLyricData()
    } catch (_err) {
      if (fileExt === 'qrc') {
        throw new Error('该 QRC 文件为加密格式，请使用 QQ 音乐导出的未加密版本。')
      }
      throw new Error('歌词文件解析失败：文件格式不支持或已损坏。')
    }
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
    const mixedMode = useLyricStore.getState().mixedLanguageMode
    const lines: LyricLine[] = rawLines
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text) => ({
        text,
        startTime: 0,
        duration: 0,
        words: splitTextToWords(text, mixedMode),
      }))
    this.lyric = null
    return { lines, metadata: {} }
  }

  generate(lyricData: LyricData, format: Exclude<LyricFormat, 'txt'>, songDuration?: number): ArrayBuffer {
    const lrcText = this.toLrcText(lyricData, songDuration)
    const lyric = new Lyric(encodeText(lrcText))
    return Lyric.generate(lyric, format)
  }

  private toLrcText(lyricData: LyricData, songDuration?: number): string {
    const lines: string[] = []
    const md = lyricData.metadata
    if (md.title) lines.push(`[ti:${md.title}]`)
    if (md.artist) lines.push(`[ar:${md.artist}]`)
    if (md.album) lines.push(`[al:${md.album}]`)
    if (md.producer) lines.push(`[au:${md.producer}]`)
    if (md.lyricMaker) lines.push(`[by:${md.lyricMaker}]`)
    if (songDuration && songDuration > 0) {
      lines.push(`[length:${formatTime(songDuration)}]`)
    }

    for (let i = 0; i < lyricData.lines.length; i++) {
      const line = lyricData.lines[i]

      if (line.startTime <= 0) {
        lines.push(line.text)
        continue
      }

      const allWordsMarked = line.words.length > 0 && line.words.every((w) => w.startTime > 0)

      if (allWordsMarked) {
        const nextLine = lyricData.lines[i + 1]
        const row = this.buildPerWordRow(line, nextLine, songDuration)
        lines.push(`[${formatTime(line.startTime)}]${row}`)
      } else {
        lines.push(`[${formatTime(line.startTime)}]${line.text}`)
      }
    }
    return lines.join('\n')
  }

  private buildPerWordRow(
    line: LyricLine,
    nextLine: LyricLine | undefined,
    songDuration: number | undefined,
  ): string {
    const parts: string[] = []
    const words = line.words
    const wordCount = words.length

    for (let i = 0; i < wordCount; i++) {
      const w = words[i]
      let duration: number

      if (i < wordCount - 1) {
        duration = Math.round(words[i + 1].startTime - w.startTime)
      } else if (!nextLine && songDuration && songDuration > w.startTime) {
        duration = Math.round(songDuration - w.startTime)
      } else if (wordCount >= 2) {
        duration = Math.round(words[i].startTime - words[i - 1].startTime)
      } else if (nextLine && nextLine.startTime > 0) {
        duration = Math.round(nextLine.startTime - w.startTime)
      } else {
        duration = 0
      }

      if (duration < 0) duration = 0
      parts.push(`<${duration}>${w.text}`)
    }

    return parts.join('')
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

      const mixedMode = useLyricStore.getState().mixedLanguageMode
      const finalWords = hasAnyWordTimestamp ? wordsFromLib : splitTextToWords(text, mixedMode)

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
      metadata.producer = this.lyric.metadata.au
      metadata.lyricMaker = this.lyric.metadata.by
    }

    return { lines, metadata }
  }
}
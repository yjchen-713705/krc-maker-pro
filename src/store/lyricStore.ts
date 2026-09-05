import { create } from 'zustand'
import type {
  LyricData,
  LyricLine,
  PlayState,
  UIState,
  EditMode,
} from '@shared/types'
import { splitTextToWords } from '@shared/utils'

interface LyricStore {
  lyricData: LyricData
  audioPath: string | null
  audioFileName: string | null
  lyricPath: string | null
  playState: PlayState
  uiState: UIState

  setLyricData: (data: LyricData) => void
  setAudioFile: (path: string, fileName: string) => void
  setLyricPath: (path: string | null) => void

  setPlayState: (partial: Partial<PlayState>) => void
  setCurrentTime: (time: number) => void

  setSelectedLine: (index: number) => void
  setEditMode: (mode: EditMode) => void

  addLine: () => void
  removeLine: (index: number) => void
  updateLineText: (index: number, text: string) => void
  splitLineIntoWords: (index: number) => void

  setLineStartTime: (index: number, time: number) => void
  setWordStartTime: (lineIndex: number, wordIndex: number, time: number) => void

  reset: () => void
}

const initialPlayState: PlayState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  currentLineIndex: -1,
  currentWordIndex: -1,
}

const initialUIState: UIState = {
  selectedLineIndex: 0,
  editMode: 'word',
}

function recalcLineDuration(line: LyricLine): void {
  if (line.words.length > 0) {
    const last = line.words[line.words.length - 1]
    const end = last.startTime + last.duration
    line.duration = Math.max(0, end - line.startTime)
  }
}

export const useLyricStore = create<LyricStore>((set, _get) => ({
  lyricData: { lines: [], metadata: {} },
  audioPath: null,
  audioFileName: null,
  lyricPath: null,
  playState: initialPlayState,
  uiState: initialUIState,

  setLyricData: (data) => set({ lyricData: data }),

  setAudioFile: (path, fileName) =>
    set({ audioPath: path, audioFileName: fileName }),

  setLyricPath: (path) => set({ lyricPath: path }),

  setPlayState: (partial) =>
    set((s) => ({ playState: { ...s.playState, ...partial } })),

  setCurrentTime: (time) =>
    set((s) => ({ playState: { ...s.playState, currentTime: time } })),

  setSelectedLine: (index) => set((s) => ({ uiState: { ...s.uiState, selectedLineIndex: index } })),

  setEditMode: (mode) => set((s) => ({ uiState: { ...s.uiState, editMode: mode } })),

  addLine: () =>
    set((s) => {
      const newLine: LyricLine = {
        text: '',
        startTime: 0,
        duration: 0,
        words: [],
      }
      return {
        lyricData: {
          ...s.lyricData,
          lines: [...s.lyricData.lines, newLine],
        },
        uiState: {
          ...s.uiState,
          selectedLineIndex: s.lyricData.lines.length,
        },
      }
    }),

  removeLine: (index) =>
    set((s) => {
      const lines = [...s.lyricData.lines]
      lines.splice(index, 1)
      const newSelected = Math.max(0, Math.min(s.uiState.selectedLineIndex, lines.length - 1))
      return {
        lyricData: { ...s.lyricData, lines },
        uiState: { ...s.uiState, selectedLineIndex: newSelected },
      }
    }),

  updateLineText: (index, text) =>
    set((s) => {
      const lines = [...s.lyricData.lines]
      lines[index] = { ...lines[index], text, words: splitTextToWords(text) }
      return { lyricData: { ...s.lyricData, lines } }
    }),

  splitLineIntoWords: (index) =>
    set((s) => {
      const lines = [...s.lyricData.lines]
      lines[index] = { ...lines[index], words: splitTextToWords(lines[index].text) }
      return { lyricData: { ...s.lyricData, lines } }
    }),

  setLineStartTime: (index, time) =>
    set((s) => {
      const lines = [...s.lyricData.lines]
      lines[index] = { ...lines[index], startTime: time }
      return { lyricData: { ...s.lyricData, lines } }
    }),

  setWordStartTime: (lineIndex, wordIndex, time) =>
    set((s) => {
      const lines = [...s.lyricData.lines]
      const line = { ...lines[lineIndex] }
      const words = [...line.words]
      if (!words[wordIndex]) return {}
      words[wordIndex] = { ...words[wordIndex], startTime: time }
      line.words = words
      if (wordIndex === 0) {
        line.startTime = time
      }
      recalcLineDuration(line)
      lines[lineIndex] = line
      return { lyricData: { ...s.lyricData, lines } }
    }),

  reset: () =>
    set({
      lyricData: { lines: [], metadata: {} },
      audioPath: null,
      audioFileName: null,
      lyricPath: null,
      playState: initialPlayState,
      uiState: initialUIState,
    }),
}))
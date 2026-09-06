import { create } from 'zustand'
import type {
  LyricData,
  LyricLine,
  PlayState,
  UIState,
  EditMode,
} from '@shared/types'
import { splitTextToWords, clearAllTimestamps } from '@shared/utils'

const MAX_HISTORY = 100

interface LyricStore {
  lyricData: LyricData
  audioPath: string | null
  audioFileName: string | null
  lyricPath: string | null
  playState: PlayState
  uiState: UIState

  history: LyricData[]
  historyIndex: number
  _isRestoring: boolean

  setLyricData: (data: LyricData) => void
  setAudioFile: (path: string, fileName: string) => void
  setLyricPath: (path: string | null) => void

  setPlayState: (partial: Partial<PlayState>) => void
  setCurrentTime: (time: number) => void

  setSelectedLine: (index: number) => void
  setEditMode: (mode: EditMode) => void
  setEditingLyric: (v: boolean) => void

  addLine: () => void
  removeLine: (index: number) => void
  updateLineText: (index: number, text: string) => void
  splitLineIntoWords: (index: number) => void

  resetTimestamps: () => void

  setLineStartTime: (index: number, time: number) => void
  setWordStartTime: (lineIndex: number, wordIndex: number, time: number) => void

  findNextUnmarkedWord: () => { lineIndex: number; wordIndex: number } | null

  pushHistory: () => void
  undo: () => void
  redo: () => void
  clearHistory: () => void

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
  isEditingLyric: false,
}

function recalcLineDuration(line: LyricLine): void {
  if (line.words.length > 0) {
    const last = line.words[line.words.length - 1]
    const end = last.startTime + last.duration
    line.duration = Math.max(0, end - line.startTime)
  }
}

function cloneLyricData(data: LyricData): LyricData {
  return structuredClone(data)
}

function findLastMarkedLine(lyricData: LyricData, editMode: EditMode): number | null {
  const lines = lyricData.lines
  if (lines.length === 0) return null
  for (let li = lines.length - 1; li >= 0; li--) {
    const line = lines[li]
    if (editMode === 'word') {
      if (line.words && line.words.length > 0) {
        for (let wi = line.words.length - 1; wi >= 0; wi--) {
          if (line.words[wi].startTime > 0) return li
        }
      }
    } else {
      if (line.startTime > 0) return li
    }
  }
  return null
}

export const useLyricStore = create<LyricStore>((set, get) => ({
  lyricData: { lines: [], metadata: {} },
  audioPath: null,
  audioFileName: null,
  lyricPath: null,
  playState: initialPlayState,
  uiState: initialUIState,

  history: [],
  historyIndex: -1,
  _isRestoring: false,

  setLyricData: (data) => {
    set({ lyricData: data })
    set({ history: [cloneLyricData(data)], historyIndex: 0 })
  },

  setAudioFile: (path, fileName) =>
    set({ audioPath: path, audioFileName: fileName }),

  setLyricPath: (path) => set({ lyricPath: path }),

  setPlayState: (partial) =>
    set((s) => ({ playState: { ...s.playState, ...partial } })),

  setCurrentTime: (time) =>
    set((s) => ({ playState: { ...s.playState, currentTime: time } })),

  setSelectedLine: (index) => set((s) => ({ uiState: { ...s.uiState, selectedLineIndex: index } })),

  setEditMode: (mode) => set((s) => ({ uiState: { ...s.uiState, editMode: mode } })),

  setEditingLyric: (v) => set((s) => ({ uiState: { ...s.uiState, isEditingLyric: v } })),

  addLine: () => {
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
    })
    get().pushHistory()
  },

  removeLine: (index) => {
    set((s) => {
      const lines = [...s.lyricData.lines]
      lines.splice(index, 1)
      const newSelected = Math.max(0, Math.min(s.uiState.selectedLineIndex, lines.length - 1))
      return {
        lyricData: { ...s.lyricData, lines },
        uiState: { ...s.uiState, selectedLineIndex: newSelected },
      }
    })
    get().pushHistory()
  },

  updateLineText: (index, text) => {
    set((s) => {
      const lines = [...s.lyricData.lines]
      lines[index] = { ...lines[index], text, words: splitTextToWords(text) }
      return { lyricData: { ...s.lyricData, lines } }
    })
    get().pushHistory()
  },

  splitLineIntoWords: (index) =>
    set((s) => {
      const lines = [...s.lyricData.lines]
      lines[index] = { ...lines[index], words: splitTextToWords(lines[index].text) }
      return { lyricData: { ...s.lyricData, lines } }
    }),

  resetTimestamps: () => {
    set((s) => ({ lyricData: clearAllTimestamps(s.lyricData) }))
    get().pushHistory()
  },

  setLineStartTime: (index, time) => {
    set((s) => {
      const lines = [...s.lyricData.lines]
      lines[index] = { ...lines[index], startTime: time }
      return { lyricData: { ...s.lyricData, lines } }
    })
    get().pushHistory()
  },

  setWordStartTime: (lineIndex, wordIndex, time) => {
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
    })
    get().pushHistory()
  },

  findNextUnmarkedWord: () => {
    const { lyricData, uiState } = get()
    const lines = lyricData.lines
    if (lines.length === 0) return null

    let startLine = uiState.selectedLineIndex
    if (startLine < 0) startLine = 0

    for (let li = startLine; li < lines.length; li++) {
      const line = lines[li]
      if (!line.words || line.words.length === 0) continue
      for (let wi = 0; wi < line.words.length; wi++) {
        if (line.words[wi].startTime <= 0) {
          return { lineIndex: li, wordIndex: wi }
        }
      }
    }
    return null
  },

  pushHistory: () => {
    if (get()._isRestoring) return
    const snapshot = cloneLyricData(get().lyricData)
    set((s) => {
      const history = s.history.slice(0, s.historyIndex + 1)
      history.push(snapshot)
      if (history.length > MAX_HISTORY) history.shift()
      return { history, historyIndex: history.length - 1 }
    })
  },

  undo: () => {
    const s = get()
    if (s.historyIndex <= 0) return
    const targetIndex = s.historyIndex - 1
    set({ _isRestoring: true })
    try {
      set((prev) => {
        const targetData = s.history[targetIndex]
        const lines = targetData.lines
        const uiState = { ...prev.uiState }
        const lastMarked = findLastMarkedLine(targetData, uiState.editMode)
        if (lastMarked !== null) {
          uiState.selectedLineIndex = lastMarked
        } else if (uiState.selectedLineIndex >= lines.length) {
          uiState.selectedLineIndex = Math.max(0, lines.length - 1)
        }
        return {
          lyricData: targetData,
          historyIndex: targetIndex,
          uiState,
        }
      })
    } finally {
      set({ _isRestoring: false })
    }
  },

  redo: () => {
    const s = get()
    if (s.historyIndex >= s.history.length - 1) return
    const targetIndex = s.historyIndex + 1
    set({ _isRestoring: true })
    try {
      set((prev) => {
        const targetData = s.history[targetIndex]
        const lines = targetData.lines
        const uiState = { ...prev.uiState }
        const lastMarked = findLastMarkedLine(targetData, uiState.editMode)
        if (lastMarked !== null) {
          uiState.selectedLineIndex = lastMarked
        } else if (uiState.selectedLineIndex >= lines.length) {
          uiState.selectedLineIndex = Math.max(0, lines.length - 1)
        }
        return {
          lyricData: targetData,
          historyIndex: targetIndex,
          uiState,
        }
      })
    } finally {
      set({ _isRestoring: false })
    }
  },

  clearHistory: () => set({ history: [], historyIndex: -1 }),

  reset: () =>
    set({
      lyricData: { lines: [], metadata: {} },
      audioPath: null,
      audioFileName: null,
      lyricPath: null,
      playState: initialPlayState,
      uiState: initialUIState,
      history: [],
      historyIndex: -1,
      _isRestoring: false,
    }),
}))
export interface LyricWord {
  text: string
  startTime: number
  duration: number
}

export interface LyricLine {
  text: string
  startTime: number
  duration: number
  words: LyricWord[]
}

export interface LyricMetadata {
  title?: string
  artist?: string
  album?: string
}

export interface LyricData {
  lines: LyricLine[]
  metadata: LyricMetadata
}

export type EditMode = 'word' | 'line'

export interface PlayState {
  isPlaying: boolean
  currentTime: number
  duration: number
  currentLineIndex: number
  currentWordIndex: number
}

export interface UIState {
  selectedLineIndex: number
  editMode: EditMode
  isEditingLyric: boolean
}
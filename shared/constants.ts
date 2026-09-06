export const IPC_CHANNELS = {
  DIALOG_OPEN_AUDIO: 'dialog:openAudio',
  DIALOG_OPEN_LYRIC: 'dialog:openLyric',
  DIALOG_OPEN_FOLDER: 'dialog:openFolder',
  DIALOG_SAVE_LYRIC: 'dialog:saveLyric',
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
} as const

export const AUDIO_FORMATS = ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'wma'] as const

export const LYRIC_FORMATS = ['krc', 'lrc'] as const

export const LYRICAL_FILE_EXTENSIONS = ['krc', 'lrc', 'txt'] as const

export const TEXT_BASED_EXTENSIONS = ['lrc', 'txt'] as const

export type LyricFormat = (typeof LYRIC_FORMATS)[number]
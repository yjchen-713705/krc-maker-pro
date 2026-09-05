const { ipcRenderer, contextBridge } = require('electron')

const IPC_CHANNELS = {
  DIALOG_OPEN_AUDIO: 'dialog:openAudio',
  DIALOG_OPEN_LYRIC: 'dialog:openLyric',
  DIALOG_SAVE_LYRIC: 'dialog:saveLyric',
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
}

const api = {
  openAudioDialog: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_AUDIO),
  openLyricDialog: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_LYRIC),
  saveLyricDialog: (defaultName) => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SAVE_LYRIC, defaultName),
  readFile: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.FILE_READ, filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke(IPC_CHANNELS.FILE_WRITE, filePath, data),
}

contextBridge.exposeInMainWorld('electronAPI', api)
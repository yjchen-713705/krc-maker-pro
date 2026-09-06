import { ipcRenderer, contextBridge } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'

export const api = {
  openAudioDialog: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_AUDIO),

  openLyricDialog: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_LYRIC),

  openFolderDialog: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FOLDER),

  saveLyricDialog: (args: { defaultName: string; defaultDir?: string }): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SAVE_LYRIC, args),

  readFile: (filePath: string): Promise<ArrayBuffer> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_READ, filePath),

  writeFile: (filePath: string, data: ArrayBuffer): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_WRITE, filePath, data),
}

export type ElectronAPI = typeof api

contextBridge.exposeInMainWorld('electronAPI', api)
export interface FileReadResult {
  path: string
  data: ArrayBuffer
  text?: string
  extension: string
}

function getExtension(filePath: string): string {
  const m = filePath.match(/\.([^.]+)$/)
  return m ? m[1].toLowerCase() : ''
}

function decodeBufferToText(buf: ArrayBuffer): string {
  const decoder = new TextDecoder('utf-8')
  return decoder.decode(new Uint8Array(buf))
}

export class FileService {
  async openAudioFile(): Promise<string | null> {
    if (!window.electronAPI) return null
    return window.electronAPI.openAudioDialog()
  }

  async openLyricFile(): Promise<FileReadResult | null> {
    if (!window.electronAPI) return null
    const filePath = await window.electronAPI.openLyricDialog()
    if (!filePath) return null
    const data = await window.electronAPI.readFile(filePath)
    const ext = getExtension(filePath)
    const result: FileReadResult = { path: filePath, data, extension: ext }
    if (ext === 'lrc' || ext === 'txt') {
      result.text = decodeBufferToText(data)
    }
    return result
  }

  async openFolder(): Promise<string | null> {
    if (!window.electronAPI) return null
    return window.electronAPI.openFolderDialog()
  }

  async saveLyricFile(
    defaultName: string,
    data: ArrayBuffer,
    defaultDir?: string,
  ): Promise<string | null> {
    if (!window.electronAPI) return null
    const savePath = await window.electronAPI.saveLyricDialog({ defaultName, defaultDir })
    if (!savePath) return null
    await window.electronAPI.writeFile(savePath, data)
    return savePath
  }

  async readLocalFile(filePath: string): Promise<ArrayBuffer> {
    if (!window.electronAPI) throw new Error('electronAPI not available')
    return window.electronAPI.readFile(filePath)
  }
}
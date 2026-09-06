type TimeCallback = (timeMs: number) => void

export class AudioEngine {
  private audio: HTMLAudioElement
  private listeners: Set<TimeCallback> = new Set()
  private rafId: number | null = null
  private objectUrl: string | null = null

  constructor() {
    this.audio = new Audio()
  }

  load(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stopTimeUpdate()
      this.audio.pause()
      const onError = () => {
        const err = this.audio.error
        reject(
          err
            ? new Error(`音频加载失败 [code=${err.code}]: ${err.message || '无法加载音频'}`)
            : new Error('音频加载失败'),
        )
      }
      this.audio.addEventListener('loadedmetadata', () => resolve(), { once: true })
      this.audio.addEventListener('error', onError, { once: true })
      this.audio.src = src
    })
  }

  loadFile(file: File): Promise<void> {
    this.revokeObjectUrl()
    const url = URL.createObjectURL(file)
    this.objectUrl = url
    return this.load(url)
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl)
      this.objectUrl = null
    }
  }

  async play(): Promise<void> {
    await this.audio.play()
    this.startTimeUpdate()
  }

  pause(): void {
    this.audio.pause()
    this.stopTimeUpdate()
  }

  stop(): void {
    this.audio.pause()
    this.audio.currentTime = 0
    this.stopTimeUpdate()
    this.emitTime(0)
  }

  seek(ms: number): void {
    this.audio.currentTime = ms / 1000
    this.emitTime(ms)
  }

  getCurrentTime(): number {
    return this.audio.currentTime * 1000
  }

  getDuration(): number {
    return (this.audio.duration || 0) * 1000
  }

  isPlaying(): boolean {
    return !this.audio.paused
  }

  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume))
  }

  getVolume(): number {
    return this.audio.volume
  }

  onTimeUpdate(callback: TimeCallback): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private emitTime(ms: number): void {
    this.listeners.forEach((cb) => cb(ms))
  }

  private startTimeUpdate(): void {
    const tick = () => {
      this.emitTime(this.getCurrentTime())
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  private stopTimeUpdate(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  getAudioElement(): HTMLAudioElement {
    return this.audio
  }

  dispose(): void {
    this.stopTimeUpdate()
    this.audio.pause()
    this.revokeObjectUrl()
    this.audio.src = ''
    this.listeners.clear()
  }
}
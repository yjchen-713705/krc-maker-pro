import { useEffect, useRef, useState, useCallback } from 'react'
import { Button, Slider, message } from 'antd'
import { CloseOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons'
import { useLyricStore } from '@/store/lyricStore'
import { useAudioEngine, getAudioEngine } from '@/hooks/useAudioEngine'
import { LyricEngine } from '@/core/LyricEngine'
import { formatTimeDisplay } from '@shared/utils'

const lyricEngine = new LyricEngine()

interface Props {
  open: boolean
  onClose: () => void
}

export function LyricPreview({ open, onClose }: Props) {
  const { lyricData, setPlayState } = useLyricStore()
  const { togglePlay } = useAudioEngine()

  const audioEngine = getAudioEngine()
  const listRef = useRef<HTMLDivElement>(null)
  const rafIdRef = useRef<number | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const [currentTime, setCurrentTime] = useState(0)
  const [currentLine, setCurrentLine] = useState(-1)
  const [currentWord, setCurrentWord] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [previewEnded, setPreviewEnded] = useState(false)
  const [duration, setDuration] = useState(0)

  const doClose = useCallback(() => {
    audioEngine.stop()
    setPlayState({ isPlaying: false, currentTime: 0, currentLineIndex: -1, currentWordIndex: -1 })
    setIsPlaying(false)
    setCurrentTime(0)
    setCurrentLine(-1)
    setCurrentWord(-1)
    setPreviewEnded(false)
    onClose()
  }, [audioEngine, setPlayState, onClose])

  useEffect(() => {
    if (!open) return

    const audio = audioEngine.getAudioElement()
    setDuration(audioEngine.getDuration())

    audioEngine.seek(0)

    const unsubscribe = audioEngine.onTimeUpdate((t) => {
      setCurrentTime(t)
      const result = lyricEngine.updateCurrentTime(t, lyricData)
      setCurrentLine(result.lineIndex)
      setCurrentWord(result.wordIndex)
    })

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      setIsPlaying(false)
      setPreviewEnded(true)
      message.info('预览结束')
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('durationchange', () => {
      setDuration(audioEngine.getDuration())
    })

    audioEngine.play().catch(() => {})

    cleanupRef.current = () => {
      unsubscribe()
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
    }

    return () => {
      if (cleanupRef.current) cleanupRef.current()
      cleanupRef.current = null
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [open, audioEngine, lyricData])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        doClose()
      } else if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, doClose, togglePlay])

  useEffect(() => {
    if (!open) return
    if (currentLine < 0 || !listRef.current) return
    const container = listRef.current
    const activeEl = container.querySelector<HTMLElement>('[data-active="true"]')
    if (activeEl) {
      const offset = activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2
      container.scrollTo({ top: offset, behavior: 'smooth' })
    }
  }, [currentLine, open])

  const handleSeek = (value: number) => {
    audioEngine.seek(value)
    setCurrentTime(value)
    const result = lyricEngine.updateCurrentTime(value, lyricData)
    setCurrentLine(result.lineIndex)
    setCurrentWord(result.wordIndex)
  }

  if (!open) return null

  const lines = lyricData.lines

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10000,
        }}
      >
        <Button
          type="text"
          icon={<CloseOutlined style={{ color: '#fff', fontSize: 20 }} />}
          onClick={doClose}
        />
      </div>

      <div
        ref={listRef}
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '80px 40px 40px',
          gap: 20,
          scrollBehavior: 'smooth',
        }}
      >
        {lines.map((line, li) => {
          const isActive = li === currentLine
          return (
            <div
              key={li}
              data-active={isActive ? 'true' : 'false'}
              style={{
                fontSize: isActive ? 32 : 20,
                color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                fontWeight: isActive ? 700 : 400,
                transition: 'all 0.2s ease',
                textAlign: 'center',
                letterSpacing: 2,
              }}
            >
              {line.words && line.words.length > 0 ? (
                line.words.map((w, wi) => (
                  <span
                    key={wi}
                    style={{
                      color: isActive && wi === currentWord ? '#FFD700' : undefined,
                      fontWeight: isActive && wi === currentWord ? 900 : undefined,
                      transition: 'color 0.15s',
                    }}
                  >
                    {w.text}
                  </span>
                ))
              ) : (
                <span>{line.text}</span>
              )}
            </div>
          )
        })}
      </div>

      {previewEnded && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 18,
            pointerEvents: 'none',
          }}
        >
          预览结束
        </div>
      )}

      <div
        style={{
          padding: '20px 40px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <Button
          type="text"
          size="large"
          icon={
            isPlaying ? (
              <PauseCircleOutlined style={{ fontSize: 36, color: '#fff' }} />
            ) : (
              <PlayCircleOutlined style={{ fontSize: 36, color: '#fff' }} />
            )
          }
          onClick={togglePlay}
        />

        <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#ccc', width: 70, textAlign: 'right' }}>
          {formatTimeDisplay(currentTime)}
        </span>

        <Slider
          min={0}
          max={duration || 1}
          value={Math.min(currentTime, duration || 0)}
          onChange={handleSeek}
          style={{ flex: 1, margin: 0 }}
          tooltip={{ formatter: (v) => formatTimeDisplay(v ?? 0) }}
        />

        <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#ccc', width: 70 }}>
          {formatTimeDisplay(duration)}
        </span>
      </div>
    </div>
  )
}
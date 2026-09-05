import { useEffect, useRef, useCallback } from 'react'
import { AudioEngine } from '@/core/AudioEngine'
import { useLyricStore } from '@/store/lyricStore'

let audioEngineInstance: AudioEngine | null = null

export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine()
  }
  return audioEngineInstance
}

export function useAudioEngine() {
  const engine = useRef<AudioEngine>(getAudioEngine())
  const { setCurrentTime, setPlayState, playState } = useLyricStore()

  useEffect(() => {
    const audio = engine.current.getAudioElement()

    const onDurationChange = () => {
      setPlayState({ duration: engine.current.getDuration() })
    }

    const onPlay = () => {
      setPlayState({ isPlaying: true })
    }

    const onPause = () => {
      setPlayState({ isPlaying: false })
    }

    const onEnded = () => {
      setPlayState({ isPlaying: false, currentTime: 0, currentLineIndex: -1, currentWordIndex: -1 })
    }

    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)

    const unsubscribe = engine.current.onTimeUpdate((t) => {
      setCurrentTime(t)
    })

    return () => {
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      unsubscribe()
    }
  }, [setCurrentTime, setPlayState])

  const load = useCallback(async (src: string) => {
    await engine.current.load(src)
    setPlayState({ duration: engine.current.getDuration() })
  }, [setPlayState])

  const loadFile = useCallback(async (file: File) => {
    await engine.current.loadFile(file)
    setPlayState({ duration: engine.current.getDuration() })
  }, [setPlayState])

  const play = useCallback(async () => {
    await engine.current.play()
  }, [])

  const pause = useCallback(() => {
    engine.current.pause()
  }, [])

  const togglePlay = useCallback(async () => {
    if (playState.isPlaying) {
      pause()
    } else {
      await play()
    }
  }, [playState.isPlaying, play, pause])

  const seek = useCallback((ms: number) => {
    engine.current.seek(ms)
    setCurrentTime(ms)
  }, [setCurrentTime])

  const setVolume = useCallback((v: number) => {
    engine.current.setVolume(v)
  }, [])

  return {
    load,
    loadFile,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    engine: engine.current,
  }
}
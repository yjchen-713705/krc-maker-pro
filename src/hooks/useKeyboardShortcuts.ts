import { useEffect } from 'react'
import { useLyricStore } from '@/store/lyricStore'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import type { EditMode } from '@shared/types'

export function useKeyboardShortcuts() {
  const {
    uiState,
    lyricData,
    setLineStartTime,
    setWordStartTime,
    setSelectedLine,
  } = useLyricStore()

  const { engine, togglePlay } = useAudioEngine()

  const editMode = uiState.editMode as EditMode

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const currentTime = engine.getCurrentTime()
      const lines = lyricData.lines
      const selectedLine = uiState.selectedLineIndex

      switch (e.code) {
        case 'Space': {
          e.preventDefault()
          togglePlay()
          break
        }
        case 'Enter': {
          e.preventDefault()
          if (selectedLine >= 0 && selectedLine < lines.length) {
            setLineStartTime(selectedLine, currentTime)
            if (selectedLine < lines.length - 1) {
              setSelectedLine(selectedLine + 1)
            }
          }
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          if (selectedLine >= 0 && selectedLine < lines.length) {
            if (editMode === 'word') {
              const line = lines[selectedLine]
              if (line.words.length > 0) {
                const currentWordIdx = line.words.findIndex((w) => w.startTime === 0)
                if (currentWordIdx >= 0) {
                  setWordStartTime(selectedLine, currentWordIdx, currentTime)
                } else {
                  setLineStartTime(selectedLine, currentTime)
                  if (selectedLine < lines.length - 1) {
                    setSelectedLine(selectedLine + 1)
                  }
                }
              } else {
                setLineStartTime(selectedLine, currentTime)
                if (selectedLine < lines.length - 1) {
                  setSelectedLine(selectedLine + 1)
                }
              }
            } else {
              setLineStartTime(selectedLine, currentTime)
              if (selectedLine < lines.length - 1) {
                setSelectedLine(selectedLine + 1)
              }
            }
          }
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          if (selectedLine > 0) {
            setSelectedLine(selectedLine - 1)
          }
          break
        }
        case 'ArrowDown': {
          e.preventDefault()
          if (selectedLine < lines.length - 1) {
            setSelectedLine(selectedLine + 1)
          }
          break
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editMode, uiState, lyricData, engine, togglePlay, setLineStartTime, setWordStartTime, setSelectedLine])
}
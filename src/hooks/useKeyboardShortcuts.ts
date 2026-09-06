import { useEffect } from 'react'
import { message } from 'antd'
import { useLyricStore } from '@/store/lyricStore'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import type { EditMode } from '@shared/types'

export function useKeyboardShortcuts() {
  const {
    uiState,
    setLineStartTime,
    setWordStartTime,
    setSelectedLine,
    findNextUnmarkedWord,
    undo,
    redo,
  } = useLyricStore()

  const { engine, togglePlay } = useAudioEngine()

  const editMode = uiState.editMode as EditMode

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey

      if (isCtrlOrCmd && e.code === 'KeyZ') {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      if (isCtrlOrCmd && e.code === 'KeyY') {
        e.preventDefault()
        redo()
        return
      }

      const target = e.target as HTMLElement
      const isEditingField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      const currentTime = engine.getCurrentTime()
      const lines = useLyricStore.getState().lyricData.lines
      const selectedLine = uiState.selectedLineIndex

      switch (e.code) {
        case 'Space': {
          if (isEditingField) return
          e.preventDefault()
          togglePlay()
          break
        }
        case 'Enter': {
          if (editMode !== 'line') return
          if (isEditingField && !uiState.isEditingLyric) return
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
          if (isEditingField) return
          e.preventDefault()
          if (selectedLine < 0 || selectedLine >= lines.length) return
          if (editMode === 'word') {
            const result = findNextUnmarkedWord()
            if (result) {
              if (result.lineIndex !== selectedLine) {
                setSelectedLine(result.lineIndex)
              }
              setWordStartTime(result.lineIndex, result.wordIndex, currentTime)
            } else {
              message.info('所有字已标记完成')
            }
          } else {
            setLineStartTime(selectedLine, currentTime)
            if (selectedLine < lines.length - 1) {
              setSelectedLine(selectedLine + 1)
            }
          }
          break
        }
        case 'ArrowUp': {
          if (isEditingField) return
          e.preventDefault()
          if (selectedLine > 0) {
            setSelectedLine(selectedLine - 1)
          }
          break
        }
        case 'ArrowDown': {
          if (isEditingField) return
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
  }, [editMode, uiState, engine, togglePlay, setLineStartTime, setWordStartTime, setSelectedLine, findNextUnmarkedWord, undo, redo])
}
import { useEffect, useState } from 'react'
import { message } from 'antd'
import { useLyricStore } from '@/store/lyricStore'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import type { EditMode } from '@shared/types'
import { getResolvedShortcuts } from '@shared/shortcuts'

function matchesShortcutRaw(actual: string, code: string, ctrlKey: boolean, shiftKey: boolean, altKey: boolean, metaKey: boolean): boolean {
  const parts = actual.split('+').filter(Boolean)

  let needCtrl = false
  let needShift = false
  let needAlt = false
  let needMeta = false
  let needCode = ''

  for (const p of parts) {
    if (p === 'Control') needCtrl = true
    else if (p === 'Shift') needShift = true
    else if (p === 'Alt') needAlt = true
    else if (p === 'Meta') needMeta = true
    else needCode = p
  }

  const actualCode = code === ' ' ? 'Space' : code

  if (needCtrl && !ctrlKey) return false
  if (needMeta && !metaKey) return false
  if (needShift && !shiftKey) return false
  if (needAlt && !altKey) return false

  if (!needCode) return needCtrl || needMeta || needShift || needAlt

  if (needCode === 'Space' && actualCode === 'Space') return true
  if (needCode === 'Escape' && actualCode === 'Escape') return true
  if (needCode.startsWith('Key') && actualCode === needCode) return true
  if (needCode.startsWith('Arrow') && actualCode === needCode) return true
  if (needCode === actualCode) return true

  return false
}

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

  const { engine, togglePlay, seek } = useAudioEngine()

  const editMode = uiState.editMode as EditMode
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const sync = () => {
      setVersion((v) => v + 1)
    }
    window.addEventListener('storage', sync)
    window.addEventListener('custom-shortcuts-updated', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('custom-shortcuts-updated', sync)
    }
  }, [])

  useEffect(() => {
    const shortcuts = getResolvedShortcuts()

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isEditingField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      if (isEditingField) return

      const currentTime = engine.getCurrentTime()
      const lines = useLyricStore.getState().lyricData.lines
      const selectedLine = uiState.selectedLineIndex

      if (matchesShortcutRaw(shortcuts.undo, e.code, e.ctrlKey, e.shiftKey, e.altKey, e.metaKey)) {
        e.preventDefault()
        const shiftInShortcut = shortcuts.undo.split('+').includes('Shift')
        if (shiftInShortcut) {
          redo()
        } else {
          const target = undo()
          if (target !== null) {
            seek(target)
          }
        }
        return
      }

      if (matchesShortcutRaw(shortcuts.redo, e.code, e.ctrlKey, e.shiftKey, e.altKey, e.metaKey)) {
        e.preventDefault()
        redo()
        return
      }

      if (matchesShortcutRaw(shortcuts.playPause, e.code, e.ctrlKey, e.shiftKey, e.altKey, e.metaKey)) {
        e.preventDefault()
        togglePlay()
        return
      }

      if (matchesShortcutRaw(shortcuts.markWord, e.code, e.ctrlKey, e.shiftKey, e.altKey, e.metaKey)) {
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
        return
      }

      if (matchesShortcutRaw(shortcuts.markLine, e.code, e.ctrlKey, e.shiftKey, e.altKey, e.metaKey)) {
        if (editMode !== 'line') return
        if (isEditingField && !uiState.isEditingLyric) return
        e.preventDefault()
        if (selectedLine >= 0 && selectedLine < lines.length) {
          setLineStartTime(selectedLine, currentTime)
          if (selectedLine < lines.length - 1) {
            setSelectedLine(selectedLine + 1)
          }
        }
        return
      }

      if (matchesShortcutRaw(shortcuts.prevLine, e.code, e.ctrlKey, e.shiftKey, e.altKey, e.metaKey)) {
        e.preventDefault()
        if (selectedLine > 0) {
          setSelectedLine(selectedLine - 1)
        }
        return
      }

      if (matchesShortcutRaw(shortcuts.nextLine, e.code, e.ctrlKey, e.shiftKey, e.altKey, e.metaKey)) {
        e.preventDefault()
        if (selectedLine < lines.length - 1) {
          setSelectedLine(selectedLine + 1)
        }
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editMode, uiState, engine, togglePlay, seek, setLineStartTime, setWordStartTime, setSelectedLine, findNextUnmarkedWord, undo, redo, version])
}
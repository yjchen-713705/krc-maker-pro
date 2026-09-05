import { useCallback, useEffect, useState } from 'react'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { useLyricStore } from '@/store/lyricStore'
import { LyricEngine } from '@/core/LyricEngine'

const lyricEngine = new LyricEngine()

export function useDragDrop() {
  const [isDragging, setIsDragging] = useState(false)
  const { load } = useAudioEngine()
  const { setAudioFile, setLyricData, setLyricPath, setSelectedLine } = useLyricStore()

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()?.toLowerCase()

      if (['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'wav'].includes(ext || '')) {
        const url = URL.createObjectURL(file)
        setAudioFile(file.name, file.name)
        await load(url)
      } else if (ext === 'krc' || ext === 'lrc') {
        const buffer = await file.arrayBuffer()
        const data = lyricEngine.parseFromArrayBuffer(buffer)
        setLyricData(data)
        setLyricPath(null)
        setSelectedLine(0)
      }
    }
  }, [load, setAudioFile, setLyricData, setLyricPath, setSelectedLine])

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      handleFiles(e.dataTransfer?.files ?? null)
    }

    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [handleFiles])

  return { isDragging }
}
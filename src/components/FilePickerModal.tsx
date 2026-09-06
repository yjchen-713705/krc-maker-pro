import { AudioOutlined } from '@ant-design/icons'
import { Modal, message, theme } from 'antd'
import { useEffect, useRef, useState } from 'react'

interface FilePickerModalProps {
  open: boolean
  mode: 'audio' | 'lyric'
  audioExtensions: readonly string[]
  lyricExtensions: readonly string[]
  onPickAudio: (file: File) => void
  onPickLyric: (file: File) => void
  onCancel: () => void
}

export function FilePickerModal({
  open,
  mode,
  audioExtensions,
  lyricExtensions,
  onPickAudio,
  onPickLyric,
  onCancel,
}: FilePickerModalProps) {
  const { token } = theme.useToken()
  const [messageApi, contextHolder] = message.useMessage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const extensions = mode === 'audio' ? audioExtensions : lyricExtensions
  const accept = extensions.map((e) => `.${e}`).join(',')
  const label = mode === 'audio' ? '音频' : '歌词'

  useEffect(() => {
    if (!open) {
      setDragOver(false)
    }
  }, [open])

  const handleFile = (file: File) => {
    const ext = file.name.match(/\.([^.]+)$/)?.[1]?.toLowerCase() || ''
    if (!extensions.includes(ext as (typeof extensions)[number])) {
      messageApi.error(`不支持的文件类型：.${ext}。支持 ${extensions.map((e) => `.${e}`).join(' / ')}`)
      return false
    }
    if (mode === 'audio') {
      onPickAudio(file)
    } else {
      onPickLyric(file)
    }
    return true
  }

  const handleBrowserPick = () => {
    inputRef.current?.click()
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
      e.target.value = ''
    }
  }

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const dashBorder = {
    border: `2px dashed ${dragOver ? token.colorPrimary : token.colorBorder}`,
    borderRadius: 8,
    padding: '40px 20px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: dragOver ? token.colorPrimaryBg : token.colorBgLayout,
  }

  return (
    <>
      {contextHolder}
      <Modal
        title={mode === 'audio' ? '选择音频文件' : '选择歌词文件'}
        open={open}
        onCancel={onCancel}
        footer={null}
        width={480}
        centered
      >
        <div
          style={dashBorder}
          onClick={handleBrowserPick}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <AudioOutlined
            style={{ fontSize: 48, color: token.colorPrimary, marginBottom: 16 }}
          />
          <div style={{ fontSize: 15, color: token.colorText, marginBottom: 4 }}>
            点击选择或拖拽{label}文件到此处
          </div>
          <div style={{ fontSize: 13, color: token.colorTextTertiary }}>
            支持格式：{extensions.map((e) => `.${e}`).join(' / ')}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            style={{ display: 'none' }}
            onChange={onInputChange}
          />
        </div>
      </Modal>
    </>
  )
}
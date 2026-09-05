import { Button, Space, Segmented, message, Dropdown, Modal, Input } from 'antd'
import {
  FolderOpenOutlined,
  SoundOutlined,
  DownloadOutlined,
  UploadOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import { FileService } from '@/core/FileService'
import { LyricEngine } from '@/core/LyricEngine'
import { useLyricStore } from '@/store/lyricStore'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { FilePickerModal } from './FilePickerModal'
import type { LyricFormat } from '@shared/constants'
import { AUDIO_FORMATS, LYRICAL_FILE_EXTENSIONS, TEXT_BASED_EXTENSIONS } from '@shared/constants'
import type { EditMode } from '@shared/types'

const fileService = new FileService()
const lyricEngine = new LyricEngine()

function getExtension(fileName: string): string {
  return fileName.match(/\.([^.]+)$/)?.[1]?.toLowerCase() || ''
}

async function readFileAsText(file: File): Promise<string> {
  return await file.text()
}

export function Toolbar() {
  const {
    lyricData,
    uiState,
    setEditMode,
    setAudioFile,
    setLyricData,
    setLyricPath,
    setSelectedLine,
  } = useLyricStore()
  const { loadFile } = useAudioEngine()
  const [messageApi, contextHolder] = message.useMessage()

  const [audioPickerOpen, setAudioPickerOpen] = useState(false)
  const [lyricPickerOpen, setLyricPickerOpen] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')

  const handlePickAudio = async (file: File) => {
    try {
      await loadFile(file)
      setAudioFile(file.name, file.name)
      messageApi.success(`已加载音频: ${file.name}`)
    } catch (err) {
      messageApi.error(`加载音频失败: ${err instanceof Error ? err.message : err}`)
    } finally {
      setAudioPickerOpen(false)
    }
  }

  const handlePickLyric = async (file: File) => {
    try {
      const ext = getExtension(file.name)
      let data
      if (TEXT_BASED_EXTENSIONS.includes(ext as (typeof TEXT_BASED_EXTENSIONS)[number])) {
        const text = await readFileAsText(file)
        data = lyricEngine.parseFromTextContent(text)
      } else {
        const buf = await file.arrayBuffer()
        data = lyricEngine.parseFromArrayBuffer(buf)
      }
      setLyricData(data)
      setLyricPath(file.name)
      setSelectedLine(0)
      messageApi.success('歌词文件加载成功')
    } catch (err) {
      messageApi.error(`加载歌词失败: ${err instanceof Error ? err.message : err}`)
    } finally {
      setLyricPickerOpen(false)
    }
  }

  const handlePasteLyric = () => {
    if (!pasteText.trim()) {
      messageApi.warning('请先粘贴歌词内容')
      return
    }
    const data = lyricEngine.parseFromTextContent(pasteText)
    setLyricData(data)
    setLyricPath(null)
    setSelectedLine(0)
    setPasteOpen(false)
    setPasteText('')
    messageApi.success('歌词已粘贴')
  }

  const handleExport = async (format: LyricFormat) => {
    if (lyricData.lines.length === 0) {
      messageApi.warning('没有可导出的歌词')
      return
    }
    try {
      const buf = lyricEngine.generate(lyricData, format)
      const defaultName = `lyric.${format}`
      const savePath = await fileService.saveLyricFile(defaultName, buf)
      if (savePath) {
        messageApi.success(`导出成功: ${savePath}`)
      }
    } catch (err) {
      messageApi.error(`导出失败: ${err instanceof Error ? err.message : err}`)
    }
  }

  const exportItems = [
    { key: 'krc', label: '导出为 .krc (酷狗格式)' },
    { key: 'lrc', label: '导出为 .lrc (通用格式)' },
  ]

  return (
    <>
      {contextHolder}
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid #f0f0f0',
          background: '#fafafa',
        }}
      >
        <Space size="middle" wrap>
          <Button
            icon={<SoundOutlined />}
            onClick={() => setAudioPickerOpen(true)}
          >
            打开音频
          </Button>
          <Button
            icon={<FolderOpenOutlined />}
            onClick={() => setLyricPickerOpen(true)}
          >
            打开歌词
          </Button>
          <Button icon={<FileTextOutlined />} onClick={() => setPasteOpen(true)}>
            粘贴歌词
          </Button>

          <Dropdown
            menu={{
              items: exportItems,
              onClick: ({ key }) => handleExport(key as LyricFormat),
            }}
          >
            <Button icon={<UploadOutlined />}>
              导出 <DownloadOutlined />
            </Button>
          </Dropdown>

          <div style={{ width: 1, height: 24, background: '#e0e0e0' }} />

          <span style={{ fontSize: 13, color: '#666' }}>打轴模式:</span>
          <Segmented<EditMode>
            value={uiState.editMode}
            onChange={(v) => setEditMode(v)}
            options={[
              { label: '逐字模式 (→)', value: 'word' },
              { label: '逐句模式 (Enter)', value: 'line' },
            ]}
          />
        </Space>
      </div>

      <FilePickerModal
        open={audioPickerOpen}
        mode="audio"
        audioExtensions={AUDIO_FORMATS}
        lyricExtensions={LYRICAL_FILE_EXTENSIONS}
        onPickAudio={handlePickAudio}
        onPickLyric={handlePickLyric}
        onCancel={() => setAudioPickerOpen(false)}
      />

      <FilePickerModal
        open={lyricPickerOpen}
        mode="lyric"
        audioExtensions={AUDIO_FORMATS}
        lyricExtensions={LYRICAL_FILE_EXTENSIONS}
        onPickAudio={handlePickAudio}
        onPickLyric={handlePickLyric}
        onCancel={() => setLyricPickerOpen(false)}
      />

      <Modal
        title="粘贴歌词文本"
        open={pasteOpen}
        onOk={handlePasteLyric}
        onCancel={() => setPasteOpen(false)}
        okText="导入"
        cancelText="取消"
        width={600}
      >
        <Input.TextArea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={12}
          placeholder={'每行一句歌词，例如：\n明月几时有\n把酒问青天\n不知天上宫阙\n今夕是何年'}
        />
      </Modal>
    </>
  )
}
import { Button, Space, Segmented, message, Dropdown, Modal, Input, theme } from 'antd'
import {
  FolderOpenOutlined,
  SoundOutlined,
  DownloadOutlined,
  FileTextOutlined,
  EyeOutlined,
  SettingOutlined,
  EditOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { useState, useMemo } from 'react'
import { FileService } from '@/core/FileService'
import { LyricEngine } from '@/core/LyricEngine'
import { useLyricStore } from '@/store/lyricStore'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { FilePickerModal } from './FilePickerModal'
import { LyricPreview } from './LyricPreview'
import { SettingsModal } from './SettingsModal'
import { EditLyricModal } from './EditLyricModal'
import { HelpModal } from './HelpModal'
import { clearAllTimestamps } from '@shared/utils'
import { AUDIO_FORMATS, LYRICAL_FILE_EXTENSIONS } from '@shared/constants'
import type { LyricFormat } from '@shared/constants'
import type { EditMode } from '@shared/types'
import { loadDefaultSavePath } from '@shared/storage'

const fileService = new FileService()
const lyricEngine = new LyricEngine()

function getExtension(fileName: string): string {
  return fileName.match(/\.([^.]+)$/)?.[1]?.toLowerCase() || ''
}

async function readFileAsText(file: File): Promise<string> {
  return await file.text()
}

export function Toolbar() {
  const { token } = theme.useToken()
  const {
    lyricData,
    uiState,
    playState,
    setEditMode,
    setAudioFile,
    setLyricData,
    setLyricPath,
    setSelectedLine,
    resetTimestamps,
  } = useLyricStore()
  const { loadFile } = useAudioEngine()
  const [messageApi, contextHolder] = message.useMessage()

  const [audioPickerOpen, setAudioPickerOpen] = useState(false)
  const [lyricPickerOpen, setLyricPickerOpen] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const canPreview = useMemo(() => {
    const lines = lyricData.lines
    if (lines.length === 0) return false
    return lines.some(
      (l) => l.startTime > 0 || (l.words && l.words.some((w) => w.startTime > 0)),
    )
  }, [lyricData])

  const handlePickAudio = async (file: File) => {
    try {
      await loadFile(file)
      setAudioFile(file.name, file.name)
      resetTimestamps()
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
      if (ext === 'txt') {
        const text = await readFileAsText(file)
        data = lyricEngine.parseFromTextContent(text)
      } else {
        const buf = await file.arrayBuffer()
        data = lyricEngine.parseFromArrayBuffer(buf)
      }
      data = clearAllTimestamps(data)
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
    const data = clearAllTimestamps(lyricEngine.parseFromTextContent(pasteText))
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
      const buf = lyricEngine.generate(lyricData, format, playState.duration || undefined)
      const defaultName = `lyric.${format}`
      const defaultDir = loadDefaultSavePath() || undefined
      const savePath = await fileService.saveLyricFile(defaultName, buf, defaultDir)
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
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgLayout,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
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
            <Button icon={<DownloadOutlined />}>
              导出
            </Button>
          </Dropdown>

          <Button
            icon={<EyeOutlined />}
            onClick={() => {
              if (!canPreview) {
                messageApi.warning('请先导入歌词并标记时间戳后再预览')
                return
              }
              setPreviewOpen(true)
            }}
            disabled={!canPreview}
          >
            预览
          </Button>

          <Button
            icon={<EditOutlined />}
            onClick={() => setEditOpen(true)}
          >
            编辑
          </Button>

          <div
            style={{
              width: 1,
              height: 24,
              background: token.colorBorderSecondary,
            }}
          />

          <span style={{ fontSize: 13, color: token.colorTextSecondary }}>
            打轴模式:
          </span>
          <Segmented<EditMode>
            value={uiState.editMode}
            onChange={(v) => setEditMode(v)}
            options={[
              { label: '逐字模式 (→)', value: 'word' },
              { label: '逐句模式 (Enter)', value: 'line' },
            ]}
          />
        </Space>

        <Space size={4}>
          <Button
            type="text"
            icon={<QuestionCircleOutlined />}
            onClick={() => setHelpOpen(true)}
          />
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => setSettingsOpen(true)}
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

      <LyricPreview open={previewOpen} onClose={() => setPreviewOpen(false)} />

      <EditLyricModal open={editOpen} onClose={() => setEditOpen(false)} />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}
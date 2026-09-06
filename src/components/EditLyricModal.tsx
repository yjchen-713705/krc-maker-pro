import { Modal, theme, Input, Button, message } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { useLyricStore } from '@/store/lyricStore'
import type { LyricMetadata } from '@shared/types'

interface Props {
  open: boolean
  onClose: () => void
}

const METADATA_FIELDS: { key: keyof LyricMetadata; label: string }[] = [
  { key: 'title', label: '歌曲标题 (ti)' },
  { key: 'artist', label: '歌手 (ar)' },
  { key: 'album', label: '专辑 (al)' },
  { key: 'producer', label: '制作人 (au)' },
  { key: 'lyricMaker', label: '歌词制作 (by)' },
]

export function EditLyricModal({ open, onClose }: Props) {
  const { token } = theme.useToken()
  const lyricData = useLyricStore((s) => s.lyricData)
  const updateMetadata = useLyricStore((s) => s.updateMetadata)
  const batchUpdateLyricText = useLyricStore((s) => s.batchUpdateLyricText)

  const [metaDraft, setMetaDraft] = useState<LyricMetadata>({})
  const [batchText, setBatchText] = useState('')

  useEffect(() => {
    if (open) {
      setMetaDraft({ ...lyricData.metadata })
      setBatchText(lyricData.lines.map((l) => l.text).join('\n'))
    }
  }, [open])

  const handleSaveMetadata = () => {
    const changes: Partial<LyricMetadata> = {}
    for (const field of METADATA_FIELDS) {
      const draftVal = metaDraft[field.key] ?? ''
      const origVal = lyricData.metadata[field.key] ?? ''
      if (draftVal.trim() !== origVal.trim()) {
        changes[field.key] = draftVal.trim()
      }
    }
    if (Object.keys(changes).length > 0) {
      updateMetadata(changes)
      message.success('元数据已保存')
    } else {
      message.info('没有变化')
    }
  }

  const handleSaveBatchText = () => {
    if (lyricData.lines.length === 0) {
      message.warning('请先导入或粘贴歌词')
      return
    }
    batchUpdateLyricText(batchText)
    message.success('歌词文本已更新')
  }

  const hasContent = lyricData.lines.length > 0

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <EditOutlined />
          编辑歌词
        </span>
      }
      footer={null}
      width={640}
      centered
    >
      {hasContent ? (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: token.colorText }}>
            元数据
          </div>
          <div style={{ display: 'grid', gap: 10, marginBottom: 4 }}>
            {METADATA_FIELDS.map((field) => (
              <div key={field.key}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: token.colorTextSecondary,
                    marginBottom: 4,
                  }}
                >
                  {field.label}
                </label>
                <Input
                  placeholder={`请输入${field.label}`}
                  value={metaDraft[field.key] ?? ''}
                  onChange={(e) =>
                    setMetaDraft((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  size="small"
                />
              </div>
            ))}
          </div>
          <Button type="primary" size="small" onClick={handleSaveMetadata} style={{ marginTop: 8 }}>
            保存元数据
          </Button>

          <div
            style={{
              borderTop: `1px solid ${token.colorBorderSecondary}`,
              margin: '24px 0 16px',
            }}
          />

          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: token.colorText }}>
            批量编辑歌词文本
          </div>
          <div style={{ fontSize: 12, color: token.colorTextSecondary, marginBottom: 8 }}>
            修改文本后，已有时间戳按以下规则保留：文本完全相同的行保持所有时间戳；文本变化的行重置字级时间戳。
          </div>
          <textarea
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            style={{
              width: '100%',
              minHeight: 160,
              padding: 10,
              borderRadius: 6,
              background: token.colorBgElevated,
              border: `1px solid ${token.colorBorderSecondary}`,
              color: token.colorText,
              fontSize: 13,
              fontFamily: 'monospace',
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <span style={{ fontSize: 12, color: token.colorTextTertiary }}>
              {batchText.split('\n').filter((l) => l.trim()).length} 行
              {'  '}
              →{'  '}
              原 {lyricData.lines.length} 行
            </span>
            <Button type="primary" size="small" onClick={handleSaveBatchText}>
              保存文本
            </Button>
          </div>
        </>
      ) : (
        <div style={{ color: token.colorTextTertiary, padding: '16px 0' }}>
          请先导入或粘贴歌词
        </div>
      )}
    </Modal>
  )
}
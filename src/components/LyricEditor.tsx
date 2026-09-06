import { Table, Input, Button, Space, theme } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useRef, useEffect } from 'react'
import { useLyricStore } from '@/store/lyricStore'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { formatTimeDisplay } from '@shared/utils'

export function LyricEditor() {
  const { token } = theme.useToken()
  const lyricData = useLyricStore((s) => s.lyricData)
  const uiState = useLyricStore((s) => s.uiState)
  const addLine = useLyricStore((s) => s.addLine)
  const removeLine = useLyricStore((s) => s.removeLine)
  const updateLineText = useLyricStore((s) => s.updateLineText)
  const splitLineIntoWords = useLyricStore((s) => s.splitLineIntoWords)
  const setSelectedLine = useLyricStore((s) => s.setSelectedLine)
  const setWordStartTime = useLyricStore((s) => s.setWordStartTime)
  const setEditingLyric = useLyricStore((s) => s.setEditingLyric)
  const { engine } = useAudioEngine()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const idx = uiState.selectedLineIndex
    if (idx < 0) return

    const tbody = container.querySelector('.ant-table-tbody')
    if (!tbody) return
    const row = tbody.querySelector<HTMLElement>(`[data-row-key="${idx}"]`)
    if (!row) return

    const rowHeight = row.offsetHeight
    const containerHeight = container.clientHeight
    const selectedTop = row.offsetTop
    const viewTop = container.scrollTop
    const viewBottom = viewTop + containerHeight
    const targetBottom = selectedTop + rowHeight * 3

    if (targetBottom > viewBottom) {
      container.scrollTop = Math.max(0, targetBottom - containerHeight)
    } else if (selectedTop < viewTop) {
      container.scrollTop = selectedTop
    }
  }, [uiState.selectedLineIndex, lyricData.lines.length])

  const handleAddLine = () => addLine()

  const handleRemoveLine = (idx: number) => removeLine(idx)

  const handleTextChange = (idx: number, value: string) => {
    updateLineText(idx, value)
  }

  const handleRowClick = (idx: number) => setSelectedLine(idx)

  const handleWordClick = (lineIdx: number, wordIdx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const current = engine.getCurrentTime()
    if (current > 0) {
      setWordStartTime(lineIdx, wordIdx, current)
    }
  }

  const data = lyricData.lines

  const columns = [
    {
      title: '#',
      width: 56,
      render: (_: unknown, __: unknown, idx: number) => idx + 1,
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      width: 110,
      render: (v: number) => formatTimeDisplay(v),
    },
    {
      title: '歌词内容',
      width: 300,
      render: (_: unknown, __: unknown, idx: number) => (
        <Input.TextArea
          value={data[idx]?.text || ''}
          onChange={(e) => handleTextChange(idx, e.target.value)}
          onBlur={() => {
            setEditingLyric(false)
            splitLineIntoWords(idx)
          }}
          onFocus={() => setEditingLyric(true)}
          autoSize={{ minRows: 1, maxRows: 4 }}
          variant="borderless"
          placeholder="输入歌词..."
          style={{ fontSize: 14 }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      title: '逐字时间戳',
      render: (_: unknown, __: unknown, idx: number) => {
        const words = data[idx]?.words
        if (!words || words.length === 0) {
          return (
            <span style={{ color: token.colorTextTertiary, fontSize: 13 }}>
              输入文字后自动拆分
            </span>
          )
        }
        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {words.map((w, wIdx) => (
              <span
                key={wIdx}
                style={{
                  padding: '1px 5px',
                  background: w.startTime > 0 ? token.colorPrimaryBg : token.colorFillSecondary,
                  borderRadius: 3,
                  fontSize: 13,
                  cursor: 'pointer',
                  color: w.startTime > 0 ? token.colorPrimary : token.colorTextSecondary,
                }}
                title={w.startTime > 0 ? formatTimeDisplay(w.startTime) : '点击标记当前时间'}
                onClick={(e) => handleWordClick(idx, wIdx, e)}
              >
                {w.text}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      title: '操作',
      width: 60,
      render: (_: unknown, __: unknown, idx: number) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            handleRemoveLine(idx)
          }}
        />
      ),
    },
  ]

  const rowClassName = (_: unknown, idx: number): string => {
    const cls: string[] = []
    if (idx === uiState.selectedLineIndex) cls.push('ant-table-row-selected')
    return cls.join(' ')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '8px 16px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 500 }}>
          歌词列表 ({lyricData.lines.length} 行)
          {uiState.selectedLineIndex >= 0 && lyricData.lines.length > 0 && (
            <span style={{ color: token.colorTextTertiary, marginLeft: 12, fontSize: 12 }}>
              选中行: {uiState.selectedLineIndex + 1}
            </span>
          )}
        </span>
        <Space>
          <Button icon={<PlusOutlined />} onClick={handleAddLine} size="small">
            添加行
          </Button>
        </Space>
      </div>

      <div ref={scrollContainerRef} style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        <Table
          rowKey={(_, idx) => String(idx)}
          columns={columns}
          dataSource={data}
          pagination={false}
          size="small"
          style={{ fontSize: 14 }}
          rowClassName={rowClassName}
          onRow={(_, idx) => ({
            onClick: () => handleRowClick(idx as number),
          })}
        />
      </div>
    </div>
  )
}
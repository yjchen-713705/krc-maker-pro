import { Table, Input, Button, Space } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useLyricStore } from '@/store/lyricStore'
import { useAudioEngine } from '@/hooks/useAudioEngine'

function formatTime(ms: number): string {
  if (ms <= 0) return '--:--.---'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  const milli = ms % 1000
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(milli).padStart(3, '0')}`
}

export function LyricEditor() {
  const {
    lyricData,
    uiState,
    playState,
    addLine,
    removeLine,
    updateLineText,
    splitLineIntoWords,
    setSelectedLine,
    setWordStartTime,
  } = useLyricStore()
  const { engine } = useAudioEngine()

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
      render: (v: number) => formatTime(v),
    },
    {
      title: '歌词内容',
      width: 300,
      render: (_: unknown, __: unknown, idx: number) => (
        <Input.TextArea
          value={data[idx]?.text || ''}
          onChange={(e) => handleTextChange(idx, e.target.value)}
          onBlur={() => splitLineIntoWords(idx)}
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
          return <span style={{ color: '#bbb', fontSize: 13 }}>输入文字后自动拆分</span>
        }
        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {words.map((w, wIdx) => (
              <span
                key={wIdx}
                style={{
                  padding: '1px 5px',
                  background: w.startTime > 0 ? '#e6f4ff' : '#f5f5f5',
                  borderRadius: 3,
                  fontSize: 13,
                  cursor: 'pointer',
                  color: w.startTime > 0 ? '#1677ff' : '#666',
                }}
                title={w.startTime > 0 ? formatTime(w.startTime) : '点击标记当前时间'}
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
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 500 }}>
          歌词列表 ({lyricData.lines.length} 行)
          {playState.duration > 0 && playState.currentTime > 0 && (
            <span style={{ color: '#999', marginLeft: 12, fontSize: 12 }}>
              当前选中行高亮: {uiState.selectedLineIndex + 1}
            </span>
          )}
        </span>
        <Space>
          <Button icon={<PlusOutlined />} onClick={handleAddLine} size="small">
            添加行
          </Button>
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
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
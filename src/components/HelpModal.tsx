import { Modal, theme } from 'antd'

interface Props {
  open: boolean
  onClose: () => void
}

const SECTIONS: { icon: string; title: string; desc: string }[] = [
  { icon: '📂', title: '加载音频', desc: '拖拽音频文件到窗口，或点击"打开音频"按钮' },
  { icon: '📝', title: '加载歌词', desc: '导入现有 .lrc/.krc 文件，或直接粘贴纯文本歌词' },
  { icon: '✏️', title: '打轴（标记时间）', desc: '播放音频，在每句歌词开始时按 Enter 标记整句\n或在逐字模式下按 → 键逐字标记' },
  { icon: '👁️', title: '预览', desc: '点击"预览"按钮，全屏查看卡拉OK效果' },
  { icon: '💾', title: '导出', desc: '导出为 .krc（酷狗专用）或 .lrc（通用）格式' },
]

const SHORTCUTS = [
  { k: 'Space', v: '播放/暂停' },
  { k: 'Enter', v: '标记整句时间' },
  { k: '→', v: '逐字标记' },
  { k: 'Ctrl+Z', v: '撤销' },
  { k: 'Ctrl+Y', v: '重做' },
]

export function HelpModal({ open, onClose }: Props) {
  const { token } = theme.useToken()

  return (
    <Modal
      title="使用指南"
      open={open}
      onOk={onClose}
      onCancel={onClose}
      okText="知道了"
      cancelButtonProps={{ style: { display: 'none' } }}
      width={600}
      centered
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {SECTIONS.map((s) => (
          <div
            key={s.title}
            style={{
              display: 'flex',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: '22px' }}>{s.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: token.colorText, marginBottom: 2 }}>
                {s.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: token.colorTextSecondary,
                  whiteSpace: 'pre-line',
                  lineHeight: 1.6,
                }}
              >
                {s.desc}
              </div>
            </div>
          </div>
        ))}

        <div
          style={{
            marginTop: 12,
            padding: '12px 14px',
            background: token.colorBgLayout,
            borderRadius: 8,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: token.colorText,
              marginBottom: 8,
            }}
          >
            快捷键
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
            {SHORTCUTS.map((sc) => (
              <span key={sc.k} style={{ fontSize: 12, color: token.colorTextSecondary }}>
                <kbd
                  style={{
                    display: 'inline-block',
                    padding: '1px 6px',
                    marginRight: 4,
                    background: token.colorBgContainer,
                    border: `1px solid ${token.colorBorder}`,
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: 'monospace',
                    color: token.colorText,
                  }}
                >
                  {sc.k}
                </kbd>
                {sc.v}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
import { ConfigProvider, Layout, theme as antTheme } from 'antd'
import { Toolbar } from '@/components/Toolbar'
import { LyricEditor } from '@/components/LyricEditor'
import { AudioControls } from '@/components/AudioControls'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useDragDrop } from '@/hooks/useDragDrop'
import { useThemeStore } from '@/store/themeStore'

const { Header, Content, Footer } = Layout

function App() {
  const { isDragging } = useDragDrop()
  useKeyboardShortcuts()

  const mode = useThemeStore((s) => s.mode)
  const primaryColor = useThemeStore((s) => s.primaryColor)

  const algorithm = mode === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm

  return (
    <ConfigProvider
      theme={{
        algorithm,
        token: {
          colorPrimary: primaryColor,
        },
      }}
    >
      <Layout style={{ height: '100vh' }}>
        <Header
          style={{
            background: primaryColor,
            filter: mode === 'dark' ? 'brightness(0.8)' : undefined,
            padding: '0 24px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            fontSize: 16,
            fontWeight: 600,
            height: 48,
            lineHeight: '48px',
          }}
        >
          🎵 KRC Maker Pro
        </Header>

        <Toolbar />

        <Content
          className={isDragging ? 'drop-zone-active' : ''}
          style={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
            border: isDragging ? `2px dashed ${primaryColor}` : 'none',
            transition: 'all 0.2s',
          }}
        >
          {isDragging && (
            <div
              style={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                padding: '8px 20px',
                borderRadius: 6,
                border: `1px dashed ${primaryColor}`,
                color: primaryColor,
                fontSize: 14,
                pointerEvents: 'none',
              }}
            >
              松开以加载音频或歌词文件
            </div>
          )}
          <LyricEditor />
        </Content>

        <Footer style={{ padding: 0 }}>
          <AudioControls />
        </Footer>
      </Layout>
    </ConfigProvider>
  )
}

export default App
import { Modal, theme } from 'antd'
import { SettingOutlined, BgColorsOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { PRIMARY_COLOR_PRESETS } from '@shared/themePresets'
import type { ThemeMode } from '@shared/themePresets'

interface Props {
  open: boolean
  onClose: () => void
}

type MenuKey = 'visual'

const MENU_ITEMS: { key: MenuKey; label: string; icon: React.ReactNode }[] = [
  { key: 'visual', label: '视觉', icon: <BgColorsOutlined /> },
]

export function SettingsModal({ open, onClose }: Props) {
  const { token } = theme.useToken()
  const mode = useThemeStore((s) => s.mode)
  const primaryColor = useThemeStore((s) => s.primaryColor)
  const setMode = useThemeStore((s) => s.setMode)
  const setPrimaryColor = useThemeStore((s) => s.setPrimaryColor)

  const [activeMenu, setActiveMenu] = useState<MenuKey>('visual')

  const currentPreset = PRIMARY_COLOR_PRESETS.find((p) => p.color === primaryColor)

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SettingOutlined />
          设置
        </span>
      }
      footer={null}
      width={560}
      centered
    >
      <div style={{ display: 'flex', minHeight: 320 }}>
        <div
          style={{
            width: 120,
            borderRight: `1px solid ${token.colorBorderSecondary}`,
            padding: '12px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {MENU_ITEMS.map((item) => {
            const active = activeMenu === item.key
            return (
              <button
                key={item.key}
                onClick={() => setActiveMenu(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 16px',
                  border: 'none',
                  background: active ? token.colorPrimaryBg : 'transparent',
                  color: active ? token.colorPrimary : token.colorText,
                  fontWeight: active ? 500 : 400,
                  fontSize: 14,
                  cursor: 'pointer',
                  borderLeft: active ? `3px solid ${token.colorPrimary}` : '3px solid transparent',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                }}
              >
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </div>

        <div style={{ flex: 1, padding: '20px 24px' }}>
          {activeMenu === 'visual' && (
            <>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 12,
                  color: token.colorText,
                }}
              >
                模式
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
                {(['light', 'dark'] as ThemeMode[]).map((m) => {
                  const active = mode === m
                  return (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      style={{
                        padding: '10px 22px',
                        borderRadius: 8,
                        border: active
                          ? `2px solid ${token.colorPrimary}`
                          : `1px solid ${token.colorBorderSecondary}`,
                        background: active
                          ? token.colorPrimaryBg
                          : token.colorBgContainer,
                        color: active ? token.colorPrimary : token.colorText,
                        fontWeight: active ? 500 : 400,
                        fontSize: 14,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {m === 'light' ? '☀ 白天' : '🌙 黑夜'}
                    </button>
                  )
                })}
              </div>

              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 12,
                  color: token.colorText,
                }}
              >
                主色调
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 14,
                  flexWrap: 'wrap',
                  padding: '16px 0',
                }}
              >
                {PRIMARY_COLOR_PRESETS.map((preset) => {
                  const selected = primaryColor === preset.color
                  return (
                    <button
                      key={preset.name}
                      onClick={() => setPrimaryColor(preset.color)}
                      title={preset.label}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: preset.color,
                        border: selected
                          ? `2px solid ${token.colorText}`
                          : '2px solid transparent',
                        boxShadow:
                          'inset 0 1px 3px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.08)',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 0.15s',
                        outline: 'none',
                      }}
                    />
                  )
                })}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: token.colorTextTertiary,
                }}
              >
                当前主色：
                <span style={{ color: token.colorTextSecondary, marginLeft: 4 }}>
                  {currentPreset?.label || '自定义'}
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: primaryColor,
                    marginLeft: 8,
                    verticalAlign: 'middle',
                    boxShadow:
                      'inset 0 1px 2px rgba(0,0,0,0.25)',
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
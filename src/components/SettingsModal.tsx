import { Modal, theme, Button, message } from 'antd'
import {
  SettingOutlined,
  BgColorsOutlined,
  FolderOutlined,
  KeyOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons'
import { useState, useEffect, useRef } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { FileService } from '@/core/FileService'
import { PRIMARY_COLOR_PRESETS } from '@shared/themePresets'
import type { ThemeMode } from '@shared/themePresets'
import {
  DEFAULT_SHORTCUTS,
  loadCustomShortcuts,
  saveCustomShortcuts,
  getResolvedShortcuts,
  formatShortcutForDisplay,
  buildShortcutFromEvent,
} from '@shared/shortcuts'
import { loadDefaultSavePath, saveDefaultSavePath } from '@shared/storage'

interface Props {
  open: boolean
  onClose: () => void
}

type MenuKey = 'file' | 'shortcut' | 'visual'

const MENU_ITEMS: { key: MenuKey; label: string; icon: React.ReactNode }[] = [
  { key: 'file', label: '文件', icon: <FolderOutlined /> },
  { key: 'shortcut', label: '快捷键', icon: <KeyOutlined /> },
  { key: 'visual', label: '视觉', icon: <BgColorsOutlined /> },
]

export function SettingsModal({ open, onClose }: Props) {
  const { token } = theme.useToken()
  const mode = useThemeStore((s) => s.mode)
  const primaryColor = useThemeStore((s) => s.primaryColor)
  const setMode = useThemeStore((s) => s.setMode)
  const setPrimaryColor = useThemeStore((s) => s.setPrimaryColor)

  const [activeMenu, setActiveMenu] = useState<MenuKey>('visual')

  const [savePath, setSavePath] = useState<string | null>(null)
  const [customShortcuts, setCustomShortcuts] = useState<Record<string, string>>({})
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null)
  const [pendingShortcut, setPendingShortcut] = useState<string>('')
  const shortcutInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setSavePath(loadDefaultSavePath())
      setCustomShortcuts(loadCustomShortcuts())
      setEditingShortcut(null)
      setPendingShortcut('')
    }
  }, [open])

  const currentPreset = PRIMARY_COLOR_PRESETS.find((p) => p.color === primaryColor)

  const fileServiceRef = useRef(new FileService())

  const handleChooseFolder = async () => {
    const result = await fileServiceRef.current.openFolder()
    if (result) {
      saveDefaultSavePath(result)
      setSavePath(result)
      message.success('默认保存路径已更新')
    }
  }

  const handleClearSavePath = () => {
    saveDefaultSavePath(null)
    setSavePath(null)
  }

  const resolvedShortcuts = getResolvedShortcuts()

  const startEditingShortcut = (id: string) => {
    setEditingShortcut(id)
    setPendingShortcut('')
    setTimeout(() => shortcutInputRef.current?.focus(), 50)
  }

  const cancelEditingShortcut = () => {
    setEditingShortcut(null)
    setPendingShortcut('')
  }

  const handleShortcutKeyDown = (e: React.KeyboardEvent) => {
    if (!editingShortcut) return
    e.preventDefault()

    if (e.key === 'Backspace' || e.key === 'Delete') {
      const newCustom = { ...customShortcuts }
      delete newCustom[editingShortcut]
      saveCustomShortcuts(newCustom)
      setCustomShortcuts(newCustom)
      setEditingShortcut(null)
      message.success('已恢复默认')
      return
    }

    if (e.key === 'Escape') {
      cancelEditingShortcut()
      return
    }

    const shortcut = buildShortcutFromEvent(e.nativeEvent)

    for (const def of DEFAULT_SHORTCUTS) {
      if (def.id !== editingShortcut) {
        const resolved = customShortcuts[def.id] ?? def.defaultShortcut
        if (resolved === shortcut) {
          message.warning(`该快捷键已被「${def.name}」占用，请重新设置`)
          return
        }
      }
    }

    setPendingShortcut(shortcut)
  }

  const confirmEditingShortcut = () => {
    if (!editingShortcut || !pendingShortcut) {
      cancelEditingShortcut()
      return
    }
    const newCustom = { ...customShortcuts, [editingShortcut]: pendingShortcut }
    saveCustomShortcuts(newCustom)
    setCustomShortcuts(newCustom)
    setEditingShortcut(null)
    message.success('快捷键已更新')
  }

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
      width={640}
      centered
    >
      <div style={{ display: 'flex', minHeight: 360 }}>
        <div
          style={{
            width: 110,
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

        <div style={{ flex: 1, padding: '20px 24px', maxHeight: 460, overflowY: 'auto' }}>
          {activeMenu === 'file' && (
            <>
              <SectionTitle text="默认保存路径" token={token} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: token.colorBgElevated,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    fontSize: 13,
                    color: savePath ? token.colorText : token.colorTextTertiary,
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={savePath || ''}
                >
                  {savePath || '（未设置，使用系统默认目录）'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button icon={<FolderOpenOutlined />} onClick={handleChooseFolder}>
                  选择文件夹…
                </Button>
                {savePath && (
                  <Button onClick={handleClearSavePath}>清除</Button>
                )}
              </div>
              <div style={{ marginTop: 20, fontSize: 12, color: token.colorTextTertiary }}>
                设置后，导出 KRC/LRC 时会默认保存到该目录。
              </div>
            </>
          )}

          {activeMenu === 'shortcut' && (
            <>
              <SectionTitle text="快捷键列表" token={token} />
              <div style={{ fontSize: 12, color: token.colorTextSecondary, marginBottom: 12 }}>
                点击快捷键组合进行修改，按下新的组合键即可。按 Backspace/Delete 恢复默认，ESC 取消。
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {DEFAULT_SHORTCUTS.map((def) => {
                  const isEditing = editingShortcut === def.id
                  const displayValue = isEditing
                    ? pendingShortcut
                      ? formatShortcutForDisplay(pendingShortcut)
                      : '按下新组合键…'
                    : formatShortcutForDisplay(resolvedShortcuts[def.id])
                  const isModified = customShortcuts[def.id] !== undefined

                  return (
                    <div
                      key={def.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderRadius: 6,
                        background: isEditing
                          ? token.colorPrimaryBg
                          : token.colorBgElevated,
                        border: `1px solid ${
                          isEditing ? token.colorPrimary : token.colorBorderSecondary
                        }`,
                      }}
                    >
                      <div style={{ fontSize: 13, color: token.colorText }}>
                        {def.name}
                        {isModified && (
                          <span
                            style={{
                              fontSize: 10,
                              color: token.colorPrimary,
                              marginLeft: 8,
                            }}
                          >
                            自定义
                          </span>
                        )}
                      </div>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            ref={shortcutInputRef}
                            readOnly
                            value={displayValue}
                            onKeyDown={handleShortcutKeyDown}
                            style={{
                              padding: '2px 8px',
                              minWidth: 160,
                              background: 'transparent',
                              border: 'none',
                              outline: 'none',
                              textAlign: 'right',
                              color: token.colorPrimary,
                              fontFamily: 'monospace',
                              fontSize: 12,
                            }}
                          />
                          <Button
                            size="small"
                            type="primary"
                            disabled={!pendingShortcut}
                            onClick={confirmEditingShortcut}
                          >
                            确定
                          </Button>
                          <Button size="small" onClick={cancelEditingShortcut}>
                            取消
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditingShortcut(def.id)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 4,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            background: token.colorBgContainer,
                            color: token.colorText,
                            fontSize: 12,
                            fontFamily: 'monospace',
                            cursor: 'pointer',
                          }}
                        >
                          {displayValue}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {activeMenu === 'visual' && (
            <>
              <SectionTitle text="模式" token={token} />
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

              <SectionTitle text="主色调" token={token} />
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
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.25)',
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

function SectionTitle({ text, token }: { text: string; token: any }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 12,
        color: token.colorText,
      }}
    >
      {text}
    </div>
  )
}
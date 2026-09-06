export interface ShortcutDef {
  id: string
  name: string
  platform: 'all' | 'mac' | 'win'
  defaultShortcut: string
}

export const DEFAULT_SHORTCUTS: ShortcutDef[] = [
  { id: 'playPause', name: '播放/暂停', platform: 'all', defaultShortcut: 'Space' },
  { id: 'markWord', name: '标记当前字', platform: 'all', defaultShortcut: 'ArrowRight' },
  { id: 'markLine', name: '标记当前行', platform: 'all', defaultShortcut: 'Enter' },
  { id: 'prevLine', name: '选择上一行', platform: 'all', defaultShortcut: 'ArrowUp' },
  { id: 'nextLine', name: '选择下一行', platform: 'all', defaultShortcut: 'ArrowDown' },
  { id: 'undo', name: '撤销', platform: 'all', defaultShortcut: 'CtrlOrCmd+KeyZ' },
  { id: 'redo', name: '重做', platform: 'all', defaultShortcut: 'CtrlOrCmd+KeyY' },
  { id: 'closePreview', name: '关闭预览', platform: 'all', defaultShortcut: 'Escape' },
]

const STORAGE_KEY = 'customShortcuts'

export function loadCustomShortcuts(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function saveCustomShortcuts(custom: Record<string, string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
}

export function getResolvedShortcuts(): Record<string, string> {
  const custom = loadCustomShortcuts()
  const resolved: Record<string, string> = {}
  for (const def of DEFAULT_SHORTCUTS) {
    resolved[def.id] = custom[def.id] ?? def.defaultShortcut
  }
  return resolved
}

export function formatShortcutForDisplay(sc: string): string {
  if (!sc) return '（未设置）'
  return sc
    .replace('CtrlOrCmd+', isMac ? '⌘+' : 'Ctrl+')
    .replace('Key', '')
    .replace('Arrow', '')
    .replace('Control', 'Ctrl')
    .replace('Escape', 'ESC')
    .replace(' ', 'Space')
}

export function buildShortcutFromEvent(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Control')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')
  if (e.metaKey) parts.push('Meta')

  const key = e.key
  let codePart: string
  if (key === ' ' || key === 'Spacebar') codePart = 'Space'
  else if (key.length === 1) codePart = `Key${key.toUpperCase()}`
  else codePart = key

  parts.push(codePart)
  return parts.join('+')
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
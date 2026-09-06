export interface ThemePreset {
  name: string
  label: string
  color: string
}

export const PRIMARY_COLOR_PRESETS: ThemePreset[] = [
  { name: 'geek-blue', label: '极客蓝', color: '#1677ff' },
  { name: 'tech-indigo', label: '科技靛蓝', color: '#4F46E5' },
  { name: 'aurora-purple', label: '极光紫', color: '#722ED1' },
  { name: 'neon-pink', label: '霓虹粉', color: '#EB2F96' },
  { name: 'cyber-cyan', label: '赛博青', color: '#13C2C2' },
  { name: 'vibrant-orange', label: '活力橙', color: '#FA8C16' },
  { name: 'matcha-green', label: '抹茶绿', color: '#10B981' },
  { name: 'neutral-gray', label: '中性灰', color: '#595959' },
]

export const DEFAULT_PRIMARY_COLOR = '#4F46E5'
export const DEFAULT_THEME_MODE: ThemeMode = 'light'

export type ThemeMode = 'light' | 'dark'
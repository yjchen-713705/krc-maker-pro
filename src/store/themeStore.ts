import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeMode } from '@shared/themePresets'
import { DEFAULT_PRIMARY_COLOR, DEFAULT_THEME_MODE } from '@shared/themePresets'

interface ThemeStore {
  mode: ThemeMode
  primaryColor: string
  setMode: (mode: ThemeMode) => void
  setPrimaryColor: (color: string) => void
  toggleMode: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      mode: DEFAULT_THEME_MODE,
      primaryColor: DEFAULT_PRIMARY_COLOR,
      setMode: (mode) => set({ mode }),
      setPrimaryColor: (color) => set({ primaryColor: color }),
      toggleMode: () =>
        set((s) => ({ mode: s.mode === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'krc-maker-theme',
    },
  ),
)
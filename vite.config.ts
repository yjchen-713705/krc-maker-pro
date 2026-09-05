import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'

function copyPreload() {
  if (!existsSync('dist-electron')) {
    mkdirSync('dist-electron', { recursive: true })
  }
  copyFileSync('electron/preload.cjs', 'dist-electron/preload.cjs')
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            minify: false,
          },
          resolve: {
            alias: {
              '@shared': path.resolve(__dirname, 'shared'),
            },
          },
        },
      },
    ]),
    {
      name: 'copy-preload',
      configureServer() {
        copyPreload()
      },
      closeBundle() {
        copyPreload()
      },
    },
    renderer(),
  ],
})
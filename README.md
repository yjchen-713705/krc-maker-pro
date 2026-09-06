# KRC Maker Pro

一个跨平台的桌面歌词制作工具，复刻酷狗音乐歌词制作功能。基于 **Electron + React + Vite + Ant Design** 构建。

## 环境要求

- Node.js >= 18
- [pnpm](https://pnpm.io/)（推荐）

## 安装依赖

```bash
pnpm install
```

## 开发模式

同时启动 Vite 开发服务器和 Electron 窗口，支持 HMR 热更新。

```bash
pnpm dev
```

## 构建打包

构建前端和 Electron 主进程代码，然后用 `electron-builder` 打包成对应平台的安装包。

```bash
pnpm build
```

产物输出在 `release/${version}/` 目录下。

### 平台配置说明

打包配置位于 `electron-builder.json5`，默认已开启以下平台：

| 平台 | 产物格式 |
|------|----------|
| macOS (arm64) | `.dmg` |
| Windows (x64) | `.exe` (NSIS 安装向导) |
| Linux | `.AppImage` |

### Electron 镜像源

由于 GitHub 证书链问题，已在配置中指定 npmmirror 镜像源下载 Electron 二进制：

```json5
electronDownload: {
  mirror: 'https://npmmirror.com/mirrors/electron/'
}
```

如需切换其他镜像（腾讯云、阿里云等），直接修改此处的 `mirror` 地址即可。
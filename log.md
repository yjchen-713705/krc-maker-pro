# KRC Maker Pro · 第一阶段开发日志

> 完成日期：2026-09-05
> 目标：搭建完整项目骨架 + 最小可运行 UI + 核心导入/导出/播放/打轴流程

---

## 一、项目技术栈

| 类别 | 选型 | 版本 |
|------|------|------|
| 桌面框架 | Electron | latest |
| 前端框架 | React + TypeScript | React 18 / TS 6 |
| 构建工具 | electron-vite + Vite | Vite 5 |
| 状态管理 | Zustand | 4.5 |
| UI 组件库 | Ant Design | 5.21 |
| 歌词核心库 | @jyostudio/lyric | 1.0.2 |
| 包管理 | pnpm | - |

---

## 二、目录结构

```
krc-maker/
├── electron/
│   ├── main.ts              # 主进程：窗口创建 + IPC handler
│   ├── preload.cjs          # preload 桥接（手写 CommonJS，绕开 vite-plugin-electron 编译 bug）
│   └── electron-env.d.ts
├── shared/
│   ├── constants.ts         # IPC_CHANNELS / 格式列表常量
│   ├── types.ts             # LyricData / PlayState / UIState 核心类型
│   └── utils.ts             # splitTextToWords（标点合并）/ encodeText / decodeBuffer
├── src/
│   ├── main.tsx             # 入口：ConfigProvider + zhCN
│   ├── App.tsx              # 根组件布局
│   ├── core/
│   │   ├── AudioEngine.ts   # HTMLAudioElement 封装 + rAF 毫秒级时间推送
│   │   ├── LyricEngine.ts   # @jyostudio/lyric 封装（parse/generate/toLrcText）
│   │   └── FileService.ts   # window.electronAPI 调用封装
│   ├── store/
│   │   └── lyricStore.ts    # Zustand Store：lyricData + playState + uiState + 全部 actions
│   ├── hooks/
│   │   ├── useAudioEngine.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useDragDrop.ts
│   └── components/
│       ├── Toolbar.tsx          # 顶部工具栏
│       ├── FilePickerModal.tsx  # 虚线拖拽 + 点击文件选择弹窗
│       ├── LyricEditor.tsx      # 歌词编辑 Table
│       └── AudioControls.tsx    # 播放控制条
├── vite.config.ts              # 3 个子构建 + preload 复制插件
├── tsconfig.json               # TS 严格模式 + paths 别名
└── package.json
```

---

## 三、已实现功能

### 核心流程

| 功能 | 状态 | 实现方式 |
|------|------|---------|
| 打开音频文件 | ✅ | FilePickerModal（虚线框 + 点击/拖拽）→ file.arrayBuffer() → URL.createObjectURL → AudioEngine.loadFile() |
| 打开歌词文件（KRC/LRC） | ✅ | FilePickerModal → file.arrayBuffer() → LyricEngine.parseFromArrayBuffer() |
| 打开歌词文件（TXT 纯文本） | ✅ | FilePickerModal → file.text() → LyricEngine.parseFromTextContent() → parsePlainLines() |
| 粘贴歌词文本 | ✅ | Toolbar Modal TextArea → parseFromTextContent() |
| KRC 导出 | ✅ | LyricEngine.generate(lyricData, 'krc') → FileService.saveLyricFile → Electron native save dialog |
| LRC 导出 | ✅ | LyricEngine.generate(lyricData, 'lrc') → 同上 |
| 播放/暂停 | ✅ | AudioEngine.play()/pause() + 双向同步 Store.currentTime |
| 进度条拖拽 | ✅ | Ant Slider → AudioEngine.seek(ms) |
| 音量 + 静音 | ✅ | Slider + 静音按钮 |
| 歌词行文本编辑 | ✅ | Table 行内 TextArea，失焦自动按字符拆分为 words |
| 逐字点击标记时间戳 | ✅ | 播放中点击字 span → 当前时间标记给该字 |
| 添加/删除歌词行 | ✅ | Toolbar + 每行删除按钮 |
| 拖拽文件加载 | ✅ | 窗口拖入自动识别扩展名 |
| 模式切换（逐字/逐句） | ✅ | Segmented 组件 |
| 键盘快捷键 | ✅ | Space 播放暂停、→ 标记下一字、Enter 标记整句、↑/↓ 切换行 |
| 标点附着逻辑 | ✅ | splitTextToWords()：Unicode 属性正则 \p{P}\p{S} 匹配标点，合并到前一字 |

### 三层架构

- **表现层**（components + hooks）：只管 UI 和交互
- **状态层**（lyricStore）：单一数据源，全部 actions
- **核心层**（core/*）：纯引擎，不依赖 React/Zustand，IPC 通过 preload 桥接

---

## 四、开发阶段修复的问题

### 依赖与构建（4 项）

1. **@jyostudio/lyric 类型报错** → tsconfig paths 重定向到 dist/lyric.d.ts
2. **@ant-design/icons 缺失** → pnpm add @ant-design/icons@6.3.4
3. **图标名不匹配**（SoundMutedOutlined 等）→ 改为 SoundOutlined / MutedOutlined
4. **electron-builder 证书过期**（2026-09-03）→ 不影响 dev，临时方案：ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ pnpm install

### TypeScript 配置（2 项）

5. **baseUrl 弃用警告** → TS6 移除 baseUrl，paths 值改为相对路径格式带 ./ 前缀
6. **editMode 取值路径错** → 改为 uiState.editMode

### Electron IPC 链路（4 项）

7. **preload 路径错**（preload.mjs vs preload.js）→ 改为 preload.js
8. **preload 脚本逗号丢失，IPC 静默失效** → 手写 preload.cjs 纯 CommonJS，自定义 Vite 插件复制到 dist-electron/
9. **Electron 原生 dialog 不稳定** → 打开音频/歌词改用 FilePickerModal + HTML5 File API，导出保留 IPC（写盘必须走主进程）
10. **vite dev 模式不触发 preload 复制** → configureServer + closeBundle 双钩子

### 音频加载（2 项）

11. **crossOrigin='anonymous' 导致 MediaError** → 删除，blob: URL 不支持 CORS 预检
12. **ObjectURL 内存泄漏** → load/loadFile 前自动 revokeObjectURL

### 歌词解析/生成（4 项）

13. **Lyric.generate 报"参数必须为 Lyric 实例"** → 改为 round-trip：LyricData → toLrcText → new Lyric(buffer) → Lyric.generate(真实实例, format)
14. **txt 导出多余** → Toolbar 菜单 / LYRIC_FORMATS / generate 签名三层收缩
15. **粘贴纯文本歌词无响应** → @jyostudio/lyric 接无时间戳文本抛空异常。先正则检测 /\[\d{1,2}:\d{2}[\.:]\d{1,3}\]/，无时间戳直接走 parsePlainLines，不交给库
16. **LRC 导出后重新导入报"加载歌词失败"**（最终修复）→ .lrc 改走 file.arrayBuffer() → parseFromArrayBuffer()，绕开 file.text() 编码变量

---

## 五、测试验证

### 手动测试覆盖

| 测试项 | 结果 |
|--------|------|
| 粘贴纯文本歌词 → 拆分行 + 标点合并 | ✅ |
| 导入 .lrc（时间戳歌词） | ✅ |
| 导入 .krc | ✅ |
| KRC 导出 → 重新导入 round-trip | ✅ |
| LRC 导出 → 重新导入 round-trip | ✅ |
| 打开音频 → 播放 → 暂停 → 进度拖拽 → 切歌 | ✅ |
| 逐字点击标记时间戳 | ✅ |
| 键盘快捷键（Space/→/Enter/↑/↓） | ✅ |
| 标点附着："明月几时有？把酒问青天。" → words 合并标点 | ✅ |
| 拖拽文件加载 | ✅ |

### 单元测试辅助（node 脚本）

- @jyostudio/lyric 库自身 round-trip（parse→generate→parse）→ 正常
- 我们 formatTime() 生成的时间戳 → 库能解析
- toLrcText() 混合输出（metadata + 有时间戳行 + 无时间戳行）→ 库能解析
- 文件写盘/读盘（fs.writeFileSync / fs.readFileSync）→ UTF-8 无 BOM
- TextEncoder/TextDecoder 编码 → 正常

---

## 六、第二阶段功能增量（2026-09-05 同日迭代）

> 在第一阶段骨架上追加打轴预览、撤销重做、键盘完善、主题切换四大模块

### 新增文件

| 文件 | 说明 |
|------|------|
| `shared/themePresets.ts` | 8 个主色调预设 + 默认色常量 |
| `src/store/themeStore.ts` | Zustand store（mode + primaryColor），persist 到 localStorage |
| `src/store/lyricStore.ts` | 大改：history 栈（history/historyIndex）、undo/redo、pushHistory、resetTimestamps、findLastMarkedLine、findNextUnmarkedWord、setEditingLyric |
| `src/components/LyricPreview.tsx` | 新建：全屏暗色 overlay，订阅 AudioEngine.onTimeUpdate，LyricEngine.updateCurrentTime(time, lyricData) 算高亮，自动滚动，底部播放控制条 + Slider 进度条 |
| `src/components/SettingsModal.tsx` | 新建：左侧菜单（视觉）+ 右侧模式切换 + 8 个彩色圆点主色调选择器 + 当前颜色名显示 |

### 修改文件汇总

| 文件 | 改动要点 |
|------|---------|
| `shared/types.ts` | UIState 加 `isEditingLyric: boolean` |
| `shared/utils.ts` | 新增 `clearAllTimestamps(data)` 工具函数 |
| `src/App.tsx` | ConfigProvider 注入主题（dark/light algorithm + colorPrimary token）；Header 跟随 primaryColor，暗色下 `brightness(0.8)`；拖拽区颜色跟随主题 |
| `src/core/LyricEngine.ts` | `updateCurrentTime(ms, lyricData?)` 加第二参数，纯文本时自行遍历 lines 匹配时间 |
| `src/hooks/useAudioEngine.ts` | AudioEngine.load() 移除多余的 `revokeObjectURL()`（修复重复撤销 bug） |
| `src/hooks/useKeyboardShortcuts.ts` | 重写：去掉全局 INPUT/TEXTAREA return；Enter 仅 `editMode==='line' && isEditingLyric` 时拦截；逐字模式 Enter 不拦截；→ 用 findNextUnmarkedWord，全标记完只跳行不 fallback；Space/ArrowUp/Down/Left 加 isEditingField 判断；加 Ctrl/Cmd+Z undo、Ctrl/Cmd+Y/Ctrl/Cmd+Shift+Z redo + preventDefault |
| `src/components/Toolbar.tsx` | 右上角齿轮按钮 + SettingsModal；三个导入入口加 clearAllTimestamps；替换硬编码颜色为 antd token |
| `src/components/LyricEditor.tsx` | TextArea 加 onFocus/onBlur 控制 setEditingLyric；自动滚动 useEffect（当前行+后两行保持可见）；Zustand selector 单独订阅字段避免高频重渲染；替换硬编码颜色 |
| `src/components/AudioControls.tsx` | 替换硬编码颜色为 antd token |
| `src/components/FilePickerModal.tsx` | 替换硬编码颜色为 antd token |
| `src/hooks/useDragDrop.ts` | 音频导入后 resetTimestamps；歌词导入 clearAllTimestamps |
| `src/index.css` | 所有硬编码色改为 antd CSS 变量（`--ant-color-primary` 等）；新增 `.ant-table-row-selected` 高亮 |

### 新增功能清单

| 功能 | 说明 |
|------|------|
| **保存前歌词预览** | 全屏暗色 overlay，金色行/字高亮，自动滚动，ESC 关闭，关闭时自动 stop 音频 + 重置 isPlaying |
| **撤销 / 重做** | history 栈（最多 100 条），Ctrl/Cmd+Z 撤销，Ctrl/Cmd+Y / Ctrl+Shift+Z 重做。setLyricData 导入后自动存初始快照。pushHistory 统一在 set 之后调用（存修改后状态） |
| **撤销后自动定位** | undo/redo 恢复数据后调用 findLastMarkedLine 跳到最后一个有有效时间戳的位置（逐字模式找最后一个 word.startTime > 0，逐句模式找最后一个 line.startTime > 0） |
| **键盘逐字打轴完善** | 去掉全局 INPUT/TEXTAREA return；粘贴 Modal TextArea 中方向键正常移动光标；逐字模式下逐行全标记完自动跳下一行找未标记字，不 fallback 到整行标记 |
| **导入时清空时间戳** | 导入新音频（保留文本）/ 新歌词（替换文本）后统一清空所有 startTime/duration，不修改原文件 |
| **主题切换** | 亮色/暗色模式 + 8 个主色调预设，persist 到 localStorage，antd ConfigProvider 驱动 |
| **自动滚动** | 打轴时当前行 + 后两行保持可见，最后 3 行自动滚到末尾 |

### 开发阶段修复的 Bug（第二阶段）

17. **AudioEngine.loadFile 重复 revokeObjectURL** → load 方法内部误撤销了 loadFile 创建的新 URL（调用链：loadFile → revoke 旧 URL → create 新 URL → 存入 objectUrl → load → revoke 此时 objectUrl 已是新 URL）。修复：load() 移除 revokeObjectURL，生命周期完全交给 loadFile() 管理。

18. **history push 时序反了（撤销跳多个字）** → 所有写数据的方法先 pushHistory（存修改前状态），再 set 修改。导致 history 数组缺少中间快照，Ctrl+Z 一次撤多步。修复：统一改为 **先 set 修改，再 pushHistory 存修改后状态**。

19. **按向右键音频卡顿** → LyricEditor 通过 `useLyricStore()` 解构整个 store，订阅了高频变化的 playState.currentTime（rAF 60fps），导致 antd Table 每秒重渲染 60 次。修复：改为 Zustand selector 分别订阅，移除对 playState 的依赖。

20. **撤销回退后光标停在错误位置** → 撤销后数据回退但 selectedLineIndex 保持原值，可能指向无时间戳的新行。修复：undo/redo 恢复数据后调用 findLastMarkedLine 自动跳到最后一个有有效时间戳的位置（逐字模式找 word.startTime > 0，逐句模式找 line.startTime > 0）。

21. **粘贴歌词 Modal 中方向键失效** → useKeyboardShortcuts 拦截了所有焦点在 INPUT/TEXTAREA 的按键（包括方向键）。修复：去掉全局 return，改为逐键判断 isEditingField 时放行方向键和 Space。

---

## 七、测试验证（第二阶段补充）

### 手动测试覆盖（新增）

| 测试项 | 结果 |
|--------|------|
| 预览：有时间戳的歌词 → 全屏金色高亮 → 播放跟随 → ESC 关闭 → isPlaying 重置 | ✅ |
| 预览：无时间戳歌词 → 预览按钮禁用 + 提示 | ✅ |
| Ctrl+Z / Ctrl+Y 逐字撤销重做 | ✅ |
| 撤销后光标自动跳到最后一个有时间戳的位置 | ✅ |
| 导入新音频 → 歌词文本保留，时间戳全部清空 | ✅ |
| 导入 .krc（带时间戳）→ 文本保留，时间戳清空 | ✅ |
| 粘贴歌词 → 时间戳清空 | ✅ |
| 按 → 键 10 次 → Ctrl+Z 10 次 逐步撤销（无跳步） | ✅ |
| 按 → 键音频播放流畅无卡顿 | ✅ |
| 自动滚动：打轴时当前行 + 后两行可见 | ✅ |
| 自动滚动：最后 3 行时滚到末尾 | ✅ |
| 粘贴 Modal TextArea 中方向键正常移动光标 | ✅ |
| Toolbar TextArea 中方向键正常移动光标 | ✅ |
| 暗色模式切换 + Header brightness(0.8) | ✅ |
| 切换主色调 → 全 UI 颜色跟随变化 | ✅ |
| 主题持久化：刷新后恢复上次选择 | ✅ |

### TypeScript / Vite Build

| 检查项 | 结果 |
|--------|------|
| `npx tsc --noEmit` | ✅ 0 错误 |
| `npx vite build`（renderer） | ✅ 成功（1047 kB gzip 334 kB） |
| `npx vite build`（electron） | ✅ 成功 |

---

## 八、已知未解决问题（待后续迭代）

### 主题 / 视觉

| # | 问题 | 说明 |
|---|------|------|
| 1 | **暗色模式细节未手动微调** | 目前仅启用 `antTheme.darkAlgorithm` 让 antd 自动适配。Table 表头、Modal 背景、Slider 轨道等组件在暗色下可能存在视觉舒适度问题（如对比度不够、某些边框发灰等）。待实际使用后按需手动覆盖 token |
| 2 | **LyricPreview 金色高亮为硬编码功能色** | 预览组件中正在演唱的字/行使用 `#FFD700` 金色高亮，这是刻意保留的"功能标识色"。如果未来要做"预览主题"或"多种高亮风格"（如渐变色、霓虹光效），需要抽成可配置 |
| 3 | **设置弹窗主色调无自定义输入** | 用户只能从 8 个预设圆点中选，没有 color picker 让用户输入 HEX 值。如需求场景出现再补 |

### 功能完整性

| # | 问题 | 说明 |
|---|------|------|
| 4 | **findNextUnmarkedWord 逐字模式下只找当前行的未标记字** | 当前逻辑：逐字模式下按 → 键，如果当前行所有字都已标记，会自动跳下一行找第一个未标记字。但如果跨行后中间某些行完全没有未标记字（比如整行已标记），会直接跳过那些行继续往下——这是正确行为，但有一个边界：如果从中间某行开始按 →，不会回头标记前一行遗漏的字 |
| 5 | **history 不记录 uiState.selectedWordIndex** | 当前 history 只存 lyricData，逐字模式下撤销后 selectedLineIndex 会被修正但无法精确到某个字索引。实际体验影响不大——因为 findNextUnmarkedWord 会从修正后的 selectedLineIndex 开始找下一个未标记字，但光标停在哪一个字上不直观 |
| 6 | **导出只支持 .krc / .lrc 两种格式** | 酷狗 KRC 带逐字时间戳是主力格式，但网易云 .nrc、QQ 音乐 .qrc 等格式不支持。@jyostudio/lyric 库本身也没暴露这些格式的 encode 方法 |
| 7 | **AudioEngine ObjectURL 生命周期未完全覆盖所有路径** | load() 方法现在不再自动 revoke，但如果有人绕过 loadFile() 直接调用 load(audio.src = 普通 URL)，ObjectURL 不会被清理——不过实际代码里 load() 是私有调用路径，目前安全 |

### 性能

| # | 问题 | 说明 |
|---|------|------|
| 8 | **history.pushHistory 每次都 structuredClone 整个 lyricData** | 100 行 × 5 字 = 500 word 对象，structuredClone 耗时在几十毫秒级。已从"debounce 合并历史"退回到"每次立即记录"（为了撤销精确性）。MAX_HISTORY = 100 做了上限控制。**决策：保持现状** — 实测 500 对象级耗时 < 50ms，远小于用户操作间隔（几百毫秒），不会造成卡顿。不做增量快照优化 |
| 9 | **LyricEditor Table 重渲染** | 已分离 playState 订阅。歌词数据任何变化仍会触发表格重渲染。**决策：保持现状** — 200 行以内 Antd Table diff 足够，实际流行歌曲歌词 20-50 行远低于阈值。备选方案：未来超长歌词引入 `react-window` 或 antd `virtual` 属性 |
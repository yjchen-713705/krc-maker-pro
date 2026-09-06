# KRC Maker Pro · 开发日志

> 第一阶段完成日期：2026-09-05（骨架 + 核心流程）
> 第二阶段完成日期：2026-09-05 同日（预览/撤销/键盘/主题）
> 第三阶段完成日期：2026-09-06（KRC 时间轴修复 + 撤回 seek 功能）
> 第四阶段完成日期：2026-09-06 同日（设置系统重构 + 快捷键自定义 + 编辑弹窗）

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

---

## 九、第三阶段修复（2026-09-06）

### 问题背景

导入酷狗 KRC 后出现三个严重问题：
1. **普通句延迟一个字**：歌已经唱完了，字还在"渐变播放"
2. **间奏时滚动非常慢**：间奏时间被算进上一行末字的 duration
3. **最后一句整体显示 / 逐字跳动**：最后一行整行当瞬时事件处理

### 根因诊断

完整的数据流链路：

```
用户打轴 → LyricData(words只有startTime, duration=0)
         → LyricEngine.toLrcText() → 纯 LRC（只有行时间，无逐字时间）
         → @jyostudio/lyric 解析 → 库内部 #autoDistributePseudoPerWord 伪逐字均分
         → KRC 生成
```

**三个根因**：

| # | 根因 | 代码位置 | 后果 |
|---|------|---------|------|
| 1 | `toLrcText()` 只输出纯 LRC `[mm:ss.SS]文本`，不输出 TRC 逐字格式 `<duration>字` | `LyricEngine.ts:79-94` | 库把整行当一个 Word，伪逐字均分 `line.duration / 字数`。但 `line.duration` 是"下一行 startTime − 当前行 startTime"，把间奏也算进去了 |
| 2 | 非末行末字 duration 用 `nextLine.startTime - lastWord.startTime`，把句间间隔也吞了 | 修复后新增的末字 fallback 逻辑 | 末字时长是其他字的 3+ 倍，渐变跨到下一句时间窗口，酷狗强制切换导致"闪动" |
| 3 | 未输出 `[length:mm:ss]` metadata，最后一行 `line.duration = Infinity`，KRC generator 把 Infinity 替换成 0 | 库 `src/parsers/lrc.ts` #setLastLineDuration | 最后一行 KRC 行头 `[startTime, 0]`，酷狗当作瞬时事件 → 整行逐字跳动 |

### 修复方案（三处改动，集中在 LyricEngine.ts）

**修复 1：toLrcText() 改为输出 TRC 逐字格式**

```typescript
// 改前：纯 LRC
[00:05.00]消防车的电话幺幺九。

// 改后：TRC 格式，逐字带 duration
[00:05.00]<400>消<400>防<400>车<400>的<400>电<400>话<400>幺<400>幺<400>九。
```

逐字模式条件：`line.words.every(w => w.startTime > 0)`，否则降级为纯 LRC（防"部分标记"的中间状态）。

逐字 duration 计算：
- 中间字 i：`words[i+1].startTime - words[i].startTime`
- 末字（wordCount ≥ 2）：`words[last].startTime - words[last-1].startTime`（用前一字实际时长，**不**包含句间间隔）
- 末字（wordCount = 1）：fallback 链 `nextLine.startTime` → `songDuration` → `0`
- `duration < 0` clamp 到 0

**修复 2：generate() 新增 songDuration 参数，输出 `[length:mm:ss]`**

```typescript
// Toolbar.tsx 调用时传入音频总时长
lyricEngine.generate(lyricData, format, playState.duration || undefined)
```

有 songDuration 时在 LRC 输出开头追加 `[length:mm:ss]` metadata，库的 `#setLastLineDuration` 就能正确算出最后一行的 `line.duration = songLen - lastLine.startTime`（有限正数）。

**修复 3：保留 `<0>` 标签，不跳过**

即使 duration ≤ 0 也输出 `<0>` 标签。跳过会导致库的 parser 按 `<\d+>` 拆分时文本错位（后续字标签对应前一个字文本）。酷狗 KRC 的 `duration=0` 合法，代表瞬时完成。

### 修改文件汇总

| 文件 | 改动 |
|------|------|
| `src/core/LyricEngine.ts` | 重写 `toLrcText()`：新增 `buildPerWordRow()` 计算逐字 duration，输出 TRC 格式；`generate()` 签名新增可选 `songDuration?: number`；有总时长时输出 `[length:mm:ss]` |
| `src/components/Toolbar.tsx` | 导出调用传入 `playState.duration` |

### 验证

| 场景 | 结果 |
|------|------|
| 普通句：字时长 = 相邻字间隔，无多余间隔 | ✅ |
| 有间奏的句：末字用前一字时长，不跨窗口 | ✅ 无闪动 |
| 最后一行（有 songDuration）：KRC 行头 duration 有限正数 | ✅ 平滑滚动 |
| 最后一行（无 songDuration）：末字 duration 用前一字时长 | ✅ 正常显示（歌曲播完后保持高亮） |
| 部分标记行（中间状态）：降级纯 LRC | ✅ 不输出逐字标签 |
| 单行单字末行：fallback 到 songDuration 差值 | ✅ |

---

## 十、撤回自动 Seek 功能（2026-09-06 同日）

### 需求

打轴时 Ctrl+Z 撤回一个字的时间戳后，音频自动 seek 到该字前 1 秒，方便重新标记。

### 实现方案

**在 store 的 undo() 内部 diff 拿 seek 目标，不引入 action 类型追踪**。

| 方案 | 决策 |
|------|------|
| A：undo 前 diff 当前快照 vs 目标快照，找 startTime 从 >0 变 ≤0 的字 | ✅ 选中。逻辑集中，不侵入 pushHistory 调用点 |
| B：pushHistory 时记录 action type + payload | ❌ 每个调用点都要加参数，侵入性大 |

#### 新增 `diffSeekTarget()`（lyricStore.ts）

```typescript
function diffSeekTarget(current: LyricData, target: LyricData): number | null
```

遍历 lines × words，找到任何 `startTime > 0 → ≤0` 的项，返回 `Math.max(0, prevTime - 1000)`。找不到返回 null。

#### undo() 返回值变化

```typescript
// 接口
undo: () => number | null  // 改前：() => void

// 实现：diff 在前，恢复状态在后
undo() {
  const seekTarget = diffSeekTarget(currentState, history[targetIndex])
  // ... 恢复状态 ...
  return seekTarget
}
```

#### 快捷键层消费（useKeyboardShortcuts.ts）

```typescript
const seekTarget = undo()
if (seekTarget !== null) {
  seek(seekTarget)
}
```

#### 自动触发的场景

| 操作 | startTime 变化 | diff 命中 | 自动 seek |
|------|--------------|----------|----------|
| 撤回 setWordStartTime | word.startTime >0 → 0 | ✅ | ✅ |
| 撤回 setLineStartTime | line.startTime >0 → 0 | ✅ | ✅ |
| 撤回 updateLineText | 无 startTime 变化 | ❌ | ❌ |
| 撤回 addLine / removeLine | 无 startTime 变化 | ❌ | ❌ |
| 撤回 resetTimestamps | 所有 startTime >0 → 0 | ✅ **但**批量清时间戳 seek 无意义 | （实际极少发生） |

### 修改文件汇总

| 文件 | 改动 |
|------|------|
| `src/store/lyricStore.ts` | 接口 `undo: () => number \| null`；新增 `diffSeekTarget()`；undo 内部 diff 在前，恢复在后 |
| `src/hooks/useKeyboardShortcuts.ts` | 解构 `seek`；Ctrl+Z 分支 undo 返回值有效时调 `seek(target)`；依赖数组加 `seek` |

### 边界情况

| 场景 | 处理 |
|------|------|
| 撤回的是第一个字（无前一字） | `Math.max(0, startTime - 1000)` 兜底到 0 |
| 不是打轴操作导致的 undo | diff 返回 null → 不 seek |
| 音频未加载 | seek 到无效时间浏览器自动 clamp |
| 批量清时间戳撤回 | diff 命中多个，返回第一个（最上方），实际影响极小 |

---

## 十一、UI 小修复（2026-09-06）

| 问题 | 修复 |
|------|------|
| 导出按钮左右都有图标（左 UploadOutlined，右 DownloadOutlined） | 只保留左 DownloadOutlined，移除 UploadOutlined import |

---

## 十二、设置系统重构 · 第四阶段（2026-09-06 同日）

### 需求背景

在原有主题设置基础上扩展功能入口：
1. **文件设置**：默认保存路径，导出 KRC/LRC 时自动填这个目录
2. **编辑**：元数据（ti/ar/al/au/by）编辑 + 批量歌词文本编辑
3. **快捷键自定义**：展示所有快捷键、支持修改、冲突检测、恢复默认
4. **视觉**：原有主题 + 主色调切换（已存在，纳入统一设置面板）

### 架构决策

| 决策点 | 结果 | 理由 |
|--------|------|------|
| 功能入口 | **齿轮 SettingsModal（文件/快捷键/视觉）+ toolbar 独立"编辑"按钮** | 用户明确要求编辑按钮在 toolbar 预览与打轴模式之间，不在齿轮里 |
| 持久化方案 | **localStorage 原生 key**（`custom-shortcuts` / `default-save-path`） | 两类数据分别独立，不走 themeStore 的 persist |
| 快捷键刷新 | **EventEmitter 自定义事件** `custom-shortcuts-updated` + `storage` 事件 | useKeyboardShortcuts 监听这两个事件，触发 `version++` → useEffect 重注册 handler |
| 批量文本更新策略 | **未修改行保留时间戳 / 修改行重置字级 startTime** | 平衡效率与正确性，改一个字不丢失整行标记 |

### 新增文件

| 文件 | 说明 |
|------|------|
| `shared/shortcuts.ts` | 7 个默认快捷键定义 + `DEFAULT_SHORTCUTS` 数组；`loadCustomShortcuts()` / `saveCustomShortcuts()` / `getResolvedShortcuts()` / `formatShortcutForDisplay()` / `buildShortcutFromEvent()` 五个工具函数 |
| `shared/storage.ts` | `loadDefaultSavePath()` / `saveDefaultSavePath()` 两个工具函数 |
| `src/components/EditLyricModal.tsx` | 独立编辑弹窗（元数据 5 字段 + 批量歌词文本 TextArea），从原 SettingsModal 拆出 |

### 修改文件汇总

| 文件 | 改动 |
|------|------|
| `src/components/SettingsModal.tsx` | 从单功能弹窗扩展为多标签页设置面板（左侧菜单 + 右侧内容区）；标签页缩减为文件/快捷键/视觉三个（编辑已拆出）；新增默认保存路径选择；新增快捷键自定义 |
| `src/components/Toolbar.tsx` | 新增 EditLyricModal import + `editOpen` state + 编辑按钮（`EditOutlined` 图标，位于"预览"与分隔线之间）；底部挂载 `<EditLyricModal>` 组件 |
| `src/hooks/useKeyboardShortcuts.ts` | 移除所有硬编码快捷键字符串，改从 `getResolvedShortcuts()` 动态读配置；新增 `version` state + `storage`/`custom-shortcuts-updated` 事件监听触发刷新；撤销/重做逻辑保留 |
| `src/store/lyricStore.ts` | 接口新增 `updateMetadata: (partial) => void` 和 `batchUpdateLyricText: (rawText) => void` 两个 action |

### 快捷键自定义实现细节

**冲突检测**：用户按下新组合键时，遍历 `DEFAULT_SHORTCUTS`（排除自身），查找其当前生效快捷键（优先 customShortcuts 中的覆盖值，否则 defaultShortcut），如果相同则提示冲突。

```typescript
for (const def of DEFAULT_SHORTCUTS) {
  if (def.id !== editingShortcut) {
    const resolved = customShortcuts[def.id] ?? def.defaultShortcut
    if (resolved === shortcut) {
      message.warning(`该快捷键已被「${def.name}」占用`)
      return
    }
  }
}
```

**动态刷新机制**：

```
SettingsModal 保存 → saveCustomShortcuts() → window.dispatchEvent('custom-shortcuts-updated')
                                               ↓
useKeyboardShortcuts 监听 → version++ → useEffect 重注册 handler → getResolvedShortcuts() 读新值
```

**恢复默认**：在编辑快捷键输入框中按 Backspace/Delete，直接从 customShortcuts 中删除该 id，保存后恢复使用 defaultShortcut。

### 默认保存路径实现细节

```typescript
// FileService.openFolder() → window.electronAPI.showOpenDialog({ properties: ['openDirectory'] })
// 主进程调用 dialog.showOpenDialog({ properties: ['openDirectory'] })
// 返回选中目录绝对路径 → saveDefaultSavePath(path) 存 localStorage
// 导出时 loadDefaultSavePath() 拿到路径作为 save dialog defaultPath
```

### 批量歌词文本更新逻辑

```typescript
batchUpdateLyricText(rawText):
  newTexts = rawText.split('\n').map(l => l.trimEnd()).filter(...)
  for each li:
    newText = newTexts[li]
    oldLine = oldLines[li]
    if oldLine && oldLine.text === newText:  // 文本完全相同
      push({ ...oldLine })                   // 保留原 line + 所有 words 的 startTime
    elif oldLine:                            // 文本有变化
      push({ ...oldLine, text: newText, words: splitTextToWords(newText).map(w => ({ ...w, startTime: 0 })) })
    else:                                    // 新增行
      push({ text: newText, startTime: 0, duration: 0, words: splitTextToWords(newText) })
```

### UI 布局变化

**Toolbar 按钮顺序（左→右）**：
```
打开音频 | 打开歌词 | 粘贴歌词 | 导出 ▾ | 预览 | 编辑 | │ 打轴模式: [逐字|逐句]   ⚙
```

**SettingsModal 三分区**：
```
┌────────┬─────────────────────────────────┐
│ 📁 文件 │  默认保存路径                   │
│ ⌨ 快捷键 │  快捷键列表（可点击修改）       │
│ 🎨 视觉 │  白天/黑夜 + 8 主色圆点        │
└────────┴─────────────────────────────────┘
```

### 验证

| 检查项 | 结果 |
|--------|------|
| `npx tsc --noEmit` | ✅ 0 错误 |
| `npm run dev` Vite 启动 | ✅ 正常 |
| 默认保存路径：选择文件夹 → localStorage 持久化 → 刷新保留 | ✅ |
| 默认保存路径：导出 dialog defaultPath 正确填入 | ✅ |
| 元数据编辑：修改 → 保存 → 导出 LRC metadata 正确 | ✅ |
| 批量文本编辑：改一行一个字 → 保存 → 该行重置字时间戳，其他行保留时间戳 | ✅ |
| 批量文本编辑：未改动行 → 所有字时间戳保留 | ✅ |
| 快捷键自定义：修改后保存 → 当前会话立即生效（version 刷新） | ✅ |
| 快捷键自定义：冲突检测（Space 已被 playPause 占用） | ✅ |
| 快捷键自定义：Backspace → 恢复默认 | ✅ |
| 快捷键自定义：刷新页面后 localStorage 持久化 | ✅ |
| 齿轮按钮 SettingsModal 视觉/快捷键/文件三个分区正常切换 | ✅ |
| 工具栏"编辑"按钮打开 EditLyricModal | ✅ |
| 工具栏按钮顺序正确（预览→编辑→分隔线→打轴模式） | ✅ |

### 修复的编译问题

| 问题 | 修复 |
|------|------|
| `KeyboardOutlined` 图标不存在 | 改为 Ant Design 实际存在的 `KeyOutlined` |
| SettingsModal `isMac` 导入但未使用 | 移除（shortcut.ts 已导出但当前不消费平台判断） |
| useKeyboardShortcuts 里残留的旧代码：废弃的 `matchesShortcut` 函数 / `needAlt/needMeta/needCode/keyPart/ctrlOrCmd/shiftKey` 未使用变量 | 重构时直接删掉旧函数，保留纯 `matchesShortcutRaw` + 动态配置读取 |
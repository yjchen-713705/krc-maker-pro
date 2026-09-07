## 📋 QRC 格式支持 - 开发 Prompt

### 一、QRC 格式说明

QRC（QQ Music Lyric）是QQ音乐专用的**逐字歌词格式**，精度可控制到每个字/单词。它基于 Lyricify 标准，是一种**无加密**的纯文本格式。

#### 1.1 核心结构

```
[整行起始时间,整行持续时长]歌词文本(字1起始时间,字1持续时长)(字2起始时间,字2持续时长)...
```

**格式要素**：

| 符号 | 含义 | 示例 |
|------|------|------|
| `[start,duration]` | 整行歌词的起始时间（ms）和持续时长（ms） | `[1790,2062]` |
| `(start,duration)` | 紧跟在其前方的**字/单词**的起始时间和持续时长 | `(1790,375)` |
| `文本` | 歌词内容，由多个字/单词组成 | `那一年` |

#### 1.2 完整示例

```
[1790,2062]那(1790,375)一(2165,309)年(2474,315)汪(2789,311)苏(3100,314)泷(3414,438)

[5052,3516]作(5052,252)曲(5304,248): (5552,252)汪(5804,253)苏(6057,247)泷
```

#### 1.3 关键规则

| 规则 | 说明 |
|------|------|
| **时间递增** | 时间轴必须按顺序排列，不允许重复或乱序 |
| **允许重叠** | 允许歌词时间段重叠（即多行同时高亮） |
| **背景人声** | 以 `(` 或 `（` 开头，`)` 或 `）` 结尾的行，会被识别为背景人声 |
| **时间单位** | 所有时间均为**毫秒（ms）**，整数 |

> **注意**：部分从QQ音乐导出的 `.qrc` 文件可能是**加密**的（3DES加密 + zlib压缩）。本项目**仅支持无加密的纯文本 QRC 格式**，加密 QRC 不在支持范围内，导入时若检测到加密格式应给出友好提示。

---

### 二、技术可行性确认

`@jyostudio/lyric` 库**已原生支持 QRC 格式**：

- 支持格式列表包含 QRC
- 自动识别优先级：**QRC → KRC → KSC → TRC → LRC**
- 支持 `Lyric.generate(lyric, 'qrc')` 导出为 ArrayBuffer
- 支持 `new Lyric(arrayBuffer)` 从 ArrayBuffer 解析

这意味着**无需自行实现 QRC 的解析和生成逻辑**，只需在现有代码中增加对 `.qrc` 扩展名的识别和路由即可。

---

### 三、开发路径与注意点


**导入路径（解析）**：

```
用户选择 .qrc 文件
    ↓
FileService.readLyricFile() → 识别扩展名为 'qrc'
    ↓
返回 { content: ArrayBuffer, extension: 'qrc', text?: string }
    ↓
Toolbar 调用 LyricEngine.parseFromArrayBuffer(arrayBuffer)
    ↓
new Lyric(arrayBuffer) → 库自动识别 QRC 格式并解析
    ↓
将 lyric.lines 映射到内部的 LyricData 数据结构
```

**导出路径（生成）**：

```
用户点击导出 → 选择 QRC 格式
    ↓
将内部的 LyricData 转换为库的 Lyric 对象
    ↓
Lyric.generate(lyric, 'qrc') → 返回 ArrayBuffer
    ↓
FileService.saveFile() → 写入 .qrc 文件
```

#### 3.3 需要特别注意的点

**① 导入时 KRC 与 QRC 的区分**

库的自动识别优先级是 **QRC → KRC**。如果某个文件同时符合 QRC 和 KRC 的格式特征，库会优先按 QRC 解析。这通常是正确的行为，但如果出现异常，可以在调用 `new Lyric()` 之前通过文件扩展名预先判断。

**② `toLrcText()` 不受影响**

`toLrcText()` 是项目内部用于生成 LRC 文本的方法，QRC 的导出走的是 `Lyric.generate(lyric, 'qrc')`，不经过 `toLrcText()`。因此**无需修改 `toLrcText()`**。

**③ QRC 的逐字粒度**

QRC 支持**单词级**逐字（不限于单字），与项目的 `LyricWord` 数据结构天然兼容——每个 `LyricWord` 对应 QRC 中的一个 `(start,duration)` 时间标签。

**④ 导出格式选择器**

在 Toolbar 的导出菜单中，目前有 KRC 和 LRC 两个选项。增加 QRC 后，菜单变为三个选项：

```
导出 → KRC (.krc)
     → LRC (.lrc)
     → QRC (.qrc)  ← 新增
```

**⑤ 文件扩展名常量**

在 `shared/constants.ts` 中，确保所有与歌词文件扩展名相关的数组都包含 `'qrc'`：

```typescript
export const LYRIC_FORMATS = ['lrc', 'krc', 'qrc'] as const;  // 新增 'qrc'
export const LYRICAL_FILE_EXTENSIONS = ['.lrc', '.krc', '.qrc'];  // 新增 '.qrc'
export const TEXT_BASED_EXTENSIONS = ['.lrc', '.txt'];  // QRC 是二进制文本，不属于纯文本
```

**⑥ 打开歌词的文件过滤器**

在 `electron/main.ts` 或 `FilePickerModal` 中，文件选择器的过滤器应包含 `.qrc`：

```typescript
{
  name: '歌词文件',
  extensions: ['lrc', 'krc', 'qrc']
}
```

---

### 四、验收标准

| 测试项 | 预期结果 |
|--------|----------|
| 打开 `.qrc` 文件 | 歌词正确解析，行时间戳和字时间戳完整显示 |
| 导出为 `.qrc` 格式 | 文件生成成功，用 QQ 音乐或库重新导入验证数据完整 |
| 导出的 QRC 再导入 | 时间轴数据无损（round-trip 测试通过） |
| 混合格式项目 | 同时导入 LRC/KRC/QRC 文件，各自正常工作 |
| 无加密 QRC 识别 | 正常解析；加密 QRC 给出“不支持加密格式”提示 |

---

### 五、边界条件与注意事项

| 场景 | 处理方式 |
|------|----------|
| 导入加密 QRC | 检测到非纯文本（乱码或二进制头），提示“当前不支持加密的 QRC 格式” |
| QRC 文件含 BOM | 库的 ArrayBuffer 解析应能正常处理 UTF-8 BOM |
| 空行或纯文本行 | 按库的默认行为处理（通常忽略无时间戳的行） |
| 时间轴乱序 | 库的解析器会按时间排序，无需额外处理 |
| 背景人声行 | 库的解析器会自动识别，映射到 `LyricData` 时保留 |

---


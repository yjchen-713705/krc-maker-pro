---

## 📋 完整实现 Prompt：多语言打轴支持（含混合模式开关）

### 功能目标

为 KRC Maker Pro 增加**多语言歌词打轴支持**，允许用户在**纯中文/日文/韩文**、**纯拉丁语系（英/法/西/德等）**和**混合语言**三种模式间灵活切换。核心是重构 `splitTextToWords` 分词逻辑，并在“编辑弹窗”顶部提供开关入口。

---

### 第一部分：用户界面（UI）改动

#### 1.1 编辑弹窗顶部增加开关

- **位置**：点击 Toolbar 的“**编辑**”按钮后打开的编辑弹窗（含“元数据”和“歌词文本”两个 Tab），在**弹窗顶部**、Tabs 上方增加一个开关区域。
- **布局**：
  ```
  ┌─────────────────────────────────────────────────────┐
  │  ☑ 混合语言模式（中日韩逐字 + 拉丁按词）            │  ← 新增开关
  │  开启后，中/日/韩文逐字打轴，英/法/西等按单词打轴  │  ← 说明文字
  ├─────────────────────────────────────────────────────┤
  │  [元数据]  [歌词文本]                              │  ← 原有 Tabs
  │  ...                                              │
  └─────────────────────────────────────────────────────┘
  ```
- **UI 组件**：使用 Ant Design 的 `Switch` 或 `Checkbox` 组件。
- **标签文字**：“**混合语言模式（中日韩逐字 + 拉丁按词）**”
- **辅助说明**：下方显示灰色小字：“开启后，中/日/韩文逐字打轴，英/法/西等按单词打轴”
- **默认状态**：**关闭**（`false`），保持现有自动检测行为。

#### 1.2 状态持久化

- 开关状态存储到 `localStorage`，key 为 `mixedLanguageMode`。
- 应用启动时读取该值，作为全局配置。
- 用户切换开关时，实时更新 `localStorage` 并**立即重新拆分当前所有歌词行的字数组**（详见第三部分）。

---

### 第二部分：核心分词逻辑重构（`shared/utils.ts`）

重构 `splitTextToWords` 函数，支持三种模式：

| 模式 | 触发条件 | 行为 |
|------|----------|------|
| **CJK 模式** | `mixedLanguageMode === false` 且文本含 CJK 字符 | 逐字拆分，标点合并到前一个字 |
| **拉丁模式** | `mixedLanguageMode === false` 且文本不含 CJK 字符 | 按空格拆分，标点合并到前一个单词 |
| **混合模式** | `mixedLanguageMode === true` | CJK 字符逐字拆分，拉丁字符按单词整体保留 |

#### 2.1 辅助函数：判断字符是否为 CJK

```typescript
function isCJK(char: string): boolean {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(char);
}
```

#### 2.2 核心函数：`splitTextToWords(text: string, mixedMode: boolean): string[]`

**完整实现逻辑**：

```typescript
export function splitTextToWords(text: string, mixedMode: boolean = false): string[] {
  if (!text) return [];

  // ---------- 混合模式：CJK逐字 + 拉丁按词 ----------
  if (mixedMode) {
    const result: string[] = [];
    let currentLatinBlock = '';

    for (const char of text) {
      if (isCJK(char)) {
        // 遇到 CJK 字符：先 flush 拉丁缓冲，再独立处理当前字符
        if (currentLatinBlock) {
          result.push(currentLatinBlock);
          currentLatinBlock = '';
        }
        // 标点合并逻辑：如果当前字符是标点且 result 有内容，合并到前一项
        if (/[\p{P}\p{S}]/u.test(char) && result.length > 0) {
          result[result.length - 1] += char;
        } else if (!/[\s]/.test(char)) {
          result.push(char);
        }
      } else if (/[\s]/.test(char)) {
        // 空格：flush 拉丁缓冲（空格不进入结果）
        if (currentLatinBlock) {
          result.push(currentLatinBlock);
          currentLatinBlock = '';
        }
      } else {
        // 拉丁字符（含数字、标点等）：累积到当前块
        currentLatinBlock += char;
      }
    }

    // 末尾 flush
    if (currentLatinBlock) {
      result.push(currentLatinBlock);
    }

    // 后处理：将孤立标点合并到前一个有效块
    return mergeStandalonePunctuation(result);
  }

  // ---------- 自动检测模式（mixedMode === false）----------
  const hasCJK = [...text].some(isCJK);

  if (hasCJK) {
    // CJK 模式：逐字拆分，标点合并
    const words: string[] = [];
    for (const char of text) {
      const isPunct = /[\p{P}\p{S}]/u.test(char);
      if (isPunct && words.length > 0) {
        words[words.length - 1] += char;
      } else if (!/\s/.test(char)) {
        words.push(char);
      }
    }
    return words;
  }

  // 拉丁模式：按空格拆分，标点合并
  const tokens = text.split(/[\s]+/).filter(t => t.length > 0);
  return mergeStandalonePunctuation(tokens);
}
```

#### 2.3 辅助函数：孤立标点合并

```typescript
function mergeStandalonePunctuation(tokens: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const isPunctOnly = /^[\p{P}\p{S}]+$/u.test(token);

    if (isPunctOnly) {
      if (result.length > 0) {
        result[result.length - 1] += token;
      } else if (i + 1 < tokens.length) {
        // 行首标点（如法文引号）合并到下一个块
        tokens[i + 1] = token + tokens[i + 1];
      }
    } else {
      result.push(token);
    }
  }
  return result;
}
```

---

### 第三部分：状态管理与歌词刷新

#### 3.1 在 `lyricStore.ts` 中新增状态

```typescript
// 新增字段
mixedLanguageMode: boolean;

// 新增 action：切换模式并重新拆分所有行
setMixedLanguageMode: (enabled: boolean) => void;
```

#### 3.2 切换模式时的行为

当用户切换开关时：

1. 更新 `lyricData.mixedLanguageMode = enabled`
2. 保存到 `localStorage`
3. **遍历所有歌词行，重新执行 `splitLineIntoWords`**：
   - 传入当前的 `mixedMode` 参数
   - 保留每行的 `startTime`（行级时间戳不受影响）
   - **丢弃原有的字级 `startTime`**（因为分词结果已变，旧的时间戳已无效）
   - 重新生成 `words` 数组，所有字 `startTime = 0`

> **重要**：切换模式会导致所有字级时间戳丢失，这是预期行为，因为分词结果已改变。应在 UI 上给出提示：“切换语言模式将重置所有字级时间戳，确定继续吗？”

#### 3.3 在 `splitLineIntoWords` 中传入混合模式参数

修改 `splitLineIntoWords` 函数签名：

```typescript
// 原：function splitLineIntoWords(line: LyricLine): LyricLine
// 新：
function splitLineIntoWords(line: LyricLine, mixedMode: boolean): LyricLine {
  const wordsText = splitTextToWords(line.text, mixedMode);
  return {
    ...line,
    words: wordsText.map(text => ({ text, startTime: 0, duration: 0 })),
  };
}
```

---

### 第四部分：打轴逻辑（`useKeyboardShortcuts.ts`）适配

#### 4.1 `→` 键行为无变化

逐字模式下的 `→` 键行为**无需修改**——它只是“标记当前行的下一个未标记字”，不管 `words` 数组里是单字还是单词，都按数组元素逐个标记。

#### 4.2 “下一个未标记字”的判断

使用 `findNextUnmarkedWord` 查找 `words` 数组中第一个 `startTime === 0` 的元素。中文模式下元素是单字，拉丁/混合模式下元素可能是单词（如 `Apple`），逻辑一致，无需改动。

#### 4.3 标点符号不占用打点位置

在 `splitTextToWords` 中标点已合并到前一个有效块，因此标点不会作为独立元素进入 `words` 数组，自然不会被标记。

---

### 第五部分：实时预览（`LyricPreview.tsx`）适配

#### 5.1 高亮逻辑无变化

预览组件中的高亮逻辑基于 `currentWordIndex` 和 `currentLineIndex`，与分词方式无关。中文模式下高亮单字，拉丁/混合模式下高亮整个单词，均正常工作。

#### 5.2 样式建议

为确保用户在混合模式下能清晰区分“逐字”和“按词”的效果：
- **中文/日文/韩文字**：逐个高亮（颜色变化）
- **拉丁单词**：整个单词同时高亮

两者的高亮颜色可以一致（如金色），视觉上用户会自然接受“中文一个字一个字亮，英文一个词一个词亮”的差异。

---

### 第六部分：文件变更清单

| 文件 | 改动内容 |
|------|----------|
| `shared/utils.ts` | 重构 `splitTextToWords`，新增 `isCJK`、`mergeStandalonePunctuation`，支持 `mixedMode` 参数 |
| `src/store/lyricStore.ts` | 新增 `mixedLanguageMode` 状态和 `setMixedLanguageMode` action；修改 `splitLineIntoWords` 调用，传入 `mixedMode`；切换模式时重置字级时间戳 |
| `src/components/EditModal.tsx` | 在弹窗顶部添加 Switch 开关，绑定 `mixedLanguageMode` 状态 |
| `src/hooks/useKeyboardShortcuts.ts` | 无需改动（打轴逻辑自动适配） |
| `src/components/LyricPreview.tsx` | 无需改动（高亮逻辑自动适配） |

---

### 第七部分：验收测试清单

| 测试场景 | 预期结果 |
|----------|----------|
| 开关关闭，输入中文 | 中文字被拆分为单个字，标点合并到前一个字 |
| 开关关闭，输入英文 | 英文按空格拆分为单词，标点合并到前一个单词 |
| 开关开启，输入中英混合 | 中文字拆分为单字，英文单词保持整体 |
| 切换开关后 | 弹出确认对话框，确认后所有字级时间戳重置为 0 |
| 重启应用 | 开关状态从 localStorage 恢复 |
| 导出 KRC | 分词结果正确，酷狗中播放正常 |

---

### ⚠️ 边界条件与注意事项

1. **切换模式时的数据丢失警告**：必须弹窗确认，防止用户误操作丢失打轴进度。
2. **法文特殊标点**（如 `«` `»` 带空格）：通过 `mergeStandalonePunctuation` 逻辑自动处理，无需额外代码。
3. **空行处理**：空行 `words` 数组为空，打轴时跳过。
4. **性能考虑**：单行歌词通常不超过 50 个字符，逐行拆分性能开销可忽略。

# Rendering 模块与 DSL 使用说明

本文档面向后续维护者，说明 `src/rendering` 的代码结构、DSL 语法、运行链路与常见改造入口。

## 1. 模块总览

`src/rendering` 里有两条并行能力：

- **场景 DSL（角括号）**：`<scene> + <item>`，用于整段场景编辑、保存、回填。
- **内容 DSL（方括号）**：`[quote] / [image] / [style] / [row] / [animate]...`，用于 item 正文内容渲染。

核心目录：

- `sceneDsl.ts`：`VideoScene <-> DSL` 的双向转换（序列化/反序列化，含容错告警）。
- `metadata.ts`：标签与属性元数据（属性助手、可视化配置的单一来源）。
- `quoteParser.tsx`：内容 DSL 主入口（normalize -> tokenize -> enrich -> render）。
- `parser/`：内容 DSL 的解析/渲染细分实现。
- `animation.ts`：通用动画样式解析与关键帧插值工具（`[animate]`、scene/item 动画都可复用）。
- `videoCanvas.ts`：画布尺寸与横竖版配置归一化。

## 2. 代码结构与职责映射

### 2.1 对外导出层

- `index.ts`
  - 导出 `videoCanvas`、`sceneDsl`、`quoteParser`，作为 `rendering` 模块公共入口。

### 2.2 场景 DSL（`<scene>/<item>`）

- `sceneDsl.ts`
  - `sceneToDsl(scene)`：把 `VideoScene` 转成可编辑 DSL 字符串。
  - `parseSceneDsl(text, fallbackScene?)`：把 DSL 解析回 `VideoScene`，并输出 `warnings`。
  - 关键特性：
    - 容错模式：缺少 `<scene>` 根节点时继续解析并给出警告。
    - 回退策略：缺失/非法属性会回退到 `fallbackScene` 或默认值。
    - 多别名支持：如 `animateFrom/af`、`keyframes/kf`、`bgImage/bgi`。
    - 换行编码：`item` 内容里的真实换行会编码为 `[\n]` 写回 DSL。

### 2.3 内容 DSL（`[quote]...[\/quote]` 等）

- `quoteParser.tsx`
  - Pipeline 主入口：`normalize` -> `tokenize` -> `enrich` -> `renderAST`。
- `parser/preprocessor.ts`
  - 文本规范化（中英文引号、省略号统一）。
- `parser/tokenizer.ts`
  - 把内容 DSL 解析为 AST（支持嵌套）。
  - 支持标签：`quote / image / gallery / style / row / animate / avatar`。
- `parser/enricher.ts`
  - AST 逻辑增强，主要是按 `maxLimit` 截断文本。
- `parser/renderer.tsx`
  - 将 AST 渲染成 React 节点，含媒体轮播、引用块玻璃效果、动画插值。
- `parser/utils.ts`
  - 行内属性解析、`quote` 起始标签解析、媒体序列解析等基础工具。
- `parser/types.ts`
  - AST 类型定义（新增标签时需同步更新）。

### 2.4 元数据与编辑器联动

- `metadata.ts`
  - 定义所有标签的属性清单、类型、默认值、别名、UI 展示信息。
  - 被以下 UI 消费：
    - `components/DslEditor.tsx`（属性助手）
    - `components/PropertyConfigContent.tsx`（可视化属性面板）

### 2.5 动画与画布工具

- `animation.ts`
  - CSS 风格串解析、easing 解析、关键帧插值、最终 style 计算。
- `videoCanvas.ts`
  - 横竖版尺寸默认值、最小尺寸限制、配置归一化与宽高比计算。

## 3. 运行链路（从编辑到预览）

### 3.1 场景编辑链路（`<scene>/<item>`）

1. 编辑器打开当前 scene：`sceneToDsl(scene)`。
2. 用户修改 DSL 文本。
3. 保存时：`parseSceneDsl(text, currentScene)`。
4. 返回 `scene + warnings`，写回 store。
5. 预览组件使用新 scene 渲染。

调用主要在：

- `pages/StudioScenePage/index.tsx`
- `hooks/useSceneDsl.ts`
- `hooks/useDslGlobalReplace.ts`
- `hooks/useDslTranslate.ts`
- `hooks/useSceneModificationActions.ts`

### 3.2 内容渲染链路（`[quote]/[image]...`）

1. `ScriptContentRenderer` 调用 `parseQuotes(content, ...)`。
2. `normalize` 规范化文本。
3. `tokenize` 产出 AST。
4. `enrich` 按限制截断。
5. `renderAST` 渲染出 React 节点（含播放帧上下文）。

调用主要在：

- `components/ScriptContentRenderer.tsx`

## 4. DSL 快速上手

### 4.1 场景 DSL 基本模板

```xml
<scene id="scene-001" duration=8 type="comments" layout="top" title="示例场景" bg="#111827">
  <item id="item-001" author="Alice" enterAt=0 exitAt=8 enterAnimation="fade" exitAnimation="none">
第一行内容[\n]第二行内容
  </item>

  <item id="item-002" author="Bob" enterAt=1.2 exitAt=7.6 bg="rgba(0,0,0,0.35)">
[quote author="Carol" max=120]这是一个引用[/quote]
  </item>
</scene>
```

### 4.2 内容 DSL 常用标签

- 引用

```text
[quote author="alice" max=120 depth=4 bg=#111 bc=#444]
被引用文本
[/quote]
```

- 图片/图集

```text
[image w=80% mh=420 mode=contain pos=center]https://example.com/a.jpg[/image]
[gallery duration=2.5]https://a.jpg|2.5,https://b.jpg|3[/gallery]
```

- 文本样式与布局

```text
[style color=#ffd666 size=28 align=center b]强调文本[/style]
[row gap=12 cols=2 cell=240 mode=cover][image]https://a.jpg[/image][image]https://b.jpg[/image][/row]
```

- 动画与头像

```text
[animate from="opacity:0; y:20" to="opacity:1; y:0" start=0.2 duration=0.6 easing=ease-out]
动画包裹内容
[/animate]
[avatar size=28 shape=circle]https://example.com/avatar.png[/avatar]
```

## 5. 属性命名与别名规则

场景与 item 支持短属性，便于手写：

- 动画：`af/at/as/ad/ae` -> `animateFrom/animateTo/animateStart/animateDuration/animateEasing`
- 偏移：`o` -> `offset`
- 关键帧：`kf` -> `keyframes`
- 背景图：`bgi/bgm` -> `backgroundImage/backgroundImageMode`
- item 玻璃态：`gb/go/gbc/gs/gd/ga/geg/gf/gg/gr`

建议：

- **对外模板**可用长属性（可读性好）。
- **批量生成**可用短属性（文本更紧凑）。

## 6. 维护改造指南（改哪里）

### 6.1 新增一个 DSL 标签（例如 `[badge]`）

按顺序修改：

1. `parser/types.ts`：新增 Node 类型定义。
2. `parser/tokenizer.ts`：识别新标签并生成 AST。
3. `parser/renderer.tsx`：渲染新节点。
4. `metadata.ts`：加入标签元数据（让属性助手可见）。
5. （可选）`parser/enricher.ts`：若需截断/继承逻辑，补充递归规则。

### 6.2 新增 scene/item 属性

1. `src/types.ts`：补充 `VideoScene` 或 `VideoContentItem` 字段。
2. `sceneDsl.ts`
   - `sceneToDsl`：序列化输出属性。
   - `parseSceneDsl`：解析输入属性和回退逻辑。
3. `metadata.ts`：配置属性元数据（UI 可编辑）。
4. 若涉及实际表现：`parser/renderer.tsx` 或相关 Scene 渲染组件同步实现。

### 6.3 调整动画语法/插值行为

- 主改：`animation.ts`（推荐统一在这里收敛）
- 次改：`parser/renderer.tsx`（`AnimateContent` 与媒体动画接线）
- 兼容性注意：保持 `from/to` 与 `keyframes` 两种写法都可用。

### 6.4 调整图片/图集渲染策略

- `parser/renderer.tsx`
  - `buildMediaStyles`
  - `MediaContent`
  - `getMediaUrl`（本地文件代理逻辑）
- `parser/utils.ts`
  - `parseMediaSequence`（`url|duration` 解析规则）

### 6.5 调整“可视化属性助手”显示

- `metadata.ts`：字段名、类型、默认值、别名、说明。
- `components/PropertyConfigContent.tsx`：属性组件渲染行为（颜色、数字、关键帧编辑器等）。

## 7. 常见注意点

- `parseSceneDsl` 默认是“容错 + 警告”模式，不是严格失败模式；保存流程要处理 `warnings`。
- `layout` 类型支持 `top/center/bottom`，新增布局时需同时同步 `types` 与 `sceneDsl` 校验集合。
- 内容 DSL 的 `audio` 标签目前被 tokenizer 忽略（`IGNORE_TAGS`），如要启用需补解析与渲染。
- 本地绝对路径图片通过 `http://localhost:5000/proxy_local_file` 代理访问，依赖本地服务。

## 8. 最小可维护测试建议

每次改 DSL 语法建议至少覆盖：

1. `sceneToDsl -> parseSceneDsl -> sceneToDsl` 往返一致性。
2. 嵌套 `quote/style/row/animate` 的解析与渲染稳定性。
3. `keyframes` 与 `from/to` 动画在预览帧推进时表现一致。
4. 本地路径与 HTTP 图片都可渲染。


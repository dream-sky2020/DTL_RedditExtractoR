# RedditExtractoR 项目地图

本文档是本仓库的长期协作上下文。开始修改代码前，先阅读本文件；当架构、关键入口、运行方式或跨模块约定发生变化时，同步更新本文件。

## 1. 项目定位

RedditExtractoR 是一个本地运行的 Reddit 视频制作与渲染工具：抓取 Reddit 内容，将内容转换为场景脚本，在 React 页面中编辑和预览，最后通过 Remotion 渲染画面，并由 Python/FFmpeg 完成音轨混合与成品输出。

核心技术：

- 前端：React 19、TypeScript、Vite、Ant Design
- 状态：Zustand，使用 IndexedDB 持久化
- 视频画面：Remotion 4、`@remotion/player`
- 本地服务：Flask
- 导出：Remotion CLI + Python worker + FFmpeg 音频混合

## 2. 总体数据流

```text
Reddit URL
  -> Flask /fetch_reddit
  -> useRedditStore（原始/过滤数据）
  -> redditTransformer 与拆分/合并逻辑
  -> useVideoStore.videoConfig
  -> 编辑器 / Studio / 设置页面
  -> VideoPreviewPlayer（预览模式）
  -> POST /render（完整 VideoConfig）
  -> tasks/queued
  -> scripts/worker.py
  -> Remotion 静音画面
  -> scripts/audio_mixer.py 合成音轨
  -> out/video-<taskId>.mp4
```

`VideoConfig` 是前端编辑、项目保存、预览和第一次最终导出的共同数据协议。新增属于母版内容的全局能力，应优先扩展 `VideoConfig`，而不是创建一套与渲染链路脱节的页面状态。成片后的衍生处理是例外；例如广告植入必须读取无广告母版并通过独立后处理任务生成新文件，不得写回 `VideoConfig`。

## 3. 应用与页面入口

- `src/main.tsx`：浏览器入口，挂载 React 应用。
- `src/App.tsx`：顶层 UI 状态；从当前 URL 恢复页面并同步浏览器前进/后退；初始化项目系统；监听主要 store 并自动保存当前项目快照；初始化 `useVideoRender`。
- `src/routing/toolRoutes.ts`：集中维护 `ToolKey` 与页面路径的双向映射，以及 Studio 场景编号路径。
- `src/types.ts`：共享领域类型；`ToolKey` 控制可用页面，`VideoConfig`/`VideoScene`/`VideoContentItem` 是视频核心模型。
- `src/components/AppSidebar.tsx`：左侧菜单定义。
- `src/pages/MainPages/index.tsx`：页面 import、标题/说明元数据、按 `activeTool` 显示页面。

新增普通页面通常需要同时修改：

1. `src/types.ts` 的 `ToolKey`。
2. `src/components/AppSidebar.tsx` 的菜单项。
3. `src/pages/MainPages/index.tsx` 的页面 import、`toolMeta` 分支和渲染分支。
4. 在 `src/pages/<FeaturePage>/index.tsx` 创建页面。

当前主要页面：

- `ExtractPage`：Reddit 链接抓取入口。
- `ProjectsPage`：本地项目管理。
- `EditorPage`：视频脚本和场景内容编辑。
- `StudioPage` / `StudioScenePage`：场景画板与单场景精细编辑。
- `VideoPreviewPage`：完整动画预览。
- `RenderTasksPage`：提交、查看、取消和清理导出任务。
- `AdPlacementPage`：在无广告母版上配置广告二次合成任务，并以原生视频分层方式预览时间、位置与尺寸。
- `ChromaKeyTestPage`：读取母片截图和绿幕广告截图，独立测试绿幕颜色、颜色容差与边缘融合。
- `BackgroundVideoPage`：最终导出专用背景视频轨道配置。
- `BgmSettingsPage`：全局背景音乐配置。
- `IdentityManagementPage` / `AvatarManagerPage`：作者身份、代号、颜色与头像资源。
- `AudioPreviewPage` / `QwenTtsTryPage`：音效素材与语音合成。
- `RawJsonPage` / `FilteredJsonPage` / `ScriptJsonPage`：不同处理阶段的数据检查。
- `DeprecatedPages/*`：兼容或调试用途，不作为新功能首选落点。

本项目没有使用 URL 路由库；页面导航由 `src/routing/toolRoutes.ts` 与浏览器 History API 驱动。菜单和页面内部跳转必须统一调用 `App.tsx` 提供的导航函数，不得直接修改 `activeTool`，以保证 URL、前进/后退和刷新恢复一致。普通页面使用固定路径，Studio 单场景页面使用 `/studio/scene/<场景编号>`。

## 4. 状态与持久化

Store 统一从 `src/store/index.ts` 导出：

- `useVideoStore.ts`：`videoConfig`、撤销/重做、从 Reddit 数据构建视频配置。
- `useRedditStore.ts`：Reddit URL、原始数据、过滤数据、作者信息。
- `useSettingsStore.ts`：内容转换和全局样式设置。
- `useProjectsStore.ts`：项目列表、当前项目、项目快照保存/恢复。
- `useIdentityStore.ts` / `useAvatarStore.ts`：身份库和头像库。
- `useSnapshotStore.ts`：文件快照相关状态。

持久化通过 `src/utils/storageAdapter.ts` 和 `src/constants/storage.ts` 接入 IndexedDB。`App.tsx` 在当前项目存在时，以约 400ms 防抖保存项目快照。

对 `VideoConfig` 新增的可序列化字段通常会随 `useVideoStore.getProjectState()` 自动进入项目快照，但仍需检查：

- `normalizeVideoConfig` 是否保留并补齐该字段。
- 默认视频配置和默认项目快照是否需要显式默认值。
- 旧项目缺少字段时是否安全降级。
- 撤销/重做是否符合该页面的交互预期。

不要把 `File`、DOM 节点、函数或其他不可 JSON 序列化对象放进 `VideoConfig`。素材配置应保存稳定的相对路径或可访问 URL。

## 5. 视频模型、DSL 与场景编辑

核心类型位于 `src/types.ts`：

- `VideoConfig`：标题、subreddit、场景、画布、背景视频、BGM、渲染模式。
- `VideoScene`：一个顺序播放的场景，`duration` 单位为秒。
- `VideoContentItem`：场景内的作者、文本、图片、进入/退出时间及动画等。

场景 DSL：

- `src/rendering/sceneDsl.ts`：`VideoScene` 与 `<scene>/<item>` DSL 相互转换。
- `src/hooks/useSceneDsl.ts`：页面侧场景 DSL 编辑流程。
- `src/rendering/README.md`：DSL 架构、语法和扩展指南。

内容 DSL：

- `src/rendering/quoteParser.tsx`：内容解析公开入口。
- `src/rendering/parser/tokenizer.ts`：解析 quote、image、gallery、style、row、animate、avatar 等标签。
- `src/rendering/parser/enricher.ts`：AST 逻辑增强。
- `src/rendering/parser/renderer.tsx`：AST 到 React 画面。
- `src/rendering/metadata.ts`：DSL 属性元数据，供编辑器和可视化属性面板使用。
- `src/components/ScriptContentRenderer.tsx`：内容 DSL 的主要消费组件。

新增 scene/item 字段时，应同步检查类型、`sceneDsl.ts`、元数据以及实际渲染组件。新增内容标签时，遵循 `src/rendering/README.md` 中的扩展顺序。

## 6. 预览与 Remotion 渲染

- `src/components/VideoPreviewPlayer.tsx`：封装 Remotion Player；强制使用 `renderMode: 'preview'`。
- `src/components/StudioFramePlayer.tsx`：Studio 中的场景预览封装。
- `src/remotion/index.tsx`：注册 `MyVideo` Composition，计算帧率、画布尺寸和最终总时长。
- `src/remotion/MyVideo.tsx`：主时间线；按 `scene.duration` 串联场景，渲染背景视频、场景音频和当前场景。
- `src/remotion/SceneRenderer.tsx`：单场景视觉渲染核心。
- `src/remotion/BackgroundVideoTrack.tsx`：最终导出背景视频轨道。
- `src/audio/SceneAudioMixer.tsx`：Remotion/预览侧场景音频。
- `src/rendering/videoCanvas.ts`：横竖版画布默认值、归一化及尺寸计算。

预览和最终导出存在刻意差异：

- 预览使用 `renderMode: 'preview'`，当前背景视频轨道不会在普通预览中渲染。
- worker 导出前把 `renderMode` 设为 `final`。
- worker 同时禁用 Remotion 场景音频，避免重复；最终音频由 `audio_mixer.py` 混合。

任何影响总时长、时间偏移或音频的功能，都必须同时检查：

1. `src/remotion/index.tsx` 的 Composition 总帧数。
2. `src/remotion/MyVideo.tsx` 的视觉时间线。
3. `src/components/VideoPreviewPlayer.tsx` 的预览行为。
4. `scripts/audio_mixer.py` 的最终音轨时间线。
5. 背景视频的播放/结束策略是否仍正确。

## 7. 本地服务与导出任务

- `scripts/server.py`：Flask 服务，默认由前端以 `http://localhost:5000` 访问。
- `src/hooks/useVideoRender.ts`：提交配置并约每 1.5 秒轮询任务。
- `scripts/worker.py`：从 `tasks/queued` 取任务，调用 Remotion，再调用音频混合器。
- `scripts/render.js`：Node 侧 Remotion 渲染入口。
- `scripts/audio_mixer.py`：FFmpeg 音轨混合和最终 MP4 封装。
- `tasks/{queued,running,success,error,cancelled}`：文件式任务队列。
- `out/`：导出视频目录。

关键接口：

- `GET /fetch_reddit`
- `POST /render`
- `GET /render/tasks`
- `POST /render/tasks/<id>/cancel`
- `DELETE /render/tasks/<id>`
- `POST /render/tasks/cleanup`
- `GET /list_audio`
- `GET /list_background_videos`
- `GET /list_bgm`
- `GET /list_avatars`
- `GET /pick_file`
- `GET /proxy_local_file`
- `GET /qwen_tts/status`
- `GET /qwen_tts/index`
- `POST /qwen_tts/synthesize`
- `DELETE /qwen_tts/cache/<digest>`
- `POST /snapshot/save_file`
- `GET /snapshot/load_file`

最终导出过程会创建临时 `video-config-<taskId>.json`，先输出静音 MP4，再混合音轨。不要假定 Remotion 内的 `<Audio>` 就会进入最终成品。

Qwen3-TTS 路由位于 `scripts/server.py`，实现复用 `scripts/qwen_tts_wrapper.py` 和 `scripts/qwen_tts_manifest.py`。`GET /qwen_tts/status` 只能做轻量包存在性检查，不得在状态请求中导入 PyTorch、Qwen 模型或触发 SoX 检查；模型只能在未命中 WAV 缓存且实际请求合成时懒加载。缓存索引和已有 WAV 回放不依赖模型加载。

## 8. 素材目录

- `public/avatar/`：头像及 `avatar-manifest.json`。
- `public/audio/shortAudio/`：短音效。
- `public/audio/bgm/`：背景音乐。
- `public/background-videos/`：背景视频。
- `public/cache/`：抓取或转换后的本地缓存。
- `public/loacal/`：仅限本机使用的素材或临时文件（目录名沿用现状拼写）。
- `public/docs/`：设计提案、DSL 和合并规则资料。

本地绝对路径素材通常通过 `/proxy_local_file` 访问。新增素材类型时，要同时考虑浏览器预览可访问性、Remotion 打包/渲染可访问性和 Python/FFmpeg 可访问性。

`public/cache/qwen_tts_*.wav`、`public/cache/qwen-tts-manifest.json` 和整个 `public/loacal/` 必须保持在 `.gitignore` 中，不得提交到仓库。

## 9. 常用命令

```text
npm run dev       启动 Vite 前端
npm run build     TypeScript 检查并构建前端
npm run preview   预览构建产物
npm run remotion  打开 Remotion 预览
npm run render    直接渲染 MyVideo 到 out/video.mp4
```

Flask 服务和 worker 是独立进程，入口分别为 `scripts/server.py` 与 `scripts/worker.py`。Python 依赖和本地 TTS 环境可能因机器而异，运行前先检查现有环境，不要擅自重装或升级依赖。

## 10. “植入广告”功能架构（已实现）

广告必须是成片后的独立二次处理功能，不进入原始 `VideoConfig`、Remotion 场景或第一次渲染流程。产品的首要约束是始终保留无广告母版；广告任务只读取母版并产生一个新的输出文件，禁止覆盖或改写母版。当前提供“绿幕融合”和“普通视频覆盖”两种处理方式。

目标流程：

```text
已经渲染好的无广告母版 + 可选引导音频 + 绿幕/普通广告视频 + 合成参数
  -> 广告植入页面提交请求
  -> scripts/server.py 创建广告合成任务
  -> tasks/queued（任务带明确的 taskType）
  -> scripts/worker.py 按任务类型分派
  -> FFmpeg 抠绿、缩放、定位、时间线与音频合成
  -> out/<母版名>-ad-<taskId>.mp4
```

广告功能实际接入点：

- `src/types.ts`：包含页面 `ToolKey`；广告配置不属于 `VideoConfig`。
- `src/components/AppSidebar.tsx`：包含“植入广告”菜单入口。
- `src/pages/MainPages/index.tsx`：注册广告页面及页面元数据。
- `src/pages/AdPlacementPage/index.tsx`：选择母版、广告视频和可选引导音频，预览时间线与位置并提交合成参数。
- `src/pages/ChromaKeyTestPage/index.tsx`：选择母片截图和广告截图，以静态 Canvas 合成独立调试抠绿参数；不创建渲染任务。图片路径和参数通过 `src/utils/adChromaSettings.ts` 自动持久化，切换页面或刷新后恢复。
- `scripts/server.py`：`GET /ad/videos` 提供视频和引导音频列表，`POST /ad/render` 创建任务，`GET /proxy_local_video` / `GET /proxy_local_audio` 提供素材预览，`GET /pick_video_file` / `GET /pick_audio_file` 选择任意本地素材，`GET /pick_srt_file` 选择并读取 UTF-8/GB18030/UTF-16 的 `.srt` 字幕。
- `scripts/worker.py`：识别 `taskType: 'ad_composite'`，执行独立广告合成任务并汇报进度。
- `scripts/ad_compositor.py`：使用 ffprobe 获取媒体信息，构造并执行 FFmpeg 抠绿、覆盖/暂停时间线和音频合成。
- `public/green-screen-videos/`：默认绿幕广告素材目录。
- `public/ad-videos/`：默认普通插入广告素材目录。

当前支持两种模式：

1. 不暂停母片：广告从指定时间开始覆盖在母片上；母片画面和时间线继续前进，成片总时长不变。
2. 暂停母片：在指定时间冻结母片画面，播放绿幕广告；广告结束后母片从原位置继续，成片总时长增加广告时长。

任务字段 `mode: 'plain-overlay'` 表示普通视频覆盖：不执行抠绿，保留广告视频自己的完整矩形画面，但与绿幕模式共用 `startAt`、`pauseSource`、位置、大小和音频参数。`mode: 'chroma-key'` 表示绿幕融合。两个模式都可以选择母片继续播放或暂停母片；暂停时会同步冻结/暂停母片画面与声音并增加成片时长。

任务字段 `adRange: { start, end }` 指定广告素材实际使用的秒数范围，允许裁掉厂商原始广告的片头或片尾。画面和广告原声必须使用同一组 `trim/atrim` 起止点；范围时长而非素材总时长决定广告暂停长度、预计成片长度以及总配音的覆盖窗口。旧任务缺少该字段时默认使用完整广告视频。

可选的 `leadInAudio` 用来在广告视频前播放引导音频，支持 `mode: 'prelude' | 'voiceover'`。`prelude` 是原有前奏模式：引导音频完整结束后才显示广告。`voiceover` 是广告总配音模式：引导音频开始后经过 `adVideoDelay` 秒显示广告画面，引导音频继续播放并强制替代广告视频原声；引导音频超过广告画面结束点的部分会被截断，引导音频较短时剩余广告阶段保持没有广告原声。`leadInAudio.playbackRate` 控制引导音频速度，范围为 `0.5` 到 `2`；浏览器预览使用 `preservesPitch`，最终 FFmpeg 使用 `atempo`，变速后必须按 `素材原时长 / playbackRate` 重新计算引导、暂停、总配音和成片时间线。存在引导音频时，`startAt` 表示引导音频开始时间。`leadInAudio.pauseSource` 独立控制引导音频有效区间是否冻结母片，顶层 `pauseSource` 独立控制广告画面区间；总配音模式下两个暂停区间发生重叠时必须求并集，不能重复增加成片时长。引导不暂停母片时，`leadInAudio.sourceVolume` 控制引导期间的母片音量，`leadInAudio.volumeTransitionDuration` 控制引导开始和结束处的线性压低/恢复时长；页面草稿、浏览器预览和 FFmpeg 成片必须使用相同参数。

`leadInAudio.subtitles` 是引导音频字幕配置，不进入母版 `VideoConfig`。`src/pages/AdPlacementPage/index.tsx` 支持导入 `.srt` 后继续编辑、手动新增字幕段、按试听音频当前位置设置起止时间，以及把编辑结果重新导出为 `.srt`。字幕段和字体样式由 `src/utils/adSubtitleSettings.ts` 保存在 `localStorage`，刷新或切换页面不得丢失。字幕时间统一使用引导音频的原始素材时间：浏览器预览按 `<audio>.currentTime` 匹配，最终合成按 `playbackRate` 换算到输出时间。`scripts/ad_compositor.py` 生成临时 ASS 并通过 FFmpeg 烧录，支持字体、字号、文字颜色、描边、半透明底色、顶部/居中/底部及垂直边距；合成后删除临时 ASS。

字幕编辑区域下方有独立的“引导字幕图层组合预览”，与最终合成时间线预览使用不同的媒体元素和播放状态，二者不能互相触发。该预览的母片画面固定开启，并提供母片声音、引导音频、引导字幕、广告画面和广告声音开关；关闭声音图层时内部时间线仍继续运行，以便只检查字幕或画面。广告画面仍遵循前奏/总配音模式和 `adVideoDelay`，母片仍遵循引导阶段与广告阶段各自的暂停设置。总配音模式或全局关闭广告原声时，组合预览的广告声音开关必须禁用。

“植入广告”页面的非字幕编辑数据统一由 `src/utils/adPlacementDraft.ts` 保存到 `localStorage`，包括母片/广告/引导音频路径、处理模式、广告裁剪范围、时间线、暂停设置、位置大小、自动居中、抠绿参数、声音参数、预览开关和最后任务号。页面卸载、切换到其他工具或刷新后必须恢复这些数据。媒体播放进度、播放/暂停状态和临时预览阶段不持久化，返回页面后不得自动播放。广告视频重新读取元数据时，如果路径与草稿中的素材相同，应校验并保留草稿裁剪范围；只有确实更换广告素材时才重置为完整素材范围。

位置 `x/y` 表示广告左上角相对于母片宽高的归一化坐标，允许范围为 `-5` 到 `1`；允许较大的负数是为了支持最高 500% 的广告在放大后仍能居中、移动并自然裁切。`width` 表示广告宽度相对母片宽度的比例，允许 `0.02` 到 `5`（即最高 500%）。FFmpeg 不得因为广告高度超过母片而把它自动缩回画布，也不得扩大最终成片画布；滤镜链末尾必须按母片宽高明确裁剪，超出部分直接丢弃，输出分辨率始终与母片一致。浏览器预览可降低内部抠绿处理分辨率后再按真实尺寸绘制，避免超大广告导致逐帧处理过慢。

“暂停母片”必须同时处理画面和声音：冻结画面期间原片音频应暂停或静音，广告结束后的原片音频整体后移；不能只冻结视频帧。第一版应明确广告自身音频是保留、静音还是按音量混合，默认建议保留广告音频并在广告期间压低或静音母片音频。

位置和大小建议以与分辨率无关的参数保存：

- `x`、`y`：-5 到 1 的归一化位置，当前语义为广告框左上角；负数表示部分移出画布。
- `width`：相对母片画布宽度的比例，当前上限为 5（500%）；高度按广告素材宽高比自动计算。
- 页面可提供左上、右上、居中、左下、右下预设，再允许精调。
- 实际输出前根据母片宽高换算像素，并限制广告不超出画布。

建议的任务负载是独立 JSON，而不是项目视频配置的一部分：

```json
{
  "taskType": "ad_composite",
  "sourceVideo": "D:/.../out/video-12345678.mp4",
  "greenScreenVideo": "D:/.../ads/ad-01.mp4",
  "startAt": 12.5,
  "adRange": { "start": 1.5, "end": 8.0 },
  "pauseSource": false,
  "leadInAudio": { "path": "D:/.../audio/ad-intro.mp3", "mode": "voiceover", "adVideoDelay": 2, "pauseSource": true, "volume": 1, "playbackRate": 1.25 },
  "placement": { "x": 0.7, "y": 0.65, "width": 0.25 },
  "chromaKey": { "color": "0x00FF00", "similarity": 0.3, "blend": 0.08 },
  "audio": { "enabled": true, "volume": 1, "sourceVolumeDuringAd": 0.25 }
}
```

字段名和范围在实现时可以调整，但必须满足：路径经过服务端校验、参数有上下限、任务可取消、失败信息可查看、输出文件不与输入文件同名。最终抠色固定使用 FFmpeg RGB `colorkey`，并按“缩放 -> `format=rgba` -> `colorkey`”执行，以匹配静态测试页先缩放后按 RGB 色距计算透明度的语义。不得改回工作在 YUV 空间的 `chromakey`：相同的颜色容差在 YUV 下会把非背景主体大面积变成半透明，导致成片与测试页明显不一致。

广告功能没有修改以下母版渲染模块：

- `src/remotion/index.tsx`
- `src/remotion/MyVideo.tsx`
- `src/remotion/SceneRenderer.tsx`
- `src/rendering/videoCanvas.ts`
- 原始 Reddit 场景和 DSL

当前约定：母版默认扫描 `out/`，普通广告默认扫描 `public/ad-videos/`，绿幕素材默认扫描 `public/green-screen-videos/`，引导音频扫描 `public/audio/`，均可通过本地文件选择器指定；暂停模式会同步暂停母片画面与声音；默认绿幕容差为 `0.30`、边缘融合为 `0.08`。母版扫描必须排除文件名包含 `-ad-<8 位任务号>` 的广告合成结果，前端也必须再次过滤并拒绝手动选择这种文件，避免把已有广告的成片再次叠加后出现双广告。最终合成时间线预览参考背景视频轨道的实现，直接分层显示唯一一层母片 `<video>` 与唯一一层广告 `<video>`，只负责时间、位置、大小、画布外裁剪和音频联动，不在播放期间使用 Canvas 逐帧抠绿，以避免降低预览画质。预览框和背景视频轨道一样以 `520px` 为最大高度，并根据母片宽高比计算最大宽度，竖屏视频不得把页面无限拉长。母片处于暂停状态且不在引导音频阶段时，必须始终显示静态广告定位层；`x/y/width` 改动应直接更新该原生广告视频的 CSS，使滑块和输入框调整得到即时画面反馈。母片播放时再严格按照时间线阶段决定广告是否显示。绿幕模式的抠绿参数改由 `ChromaKeyTestPage` 使用母片截图和广告截图进行静态 Canvas 测试；测试页自动保存两张图片路径、绿幕颜色、颜色容差、边缘融合和测试宽度，刷新或切换页面不得丢失。“植入广告”页面提供显式一键导入，只复制绿幕颜色、颜色容差和边缘融合，不改动时间线、位置或音频。浏览器与 FFmpeg 都使用 RGB 抠色语义且都先缩放再抠色，参数应保持一致；编码和缩放插值造成的细微边缘差异仍以成片为准。前奏模式在引导结束后显示广告，总配音模式按画面延迟显示广告并继续播放引导音频、静音广告原声；各阶段按自己的暂停开关冻结或继续母片。广告素材另有独立播放器，只试听所选裁剪范围及广告原声，绝不触发引导音频；最终时间线的引导音频和广告联动预览必须由用户显式开启，默认播放母片时不得自动播放引导音频，但此时仍应显示静态广告位置与大小，便于直接调整到 500% 并确认画布外裁剪。调整广告宽度时默认保持广告中心不动，同时更新 `x/y`，避免以左上角为锚点放大后主体完全移出画布；用户仍可在缩放后继续精调位置。联动预览应同步手动暂停/恢复、广告播放位置和广告期间的母片压低音量，总配音模式下必须静音广告原声；从指定位置重新预览时必须重置并重新启动当前模式的完整时间线。引导音频试听的音量允许超过 100%，浏览器侧必须通过 Web Audio 增益实现，不能只设置上限为 1 的 `HTMLMediaElement.volume`。

位置与大小区域提供“自动居中模式”开关，而不是一次性居中按钮。开启后持续使用 `x = (1 - width) / 2`、`y = (1 - normalizedHeight) / 2` 自动更新左上角坐标；广告宽度、母片比例或广告素材比例变化时必须重新计算，并锁定手动 `x/y` 控件。关闭后恢复手动位置调整；使用角落预设时应自动关闭该模式。广告大于母片时得到负数是预期行为，表示在画布两侧或上下对称裁剪。

## 11. 修改与验证约定

- 保留用户已有改动；修改前先检查工作区状态。
- 优先复用现有 Store、页面布局、Toast/Dialog 和素材代理模式。
- 不要直接编辑 `dist/`、`out/`、`tasks/` 中的生成结果来实现功能。
- TypeScript 路径别名定义在 `vite.config.ts`；主要使用 `@/`、`@components`、`@hooks`。
- 修改核心类型或渲染链路后至少运行 `npm run build`。
- 时间线或视觉改动应同时检查普通预览、Studio 预览和最终渲染。
- 音频改动应验证最终导出文件，而不只是在浏览器中试听。
- 当前部分旧源码注释或字符串在某些终端中可能显示乱码；不要因终端显示问题进行大范围编码重写。
- 当前没有发现正式自动化测试套件；高风险渲染改动应补充最小可重复验证步骤。

## 12. 快速定位索引

| 要修改的能力 | 首要位置 |
| --- | --- |
| 新增左侧页面 | `src/types.ts`、`src/components/AppSidebar.tsx`、`src/pages/MainPages/index.tsx` |
| 新增或修改页面路径 | `src/routing/toolRoutes.ts`、`src/App.tsx` |
| 修改视频配置 | `src/types.ts`、`src/store/useVideoStore.ts`、`src/rendering/videoCanvas.ts` |
| 修改项目持久化 | `src/store/useProjectsStore.ts`、各 store 的 `getProjectState/applyProjectState` |
| 修改完整时间线 | `src/remotion/index.tsx`、`src/remotion/MyVideo.tsx` |
| 修改单场景画面 | `src/remotion/SceneRenderer.tsx` |
| 修改预览播放器 | `src/components/VideoPreviewPlayer.tsx` |
| 修改场景 DSL | `src/rendering/sceneDsl.ts`、`src/rendering/README.md` |
| 修改内容 DSL | `src/rendering/parser/*`、`src/rendering/metadata.ts` |
| 修改最终音频 | `scripts/audio_mixer.py`、`src/audio/*` |
| 修改导出队列 | `src/hooks/useVideoRender.ts`、`scripts/server.py`、`scripts/worker.py` |
| 修改背景视频 | `src/pages/BackgroundVideoPage`、`src/remotion/BackgroundVideoTrack.tsx` |
| 修改 BGM | `src/pages/BgmSettingsPage`、`scripts/audio_mixer.py` |
| 修改素材扫描/代理 | `scripts/server.py`、`public/` 对应目录 |

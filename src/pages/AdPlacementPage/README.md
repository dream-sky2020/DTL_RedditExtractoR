# 广告 Page：显示与逻辑分离示范

本页将 React 显示组件与页面逻辑 Hook 分开。私有代码仍放在本 Page 内。

```text
AdPlacementPage/
  index.tsx                         连接逻辑与显示的入口
  AdPlacementView.tsx                页面显示代码及 props 类型
  hooks/useAdPlacement.ts            页面逻辑入口
  hooks/useAdMediaLibrary.ts         素材与文件选择
  hooks/useAdSubtitleDraft.ts        字幕与 SRT、持久化
  hooks/useTimelinePreview.ts        最终时间线预览控制
  hooks/useSubtitlePreview.ts        独立字幕组合预览控制
  components/                       Page 私有显示组件
  api.ts                            接口访问
  calculations/timeline.ts          无 React 依赖的时间线纯计算
  types.ts                          广告请求与素材类型
  AdPlacementView.stories.tsx        页面显示状态示例
  AdPlacementView.fixtures.ts        内存预览数据与模拟操作
```

修改布局、颜色、表单和媒体层样式时编辑 View 或 components；修改文件选择、配置保存、任务提交和播放控制时编辑 hooks；纯计算放在 calculations/，时间规则放在 calculations/timeline.ts。计算模块只接收参数并返回结果，不访问 React 状态、接口、存储或媒体元素。View 可以按显示状态决定是否展示某个控件，通过 actions 发出操作；不要在 View 中加入 API、localStorage 或命令式媒体控制。

显示状态、操作和媒体 ref 的 props 类型直接定义并导出在 `AdPlacementView.tsx` 中。View 直接使用 `state.xxx`、`actions.xxx`、`media.xxx`，不逐个解构所有字段；逻辑 Hook 和 Storybook 通过 `import type` 引用这些类型，不会产生运行时的 View 导入。实际运行逻辑在 `useAdPlacement.ts`，不需要再建立一个全局 store。正式入口与 Storybook 渲染同一个 View，分别提供真实模型和模拟模型。

## 启动 Storybook

在项目根目录运行：

```sh
npm run storybook
```

打开 http://127.0.0.1:6006 ，命令运行期间保持终端开启；Ctrl+C 停止。开发时保存 TSX 后预览会自动更新。

左侧 `Pages → AdPlacement` 下有：

- `Page`：没有素材、正在读取素材、绿幕广告、普通广告与总配音、竖屏与超大广告。
- `PlacementControls`：手动定位、自动居中、500% 放大。底部 Controls 可直接调整 x、y、width 等 props。
- `SubtitleEditor`：默认和多行字幕，可调整示例文字、字号、底色透明度，也能在画面中编辑字幕。

Story 是一份“固定输入下的显示状态”，不是另一份页面实现。新增状态时，在对应 `.stories.tsx` 导出一个 Story，传入所需 args 即可；不要复制 View。页面 Story 的 state 可以通过 Controls 编辑，也可以直接操作画面中的模拟表单。

Storybook 不需要 Flask。素材由 `.storybook/public/` 的小型合成示例提供，操作只改变内存状态，刷新就重置。文件选择、SRT 导入导出和完整联动播放控制使用模拟回调；提交只显示示范任务号，不创建真实任务。草稿保存提示属于原页面显示文案，在 Storybook 中不会保存正式草稿。需要验证真实文件、音频联动与最终合成时，运行 `npm run dev` 并配合现有 Flask/worker 环境。

## 在 VS Code 中并排预览

推荐直接按 **F5**，选择 **广告 UI 预览（Storybook）**。启动配置会准备 Storybook 并打开外部 Edge 浏览器，无需复制地址或手动启动服务；已运行的 6006 端口广告 Storybook 会直接复用。使用 VS Code 自带的 `msedge` 调试类型，兼容当前本机 VS Code 1.95.3；这个版本不支持 `editor-browser`，不要安装错误弹窗推荐的同名扩展。启动任务留在终端中，关闭预览标签不会自动停止服务；需要停止时在“终端 → 终止任务”中选择 `Storybook: 准备预览`。

较新版本 VS Code 支持集成浏览器时，也可以手动并排打开：

1. 保持 Storybook 终端运行。
2. 按 Ctrl+Shift+P，运行 `Browser: Open Integrated Browser`。
3. 输入 `http://127.0.0.1:6006`，将浏览器标签拖到右侧编辑器组。
4. 左侧编辑 `AdPlacementView.tsx` 或私有组件，右侧查看保存后的变化。

如果当前 VS Code 没有该命令，可以使用外部浏览器。集成浏览器说明：https://code.visualstudio.com/docs/debugtest/integrated-browser 。

## 从预览点击定位源码

`vite.config.ts` 已在开发服务中接入 `code-inspector-plugin`，指定使用 VS Code，并显示中文定位开关。Storybook 使用同一份 Vite 配置。安装或调整插件配置后，需要重启 Storybook 或 Vite 开发服务；仅刷新已启动的旧 Storybook 可能无法加载新插件。

在预览画面内按住 **Alt + Shift**，移动鼠标查看高亮与文件位置，点击目标元素即可打开对应源码行；也可以点击定位开关进入选择模式，不必一直按住组合键。插件默认会在跳转后退出选择模式。需要关闭选择时按 Esc 或再次操作开关。定位的是元素对应的 JSX；业务处理函数仍可在编辑器中通过“转到定义”继续查看。第三方控件内部的元素可能定位到最近的项目元素，应以高亮提示的文件和行号为准。

插件只在开发服务中启用，不加入应用或 Storybook 静态构建。

## 构建检查

```sh
npm run build
npm run build-storybook
```

第二条生成静态预览站点 `storybook-static/`，已加入忽略列表。Storybook 构建检查显示示例能否打包，不能替代真实媒体行为与成片回归验证。

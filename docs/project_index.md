# Project Index

## 定位

HoloMotion / Phi-Momentum 的项目结构索引。
不记录开发流水。
只保留稳定结构和维护规则。

## 根目录

`index.html`：浏览器入口，加载 `src/styles.css` 与构建后的 `dist/main.js`。
`package.json`：本地命令入口（build / dev / check）。
`tsconfig.json`：TypeScript 诊断配置（`noEmit: true`），不负责构建输出。
`README.md`：使用说明与 mock-to-real 边界。
`CLAUDE.md`：面向代码助手的工程约束说明。
`assets/`：演示资源目录（含 `smpl-lite-rig.gltf`）。
`docs/`：项目文档与海报参考。
`scripts/`：构建与守卫脚本。
`src/`：TypeScript / CSS 源码。
`dist/`：构建产物，不手工修改。

## 常用命令

`npm run build`：将 `src/**/*.ts` 类型擦除为 `dist/**/*.js`（Node 内置 `stripTypeScriptTypes`，无打包）。
`npm run dev`：构建并启动 `5173` 静态服务。
`npm run check`：构建并跑 `scripts/guardrails.mjs`，是唯一发布门禁。
源码 `import` 必须使用 `.js` 后缀，浏览器在 `dist/` 解析模块。
项目零运行时依赖，无打包器、HMR、测试框架。

## src 总览

`src/main.ts`：组合根，仅做装配；DOM 引用、mock 流、UI 工具拆到 `src/bootstrap/`。
`src/styles.css`：仅作为入口，按主题 `@import` 拆分到 `src/styles/`。
`src/types/`：前后端数据契约类型。
`src/core/`：渲染、帧缓存、坐标、事件、摄像头、资源生命周期、音频。
`src/components/`：非 3D 的 UI 组件。
`src/bootstrap/`：主入口辅助层（DOM 收集、mock 流、UI 小工具）。
`src/hooks/`：外部数据流入口。
`src/mock/`：mock 动作帧生成器。
`src/data/`：动作种子和推理流程配置。

## bootstrap

`bootstrap/dom.ts`：`$` / `$$` 选择器与 `collectDomRefs()`，集中管理所有页面元素引用。
`bootstrap/MockStream.ts`：`MockStream` 类，封装 33ms 定时器与 `pushFrame` 路径，是后端接入的唯一替换点。
`bootstrap/uiHelpers.ts`：`ConnectionIndicator`、`renderDnaList`、`beatsPerMinute` 等装配期小工具。

## components

`components/layout/AppShell.ts`：页面壳层交互（侧栏、播放、速度、时间轴、视角、摄像头按钮）。
`components/gameui/SeedCarousel.ts`：种子卡片轮播 + 模式分段控件。
`components/gameui/ScoreBoard.ts`：score / combo / risk / joint metrics / pipeline 渲染（写入抽屉内 DOM）。
`components/gameui/Timeline.ts`：18 帧节奏条与低频 scrub。
`components/gameui/ComboBurst.ts`：监听 `score:update` 触发 PERFECT 与 Combo 视觉特效。
`components/gameui/CoachingTip.ts`：根据最差关节风险等级，在镜像舱浮出软萌中文纠错气泡。
`components/gameui/ResultsScreen.ts`：结算页（分数、击败百分比、勋章、四宫格、二创入口）。
`components/gameui/DnaExport.ts`：DNA 二创视频导出弹窗（mock 进度 + 假二维码）。
`components/gameui/DnaDrawer.ts`：右侧 DNA 抽屉的开 / 合 / Esc 关闭。

## core

`core/MotionStage.ts`：动作舞台编排器；拥有 RAF 主循环、`slerp` 平滑、`disposeSceneResources` 调度、UI 节流发射。
`core/motion/skeleton.ts`：骨骼连接表与风险关节映射（纯数据）。
`core/motion/projection.ts`：3D→2D 投影函数（yaw / pitch / zoom，纯函数）。
`core/motion/StagePainter.ts`：所有 `draw*` 方法（骨骼、地面、mesh、stress、默认 pose）。
`core/motion/StageInteractions.ts`：canvas 拖拽、滚轮、双击复位的指针交互。
`core/CameraOverlay.ts`：摄像头舱内 2D 骨骼贴合渲染与 WARN 标签。
`core/WebCamManager.ts`：摄像头权限 / 流 / 镜像 / mock fallback。
`core/frameBuffer.ts`：高频帧缓存；`pushPacket(packet)` 是唯一写入点；只保存最新 `RuntimeFrame`。
`core/EventBus.ts`：低频 UI 事件总线（score / pipeline / seed / camera）。
`core/coordinates.ts`：单位与坐标契约（米、右手系、Y up、X right、Z out-of-screen）。
`core/three-compat.ts`：轻量 Quaternion 兼容层，未来接入真实 Three.js 时优先替换。
`core/AudioFx.ts`：WebAudio 合成器（PERFECT 叮、Combo 升档、种子激活、低 BPM kick）。
`core/assetPreloader.ts`：骨骼资源预加载。
`core/ThreeResourceTracker.ts`：资源释放与场景重建。

## styles

`src/styles.css`：仅含 `@import` 入口。
`styles/tokens.css`：颜色、字体、`--hairline` 等 CSS 变量。
`styles/base.css`：reset、`app-shell`、`workspace` 网格。
`styles/controls.css`：按钮、range、toggle、segmented、status / risk badge。
`styles/rail.css`：左侧导航。
`styles/topbar.css`：顶栏与海报式标题。
`styles/seed-strip.css`：种子卡片轮播。
`styles/bay.css`：左右双舱舞台、loading mask、playbar、镜像视频镜像与色彩滤镜。
`styles/hud.css`：HUD chip、分数面板、coaching tip。
`styles/fx.css`：PERFECT / Combo / 扫光关键帧。
`styles/drawer.css`：DNA 抽屉、metric / pipeline 行、风险态。
`styles/timeline.css`：18 帧时间轴。
`styles/results.css`：结算页四宫格。
`styles/dna-export.css`：二维码导出弹窗。
`styles/responsive.css`：媒体查询。

## data mock hooks types

`data/exercises.ts`：动作种子与推理管线（squat / deadlift / baduanjin / street / basketball）。
`mock/mockFrameSource.ts`：确定性 mock 帧生成器，输出 `FRAME_STREAM` + seedJoints / joints / localRotations / metrics。
`hooks/useWebSocket.ts`：FastAPI WebSocket 接入点；mock 与真实流共用 `consumePacket`。
`types/motion.ts`：核心类型契约（`MotionFrame` / `QuaternionTuple` / `JointName` / `RuntimeFrame` / `ScoreUpdate`…）。

## scripts

`scripts/build.mjs`：构建脚本，仅做类型擦除，不打包。
`scripts/guardrails.mjs`：守卫检查。
必需字符串：`unit: "meters"`、`handedness: "right-hand"`、`scaleX(-1)`、`requestAnimationFrame`、`.slerp(`、`disposeSceneResources(`、`pushPacket(packet`。
禁用字符串：`Euler`、`useState`、`ref(`。
对 `dist/**/*.js` 执行 `node --check` 语法校验。

## docs

`docs/Constraint.md`：工程与数据流硬约束。
`docs/design.png`：视觉锚点海报（瑞士网格风）。
`docs/project_index.md`：当前结构索引（本文）。
`docs/goal.md`：最终目标。
`docs/curren.md`：当前事实状态。

## 协作边界

UI 视觉调整：进入 `src/styles/` 对应分文件。
新增 UI 组件：放入 `src/components/gameui/` 并订阅 EventBus。
渲染层调整：进入 `src/core/motion/` 子模块；`MotionStage` 仅做编排。
摄像头 / MediaPipe：进入 `src/core/WebCamManager.ts` 与 `src/core/CameraOverlay.ts`。
后端联调：进入 `src/hooks/useWebSocket.ts` 与 `src/bootstrap/MockStream.ts`。
动作数据修改：进入 `src/data/` 与 `src/mock/`。
DOM id 变化：同步 `src/bootstrap/dom.ts` 与 `index.html`。
类型契约变化：同步 `src/types/motion.ts` 与 README。

## 维护原则

高频帧数据只进 `MotionFrameBuffer`。
低频 UI 更新只走 `EventBus`。
旋转只传 Quaternion，绝不引入 Euler。
空间单位只用米。
摄像头视频镜像，3D 教练画布不镜像。
切换动作必须经 `MotionStage.resetForSeed()` 释放旧资源。
视觉点缀色仅 `#5C7C9E` 与 `#FF5500`，总占比 < 2%。
关键数字使用等宽字体并 `font-variant-numeric: tabular-nums`。
全局直角，无 `box-shadow` / `text-shadow` / 渐变 / 辉光。
修改后至少运行 `npm run check`。

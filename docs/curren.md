# Current

## 定位

本文描述 HoloMotion / Phi-Momentum 的当前事实状态。
不记录开发流水。
用于团队接手、答辩准备和后端联调前对齐。

## 阶段

前端 mock-first 原型阶段。
模型相关能力全部使用确定性 mock。
本地 `npm run dev` 即可完整演示。
后端尚未接入。

## 视觉与交互

页面采用瑞士网格 / 编辑器极简风。
底色 `#F4F4F2` 暖白。
文字与 1px 实线 `#111111` 工业黑。
点缀色仅 `#5C7C9E`（PERFECT、安全态）和 `#FF5500`（WARNING、风险关节）。
全局直角，无阴影、无渐变、无辉光。
关键数字使用 JetBrains Mono 等宽字体。

页面主体为左右双舱。
左舱「现实镜像」：摄像头视频水平镜像 + 黑色 2D 骨骼贴合层。
右舱「全息标准舱」：黑色细线 3D 影子教练，可拖拽旋转 yaw、滚轮缩放、双击复位。
顶栏含 hol[ō]motion 海报式标题与等宽副标题。
种子区是横向卡片轮播，激活卡反白。
右上 DNA 按钮唤出抽屉，工程指标（Risk / Inference / SMPL-X）默认折叠在抽屉内。
底部时间轴为 18 帧分段。
结算页与 DNA 二创二维码导出弹窗为模态。

## 数据流

`mockFrameSource.ts` 生成 `FRAME_STREAM`。
`useWebSocket.ts` 提供统一帧消费入口（mock 与真实后端共用 `consumePacket`）。
`MotionFrameBuffer` 仅保留最新一帧。
`MotionStage` 在 RAF 中拉取最新帧并绘制。
`MotionStage` 节流到约 120ms 向 EventBus 发出 `score:update`。
`EventBus` 只承载 `score:update` / `pipeline:update` / `seed:update` / `camera:update` 四类低频事件。
`ScoreBoard` / `Timeline` / `ResultsScreen` / `ComboBurst` / `CoachingTip` 订阅事件。
高频骨骼帧不进入任何 UI 组件状态。

## 约束契约

空间坐标单位是米。
坐标系右手系，Y 上、X 右、Z 朝屏幕外。
摄像头视频走 CSS `transform: scaleX(-1)`。
3D 教练画布不镜像。
旋转使用 `QuaternionTuple` 在线传输，运行时升级为 `MotionQuaternion` 实例。
旋转平滑使用 `slerp(target, 0.4)`。
源码禁止出现 `Euler`、`useState`、`ref(`。
当前使用 Canvas 2D 绘制 3D 投影骨架。
`three-compat.ts` 提供轻量 Quaternion，可后续替换为真实 Three.js。

## 资源生命周期

入口预加载 `assets/smpl-lite-rig.gltf`。
预加载完成前展示 `loading-mask`。
切换种子调用 `MotionStage.resetForSeed()`。
该方法依次调用 `disposeSceneResources()` 与 `createSceneResources()`。
`ThreeResourceTracker` 当前 mock geometry / material disposal。
真实 Three.js 接入后应把实际资源纳入 tracker。

## 反馈系统

PERFECT 阈值 score ≥ 88。
触发时屏幕中心硬边显示 `#5C7C9E` 实色块 + 白色 mono `PERFECT` 字样，附满屏一道 220ms 横向扫光。
冷却 1.1s。
Combo 升档触发 `COMBO ×NN` 黑底白字硬边方块出现 / 消失。
风险关节用 `#FF5500` 1.5px 实色圆 + 短虚线指示，旁边白底黑边 mono `WARN` 标签。
软萌中文纠错气泡（`CoachingTip`）按关节与风险等级随机选取文案。
WebAudio 合成 PERFECT 三泛音、Combo 升档锯齿、种子激活四音和弦、播放期低 BPM kick。
首次手势后激活 AudioContext。

## 检查机制

`scripts/build.mjs` 只做 TypeScript 类型擦除（Node `stripTypeScriptTypes`）。
`scripts/guardrails.mjs` 检查必需字符串：`unit: "meters"`、`handedness: "right-hand"`、`scaleX(-1)`、`requestAnimationFrame`、`.slerp(`、`disposeSceneResources(`、`pushPacket(packet`。
guardrails 禁止 `Euler` / `useState` / `ref(`。
guardrails 对 `dist/**/*.js` 做语法检查。
TypeScript 诊断不强制（`npx tsc --noEmit` 仅作开发参考）。
`npm run check` 是唯一发布门禁。

## 后端边界

后端尚未接入。
WebSocket 接入点已在 `useWebSocket.ts` 就绪。
真实后端应推送符合 `MotionFrame` 形状的 `FRAME_STREAM` 数据包。
帧应包含 timestampMs、seedId、progress、score、combo、riskLabel、globalTransform、seedJoints、joints、localRotations、metrics。
所有坐标必须米制，所有旋转必须 `[x, y, z, w]`。
mock 与真实后端共用 `consumePacket → buffer.pushPacket` 路径，切换为单点改造。

## 风险

无真实 Three.js / MediaPipe / WHAM / gvHMR / SMPL 皮肤。
后端如传 Euler 或非米制坐标，骨架会错位。
UI 若直接订阅高频帧，页面会卡顿。
切换动作如果绕过 `resetForSeed()`，长时间演示存在内存泄露隐患。
JetBrains Mono 字体未打包，本机无字体时降级到系统等宽。
`mockFrameSource.ts:204` 存在历史 `worst possibly undefined` TS 警告（不影响构建与守卫）。

## 下一步优先级

接入真实 Three.js 骨架渲染（替换 `three-compat.ts` 与 `MotionStage` 绘制层）。
接入真实 WebSocket（替换 `bootstrap/MockStream.ts` 的定时器）。
接入 MediaPipe BlazePose 浏览器推理（替换 `CameraOverlay` 的 mock 骨骼源）。
固化 `MotionFrame` 到后端 OpenAPI 文档。
补充断线重连、低帧率兜底与答辩脚本。

## 判断

项目具备黑客松前端独立演示能力。
项目具备与后端合体的稳定数据边界。
项目尚不具备真实模型推理。
项目尚不具备生产级可靠性。
当前最重要的原则是帧数据隔离、渲染层独立、数据契约稳定与视觉规范严格执行。

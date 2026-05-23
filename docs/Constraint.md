### 一、 3D 空间坐标系与单位约束

在加载 Three.js 骨骼和 MediaPipe 时，必须统一物理度量与朝向，防止虚拟小人出现“反关节折断”或“群魔乱舞”。

* **单位统一：** 所有空间坐标单位严格定义为 **米（Meters）**。
* **坐标系对齐：** 采用 **右手坐标系**（$Y$ 轴朝上，$X$ 轴朝右，$Z$ 轴朝向屏幕外）。
* **镜像处理：**
* **评委本地摄像头 Canvas** 必须进行水平镜像翻转（`transform: scaleX(-1)`），符合镜子直觉。
* **Three.js 透明 Canvas** 中的 3D 影子教具**不进行镜像**，它作为“面对面”的教练呈现。


* **旋转表达：** 禁止在任何组件和状态中传输 Euler（欧拉角），**一律使用 `THREE.Quaternion`（四元数）** 承载和更新旋转。

---

### 二、 WebSocket 数据消费与渲染帧率约束

30-60 FPS 的高频数据流如果直接塞入 React/Vue 的局部 `state`，会引发框架底层高频 Diff，造成**网页瞬间假死**。

* **状态隔离原则：** 凡是每秒更新大于 10 次的数据（如逐帧骨骼四元数、实时匹配分数、坐标点），**严禁使用 React `useState` / Vue `ref` 管理**。
* **消费规范：** 建立一个独立的变量、Ref 引用或状态外 Buffer 暂存最新的 WebSocket 帧数据。
* **驱动规范：** 必须在 Three.js 的 `requestAnimationFrame`（或 React Three Fiber 的 `useFrame`）循环中主动拉取（Pull）数据更新骨骼，实现数据消费与屏幕刷新率（RAF）的完美同步。

### 三、 Component 目录结构与职责划分（模块解耦）

为了让组内负责 UI 的同学和负责 3D/算法的同学不发生 Git 冲突，前端工程目录必须严格执行以下原子化划分：

```
src/
├── components/
│   ├── layout/            # 静态页面容器（Header, Sidebar）
│   └── gameui/            # 游戏化覆盖层组件（非3D部分）
│       ├── ScoreBoard.jsx # 实时打分与 Combo 动效组件（接收状态触发特效）
│       └── ActionTabs.jsx # 动作种子选择器（触发 HTTP 请求）
├── core/
│   ├── WebCamManager.jsx  # 摄像头流捕获与 MediaPipe 2D 点提炼组件
│   └── MotionStage.jsx    # Three.js / WebGL 渲染中心（专属 3D 领地）
└── hooks/
    └── useWebSocket.js    # 专门负责与 FastAPI 握手、解析、心跳的 Hook

```

* **设计边界：** `MotionStage`（3D 舞台）与 `WebCamManager`（摄像头）通过 `core` 目录彻底并列，禁止组件嵌套。二者通过原生的全局事件（EventBus）或精简的 Context 传输轻量打分结果，严禁重度耦合。

---

### 四、 性能与体验兜底规范（黑客松现场抢分项）

* **模型预加载（Asset Preload）：** 必须在项目入口处对标准骨骼网格（SMPL `.gltf`）进行预加载。进入页面的第一秒，即使后端数据还没准备好，前端也必须渲染出一个处于默认 **T-Pose** 或 **A-Pose** 的半透明科技感小人，并伴随一个“系统初始化中...”的优雅 Loading 遮罩，极大提升评委的“第一视觉好感”。
* **垃圾回收（Disposal）：** 在切换动作种子或重开对局时，必须显式调用 Three.js 的 `geometry.dispose()` 和 `material.dispose()`。黑客松演示如果因为反复切换场景导致内存泄露（Memory Leak）把评委的浏览器卡崩，会带来毁灭性的扣分。

严格按照这个计划来执行
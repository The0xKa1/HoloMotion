# HoloMotion Frontend Prototype

TypeScript single-page frontend for turning a short sports / fitness video into a rotatable 3D motion coach, with live MediaPipe pose comparison, joint-error scoring, and gamified feedback.

The frame WebSocket is still mocked — every other pipeline (MediaPipe pose / hand / face, video-to-clip import, user calibration, scoring, AI coaching) runs for real in the browser.

## What is included

- **Live MediaPipe pipeline** — `LandmarkerController` (`src/core/PoseLandmarkerManager.ts`) wraps `@mediapipe/tasks-vision` (Pose / Hand / Face). Heavy / full / lite pose models selectable. Vision module + per-modality landmarkers are awaited via `ensureReady()` before the first detect.
- **Video import to CoachClip** — `ImportDrawer` (`src/components/gameui/ImportDrawer.ts`) loads a video, probes its native frame rate, walks every frame with `VideoSeeker`, runs the heavy pose landmarker per frame, then post-processes with One-Euro smoothing + height normalization (`src/core/import/postProcess.ts`).
- **All-frame scrubbable timeline** — `Timeline` (`src/components/gameui/Timeline.ts`) renders one cell per imported frame, with `flex: 1 0 26px` so few cells fill the panel and many cells scroll horizontally with auto scroll-into-view.
- **User calibration + adaptive scoring** — `CalibrationController` (`src/core/scoring/CalibrationController.ts`) samples ~1s of stable T-pose to derive bone lengths and Y reference, persisted via `UserProfileStore`. `PoseScorer` (`src/core/scoring/PoseScorer.ts`) computes joint-angle penalties and bone-length deltas against the seed clip.
- **Session recorder** — `SessionRecorder` (`src/core/scoring/SessionRecorder.ts`) aggregates per-joint scores, risk hits, and phase averages for the results screen.
- **AI coach panel** — `AiCoachPanel` (`src/components/gameui/AiCoachPanel.ts`) streams coaching text via an OpenAI-compatible `/chat/completions` endpoint configured in Camera Settings (`src/core/llm/LLMClient.ts`).
- **Canvas-based 3D shadow coach** — `MotionStage` (`src/core/MotionStage.ts`) drives a RAF loop, slerps bone quaternions, projects 3D joints to canvas, and emits `score:update` at most every ~120 ms.
- **Frame WebSocket boundary** — `useWebSocket` (`src/hooks/useWebSocket.ts`) is the FastAPI handoff point; a deterministic mock stream (`src/bootstrap/MockStream.ts`) keeps the buffer warm when no backend is connected.
- **Offline MediaPipe assets** — `public/mediapipe/` ships the WASM bundle (`wasm/vision_wasm_internal{,_nosimd}.{js,wasm}`), the `tasks-vision/vision_bundle.mjs` ES module, and five `.task` models (pose lite/full/heavy + hand + face). Total ~76 MB. No network required at runtime once cloned.

## Run

```bash
npm run build
python3 -m http.server 5173
```

Then open `http://localhost:5173`.

For the usual local loop:

```bash
npm run dev
```

Auto-connect: on startup `main.ts` calls `socket.connect(?ws=… ?? "ws://localhost:8000/motion")`. If the connection fails, the in-memory `MockStream` keeps the buffer warm.

## Engineering guardrails

Constraints from `docs/Constraint.md`:

- Spatial positions are meters in a right-hand coordinate contract: Y up, X right, Z out of screen.
- The evaluator camera video is mirrored with `scaleX(-1)`. The 3D coach canvas is **not** mirrored.
- Runtime rotations transit as `QuaternionTuple` and are consumed through a `THREE.Quaternion`-compatible API, smoothed with `slerp`.
- WebSocket-style frame packets go into `MotionFrameBuffer`; high-frequency frames do not touch any reactive UI state.
- `MotionStage` owns the RAF loop and pulls the latest frame from the buffer.
- Seed switches call `disposeSceneResources()` before recreating stage resources.

Run the guardrail check:

```bash
npm run check
```

The guardrail script greps `src/**/*.{ts,css}` for required tokens (`unit: "meters"`, `handedness: "right-hand"`, `scaleX(-1)`, `requestAnimationFrame`, `.slerp(`, `disposeSceneResources(`, `pushPacket(packet`) and forbidden tokens (`Euler`, `useState`, `ref(`), then `node --check`s every file in `dist/`.

## Structure

```text
public/
  mediapipe/
    tasks-vision/vision_bundle.mjs       # @mediapipe/tasks-vision SDK
    wasm/                                # SIMD + nosimd WASM pairs
    models/                              # pose lite/full/heavy + hand + face .task
src/
  bootstrap/                             # composition helpers (dom refs, mock stream)
  components/
    layout/AppShell.ts
    gameui/
      ScoreBoard.ts  Timeline.ts  SeedCarousel.ts  ComboBurst.ts
      CoachingTip.ts  ResultsScreen.ts  DnaExport.ts  DnaDrawer.ts
      CameraSettings.ts  CalibrationOverlay.ts  ImportDrawer.ts  AiCoachPanel.ts
  core/
    MotionStage.ts  WebCamManager.ts  CameraOverlay.ts
    EventBus.ts  frameBuffer.ts  three-compat.ts  coordinates.ts
    ThreeResourceTracker.ts  assetPreloader.ts  AudioFx.ts
    PoseLandmarkerManager.ts             # MediaPipe wrapper (pose/hand/face)
    motion/                              # skeleton, projection, painter, interactions
    scoring/                             # PoseScorer, Calibration, SessionRecorder, OneEuroFilter, …
    import/                              # VideoSeeker, landmarksToPose, postProcess, CoachClip
    llm/                                 # LLMClient (OpenAI-compatible stream), buildPrompt
  data/exercises.ts
  hooks/useWebSocket.ts
  mock/mockFrameSource.ts
  types/motion.ts
  styles/                                # tokens, base, rail, drawer, timeline, results, …
```

## Importer pipeline

A video drag-dropped into the import drawer goes through:

1. `VideoSeeker.load()` — awaits `loadeddata` (readyState ≥ HAVE_CURRENT_DATA), validates dimensions, surfaces codec failure clearly.
2. `VideoSeeker.probeFps()` — plays muted, samples 8 `requestVideoFrameCallback` `mediaTime` deltas, returns the median FPS. 2.5 s safety timeout falls back to 30.
3. `LandmarkerController.ensureReady(["pose"])` — switches to the heavy pose model and awaits both the WASM fileset and the `PoseLandmarker` weights before iteration.
4. `VideoSeeker.iterate(fps, visitor)` — for each frame: `seekTo(t)` waits on `seeked` **and** `requestVideoFrameCallback` (120 ms failsafe), then the visitor runs `ctrl.detect()` and `thumbCapture()`.
5. `landmarksToPose()` + `postProcessFrames()` — 33-landmark MediaPipe output → 17-joint `SkeletonPose`; gaps filled, One-Euro smoothed in time, recentered, height-normalized to 1 m.
6. The resulting `CoachClip` (frames + per-frame thumbnails + native fps) is applied as the current exercise's clip and emitted on `seed:update`.

## Mock-to-real boundary

| Component | State |
| --- | --- |
| MediaPipe pose / hand / face | **Real**, offline via `public/mediapipe/` |
| Video → CoachClip import | **Real**, heavy pose model + native fps probe |
| User calibration + scoring | **Real**, persisted in `localStorage` |
| AI coaching streaming | **Real**, OpenAI-compatible endpoint (user-supplied key) |
| Frame WebSocket (`FRAME_STREAM`) | **Mock**, `bootstrap/MockStream.ts` until backend lands |
| Three.js scene primitives | Lightweight in-repo `three-compat.ts` Quaternion + esm.sh `three@0.160.0` |

The frame packet shape the backend should match (`FrameStreamPacket` in `src/types/motion.ts`):

```json
{
  "type": "FRAME_STREAM",
  "data": {
    "frame": 128,
    "timestampMs": 5333,
    "seedId": "squat",
    "progress": 0.42,
    "score": 87,
    "combo": 8,
    "riskLabel": "Guard knee",
    "globalTransform": {
      "translation": [0.0, 0.0, 0.0],
      "rotation": [0.0, 0.0, 0.0, 1.0]
    },
    "joints": {
      "pelvis": { "position": [0.0, 0.84, 0.18], "rotation": [0.0, 0.0, 0.0, 1.0] },
      "lKnee":  { "position": [-0.18, 0.46, 0.06], "rotation": [0.0, 0.0, 0.0, 1.0] },
      "rKnee":  { "position": [0.18, 0.46, 0.06],  "rotation": [0.0, 0.0, 0.0, 1.0] }
    },
    "seedJoints": { "pelvis": { "position": [0.0, 0.84, 0.18], "rotation": [0.0, 0.0, 0.0, 1.0] } },
    "localRotations": [[0.0, 0.0, 0.0, 1.0]],
    "metrics": [
      {
        "id": "knee", "name": "knee",
        "base": 90, "variance": 4, "angle": 95, "distance": 18,
        "score": 87, "angleDeltaDeg": 8.4, "distanceDeltaCm": 11.2, "risk": "warn"
      }
    ]
  }
}
```

Notes:

- All joint keys are camelCase (`lKnee`, `rShoulder`, …) — see `JointName` in `src/types/motion.ts`.
- Each joint is `{ position: [x, y, z], rotation: [x, y, z, w] }` (meters; right-hand quaternion).
- The full joint list (17 entries) must be present on both `joints` and `seedJoints`.
- `localRotations` is an ordered array aligned with `frameBuffer.ts`'s `orderedJoints`.
- SMPL-X metadata (`beta` / `theta` / `trans`) lives in `ExerciseConfig.params` and rides on a one-shot `seed:update` event, **not** on every frame packet.

## Build pipeline

- `npm run build` strips TypeScript types from `src/**/*.ts` into `dist/**/*.js` using Node's `node:module` `stripTypeScriptTypes`. No bundler, no transpilation.
- All relative imports in `.ts` source must use the `.js` extension (paths resolve at runtime in the browser against `dist/`).
- `index.html` loads `./dist/main.js` directly as `<script type="module">` and resolves `@mediapipe/tasks-vision` through an importmap pointing at `public/mediapipe/tasks-vision/vision_bundle.mjs`.
- TypeScript runs `noEmit: true` — `tsc` is only used for diagnostics.

## Design reference

The generated visual concept is stored at `docs/design.png`.

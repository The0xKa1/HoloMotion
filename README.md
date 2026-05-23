# HoloMotion Frontend Prototype

Mock-first TypeScript frontend for turning a short sports or fitness seed video into a rotatable motion coach, live pose comparison view, safety feedback, and gamified scoring.

The heavy model stack is intentionally mocked in this prototype. The UI data contract follows the intended backend shape so a FastAPI/WebSocket service can later replace the mock frame stream without changing the interaction model.

## What is included

- Seed video import controls with cached action DNA state.
- Canvas-based 3D skeleton shadow coach with front, side, and top views.
- Evaluator pose overlay with mock MediaPipe-style live metrics.
- Joint angle and 3D distance scoring for knee, hip, spine, shoulder, wrist, and ankle checks.
- Mock inference pipeline for YOLOv8-Pose, WHAM/gvHMR, SMPL-X Action DNA, MediaPipe, and angle solving.
- Responsive desktop and mobile layout for judge-side demos.
- TypeScript modules split by UI, camera, rendering, WebSocket ingestion, frame buffering, and mock frame generation.

## Run

Build the TypeScript modules, then serve the folder with any static server.

```bash
npm run build
python3 -m http.server 5173
```

Then open `http://localhost:5173`.

For the usual local loop:

```bash
npm run dev
```

## Engineering guardrails

The prototype follows the Phi-Momentum frontend constraints:

- Spatial positions are meters in a right-hand coordinate contract: Y up, X right, Z out of screen.
- The evaluator camera video is mirrored with `scaleX(-1)`.
- The motion coach canvas is not mirrored.
- Runtime rotations are consumed through a `THREE.Quaternion` compatible API and smoothed with `slerp`.
- WebSocket-style frame packets go into `MotionFrameBuffer`; high-frequency frames do not touch UI component state.
- `MotionStage` owns the RAF loop and pulls the latest frame from the buffer.
- Seed switches call `disposeSceneResources()` before recreating stage resources.
- A lightweight `assets/smpl-lite-rig.gltf` is preloaded before the stage hides its initialization overlay.

Run the guardrail check:

```bash
npm run check
```

## Structure

```text
src/
  components/
    layout/AppShell.ts
    gameui/ActionTabs.ts
    gameui/ScoreBoard.ts
    gameui/Timeline.ts
  core/
    MotionStage.ts
    WebCamManager.ts
    EventBus.ts
    frameBuffer.ts
    three-compat.ts
    coordinates.ts
  hooks/
    useWebSocket.ts
  mock/
    mockFrameSource.ts
  types/
    motion.ts
```

## Mock-to-real boundary

The frontend currently generates deterministic mock data in TypeScript modules:

- `src/data/exercises.ts`: cached seed actions and SMPL-X style metadata.
- `src/mock/mockFrameSource.ts`: live score, joint angle deltas, 3D distance deltas, and mock skeleton poses.
- `src/hooks/useWebSocket.ts`: FastAPI/WebSocket handoff point.
- `src/core/frameBuffer.ts`: latest frame buffer for high-frequency packets.
- `src/core/MotionStage.ts`: render loop that pulls from the buffer.

Future backend integration can stream frames with this shape (matches `FrameStreamPacket` in `src/types/motion.ts`):

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
    "seedJoints": {
      "pelvis": { "position": [0.0, 0.84, 0.18], "rotation": [0.0, 0.0, 0.0, 1.0] },
      "lKnee":  { "position": [-0.2, 0.46, 0.06], "rotation": [0.0, 0.0, 0.0, 1.0] },
      "rKnee":  { "position": [0.2, 0.46, 0.06],  "rotation": [0.0, 0.0, 0.0, 1.0] }
    },
    "localRotations": [
      [0.0, 0.0, 0.0, 1.0]
    ],
    "metrics": [
      {
        "id": "knee",
        "name": "knee",
        "base": 90,
        "variance": 4,
        "angle": 95,
        "distance": 18,
        "score": 87,
        "angleDeltaDeg": 8.4,
        "distanceDeltaCm": 11.2,
        "risk": "warn"
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
- Auto-connect: on startup `main.ts` calls `socket.connect(?ws=… ?? "ws://localhost:8000/motion")`. If the connection errors or closes, the in-memory mock stream keeps the buffer warm.

## Design reference

The generated visual concept is stored at `docs/design-concept.png`.

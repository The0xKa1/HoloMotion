# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run build` — strip TS types from `src/**/*.ts` into `dist/**/*.js`. Uses Node's built-in `node:module` `stripTypeScriptTypes` (no `tsc`, no bundler). See `scripts/build.mjs`.
- `npm run dev` — build, then serve the repo root with `python3 -m http.server 5173`. Open `http://localhost:5173`.
- `npm run check` — build, then run `scripts/guardrails.mjs`. This is the project's only test gate; **run it before declaring any change done**.
- Type-checking is not wired into a script. To get diagnostics, run `npx tsc --noEmit` (config: `tsconfig.json`, `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`).

There is no test runner, linter, or formatter. The guardrail script is the source of truth.

## Build pipeline quirks (important)

- The build only **strips types** — it does not transpile, bundle, or resolve. Each `src/foo/bar.ts` becomes `dist/foo/bar.js` with the same shape.
- Because of this, **all relative imports in `.ts` source must use the `.js` extension** (e.g. `import { EventBus } from "./core/EventBus.js"`). This is intentional — the path resolves at runtime in the browser against `dist/`.
- `index.html` loads `./dist/main.js` directly as `<script type="module">`. There is no dev server with HMR. After editing TS, re-run `npm run build` (or `npm run dev`).
- `tsconfig.json` has `"noEmit": true` — `tsc` is only for diagnostics, never for output.

## Guardrails (enforced by `scripts/guardrails.mjs`)

The guardrail script greps `src/**/*.{ts,css}` for required and forbidden patterns, then `node --check`s every file in `dist/`. Any change must keep these invariants:

Required strings must appear somewhere in source:
- `unit: "meters"` and `handedness: "right-hand"` — see `src/core/coordinates.ts` `WORLD_SPACE`.
- `scaleX(-1)` — camera video must be horizontally mirrored (`src/styles.css`, `WebCamManager`). The 3D coach canvas is **not** mirrored.
- `requestAnimationFrame` — render loop pull-driven from RAF, not pushed by data events.
- `.slerp(` — quaternion interpolation must be used for rotation smoothing.
- `disposeSceneResources(` — called on seed switch / scene rebuild to prevent leaks.
- `pushPacket(packet` — frame ingress goes through `MotionFrameBuffer.pushPacket`.

Forbidden anywhere in source:
- `Euler` — rotations are quaternions only, end to end. No Euler-angle transport.
- `useState`, `ref(` — high-frequency frame data must never go through React/Vue reactive state. The project is currently vanilla TS, so these would also signal an unwanted framework dep.

These rules trace back to `docs/Constraint.md` (in Chinese) — the hard contract for the prototype.

## Architecture

The app is a vanilla TypeScript + Canvas 2D single-page UI. There is no React/Vue, no Three.js runtime dependency (a tiny `Quaternion` class in `src/core/three-compat.ts` stands in for `THREE.Quaternion`), and no package.json `dependencies` at all.

Data flow for a single frame:

```
mockFrameSource ──► useWebSocket.consumePacket ──► MotionFrameBuffer.pushPacket
                                                          │
                                                          ▼
                       MotionStage RAF tick ──► buffer.readLatest() ──► canvas draw
                                            └─► EventBus "score:update" (throttled to ~120ms)
                                                          │
                                                          ▼
                                               ScoreBoard / ActionTabs / Timeline DOM
```

Key boundaries:

- **`src/core/frameBuffer.ts` — `MotionFrameBuffer`**: holds *only* the latest `RuntimeFrame`. This is the state-isolation seam that keeps 30–60 fps frame data out of any reactive system. UI reads via `readLatest()` from inside RAF; never via event subscriptions.
- **`src/core/MotionStage.ts`**: owns the RAF loop, projects 3D joints to 2D, and is the *only* place that pulls from the frame buffer for rendering. It throttles UI-bound updates by emitting `score:update` on the bus at most every ~120ms.
- **`src/core/EventBus.ts`**: typed pub/sub for low-frequency UI events (`score:update`, `pipeline:update`, `seed:update`, `camera:update`). Do not put per-frame data on the bus.
- **`src/hooks/useWebSocket.ts`**: not a React hook — a plain factory returning `{ connect, disconnect, consumePacket, status }`. It's the FastAPI/WebSocket handoff point. Real packets and mock packets both go through `consumePacket → buffer.pushPacket`, so swapping mock for real is a one-line change in `main.ts`.
- **`src/mock/mockFrameSource.ts`**: deterministic mock generator that produces `FrameStreamPacket`s in the exact shape a real backend would send (see README "Mock-to-real boundary" for the JSON contract).
- **`src/core/ThreeResourceTracker.ts` + `assetPreloader.ts`**: scene resource lifecycle. `MotionStage.resetForSeed()` calls `disposeSceneResources()` then `createSceneResources()` on every seed switch — required by the guardrail.
- **`src/components/`**: split into `layout/` (static shell — `AppShell`) and `gameui/` (overlay widgets — `ActionTabs`, `ScoreBoard`, `Timeline`). UI components and 3D/core code are kept in separate folders so UI and rendering work can land without git conflicts.
- **`src/main.ts`**: composition root. Wires DOM elements, EventBus, frame buffer, mock stream, and starts the RAF loop after `stage.preload()` resolves.

### Coordinate & rotation contract

- Units are **meters** everywhere (`Vec3Meters`).
- Right-hand coordinate system: Y up, X right, Z out of screen (`WORLD_SPACE` in `src/core/coordinates.ts`).
- Rotations transit as `QuaternionTuple` (`[x, y, z, w]`) on the wire and are converted to `MotionQuaternion` instances inside `MotionFrameBuffer.toRuntimeFrame`. Smoothing uses `slerp` in `MotionStage.consumeRotations` (currently `alpha = 0.4`).
- The evaluator camera `<video>` is CSS-mirrored (`scaleX(-1)`); the motion-coach `<canvas>` is not.

## When extending the prototype

- Adding a new UI surface: put it under `src/components/gameui/` and subscribe to bus events. Never read from `MotionFrameBuffer` outside `MotionStage`.
- Wiring a real backend: replace the `setInterval` in `main.ts` `startMockStream` with `socket.connect("ws://...")`. The packet shape in `src/mock/mockFrameSource.ts` is the contract the backend must satisfy (matches the JSON example in README).
- Adding a new exercise: extend `ExerciseId` in `src/types/motion.ts` and add an entry to `src/data/exercises.ts`. The mock generator picks it up automatically.
- Touching anything render-loop adjacent: re-run `npm run check` and verify no new `Euler` / `useState` / `ref(` slipped in, and that any new rotation work goes through `THREE.Quaternion`.

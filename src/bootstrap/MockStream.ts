import type { MotionFrameBuffer } from "../core/frameBuffer.js";
import type { MotionSocketController } from "../hooks/useWebSocket.js";
import type { WebCamManager } from "../core/WebCamManager.js";
import { createMockPacket } from "../mock/mockFrameSource.js";
import { applyLiveScore, type ScorerContext } from "../core/scoring/PoseScorer.js";
import type { CoachHistory } from "../core/scoring/CoachHistory.js";
import { sampleClip } from "../core/import/CoachClip.js";
import type { ExerciseConfig, ExerciseId, MotionMode } from "../types/motion.js";

export interface MockStreamState {
  exerciseId: ExerciseId;
  mode: MotionMode;
  progress: number;
  speed: number;
  playing: boolean;
  frame: number;
}

interface MockStreamOptions {
  state: MockStreamState;
  exercises: Record<ExerciseId, ExerciseConfig>;
  socket: MotionSocketController;
  buffer: MotionFrameBuffer;
  webcam: WebCamManager;
  scorer?: ScorerContext;
  coachHistory?: CoachHistory;
  onProgressTick?(progress: number): void;
}

export class MockStream {
  private options: MockStreamOptions;
  private timer = 0;

  constructor(options: MockStreamOptions) {
    this.options = options;
  }

  start(): void {
    this.stop();
    this.timer = window.setInterval(() => {
      const exercise = this.options.exercises[this.options.state.exerciseId];
      if (this.options.state.playing) {
        this.options.state.progress =
          (this.options.state.progress + (1 / exercise.durationSeconds) * this.options.state.speed * 0.033) % 1;
        this.options.state.frame += 1;
        this.options.onProgressTick?.(this.options.state.progress);
      }
      this.pushFrame(performance.now());
    }, 33);
  }

  stop(): void {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = 0;
    }
  }

  pushFrame(now: number): void {
    const exercise = this.options.exercises[this.options.state.exerciseId];
    const packet = createMockPacket({
      exercise,
      mode: this.options.state.mode,
      progress: this.options.state.progress,
      frame: this.options.state.frame,
      timestampMs: now,
      evaluatorActive: this.options.webcam.isActive(),
    });
    if (exercise.clip) {
      packet.data.seedJoints = sampleClip(exercise.clip, this.options.state.progress);
    }
    this.options.coachHistory?.push(packet.data.seedJoints);
    if (this.options.scorer) applyLiveScore(packet, this.options.scorer);
    this.options.socket.consumePacket(packet);
  }

  resetForSeed(nextId: ExerciseId): void {
    this.options.state.exerciseId = nextId;
    this.options.state.progress = 0.1;
    this.options.state.frame = 0;
    this.options.buffer.reset();
    this.options.coachHistory?.reset();
  }
}

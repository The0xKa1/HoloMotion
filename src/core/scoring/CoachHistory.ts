import type { SkeletonPose } from "../../types/motion.js";

const DEFAULT_CAPACITY = 15;

export class CoachHistory {
  private buf: SkeletonPose[] = [];
  private capacity: number;

  constructor(capacity: number = DEFAULT_CAPACITY) {
    this.capacity = capacity;
  }

  push(pose: SkeletonPose): void {
    this.buf.push(pose);
    if (this.buf.length > this.capacity) {
      this.buf.shift();
    }
  }

  getAll(): SkeletonPose[] {
    return this.buf;
  }

  reset(): void {
    this.buf = [];
  }
}

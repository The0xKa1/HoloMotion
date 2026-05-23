import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export class UserPoseSource {
  private latest: { world: NormalizedLandmark[]; ts: number } | null = null;

  setLatest(world: NormalizedLandmark[], ts: number): void {
    if (world.length < 33) return;
    this.latest = { world, ts };
  }

  readFresh(now: number, maxAgeMs: number): NormalizedLandmark[] | null {
    if (!this.latest) return null;
    return now - this.latest.ts <= maxAgeMs ? this.latest.world : null;
  }

  clear(): void {
    this.latest = null;
  }
}

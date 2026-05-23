import type { EventBus } from "../../core/EventBus.js";
import type { AudioFx } from "../../core/AudioFx.js";
import type { ScoreUpdate } from "../../types/motion.js";

interface ComboBurstOptions {
  bus: EventBus;
  fxLayer: HTMLElement;
  flash: HTMLElement;
  burst: HTMLElement;
  combo: HTMLElement;
  audio: AudioFx;
  onPerfectFrame?: () => void;
}

const PERFECT_THRESHOLD = 88;

export class ComboBurst {
  private options: ComboBurstOptions;
  private lastBurst = 0;
  private lastCombo = 0;
  private lastComboTrigger = 0;
  private bestCombo = 0;
  private perfectFrames = 0;

  constructor(options: ComboBurstOptions) {
    this.options = options;
    this.options.bus.on("score:update", (payload) => this.handle(payload));
  }

  reset(): void {
    this.lastBurst = 0;
    this.lastCombo = 0;
    this.lastComboTrigger = 0;
    this.bestCombo = 0;
    this.perfectFrames = 0;
  }

  getStats(): { bestCombo: number; perfectFrames: number } {
    return { bestCombo: this.bestCombo, perfectFrames: this.perfectFrames };
  }

  private handle(payload: ScoreUpdate): void {
    const now = performance.now();
    if (payload.combo > this.bestCombo) this.bestCombo = payload.combo;
    if (payload.score >= PERFECT_THRESHOLD) {
      this.perfectFrames += 1;
      this.options.onPerfectFrame?.();
    }

    if (payload.score >= PERFECT_THRESHOLD && now - this.lastBurst > 1100) {
      this.lastBurst = now;
      this.fireBurst();
      this.options.audio.perfect();
    }

    if (payload.combo >= this.lastCombo + 4 || (payload.combo >= 8 && now - this.lastComboTrigger > 1800)) {
      this.lastComboTrigger = now;
      this.fireCombo(payload.combo);
      this.options.audio.combo(payload.combo);
    }
    this.lastCombo = payload.combo;
  }

  private fireBurst(): void {
    this.replay(this.options.flash, "is-firing");
    this.replay(this.options.burst, "is-firing");
  }

  private fireCombo(combo: number): void {
    this.options.combo.textContent = `COMBO ×${String(combo).padStart(2, "0")}`;
    this.replay(this.options.combo, "is-firing");
  }

  private replay(element: HTMLElement, className: string): void {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }
}

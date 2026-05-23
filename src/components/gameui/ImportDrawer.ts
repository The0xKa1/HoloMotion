import { VideoSeeker } from "../../core/import/VideoSeeker.js";
import { landmarksToPose } from "../../core/import/landmarksToPose.js";
import { postProcessFrames } from "../../core/import/postProcess.js";
import type { LandmarkerController, PoseModel } from "../../core/PoseLandmarkerManager.js";
import type { CoachClip, SeedMotion, SkeletonPose } from "../../types/motion.js";

interface ImportDrawerOptions {
  drawer: HTMLElement;
  backdrop: HTMLElement;
  trigger: HTMLElement;
  closeButton: HTMLElement;
  fileInput: HTMLInputElement;
  dropZone: HTMLElement;
  motionSelect: HTMLSelectElement;
  startButton: HTMLButtonElement;
  applyButton: HTMLButtonElement;
  progressBar: HTMLElement;
  progressLabel: HTMLElement;
  statusLabel: HTMLElement;
  preview: HTMLVideoElement;
  landmarkerController: LandmarkerController;
  onApply(clip: CoachClip): void;
}

interface RestoreState {
  model: PoseModel;
  pose: boolean;
  hand: boolean;
  face: boolean;
}

export class ImportDrawer {
  private options: ImportDrawerOptions;
  private isOpen = false;
  private file: File | null = null;
  private pending: CoachClip | null = null;
  private busy = false;

  constructor(options: ImportDrawerOptions) {
    this.options = options;
    this.bindEvents();
    this.setStatus("等待上传视频");
    this.setProgress(0, 0);
    this.options.startButton.disabled = true;
    this.options.applyButton.disabled = true;
  }

  open(): void {
    this.isOpen = true;
    this.options.drawer.classList.add("is-open");
    this.options.backdrop.classList.add("is-open");
  }

  close(): void {
    if (this.busy) return;
    this.isOpen = false;
    this.options.drawer.classList.remove("is-open");
    this.options.backdrop.classList.remove("is-open");
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  private bindEvents(): void {
    this.options.trigger.addEventListener("click", () => this.toggle());
    this.options.closeButton.addEventListener("click", () => this.close());
    this.options.backdrop.addEventListener("click", () => this.close());
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isOpen) this.close();
    });

    this.options.fileInput.addEventListener("change", () => {
      const next = this.options.fileInput.files?.[0] ?? null;
      this.handleFile(next);
    });

    const dz = this.options.dropZone;
    dz.addEventListener("dragover", (e) => {
      e.preventDefault();
      dz.classList.add("is-drag");
    });
    dz.addEventListener("dragleave", () => dz.classList.remove("is-drag"));
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      dz.classList.remove("is-drag");
      const next = e.dataTransfer?.files?.[0] ?? null;
      if (next) {
        this.options.fileInput.files = e.dataTransfer!.files;
        this.handleFile(next);
      }
    });

    this.options.startButton.addEventListener("click", () => void this.runImport());
    this.options.applyButton.addEventListener("click", () => {
      if (this.pending) this.options.onApply(this.pending);
    });
  }

  private handleFile(file: File | null): void {
    this.file = file;
    this.pending = null;
    this.options.applyButton.disabled = true;
    this.setProgress(0, 0);
    if (!file) {
      this.setStatus("等待上传视频");
      this.options.startButton.disabled = true;
      this.options.preview.removeAttribute("src");
      return;
    }
    this.setStatus(`已选择 ${file.name}`);
    this.options.startButton.disabled = false;
    const url = URL.createObjectURL(file);
    this.options.preview.src = url;
  }

  private async runImport(): Promise<void> {
    if (!this.file || this.busy) return;
    this.busy = true;
    this.options.startButton.disabled = true;
    this.options.applyButton.disabled = true;
    this.setProgress(0, 0);
    this.setStatus("加载视频中…");

    const ctrl = this.options.landmarkerController;
    const restore: RestoreState = {
      model: ctrl.getModel(),
      pose: ctrl.isEnabled("pose"),
      hand: ctrl.isEnabled("hand"),
      face: ctrl.isEnabled("face"),
    };
    ctrl.setModel("heavy");
    ctrl.setEnabled("pose", true);
    ctrl.setEnabled("hand", false);
    ctrl.setEnabled("face", false);

    const seeker = new VideoSeeker(this.file);
    try {
      const meta = await seeker.load();
      const fps = 30;
      const collected: Array<SkeletonPose | null> = [];

      this.setStatus("启动 Heavy 模型，首次约 10 秒…");
      let detectedCount = 0;

      await seeker.iterate(fps, async (video, time, index, total) => {
        const tsMs = time * 1000;
        const result = ctrl.detect(video, tsMs);
        const world = result?.pose?.world;
        const pose = world && world.length === 33 ? landmarksToPose(world) : null;
        collected.push(pose);
        if (pose) detectedCount += 1;
        this.setProgress(index + 1, total);
        if (index === 0) {
          this.setStatus(`解析中：0 / ${total} 帧`);
        } else if ((index & 7) === 7) {
          this.setStatus(`解析中：${index + 1} / ${total} 帧 · 命中 ${detectedCount}`);
        }
        // yield to RAF so the rest of the UI keeps refreshing
        if ((index & 3) === 3) {
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
        }
      });

      if (detectedCount < 4) {
        throw new Error(`只识别到 ${detectedCount} 帧人体，视频里可能没有清晰的全身入境画面`);
      }

      this.setStatus("时序平滑 + 居中归一…");
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      const cleaned = postProcessFrames(collected, fps);
      if (cleaned.length === 0) throw new Error("帧序列为空");

      const motion = (this.options.motionSelect.value || "flow") as SeedMotion;
      const clip: CoachClip = {
        id: makeId(),
        name: stripExt(this.file.name),
        fps,
        durationSeconds: meta.durationSeconds,
        frames: cleaned,
        motion,
        capturedAt: Date.now(),
      };
      this.pending = clip;
      this.setStatus(
        `解析完成 · ${cleaned.length} 帧 / ${meta.durationSeconds.toFixed(1)}s · 命中率 ${(
          (detectedCount / cleaned.length) *
          100
        ).toFixed(0)}%`,
      );
      this.options.applyButton.disabled = false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[ImportDrawer] import failed", err);
      this.setStatus(`解析失败：${msg}`);
    } finally {
      seeker.dispose();
      ctrl.setModel(restore.model);
      ctrl.setEnabled("pose", restore.pose);
      ctrl.setEnabled("hand", restore.hand);
      ctrl.setEnabled("face", restore.face);
      this.options.startButton.disabled = false;
      this.busy = false;
    }
  }

  private setProgress(done: number, total: number): void {
    const pct = total === 0 ? 0 : Math.min(100, (done / total) * 100);
    this.options.progressBar.style.width = `${pct.toFixed(1)}%`;
    this.options.progressLabel.textContent = total === 0 ? "—" : `${done} / ${total}`;
  }

  private setStatus(text: string): void {
    this.options.statusLabel.textContent = text;
  }
}

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `clip-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

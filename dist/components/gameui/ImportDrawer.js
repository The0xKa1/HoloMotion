import { VideoSeeker } from "../../core/import/VideoSeeker.js";
import { landmarksToPose } from "../../core/import/landmarksToPose.js";
import { postProcessFrames } from "../../core/import/postProcess.js";
import { SegmentResourceStore,                      } from "../../core/mllm/SegmentResourceStore.js";
import {
  VideoSegmentationClient,
  sampleFramesAtInterval,
} from "../../core/mllm/VideoSegmentationClient.js";
                                                                                           
                                                                                 

const THUMB_WIDTH = 60;
const THUMB_HEIGHT = 106;
const SEGMENT_SAMPLE_INTERVAL_SEC = 1.5;

                               
                      
                        
                       
                           
                              
                        
                                  
                                 
                                 
                                   
                           
                              
                           
                             
                           
                            
                                             
                                 
 

                        
                   
                
                
                
 

export class ImportDrawer {
          options                     ;
          isOpen = false;
          file              = null;
          pending                   = null;
          busy = false;
          segmentClient = new VideoSegmentationClient();
          resourceStore = new SegmentResourceStore();
          activePreview                                                             = null;

  constructor(options                     ) {
    this.options = options;
    this.bindEvents();
    this.setStatus("等待上传视频");
    this.setProgress(0, 0);
    this.options.startButton.disabled = true;
    this.options.applyButton.disabled = true;
    this.options.segmentButton.disabled = true;
    this.renderSegments([]);
  }

  open()       {
    this.isOpen = true;
    this.options.drawer.classList.add("is-open");
    this.options.backdrop.classList.add("is-open");
  }

  close()       {
    if (this.busy) return;
    this.isOpen = false;
    this.options.drawer.classList.remove("is-open");
    this.options.backdrop.classList.remove("is-open");
  }

  toggle()       {
    if (this.isOpen) this.close();
    else this.open();
  }

          bindEvents()       {
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
        this.options.fileInput.files = e.dataTransfer .files;
        this.handleFile(next);
      }
    });

    this.options.startButton.addEventListener("click", () => void this.runImport());
    this.options.segmentButton.addEventListener("click", () => void this.runSegmentation());
    this.options.preview.addEventListener("click", () => {
      if (!this.activePreview) return;
      if (this.options.preview.paused) {
        this.options.preview.play().catch(() => {
          // Native controls still allow manual playback if programmatic play is blocked.
        });
      } else {
        this.options.preview.pause();
      }
    });
    this.options.applyButton.addEventListener("click", () => {
      if (this.pending) this.options.onApply(this.pending);
    });
  }

          handleFile(file             )       {
    this.stopPreviewLoop();
    this.resourceStore.clear();
    this.file = file;
    this.pending = null;
    this.options.applyButton.disabled = true;
    this.options.segmentButton.disabled = !file;
    this.renderSegments([]);
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

          async runSegmentation()                {
    if (!this.file || this.busy) return;

    this.busy = true;
    this.options.segmentButton.disabled = true;
    this.options.startButton.disabled = true;
    this.options.applyButton.disabled = true;
    this.setProgress(0, 0);
    this.setStatus("加载视频元信息…");

    const seeker = new VideoSeeker(this.file);
    try {
      const meta = await seeker.load();
      this.setStatus(`抽取关键帧 (每 ${SEGMENT_SAMPLE_INTERVAL_SEC}s 一张)…`);
      const frames = await sampleFramesAtInterval(seeker, SEGMENT_SAMPLE_INTERVAL_SEC);
      this.setStatus(`调用后端 MLLM 分割 (${frames.length} 帧)…`);
      const result = await this.segmentClient.segmentVideo({
        fileName: this.file.name,
        durationSeconds: meta.durationSeconds,
        frames,
      });
      this.setStatus("生成片段缩略图…");
      const thumbnails = await captureSegmentThumbnails(seeker, result.segments);
      const resources = this.resourceStore.replace(this.file, result, thumbnails);
      this.renderSegments(resources);
      this.setStatus(`AI 分割完成 · ${resources.length} 段`);
    } catch (err) {
      const name = err instanceof Error ? err.name : "Error";
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[ImportDrawer] MLLM segmentation failed", {
        name,
        message: msg,
        error: err,
      });
      this.resourceStore.clear();
      this.renderSegments([]);
      const hint =
        msg === "Failed to fetch"
          ? "（fetch 直接失败,后端没起来或 CORS 没放行。检查 npm run server 是否在运行）"
          : "";
      this.setStatus(`AI 分割失败：${name}: ${msg}${hint}`);
    } finally {
      seeker.dispose();
      this.options.segmentButton.disabled = !this.file;
      this.options.startButton.disabled = !this.file;
      this.busy = false;
    }
  }

          async runImport(resource                  )                {
    if (!this.file || this.busy) return;
    this.busy = true;
    this.options.startButton.disabled = true;
    this.options.segmentButton.disabled = true;
    this.options.applyButton.disabled = true;
    this.setProgress(0, 0);
    this.setStatus("加载视频中…");

    const ctrl = this.options.landmarkerController;
    const restore               = {
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
      this.setStatus("探测帧率…");
      const fps = await seeker.probeFps();
      const collected                             = [];
      const thumbnails           = [];
      const thumbCapture = createThumbCapture(THUMB_WIDTH, THUMB_HEIGHT);

      this.setStatus(`启动 Heavy 模型 (源 ${fps}fps)，首次约 10 秒…`);
      await ctrl.ensureReady(["pose"]);
      let detectedCount = 0;
      const stats = { noResult: 0, noPose: 0, shortWorld: 0, badPose: 0 };

      const startSec = resource?.segment.startSec ?? 0;
      const endSec = resource?.segment.endSec ?? meta.durationSeconds;
      await seeker.iterateRange(startSec, endSec, fps, async (video, time, index, total) => {
        const tsMs = time * 1000;
        const result = ctrl.detect(video, tsMs);
        let pose                      = null;
        if (!result) {
          stats.noResult += 1;
        } else if (!result.pose) {
          stats.noPose += 1;
        } else {
          const world = result.pose.world;
          if (world.length !== 33) {
            stats.shortWorld += 1;
          } else {
            pose = landmarksToPose(world);
            if (!pose) stats.badPose += 1;
          }
        }
        collected.push(pose);
        if (pose) detectedCount += 1;

        thumbnails.push(thumbCapture(video));

        this.setProgress(index + 1, total);
        if (index === 0) {
          this.setStatus(`解析中：0 / ${total} 帧`);
        } else if ((index & 7) === 7) {
          this.setStatus(`解析中：${index + 1} / ${total} 帧 · 命中 ${detectedCount}`);
        }
        if ((index & 3) === 3) {
          await new Promise      ((r) => requestAnimationFrame(() => r()));
        }
      });

      if (detectedCount < 4) {
        console.warn("[ImportDrawer] low detection rate", {
          total: collected.length,
          detectedCount,
          stats,
          meta,
        });
        const detail = `noResult=${stats.noResult} noPose=${stats.noPose} shortWorld=${stats.shortWorld} badPose=${stats.badPose}`;
        throw new Error(`只识别到 ${detectedCount} 帧人体（${detail}），打开 DevTools 控制台查看详情`);
      }

      this.setStatus("时序平滑 + 居中归一…");
      await new Promise      ((r) => requestAnimationFrame(() => r()));
      const cleaned = postProcessFrames(collected, fps);
      if (cleaned.length === 0) throw new Error("帧序列为空");

      const motion = (this.options.motionSelect.value || "flow")              ;
      const clipName = resource ? `${resource.segment.name} · ${stripExt(this.file.name)}` : stripExt(this.file.name);
      const clip            = {
        id: makeId(),
        name: clipName,
        fps,
        durationSeconds: endSec - startSec,
        frames: cleaned,
        motion,
        capturedAt: Date.now(),
        thumbnails,
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
      this.options.segmentButton.disabled = !this.file;
      this.busy = false;
    }
  }

          renderSegments(resources                   )       {
    this.options.segmentList.innerHTML = "";
    if (resources.length === 0) {
      this.options.segmentSummary.textContent = "session library empty";
      const empty = document.createElement("p");
      empty.className = "settings-hint";
      empty.textContent = "上传视频后可调用 MLLM 生成动作分段和 Metadata。";
      this.options.segmentList.appendChild(empty);
      return;
    }
    this.options.segmentSummary.textContent = `${resources.length} segments`;
    resources.forEach((resource) => {
      const card = document.createElement("article");
      card.className = "segment-card";
      const tags = Object.entries(resource.segment.metadata)
        .slice(0, 6)
        .map(([key, value]) => `<span>${escapeHtml(key)}: ${escapeHtml(value)}</span>`)
        .join("");
      card.innerHTML = `
        <button class="segment-thumb" type="button" aria-label="预览 ${escapeHtml(resource.segment.name)}">
          ${resource.thumbnail ? `<img src="${resource.thumbnail}" alt="" />` : "<i></i>"}
        </button>
        <div class="segment-main">
          <div class="segment-top">
            <strong>${escapeHtml(resource.segment.name)}</strong>
            <span>${formatTime(resource.segment.startSec)}-${formatTime(resource.segment.endSec)}</span>
          </div>
          <div class="segment-label">${escapeHtml(resource.segment.actionLabel)} · ${Math.round(resource.segment.confidence * 100)}%</div>
          <div class="segment-tags">${tags || "<span>metadata pending</span>"}</div>
          <div class="segment-actions">
            <button class="secondary-button" type="button" data-preview="${escapeHtml(resource.id)}">预览</button>
            <button class="primary-button" type="button" data-apply="${escapeHtml(resource.id)}">应用片段</button>
          </div>
        </div>
      `;
      card.querySelector                   (".segment-thumb")?.addEventListener("click", () => void this.previewSegment(resource));
      card.querySelector                   ("[data-preview]")?.addEventListener("click", () => void this.previewSegment(resource));
      card.querySelector                   ("[data-apply]")?.addEventListener("click", () => void this.runImport(resource));
      this.options.segmentList.appendChild(card);
    });
  }

          async previewSegment(resource                 )                {
    this.stopPreviewLoop();
    this.setStatus(`准备预览片段 · ${resource.segment.name}`);
    this.options.preview.scrollIntoView({ block: "center", behavior: "smooth" });
    this.options.preview.classList.add("is-previewing");
    const handler = () => {
      if (this.options.preview.currentTime >= resource.segment.endSec) {
        this.options.preview.pause();
        this.options.preview.currentTime = resource.segment.startSec;
      }
    };
    try {
      this.options.preview.pause();
      if (this.options.preview.src !== resource.sourceUrl) {
        this.options.preview.src = resource.sourceUrl;
        this.options.preview.load();
      }
      await waitForVideoMetadata(this.options.preview);
      const start = clamp(resource.segment.startSec, 0, this.options.preview.duration || resource.segment.startSec);
      const end = clamp(resource.segment.endSec, start, this.options.preview.duration || resource.segment.endSec);
      this.options.preview.currentTime = start;
      await waitForSeek(this.options.preview);
      this.options.preview.addEventListener("timeupdate", handler);
      this.activePreview = { id: resource.id, stopAt: end, handler };
      this.setStatus(`预览片段 · ${resource.segment.name}`);
      this.options.preview.play().catch(() => {
        this.setStatus(`已定位片段 · ${resource.segment.name}，点击视频可播放`);
      });
    } catch (err) {
      this.options.preview.classList.remove("is-previewing");
      this.options.preview.removeEventListener("timeupdate", handler);
      const msg = err instanceof Error ? err.message : String(err);
      this.setStatus(`预览失败：${msg}`);
    }
  }

          stopPreviewLoop()       {
    if (!this.activePreview) return;
    this.options.preview.classList.remove("is-previewing");
    this.options.preview.removeEventListener("timeupdate", this.activePreview.handler);
    this.activePreview = null;
  }

          setProgress(done        , total        )       {
    const pct = total === 0 ? 0 : Math.min(100, (done / total) * 100);
    this.options.progressBar.style.width = `${pct.toFixed(1)}%`;
    this.options.progressLabel.textContent = total === 0 ? "—" : `${done} / ${total}`;
  }

          setStatus(text        )       {
    this.options.statusLabel.textContent = text;
  }
}

function makeId()         {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `clip-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function stripExt(name        )         {
  return name.replace(/\.[^.]+$/, "");
}

function createThumbCapture(width        , height        )                                      {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return () => "";
  }
  const cellRatio = width / height;
  return (video) => {
    const vw = video.videoWidth || width;
    const vh = video.videoHeight || height;
    const videoRatio = vw / vh;
    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;
    if (videoRatio > cellRatio) {
      sw = vh * cellRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / cellRatio;
      sy = (vh - sh) / 2;
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.55);
  };
}

async function captureSegmentThumbnails(
  seeker             ,
  segments                                                         ,
)                               {
  const capture = createThumbCapture(THUMB_WIDTH, THUMB_HEIGHT);
  const out = new Map                ();
  for (const segment of segments) {
    let done = false;
    await seeker.iterateRange(segment.startSec, Math.min(segment.endSec, segment.startSec + 0.04), 1, (video) => {
      if (!done) {
        out.set(segment.id, capture(video));
        done = true;
      }
    });
  }
  return out;
}

function formatTime(seconds        )         {
  const s = Math.max(0, seconds);
  const min = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function escapeHtml(text        )         {
  return text.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&#39;";
  });
}

function waitForVideoMetadata(video                  )                {
  if (video.readyState >= 1 && Number.isFinite(video.duration)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("视频预览加载超时"));
    }, 4000);
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("视频预览加载失败"));
    };
    video.addEventListener("loadedmetadata", onReady, { once: true });
    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

function waitForSeek(video                  )                {
  if (!video.seeking) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, 600);
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
    };
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    video.addEventListener("seeked", onSeeked, { once: true });
  });
}

function clamp(value        , min        , max        )         {
  return Math.min(max, Math.max(min, value));
}

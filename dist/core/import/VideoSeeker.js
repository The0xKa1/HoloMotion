                            
                          
                     
                      
 

                            
                          
                           
                
                
                          

export class VideoSeeker {
          file      ;
          video                          = null;
          objectUrl                = null;
          duration = 0;

  constructor(file      ) {
    this.file = file;
  }

  async load()                     {
    this.objectUrl = URL.createObjectURL(this.file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.crossOrigin = "anonymous";
    video.setAttribute("playsinline", "true");
    video.src = this.objectUrl;
    this.video = video;

    await new Promise      ((resolve, reject) => {
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", onMeta);
        video.removeEventListener("error", onErr);
      };
      const onMeta = () => {
        cleanup();
        resolve();
      };
      const onErr = () => {
        cleanup();
        reject(new Error("视频解码失败 (可能是不支持的格式)"));
      };
      video.addEventListener("loadedmetadata", onMeta);
      video.addEventListener("error", onErr);
    });

    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error("无法读取视频时长");
    }
    this.duration = video.duration;
    return {
      durationSeconds: video.duration,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
    };
  }

  getVideo()                   {
    if (!this.video) throw new Error("VideoSeeker not loaded");
    return this.video;
  }

  async iterate(targetFps        , visitor              )                {
    if (!this.video) throw new Error("VideoSeeker not loaded");
    const fps = Math.max(1, targetFps);
    const total = Math.max(1, Math.round(this.duration * fps));
    const step = this.duration / total;
    for (let i = 0; i < total; i += 1) {
      const t = Math.min(this.duration - 1 / fps / 2, i * step);
      await this.seekTo(t);
      await visitor(this.video, t, i, total);
    }
  }

  dispose()       {
    if (this.video) {
      this.video.removeAttribute("src");
      this.video.load();
      this.video = null;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

          seekTo(time        )                {
    if (!this.video) throw new Error("VideoSeeker not loaded");
    const video = this.video;
    return new Promise      ((resolve) => {
      let done = false;
      const handler = () => {
        if (done) return;
        done = true;
        video.removeEventListener("seeked", handler);
        resolve();
      };
      video.addEventListener("seeked", handler);
      video.currentTime = time;
    });
  }
}

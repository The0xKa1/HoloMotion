import { WORLD_SPACE } from "./coordinates.js";
                                              
                                                     

                                           

                                 
                          
                                                
                  
                
 

export const DEFAULT_CAMERA_SETTINGS                 = {
  deviceId: null,
  resolution: { width: 1280, height: 720 },
  mirror: true,
  fit: "contain",
};

export class WebCamManager {
          video                  ;
          bus          ;
          active = false;
          mode             = "mock";
          settings                 = { ...DEFAULT_CAMERA_SETTINGS };

  constructor(video                  , bus          ) {
    this.video = video;
    this.bus = bus;
    this.applyPresentation();
  }

  isActive()          {
    return this.active;
  }

  getMode()             {
    return this.mode;
  }

  getSettings()                 {
    return { ...this.settings, resolution: { ...this.settings.resolution } };
  }

  async applySettings(next                         )                {
    const previous = this.settings;
    this.settings = {
      ...previous,
      ...next,
      resolution: next.resolution ? { ...next.resolution } : previous.resolution,
    };
    this.applyPresentation();

    const needsRestart =
      this.active &&
      this.mode === "camera" &&
      (next.deviceId !== undefined && next.deviceId !== previous.deviceId ||
        (next.resolution !== undefined &&
          (next.resolution.width !== previous.resolution.width ||
            next.resolution.height !== previous.resolution.height)));

    if (needsRestart) {
      await this.startStream();
    }
  }

  async toggle()                {
    if (this.active) {
      this.stop();
      return;
    }
    await this.startStream();
  }

  stop()       {
    if (this.video.srcObject) {
      const stream = this.video.srcObject               ;
      stream.getTracks().forEach((track) => track.stop());
      this.video.srcObject = null;
    }
    this.active = false;
    this.mode = "mock";
    this.video.classList.remove("is-visible");
    this.bus.emit("camera:update", { active: false, mode: "mock", label: "Mock WebSocket streaming" });
  }

          async startStream()                {
    const previous = this.video.srcObject;
    if (previous) {
      const stream = previous               ;
      stream.getTracks().forEach((track) => track.stop());
      this.video.srcObject = null;
    }

    const { deviceId, resolution } = this.settings;
    const videoConstraints                        = {
      width: { ideal: resolution.width },
      height: { ideal: resolution.height },
    };
    if (deviceId) {
      videoConstraints.deviceId = { exact: deviceId };
    } else {
      videoConstraints.facingMode = "user";
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
      this.video.srcObject = stream;
      await this.video.play();
      this.active = true;
      this.mode = "camera";
      this.video.classList.add("is-visible");
      this.bus.emit("camera:update", { active: true, mode: "camera", label: "Local camera pose stream" });
    } catch {
      this.active = true;
      this.mode = "mock";
      this.video.classList.remove("is-visible");
      this.bus.emit("camera:update", { active: true, mode: "mock", label: "Camera fallback: mock stream" });
    }
  }

          applyPresentation()       {
    this.video.style.transform = this.settings.mirror ? WORLD_SPACE.cameraCanvasTransform : "";
    this.video.classList.toggle("no-mirror", !this.settings.mirror);
    this.video.classList.toggle("is-cover", this.settings.fit === "cover");
  }
}

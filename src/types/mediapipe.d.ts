declare module "@mediapipe/tasks-vision" {
  export interface NormalizedLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
  }

  export interface Category {
    index?: number;
    score?: number;
    categoryName?: string;
    displayName?: string;
  }

  export interface PoseLandmarkerResult {
    landmarks: NormalizedLandmark[][];
    worldLandmarks?: NormalizedLandmark[][];
  }

  export interface PoseLandmarkerOptions {
    baseOptions: {
      modelAssetPath: string;
      delegate?: "CPU" | "GPU";
    };
    runningMode?: "IMAGE" | "VIDEO";
    numPoses?: number;
    minPoseDetectionConfidence?: number;
    minPosePresenceConfidence?: number;
    minTrackingConfidence?: number;
    outputSegmentationMasks?: boolean;
  }

  export interface HandLandmarkerResult {
    landmarks: NormalizedLandmark[][];
    worldLandmarks?: NormalizedLandmark[][];
    handedness?: Category[][];
    handednesses?: Category[][];
  }

  export interface HandLandmarkerOptions {
    baseOptions: {
      modelAssetPath: string;
      delegate?: "CPU" | "GPU";
    };
    runningMode?: "IMAGE" | "VIDEO";
    numHands?: number;
    minHandDetectionConfidence?: number;
    minHandPresenceConfidence?: number;
    minTrackingConfidence?: number;
  }

  export interface FaceLandmarkerResult {
    faceLandmarks: NormalizedLandmark[][];
    faceBlendshapes?: unknown[];
    facialTransformationMatrixes?: unknown[];
  }

  export interface FaceLandmarkerOptions {
    baseOptions: {
      modelAssetPath: string;
      delegate?: "CPU" | "GPU";
    };
    runningMode?: "IMAGE" | "VIDEO";
    numFaces?: number;
    minFaceDetectionConfidence?: number;
    minFacePresenceConfidence?: number;
    minTrackingConfidence?: number;
    outputFaceBlendshapes?: boolean;
    outputFacialTransformationMatrixes?: boolean;
  }

  export class FilesetResolver {
    static forVisionTasks(wasmFileset: string): Promise<FilesetResolver>;
  }

  export class PoseLandmarker {
    static createFromOptions(
      vision: FilesetResolver,
      options: PoseLandmarkerOptions,
    ): Promise<PoseLandmarker>;
    detectForVideo(video: HTMLVideoElement, timestampMs: number): PoseLandmarkerResult;
    close(): void;
  }

  export class HandLandmarker {
    static createFromOptions(
      vision: FilesetResolver,
      options: HandLandmarkerOptions,
    ): Promise<HandLandmarker>;
    detectForVideo(video: HTMLVideoElement, timestampMs: number): HandLandmarkerResult;
    close(): void;
  }

  export class FaceLandmarker {
    static createFromOptions(
      vision: FilesetResolver,
      options: FaceLandmarkerOptions,
    ): Promise<FaceLandmarker>;
    detectForVideo(video: HTMLVideoElement, timestampMs: number): FaceLandmarkerResult;
    close(): void;
  }
}

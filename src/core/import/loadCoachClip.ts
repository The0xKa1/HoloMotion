import type { CoachClip, ExerciseId, JointName, SeedMotion, SkeletonPose, Vec3Meters } from "../../types/motion.js";

interface CoachClipManifestEntry {
  exercise: ExerciseId;
  url: string;
}

const COACH_CLIP_MANIFEST: CoachClipManifestEntry[] = [
  { exercise: "squat", url: "public/coach_clips/single_leg_squat.json" },
];

interface RawJoint {
  position: [number, number, number];
  rotation: [number, number, number, number];
}

interface RawClip {
  id: string;
  name: string;
  fps: number;
  durationSeconds: number;
  frames: Array<Record<string, RawJoint>>;
  motion: SeedMotion;
  capturedAt: number;
  thumbnails: string[];
}

const JOINT_NAMES: JointName[] = [
  "pelvis",
  "spine",
  "chest",
  "neck",
  "head",
  "lShoulder",
  "rShoulder",
  "lElbow",
  "rElbow",
  "lWrist",
  "rWrist",
  "lHip",
  "rHip",
  "lKnee",
  "rKnee",
  "lAnkle",
  "rAnkle",
];

export function getCoachClipManifest(): readonly CoachClipManifestEntry[] {
  return COACH_CLIP_MANIFEST;
}

export async function loadCoachClip(url: string): Promise<CoachClip> {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Failed to fetch coach clip ${url}: ${response.status}`);
  }
  const raw = (await response.json()) as RawClip;
  return validateClip(raw);
}

function validateClip(raw: RawClip): CoachClip {
  if (!Array.isArray(raw.frames) || raw.frames.length === 0) {
    throw new Error("Coach clip has no frames");
  }
  if (typeof raw.fps !== "number" || raw.fps <= 0) {
    throw new Error("Coach clip fps is invalid");
  }
  const frames = raw.frames.map((frame, index) => toSkeletonPose(frame, index));
  return {
    id: raw.id,
    name: raw.name,
    fps: raw.fps,
    durationSeconds: raw.durationSeconds,
    frames,
    motion: raw.motion,
    capturedAt: raw.capturedAt,
    thumbnails: Array.isArray(raw.thumbnails) ? raw.thumbnails : [],
  };
}

function toSkeletonPose(frame: Record<string, RawJoint>, index: number): SkeletonPose {
  const out = {} as SkeletonPose;
  for (const name of JOINT_NAMES) {
    const raw = frame[name];
    if (!raw) {
      throw new Error(`Coach clip frame ${index} missing joint ${name}`);
    }
    const position: Vec3Meters = [raw.position[0], raw.position[1], raw.position[2]];
    out[name] = {
      position,
      rotation: [raw.rotation[0], raw.rotation[1], raw.rotation[2], raw.rotation[3]],
    };
  }
  return out;
}

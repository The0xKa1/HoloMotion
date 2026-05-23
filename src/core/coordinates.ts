import type { Vec3Meters } from "../types/motion.js";

export const WORLD_SPACE = {
  unit: "meters",
  handedness: "right-hand",
  yAxis: "up",
  xAxis: "right",
  zAxis: "out-of-screen",
  coachCanvasMirrored: false,
  cameraCanvasTransform: "scaleX(-1)",
};

export function meters(x: number, y: number, z: number): Vec3Meters {
  return [x, y, z];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function formatCm(value: number): string {
  return `${value.toFixed(1)} cm`;
}

export function formatDeg(value: number): string {
  return `${Math.round(value)} deg`;
}

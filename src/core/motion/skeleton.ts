import type { JointName } from "../../types/motion.js";

export const bones: Array<[JointName, JointName]> = [
  ["head", "neck"],
  ["neck", "chest"],
  ["chest", "spine"],
  ["spine", "pelvis"],
  ["chest", "lShoulder"],
  ["lShoulder", "lElbow"],
  ["lElbow", "lWrist"],
  ["chest", "rShoulder"],
  ["rShoulder", "rElbow"],
  ["rElbow", "rWrist"],
  ["pelvis", "lHip"],
  ["lHip", "lKnee"],
  ["lKnee", "lAnkle"],
  ["pelvis", "rHip"],
  ["rHip", "rKnee"],
  ["rKnee", "rAnkle"],
];

export const stressJointMap: Record<string, JointName[]> = {
  knee: ["lKnee", "rKnee"],
  hip: ["lHip", "rHip"],
  spine: ["spine", "chest"],
  ankle: ["lAnkle", "rAnkle"],
  shoulder: ["lShoulder", "rShoulder"],
  wrist: ["lWrist", "rWrist"],
};

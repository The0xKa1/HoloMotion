import { THREE, quaternionFromTuple } from "./three-compat.js";
import type { FrameStreamPacket, JointName, MotionFrame, RuntimeFrame } from "../types/motion.js";

const orderedJoints: JointName[] = [
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

export class MotionFrameBuffer {
  private latestFrame: RuntimeFrame | null;
  private sequence: number;

  constructor() {
    this.latestFrame = null;
    this.sequence = 0;
  }

  pushPacket(packet: FrameStreamPacket): void {
    if (packet.type !== "FRAME_STREAM") return;
    this.latestFrame = this.toRuntimeFrame(packet.data);
    this.sequence += 1;
  }

  readLatest(): RuntimeFrame | null {
    return this.latestFrame;
  }

  getSequence(): number {
    return this.sequence;
  }

  reset(): void {
    this.latestFrame = null;
    this.sequence += 1;
  }

  private toRuntimeFrame(frame: MotionFrame): RuntimeFrame {
    const joints = {} as RuntimeFrame["joints"];
    const seedJoints = {} as RuntimeFrame["seedJoints"];

    orderedJoints.forEach((joint) => {
      const source = frame.joints[joint];
      joints[joint] = {
        position: source.position,
        rotation: quaternionFromTuple(source.rotation),
      };

      const seedSource = frame.seedJoints[joint];
      seedJoints[joint] = {
        position: seedSource.position,
        rotation: quaternionFromTuple(seedSource.rotation),
      };
    });

    return {
      ...frame,
      globalTransform: {
        translation: frame.globalTransform.translation,
        rotation: quaternionFromTuple(frame.globalTransform.rotation, new THREE.Quaternion()),
      },
      seedJoints,
      joints,
      localRotations: frame.localRotations.map((rotation) => quaternionFromTuple(rotation, new THREE.Quaternion())),
    };
  }
}

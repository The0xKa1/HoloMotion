import {
  AmbientLight as ThreeAmbientLight,
  BufferAttribute as ThreeBufferAttribute,
  BufferGeometry as ThreeBufferGeometry,
  Color as ThreeColor,
  CylinderGeometry as ThreeCylinderGeometry,
  DirectionalLight as ThreeDirectionalLight,
  DoubleSide as ThreeDoubleSide,
  DynamicDrawUsage as ThreeDynamicDrawUsage,
  GridHelper as ThreeGridHelper,
  Group as ThreeGroup,
  Material as ThreeMaterial,
  Mesh as ThreeMesh,
  MeshBasicMaterial as ThreeMeshBasicMaterial,
  MeshStandardMaterial as ThreeMeshStandardMaterial,
  Object3D as ThreeObject3D,
  PerspectiveCamera as ThreePerspectiveCamera,
  Quaternion as ThreeQuaternion,
  Scene as ThreeScene,
  SphereGeometry as ThreeSphereGeometry,
  Vector3 as ThreeVector3,
  WebGLRenderer as ThreeWebGLRenderer,
} from "three";
import type { QuaternionTuple } from "../types/motion.js";

export const THREE = {
  AmbientLight: ThreeAmbientLight,
  BufferAttribute: ThreeBufferAttribute,
  BufferGeometry: ThreeBufferGeometry,
  Color: ThreeColor,
  CylinderGeometry: ThreeCylinderGeometry,
  DirectionalLight: ThreeDirectionalLight,
  DoubleSide: ThreeDoubleSide,
  DynamicDrawUsage: ThreeDynamicDrawUsage,
  GridHelper: ThreeGridHelper,
  Group: ThreeGroup,
  Material: ThreeMaterial,
  Mesh: ThreeMesh,
  MeshBasicMaterial: ThreeMeshBasicMaterial,
  MeshStandardMaterial: ThreeMeshStandardMaterial,
  Object3D: ThreeObject3D,
  PerspectiveCamera: ThreePerspectiveCamera,
  Quaternion: ThreeQuaternion,
  Scene: ThreeScene,
  SphereGeometry: ThreeSphereGeometry,
  Vector3: ThreeVector3,
  WebGLRenderer: ThreeWebGLRenderer,
};

export type Quaternion = ThreeQuaternion;
export type MotionQuaternion = InstanceType<typeof THREE.Quaternion>;
export type MotionVector3 = InstanceType<typeof THREE.Vector3>;

export function quaternionFromTuple(tuple: QuaternionTuple, target = new THREE.Quaternion()): MotionQuaternion {
  return target.set(tuple[0], tuple[1], tuple[2], tuple[3]).normalize();
}

export function quaternionFromAxisAmount(axis: [number, number, number], amount: number): QuaternionTuple {
  const [x, y, z] = axis;
  const length = Math.hypot(x, y, z) || 1;
  const half = amount / 2;
  const scale = Math.sin(half) / length;
  return [x * scale, y * scale, z * scale, Math.cos(half)];
}

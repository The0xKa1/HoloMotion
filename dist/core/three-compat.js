import {
  AmbientLight as ThreeAmbientLight,
  BufferGeometry as ThreeBufferGeometry,
  Color as ThreeColor,
  CylinderGeometry as ThreeCylinderGeometry,
  DirectionalLight as ThreeDirectionalLight,
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
                                                          

export const THREE = {
  AmbientLight: ThreeAmbientLight,
  BufferGeometry: ThreeBufferGeometry,
  Color: ThreeColor,
  CylinderGeometry: ThreeCylinderGeometry,
  DirectionalLight: ThreeDirectionalLight,
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

                                         
                                                                     
                                                               

export function quaternionFromTuple(tuple                 , target = new THREE.Quaternion())                   {
  return target.set(tuple[0], tuple[1], tuple[2], tuple[3]).normalize();
}

export function quaternionFromAxisAmount(axis                          , amount        )                  {
  const [x, y, z] = axis;
  const length = Math.hypot(x, y, z) || 1;
  const half = amount / 2;
  const scale = Math.sin(half) / length;
  return [x * scale, y * scale, z * scale, Math.cos(half)];
}

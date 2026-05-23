import { THREE } from "./three-compat.js";

type TrackedGeometry = InstanceType<typeof THREE.BufferGeometry>;
type TrackedMaterial = InstanceType<typeof THREE.Material>;

export class ThreeResourceTracker {
  private geometries: TrackedGeometry[] = [];
  private materials: TrackedMaterial[] = [];

  trackGeometry<G extends TrackedGeometry>(geometry: G): G {
    this.geometries.push(geometry);
    return geometry;
  }

  trackMaterial<M extends TrackedMaterial>(material: M): M {
    this.materials.push(material);
    return material;
  }

  createSceneResources(): void {
    // Reserved for future allocation hooks; presently a no-op since callers
    // build their own scene meshes and feed them through trackGeometry/Material.
  }

  disposeSceneResources(): void {
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.geometries = [];
    this.materials = [];
  }
}

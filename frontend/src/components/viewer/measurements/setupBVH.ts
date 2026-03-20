import * as THREE from 'three'
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh'

// ── One-time BVH monkey-patch ─────────────────────────────────────────────────

let bvhInstalled = false

/**
 * Install BVH acceleration on Three.js prototypes. Safe to call multiple times.
 */
export function installBVH(): void {
  if (bvhInstalled) return
  bvhInstalled = true

  // Extend BufferGeometry and Mesh with BVH methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(THREE.BufferGeometry.prototype as any).computeBoundsTree = computeBoundsTree
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(THREE.BufferGeometry.prototype as any).disposeBoundsTree = disposeBoundsTree
  THREE.Mesh.prototype.raycast = acceleratedRaycast
}

/**
 * After loading meshes, call this to build BVH for each geometry.
 * Must be called after installBVH().
 */
export function buildBVHForMeshes(meshes: THREE.Mesh[]): void {
  for (const mesh of meshes) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(mesh.geometry as any).computeBoundsTree?.()
    } catch (e) {
      console.warn('[BVH] Could not compute bounds tree for mesh:', e)
    }
  }
}

/**
 * Dispose BVH data from all mesh geometries.
 */
export function disposeBVHForMeshes(meshes: THREE.Mesh[]): void {
  for (const mesh of meshes) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(mesh.geometry as any).disposeBoundsTree?.()
    } catch {
      // Ignore
    }
  }
}

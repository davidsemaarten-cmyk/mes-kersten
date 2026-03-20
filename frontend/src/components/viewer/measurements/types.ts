import type { Vector3, Mesh, Camera, WebGLRenderer, Scene } from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

// ── Modes & phases ──────────────────────────────────────────────────────────

export type MeasurementMode =
  | 'none'
  | 'point-to-point'
  | 'face-distance'
  | 'face-angle'
  | 'radius'

export type MeasurementPhase = 'idle' | 'picking_first' | 'picking_second'

// ── Snapping ─────────────────────────────────────────────────────────────────

export type SnapType = 'vertex' | 'edge' | 'face'

export interface SnapTarget {
  point: Vector3
  type: SnapType
  mesh: Mesh
  faceIndex: number
  normal: Vector3
}

// ── Measurement results ───────────────────────────────────────────────────────

export interface PointToPointResult {
  kind: 'point-to-point'
  id: string
  pointA: Vector3
  pointB: Vector3
  distance: number
}

export interface FaceDistanceResult {
  kind: 'face-distance'
  id: string
  centroidA: Vector3
  centroidB: Vector3
  normalA: Vector3
  normalB: Vector3
  distance: number
  parallel: boolean
}

export interface FaceAngleResult {
  kind: 'face-angle'
  id: string
  centroidA: Vector3
  centroidB: Vector3
  normalA: Vector3
  normalB: Vector3
  includedAngleDeg: number
  bendAngleDeg: number
}

export interface RadiusResult {
  kind: 'radius'
  id: string
  center: Vector3
  radius: number
  diameter: number
  confidence: number
}

export type MeasurementResult =
  | PointToPointResult
  | FaceDistanceResult
  | FaceAngleResult
  | RadiusResult

// ── Viewer refs ───────────────────────────────────────────────────────────────

export interface ViewerRefs {
  container: HTMLDivElement
  scene: Scene
  camera: Camera
  renderer: WebGLRenderer
  css2dRenderer: CSS2DRenderer
  meshes: Mesh[]
  controls: OrbitControls
  modelDiagonal: number
}

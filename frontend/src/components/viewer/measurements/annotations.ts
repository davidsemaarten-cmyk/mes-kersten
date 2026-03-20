import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type {
  MeasurementResult,
  PointToPointResult,
  FaceDistanceResult,
  FaceAngleResult,
  RadiusResult,
} from './types'

// ── Color constants ───────────────────────────────────────────────────────────

const COLORS = {
  measurementMarker: 0xff6b00,
  linePointToPoint:  0xff6b00,
  lineFaceDistance:  0x00e676,
  lineFaceAngle:     0xffd600,
  lineRadius:        0xff40ff,
  snapVertex:        0xff6b00,
  snapEdge:          0x00bcd4,
  snapFace:          0x4caf50,
}

const RENDER_ORDER_LINES  = 900
const RENDER_ORDER_LABELS = 950

// ── Dashed line helper ────────────────────────────────────────────────────────

function createDashedLine(
  start: THREE.Vector3,
  end: THREE.Vector3,
  color: number,
  dashScale = 40
): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end])
  const material = new THREE.LineDashedMaterial({
    color,
    dashSize: 0.02,
    gapSize:  0.012,
    scale:    dashScale,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  })
  const line = new THREE.Line(geometry, material)
  line.computeLineDistances()
  line.renderOrder = RENDER_ORDER_LINES
  return line
}

function createSolidLine(
  start: THREE.Vector3,
  end: THREE.Vector3,
  color: number
): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end])
  const material = new THREE.LineBasicMaterial({
    color,
    depthTest: false,
    transparent: true,
    opacity: 0.9,
  })
  const line = new THREE.Line(geometry, material)
  line.renderOrder = RENDER_ORDER_LINES
  return line
}

// ── Arrowhead cone ────────────────────────────────────────────────────────────

function createArrow(
  position: THREE.Vector3,
  direction: THREE.Vector3,
  color: number,
  size: number
): THREE.Mesh {
  const geo = new THREE.ConeGeometry(size * 0.25, size, 8)
  const mat = new THREE.MeshBasicMaterial({ color, depthTest: false })
  const cone = new THREE.Mesh(geo, mat)

  cone.position.copy(position)
  const axis = new THREE.Vector3(0, 1, 0)
  cone.quaternion.setFromUnitVectors(axis, direction.clone().normalize())
  cone.renderOrder = RENDER_ORDER_LINES
  return cone
}

// ── Marker sphere ─────────────────────────────────────────────────────────────

function createMarkerSphere(
  position: THREE.Vector3,
  color: number,
  size: number
): THREE.Mesh {
  const geo = new THREE.SphereGeometry(size, 12, 8)
  const mat = new THREE.MeshBasicMaterial({ color, depthTest: false })
  const sphere = new THREE.Mesh(geo, mat)
  sphere.position.copy(position)
  sphere.renderOrder = RENDER_ORDER_LINES
  return sphere
}

// ── CSS2D label ───────────────────────────────────────────────────────────────

export function createMeasurementLabel(
  text: string,
  id: string,
  onDelete: (id: string) => void
): CSS2DObject {
  const div = document.createElement('div')
  div.style.cssText = [
    'background: rgba(0,0,0,0.88)',
    'backdrop-filter: blur(4px)',
    'border: 1.5px solid rgba(255,107,0,0.4)',
    'border-radius: 4px',
    'color: #fff',
    'font-family: ui-monospace, "Cascadia Code", "Source Code Pro", monospace',
    'font-size: 12px',
    'font-weight: 600',
    'padding: 3px 7px',
    'display: flex',
    'align-items: center',
    'gap: 5px',
    'pointer-events: auto',
    'user-select: none',
    'white-space: nowrap',
  ].join(';')

  const textSpan = document.createElement('span')
  textSpan.textContent = text
  div.appendChild(textSpan)

  const btn = document.createElement('button')
  btn.textContent = '×'
  btn.style.cssText = [
    'background: none',
    'border: none',
    'color: rgba(255,255,255,0.6)',
    'cursor: pointer',
    'font-size: 14px',
    'line-height: 1',
    'padding: 0',
    'display: flex',
    'align-items: center',
  ].join(';')
  btn.addEventListener('click', e => {
    e.stopPropagation()
    onDelete(id)
  })
  div.appendChild(btn)

  const obj = new CSS2DObject(div)
  obj.renderOrder = RENDER_ORDER_LABELS
  return obj
}

// ── Preview line (while picking second point) ─────────────────────────────────

export function createPreviewLine(color = COLORS.linePointToPoint): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(),
  ])
  const material = new THREE.LineDashedMaterial({
    color,
    dashSize: 0.015,
    gapSize:  0.01,
    scale:    40,
    depthTest: false,
    transparent: true,
    opacity: 0.55,
  })
  const line = new THREE.Line(geometry, material)
  line.computeLineDistances()
  line.renderOrder = RENDER_ORDER_LINES
  line.visible = false
  return line
}

export function updatePreviewLine(
  line: THREE.Line,
  from: THREE.Vector3,
  to: THREE.Vector3
): void {
  const pos = line.geometry.getAttribute('position') as THREE.BufferAttribute
  pos.setXYZ(0, from.x, from.y, from.z)
  pos.setXYZ(1, to.x, to.y, to.z)
  pos.needsUpdate = true
  line.computeLineDistances()
  line.visible = true
}

// ── Face highlight overlay ────────────────────────────────────────────────────

export function createFaceHighlight(
  geometry: THREE.BufferGeometry,
  faceIndices: number[],
  mesh: THREE.Mesh,
  color: number
): THREE.Mesh {
  const indexAttr = geometry.getIndex()
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute

  const positions: number[] = []
  for (const fi of faceIndices) {
    for (let k = 0; k < 3; k++) {
      const vi = indexAttr ? indexAttr.getX(fi * 3 + k) : fi * 3 + k
      positions.push(posAttr.getX(vi), posAttr.getY(vi), posAttr.getZ(vi))
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.computeVertexNormals()

  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.28,
    depthTest: true,
    side: THREE.DoubleSide,
  })

  const highlightMesh = new THREE.Mesh(geo, mat)
  highlightMesh.matrixWorld.copy(mesh.matrixWorld)
  highlightMesh.matrixAutoUpdate = false
  highlightMesh.renderOrder = 1
  return highlightMesh
}

// ── Compute marker scale from model diagonal ──────────────────────────────────

function markerScale(diag: number): number {
  const base = diag * 0.008
  return Math.max(base, 0.003) // minimum 3mm in world units
}

// ── Point-to-point annotation ─────────────────────────────────────────────────

function buildPointToPointAnnotation(
  result: PointToPointResult,
  onDelete: (id: string) => void,
  diag: number
): THREE.Group {
  const group = new THREE.Group()
  group.userData.measurementId = result.id

  const ms = markerScale(diag)
  const line = createDashedLine(result.pointA, result.pointB, COLORS.linePointToPoint)
  group.add(line)

  group.add(createMarkerSphere(result.pointA, COLORS.measurementMarker, ms))
  group.add(createMarkerSphere(result.pointB, COLORS.measurementMarker, ms))

  const mid = result.pointA.clone().lerp(result.pointB, 0.5)
  const label = createMeasurementLabel(`${result.distance.toFixed(2)} mm`, result.id, onDelete)
  label.position.copy(mid)
  group.add(label)

  return group
}

// ── Face distance annotation ──────────────────────────────────────────────────

function buildFaceDistanceAnnotation(
  result: FaceDistanceResult,
  onDelete: (id: string) => void,
  diag: number
): THREE.Group {
  const group = new THREE.Group()
  group.userData.measurementId = result.id

  const ms = markerScale(diag)
  const line = createDashedLine(result.centroidA, result.centroidB, COLORS.lineFaceDistance)
  group.add(line)

  const dir = result.centroidB.clone().sub(result.centroidA).normalize()
  const arrowSize = ms * 3
  group.add(createArrow(result.centroidA, dir.clone().negate(), COLORS.lineFaceDistance, arrowSize))
  group.add(createArrow(result.centroidB, dir, COLORS.lineFaceDistance, arrowSize))

  const mid = result.centroidA.clone().lerp(result.centroidB, 0.5)
  const parallelText = result.parallel ? 'evenwijdig' : 'schuin'
  const label = createMeasurementLabel(
    `${result.distance.toFixed(2)} mm  (${parallelText})`,
    result.id,
    onDelete
  )
  label.position.copy(mid)
  group.add(label)

  return group
}

// ── Face angle annotation ─────────────────────────────────────────────────────

function buildFaceAngleAnnotation(
  result: FaceAngleResult,
  onDelete: (id: string) => void,
  diag: number
): THREE.Group {
  const group = new THREE.Group()
  group.userData.measurementId = result.id

  const ms = markerScale(diag)
  const normalLen = ms * 15

  // Draw normal indicator lines from each face centroid
  const endA = result.centroidA.clone().addScaledVector(result.normalA, normalLen)
  const endB = result.centroidB.clone().addScaledVector(result.normalB, normalLen)

  group.add(createSolidLine(result.centroidA, endA, COLORS.lineFaceAngle))
  group.add(createSolidLine(result.centroidB, endB, COLORS.lineFaceAngle))

  // Arc between normal tips
  const arcPoints: THREE.Vector3[] = []
  for (let i = 0; i <= 16; i++) {
    const t = i / 16
    const interp = result.normalA.clone().lerp(result.normalB, t).normalize()
    const arcPt = result.centroidA.clone().addScaledVector(interp, normalLen * 0.8)
    arcPoints.push(arcPt)
  }
  const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints)
  const arcMat = new THREE.LineBasicMaterial({
    color: COLORS.lineFaceAngle,
    depthTest: false,
    transparent: true,
    opacity: 0.7,
  })
  const arc = new THREE.Line(arcGeo, arcMat)
  arc.renderOrder = RENDER_ORDER_LINES
  group.add(arc)

  // Marker dots at centroids
  group.add(createMarkerSphere(result.centroidA, COLORS.lineFaceAngle, ms))
  group.add(createMarkerSphere(result.centroidB, COLORS.lineFaceAngle, ms))

  const mid = result.centroidA.clone().lerp(result.centroidB, 0.5)
  const label = createMeasurementLabel(
    `∠ ${result.includedAngleDeg.toFixed(1)}°  buig ${result.bendAngleDeg.toFixed(1)}°`,
    result.id,
    onDelete
  )
  label.position.copy(mid)
  group.add(label)

  return group
}

// ── Radius annotation ─────────────────────────────────────────────────────────

function buildRadiusAnnotation(
  result: RadiusResult,
  onDelete: (id: string) => void,
  diag: number
): THREE.Group {
  const group = new THREE.Group()
  group.userData.measurementId = result.id

  const ms = markerScale(diag)
  group.add(createMarkerSphere(result.center, COLORS.lineRadius, ms * 1.4))

  const label = createMeasurementLabel(
    `R ${result.radius.toFixed(2)} mm  Ø ${result.diameter.toFixed(2)} mm`,
    result.id,
    onDelete
  )
  label.position.copy(result.center)
  group.add(label)

  return group
}

// ── Public dispatch ───────────────────────────────────────────────────────────

export function createMeasurementAnnotation(
  result: MeasurementResult,
  onDelete: (id: string) => void,
  diag: number
): THREE.Group {
  switch (result.kind) {
    case 'point-to-point': return buildPointToPointAnnotation(result, onDelete, diag)
    case 'face-distance':  return buildFaceDistanceAnnotation(result, onDelete, diag)
    case 'face-angle':     return buildFaceAngleAnnotation(result, onDelete, diag)
    case 'radius':         return buildRadiusAnnotation(result, onDelete, diag)
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

export function disposeAnnotationGroup(group: THREE.Group): void {
  group.traverse(obj => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh
      mesh.geometry?.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose())
      } else {
        mesh.material?.dispose()
      }
    }
    if ((obj as THREE.Line).isLine) {
      const line = obj as THREE.Line
      line.geometry?.dispose()
      if (Array.isArray(line.material)) {
        line.material.forEach(m => m.dispose())
      } else {
        line.material?.dispose()
      }
    }
    if (obj instanceof CSS2DObject) {
      obj.element.remove()
    }
  })
}

// Export snap colors for use in the picker
export { COLORS }

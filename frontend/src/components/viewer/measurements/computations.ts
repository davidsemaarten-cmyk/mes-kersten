import * as THREE from 'three'
import type { FaceDistanceResult, FaceAngleResult, RadiusResult } from './types'

// ── Constants ─────────────────────────────────────────────────────────────────

const PARALLEL_THRESHOLD = Math.cos((5 * Math.PI) / 180) // cos(5°) ≈ 0.9962

// ── Point-to-point ────────────────────────────────────────────────────────────

export function computePointToPoint(a: THREE.Vector3, b: THREE.Vector3): number {
  return a.distanceTo(b)
}

// ── Face distance ─────────────────────────────────────────────────────────────

/**
 * For parallel faces: projects the vector between centroids onto the normal.
 * For non-parallel: returns euclidean distance between centroids.
 */
export function computeFaceDistance(
  centroidA: THREE.Vector3,
  normalA: THREE.Vector3,
  centroidB: THREE.Vector3,
  normalB: THREE.Vector3
): Omit<FaceDistanceResult, 'kind' | 'id' | 'centroidA' | 'centroidB' | 'normalA' | 'normalB'> {
  const dot = Math.abs(normalA.dot(normalB))
  const parallel = dot >= PARALLEL_THRESHOLD

  let distance: number
  if (parallel) {
    const delta = centroidB.clone().sub(centroidA)
    distance = Math.abs(delta.dot(normalA))
  } else {
    distance = centroidA.distanceTo(centroidB)
  }

  return { distance, parallel }
}

// ── Face angle ────────────────────────────────────────────────────────────────

export function computeFaceAngle(
  normalA: THREE.Vector3,
  normalB: THREE.Vector3
): Omit<FaceAngleResult, 'kind' | 'id' | 'centroidA' | 'centroidB' | 'normalA' | 'normalB'> {
  const dot = THREE.MathUtils.clamp(normalA.dot(normalB), -1, 1)
  const includedAngleDeg = (Math.acos(dot) * 180) / Math.PI
  const bendAngleDeg = 180 - includedAngleDeg
  return { includedAngleDeg, bendAngleDeg }
}

// ── Flood fill coplanar faces ─────────────────────────────────────────────────

/**
 * BFS flood fill over triangles sharing vertices with similar normals.
 * Returns an array of face indices (triangle indices).
 */
export function floodFillCoplanarFaces(
  geometry: THREE.BufferGeometry,
  startFaceIndex: number,
  thresholdDeg = 5
): number[] {
  const threshold = Math.cos((thresholdDeg * Math.PI) / 180)
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
  const normalAttr = geometry.getAttribute('normal') as THREE.BufferAttribute
  const indexAttr = geometry.getIndex()

  if (!posAttr || !normalAttr) return [startFaceIndex]

  const faceCount = indexAttr ? indexAttr.count / 3 : posAttr.count / 3
  if (startFaceIndex >= faceCount) return [startFaceIndex]

  function getFaceVertexIndices(fi: number): [number, number, number] {
    if (indexAttr) {
      return [
        indexAttr.getX(fi * 3),
        indexAttr.getX(fi * 3 + 1),
        indexAttr.getX(fi * 3 + 2),
      ]
    }
    return [fi * 3, fi * 3 + 1, fi * 3 + 2]
  }

  function getFaceNormal(fi: number): THREE.Vector3 {
    const [a, b, c] = getFaceVertexIndices(fi)
    const na = new THREE.Vector3(normalAttr.getX(a), normalAttr.getY(a), normalAttr.getZ(a))
    const nb = new THREE.Vector3(normalAttr.getX(b), normalAttr.getY(b), normalAttr.getZ(b))
    const nc = new THREE.Vector3(normalAttr.getX(c), normalAttr.getY(c), normalAttr.getZ(c))
    return na.add(nb).add(nc).normalize()
  }

  // Build vertex → faces map
  const vertexToFaces = new Map<number, number[]>()
  for (let fi = 0; fi < faceCount; fi++) {
    const [a, b, c] = getFaceVertexIndices(fi)
    for (const v of [a, b, c]) {
      if (!vertexToFaces.has(v)) vertexToFaces.set(v, [])
      vertexToFaces.get(v)!.push(fi)
    }
  }

  const startNormal = getFaceNormal(startFaceIndex)
  const visited = new Set<number>()
  const queue = [startFaceIndex]
  visited.add(startFaceIndex)

  while (queue.length > 0) {
    const current = queue.shift()!
    const [a, b, c] = getFaceVertexIndices(current)

    const neighbors = new Set<number>()
    for (const v of [a, b, c]) {
      for (const nf of vertexToFaces.get(v) ?? []) {
        neighbors.add(nf)
      }
    }

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue
      const neighborNormal = getFaceNormal(neighbor)
      if (Math.abs(startNormal.dot(neighborNormal)) >= threshold) {
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }
  }

  return Array.from(visited)
}

// ── Face group info (world space) ─────────────────────────────────────────────

export function computeFaceGroupInfo(
  geometry: THREE.BufferGeometry,
  faceIndices: number[],
  mesh: THREE.Mesh
): { centroid: THREE.Vector3; normal: THREE.Vector3 } {
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
  const normalAttr = geometry.getAttribute('normal') as THREE.BufferAttribute
  const indexAttr = geometry.getIndex()

  const centroid = new THREE.Vector3()
  const normal = new THREE.Vector3()
  let count = 0

  for (const fi of faceIndices) {
    for (let k = 0; k < 3; k++) {
      const vi = indexAttr ? indexAttr.getX(fi * 3 + k) : fi * 3 + k
      centroid.add(new THREE.Vector3(posAttr.getX(vi), posAttr.getY(vi), posAttr.getZ(vi)))
      normal.add(new THREE.Vector3(normalAttr.getX(vi), normalAttr.getY(vi), normalAttr.getZ(vi)))
      count++
    }
  }

  if (count > 0) {
    centroid.divideScalar(count)
    normal.normalize()
  }

  centroid.applyMatrix4(mesh.matrixWorld)
  normal.transformDirection(mesh.matrixWorld)

  return { centroid, normal }
}

// ── Collect face group points ─────────────────────────────────────────────────

export function collectFaceGroupPoints(
  geometry: THREE.BufferGeometry,
  faceIndices: number[],
  mesh: THREE.Mesh
): { positions: THREE.Vector3[]; normals: THREE.Vector3[] } {
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
  const normalAttr = geometry.getAttribute('normal') as THREE.BufferAttribute
  const indexAttr = geometry.getIndex()

  const seenKeys = new Set<string>()
  const positions: THREE.Vector3[] = []
  const normals: THREE.Vector3[] = []

  for (const fi of faceIndices) {
    for (let k = 0; k < 3; k++) {
      const vi = indexAttr ? indexAttr.getX(fi * 3 + k) : fi * 3 + k
      const px = posAttr.getX(vi)
      const py = posAttr.getY(vi)
      const pz = posAttr.getZ(vi)
      const key = `${px.toFixed(6)},${py.toFixed(6)},${pz.toFixed(6)}`

      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        const p = new THREE.Vector3(px, py, pz)
        p.applyMatrix4(mesh.matrixWorld)
        positions.push(p)

        const n = new THREE.Vector3(
          normalAttr.getX(vi),
          normalAttr.getY(vi),
          normalAttr.getZ(vi)
        )
        n.transformDirection(mesh.matrixWorld)
        normals.push(n)
      }
    }
  }

  return { positions, normals }
}

// ── Circle fit (Kasa algebraic) ───────────────────────────────────────────────

/**
 * Fits a circle to 3D points on a cylindrical surface.
 * Projects to a local 2D plane perpendicular to the average normal,
 * then uses Kasa's algebraic least-squares method.
 *
 * Returns null when fitting fails or the surface is flat.
 */
export function fitCircleToPoints(
  positions: THREE.Vector3[],
  normals: THREE.Vector3[]
): Omit<RadiusResult, 'kind' | 'id'> | null {
  if (positions.length < 6) return null

  // Average normal — if all the same, it's a flat surface
  const avgNormal = new THREE.Vector3()
  for (const n of normals) avgNormal.add(n)
  avgNormal.normalize()

  let normalVariance = 0
  for (const n of normals) {
    normalVariance += 1 - Math.abs(avgNormal.dot(n))
  }
  normalVariance /= normals.length

  if (normalVariance < 0.01) return null // flat surface

  // Build local 2D frame
  const up = Math.abs(avgNormal.y) < 0.9
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0)
  const localX = new THREE.Vector3().crossVectors(up, avgNormal).normalize()
  const localY = new THREE.Vector3().crossVectors(avgNormal, localX).normalize()

  // Centroid for numerical stability
  const centroid3d = new THREE.Vector3()
  for (const p of positions) centroid3d.add(p)
  centroid3d.divideScalar(positions.length)

  // Project to 2D
  const pts2d: [number, number][] = positions.map(p => {
    const d = p.clone().sub(centroid3d)
    return [d.dot(localX), d.dot(localY)]
  })

  // Kasa method: fit x²+y²+Ax+By+C=0
  // Normal equations: [Σx²  Σxy  Σx ] [A]   [-Σ(x³+xy²)]
  //                   [Σxy  Σy²  Σy ] [B] = [-Σ(x²y+y³)]
  //                   [Σx   Σy   n  ] [C]   [-Σ(x²+y²) ]
  let Sx = 0, Sy = 0, Sx2 = 0, Sy2 = 0, Sxy = 0
  let Sx3 = 0, Sy3 = 0, Sx2y = 0, Sxy2 = 0

  for (const [x, y] of pts2d) {
    const x2 = x * x, y2 = y * y
    Sx += x;  Sy += y
    Sx2 += x2; Sy2 += y2; Sxy += x * y
    Sx3 += x2 * x; Sy3 += y2 * y
    Sx2y += x2 * y; Sxy2 += x * y2
  }
  const N = pts2d.length

  // 3x3 system via Cramer's rule
  const m00 = Sx2, m01 = Sxy, m02 = Sx
  const m10 = Sxy, m11 = Sy2, m12 = Sy
  const m20 = Sx,  m21 = Sy,  m22 = N

  const det =
    m00 * (m11 * m22 - m12 * m21) -
    m01 * (m10 * m22 - m12 * m20) +
    m02 * (m10 * m21 - m11 * m20)

  if (Math.abs(det) < 1e-10) return null

  const r0 = -(Sx3 + Sxy2)
  const r1 = -(Sx2y + Sy3)
  const r2 = -(Sx2 + Sy2)

  const A =
    (r0 * (m11 * m22 - m12 * m21) -
     m01 * (r1 * m22 - m12 * r2) +
     m02 * (r1 * m21 - m11 * r2)) / det

  const B =
    (m00 * (r1 * m22 - m12 * r2) -
     r0 * (m10 * m22 - m12 * m20) +
     m02 * (m10 * r2 - r1 * m20)) / det

  // Center in 2D
  const cx = -A / 2
  const cy = -B / 2

  // Radius as mean distance from center to all points (robust)
  let sumR = 0
  for (const [x, y] of pts2d) {
    sumR += Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
  }
  const fitRadius = sumR / N

  if (!isFinite(fitRadius) || fitRadius <= 0) return null

  // Reject if radius > 10x the point cloud extent (probably flat)
  let maxDist = 0
  for (const [x, y] of pts2d) {
    maxDist = Math.max(maxDist, Math.sqrt(x * x + y * y))
  }
  if (maxDist > 0 && fitRadius > 10 * maxDist) return null

  // Confidence: 1 - avg_residual / radius
  let sumResidual = 0
  for (const [x, y] of pts2d) {
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    sumResidual += Math.abs(dist - fitRadius)
  }
  const confidence = Math.max(0, 1 - sumResidual / N / fitRadius)

  if (confidence < 0.3) return null

  // Back-project center to 3D
  const center = centroid3d.clone()
    .addScaledVector(localX, cx)
    .addScaledVector(localY, cy)

  return {
    center,
    radius: fitRadius,
    diameter: fitRadius * 2,
    confidence,
  }
}

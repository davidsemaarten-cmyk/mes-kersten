import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { SnapTarget, ViewerRefs } from './types'
import { COLORS } from './annotations'

// ── Constants ─────────────────────────────────────────────────────────────────

const VERTEX_SNAP_PX = 8
const EDGE_SNAP_PX   = 6
const CLICK_MAX_MS   = 200
const CLICK_MAX_PX   = 5

// ── Geometry helpers ─────────────────────────────────────────────────────────

function closestPointOnSegment(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
  const ab = b.clone().sub(a)
  const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()))
  return a.clone().addScaledVector(ab, t)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseRaycastPickerOptions {
  viewerRefs: ViewerRefs | null
  active: boolean
  onHover: (snap: SnapTarget | null) => void
  onClick: (snap: SnapTarget) => void
}

export function useRaycastPicker({
  viewerRefs,
  active,
  onHover,
  onClick,
}: UseRaycastPickerOptions): void {
  const snapIndicatorRef = useRef<THREE.Mesh | null>(null)
  const pointerDownInfoRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const lastSnapRef = useRef<SnapTarget | null>(undefined as any)

  // Create / destroy snap indicator sphere
  useEffect(() => {
    if (!viewerRefs) return

    const box = new THREE.Box3()
    for (const m of viewerRefs.meshes) box.expandByObject(m)
    const size = new THREE.Vector3()
    box.getSize(size)
    const diagonal = size.length()
    const indicatorSize = Math.max(diagonal * 0.006, 0.003)

    const geo = new THREE.SphereGeometry(indicatorSize, 10, 7)
    const mat = new THREE.MeshBasicMaterial({
      color: COLORS.snapFace,
      depthTest: false,
      transparent: true,
      opacity: 0.85,
    })
    const indicator = new THREE.Mesh(geo, mat)
    indicator.renderOrder = 999
    indicator.visible = false
    viewerRefs.scene.add(indicator)
    snapIndicatorRef.current = indicator

    return () => {
      viewerRefs.scene.remove(indicator)
      geo.dispose()
      mat.dispose()
      snapIndicatorRef.current = null
    }
  }, [viewerRefs])

  // Attach / detach event listeners
  useEffect(() => {
    if (!viewerRefs || !active) {
      // Hide indicator when not active
      if (snapIndicatorRef.current) {
        snapIndicatorRef.current.visible = false
      }
      return
    }

    const { camera, meshes, renderer } = viewerRefs
    const canvas = renderer.domElement
    const raycaster = new THREE.Raycaster()
    raycaster.params.Line = { threshold: 0.01 }

    function getCanvasCoords(e: PointerEvent, rect: DOMRect): THREE.Vector2 {
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      )
    }

    function screenDistance(
      pos3d: THREE.Vector3,
      screenX: number,
      screenY: number,
      rect: DOMRect
    ): number {
      const ndc = pos3d.clone().project(camera)
      const sx = ((ndc.x + 1) / 2) * rect.width
      const sy = ((1 - ndc.y) / 2) * rect.height
      return Math.sqrt((sx - screenX) ** 2 + (sy - screenY) ** 2)
    }

    function castRay(ndcCoords: THREE.Vector2, rect: DOMRect): SnapTarget | null {
      raycaster.setFromCamera(ndcCoords, camera)
      const hits = raycaster.intersectObjects(meshes, false)
      if (hits.length === 0) return null

      const hit = hits[0]
      const mesh = hit.object as THREE.Mesh
      const faceIndex = hit.faceIndex ?? 0
      const geometry = mesh.geometry

      if (!geometry) return null

      const clientX = ((ndcCoords.x + 1) / 2) * rect.width
      const clientY = ((1 - ndcCoords.y) / 2) * rect.height

      const indexAttr = geometry.getIndex()
      const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
      const normalAttr = geometry.getAttribute('normal') as THREE.BufferAttribute

      if (!posAttr) {
        return {
          point: hit.point,
          type: 'face',
          mesh,
          faceIndex,
          normal: hit.face?.normal.clone().transformDirection(mesh.matrixWorld)
            ?? new THREE.Vector3(0, 1, 0),
        }
      }

      // Get triangle vertices
      const getFaceVertexIndices = (fi: number): [number, number, number] => {
        if (indexAttr) {
          return [
            indexAttr.getX(fi * 3),
            indexAttr.getX(fi * 3 + 1),
            indexAttr.getX(fi * 3 + 2),
          ]
        }
        return [fi * 3, fi * 3 + 1, fi * 3 + 2]
      }

      const [va, vb, vc] = getFaceVertexIndices(faceIndex)
      const verts = [va, vb, vc].map(vi => {
        const lp = new THREE.Vector3(posAttr.getX(vi), posAttr.getY(vi), posAttr.getZ(vi))
        return lp.applyMatrix4(mesh.matrixWorld)
      })

      // Face normal
      let faceNormal = new THREE.Vector3()
      if (normalAttr) {
        const [na, nb, nc] = [va, vb, vc].map(vi =>
          new THREE.Vector3(normalAttr.getX(vi), normalAttr.getY(vi), normalAttr.getZ(vi))
        )
        faceNormal = na.add(nb).add(nc).normalize().transformDirection(mesh.matrixWorld)
      } else {
        faceNormal = hit.face?.normal.clone().transformDirection(mesh.matrixWorld)
          ?? new THREE.Vector3(0, 1, 0)
      }

      // Try vertex snap
      let bestVertDist = VERTEX_SNAP_PX
      let bestVert: THREE.Vector3 | null = null
      for (const v of verts) {
        const d = screenDistance(v, clientX, clientY, rect)
        if (d < bestVertDist) {
          bestVertDist = d
          bestVert = v
        }
      }
      if (bestVert) {
        updateIndicator(bestVert, COLORS.snapVertex)
        return { point: bestVert, type: 'vertex', mesh, faceIndex, normal: faceNormal }
      }

      // Try edge snap
      const edges: [THREE.Vector3, THREE.Vector3][] = [
        [verts[0], verts[1]],
        [verts[1], verts[2]],
        [verts[2], verts[0]],
      ]
      let bestEdgeDist = EDGE_SNAP_PX
      let bestEdgePt: THREE.Vector3 | null = null
      for (const [p1, p2] of edges) {
        // Analytically find closest point on edge segment to hit point
        const candidate = closestPointOnSegment(hit.point, p1, p2)
        const d = screenDistance(candidate, clientX, clientY, rect)
        if (d < bestEdgeDist) {
          bestEdgeDist = d
          bestEdgePt = candidate
        }
      }
      if (bestEdgePt) {
        updateIndicator(bestEdgePt, COLORS.snapEdge)
        return { point: bestEdgePt, type: 'edge', mesh, faceIndex, normal: faceNormal }
      }

      // Face snap
      updateIndicator(hit.point, COLORS.snapFace)
      return { point: hit.point.clone(), type: 'face', mesh, faceIndex, normal: faceNormal }
    }

    function updateIndicator(pos: THREE.Vector3, color: number): void {
      const indicator = snapIndicatorRef.current
      if (!indicator) return
      indicator.position.copy(pos)
      indicator.visible = true
      ;(indicator.material as THREE.MeshBasicMaterial).color.setHex(color)
    }

    function hideIndicator(): void {
      if (snapIndicatorRef.current) {
        snapIndicatorRef.current.visible = false
      }
    }

    function onPointerMove(e: PointerEvent): void {
      const rect = canvas.getBoundingClientRect()
      const ndc = getCanvasCoords(e, rect)
      const result = castRay(ndc, rect)
      if (!result) hideIndicator()
      if (result === null && lastSnapRef.current === null) return
      lastSnapRef.current = result
      onHover(result)
    }

    function onPointerDown(e: PointerEvent): void {
      pointerDownInfoRef.current = { x: e.clientX, y: e.clientY, time: Date.now() }
    }

    function onPointerUp(e: PointerEvent): void {
      const info = pointerDownInfoRef.current
      pointerDownInfoRef.current = null
      if (!info) return

      const dt = Date.now() - info.time
      const dx = Math.abs(e.clientX - info.x)
      const dy = Math.abs(e.clientY - info.y)
      const moved = Math.sqrt(dx * dx + dy * dy)

      if (dt > CLICK_MAX_MS || moved > CLICK_MAX_PX) return

      const rect = canvas.getBoundingClientRect()
      const ndc = getCanvasCoords(e, rect)
      const snap = castRay(ndc, rect)
      if (snap) onClick(snap)
    }

    canvas.style.cursor = 'crosshair'
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)

    return () => {
      canvas.style.cursor = ''
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      hideIndicator()
      onHover(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerRefs, active])
}

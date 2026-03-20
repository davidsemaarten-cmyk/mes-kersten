import { useState, useRef, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import type {
  MeasurementMode,
  MeasurementPhase,
  MeasurementResult,
  SnapTarget,
  ViewerRefs,
} from './types'
import {
  computePointToPoint,
  computeFaceDistance,
  computeFaceAngle,
  fitCircleToPoints,
  floodFillCoplanarFaces,
  computeFaceGroupInfo,
  collectFaceGroupPoints,
  COPLANAR_THRESHOLD_DEG,
  CYLINDER_THRESHOLD_DEG,
} from './computations'
import {
  createMeasurementAnnotation,
  disposeAnnotationGroup,
  createPreviewLine,
  updatePreviewLine,
  createFaceHighlight,
} from './annotations'
import { useRaycastPicker } from './useRaycastPicker'

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseMeasurementsReturn {
  mode: MeasurementMode
  phase: MeasurementPhase
  results: MeasurementResult[]
  activateMode: (mode: MeasurementMode) => void
  clearAll: () => void
  deleteResult: (id: string) => void
}

export function useMeasurements(viewerRefs: ViewerRefs | null): UseMeasurementsReturn {
  // ── State ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<MeasurementMode>('none')
  const [phase, setPhase] = useState<MeasurementPhase>('idle')
  const [results, setResults] = useState<MeasurementResult[]>([])

  // ── Refs (mutable scene objects) ──────────────────────────────────────────
  const annotationGroupRef = useRef<THREE.Group | null>(null)
  const previewLineRef      = useRef<THREE.Line | null>(null)
  const faceHighlightRef    = useRef<THREE.Mesh | null>(null)

  // Pending first-pick data
  const pendingSnapRef         = useRef<SnapTarget | null>(null)
  const pendingFaceIndicesRef  = useRef<number[]>([])
  const pendingFaceInfoRef     = useRef<{ centroid: THREE.Vector3; normal: THREE.Vector3 } | null>(null)

  // Keep a ref to mode/phase for use in stable callbacks
  const modeRef  = useRef(mode)
  const phaseRef = useRef(phase)
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { phaseRef.current = phase }, [phase])

  // ── Scene init / cleanup ──────────────────────────────────────────────────
  useEffect(() => {
    if (!viewerRefs) return

    // Top-level annotation group
    const group = new THREE.Group()
    group.name = 'measurements'
    viewerRefs.scene.add(group)
    annotationGroupRef.current = group

    // Preview line
    const previewLine = createPreviewLine()
    viewerRefs.scene.add(previewLine)
    previewLineRef.current = previewLine

    return () => {
      // Clean up all annotations
      if (annotationGroupRef.current) {
        annotationGroupRef.current.children.forEach(child => {
          disposeAnnotationGroup(child as THREE.Group)
        })
        viewerRefs.scene.remove(annotationGroupRef.current)
        annotationGroupRef.current = null
      }
      if (previewLineRef.current) {
        previewLineRef.current.geometry.dispose()
        ;(previewLineRef.current.material as THREE.Material).dispose()
        viewerRefs.scene.remove(previewLineRef.current)
        previewLineRef.current = null
      }
      removeFaceHighlight(viewerRefs)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerRefs])

  // ── Helpers ───────────────────────────────────────────────────────────────

  function removeFaceHighlight(refs: ViewerRefs): void {
    if (faceHighlightRef.current) {
      refs.scene.remove(faceHighlightRef.current)
      faceHighlightRef.current.geometry.dispose()
      ;(faceHighlightRef.current.material as THREE.Material).dispose()
      faceHighlightRef.current = null
    }
  }

  function resetPending(): void {
    pendingSnapRef.current = null
    pendingFaceIndicesRef.current = []
    pendingFaceInfoRef.current = null
    if (previewLineRef.current) previewLineRef.current.visible = false
    if (viewerRefs) removeFaceHighlight(viewerRefs)
  }

  function addResult(result: MeasurementResult): void {
    setResults(prev => [...prev, result])
    if (annotationGroupRef.current && viewerRefs) {
      const annotation = createMeasurementAnnotation(
        result,
        (id) => deleteResultCallback(id),
        viewerRefs.modelDiagonal
      )
      annotationGroupRef.current.add(annotation)
    }
  }

  // Stable callback for label delete buttons
  const deleteResultCallback = useCallback((id: string) => {
    setResults(prev => prev.filter(r => r.id !== id))
    if (annotationGroupRef.current) {
      const child = annotationGroupRef.current.children.find(
        c => c.userData.measurementId === id
      ) as THREE.Group | undefined
      if (child) {
        disposeAnnotationGroup(child)
        annotationGroupRef.current.remove(child)
      }
    }
  }, [])

  // ── Mode activation ───────────────────────────────────────────────────────

  const activateMode = useCallback((newMode: MeasurementMode) => {
    setMode(prev => {
      const next = prev === newMode ? 'none' : newMode
      return next
    })
    setPhase('idle')
    resetPending()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Click handler ─────────────────────────────────────────────────────────

  const handleMeasurementClick = useCallback((snap: SnapTarget) => {
    const currentMode  = modeRef.current
    const currentPhase = phaseRef.current

    if (currentMode === 'none') return

    // ── Point-to-point ──────────────────────────────────────────────────────
    if (currentMode === 'point-to-point') {
      if (currentPhase === 'idle' || currentPhase === 'picking_first') {
        pendingSnapRef.current = snap
        setPhase('picking_second')
        return
      }
      if (currentPhase === 'picking_second' && pendingSnapRef.current) {
        const distance = computePointToPoint(pendingSnapRef.current.point, snap.point)
        addResult({
          kind: 'point-to-point',
          id: generateId(),
          pointA: pendingSnapRef.current.point.clone(),
          pointB: snap.point.clone(),
          distance,
        })
        resetPending()
        setPhase('picking_first')
        return
      }
    }

    // ── Face distance ───────────────────────────────────────────────────────
    if (currentMode === 'face-distance') {
      if (currentPhase === 'idle' || currentPhase === 'picking_first') {
        const faceIndices = floodFillCoplanarFaces(snap.mesh.geometry, snap.faceIndex, COPLANAR_THRESHOLD_DEG)
        const faceInfo = computeFaceGroupInfo(snap.mesh.geometry, faceIndices, snap.mesh)

        pendingFaceIndicesRef.current = faceIndices
        pendingFaceInfoRef.current = faceInfo
        pendingSnapRef.current = snap

        // Highlight selected face
        if (viewerRefs) {
          removeFaceHighlight(viewerRefs)
          const highlight = createFaceHighlight(
            snap.mesh.geometry, faceIndices, snap.mesh, 0x00e676
          )
          viewerRefs.scene.add(highlight)
          faceHighlightRef.current = highlight
        }

        setPhase('picking_second')
        return
      }
      if (currentPhase === 'picking_second' && pendingFaceInfoRef.current) {
        const faceIndicesB = floodFillCoplanarFaces(snap.mesh.geometry, snap.faceIndex, COPLANAR_THRESHOLD_DEG)
        const faceInfoB = computeFaceGroupInfo(snap.mesh.geometry, faceIndicesB, snap.mesh)
        const prev = pendingFaceInfoRef.current

        const { distance, parallel } = computeFaceDistance(
          prev.centroid, prev.normal,
          faceInfoB.centroid, faceInfoB.normal
        )
        addResult({
          kind: 'face-distance',
          id: generateId(),
          centroidA: prev.centroid.clone(),
          centroidB: faceInfoB.centroid.clone(),
          normalA: prev.normal.clone(),
          normalB: faceInfoB.normal.clone(),
          distance,
          parallel,
        })
        resetPending()
        setPhase('picking_first')
        return
      }
    }

    // ── Face angle ──────────────────────────────────────────────────────────
    if (currentMode === 'face-angle') {
      if (currentPhase === 'idle' || currentPhase === 'picking_first') {
        const faceIndices = floodFillCoplanarFaces(snap.mesh.geometry, snap.faceIndex, COPLANAR_THRESHOLD_DEG)
        const faceInfo = computeFaceGroupInfo(snap.mesh.geometry, faceIndices, snap.mesh)

        pendingFaceIndicesRef.current = faceIndices
        pendingFaceInfoRef.current = faceInfo
        pendingSnapRef.current = snap

        if (viewerRefs) {
          removeFaceHighlight(viewerRefs)
          const highlight = createFaceHighlight(
            snap.mesh.geometry, faceIndices, snap.mesh, 0xffd600
          )
          viewerRefs.scene.add(highlight)
          faceHighlightRef.current = highlight
        }

        setPhase('picking_second')
        return
      }
      if (currentPhase === 'picking_second' && pendingFaceInfoRef.current) {
        const faceIndicesB = floodFillCoplanarFaces(snap.mesh.geometry, snap.faceIndex, COPLANAR_THRESHOLD_DEG)
        const faceInfoB = computeFaceGroupInfo(snap.mesh.geometry, faceIndicesB, snap.mesh)
        const prev = pendingFaceInfoRef.current

        const { includedAngleDeg, bendAngleDeg } = computeFaceAngle(prev.normal, faceInfoB.normal)
        addResult({
          kind: 'face-angle',
          id: generateId(),
          centroidA: prev.centroid.clone(),
          centroidB: faceInfoB.centroid.clone(),
          normalA: prev.normal.clone(),
          normalB: faceInfoB.normal.clone(),
          includedAngleDeg,
          bendAngleDeg,
        })
        resetPending()
        setPhase('picking_first')
        return
      }
    }

    // ── Radius ──────────────────────────────────────────────────────────────
    if (currentMode === 'radius') {
      // Single click — flood fill with wider threshold for curved surfaces
      const faceIndices = floodFillCoplanarFaces(snap.mesh.geometry, snap.faceIndex, CYLINDER_THRESHOLD_DEG)
      const { positions, normals } = collectFaceGroupPoints(
        snap.mesh.geometry, faceIndices, snap.mesh
      )
      const circleResult = fitCircleToPoints(positions, normals)

      if (circleResult) {
        addResult({
          kind: 'radius',
          id: generateId(),
          ...circleResult,
        })
      } else {
        console.warn('[Measurements] Circle fit failed — may be a flat or insufficient surface')
      }
      // Stay in same mode for further picks
      setPhase('picking_first')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerRefs])

  // ── Hover handler ─────────────────────────────────────────────────────────

  const handleHover = useCallback((snap: SnapTarget | null) => {
    if (modeRef.current === 'point-to-point' && phaseRef.current === 'picking_second') {
      const pending = pendingSnapRef.current
      if (pending && snap && previewLineRef.current) {
        updatePreviewLine(previewLineRef.current, pending.point, snap.point)
      } else if (previewLineRef.current) {
        previewLineRef.current.visible = false
      }
    }
  }, [])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMode('none')
        setPhase('idle')
        resetPending()
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        // Delete last measurement
        setResults(prev => {
          if (prev.length === 0) return prev
          const last = prev[prev.length - 1]
          deleteResultCallback(last.id)
          return prev.slice(0, -1)
        })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteResultCallback])

  // ── When mode changes, reset phase ───────────────────────────────────────
  useEffect(() => {
    if (mode !== 'none') {
      setPhase('picking_first')
    } else {
      setPhase('idle')
    }
  }, [mode])

  // ── Wire up picker ────────────────────────────────────────────────────────

  useRaycastPicker({
    viewerRefs,
    active: mode !== 'none',
    onHover: handleHover,
    onClick: handleMeasurementClick,
  })

  // ── Public API ────────────────────────────────────────────────────────────

  const clearAll = useCallback(() => {
    setResults([])
    if (annotationGroupRef.current) {
      annotationGroupRef.current.children.slice().forEach(child => {
        disposeAnnotationGroup(child as THREE.Group)
        annotationGroupRef.current!.remove(child)
      })
    }
    resetPending()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const deleteResult = useCallback((id: string) => {
    deleteResultCallback(id)
  }, [deleteResultCallback])

  return { mode, phase, results, activateMode, clearAll, deleteResult }
}

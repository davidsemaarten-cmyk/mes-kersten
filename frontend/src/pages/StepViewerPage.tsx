import { useRef, useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '../components/ui/button'
import { TooltipProvider } from '../components/ui/tooltip'
import { Layout } from '../components/Layout'
import api from '../lib/api'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { installBVH, buildBVHForMeshes, disposeBVHForMeshes } from '../components/viewer/measurements/setupBVH'
import { MeasurementToolbar } from '../components/viewer/measurements/MeasurementToolbar'
import { MeasurementPanel } from '../components/viewer/measurements/MeasurementPanel'
import { useMeasurements } from '../components/viewer/measurements/useMeasurements'
import type { ViewerRefs } from '../components/viewer/measurements/types'

// Install BVH once at module load — safe to call repeatedly
installBVH()

export function StepViewerPage() {
  const { jobId, stepId } = useParams<{ jobId: string; stepId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLDivElement>(null)

  const posnr    = searchParams.get('posnr') ?? ''
  const filename = searchParams.get('file')  ?? `${posnr}.step`

  const [viewerStatus, setViewerStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [viewerRefs, setViewerRefs] = useState<ViewerRefs | null>(null)

  // ── Measurement state ────────────────────────────────────────────────────
  const { mode, phase, results, activateMode, clearAll, deleteResult } =
    useMeasurements(viewerRefs)

  // ── Three.js setup ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!jobId || !stepId || !canvasRef.current) return

    let renderer:    THREE.WebGLRenderer | null = null
    let css2dRenderer: CSS2DRenderer | null = null
    let animFrameId: number | null = null
    let disposed = false
    let loadedMeshes: THREE.Mesh[] = []

    async function loadAndRender() {
      try {
        // Fetch STEP file as binary
        const response = await api.get(
          `/api/laserplanner/jobs/${jobId}/step/${stepId}/download`,
          { responseType: 'arraybuffer', timeout: 60_000 }
        )
        const buffer: ArrayBuffer = response.data

        // Load occt-import-js (WASM, lazy)
        const occtModule = await import('occt-import-js')
        const occt = await occtModule.default({
          locateFile: (name: string) => {
            if (name.endsWith('.wasm')) return '/occt-import-js.wasm'
            return name
          },
        })

        const result = occt.ReadStepFile(new Uint8Array(buffer), null)

        if (disposed || !canvasRef.current) return

        if (!result?.meshes?.length) {
          setErrorMsg('STEP bestand bevat geen meshes of kon niet worden gelezen')
          setViewerStatus('error')
          return
        }

        // ── Scene setup ────────────────────────────────────────────────────
        const scene = new THREE.Scene()
        scene.background = new THREE.Color('#f0f0f0')

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(ambientLight)

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
        dirLight.position.set(5, 10, 5)
        scene.add(dirLight)

        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3)
        dirLight2.position.set(-5, -5, -5)
        scene.add(dirLight2)

        const container = canvasRef.current
        const width  = container.clientWidth
        const height = container.clientHeight

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 10000)
        camera.position.set(0, 0, 5)

        // ── WebGL renderer ─────────────────────────────────────────────────
        renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(width, height)
        renderer.domElement.style.position = 'absolute'
        renderer.domElement.style.top = '0'
        renderer.domElement.style.left = '0'
        container.appendChild(renderer.domElement)

        // ── CSS2D renderer (labels overlay) ───────────────────────────────
        css2dRenderer = new CSS2DRenderer()
        css2dRenderer.setSize(width, height)
        css2dRenderer.domElement.style.position = 'absolute'
        css2dRenderer.domElement.style.top = '0'
        css2dRenderer.domElement.style.left = '0'
        css2dRenderer.domElement.style.pointerEvents = 'none'
        container.appendChild(css2dRenderer.domElement)

        // ── OrbitControls ──────────────────────────────────────────────────
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05

        // ── Convert occt meshes to Three.js ────────────────────────────────
        const allMeshes: THREE.Mesh[] = []
        for (const mesh of result.meshes) {
          const geometry = new THREE.BufferGeometry()

          if (mesh.attributes?.position?.array) {
            geometry.setAttribute(
              'position',
              new THREE.Float32BufferAttribute(mesh.attributes.position.array, 3)
            )
          }
          if (mesh.index?.array) {
            geometry.setIndex(new THREE.Uint32BufferAttribute(mesh.index.array, 1))
          }
          if (mesh.attributes?.normal?.array) {
            geometry.setAttribute(
              'normal',
              new THREE.Float32BufferAttribute(mesh.attributes.normal.array, 3)
            )
          } else {
            geometry.computeVertexNormals()
          }

          const material = new THREE.MeshStandardMaterial({
            color: 0xb8c0cc,
            flatShading: false,
            side: THREE.DoubleSide,
            roughness: 0.4,
            metalness: 0.3,
          })

          const threeMesh = new THREE.Mesh(geometry, material)
          scene.add(threeMesh)
          allMeshes.push(threeMesh)

          // ── Edge lines for contour visibility ─────────────────────────
          const edgesGeo = new THREE.EdgesGeometry(geometry, 15)
          const edgesMat = new THREE.LineBasicMaterial({
            color: 0x1a3a8a,
            depthTest: true,
            transparent: true,
            opacity: 0.35,
          })
          const edges = new THREE.LineSegments(edgesGeo, edgesMat)
          scene.add(edges)
        }

        loadedMeshes = allMeshes

        // Build BVH for fast raycasting
        buildBVHForMeshes(allMeshes)

        // ── Fit camera to model ────────────────────────────────────────────
        const box = new THREE.Box3()
        for (const m of allMeshes) box.expandByObject(m)
        const center = new THREE.Vector3()
        const size   = new THREE.Vector3()
        box.getCenter(center)
        box.getSize(size)

        const maxDim = Math.max(size.x, size.y, size.z)
        const fov    = camera.fov * (Math.PI / 180)
        let distance = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 1.5

        camera.position.copy(center)
        camera.position.z += distance
        camera.near = distance / 100
        camera.far  = distance * 100
        camera.updateProjectionMatrix()
        controls.target.copy(center)
        controls.update()

        // ── Two-level grid ─────────────────────────────────────────────────
        const gridY = box.min.y - size.y * 0.02
        const gridSize = maxDim * 3

        // Minor grid
        const gridMinor = new THREE.GridHelper(gridSize, 40, 0xcccccc, 0xcccccc)
        gridMinor.position.set(center.x, gridY, center.z)
        ;(gridMinor.material as THREE.Material).transparent = true
        ;(gridMinor.material as THREE.Material).opacity = 0.35
        scene.add(gridMinor)

        // Major grid
        const gridMajor = new THREE.GridHelper(gridSize, 8, 0x999999, 0x999999)
        gridMajor.position.set(center.x, gridY, center.z)
        ;(gridMajor.material as THREE.Material).transparent = true
        ;(gridMajor.material as THREE.Material).opacity = 0.55
        scene.add(gridMajor)

        // ── Resize handler ─────────────────────────────────────────────────
        function onResize() {
          if (!renderer || !css2dRenderer || !canvasRef.current) return
          const w = canvasRef.current.clientWidth
          const h = canvasRef.current.clientHeight
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
          css2dRenderer.setSize(w, h)
        }
        window.addEventListener('resize', onResize)

        // ── Animation loop ─────────────────────────────────────────────────
        function animate() {
          if (disposed) return
          animFrameId = requestAnimationFrame(animate)
          controls.update()
          renderer!.render(scene, camera)
          css2dRenderer!.render(scene, camera)
        }
        animate()

        setViewerStatus('ready')

        // ── Expose refs for measurement hooks ──────────────────────────────
        setViewerRefs({
          container,
          scene,
          camera,
          renderer: renderer!,
          css2dRenderer: css2dRenderer!,
          meshes: allMeshes,
          controls,
        })

        // Store cleanup
        ;(canvasRef as any).__cleanupFn = () => {
          window.removeEventListener('resize', onResize)
          disposeBVHForMeshes(allMeshes)
          for (const m of allMeshes) {
            m.geometry.dispose()
            if (Array.isArray(m.material)) {
              m.material.forEach(mat => mat.dispose())
            } else {
              (m.material as THREE.Material).dispose()
            }
          }
          renderer?.dispose()
          if (renderer?.domElement && container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement)
          }
          if (css2dRenderer?.domElement && container.contains(css2dRenderer.domElement)) {
            container.removeChild(css2dRenderer.domElement)
          }
        }
      } catch (err: any) {
        if (!disposed) {
          setErrorMsg(err?.response?.data?.detail ?? 'Fout bij ophalen STEP bestand')
          setViewerStatus('error')
        }
      }
    }

    loadAndRender()

    return () => {
      disposed = true
      setViewerRefs(null)
      if (animFrameId !== null) cancelAnimationFrame(animFrameId)
      const cleanup = (canvasRef as any).__cleanupFn
      if (typeof cleanup === 'function') cleanup()
      loadedMeshes = []
    }
  }, [jobId, stepId])

  function handleBack() {
    if (jobId) {
      navigate(`/laserplanner/${jobId}`)
    } else {
      navigate('/laserplanner')
    }
  }

  return (
    <Layout compact>
      <TooltipProvider>
        <div className="flex flex-col h-full">
          {/* Header bar */}
          <div className="flex items-center gap-3 px-4 h-12 border-b bg-white shrink-0">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Terug naar Laserplanner"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-sm font-medium truncate">{filename}</span>
              {posnr && posnr !== filename.replace(/\.s[t]ep?$/i, '') && (
                <span className="text-xs text-muted-foreground">
                  Posnr: {posnr.toUpperCase()}
                </span>
              )}
            </div>

            {viewerStatus === 'loading' && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Laden...
              </span>
            )}
            {viewerStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                {errorMsg}
              </span>
            )}

            {/* Measurement toolbar — shown once viewer is ready */}
            {viewerStatus === 'ready' && (
              <MeasurementToolbar
                mode={mode}
                phase={phase}
                onModeChange={activateMode}
                onClearAll={clearAll}
                measurementCount={results.length}
              />
            )}
          </div>

          {/* Canvas area — position relative so overlays can be absolute */}
          <div className="relative flex-1 w-full overflow-hidden">
            <div ref={canvasRef} className="absolute inset-0" />

            {/* Measurement results panel */}
            {viewerStatus === 'ready' && (
              <MeasurementPanel results={results} onDelete={deleteResult} />
            )}
          </div>
        </div>
      </TooltipProvider>
    </Layout>
  )
}

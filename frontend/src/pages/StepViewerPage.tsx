import { useRef, useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Layout } from '../components/Layout'
import api from '../lib/api'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export function StepViewerPage() {
  const { jobId, stepId } = useParams<{ jobId: string; stepId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLDivElement>(null)

  const posnr    = searchParams.get('posnr') ?? ''
  const filename = searchParams.get('file')  ?? `${posnr}.step`

  const [viewerStatus, setViewerStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!jobId || !stepId || !canvasRef.current) return

    let renderer: THREE.WebGLRenderer | null = null
    let animFrameId: number | null = null
    let disposed = false

    async function loadAndRender() {
      try {
        // Fetch the STEP file as binary
        const response = await api.get(
          `/api/laserplanner/jobs/${jobId}/step/${stepId}/download`,
          { responseType: 'arraybuffer', timeout: 60_000 }
        )
        const buffer: ArrayBuffer = response.data

        // Dynamically load occt-import-js (WASM — lazy to avoid blocking initial load)
        // locateFile overrides the default relative-path fetch so Vite serves
        // the wasm from /public with the correct MIME type at any route depth.
        const occtModule = await import('occt-import-js')
        const occt = await occtModule.default({
          locateFile: (name: string) => {
            if (name.endsWith('.wasm')) {
              return '/occt-import-js.wasm'
            }
            return name
          }
        })

        const result = occt.ReadStepFile(new Uint8Array(buffer), null)

        if (disposed || !canvasRef.current) return

        if (!result || !result.meshes || result.meshes.length === 0) {
          setErrorMsg('STEP bestand bevat geen meshes of kon niet worden gelezen')
          setViewerStatus('error')
          return
        }

        // Set up Three.js scene
        const scene = new THREE.Scene()
        scene.background = new THREE.Color('#f5f5f5')

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(ambientLight)

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
        dirLight.position.set(5, 10, 5)
        scene.add(dirLight)

        const container = canvasRef.current
        const width = container.clientWidth
        const height = container.clientHeight

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 10000)
        camera.position.set(0, 0, 5)

        renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(width, height)
        container.appendChild(renderer.domElement)

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05

        // Convert occt meshes to Three.js geometries
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
            color: 0xb0b0b0,
            flatShading: false,
            side: THREE.DoubleSide,
          })

          const threeMesh = new THREE.Mesh(geometry, material)
          scene.add(threeMesh)
          allMeshes.push(threeMesh)
        }

        // Fit camera to all meshes
        if (allMeshes.length > 0) {
          const box = new THREE.Box3()
          for (const m of allMeshes) {
            box.expandByObject(m)
          }
          const center = new THREE.Vector3()
          const size = new THREE.Vector3()
          box.getCenter(center)
          box.getSize(size)

          const maxDim = Math.max(size.x, size.y, size.z)
          const fov = camera.fov * (Math.PI / 180)
          let distance = Math.abs(maxDim / (2 * Math.tan(fov / 2)))
          distance *= 1.5 // padding

          camera.position.copy(center)
          camera.position.z += distance
          camera.near = distance / 100
          camera.far = distance * 100
          camera.updateProjectionMatrix()

          controls.target.copy(center)
          controls.update()
        }

        // Handle window resize
        function onResize() {
          if (!renderer || !canvasRef.current) return
          const w = canvasRef.current.clientWidth
          const h = canvasRef.current.clientHeight
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
        }
        window.addEventListener('resize', onResize)

        // Animation loop
        function animate() {
          if (disposed) return
          animFrameId = requestAnimationFrame(animate)
          controls.update()
          renderer!.render(scene, camera)
        }
        animate()

        setViewerStatus('ready')

        // Store cleanup in a local variable accessible by the outer cleanup
        ;(canvasRef as any).__cleanupFn = () => {
          window.removeEventListener('resize', onResize)
          for (const m of allMeshes) {
            m.geometry.dispose()
            if (Array.isArray(m.material)) {
              m.material.forEach((mat) => mat.dispose())
            } else {
              (m.material as THREE.Material).dispose()
            }
          }
          renderer?.dispose()
          if (renderer?.domElement && container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement)
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
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId)
      }
      const cleanup = (canvasRef as any).__cleanupFn
      if (typeof cleanup === 'function') {
        cleanup()
      }
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
      <div className="flex flex-col h-full">
        {/* MES-stijl header bar */}
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
              <span className="text-xs text-muted-foreground">Posnr: {posnr.toUpperCase()}</span>
            )}
          </div>

          {viewerStatus === 'loading' && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Laden...
            </span>
          )}
          {viewerStatus === 'error' && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {errorMsg}
            </span>
          )}
        </div>

        {/* Three.js canvas container */}
        <div ref={canvasRef} className="flex-1 w-full overflow-hidden" />
      </div>
    </Layout>
  )
}

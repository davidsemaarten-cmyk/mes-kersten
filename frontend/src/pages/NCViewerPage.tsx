import { useRef, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Layout } from '../components/Layout'
import api from '../lib/api'

export function NCViewerPage() {
  const { jobId, ncId } = useParams<{ jobId: string; ncId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const posnr    = searchParams.get('posnr') ?? ''
  const filename = searchParams.get('file')  ?? `${posnr}.nc1`

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  async function injectFile() {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow || !jobId || !ncId) return

    try {
      const response = await api.get(
        `/api/laserplanner/jobs/${jobId}/nc/${ncId}/download`,
        { responseType: 'text', timeout: 30_000 }
      )
      const content: string = response.data

      const cd: string = response.headers['content-disposition'] ?? ''
      const match = cd.match(/filename="?([^";\r\n]+)"?/)
      const resolvedFilename = match?.[1]?.trim() ?? filename

      let retries = 0
      const tryAddFile = () => {
        const win = iframe.contentWindow as any
        if (typeof win?.addFile === 'function') {
          // Clear previously cached files so we never trigger "file already exists"
          if (win.filePairs) win.filePairs.clear()
          win.sessionStorage?.removeItem('filePairs')
          win.sessionStorage?.removeItem('selectedFile')
          win.addFile(resolvedFilename, content, 1, false)
          setStatus('ready')
        } else if (retries < 10) {
          retries++
          setTimeout(tryAddFile, 200)
        } else {
          setErrorMsg('OpenSteel kon het bestand niet laden (addFile niet beschikbaar)')
          setStatus('error')
        }
      }
      tryAddFile()
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail ?? 'Fout bij ophalen NC bestand')
      setStatus('error')
    }
  }

  function handleIframeLoad() {
    injectFile()
  }

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
            {posnr && posnr !== filename.replace(/\.nc1?$/i, '') && (
              <span className="text-xs text-muted-foreground">Posnr: {posnr.toUpperCase()}</span>
            )}
          </div>

          {status === 'loading' && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Laden...
            </span>
          )}
          {status === 'error' && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {errorMsg}
            </span>
          )}
        </div>

        {/* OpenSteel iframe */}
        <iframe
          ref={iframeRef}
          src="/opensteel/index.html"
          className="flex-1 w-full border-0"
          title="OpenSteel NC viewer"
          onLoad={handleIframeLoad}
        />
      </div>
    </Layout>
  )
}

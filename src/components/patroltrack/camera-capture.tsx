'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Camera, RefreshCw, Check, X, CameraOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CameraCaptureProps {
  onCapture: (photoDataUrl: string) => void
  checkpointCode?: string
}

export function CameraCapture({ onCapture, checkpointCode }: CameraCaptureProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const [status, setStatus] = React.useState<'idle' | 'starting' | 'live' | 'denied' | 'captured'>('idle')
  const [captured, setCaptured] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function start() {
      setStatus('starting')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setStatus('live')
      } catch (e: any) {
        if (cancelled) return
        setStatus('denied')
        setError(e?.message ?? 'Camera access unavailable')
      }
    }
    start()
    return () => {
      cancelled = true
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const capture = () => {
    if (status !== 'live' || !videoRef.current || !canvasRef.current) {
      // Simulated capture fallback
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#0f172a"/><text x="320" y="240" text-anchor="middle" font-family="monospace" font-size="20" fill="#10b981">CAPTURED · ${checkpointCode ?? 'CP'}</text><text x="320" y="270" text-anchor="middle" font-family="monospace" font-size="12" fill="#94a3b8">${new Date().toISOString().slice(0,19).replace('T',' ')}</text></svg>`
      const url = `data:image/svg+xml;base64,${btoa(svg)}`
      setCaptured(url)
      setStatus('captured')
      return
    }
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    // Add timestamp overlay
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40)
    ctx.fillStyle = '#10b981'
    ctx.font = '16px monospace'
    ctx.fillText(`${checkpointCode ?? 'CP'} · ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`, 12, canvas.height - 14)
    const url = canvas.toDataURL('image/jpeg', 0.7)
    setCaptured(url)
    setStatus('captured')
  }

  const retake = () => {
    setCaptured(null)
    setStatus('live')
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-950 ring-1 ring-slate-700">
        {status === 'live' && (
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        )}
        {status === 'captured' && captured && (
          <img src={captured} alt="Captured checkpoint" className="h-full w-full object-cover" />
        )}
        {(status === 'starting' || status === 'idle') && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
            <Camera className="h-8 w-8 animate-pulse" />
            <p className="text-xs">Starting camera...</p>
          </div>
        )}
        {status === 'denied' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-slate-400">
            <CameraOff className="h-8 w-8" />
            <p className="text-xs">Camera not available in this preview.</p>
            <p className="text-[10px] text-slate-500">A simulated timestamped photo will be used instead.</p>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
        {/* Viewfinder overlay */}
        {status === 'live' && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-8 rounded-lg border-2 border-emerald-400/60" />
            <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400/80" />
            <div className="absolute bottom-2 left-2 rounded bg-emerald-500/80 px-1.5 py-0.5 font-mono text-[9px] text-white">REC · {checkpointCode ?? 'CP'}</div>
            <div className="absolute bottom-2 right-2 rounded bg-slate-950/80 px-1.5 py-0.5 font-mono text-[9px] text-emerald-400">{new Date().toISOString().slice(11, 19)}</div>
          </div>
        )}
      </div>

      {status === 'captured' ? (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={retake}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Retake
          </Button>
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => captured && onCapture(captured)}>
            <Check className="mr-1.5 h-4 w-4" /> Use Photo
          </Button>
        </div>
      ) : (
        <Button onClick={capture} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={status === 'starting' || status === 'idle'}>
          <Camera className="mr-1.5 h-4 w-4" /> {status === 'denied' ? 'Simulate Capture' : 'Capture Photo'}
        </Button>
      )}
      {error && <p className="text-center text-[10px] text-amber-600">{error}</p>}
    </div>
  )
}

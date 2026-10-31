'use client'
import * as React from 'react'

// Generates a loud alarm sound using the Web Audio API
function useAlarmSound() {
  const audioCtxRef = React.useRef<AudioContext | null>(null)

  const playAlarm = React.useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      const playBeep = (time: number, freq: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.5, time)
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4)
        osc.start(time)
        osc.stop(time + 0.4)
      }

      // Play a siren pattern: high-low-high-low
      for (let i = 0; i < 8; i++) {
        playBeep(ctx.currentTime + i * 0.5, 800) // High pitch
        playBeep(ctx.currentTime + i * 0.5 + 0.25, 500) // Low pitch
      }
    } catch (e) {
      console.error('Audio playback failed', e)
    }
  }, [])

  return playAlarm
}

export function SOSAlert({ alert, onDismiss }: { alert: any | null; onDismiss: () => void }) {
  const playAlarm = useAlarmSound()
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    if (alert) {
      setVisible(true)
      playAlarm()
    } else {
      setVisible(false)
    }
  }, [alert, playAlarm])

  if (!visible || !alert) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md animate-pulse overflow-hidden rounded-3xl border-4 border-rose-500 bg-slate-950 p-8 text-center shadow-2xl shadow-rose-500/50">
        {/* Flashing background effect */}
        <div className="absolute inset-0 -z-10 animate-ping bg-rose-500/20" />

        {/* Icon */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/20 ring-4 ring-rose-500/40">
          <svg className="h-12 w-12 animate-bounce text-rose-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="mb-2 text-3xl font-bold text-white">EMERGENCY SOS</h1>
        <p className="mb-6 text-lg font-medium text-rose-400">Emergency Alert Activated</p>

        <div className="mb-6 space-y-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-left">
          <div className="flex justify-between">
            <span className="text-sm text-slate-400">Guard Name:</span>
            <span className="text-sm font-bold text-white">{alert.guardName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-400">Location:</span>
            <span className="text-sm font-bold text-white">{alert.locationLabel ?? 'GPS Coordinates'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-400">Coordinates:</span>
            <span className="text-sm font-bold text-white">
              {alert.lat?.toFixed(5)}, {alert.lng?.toFixed(5)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-400">Time:</span>
            <span className="text-sm font-bold text-white">
              {new Date(alert.timestamp || Date.now()).toLocaleTimeString()}
            </span>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full rounded-xl bg-rose-600 py-3 text-base font-bold text-white transition-colors hover:bg-rose-700"
        >
          Acknowledge & Close
        </button>
      </div>
    </div>
  )
}
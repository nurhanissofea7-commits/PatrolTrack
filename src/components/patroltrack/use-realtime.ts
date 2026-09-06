'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { LiveGuard } from '@/lib/types'

interface RealtimeState {
  connected: boolean
  liveGuards: LiveGuard[]
  sosAlert: any | null
  checkpointUpdate: any | null
  notification: any | null
  clearSos: () => void
  clearCheckpointUpdate: () => void
  pushPosition: (pos: Partial<LiveGuard> & { guardId: string }) => void
  activateSos: (data: { guardId: string; guardName: string; lat: number; lng: number; accuracy: number; locationLabel?: string; message?: string }) => void
  broadcastNotification: (data: { type: string; title: string; message: string; priority?: string }) => void
}

export function useRealtime(): RealtimeState {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [liveGuards, setLiveGuards] = useState<LiveGuard[]>([])
  const [sosAlert, setSosAlert] = useState<any | null>(null)
  const [checkpointUpdate, setCheckpointUpdate] = useState<any | null>(null)
  const [notification, setNotification] = useState<any | null>(null)

  useEffect(() => {
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      timeout: 10000,
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('guards:snapshot', (guards: LiveGuard[]) => setLiveGuards(guards))
    socket.on('guard:position', (pos: LiveGuard) => {
      setLiveGuards((prev) => {
        const idx = prev.findIndex((g) => g.guardId === pos.guardId)
        if (idx >= 0) {
          const copy = [...prev]
          copy[idx] = pos
          return copy
        }
        return [...prev, pos]
      })
    })

    socket.on('sos:alert', (alert: any) => setSosAlert(alert))
    socket.on('sos:resolved', () => setSosAlert(null))
    socket.on('checkpoint:update', (data: any) => setCheckpointUpdate(data))
    socket.on('notification', (n: any) => setNotification(n))

    return () => {
      socket.disconnect()
    }
  }, [])

  const pushPosition = useCallback((pos: Partial<LiveGuard> & { guardId: string }) => {
    socketRef.current?.emit('guard:position', pos)
  }, [])

  const activateSos = useCallback((data: { guardId: string; guardName: string; lat: number; lng: number; accuracy: number; locationLabel?: string; message?: string }) => {
    socketRef.current?.emit('sos:activate', data)
  }, [])

  const broadcastNotification = useCallback((data: { type: string; title: string; message: string; priority?: string }) => {
    socketRef.current?.emit('notification:broadcast', data)
  }, [])

  const clearSos = useCallback(() => setSosAlert(null), [])
  const clearCheckpointUpdate = useCallback(() => setCheckpointUpdate(null), [])

  return {
    connected,
    liveGuards,
    sosAlert,
    checkpointUpdate,
    notification,
    clearSos,
    clearCheckpointUpdate,
    pushPosition,
    activateSos,
    broadcastNotification,
  }
}

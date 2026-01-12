'use client'

import { X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface DebugPanelProps {
  state: {
    currentSong: any
    playing: boolean
    progress: number
    currentTime?: number
  }
  queue: any[]
  viewers: any[]
  socketConnected: boolean
  loopMode?: 'none' | 'one' | 'all'
  onClose: () => void
}

export default function DebugPanel({
  state,
  queue,
  viewers,
  socketConnected,
  loopMode = 'none',
  onClose,
}: DebugPanelProps) {
  const [ping, setPing] = useState<number | null>(null)
  const [userIP, setUserIP] = useState<string>('Loading...')
  const [errors, setErrors] = useState<string[]>([])
  const [serverInfo, setServerInfo] = useState({ status: 'Unknown', uptime: 0, environment: 'Unknown' })
  const [techDetails, setTechDetails] = useState({
    browser: 'Unknown',
    os: 'Unknown',
    screenRes: 'Unknown',
    networkType: 'Unknown',
    audioFormat: 'Unknown',
    backendUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  })

  // Measure ping every 5 seconds
  useEffect(() => {
    const measurePing = async () => {
      const start = Date.now()
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        await fetch(`${apiUrl}/ping`, { method: 'HEAD', cache: 'no-store' })
        const latency = Date.now() - start
        setPing(latency)
      } catch (error) {
        setPing(null)
        setErrors(prev => [...prev, 'Ping failed: Cannot reach server'])
      }
    }

    measurePing()
    const interval = setInterval(measurePing, 5000)
    return () => clearInterval(interval)
  }, [])

  // Get user IP
  useEffect(() => {
    const getIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json')
        const data = await response.json()
        setUserIP(data.ip)
      } catch (error) {
        setUserIP('Failed to get IP')
      }
    }
    getIP()
  }, [])

  // Get server info
  useEffect(() => {
    const getServerInfo = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/health`)
        const data = await response.json()
        setServerInfo({
          status: data.status || 'Unknown',
          uptime: data.uptime || 0,
          environment: data.environment || 'Unknown',
        })
      } catch (error) {
        console.error('Failed to fetch server info:', error)
      }
    }
    getServerInfo()
  }, [])

  // Detect tech details
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent

      // Detect browser
      let browser = 'Unknown'
      if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
      else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
      else if (ua.includes('Firefox')) browser = 'Firefox'
      else if (ua.includes('Edg')) browser = 'Edge'
      else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera'

      // Detect OS
      let os = 'Unknown'
      if (ua.includes('Win')) os = 'Windows'
      else if (ua.includes('Mac')) os = 'macOS'
      else if (ua.includes('Linux')) os = 'Linux'
      else if (ua.includes('Android')) os = 'Android'
      else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

      // Screen resolution
      const screenRes = `${window.screen.width}x${window.screen.height}`

      // Network type
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      const networkType = connection?.effectiveType || 'Unknown'

      // Audio format (check current song)
      let audioFormat = 'Unknown'
      if (state.currentSong?.downloadUrl) {
        if (state.currentSong.downloadUrl.includes('.webm')) audioFormat = 'WebM/Opus'
        else if (state.currentSong.downloadUrl.includes('.mp3')) audioFormat = 'MP3'
        else if (state.currentSong.downloadUrl.includes('.m4a')) audioFormat = 'M4A/AAC'
        else audioFormat = 'Unknown'
      }

      setTechDetails({
        browser,
        os,
        screenRes,
        networkType,
        audioFormat,
        backendUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      })
    }
  }, [state.currentSong])

  // Check for issues
  useEffect(() => {
    const newErrors: string[] = []

    if (!socketConnected) {
      newErrors.push('Socket disconnected: Cannot sync with server')
    }

    if (queue.length === 0 && !state.currentSong) {
      newErrors.push('No songs: Queue is empty')
    }

    if (state.currentSong && !state.currentSong.downloadUrl) {
      newErrors.push('Song error: No playable URL')
    }

    if (ping && ping > 500) {
      newErrors.push('High latency: Slow connection detected')
    }

    setErrors(newErrors)
  }, [socketConnected, queue, state, ping])

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-strong rounded-3xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-black">Debug Info</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/10 transition-colors"
          >
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Quick Status */}
          <div className="glass rounded-2xl p-4">
            <h3 className="font-semibold text-black mb-3">Connection</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-black/70">WebSocket</span>
                <span className={`font-medium ${socketConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {socketConnected ? '✓ Connected' : '✗ Disconnected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-black/70">Latency</span>
                <span className={`font-medium ${ping && ping < 100 ? 'text-green-600' : ping && ping < 300 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {ping !== null ? `${ping}ms` : 'Measuring...'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-black/70">Your IP</span>
                <span className="text-black/70 font-medium text-xs">{userIP}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-black/70">Network</span>
                <span className="text-black/70 font-medium text-xs uppercase">{techDetails.networkType}</span>
              </div>
            </div>
          </div>

          {/* Errors/Issues */}
          {errors.length > 0 && (
            <div className="glass rounded-2xl p-4 border-2 border-red-500/30">
              <h3 className="font-semibold text-red-600 mb-2">Issues Detected</h3>
              <div className="space-y-1">
                {errors.map((error, i) => (
                  <div key={i} className="text-xs text-red-600/80">
                    • {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Playback Info */}
          <div className="glass rounded-2xl p-4">
            <h3 className="font-semibold text-black mb-3">Playback</h3>
            {state.currentSong ? (
              <div className="space-y-2 text-black/70 text-xs">
                <div className="flex justify-between">
                  <span>Title:</span>
                  <span className="font-medium truncate ml-2 max-w-[200px]">{state.currentSong.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-medium">{state.playing ? '▶️ Playing' : '⏸️ Paused'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span className="font-medium">{state.currentTime?.toFixed(1) || 0}s / {state.currentSong.duration}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Audio Format:</span>
                  <span className="font-medium">{techDetails.audioFormat}</span>
                </div>
                <div className="flex justify-between">
                  <span>Loop Mode:</span>
                  <span className="font-medium capitalize">{loopMode === 'none' ? 'Off' : loopMode === 'one' ? 'Current Song' : 'All Songs'}</span>
                </div>
              </div>
            ) : (
              <p className="text-black/50 text-xs">No song playing</p>
            )}
          </div>

          {/* System Info */}
          <div className="glass rounded-2xl p-4">
            <h3 className="font-semibold text-black mb-3">System</h3>
            <div className="space-y-2 text-black/70 text-xs">
              <div className="flex justify-between">
                <span>Browser:</span>
                <span className="font-medium">{techDetails.browser}</span>
              </div>
              <div className="flex justify-between">
                <span>OS:</span>
                <span className="font-medium">{techDetails.os}</span>
              </div>
              <div className="flex justify-between">
                <span>Screen:</span>
                <span className="font-medium">{techDetails.screenRes}</span>
              </div>
            </div>
          </div>

          {/* Server Info */}
          <div className="glass rounded-2xl p-4">
            <h3 className="font-semibold text-black mb-3">Server</h3>
            <div className="space-y-2 text-black/70 text-xs">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-medium ${serverInfo.status === 'healthy' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {serverInfo.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Uptime:</span>
                <span className="font-medium">{formatUptime(serverInfo.uptime)}</span>
              </div>
              <div className="flex justify-between">
                <span>Environment:</span>
                <span className="font-medium capitalize">{serverInfo.environment}</span>
              </div>
              <div className="flex justify-between">
                <span>Backend URL:</span>
                <span className="font-medium text-xs truncate max-w-[180px]">{techDetails.backendUrl}</span>
              </div>
            </div>
          </div>

          {/* Queue */}
          <div className="glass rounded-2xl p-4">
            <h3 className="font-semibold text-black mb-2">Queue ({queue.length})</h3>
            {queue.length > 0 ? (
              <div className="space-y-1">
                {queue.slice(0, 3).map((song, i) => (
                  <div key={i} className="text-black/70 text-xs truncate">
                    {i + 1}. {song.title}
                  </div>
                ))}
                {queue.length > 3 && (
                  <p className="text-black/50 text-xs">+{queue.length - 3} more</p>
                )}
              </div>
            ) : (
              <p className="text-black/50 text-xs">Empty</p>
            )}
          </div>

          {/* Viewers */}
          <div className="glass rounded-2xl p-4">
            <h3 className="font-semibold text-black mb-2">Listeners ({viewers.length})</h3>
            {viewers.length > 0 ? (
              <div className="space-y-1">
                {viewers.slice(0, 5).map((viewer, i) => (
                  <div key={i} className="text-black/70 text-xs">
                    {viewer.firstName} {viewer.lastName}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-black/50 text-xs">No one listening</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface User {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
}

interface ProfilePageProps {
  user: User
  roomId: string
  onClose: () => void
}

export default function ProfilePage({ user, roomId, onClose }: ProfilePageProps) {
  const [deviceInfo, setDeviceInfo] = useState({
    userAgent: '',
    platform: '',
    language: '',
    screenSize: '',
    connectionType: 'Unknown',
  })
  const [ping, setPing] = useState<number | null>(null)
  const [stats, setStats] = useState({
    songsAdded: 0,
    timeListened: 0,
    favoriteGenre: 'Music',
    sessionsJoined: 0,
  })

  useEffect(() => {
    // Collect device information
    if (typeof window !== 'undefined') {
      setDeviceInfo({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        connectionType: (navigator as any).connection?.effectiveType || 'Unknown',
      })

      // Measure ping to server
      const measurePing = async () => {
        const start = Date.now()
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ping`)
          const end = Date.now()
          setPing(end - start)
        } catch (error) {
          setPing(null)
        }
      }

      measurePing()
      const interval = setInterval(measurePing, 5000)
      return () => clearInterval(interval)
    }

    const fetchStats = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(`${API_URL}/api/stats/${user.id}`)
        const data = await response.json()

        if (data.success) {
          setStats({
            songsAdded: data.stats.songsAdded || 0,
            timeListened: data.stats.minutesListened || 0,
            favoriteGenre: 'Music', // Backend doesn't provide this yet
            sessionsJoined: data.stats.roomsJoined || 0,
          })
        }
      } catch (error) {
        console.error('[v0] Failed to load stats:', error)
      }
    }

    fetchStats()
  }, [user.id])

  const fullName = `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-end animate-in fade-in duration-300">
      <div className="w-full glass-panel rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 glass-strong border-b-2 border-white/20 px-6 py-5 flex items-center justify-between backdrop-blur-2xl">
          <div>
            <h2 className="text-xl font-bold text-foreground">My Profile</h2>
            <p className="text-sm text-foreground/60">User & Device Information</p>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full glass-strong hover:bg-white/20 transition-all duration-300 flex items-center justify-center text-foreground/70 hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* User Profile Card */}
          <div className="glass-card rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-4">
              {user.photo_url ? (
                <img
                  src={user.photo_url || "/placeholder.svg"}
                  alt={fullName}
                  className="h-20 w-20 rounded-full object-cover border-4 border-white/20 shadow-lg"
                />
              ) : (
                <div className="h-20 w-20 rounded-full glass-strong flex items-center justify-center text-3xl font-bold text-primary border-4 border-primary/30 shadow-lg">
                  {user.first_name[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 space-y-1">
                <h3 className="text-2xl font-bold text-foreground">{fullName}</h3>
                {user.username && (
                  <p className="text-sm text-foreground/60">@{user.username}</p>
                )}
              </div>
            </div>
          </div>

          {/* Telegram Info */}
          <div className="glass-card rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-2xl">📱</span>
              Telegram Info
            </h3>
            <div className="space-y-3">
              <InfoRow label="User ID" value={user.id.toString()} />
              <InfoRow label="Username" value={user.username || 'Not set'} />
              <InfoRow label="Room ID" value={roomId} />
            </div>
          </div>

          {/* Device Info */}
          <div className="glass-card rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-2xl">💻</span>
              Device Info
            </h3>
            <div className="space-y-3">
              <InfoRow label="Platform" value={deviceInfo.platform} />
              <InfoRow label="Language" value={deviceInfo.language} />
              <InfoRow label="Screen Size" value={deviceInfo.screenSize} />
              <InfoRow label="Connection" value={deviceInfo.connectionType} />
            </div>
          </div>

          {/* Server Connection */}
          <div className="glass-card rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-2xl">🌐</span>
              Server Connection
            </h3>
            <div className="space-y-3">
              <InfoRow
                label="Ping"
                value={ping !== null ? `${ping}ms` : 'Measuring...'}
                highlight={ping !== null && ping < 100}
              />
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${ping !== null && ping < 200 ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse shadow-lg`}></div>
                <span className="text-sm text-foreground/60">
                  {ping !== null && ping < 100 ? 'Excellent' : ping !== null && ping < 200 ? 'Good' : 'Fair'}
                </span>
              </div>
            </div>
          </div>

          {/* Listening Stats */}
          <div className="glass-card rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Listening Stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Songs Added" value={stats.songsAdded.toString()} />
              <StatCard label="Time Listened" value={`${Math.floor(stats.timeListened)}m`} />
              <StatCard label="Rooms Joined" value={stats.sessionsJoined.toString()} />
              <StatCard label="Favorite Genre" value={stats.favoriteGenre} />
            </div>
          </div>

          {/* Technical Details */}
          <details className="glass-card rounded-3xl overflow-hidden shadow-xl">
            <summary className="p-6 cursor-pointer font-bold text-foreground hover:bg-white/10 transition-all">
              Technical Details
            </summary>
            <div className="px-6 pb-6 pt-2">
              <p className="text-xs text-foreground/60 break-all font-mono">
                {deviceInfo.userAgent}
              </p>
            </div>
          </details>
        </div>


      </div>
    </div>
  )
}

function InfoRow({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 px-3 glass-strong rounded-xl">
      <span className="text-sm font-medium text-foreground/60">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-green-500' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-strong rounded-2xl p-4 text-center space-y-1">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-foreground/60">{label}</p>
    </div>
  )
}

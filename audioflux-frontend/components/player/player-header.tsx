'use client'

import { Moon, Sun, Bell, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'

interface User {
  id: number
  first_name?: string
  firstName?: string
  username?: string
  photo_url?: string
  photoUrl?: string
}

interface PlayerHeaderProps {
  roomId: string
  viewers: User[]
  onLeave: () => void
  onShowViewers: () => void
  onShowNotifications?: () => void
  hasUnreadNotifications?: boolean
}

export default function PlayerHeader({
  roomId,
  viewers,
  onLeave,
  onShowViewers,
  onShowNotifications,
  hasUnreadNotifications = false
}: PlayerHeaderProps) {
  const [isDark, setIsDark] = useState(false)

  // Load dark mode preference
  useEffect(() => {
    const saved = localStorage.getItem('darkMode')
    const prefersDark = saved === 'true'
    setIsDark(prefersDark)
    if (prefersDark) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newDark = !isDark
    setIsDark(newDark)
    localStorage.setItem('darkMode', String(newDark))
    if (newDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className="sticky top-0 z-50 backdrop-blur-3xl bg-white/70 saturate-[180%] border-b-2 border-white/30 shadow-[0_10px_40px_rgba(0,0,0,0.05)]">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-black tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            AUDIO FLUX
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-full backdrop-blur-2xl bg-white/50 hover:bg-white/70 transition-all hover:scale-105 shadow-lg border border-white/40"
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-700" />
            )}
          </button>

          {/* Notifications Bell */}
          {onShowNotifications && (
            <button
              onClick={onShowNotifications}
              className="relative p-2.5 rounded-full backdrop-blur-2xl bg-white/50 hover:bg-white/70 transition-all hover:scale-105 shadow-lg border border-white/40"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-700" />
              {hasUnreadNotifications && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>
          )}

          {/* Exit Button */}
          <button
            onClick={onLeave}
            className="p-2.5 rounded-full backdrop-blur-2xl bg-white/50 hover:bg-red-50 hover:border-red-300 transition-all hover:scale-105 shadow-lg border border-white/40 group"
            title="Exit room"
          >
            <LogOut className="w-5 h-5 text-gray-700 group-hover:text-red-600" />
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import OutsideTelegram from '@/components/pages/outside-telegram'
import InvalidRoom from '@/components/pages/invalid-room'
import JoinRoom from '@/components/pages/join-room'
import MusicPlayer from '@/components/pages/music-player'


interface TelegramWebApp {
  initDataUnsafe?: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      photo_url?: string
      language_code?: string
      is_bot?: boolean
      is_premium?: boolean
    }
    start_param?: string
  }
  themeParams?: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    link_color?: string
    button_color?: string
    button_text_color?: string
    secondary_bg_color?: string
    header_bg_color?: string
  }
  BackButton?: {
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
    isVisible: boolean
  }
  HapticFeedback?: {
    impactOccurred: (style: string) => void
    notificationOccurred: (type: string) => void
    selectionChanged: () => void
  }
  colorScheme?: 'light' | 'dark'
  ready: () => void
  requestFullscreen: () => void
  expand?: () => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

type PageType = 'outside' | 'invalid' | 'join' | 'player'

export default function HomeClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [page, setPage] = useState<PageType>('outside')
  const [telegramUser, setTelegramUser] = useState<any>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [isValidRoom, setIsValidRoom] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)


  useEffect(() => {
    const initTelegram = async () => {
      if (typeof window === 'undefined') return

      let room = searchParams.get('room')
      console.log('[v0] Starting initialization - room from URL:', room)
      console.log('[v0] Full URL:', window.location.href)
      console.log('[v0] Search params:', window.location.search)
      console.log('[v0] Hash:', window.location.hash)

      // Wait for SDK to load (max 5 seconds)
      let attempts = 0
      const maxAttempts = 50

      while (!window.Telegram?.WebApp && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }

      const tg = window.Telegram?.WebApp

      if (tg) {
        console.log('[v0] ✅ Telegram WebApp SDK loaded after', attempts * 100, 'ms')
        console.log('[v0] initData:', tg.initDataUnsafe?.user ? 'HAS USER DATA' : 'EMPTY')
        console.log('[v0] start_param:', tg.initDataUnsafe?.start_param || 'NONE')
        console.log('[v0] User ID:', tg.initDataUnsafe?.user?.id || 'NO USER')
        console.log('[v0] Full initDataUnsafe:', JSON.stringify(tg.initDataUnsafe, null, 2))

        tg.ready()
        tg.expand?.()

        document.documentElement.classList.remove('dark')

        if (!room && tg.initDataUnsafe?.start_param) {
          const startParam = tg.initDataUnsafe.start_param
          console.log('[v0] Checking start_param:', startParam)

          if (startParam.startsWith('room_')) {
            room = startParam.replace('room_', '')
            console.log('[v0] ✅ Extracted room from start_param:', room)
          }
        }

        if (!room && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const tgStartParam = hashParams.get('tgWebAppStartParam')
          if (tgStartParam) {
            console.log('[v0] Found tgWebAppStartParam in hash:', tgStartParam)
            if (tgStartParam.startsWith('room_')) {
              room = tgStartParam.replace('room_', '')
              console.log('[v0] ✅ Extracted room from hash:', room)
            }
          }
        }

        const user = tg.initDataUnsafe?.user
        if (user && user.id) {
          console.log('[v0] ✅ Telegram user detected:', user.id, user.first_name)

          let photoUrl = user.photo_url || null

          setTelegramUser({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name || '',
            username: user.username || '',
            photo_url: photoUrl
          })
        } else {
          console.log('[v0] ⚠️ No user in initDataUnsafe - WebApp not properly initialized')
          console.log('[v0] This usually means the app was not opened via a web_app button')

          if (room) {
            setRoomId(room)
            setPage('outside')
            setIsLoading(false)
            return
          }
        }
      } else {
        console.log('[v0] ❌ Telegram WebApp SDK NOT available after 5 seconds')
      }

      if (room) {
        setRoomId(room)
        console.log('[v0] Room ID set:', room)

        const tg = window.Telegram?.WebApp
        const hasRealUser = tg?.initDataUnsafe?.user?.id

        if (!hasRealUser) {
          console.log('[v0] ❌ No authenticated user - cannot proceed without WebApp user')
          setPage('outside')
          setIsLoading(false)
          return
        }

        setIsValidRoom(true)
        setPage('join')
      } else {
        console.log('[v0] No room ID - showing outside telegram page')
        setPage('outside')
      }

      setIsLoading(false)
    }

    initTelegram()
  }, [searchParams])

  const handleJoinRoom = () => {
    console.log('[v0] Joining room:', roomId)
    setPage('player')
  }

  const handleLeaveRoom = () => {
    console.log('[v0] Leaving room')
    setPage('join')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen gradient-mesh">
        <div className="flex flex-col items-center gap-4 glass-card p-8 rounded-3xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-foreground/70">Loading Audio Flux...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen">
      {page === 'outside' && <OutsideTelegram />}
      {page === 'invalid' && <InvalidRoom onGoBack={() => setPage('outside')} />}
      {page === 'join' && (
        <JoinRoom user={telegramUser} roomId={roomId} onJoin={handleJoinRoom} />
      )}
      {page === 'player' && telegramUser && roomId && (
        <MusicPlayer user={telegramUser} roomId={roomId} onLeave={handleLeaveRoom} />
      )}
    </main>
  )
}

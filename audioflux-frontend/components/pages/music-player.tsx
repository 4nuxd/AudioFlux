'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import PlayerHeader from '@/components/player/player-header'
import NowPlaying from '@/components/player/now-playing'
import Controls from '@/components/player/controls'
import Queue from '@/components/player/queue'
import SearchPanel from '@/components/player/search-panel'
import ViewersList from '@/components/player/viewers-list'
import BottomNav from '@/components/player/bottom-nav'
import ProfilePage from '@/components/player/profile-page'
import LikedSongs from '@/components/player/liked-songs'
import Playlist from '@/components/player/playlist'
import NotificationsPanel from '@/components/player/notifications-panel'
import ToastNotification from '@/components/player/toast-notification'
import { AlbumArtSkeleton } from '@/components/player/loading-skeleton'
import ProgressBar from '@/components/player/progress-bar'
import WinterOverlay from '@/components/player/winter-overlay'
import { Heart } from 'lucide-react'

interface User {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
}

interface Song {
  id: string
  title: string
  artists: string | string[] // Support both formats
  duration: number
  thumbnail?: string
  source?: 'saavn' | 'youtube'
  videoId?: string
  url?: string
  downloadUrl?: string
  addedBy?: string | {
    id: number
    firstName?: string
    lastName?: string
    username?: string
    photoUrl?: string
    name?: string
  }
  likedAt?: number // Added likedAt property for songs
  isAutoPlay?: boolean // Flag for auto-play songs
}

interface Viewer {
  id: number
  firstName?: string
  lastName?: string
  username?: string
  photoUrl?: string
  joinedAt?: number
}

interface PlayerState {
  currentSong: Song | null
  playing: boolean
  progress: number
  currentTime?: number
  songStartedAt?: number // Added songStartedAt for real-time sync
}

interface MusicPlayerProps {
  user: User
  roomId: string
  onLeave: () => void
}

interface Toast {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

export default function MusicPlayer({ user, roomId, onLeave }: MusicPlayerProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [queue, setQueue] = useState<Song[]>([])
  const [state, setState] = useState<PlayerState>({
    currentSong: null,
    playing: false,
    progress: 0,
    currentTime: 0,
  })
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [showViewers, setShowViewers] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [activeTab, setActiveTab] = useState<'viewers' | 'search' | 'playlist' | 'queue' | 'me'>('queue')
  const audioRef = useRef<HTMLAudioElement>(null)
  const crossfadeAudioRef = useRef<HTMLAudioElement>(null) // For crossfading between songs
  const isCrossfadingRef = useRef<boolean>(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const lastErrorTimeRef = useRef<number>(0)
  const [socketConnected, setSocketConnected] = useState(false)
  const syncedSongIdRef = useRef<string | null>(null)
  const [likedSongs, setLikedSongs] = useState<Song[]>([])
  const [playlist, setPlaylist] = useState<Song[]>([])
  const [showPlaylist, setShowPlaylist] = useState(false)
  const [showLikedSongs, setShowLikedSongs] = useState(false)
  const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Prevent skip spam
  const [loopMode, setLoopMode] = useState<'none' | 'one' | 'all'>('none') // Loop mode state
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false) // Auto-play state
  const [hasHistory, setHasHistory] = useState(false) // Track if there's song history for previous button (backend handles check)
  const timeOffsetRef = useRef<number>(0) // Server time offset for sync
  const [roomMetadata, setRoomMetadata] = useState<{ isPrivate: boolean; ownerId: number; ownerName: string } | null>(null) // Private room metadata

  // RATE LIMITING: Track last action time for each control
  const lastPlayPauseRef = useRef<number>(0)
  const lastSkipRef = useRef<number>(0)
  const lastLoopRef = useRef<number>(0)
  const lastPreviousRef = useRef<number>(0)
  const lastLikeRef = useRef<number>(0)
  const RATE_LIMIT_MS = 5000 // 5 seconds cooldown

  // Notifications state
  const [notifications, setNotifications] = useState<Array<{ id: string, message: string, timestamp: number, read: boolean }>>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false)

  // Preloading system for queue songs
  const preloadedAudioRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const preloadingInProgressRef = useRef<Set<string>>(new Set())

  // Wake Lock API to prevent device sleep during playback
  const wakeLockRef = useRef<any>(null)

  // Track initial audio load to prevent premature error messages
  const initialLoadRef = useRef<boolean>(true)

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const now = Date.now()
    if (type === 'error' && now - lastErrorTimeRef.current < 5000) {
      console.log('[v0] Skipping duplicate error toast')
      return
    }
    if (type === 'error') {
      lastErrorTimeRef.current = now
    }

    const id = Date.now().toString()
    setToasts([{ id, message, type }])

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 3000)
  }, [])

  const isTelegramWebView = typeof window !== 'undefined' && !!window.Telegram?.WebApp
  const supportsWebM = useRef<boolean>(false)

  useEffect(() => {
    // Check if browser supports WebM/Opus codec
    const audio = document.createElement('audio')
    const canPlayWebM = audio.canPlayType('audio/webm; codecs="opus"') !== ''
    const canPlayWebMVorbis = audio.canPlayType('audio/webm; codecs="vorbis"') !== ''
    supportsWebM.current = canPlayWebM || canPlayWebMVorbis

    console.log('[v0] Codec support check:', {
      isTelegramWebView,
      supportsWebM: supportsWebM.current,
      canPlayWebM,
      canPlayWebMVorbis,
    })
  }, [isTelegramWebView])

  // Helper function to get the active player based on song source
  const getActivePlayer = useCallback(() => {
    if (!state.currentSong) return null

    const downloadUrl = state.currentSong.downloadUrl
    const isMP4 = downloadUrl?.includes('.mp4') || downloadUrl?.includes('.m4a')

    // Use video element for MP4/M4A files (YouTube, Spotify, Saavn AAC)
    if (isMP4) {
      return videoRef.current
    }

    // Use audio element for MP3 files
    return audioRef.current
  }, [state.currentSong])

  // Automatically switch between audio and video player based on source
  useEffect(() => {
    if (!state.currentSong?.downloadUrl) {
      // Clear both players if no song
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.src = ''
      }
      return
    }

    const source = state.currentSong.source || 'saavn'
    const downloadUrl = state.currentSong.downloadUrl

    // Backend now handles everything - just use the URL directly
    console.log('[v0] Using download URL:', downloadUrl)

    // Determine player based on file extension, not source
    // MP4 files (including Saavn AAC) use video element
    // MP3 files use audio element
    const isMP4 = downloadUrl?.includes('.mp4') || downloadUrl?.includes('.m4a')
    const isVideoSource = isMP4

    console.log('[v0] Switching player:', {
      source,
      isMP4,
      isVideoSource,
      title: state.currentSong.title,
      url: downloadUrl
    })

    if (isVideoSource) {
      // Use video element for MP4/M4A files (YouTube, Spotify, Saavn AAC)
      if (videoRef.current && videoRef.current.src !== downloadUrl) {
        console.log('[v0] Loading MP4/M4A in video element:', downloadUrl)
        videoRef.current.src = downloadUrl
        videoRef.current.load()
      }
      // Clear and pause audio element
      if (audioRef.current && audioRef.current.src) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    } else {
      // Use audio element for MP3 files
      if (audioRef.current && audioRef.current.src !== downloadUrl) {
        console.log('[v0] Loading MP3 in audio element:', downloadUrl)
        audioRef.current.src = downloadUrl
        audioRef.current.load()
      }
      // Clear and pause video element
      if (videoRef.current && videoRef.current.src) {
        videoRef.current.pause()
        videoRef.current.src = ''
      }
    }
  }, [state.currentSong])

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      query: {
        roomId,
        userId: user.id,
        userName: user.first_name,
        userUsername: user.username || '',
        userPhoto: user.photo_url || '',
      },
    })

    socketInstance.on('connect', () => {
      console.log('[v0] Socket connected, joining room:', roomId)
      setIsLoading(false)
      setSocketConnected(true)

      socketInstance.emit('join', {
        roomId,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          photoUrl: user.photo_url,
        }
      })
    })

    socketInstance.on('initialState', async ({ queue: initialQueue, state: initialState, viewers: initialViewers, loopMode: initialLoopMode, autoPlay, serverTime }) => {
      console.log('[v0] Initial state received:', {
        queueLength: initialQueue?.length,
        viewers: initialViewers?.length,
        currentSong: initialState?.currentSong,
        playing: initialState?.playing,
        currentTime: initialState?.currentTime,
        songStartedAt: initialState?.songStartedAt,
        loopMode: initialLoopMode,
        autoPlayEnabled: autoPlay?.enabled,
        serverTime,
        fullQueue: initialQueue,
      })

      // Calculate time offset for sync
      if (serverTime) {
        timeOffsetRef.current = Date.now() - serverTime
        console.log('[v0] Time offset calculated:', timeOffsetRef.current, 'ms')
      }

      setQueue(initialQueue || [])

      // Calculate proper currentTime from songStartedAt if playing
      let calculatedState = initialState || { currentSong: null, playing: false, progress: 0, currentTime: 0 }
      if (initialState?.playing && initialState?.songStartedAt && initialState?.currentSong) {
        const serverElapsed = (Date.now() + timeOffsetRef.current - initialState.songStartedAt) / 1000
        calculatedState = {
          ...initialState,
          currentTime: serverElapsed,
          progress: serverElapsed * 1000
        }
        console.log('[v0] Calculated currentTime from songStartedAt:', serverElapsed, 'seconds')
      }

      setState(calculatedState)
      setViewers(initialViewers || [])
      setLoopMode(initialLoopMode || 'none')
      setAutoPlayEnabled(autoPlay?.enabled || false)
      setRoomMetadata(roomMetadata || null)

      // CRITICAL FIX: Preload liked songs immediately
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(`${API_URL}/api/liked-songs/${user.id}`)
        const data = await response.json()
        if (data.success && data.likedSongs) {
          setLikedSongs(data.likedSongs)
          console.log('[v0] Liked songs preloaded:', data.likedSongs.length)
        }
      } catch (error) {
        console.error('[v0] Failed to preload liked songs:', error)
      }

      // Preload playlist
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(`${API_URL}/api/playlist/${user.id}`)
        const data = await response.json()
        if (data.success && data.playlist) {
          setPlaylist(data.playlist)
          console.log('[v0] Playlist preloaded:', data.playlist.length)
        }
      } catch (error) {
        console.error('[v0] Failed to preload playlist:', error)
      }

      // Fetch persistent notifications from Redis
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(`${API_URL}/api/notifications`)
        const data = await response.json()
        if (data.success && data.notifications) {
          setNotifications(data.notifications)
          const unreadCount = data.notifications.filter((n: any) => !n.read).length
          setHasUnreadNotifications(unreadCount > 0)
          console.log('[v0] Notifications loaded:', data.notifications.length, 'unread:', unreadCount)
        }
      } catch (error) {
        console.error('[v0] Failed to load notifications:', error)
      }


      setIsLoading(false)

      // Sync audio to exact playback position if joining mid-song
      if (initialState?.playing && initialState?.songStartedAt && initialState?.currentSong) {
        const serverElapsed = (Date.now() + timeOffsetRef.current - initialState.songStartedAt) / 1000
        console.log('[v0] Syncing to server playback position:', serverElapsed, 'seconds')

        // Store the sync position to apply when audio loads
        if (audioRef.current && audioRef.current.src) {
          // Audio already loaded, sync immediately
          audioRef.current.currentTime = Math.max(0, Math.min(serverElapsed, audioRef.current.duration || serverElapsed))
          if (initialState.playing) {
            audioRef.current.play().catch(e => console.error('[v0] Auto-play failed:', e))
          }
        } else {
          // Audio not loaded yet, will sync in useEffect when song changes
          syncedSongIdRef.current = null
        }
      }

      syncedSongIdRef.current = null
    })

    socketInstance.on('queueUpdated', (newQueue) => {
      console.log('[v0] Queue updated from backend:', {
        count: newQueue?.length,
        songs: newQueue?.map((s: Song) => ({
          title: s.title,
          hasDownloadUrl: !!s.downloadUrl,
          source: s.source
        })),
        fullData: newQueue
      })
      setQueue(newQueue || [])
    })

    socketInstance.on('stateUpdate', (newState) => {
      console.log('[v0] State updated:', {
        playing: newState.playing,
        currentSong: newState.currentSong?.title,
        currentTime: newState.currentTime,
        songStartedAt: newState.songStartedAt, // Log songStartedAt
        progress: newState.progress,
        hasSong: !!newState.currentSong,
      })

      setState(prev => ({
        ...prev,
        currentSong: newState.currentSong || null,
        playing: newState.playing ?? prev.playing,
        currentTime: newState.currentTime ?? prev.currentTime,
        songStartedAt: newState.songStartedAt ?? prev.songStartedAt, // Store songStartedAt
        progress: newState.progress ?? prev.progress,
      }))
    })

    socketInstance.on('viewersUpdated', (viewersList: Viewer[]) => {
      console.log('[v0] Viewers updated:', viewersList?.length, 'active viewers')
      setViewers(viewersList || [])
    })

    // Loop mode changed event
    socketInstance.on('loopModeChanged', ({ loopMode: newLoopMode }) => {
      console.log('[v0] Loop mode changed:', newLoopMode)
      setLoopMode(newLoopMode)
      showToast(
        newLoopMode === 'none'
          ? 'Loop disabled'
          : newLoopMode === 'one'
            ? 'Looping current song'
            : 'Looping all songs',
        'info'
      )
    })

    // Listen for auto-play state changes
    socketInstance.on('autoPlayChanged', ({ enabled }) => {
      console.log('[v0] Auto-play changed:', enabled)
      setAutoPlayEnabled(enabled)
    })

    // History updated event - enables/disables previous button
    socketInstance.on('historyUpdated', ({ hasHistory: newHasHistory }) => {
      console.log('[v0] History updated:', newHasHistory)
      setHasHistory(newHasHistory)
    })

    // Notification received from server
    socketInstance.on('notification', ({ notification }) => {
      console.log('[v0] New notification received:', notification)
      setNotifications(prev => [notification, ...prev])
      setHasUnreadNotifications(true)
      showToast('📢 New notification from owner', 'info')
    })

    // Progress update from server (server-side playback management)
    socketInstance.on('progressUpdate', ({ currentTime, serverTime }) => {
      if (!audioRef.current || !state.currentSong) return

      // Calculate drift between client and server
      const clientTime = audioRef.current.currentTime
      const drift = Math.abs(clientTime - currentTime)

      // If drift > 2 seconds, sync to server time
      if (drift > 2) {
        console.log('[v0] Syncing to server time. Drift:', drift, 'seconds')
        audioRef.current.currentTime = currentTime
      }

      // Update state with server time
      setState(prev => ({
        ...prev,
        currentTime: currentTime,
        progress: state.currentSong ? (currentTime / state.currentSong.duration) * 100 : 0
      }))
    })

    socketInstance.on('ownerNotification', ({ message, type }: { message: string; type: 'info' | 'success' | 'warning' | 'error' }) => {
      console.log('[v0] Owner notification received:', message)
      showToast(message, type)
    })

    socketInstance.on('disconnect', () => {
      setSocketConnected(false)
    })

    socketInstance.on('progressSync', ({ currentTime }) => {
      console.log('[v0] Progress sync received from backend:', currentTime)
      if (audioRef.current && state.currentSong && Math.abs(audioRef.current.currentTime - currentTime) > 5) {
        console.log('[v0] Syncing to backend time (diff > 5s):', currentTime)
        audioRef.current.currentTime = currentTime
      }
    })

    setSocket(socketInstance)

    // Telegram back button
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.BackButton) {
      window.Telegram.WebApp.BackButton.show()
      window.Telegram.WebApp.BackButton.onClick(() => {
        console.log('[v0] Back button clicked, leaving room')
        socketInstance.disconnect()
        onLeave()
      })
    }

    // Wake Lock API - Keep screen awake during playback
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && state.playing) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
          console.log('[v0] Wake Lock activated')

          wakeLockRef.current.addEventListener('release', () => {
            console.log('[v0] Wake Lock released')
          })
        }
      } catch (err) {
        console.log('[v0] Wake Lock not supported or failed:', err)
      }
    }

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release()
          wakeLockRef.current = null
          console.log('[v0] Wake Lock manually released')
        } catch (err) {
          console.error('[v0] Wake Lock release error:', err)
        }
      }
    }

    // Request wake lock when playing
    if (state.playing) {
      requestWakeLock()
    } else {
      releaseWakeLock()
    }

    // Page Visibility API - Handle when user switches tabs or locks device
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[v0] Page hidden - maintaining playback')
        // Keep audio playing even when page is hidden
        if (state.playing && audioRef.current && audioRef.current.paused) {
          audioRef.current.play().catch(e => console.log('[v0] Resume failed:', e))
        }
      } else {
        console.log('[v0] Page visible - reacquiring wake lock')
        if (state.playing) {
          requestWakeLock()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      console.log('[v0] Disconnecting socket')
      socketInstance.disconnect()
      setSocketConnected(false)

      // Release wake lock
      releaseWakeLock()
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      // Cleanup all preloaded audio
      preloadedAudioRef.current.forEach(audio => {
        audio.pause()
        audio.src = ''
      })
      preloadedAudioRef.current.clear()
      preloadingInProgressRef.current.clear()
    }
  }, [roomId, user, onLeave, showToast, state.playing])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime
      const duration = audio.duration

      setState(prev => ({
        ...prev,
        currentTime: currentTime,
        progress: currentTime * 1000,
      }))

      // Smooth fade-out in the last 3 seconds
      if (duration && !isNaN(duration)) {
        const timeRemaining = duration - currentTime

        if (timeRemaining <= 3 && timeRemaining > 0) {
          // Fade from 1.0 to 0.3 over the last 3 seconds
          const fadeVolume = 0.3 + (timeRemaining / 3) * 0.7
          audio.volume = Math.max(0.3, Math.min(1.0, fadeVolume))
        } else if (audio.volume !== 1.0) {
          // Reset volume when not in fade zone
          audio.volume = 1.0
        }
      }
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [])

  useEffect(() => {
    if (!audioRef.current) return

    if (state.currentSong) {
      const audioUrl = state.currentSong.downloadUrl

      const isWebM = audioUrl?.includes('.webm') || state.currentSong.source === 'youtube'
      const isIncompatible = isTelegramWebView && isWebM && !supportsWebM.current

      if (isIncompatible) {
        console.warn('[v0] WebM not supported in Telegram WebView, skipping song:', {
          title: state.currentSong.title,
          source: state.currentSong.source,
        })

        // Only show toast if there are more songs in queue
        if (queue.length > 0) {
          showToast('Audio format not supported in Telegram', 'warning')
        }

        // Clear any existing skip timeout
        if (skipTimeoutRef.current) {
          clearTimeout(skipTimeoutRef.current)
        }

        // Only skip if there are songs in queue
        if (queue.length > 0) {
          skipTimeoutRef.current = setTimeout(() => {
            if (socket) {
              console.log('[v0] Auto-skipping WebM song in Telegram')
              socket.emit('skip', {
                roomId,
              })
            }
            skipTimeoutRef.current = null
          }, 2000)
        }
        return
      }

      // If no downloadUrl, log it but don't show error yet - let audio element try to load
      if (!audioUrl || audioUrl.trim() === '') {
        console.warn('[v0] Song has no downloadUrl, will rely on audio error handler:', {
          title: state.currentSong.title,
          id: state.currentSong.id,
          source: state.currentSong.source,
        })
        // Don't return here - let the audio element's error handler deal with it
      }

      console.log('[v0] Playing song:', {
        title: state.currentSong.title,
        downloadUrl: audioUrl,
        source: state.currentSong.source,
        currentTime: state.currentTime,
        isWebM,
        canPlay: !isIncompatible,
      })

      if (audioRef.current.src !== audioUrl) {
        console.log('[v0] Loading new audio source:', audioUrl)

        // IMPORTANT: Immediately pause and stop the current audio to prevent overlap
        if (audioRef.current.src) {
          console.log('[v0] Stopping current audio before loading new song')
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }

        // Load new song
        audioRef.current.src = audioUrl
        audioRef.current.load()
        syncedSongIdRef.current = null

        audioRef.current.addEventListener('loadedmetadata', () => {
          const targetTime = state.currentTime || 0
          console.log('[v0] Metadata loaded, syncing to time:', targetTime)

          if (targetTime > 0) {
            audioRef.current!.currentTime = targetTime
            syncedSongIdRef.current = state.currentSong?.id || null
            console.log('[v0] Synced successfully to:', audioRef.current!.currentTime)
          }
        }, { once: true })
      } else if (state.currentTime !== undefined &&
        syncedSongIdRef.current !== state.currentSong.id &&
        Math.abs(audioRef.current.currentTime - state.currentTime) > 5) {
        // Only sync if difference is more than 5 seconds to prevent auto-seeking issues
        console.log('[v0] Re-syncing to backend time:', state.currentTime, 'current:', audioRef.current.currentTime)
        audioRef.current.currentTime = state.currentTime
        syncedSongIdRef.current = state.currentSong.id
      } else if (syncedSongIdRef.current !== state.currentSong.id &&
        Math.abs(audioRef.current.currentTime - (state.currentTime || 0)) <= 5) {
        // Mark as synced if we're already close enough
        syncedSongIdRef.current = state.currentSong.id
        console.log('[v0] Already in sync, marking as synced')
      }

      // Control playback with retry logic
      if (state.playing) {
        if (audioRef.current.paused) {
          const playAttempt = () => {
            audioRef.current!.play().catch((err) => {
              console.error('[v0] Play failed:', err.message, err.name)

              if (err.name === 'NotAllowedError') {
                // Retry after a short delay for autoplay policy
                console.log('[v0] Retrying playback in 500ms...')
                setTimeout(() => {
                  if (audioRef.current && state.playing) {
                    playAttempt()
                  }
                }, 500)
              } else if (err.name === 'NotSupportedError') {
                console.error('[v0] Audio format not supported:', audioUrl)
                if (queue.length > 0) {
                  showToast('Audio format not supported', 'error')
                }
                setTimeout(() => {
                  if (socket) {
                    socket.emit('skip', { roomId })
                  }
                }, 2000)
              }
            })
          }
          playAttempt()
        }
      } else {
        if (!audioRef.current.paused) {
          audioRef.current.pause()
        }
      }
    } else {
      if (queue.length > 0) {
        console.log('[v0] No current song but queue has', queue.length, 'songs')
      } else if (audioRef.current.src) {
        console.log('[v0] No songs available, clearing audio')
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [state.currentSong, state.playing, state.currentTime, queue, socket, roomId, showToast, user, isTelegramWebView])

  // Preload next songs in queue for smooth playback
  useEffect(() => {
    if (!queue || queue.length === 0) {
      // Clear all preloaded audio when queue is empty
      preloadedAudioRef.current.forEach(audio => {
        audio.pause()
        audio.src = ''
      })
      preloadedAudioRef.current.clear()
      preloadingInProgressRef.current.clear()
      return
    }

    // Preload only the NEXT song (reduced from 2 for faster loading)
    const songsToPreload = queue.slice(0, 1)

    songsToPreload.forEach((song, index) => {
      const songId = song.id

      // Skip if already preloaded or currently preloading
      if (preloadedAudioRef.current.has(songId) || preloadingInProgressRef.current.has(songId)) {
        return
      }

      // Skip if no download URL
      if (!song.downloadUrl || song.downloadUrl.trim() === '') {
        console.log('[v0] Skipping preload - no downloadUrl:', song.title)
        return
      }

      // Check codec compatibility for Telegram
      const isWebM = song.downloadUrl.includes('.webm') || song.source === 'youtube'
      const isIncompatible = isTelegramWebView && isWebM && !supportsWebM.current

      if (isIncompatible) {
        console.log('[v0] Skipping preload - WebM not supported in Telegram:', song.title)
        return
      }

      console.log(`[v0] Preloading next song:`, song.title)

      // Mark as preloading
      preloadingInProgressRef.current.add(songId)

      // Create new audio element for preloading
      const preloadAudio = new Audio()
      preloadAudio.preload = 'metadata' // Changed from 'auto' for faster loading
      preloadAudio.crossOrigin = 'anonymous'
      preloadAudio.src = song.downloadUrl

      // Handle successful preload
      preloadAudio.addEventListener('canplaythrough', () => {
        console.log('[v0] ✅ Preloaded:', song.title)
        preloadedAudioRef.current.set(songId, preloadAudio)
        preloadingInProgressRef.current.delete(songId)
      }, { once: true })

      // Handle preload errors
      preloadAudio.addEventListener('error', (e) => {
        console.warn('[v0] ⚠️ Preload failed:', song.title)
        preloadingInProgressRef.current.delete(songId)
      }, { once: true })

      // Start loading
      preloadAudio.load()
    })

    // Cleanup: Remove preloaded songs that are no longer next
    const currentQueueIds = new Set(songsToPreload.map(s => s.id))
    const preloadedIds = Array.from(preloadedAudioRef.current.keys())

    preloadedIds.forEach(id => {
      if (!currentQueueIds.has(id)) {
        const audio = preloadedAudioRef.current.get(id)
        if (audio) {
          console.log('[v0] Cleaning up preloaded audio:', id)
          audio.pause()
          audio.src = ''
          preloadedAudioRef.current.delete(id)
        }
      }
    })
  }, [queue, isTelegramWebView])


  const handlePlayPause = useCallback(() => {
    if (!socket || !audioRef.current) return

    // RATE LIMIT CHECK
    const now = Date.now()
    if (now - lastPlayPauseRef.current < RATE_LIMIT_MS) {
      showToast('⏱ Do not spam', 'warning')
      return
    }
    lastPlayPauseRef.current = now

    const audio = audioRef.current
    const newPlaying = !state.playing

    console.log('[v0] Play/Pause toggled:', {
      from: state.playing,
      to: newPlaying,
      currentSong: state.currentSong?.title,
    })

    // Update local state immediately for responsive UI
    setState(prev => ({
      ...prev,
      playing: newPlaying,
    }))

    // Control audio element immediately
    if (newPlaying) {
      audio.play().catch((err) => {
        console.error('[v0] Play failed:', err.message)
        showToast('Unable to play audio', 'error')
      })
    } else {
      audio.pause()
    }

    const eventName = newPlaying ? 'play' : 'pause'
    socket.emit(eventName, {
      roomId,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        photoUrl: user.photo_url,
      }
    })
  }, [socket, state, roomId, user, showToast])

  const handleSkip = useCallback(async () => {
    if (!socket) return

    // RATE LIMIT CHECK
    const now = Date.now()
    if (now - lastSkipRef.current < RATE_LIMIT_MS) {
      showToast('⏱ Do not spam', 'warning')
      return
    }
    lastSkipRef.current = now

    console.log('[v0] User manually skipped song')

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    socket.emit('skip', {
      roomId,
    })
  }, [socket, roomId, showToast])

  const handleToggleLoop = useCallback(() => {
    if (!socket) return

    // RATE LIMIT CHECK
    const now = Date.now()
    if (now - lastLoopRef.current < RATE_LIMIT_MS) {
      showToast('⏱ Do not spam', 'warning')
      return
    }
    lastLoopRef.current = now

    console.log('[v0] Toggling loop mode, current:', loopMode)

    if (!socket || !roomId || !user) {
      console.warn('[v0] Cannot toggle loop - missing socket, roomId, or user')
      return
    }

    socket.emit('toggleLoop', {
      roomId,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        photoUrl: user.photo_url,
      }
    })
  }, [socket, roomId, user, loopMode, showToast])

  const handleToggleAutoPlay = useCallback(() => {
    console.log('[v0] Toggling auto-play, current:', autoPlayEnabled)

    if (!socket || !roomId || !user) {
      console.warn('[v0] Cannot toggle auto-play - missing socket, roomId, or user')
      return
    }

    socket.emit('toggleAutoPlay', {
      roomId,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        photoUrl: user.photo_url,
      }
    })
  }, [socket, roomId, user, autoPlayEnabled])

  const handlePrevious = useCallback(() => {
    if (!socket) return

    // RATE LIMIT CHECK
    const now = Date.now()
    if (now - lastPreviousRef.current < RATE_LIMIT_MS) {
      showToast('⏱ Do not spam', 'warning')
      return
    }
    lastPreviousRef.current = now

    console.log('[v0] Going to previous song')

    socket.emit('previous', {
      roomId,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        photoUrl: user.photo_url,
      }
    })
  }, [socket, roomId, user, showToast])

  const handleAddSong = async (song: Song) => {
    if (!socket) return

    try {
      const artistsArray = Array.isArray(song.artists)
        ? song.artists
        : typeof song.artists === 'string'
          ? [song.artists]
          : ['Unknown Artist']

      const songData = {
        id: song.id,
        title: song.title,
        artists: artistsArray,
        duration: song.duration,
        thumbnail: song.thumbnail,
        source: song.source || 'saavn',
        url: song.url,
        downloadUrl: song.downloadUrl,
        videoId: song.videoId,
      }

      console.log('[v0] Emitting addSong event:', {
        title: songData.title,
        hasDownloadUrl: !!songData.downloadUrl,
        downloadUrl: songData.downloadUrl,
        source: songData.source,
      })

      socket.emit('addSong', {
        roomId,
        song: songData,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          photoUrl: user.photo_url,
        }
      })

      showToast(`Added "${song.title}" to queue`, 'success')
      // Don't close search - let user add multiple songs
    } catch (error) {
      console.error('[v0] Add song error:', error)
      showToast('Failed to add song', 'error')
    }
  }

  const handleRemoveSong = useCallback(
    async (index: number, song: Song) => {
      if (!socket) return

      console.log('[v0] Removing song from queue:', song.title)

      // Emit socket event with song data for Telegram notification
      socket.emit('removeFromQueue', {
        roomId,
        songIndex: index,
        song,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          photoUrl: user.photo_url,
        }
      })

      showToast(`Removed "${song.title}" from queue`, 'info')
    },
    [socket, roomId, user, showToast]
  )

  // Playlist handlers
  const handleAddToPlaylist = useCallback(async (song: Song) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    try {
      const response = await fetch(`${API_URL}/api/playlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, song }),
      })
      const data = await response.json()

      if (data.success) {
        setPlaylist(prev => [...prev, song])
        showToast(`Added "${song.title}" to playlist`, 'success')
      } else {
        showToast(data.message || 'Song already in playlist', 'info')
      }
    } catch (error) {
      console.error('[v0] Failed to add to playlist:', error)
      showToast('Failed to add to playlist', 'error')
    }
  }, [user.id, showToast])

  const handleRemoveFromPlaylist = useCallback(async (songId: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    try {
      const response = await fetch(`${API_URL}/api/playlist`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, songId }),
      })
      const data = await response.json()

      if (data.success) {
        setPlaylist(prev => prev.filter(s => s.id !== songId))
        showToast('Removed from playlist', 'info')
      }
    } catch (error) {
      console.error('[v0] Failed to remove from playlist:', error)
      showToast('Failed to remove from playlist', 'error')
    }
  }, [user.id, showToast])

  const handleAddPlaylistSongToQueue = useCallback((song: Song) => {
    if (!socket) return
    handleAddSong(song)
  }, [socket, handleAddSong])

  const handleToggleLike = useCallback(async () => {
    if (!state.currentSong) return

    // RATE LIMIT CHECK
    const now = Date.now()
    if (now - lastLikeRef.current < RATE_LIMIT_MS) {
      showToast('⏱ Do not spam', 'warning')
      return
    }
    lastLikeRef.current = now

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const songId = state.currentSong.id
    const isInPlaylist = playlist.some(s => s.id === songId)

    try {
      if (isInPlaylist) {
        // Remove from playlist
        const response = await fetch(`${API_URL}/api/playlist`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, songId }),
        })
        const data = await response.json()

        if (data.success) {
          setPlaylist(prev => prev.filter(s => s.id !== songId))
          showToast('Removed from playlist', 'info')
        }
      } else {
        // Add to playlist
        const response = await fetch(`${API_URL}/api/playlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, song: state.currentSong }),
        })
        const data = await response.json()

        if (data.success) {
          setPlaylist(prev => [...prev, state.currentSong!])
          showToast('Added to playlist', 'success')
        }
      }
    } catch (error) {
      console.error('[v0] Failed to toggle playlist:', error)
      showToast('Failed to update playlist', 'error')
    }
  }, [state.currentSong, playlist, user.id, showToast])

  // Notification handlers
  const handleMarkAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setHasUnreadNotifications(prev => notifications.filter(n => !n.read && n.id !== id).length > 0)
  }, [notifications])

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setHasUnreadNotifications(false)
  }, [])

  const handlePlayLikedSong = useCallback((song: Song) => {
    if (!socket) return
    handleAddSong(song)
    setShowLikedSongs(false)
    showToast(`Playing "${song.title}"`, 'success')
  }, [socket, handleAddSong, showToast])

  const handleUnlike = useCallback(async (songId: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    try {
      const response = await fetch(`${API_URL}/api/liked-songs`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, songId }),
      })
      const data = await response.json()

      if (data.success) {
        setLikedSongs(prev => prev.filter(s => s.id !== songId))
        showToast('Removed from liked songs', 'info')
      }
    } catch (error) {
      console.error('[v0] Failed to unlike song:', error)
      showToast('Failed to remove song', 'error')
    }
  }, [user.id, showToast])

  const handleTabChange = (tab: 'viewers' | 'search' | 'playlist' | 'queue' | 'me') => {
    setActiveTab(tab)

    if (tab === 'viewers') {
      setShowViewers(true)
      setShowQueue(false)
      setShowSearch(false)
      setShowLikedSongs(false)
      setShowPlaylist(false)
    } else if (tab === 'search') {
      setShowSearch(true)
      setShowQueue(false)
      setShowViewers(false)
      setShowLikedSongs(false)
      setShowPlaylist(false)
    } else if (tab === 'playlist') {
      // Show playlist when playlist tab is clicked
      setShowPlaylist(true)
      setShowLikedSongs(false)
      setShowQueue(false)
      setShowSearch(false)
      setShowViewers(false)
    } else if (tab === 'queue') {
      setShowQueue(true)
      setShowSearch(false)
      setShowViewers(false)
      setShowLikedSongs(false)
      setShowPlaylist(false)
    } else if (tab === 'me') {
      setShowQueue(false)
      setShowSearch(false)
      setShowViewers(false)
      setShowLikedSongs(false)
      setShowPlaylist(false)
    }
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return (
    <div className="h-screen flex flex-col gradient-mesh overflow-hidden">
      <PlayerHeader
        roomId={roomId}
        viewers={viewers}
        onLeave={onLeave}
        onShowViewers={() => handleTabChange('viewers')}
        onShowNotifications={() => setShowNotifications(true)}
        hasUnreadNotifications={hasUnreadNotifications}
      />

      <div className="flex-1 flex flex-col justify-start px-6 pt-4 pb-36 overflow-hidden">

        {isLoading ? (
          <AlbumArtSkeleton />
        ) : (
          <>
            <div className="flex-shrink-0 mt-2">
              <NowPlaying
                currentSong={state.currentSong}
                roomMetadata={roomMetadata}
                currentUserId={user.id}
                botUsername={process.env.NEXT_PUBLIC_BOT_USERNAME}
                roomId={roomId}
                currentTime={state.currentTime || 0}
              />
            </div>

            <div className="mt-3 mb-1 flex-shrink-0">
              <ProgressBar
                currentTime={state.currentTime || 0}
                duration={state.currentSong?.duration || 180}
              />
            </div>

            <div className="mt-0 flex-shrink-0">
              <Controls
                isPlaying={state.playing}
                onPlayPause={handlePlayPause}
                onSkip={handleSkip}
                onPrevious={handlePrevious}
                onAddSong={() => setShowSearch(true)}
                onQueue={() => setShowQueue(true)}
                currentSong={state.currentSong}
                onToggleLike={handleToggleLike}
                isLiked={state.currentSong ? playlist.some(s => s.id === state.currentSong?.id) : false}
                loopMode={loopMode}
                onToggleLoop={handleToggleLoop}
                autoPlayEnabled={autoPlayEnabled}
                onToggleAutoPlay={handleToggleAutoPlay}
                queueLength={queue.length}
                hasHistory={hasHistory}
              />
            </div>
          </>
        )}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {showQueue && (
        <Queue
          queue={queue}
          onRemove={handleRemoveSong}
          onAddToPlaylist={handleAddToPlaylist}
          onClose={() => setShowQueue(false)}
        />
      )}

      {showPlaylist && (
        <Playlist
          playlist={playlist}
          onRemove={handleRemoveFromPlaylist}
          onAddToQueue={handleAddPlaylistSongToQueue}
          onClose={() => setShowPlaylist(false)}
        />
      )}

      {showSearch && (
        <SearchPanel
          onSelectSong={handleAddSong}
          onClose={() => setShowSearch(false)}
          isSearching={isSearching}
          setIsSearching={setIsSearching}
        />
      )}

      {showViewers && (
        <ViewersList
          viewers={viewers}
          onClose={() => setShowViewers(false)}
        />
      )}

      {activeTab === 'me' && (
        <>
          <ProfilePage
            user={user}
            roomId={roomId}
            onClose={() => setActiveTab('queue')}
          />
        </>
      )}

      {showLikedSongs && (
        <LikedSongs
          likedSongs={likedSongs}
          onClose={() => setShowLikedSongs(false)}
          onPlaySong={handlePlayLikedSong}
          onUnlike={handleUnlike}
        />
      )}

      {showNotifications && (
        <NotificationsPanel
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
        />
      )}

      <audio
        ref={audioRef}
        preload="auto"
        crossOrigin="anonymous"
        onLoadStart={() => {
          console.log('[v0] Audio loading started')
        }}
        onCanPlay={() => {
          console.log('[v0] Audio can play - ready to start')
        }}
        onLoadedMetadata={() => {
          console.log('[v0] Audio metadata loaded, duration:', audioRef.current?.duration)
        }}
        onPlaying={() => {
          console.log('[v0] Audio is now playing')
          // End initial load phase once audio starts playing successfully
          initialLoadRef.current = false
        }}
        onEnded={() => {
          console.log('[v0] Audio ended naturally - backend will handle song transition')

          // Clear all preloaded audio if this was the last song
          if (queue.length === 0) {
            console.log('[v0] Last song finished - clearing all preloaded audio')
            preloadedAudioRef.current.forEach(audio => {
              audio.pause()
              audio.src = ''
            })
            preloadedAudioRef.current.clear()
            preloadingInProgressRef.current.clear()
          }

          // DO NOT emit 'skip' here - backend tick() already detects song end
          // Emitting skip here causes double-shift of queue (skips 2 songs)
        }}
        onError={(e) => {
          const audioElement = e.currentTarget as HTMLAudioElement
          const error = audioElement.error

          // Don't show errors during initial load (first 3 seconds after joining)
          if (initialLoadRef.current) {
            console.log('[v0] Ignoring error during initial load phase')
            return
          }

          // Don't skip if audio has played successfully (currentTime > 5s) - likely just a temporary glitch
          if (audioElement.currentTime > 5) {
            console.log('[v0] Ignoring error - audio has played successfully for 5+ seconds')
            return
          }

          // Don't skip if audio is currently playing fine
          if (!audioElement.paused && audioElement.readyState >= 2 && !audioElement.error) {
            console.log('[v0] Ignoring error - audio is playing fine')
            return
          }

          if (error) {
            let errorMsg = 'Unknown audio error'
            let shouldSkip = false

            if (error.code === error.MEDIA_ERR_NETWORK) {
              errorMsg = 'Network error loading audio'
              console.error('[v0] Network error:', error.message)
              shouldSkip = true
            } else if (error.code === error.MEDIA_ERR_DECODE) {
              errorMsg = 'Audio file corrupted'
              console.error('[v0] Decode error:', error.message)
              shouldSkip = true
            } else if (error.code === error.MEDIA_ERR_SRC_NOT_SUPPORTED) {
              const isWebM = audioElement.src.includes('.webm') || audioElement.src.includes('youtube')

              if (isWebM && isTelegramWebView) {
                errorMsg = 'WebM not supported in Telegram'
                console.error('[v0] WebM codec not available in Telegram WebView')
                shouldSkip = true
              } else if (isWebM) {
                errorMsg = 'Loading audio...'
                console.log('[v0] WebM file detected, giving more time to load')
                setTimeout(() => {
                  if (audioElement.error && audioElement.readyState < 2) {
                    console.error('[v0] WebM still failed after delay')
                    showToast('Audio source not available', 'error')
                    if (socket) {
                      socket.emit('skip', { roomId })
                    }
                  }
                }, 5000)
                return
              } else {
                errorMsg = 'Audio source not available'
                console.error('[v0] Format not supported or URL invalid:', audioElement.src)
                shouldSkip = true
              }
            } else if (error.code === error.MEDIA_ERR_ABORTED) {
              console.log('[v0] Playback aborted by user - not skipping')
              return
            }

            console.error('[v0] Audio error:', {
              code: error.code,
              message: error.message,
              src: audioElement.src,
              readyState: audioElement.readyState,
              networkState: audioElement.networkState,
              paused: audioElement.paused,
            })

            showToast(errorMsg, 'error')

            // Only skip on critical errors, not temporary buffering issues
            // Increased delay to 10 seconds to give songs more time to load
            if (shouldSkip && audioElement.currentTime < 10) {
              setTimeout(() => {
                // Double-check error still exists and song hasn't started playing
                if (socket && audioElement.error && audioElement.currentTime < 10) {
                  console.log('[v0] Auto-skipping due to persistent critical error after 10s delay')
                  console.log('[v0] Error details:', {
                    code: audioElement.error.code,
                    message: audioElement.error.message,
                    src: audioElement.src,
                    currentTime: audioElement.currentTime
                  })
                  socket.emit('skip', {
                    roomId,
                  })
                }
              }, 10000) // Increased from 8000 to 10000ms
            }
          }
        }}
      />

      {/* Video element for YouTube/Spotify MP4 files (hidden, audio-only playback) */}
      <video
        ref={videoRef}
        preload="auto"
        crossOrigin="anonymous"
        style={{ display: 'none' }} // Hide video, only play audio
        playsInline // Prevent fullscreen on mobile
        onLoadStart={() => {
          console.log('[v0] Video loading started')
        }}
        onCanPlay={() => {
          console.log('[v0] Video can play - ready to start')
        }}
        onLoadedMetadata={() => {
          console.log('[v0] Video metadata loaded, duration:', videoRef.current?.duration)
        }}
        onPlaying={() => {
          console.log('[v0] Video is now playing (audio only)')
        }}
        onEnded={() => {
          console.log('[v0] Video ended naturally - backend will handle song transition')
          // DO NOT emit 'skip' here - backend tick() already detects song end
          // Emitting skip here causes double-shift of queue (skips 2 songs)
        }}
        onError={(e) => {
          const videoElement = e.currentTarget as HTMLVideoElement
          const error = videoElement.error

          // Don't skip if video is already playing successfully (increased tolerance to 5 seconds)
          if (videoElement.currentTime > 5 || (!videoElement.paused && videoElement.readyState >= 2)) {
            console.log('[v0] Ignoring video error - playback is fine (currentTime:', videoElement.currentTime, ')')
            return
          }

          if (error) {
            // CRITICAL FIX: Don't show error if no song is playing or no src
            if (!state.currentSong || !videoElement.src || videoElement.src === '') {
              console.log('[v0] Ignoring video error - no song loaded')
              return
            }


            const errorDetails = {
              code: error.code,
              message: error.message,
              src: videoElement.src,
              source: state.currentSong?.source || 'unknown',
              title: state.currentSong?.title || 'unknown',
              currentTime: videoElement.currentTime,
              readyState: videoElement.readyState
            }
            console.error('[v0] Video error:', errorDetails)

            // Better error message with actual error code
            const errorMsg = error.code === 4
              ? 'Format not supported'
              : error.code === 3
                ? 'Decode error'
                : error.code === 2
                  ? 'Network error'
                  : error.code === 1
                    ? 'Aborted'
                    : `Error code ${error.code || 'undefined'}`

            showToast(`Video error (${state.currentSong?.source}): ${errorMsg}`, 'error')

            setTimeout(() => {
              if (socket && videoElement.error) {
                console.log('[v0] Auto-skipping due to video error:', errorDetails)
                socket.emit('skip', { roomId })
              }
            }, 3000)
          }
        }}
      />


      {toasts.length > 0 && (
        <ToastNotification
          key={toasts[0].id}
          message={toasts[0].message}
          type={toasts[0].type}
          onClose={() => removeToast(toasts[0].id)}
        />
      )}

      {/* Winter Snow Overlay - Can be easily disabled by setting enabled={false} */}
      <WinterOverlay enabled={true} />
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

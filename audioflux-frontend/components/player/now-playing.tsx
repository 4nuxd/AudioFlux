'use client'

import { UserPlus } from 'lucide-react'
import LyricsDisplay from './lyrics-display'
import { useState } from 'react'

interface Song {
  id: string
  title: string
  artists: string | string[]
  duration: number
  thumbnail?: string
  addedBy?: string | { username?: string, firstName?: string, name?: string, id: string }
}

interface RoomMetadata {
  isPrivate: boolean
  ownerId: number
  ownerName: string
}

interface NowPlayingProps {
  currentSong: Song | null
  roomMetadata?: RoomMetadata | null
  currentUserId?: number
  botUsername?: string
  roomId?: string
  currentTime?: number
}

export default function NowPlaying({ currentSong, roomMetadata, currentUserId, botUsername, roomId, currentTime = 0 }: NowPlayingProps) {
  const isPrivateRoom = roomMetadata?.isPrivate || false
  const isOwner = currentUserId && roomMetadata?.ownerId === currentUserId
  const [isFlipped, setIsFlipped] = useState(false)

  const handleInvite = () => {
    if (!botUsername || !roomId) return

    const inviteLink = `https://t.me/${botUsername}?start=room_${roomId}`
    const shareText = '🎵 Join my private music room!'
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`

    // Haptic feedback
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium')
    }

    // Open Telegram share dialog
    window.open(shareUrl, '_blank')
  }

  if (!currentSong) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3">
        <div className="h-64 w-64 rounded-3xl backdrop-blur-3xl bg-white/60 saturate-[180%] flex items-center justify-center shadow-[0_20px_60px_rgba(0,0,0,0.15)] border-2 border-white/40 ring-1 ring-black/5">
          <span className="text-8xl">🎵</span>
        </div>
        <p className="text-center text-muted-foreground font-medium text-sm">
          No song playing
        </p>
      </div>
    )
  }

  let addedByName = ''
  if (currentSong.addedBy) {
    if (typeof currentSong.addedBy === 'string') {
      addedByName = currentSong.addedBy
    } else {
      const user = currentSong.addedBy
      addedByName = user.username || user.firstName || user.name || `User ${user.id}`
    }
  }

  const artistsText = Array.isArray(currentSong.artists)
    ? currentSong.artists.join(', ')
    : currentSong.artists

  return (
    <div className="flex flex-col items-center space-y-3">
      {currentSong.thumbnail ? (
        <div
          className="relative group cursor-pointer"
          style={{ perspective: '1000px' }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div
            className="relative transition-transform duration-600 ease-out"
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            {/* Front - Album Art */}
            <div
              className="relative"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-300/40 via-cyan-300/40 to-sky-200/40 rounded-3xl blur-[60px] group-hover:blur-[80px] transition-all duration-700 animate-pulse"></div>
              <img
                src={currentSong.thumbnail || "/placeholder.svg"}
                alt={currentSong.title}
                width={256}
                height={256}
                className="relative h-64 w-64 rounded-3xl object-cover shadow-[0_25px_70px_rgba(0,0,0,0.25)] border-[3px] border-white/70 ring-2 ring-white/30 backdrop-blur-xl"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.svg";
                }}
              />



              {/* Invite Button - Only show for private room owners */}
              {isPrivateRoom && isOwner && !isFlipped && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInvite();
                  }}
                  className="absolute top-2 right-2 h-10 w-10 rounded-full backdrop-blur-3xl bg-white/90 saturate-[180%] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 shadow-lg border border-white/40 group/invite z-10"
                  title="Invite Friends"
                >
                  <UserPlus className="w-5 h-5 text-purple-600 group-hover/invite:text-purple-700" strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Back - Lyrics */}
            <div
              className="absolute inset-0 h-64 w-64 rounded-2xl overflow-hidden shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
              }}
            >
              <LyricsDisplay
                artist={artistsText}
                title={currentSong.title}
                songId={currentSong.id}
                currentTime={currentTime}
                isFlipped={isFlipped}
              />


            </div>
          </div>


        </div>
      ) : (
        <div className="h-64 w-64 rounded-3xl backdrop-blur-3xl bg-white/60 saturate-[180%] flex items-center justify-center shadow-[0_20px_60px_rgba(0,0,0,0.15)] border-2 border-white/40">
          <span className="text-8xl">🎶</span>
        </div>
      )}

      <div className="text-center space-y-2 px-6 max-w-sm w-full">
        <h2 className="text-2xl font-bold text-foreground line-clamp-1 leading-snug">
          {currentSong.title}
        </h2>
        <p className="text-base text-muted-foreground font-medium line-clamp-1">
          {artistsText}
        </p>
        {addedByName && (
          <div className="flex justify-center mt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-2xl bg-white/50 saturate-[180%] rounded-full text-xs font-medium text-muted-foreground border border-white/40 shadow-sm max-w-[200px]">
              <span className="text-[10px]">🎵</span>
              <span className="truncate">Added by {addedByName}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

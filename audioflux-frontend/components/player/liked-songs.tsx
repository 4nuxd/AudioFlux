'use client'

import { X, Heart, Play } from 'lucide-react'

interface Song {
  id: string
  title: string
  artists: string | string[]
  duration: number
  thumbnail?: string
  likedAt?: number
}

interface LikedSongsProps {
  likedSongs: Song[]
  onClose: () => void
  onPlaySong: (song: Song) => void
  onUnlike: (songId: string) => void
}

export default function LikedSongs({ likedSongs, onClose, onPlaySong, onUnlike }: LikedSongsProps) {
  const formatArtists = (artists: string | string[]) => {
    if (Array.isArray(artists)) {
      return artists.join(', ')
    }
    return artists
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-end animate-in fade-in duration-300">
      <div className="w-full glass-panel rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 glass-strong border-b-2 border-white/20 px-6 py-5 flex items-center justify-between backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-500" fill="currentColor" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Liked Songs</h2>
              <p className="text-sm text-foreground/60">{likedSongs.length} songs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full glass-strong hover:bg-white/20 transition-all duration-300 flex items-center justify-center text-foreground/70 hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Liked Songs List */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {likedSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="h-20 w-20 rounded-full glass-strong flex items-center justify-center">
                <Heart className="w-10 h-10 text-foreground/30" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground/80">No liked songs yet</p>
                <p className="text-sm text-foreground/50 mt-1">
                  Start liking songs to build your collection
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {likedSongs.map((song) => (
                <div
                  key={song.id}
                  className="glass-card rounded-2xl p-3 flex items-center gap-3 hover:bg-white/10 transition-all duration-300"
                >
                  {/* Thumbnail */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={song.thumbnail || "/placeholder.svg"}
                      alt={song.title}
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                  </div>

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate line-clamp-1">
                      {song.title}
                    </h3>
                    <p className="text-xs text-foreground/60 truncate line-clamp-1">
                      {formatArtists(song.artists)}
                    </p>
                    <p className="text-xs text-foreground/40 mt-0.5">
                      {formatDuration(song.duration)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onPlaySong(song)}
                      className="h-9 w-9 rounded-xl glass-strong hover:bg-white/20 transition-all flex items-center justify-center"
                      title="Play"
                    >
                      <Play className="w-4 h-4 text-foreground" fill="currentColor" />
                    </button>
                    <button
                      onClick={() => onUnlike(song.id)}
                      className="h-9 w-9 rounded-xl glass-strong hover:bg-red-500/20 transition-all flex items-center justify-center"
                      title="Unlike"
                    >
                      <Heart className="w-4 h-4 text-red-500" fill="currentColor" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

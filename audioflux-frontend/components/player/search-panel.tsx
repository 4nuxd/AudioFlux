'use client'

import { useState, useCallback } from 'react'

interface Song {
  id: string
  title: string
  artists: string | string[]
  duration: number
  thumbnail?: string
  source?: 'saavn' | 'youtube'
  videoId?: string
  url?: string
  downloadUrl?: string
  relevanceScore?: number // Added relevance score from combined API
}

interface SearchPanelProps {
  onSelectSong: (song: Song) => void
  onClose: () => void
  isSearching: boolean
  setIsSearching: (value: boolean) => void
}

export default function SearchPanel({
  onSelectSong,
  onClose,
  isSearching,
  setIsSearching,
}: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Song[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!query.trim()) return

      console.log('[v0] Searching for:', query)
      setIsSearching(true)
      setHasSearched(true)

      try {
        // Use environment variable with fallback
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_WS_URL || 'your_backend_url_here'
        const searchUrl = `${apiUrl}/api/search/combined?query=${encodeURIComponent(query)}`
        console.log('[v0] Combined search URL:', searchUrl)

        const res = await fetch(searchUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!res.ok) {
          console.error('[v0] Search request failed:', res.status, res.statusText)
          const errorText = await res.text()
          console.error('[v0] Error response:', errorText)
          setResults([])
          setIsSearching(false)
          // Show error to user
          alert(`Search failed: ${res.status} ${res.statusText}. Please try again.`)
          return
        }

        const data = await res.json()

        console.log('[v0] Combined search response:', {
          status: res.status,
          success: data.success,
          query: data.query,
          totalResults: data.totalResults,
          songsCount: data?.songs?.length || 0,
        })

        const songs = data?.songs || []

        if (!Array.isArray(songs)) {
          console.error('[v0] Songs is not an array:', songs)
          setResults([])
          setIsSearching(false)
          return
        }

        const mappedSongs = songs.map((song: any) => ({
          id: song.id,
          title: song.title,
          artists: song.artists,
          duration: song.duration,
          thumbnail: song.thumbnail,
          source: song.source,
          videoId: song.videoId,
          url: song.url,
          downloadUrl: song.downloadUrl,
          relevanceScore: song.relevanceScore, // Include relevance score
        }))

        console.log('[v0] Mapped songs with relevance:', mappedSongs.slice(0, 5).map(s => ({
          title: s.title,
          source: s.source,
          relevanceScore: s.relevanceScore,
          hasDownloadUrl: !!s.downloadUrl,
        })))

        setResults(mappedSongs)

        if (mappedSongs.length === 0) {
          console.log('[v0] No songs found for query:', query)
        } else {
          console.log('[v0] Found', mappedSongs.length, 'combined results (JioSaavn + YouTube + Spotify)')
        }
      } catch (error) {
        console.error('[v0] Search error:', error)
        setResults([])
        // Show error to user
        alert(`Search error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your connection.`)
      } finally {
        setIsSearching(false)
      }
    },
    [query, setIsSearching]
  )

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-end animate-in fade-in duration-300">
      <div className="w-full glass-panel rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="sticky top-0 glass-strong border-b-2 border-white/20 px-6 py-5 flex items-center justify-between backdrop-blur-2xl">
          <div>
            <h2 className="text-xl font-bold text-foreground">Add Song</h2>
            <p className="text-sm text-foreground/60">Search all platforms</p>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full glass-strong hover:bg-white/20 transition-all duration-300 flex items-center justify-center text-foreground/70 hover:text-foreground"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 glass-card border-b-2 border-white/10">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search songs, artists..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-5 py-4 glass-strong rounded-2xl text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/30 transition-all duration-300 shadow-lg"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-7 py-4 glass-strong rounded-2xl font-semibold text-foreground hover:scale-105 hover:bg-white/95 disabled:opacity-50 transition-all duration-300 shadow-xl flex items-center gap-2"
            >
              {isSearching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground"></div>
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Search</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {!hasSearched && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="h-24 w-24 rounded-full glass-card flex items-center justify-center text-4xl shadow-xl">
                🔍
              </div>
              <p className="text-center text-foreground/60 font-medium">Search for songs</p>
              <p className="text-sm text-foreground/40">Find tracks from JioSaavn, YouTube, and Spotify</p>
            </div>
          )}

          {hasSearched && results.length === 0 && !isSearching && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="h-24 w-24 rounded-full glass-card flex items-center justify-center text-4xl shadow-xl">
                😕
              </div>
              <p className="text-center text-foreground/60 font-medium">No results found</p>
              <p className="text-sm text-foreground/40">Try different keywords</p>
            </div>
          )}

          {results.map((song) => (
            <button
              key={song.id}
              onClick={() => {
                console.log('[v0] Song selected:', song.title, 'source:', song.source)
                onSelectSong(song)
              }}
              className="w-full text-left glass-card rounded-2xl p-4 hover:bg-white/95 hover:scale-[1.01] transition-all duration-300 flex gap-3 shadow-xl group"
            >
              <div className="flex-shrink-0 h-16 w-16 rounded-xl overflow-hidden glass-strong shadow-lg">
                {song.thumbnail ? (
                  <img
                    src={song.thumbnail || "/placeholder.svg"}
                    alt={song.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-2xl">
                    🎵
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-semibold text-foreground line-clamp-1">{song.title}</p>
                <p className="text-sm text-foreground/60 line-clamp-1">
                  {Array.isArray(song.artists) ? song.artists.join(', ') : song.artists}
                </p>
                <div className="flex items-center gap-2 text-xs text-foreground/40">
                  <span>{formatDuration(song.duration)}</span>
                  {song.source && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{song.source}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center">
                <div className="h-10 w-10 rounded-full glass-strong flex items-center justify-center text-foreground font-bold text-xl group-hover:scale-110 transition-all duration-300 hover:bg-primary/20">
                  +
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

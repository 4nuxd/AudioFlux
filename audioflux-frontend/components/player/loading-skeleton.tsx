'use client'

export function SongCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-xl bg-white/20"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/20 rounded-full w-3/4"></div>
          <div className="h-3 bg-white/20 rounded-full w-1/2"></div>
        </div>
      </div>
    </div>
  )
}

export function AlbumArtSkeleton() {
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="h-64 w-64 rounded-3xl glass-strong animate-pulse"></div>
      <div className="space-y-2 w-48">
        <div className="h-5 bg-white/20 rounded-full animate-pulse"></div>
        <div className="h-4 bg-white/20 rounded-full w-3/4 animate-pulse"></div>
      </div>
    </div>
  )
}

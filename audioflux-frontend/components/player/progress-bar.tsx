'use client'

interface ProgressBarProps {
  currentTime: number
  duration: number
  onSeek?: (time: number) => void
}

export default function ProgressBar({ currentTime, duration, onSeek }: ProgressBarProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full space-y-2">
      <div 
        className="relative h-2.5 glass-strong rounded-full overflow-hidden shadow-lg"
      >
        <div 
          className="absolute inset-0 bg-gradient-to-r from-blue-400/30 via-purple-400/30 to-pink-400/30 opacity-50"
        />
        
        <div
          className="relative h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 shadow-xl"
          style={{ width: `${Math.max(progress, 0)}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>
      </div>

      <div className="flex justify-between text-xs text-foreground/70 font-medium px-1">
        <span className="tabular-nums">{formatTime(currentTime)}</span>
        <span className="tabular-nums">{formatTime(duration)}</span>
      </div>
    </div>
  )
}

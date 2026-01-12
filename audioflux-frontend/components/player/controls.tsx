'use client'

import { Play, Pause, SkipForward, SkipBack, Heart, Repeat, Repeat1, Sparkles } from 'lucide-react'
import { useState } from 'react'

interface ControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  onSkip: () => void
  onPrevious: () => void
  currentSong?: {
    id: string
    title: string
    artists: string | string[]
    downloadUrl?: string
  } | null
  onToggleLike?: (songId: string) => void
  isLiked?: boolean
  loopMode?: 'none' | 'one' | 'all'
  onToggleLoop?: () => void
  autoPlayEnabled?: boolean
  onToggleAutoPlay?: () => void
  queueLength?: number
  hasHistory?: boolean
}

export default function Controls({
  isPlaying,
  onPlayPause,
  onSkip,
  onPrevious,
  currentSong,
  onToggleLike,
  isLiked = false,
  loopMode = 'none',
  onToggleLoop,
  autoPlayEnabled = false,
  onToggleAutoPlay,
  queueLength = 0,
  hasHistory = false,
}: Omit<ControlsProps, 'onAddSong' | 'onQueue'>) {
  const handleHaptic = () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium')
    }
  }

  const playPauseClick = () => {
    handleHaptic()
    onPlayPause()
  }

  const skipClick = () => {
    handleHaptic()
    onSkip()
  }

  const likeClick = () => {
    handleHaptic()
    if (currentSong?.id && onToggleLike) {
      onToggleLike(currentSong.id)
    }
  }

  const loopClick = () => {
    handleHaptic()
    if (onToggleLoop) {
      onToggleLoop()
    }
  }

  const previousClick = () => {
    handleHaptic()
    if (onPrevious) {
      onPrevious()
    }
  }

  const autoPlayClick = () => {
    handleHaptic()
    if (onToggleAutoPlay) {
      onToggleAutoPlay()
    }
  }

  // Disable states
  const canLoop = currentSong && isPlaying
  const canSkip = queueLength > 0
  const canPrevious = hasHistory

  return (
    <div className="space-y-3">
      {/* Auto-Play Toggle - Small button above main controls */}
      <div className="flex justify-center">
        <button
          onClick={autoPlayClick}
          className={`px-4 py-1.5 rounded-full backdrop-blur-3xl ${autoPlayEnabled
              ? 'bg-purple-500/20 border-purple-500/40'
              : 'bg-white/10 border-white/20'
            } saturate-[180%] flex items-center gap-2 hover:scale-105 hover:bg-white/20 active:scale-95 transition-all duration-200 shadow-lg border text-xs font-medium`}
          title={autoPlayEnabled ? 'Auto-Play: On' : 'Auto-Play: Off'}
        >
          <Sparkles
            className={`w-3.5 h-3.5 ${autoPlayEnabled ? 'text-purple-400' : 'text-foreground/70'}`}
            strokeWidth={2}
            fill={autoPlayEnabled ? 'currentColor' : 'none'}
          />
          <span className={autoPlayEnabled ? 'text-purple-400' : 'text-foreground/70'}>
            Auto-Play
          </span>
        </button>
      </div>

      {/* Main Controls */}
      <div className="flex gap-4 justify-center items-center">
        {/* Like Button */}
        <button
          onClick={likeClick}
          disabled={!currentSong}
          className={`h-12 w-12 rounded-2xl backdrop-blur-3xl ${isLiked
            ? 'bg-red-500/20 border-red-500/40'
            : 'bg-white/10 border-white/20'
            } saturate-[180%] flex items-center justify-center hover:scale-110 hover:bg-white/20 active:scale-95 transition-all duration-200 shadow-lg border disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100`}
          title={isLiked ? 'Unlike Song' : 'Like Song'}
        >
          <Heart
            className={`w-5 h-5 ${isLiked ? 'text-red-500' : 'text-foreground'}`}
            strokeWidth={2}
            fill={isLiked ? 'currentColor' : 'none'}
          />
        </button>

        {/* Previous Button */}
        <button
          onClick={previousClick}
          disabled={!canPrevious}
          className="h-12 w-12 rounded-2xl backdrop-blur-3xl bg-white/10 saturate-[180%] flex items-center justify-center hover:scale-110 hover:bg-white/20 active:scale-95 transition-all duration-200 shadow-lg border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
          title={canPrevious ? 'Previous' : 'Previous: No song history'}
        >
          <SkipBack className="w-5 h-5 text-foreground" strokeWidth={2} />
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={playPauseClick}
          className="h-16 w-16 rounded-2xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl text-foreground flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/40"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-7 h-7" strokeWidth={2.5} fill="currentColor" />
          ) : (
            <Play className="w-7 h-7 ml-1" strokeWidth={2.5} fill="currentColor" />
          )}
        </button>

        {/* Next/Skip Button */}
        <button
          onClick={skipClick}
          disabled={!canSkip}
          className="h-12 w-12 rounded-2xl backdrop-blur-3xl bg-white/10 saturate-[180%] flex items-center justify-center hover:scale-110 hover:bg-white/20 active:scale-95 transition-all duration-200 shadow-lg border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
          title={canSkip ? 'Next' : 'Next: No songs in queue'}
        >
          <SkipForward className="w-5 h-5 text-foreground" strokeWidth={2} />
        </button>

        {/* Loop Button */}
        <button
          onClick={loopClick}
          disabled={!canLoop}
          className={`h-12 w-12 rounded-2xl backdrop-blur-3xl ${loopMode !== 'none'
            ? 'bg-blue-500/20 border-blue-500/40'
            : 'bg-white/10 border-white/20'
            } saturate-[180%] flex items-center justify-center hover:scale-110 hover:bg-white/20 active:scale-95 transition-all duration-200 shadow-lg border disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100`}
          title={
            !canLoop
              ? 'Loop: No song playing'
              : loopMode === 'none'
                ? 'Loop: Off'
                : loopMode === 'one'
                  ? 'Loop: Current Song'
                  : 'Loop: All Songs'
          }
        >
          {loopMode === 'one' ? (
            <Repeat1
              className={`w-5 h-5 ${loopMode !== 'none' ? 'text-blue-400' : 'text-foreground'}`}
              strokeWidth={2}
            />
          ) : (
            <Repeat
              className={`w-5 h-5 ${loopMode !== 'none' ? 'text-blue-400' : 'text-foreground'}`}
              strokeWidth={2}
            />
          )}
        </button>
      </div>


    </div>
  )
}

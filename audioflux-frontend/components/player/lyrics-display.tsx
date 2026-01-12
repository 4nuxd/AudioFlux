'use client'

import { useState, useEffect, useRef } from 'react'

interface LyricsLine {
    time: number
    text: string
}

interface LyricsDisplayProps {
    artist: string
    title: string
    songId?: string  // JioSaavn song ID for better lyrics fetching
    currentTime: number
    isFlipped: boolean
}

export default function LyricsDisplay({
    artist,
    title,
    songId,
    currentTime,
    isFlipped
}: LyricsDisplayProps) {
    const [lyrics, setLyrics] = useState<LyricsLine[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [currentLine, setCurrentLine] = useState(0)
    const lyricsRef = useRef<HTMLDivElement>(null)

    // Fetch lyrics when flipped
    useEffect(() => {
        if (!isFlipped || !artist || !title) return

        setLoading(true)
        setError(null)

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        // Build URL with optional songId for better JioSaavn lyrics
        const url = songId
            ? `${API_URL}/api/lyrics/${encodeURIComponent(artist)}/${encodeURIComponent(title)}?songId=${songId}`
            : `${API_URL}/api/lyrics/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`

        console.log('[Lyrics] Fetching from:', url, { artist, title, songId })

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error('Lyrics not found')
                return res.json()
            })
            .then(data => {
                console.log('[Lyrics] Received:', data.source, data.lyrics?.length, 'lines')
                if (data.lyrics && Array.isArray(data.lyrics)) {
                    setLyrics(data.lyrics)
                    setLoading(false)
                } else {
                    throw new Error('Invalid lyrics format')
                }
            })
            .catch(err => {
                console.error('Failed to fetch lyrics:', err)
                setError('Lyrics not available')
                setLoading(false)
            })
    }, [artist, title, songId, isFlipped])

    // Update current line based on time
    useEffect(() => {
        if (!lyrics.length || !isFlipped) return

        const index = lyrics.findIndex((line, i) => {
            const nextLine = lyrics[i + 1]
            return currentTime >= line.time && (!nextLine || currentTime < nextLine.time)
        })

        if (index !== -1 && index !== currentLine) {
            setCurrentLine(index)

            // Auto-scroll to current line
            if (lyricsRef.current) {
                const lineElement = lyricsRef.current.children[index] as HTMLElement
                if (lineElement) {
                    lineElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    })
                }
            }
        }
    }, [currentTime, lyrics, isFlipped, currentLine])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/70">Loading lyrics...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center px-6">
                    <svg className="w-16 h-16 text-white/50 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-white/70">{error}</p>
                    <p className="text-white/50 text-sm mt-2">Click to go back</p>
                </div>
            </div>
        )
    }

    if (!lyrics.length) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-white/70">No lyrics available</p>
            </div>
        )
    }

    return (
        <div
            ref={lyricsRef}
            className="h-full overflow-y-auto px-6 py-8 scrollbar-hide"
            style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}
        >
            <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>

            {lyrics.map((line, index) => (
                <p
                    key={index}
                    className={`
            text-center py-2 transition-all duration-300 cursor-default
            ${index === currentLine
                            ? 'text-white text-xl font-semibold scale-110 drop-shadow-lg'
                            : 'text-white/50 text-base hover:text-white/70'
                        }
          `}
                    style={{
                        textShadow: index === currentLine ? '0 0 20px rgba(255,255,255,0.5)' : 'none'
                    }}
                >
                    {line.text}
                </p>
            ))}

            {/* Add some padding at the bottom */}
            <div className="h-32"></div>
        </div>
    )
}

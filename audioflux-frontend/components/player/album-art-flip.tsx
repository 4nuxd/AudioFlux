'use client'

import { useState } from 'react'
import LyricsDisplay from './lyrics-display'

interface AlbumArtFlipProps {
    albumArt: string
    artist: string
    title: string
    songId?: string  // JioSaavn song ID
    currentTime: number
}

export default function AlbumArtFlip({
    albumArt,
    artist,
    title,
    songId,
    currentTime
}: AlbumArtFlipProps) {
    const [isFlipped, setIsFlipped] = useState(false)

    return (
        <div className="relative w-full aspect-square" style={{ perspective: '1000px' }}>
            <div
                className="relative w-full h-full cursor-pointer transition-transform duration-600 ease-out"
                onClick={() => setIsFlipped(!isFlipped)}
                style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
            >
                {/* Front - Album Art (Original Style) */}
                <div
                    className="absolute inset-0 group"
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden'
                    }}
                >
                    {/* Gradient Glow Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400/40 via-purple-400/40 to-pink-400/40 rounded-3xl blur-[60px] group-hover:blur-[80px] transition-all duration-700 animate-pulse"></div>

                    {/* Album Art Image */}
                    <img
                        src={albumArt || "/placeholder.svg"}
                        alt={title}
                        width={256}
                        height={256}
                        className="relative h-64 w-64 rounded-3xl object-cover shadow-[0_25px_70px_rgba(0,0,0,0.25)] border-[3px] border-white/70 ring-2 ring-white/30 backdrop-blur-xl"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/placeholder.svg";
                        }}
                    />


                </div>

                {/* Back - Lyrics */}
                <div
                    className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl"
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
                    }}
                >
                    <LyricsDisplay
                        artist={artist}
                        title={title}
                        songId={songId}
                        currentTime={currentTime}
                        isFlipped={isFlipped}
                    />



                    {/* Decorative Elements */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
                        <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-white blur-2xl"></div>
                        <div className="absolute bottom-10 right-10 w-32 h-32 rounded-full bg-white blur-3xl"></div>
                    </div>
                </div>
            </div>
        </div>
    )
}

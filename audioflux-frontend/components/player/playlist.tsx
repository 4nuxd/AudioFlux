'use client'

interface Song {
    id: string
    title: string
    artists: string | string[]
    addedBy?: string | {
        id: number
        firstName?: string
        name?: string
        username?: string
        photoUrl?: string
    }
    thumbnail?: string
    addedAt?: string
}

interface PlaylistProps {
    playlist: Song[]
    onRemove: (songId: string) => void
    onAddToQueue: (song: Song) => void
    onClose: () => void
}

export default function Playlist({ playlist, onRemove, onAddToQueue, onClose }: PlaylistProps) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-end animate-in fade-in duration-300">
            <div className="w-full glass-panel rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="sticky top-0 glass-strong border-b-2 border-white/20 px-6 py-5 flex items-center justify-between backdrop-blur-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">My Playlist</h2>
                        <p className="text-sm text-foreground/60">{playlist.length} songs saved</p>
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

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {playlist.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-3">
                            <div className="h-24 w-24 rounded-full glass-card flex items-center justify-center text-4xl shadow-xl">
                                🎵
                            </div>
                            <p className="text-center text-foreground/60 font-medium">Playlist is empty</p>
                            <p className="text-sm text-foreground/40">Add songs from the queue</p>
                        </div>
                    ) : (
                        playlist.map((song, index) => {
                            return (
                                <div
                                    key={song.id + index}
                                    className="glass-card rounded-2xl p-4 flex items-center gap-3 hover:bg-white/95 hover:scale-[1.01] transition-all duration-300 group shadow-xl"
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
                                        <p className="font-semibold text-foreground line-clamp-1">
                                            {song.title}
                                        </p>
                                        <p className="text-sm text-foreground/60 line-clamp-1">
                                            {Array.isArray(song.artists) ? song.artists.join(', ') : song.artists}
                                        </p>
                                    </div>

                                    <div className="flex gap-2 transition-opacity duration-300">
                                        {/* Add to Queue Button */}
                                        <button
                                            onClick={() => onAddToQueue(song)}
                                            className="h-9 w-9 rounded-full glass-strong hover:bg-green-500/30 transition-all duration-300 flex items-center justify-center text-green-600 hover:text-green-500"
                                            title="Add to queue"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>

                                        {/* Remove from Playlist Button */}
                                        <button
                                            onClick={() => onRemove(song.id)}
                                            className="h-9 w-9 rounded-full glass-strong hover:bg-red-500/30 transition-all duration-300 flex items-center justify-center text-red-600 hover:text-red-500"
                                            title="Remove from playlist"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}

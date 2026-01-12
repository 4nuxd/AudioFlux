'use client'

interface InvalidRoomProps {
  onGoBack: () => void
}

export default function InvalidRoom({ onGoBack }: InvalidRoomProps) {
  const angryEmojis = ['😡', '😠', '🤬', '💢', '😤', '👿', '😾', '💥']
  const emojiCount = 20
  
  return (
    <div className="h-screen overflow-y-auto flex flex-col items-center justify-center gradient-mesh px-4 pb-16 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: emojiCount }).map((_, i) => {
          const randomEmoji = angryEmojis[Math.floor(Math.random() * angryEmojis.length)]
          const randomLeft = Math.random() * 100
          const randomDelay = Math.random() * 5
          const randomDuration = 3 + Math.random() * 4
          const randomSize = 24 + Math.random() * 32
          
          return (
            <div
              key={i}
              className="absolute animate-bubble-up"
              style={{
                left: `${randomLeft}%`,
                bottom: '-50px',
                animationDelay: `${randomDelay}s`,
                animationDuration: `${randomDuration}s`,
                fontSize: `${randomSize}px`,
                opacity: 0.6 + Math.random() * 0.4,
              }}
            >
              {randomEmoji}
            </div>
          )
        })}
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="glass-card rounded-3xl p-8 space-y-8 shadow-2xl">
          <div className="flex justify-center">
            <div className="h-24 w-24 rounded-full glass-strong flex items-center justify-center shadow-lg bg-destructive/10 animate-pulse">
              <span className="text-5xl">😡</span>
            </div>
          </div>

          <div className="space-y-4 text-center">
            <h1 className="text-3xl font-bold text-destructive text-balance">
              Where are you trying to sneak in? 😠
            </h1>
            <p className="text-foreground/70 leading-relaxed">
              This room doesn't exist or you don't have permission! Stop trying to access unauthorized rooms.
            </p>
          </div>

          {/* Button */}
          <button
            onClick={onGoBack}
            className="w-full py-4 px-6 glass-strong rounded-2xl font-semibold text-foreground hover:bg-white/15 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Out of Here!
          </button>
        </div>
      </div>
    </div>
  )
}

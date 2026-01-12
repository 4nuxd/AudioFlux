'use client'

export default function OutsideTelegram() {
  const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || 'audiofluxbot'

  return (
    <div className="h-screen overflow-y-auto flex flex-col items-center justify-center gradient-mesh px-4 pb-16">
      <div className="max-w-md w-full space-y-8">
        <div className="glass-card rounded-3xl p-8 space-y-6 shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="h-24 w-24 rounded-full glass-strong flex items-center justify-center shadow-lg">
              <span className="text-5xl">🎧</span>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-4 text-center">
            <h1 className="text-4xl font-bold text-foreground text-balance">
              AudioFlux
            </h1>
            <p className="text-foreground/80 text-lg leading-relaxed">
              AudioFlux works inside Telegram and Telegram chats.
            </p>
            <p className="text-foreground/60 text-sm leading-relaxed">
              Open it using @audiofluxbot to start listening to synchronized music with your group.
            </p>
          </div>

          {/* Button */}
          <a
            href={`https://t.me/${BOT_USERNAME}`}
            className="block w-full py-4 px-6 glass-strong rounded-2xl font-semibold text-center text-foreground hover:bg-white/15 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            Open @audiofluxbot
          </a>

        </div>
      </div>
    </div>
  )
}

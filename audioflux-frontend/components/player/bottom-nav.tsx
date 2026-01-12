'use client'

interface BottomNavProps {
  activeTab: 'viewers' | 'search' | 'playlist' | 'queue' | 'me'
  onTabChange: (tab: 'viewers' | 'search' | 'playlist' | 'queue' | 'me') => void
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    {
      id: 'viewers' as const,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21l-4.35-4.35" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      label: 'Listeners'
    },
    {
      id: 'search' as const,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </svg>
      ),
      label: 'Search'
    },
    {
      id: 'playlist' as const,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      ),
      label: 'Playlist'
    },
    {
      id: 'queue' as const,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
      label: 'Queue'
    },
    {
      id: 'me' as const,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
          <path d="M12 14v7" />
          <path d="M9 18h6" />
        </svg>
      ),
      label: 'Profile'
    },
  ]

  return (
    <nav className="fixed bottom-[34px] left-3 right-3 rounded-t-2xl backdrop-blur-3xl bg-white/70 saturate-[180%] z-40 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.15)] border-2 border-white/30">
      <div className="flex items-center justify-around px-3 py-2.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-300 ${isActive
                ? 'bg-white/40 backdrop-blur-xl text-foreground scale-105 shadow-lg'
                : 'text-foreground/60 hover:text-foreground hover:bg-white/20 hover:backdrop-blur-xl hover:scale-105'
                }`}
            >
              <div className="w-5 h-5">
                {tab.icon}
              </div>
              <span className={`text-[10px] font-semibold tracking-wide ${isActive ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </nav>
  )
}

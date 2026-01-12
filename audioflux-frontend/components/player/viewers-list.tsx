'use client'

interface User {
  id: number
  first_name?: string
  firstName?: string
  last_name?: string
  lastName?: string
  username?: string
  photo_url?: string
  photoUrl?: string
}

interface ViewersListProps {
  viewers: User[]
  onClose: () => void
}

export default function ViewersList({ viewers, onClose }: ViewersListProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-end animate-in fade-in duration-200">
      <div className="w-full glass-card rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col border-t-2 border-white/10 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 glass-strong border-b border-white/10 px-6 py-4 flex items-center justify-between backdrop-blur-xl">
          <div>
            <h2 className="text-xl font-bold text-foreground">Listening Now</h2>
            <p className="text-sm text-foreground/60">
              {viewers.length} {viewers.length === 1 ? 'listener' : 'listeners'}
            </p>
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

        {/* Viewers List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {viewers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="h-20 w-20 rounded-full glass flex items-center justify-center text-3xl">
                👥
              </div>
              <p className="text-center text-foreground/60 font-medium">No one is listening</p>
              <p className="text-sm text-foreground/40">Invite your friends to join</p>
            </div>
          ) : (
            viewers.map((viewer) => {
              const firstName = viewer.first_name || viewer.firstName || 'User'
              const lastName = viewer.last_name || viewer.lastName || ''
              const photoUrl = viewer.photo_url || viewer.photoUrl
              
              return (
                <div
                  key={viewer.id}
                  className="glass rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-all duration-300 shadow-lg"
                >
                  {/* User Avatar with glow */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 rounded-full bg-primary/30 blur-md"></div>
                    {photoUrl ? (
                      <img
                        src={photoUrl || "/placeholder.svg"}
                        alt={firstName}
                        className="relative h-14 w-14 rounded-full object-cover border-2 border-white/20"
                      />
                    ) : (
                      <div className="relative h-14 w-14 rounded-full glass-strong flex items-center justify-center text-xl font-bold text-primary border-2 border-primary/30">
                        {firstName[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-semibold text-foreground">
                      {firstName} {lastName}
                    </p>
                    {viewer.username && (
                      <p className="text-sm text-foreground/60">
                        @{viewer.username}
                      </p>
                    )}
                    <p className="text-xs text-foreground/40">
                      ID: {viewer.id}
                    </p>
                  </div>

                  {/* Live Indicator */}
                  <div className="flex-shrink-0 flex items-center gap-2 glass-strong px-3 py-1.5 rounded-full">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50"></div>
                    <span className="text-xs font-medium text-foreground/80">Live</span>
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

'use client'

import { useState, useEffect } from 'react'
import WinterOverlay from '@/components/player/winter-overlay'

interface User {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
}

interface JoinRoomProps {
  user: User
  roomId: string
  onJoin: () => void
}

export default function JoinRoom({ user, roomId, onJoin }: JoinRoomProps) {
  const [isJoining, setIsJoining] = useState(false)
  const [isWebAppUser, setIsWebAppUser] = useState(false)

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    const hasRealUser = tg?.initDataUnsafe?.user?.id === user.id
    setIsWebAppUser(hasRealUser)
    console.log('[v0] WebApp user check:', hasRealUser)
  }, [user.id])

  const handleJoinClick = async () => {
    if (!isWebAppUser) {
      return
    }

    setIsJoining(true)

    // If user got here, they are verified
    setTimeout(() => {
      onJoin()
    }, 500)
  }

  return (
    <>
      {/* Winter overlay with same API control */}
      <WinterOverlay enabled={true} />

      <div className="join-room-container h-screen overflow-y-auto flex flex-col items-center justify-center gradient-mesh px-4 pb-16">
        {/* Soft top frost fog */}
        <div className="frost-fog"></div>

        <div className="max-w-md w-full">
          <div className="join-room-card glass-card rounded-3xl p-8 space-y-8 shadow-2xl">
            {!isWebAppUser && (
              <div className="glass-strong rounded-2xl p-4 border-2 border-red-500/30 space-y-3">
                <div className="flex items-center gap-2 text-red-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-semibold">Access Restricted</span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  To verify group membership, you must open this app through the <strong>WebApp button</strong> in your Telegram group.
                </p>
                <p className="text-xs text-foreground/60 leading-relaxed">
                  Go back to your group and use the <strong>/web</strong> command, then click the button that appears.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {/* Profile avatar with ice glow */}
              <div className="flex justify-center">
                {user.photo_url ? (
                  <div className="relative avatar-container">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-lg"></div>
                    <img
                      src={user.photo_url || "/placeholder.svg"}
                      alt={user.first_name}
                      className="avatar-image relative h-24 w-24 rounded-full object-cover border-2 border-white/20 shadow-xl"
                    />
                  </div>
                ) : (
                  <div className="avatar-fallback h-24 w-24 rounded-full glass-strong flex items-center justify-center text-2xl font-bold text-primary shadow-lg">
                    {user.first_name[0]}
                  </div>
                )}
              </div>

              {/* Frosted header panel */}
              <div className="frosted-header text-center space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Hello, {user.first_name}
                </h1>
                {user.username && (
                  <p className="text-foreground/60">@{user.username}</p>
                )}
                <p className="text-sm text-foreground/50">ID: {user.id}</p>
              </div>
            </div>

            {/* Room info card with snowy edges */}
            <div className="room-info-card glass rounded-2xl p-4 space-y-2">
              <p className="text-sm text-foreground/60">
                {roomId.startsWith('private_') ? 'Private Room' : 'Music Room'}
              </p>
              <p className="text-lg font-semibold text-foreground font-mono">
                {roomId.startsWith('private_') ? `...${roomId.slice(-8)}` : roomId}
              </p>
            </div>

            <div className="space-y-3 text-center">
              <p className="text-foreground/70 leading-relaxed">
                Ready to join the synchronized music session?
              </p>
            </div>

            {/* Join button with ice ripple animation */}
            <button
              onClick={handleJoinClick}
              disabled={isJoining || !isWebAppUser}
              className="join-button w-full py-4 px-6 glass-strong rounded-2xl font-semibold text-lg text-foreground hover:bg-white/15 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isJoining ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground"></div>
                  Joining Session...
                </span>
              ) : (
                'Join Music Session'
              )}
            </button>

            {!isWebAppUser && (
              <p className="text-xs text-center text-foreground/50 leading-relaxed">
                This ensures only group members can access the music session
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Winter-specific styles for join room */}
      <style jsx>{`
        /* Winter gradient background */
        .join-room-container {
          background: linear-gradient(
            180deg,
            rgba(246, 249, 252, 0.8) 0%,
            rgba(225, 238, 246, 0.85) 25%,
            rgba(206, 227, 242, 0.9) 65%,
            rgba(174, 230, 247, 0.85) 100%
          );
        }

        /* Soft top frost fog */
        .frost-fog {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 200px;
          background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.25),
            rgba(255, 255, 255, 0)
          );
          pointer-events: none;
          z-index: 1;
        }

        /* Frosted header panel */
        .frosted-header {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.25);
          box-shadow: inset 0 0 20px rgba(174, 230, 247, 0.15);
          border-radius: 1rem;
          padding: 1.5rem;
        }

        /* Ice glow behind avatar */
        .avatar-image,
        .avatar-fallback {
          box-shadow:
            0 0 80px rgba(174, 230, 247, 0.35),
            0 0 25px rgba(174, 230, 247, 0.45) !important;
        }

        /* Snowy edge accents on cards */
        .join-room-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 10%;
          right: 10%;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(174, 230, 247, 0.3),
            transparent
          );
        }

        .join-room-card::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 10%;
          right: 10%;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(174, 230, 247, 0.3),
            transparent
          );
        }

        .room-info-card {
          position: relative;
        }

        .room-info-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(174, 230, 247, 0.4),
            transparent
          );
          border-radius: 1rem 1rem 0 0;
        }

        /* Ice ripple animation on join button */
        @keyframes ice-ripple-join {
          0% {
            box-shadow: 
              0 0 0 0 rgba(174, 230, 247, 0.7),
              inset 0 0 0 0 rgba(255, 255, 255, 0);
          }
          50% {
            box-shadow: 
              0 0 0 20px rgba(174, 230, 247, 0),
              inset 0 0 30px 10px rgba(255, 255, 255, 0.6);
          }
          100% {
            box-shadow: 
              0 0 0 40px rgba(174, 230, 247, 0),
              inset 0 0 0 0 rgba(255, 255, 255, 0);
          }
        }

        .join-button:hover:not(:disabled) {
          box-shadow: 
            0 0 30px rgba(174, 230, 247, 0.5),
            0 0 60px rgba(145, 201, 247, 0.3),
            0 8px 24px rgba(174, 230, 247, 0.3) !important;
        }

        .join-button:active:not(:disabled) {
          animation: ice-ripple-join 0.6s ease-out;
        }

        /* Frozen border for sponsored banner */
        .sponsored-banner {
          position: relative;
          border-top: 1px solid rgba(174, 230, 247, 0.3);
        }

        .sponsored-banner::before {
          content: '';
          position: absolute;
          top: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(174, 230, 247, 0.5),
            transparent
          );
          animation: ice-reflection 15s ease-in-out infinite;
        }

        @keyframes ice-reflection {
          0%, 100% {
            opacity: 0.3;
            transform: translateX(-100%);
          }
          50% {
            opacity: 0.8;
            transform: translateX(100%);
          }
        }
      `}</style>
    </>
  )
}

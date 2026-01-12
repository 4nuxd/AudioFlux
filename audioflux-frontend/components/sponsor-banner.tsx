'use client'

import { ExternalLink } from 'lucide-react'

export function SponsorBanner() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-white/10">
      <a
        href="https://t.me/USDTOutlet"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 px-4 py-2.5 glass-sponsor hover:bg-black active:bg-black/95 transition-all duration-300 ease-out group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1500ms] ease-in-out" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]" />
        
        <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors duration-300 font-medium tracking-wide">
          Sponsored by
        </span>
        <span className="text-sm font-bold text-white group-hover:text-white transition-all duration-300 tracking-wide drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]">
          USDT Outlet
        </span>
        <ExternalLink className="w-3.5 h-3.5 text-white/40 group-hover:text-white/70 transition-all duration-300 group-hover:scale-110" />
      </a>
    </div>
  )
}

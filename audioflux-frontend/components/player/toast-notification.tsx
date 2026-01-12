'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface ToastProps {
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  duration?: number
  onClose: () => void
}

export default function ToastNotification({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - (100 / (duration / 100))))
    }, 100)

    const timeout = setTimeout(() => {
      onClose()
    }, duration)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [onClose, duration])

  const bgColor = {
    info: 'bg-slate-900/98',
    success: 'bg-emerald-900/98',
    warning: 'bg-amber-900/98',
    error: 'bg-rose-900/98',
  }[type]

  const borderColor = {
    info: 'border-blue-500/50',
    success: 'border-emerald-500/50',
    warning: 'border-amber-500/50',
    error: 'border-rose-500/50',
  }[type]

  const textColor = {
    info: 'text-blue-100',
    success: 'text-emerald-100',
    warning: 'text-amber-100',
    error: 'text-rose-100',
  }[type]

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 pointer-events-none max-w-[85%]">
      <div className={`rounded-2xl shadow-2xl overflow-hidden ${bgColor} border ${borderColor} backdrop-blur-2xl pointer-events-auto`}>
        <div className="flex items-center gap-3 px-4 py-3">
          <p className={`flex-1 text-sm font-medium ${textColor} leading-snug`}>{message}</p>
          <button
            onClick={onClose}
            className="h-7 w-7 flex-shrink-0 rounded-full hover:bg-white/10 transition-all flex items-center justify-center text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="h-1 bg-white/10">
          <div
            className={`h-full transition-all duration-100 ease-linear ${
              type === 'info' ? 'bg-blue-400' :
              type === 'success' ? 'bg-emerald-400' :
              type === 'warning' ? 'bg-amber-400' :
              'bg-rose-400'
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}

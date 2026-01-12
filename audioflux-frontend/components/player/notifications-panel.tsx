'use client'

import { X, Bell } from 'lucide-react'

interface Notification {
    id: string
    message: string
    timestamp: number
    read: boolean
}

interface NotificationsPanelProps {
    notifications: Notification[]
    onClose: () => void
    onMarkAsRead: (id: string) => void
    onMarkAllAsRead: () => void
}

export default function NotificationsPanel({
    notifications,
    onClose,
    onMarkAsRead,
    onMarkAllAsRead
}: NotificationsPanelProps) {
    const unreadCount = notifications.filter(n => !n.read).length

    const formatTime = (timestamp: number) => {
        const now = Date.now()
        const diff = now - timestamp
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (minutes < 1) return 'Just now'
        if (minutes < 60) return `${minutes}m ago`
        if (hours < 24) return `${hours}h ago`
        return `${days}d ago`
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-md backdrop-blur-3xl bg-white/80 dark:bg-white/10 rounded-3xl shadow-2xl border-2 border-white/40 dark:border-white/20 max-h-[70vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/30 dark:border-white/10">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-foreground dark:text-white" />
                        <h2 className="text-lg font-bold text-foreground dark:text-white">
                            Notifications
                        </h2>
                        {unreadCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-foreground dark:text-white" />
                    </button>
                </div>

                {/* Actions */}
                {unreadCount > 0 && (
                    <div className="px-4 py-2 border-b border-white/30 dark:border-white/10">
                        <button
                            onClick={onMarkAllAsRead}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Mark all as read
                        </button>
                    </div>
                )}

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {notifications.length === 0 ? (
                        <div className="text-center py-12">
                            <Bell className="w-12 h-12 mx-auto text-muted-foreground dark:text-gray-400 mb-3" />
                            <p className="text-muted-foreground dark:text-gray-300 font-medium">
                                No notifications yet
                            </p>
                            <p className="text-sm text-muted-foreground/60 dark:text-gray-400 mt-1">
                                You'll see updates from the owner here
                            </p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                onClick={() => onMarkAsRead(notification.id)}
                                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${notification.read
                                        ? 'bg-white/30 dark:bg-white/5 border-white/20 dark:border-white/10'
                                        : 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-500/30'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {!notification.read && (
                                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-foreground dark:text-white font-medium whitespace-pre-wrap break-words">
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">
                                            {formatTime(notification.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

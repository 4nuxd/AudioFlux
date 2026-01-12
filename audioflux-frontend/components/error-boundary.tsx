'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, MessageCircle } from 'lucide-react'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
    errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
        this.setState({
            error,
            errorInfo
        })
    }

    private handleReload = () => {
        window.location.reload()
    }

    private handleReport = () => {
        const errorMessage = this.state.error?.message || 'Unknown error'
        const errorStack = this.state.error?.stack || 'No stack trace'
        const componentStack = this.state.errorInfo?.componentStack || 'No component stack'

        // Create error report
        const report = `🚨 *AudioFlux Error Report*\n\n` +
            `*Error:* ${errorMessage}\n\n` +
            `*Stack:*\n\`\`\`\n${errorStack.slice(0, 500)}\n\`\`\`\n\n` +
            `*Component:*\n\`\`\`\n${componentStack.slice(0, 300)}\n\`\`\`\n\n` +
            `*User Agent:* ${navigator.userAgent}\n` +
            `*Time:* ${new Date().toISOString()}`

        // Open Telegram chat with pre-filled message
        const telegramUsername = 'audiofluxchat'
        const encodedReport = encodeURIComponent(report)
        window.open(`https://t.me/${telegramUsername}?text=${encodedReport}`, '_blank')
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
                    <div className="max-w-md w-full glass-card rounded-3xl p-8 space-y-6 animate-in fade-in zoom-in duration-300">
                        {/* Error Icon */}
                        <div className="flex justify-center">
                            <div className="h-20 w-20 rounded-full bg-red-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-10 h-10 text-red-500" strokeWidth={2} />
                            </div>
                        </div>

                        {/* Title */}
                        <div className="text-center space-y-2">
                            <h1 className="text-2xl font-bold text-foreground">
                                Oops! Something went wrong
                            </h1>
                            <p className="text-foreground/60">
                                The app encountered a critical error and needs to restart
                            </p>
                        </div>

                        {/* Error Details (Collapsible) */}
                        <details className="glass-strong rounded-xl p-4">
                            <summary className="cursor-pointer text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors">
                                Error Details
                            </summary>
                            <div className="mt-3 space-y-2">
                                <p className="text-xs text-red-400 font-mono break-all">
                                    {this.state.error?.message}
                                </p>
                                {this.state.error?.stack && (
                                    <pre className="text-xs text-foreground/40 overflow-auto max-h-32 font-mono">
                                        {this.state.error.stack.slice(0, 500)}
                                    </pre>
                                )}
                            </div>
                        </details>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            {/* Reload Button */}
                            <button
                                onClick={this.handleReload}
                                className="w-full h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white font-semibold flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all duration-200 shadow-xl"
                            >
                                <RefreshCw className="w-5 h-5" strokeWidth={2.5} />
                                Reload App
                            </button>

                            {/* Report Button */}
                            <button
                                onClick={this.handleReport}
                                className="w-full h-14 rounded-2xl glass-strong border border-white/20 text-foreground font-semibold flex items-center justify-center gap-3 hover:scale-105 hover:bg-white/10 active:scale-95 transition-all duration-200"
                            >
                                <MessageCircle className="w-5 h-5" strokeWidth={2.5} />
                                Report to Developer
                            </button>
                        </div>

                        {/* Footer */}
                        <p className="text-center text-xs text-foreground/40">
                            We apologize for the inconvenience
                        </p>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary

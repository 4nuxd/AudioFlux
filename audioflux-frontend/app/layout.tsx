import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { SponsorBanner } from '@/components/sponsor-banner'
import ErrorBoundary from '@/components/error-boundary'

// Optimize font loading with display swap
const _geist = Geist({
  subsets: ["latin"],
  display: 'swap',
  preload: true
});

const _geistMono = Geist_Mono({
  subsets: ["latin"],
  display: 'swap',
  preload: false // Don't preload mono font
});

export const metadata: Metadata = {
  title: 'Audio Flux - Synced Music Player',
  description: 'Telegram WebApp for synchronized group music listening',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to Telegram CDN */}
        <link rel="preconnect" href="https://telegram.org" />
        <link rel="dns-prefetch" href="https://telegram.org" />

        {/* Preconnect to external services */}
        <link rel="preconnect" href="https://api.ipify.org" />
        <link rel="dns-prefetch" href="https://api.ipify.org" />

        {/* Load Telegram script with async for non-blocking load */}
        <script src="https://telegram.org/js/telegram-web-app.js" async></script>
      </head>
      <body className={`font-sans antialiased fixed inset-0 overflow-hidden`}>
        <ErrorBoundary>
          <div className="h-screen overflow-y-auto">
            {children}
          </div>
          <SponsorBanner />
          <Analytics />
        </ErrorBoundary>
      </body>
    </html>
  )
}

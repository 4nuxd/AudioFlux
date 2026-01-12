'use client'

import { useEffect, useState } from 'react'
import { Activity, Globe, Zap, Bot, TrendingUp, Headphones, MessageCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface ServiceStatus {
  name: string
  status: 'operational' | 'degraded' | 'down'
  responseTime: number
  message?: string
  lastChecked: string
}

interface StatusResponse {
  services: ServiceStatus[]
  overallStatus: 'operational' | 'degraded' | 'down'
  lastChecked: string
}

export default function StatusPage() {
  const [statusData, setStatusData] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status')
      const data = await response.json()
      setStatusData(data)
    } catch (error) {
      console.error('Failed to fetch status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-emerald-400'
      case 'degraded':
        return 'text-amber-400'
      case 'down':
        return 'text-rose-400'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-emerald-500/20 border-emerald-500/30'
      case 'degraded':
        return 'bg-amber-500/20 border-amber-500/30'
      case 'down':
        return 'bg-rose-500/20 border-rose-500/30'
      default:
        return 'bg-gray-500/20 border-gray-500/30'
    }
  }

  const getServiceIcon = (serviceName: string) => {
    if (serviceName.includes('Landing')) return Globe
    if (serviceName.includes('API')) return Zap
    if (serviceName.includes('Bot')) return Bot
    return Activity
  }

  const getCheckFrequency = (serviceName: string) => {
    if (serviceName.includes('Bot')) return '30 min'
    if (serviceName.includes('API')) return '15 min'
    if (serviceName.includes('Landing')) return '1 hr'
    return 'N/A'
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <header className="backdrop-blur-3xl bg-white/[0.15] border-b-2 border-white/[0.25] z-50 flex-shrink-0 shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left side - Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="backdrop-blur-2xl bg-gradient-to-br from-white/25 to-white/15 border-2 border-white/40 rounded-2xl p-2.5 shadow-[0_8px_32px_0_rgba(255,255,255,0.2),inset_0_1px_0_0_rgba(255,255,255,0.3)]">
                  <Headphones className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.5)]" strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-white via-gray-50 to-white bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] filter brightness-125">
                    AudioFlux
                  </span>
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-300 font-medium mt-0.5">
                  System Status Monitor
                </p>
              </div>
            </div>

            {/* Right side - Report Button */}
            <a
              href="https://t.me/audiofluxchat"
              target="_blank"
              rel="noopener noreferrer"
              className="backdrop-blur-3xl bg-white/[0.18] hover:bg-white/[0.25] border-2 border-white/40 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-[0_8px_32px_0_rgba(0,0,0,0.3),0_2px_16px_0_rgba(255,255,255,0.15),inset_0_1px_0_0_rgba(255,255,255,0.3)] flex items-center gap-2 flex-shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Report</span>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 overflow-y-auto">
        <div className="h-full flex flex-col px-4 sm:px-6 py-4 sm:py-6 max-w-4xl mx-auto">
          <div className="space-y-4 sm:space-y-5 flex-shrink-0">
            <Card
              className={`backdrop-blur-3xl bg-white/[0.15] border-2 ${
                loading
                  ? 'border-white/[0.25]'
                  : getStatusBgColor(statusData?.overallStatus || 'operational')
              } p-4 sm:p-5 transition-all duration-500 shadow-[0_8px_32px_0_rgba(0,0,0,0.3),0_2px_16px_0_rgba(255,255,255,0.1),inset_0_1px_0_0_rgba(255,255,255,0.2)]`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-sm sm:text-base font-semibold mb-2 text-white">
                    Overall Status
                  </h2>
                  {loading ? (
                    <p className="text-xs sm:text-sm text-gray-400">Checking...</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                          statusData?.overallStatus === 'operational'
                            ? 'bg-emerald-400 animate-pulse'
                            : statusData?.overallStatus === 'degraded'
                            ? 'bg-amber-400 animate-pulse'
                            : 'bg-rose-400 animate-pulse'
                        }`}
                      />
                      <span
                        className={`text-lg sm:text-xl font-bold capitalize ${getStatusColor(
                          statusData?.overallStatus || 'operational'
                        )}`}
                      >
                        {statusData?.overallStatus}
                      </span>
                    </div>
                  )}
                </div>
                <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-white/20 flex-shrink-0" />
              </div>
            </Card>

            {/* Service Cards - Compact Grid */}
            <div className="grid gap-3 sm:gap-4">
              {loading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <Card
                      key={i}
                      className="backdrop-blur-3xl bg-white/[0.15] border-2 border-white/[0.25] p-4 animate-pulse shadow-[0_8px_32px_0_rgba(0,0,0,0.3),0_2px_16px_0_rgba(255,255,255,0.1)]"
                    >
                      <div className="h-16 sm:h-20" />
                    </Card>
                  ))}
                </>
              ) : (
                statusData?.services.map((service, index) => {
                  const Icon = getServiceIcon(service.name)
                  return (
                    <Card
                      key={index}
                      className={`backdrop-blur-3xl bg-white/[0.15] border-2 ${getStatusBgColor(
                        service.status
                      )} p-4 transition-all duration-500 shadow-[0_8px_32px_0_rgba(0,0,0,0.3),0_2px_16px_0_rgba(255,255,255,0.1),inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:shadow-[0_12px_48px_0_rgba(0,0,0,0.4),0_4px_24px_0_rgba(255,255,255,0.15)] hover:scale-[1.02]`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="p-1.5 sm:p-2 rounded-xl bg-white/[0.15] backdrop-blur-sm border border-white/30 flex-shrink-0 shadow-[0_4px_16px_0_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.3)]">
                            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2.5} />
                          </div>
                          <h4 className="font-semibold text-white text-sm sm:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                            {service.name}
                          </h4>
                        </div>
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            service.status === 'operational'
                              ? 'bg-emerald-400 shadow-[0_0_12px_4px_rgba(52,211,153,0.6)]'
                              : service.status === 'degraded'
                              ? 'bg-amber-400 shadow-[0_0_12px_4px_rgba(251,191,36,0.6)]'
                              : 'bg-rose-400 shadow-[0_0_12px_4px_rgba(251,113,133,0.6)]'
                          } animate-pulse`}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
                        <div>
                          <span className="text-gray-400">Status</span>
                          <div
                            className={`font-semibold capitalize ${getStatusColor(
                              service.status
                            )} mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]`}
                          >
                            {service.status}
                          </div>
                        </div>

                        <div className="text-center">
                          <span className="text-gray-400">Response</span>
                          <div className="flex items-center justify-center gap-1 mt-0.5">
                            <TrendingUp className="w-3 h-3 text-emerald-400" />
                            <span className="font-mono text-white text-xs">
                              {service.responseTime}ms
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-gray-400">Checks</span>
                          <div className="font-semibold text-white mt-0.5">
                            {getCheckFrequency(service.name)}
                          </div>
                        </div>
                      </div>

                    </Card>
                  )
                })
              )}
            </div>

            <div className="text-center pt-2 pb-20">
              <button
                onClick={fetchStatus}
                disabled={loading}
                className="backdrop-blur-3xl bg-white/[0.18] hover:bg-white/[0.25] border-2 border-white/40 px-6 py-2 sm:px-8 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_32px_0_rgba(0,0,0,0.3),0_2px_16px_0_rgba(255,255,255,0.15),inset_0_1px_0_0_rgba(255,255,255,0.3)] active:scale-95"
              >
                {loading ? 'Checking...' : 'Refresh Status'}
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-3xl bg-black/95 border-t-2 border-white/[0.25] py-3 sm:py-4 px-4 sm:px-6 shadow-[0_-8px_32px_0_rgba(255,255,255,0.08),inset_0_1px_0_0_rgba(255,255,255,0.1)] flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <a
            href="https://t.me/usdtoutlet"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 group relative overflow-hidden"
          >
            {/* Animated crossing shine effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine" />
            
            <span className="text-xs sm:text-sm text-gray-400 font-medium relative z-10">
              Sponsored by
            </span>
            <span className="text-sm sm:text-base font-black bg-gradient-to-r from-white via-gray-50 to-white bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.7)] group-hover:drop-shadow-[0_0_50px_rgba(255,255,255,1)] transition-all relative z-10 filter brightness-125">
              USDT Outlet
            </span>
          </a>
        </div>
      </footer>
    </div>
  )
}

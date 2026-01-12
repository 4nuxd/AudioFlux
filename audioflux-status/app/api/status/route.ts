import { NextResponse } from 'next/server'
import { getStatusCache, setStatusCache } from '@/lib/status-cache'
import { checkLandingPage, checkAPI, checkBot } from '@/lib/health-checks'

export const dynamic = 'force-dynamic'

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

export async function GET() {
  try {
    const cachedStatus = getStatusCache()
    
    if (cachedStatus) {
      console.log('[v0] Returning cached status from:', cachedStatus.lastChecked)
      return NextResponse.json(cachedStatus)
    }

    console.log('[v0] No cache found, running immediate health check...')
    
    const [landingPage, api, bot] = await Promise.all([
      checkLandingPage(),
      checkAPI(),
      checkBot(),
    ])

    const services = [landingPage, api, bot]

    // Determine overall status
    let overallStatus: 'operational' | 'degraded' | 'down' = 'operational'
    if (services.some((s) => s.status === 'down')) {
      overallStatus = services.every((s) => s.status === 'down') ? 'down' : 'degraded'
    } else if (services.some((s) => s.status === 'degraded')) {
      overallStatus = 'degraded'
    }

    const response: StatusResponse = {
      services,
      overallStatus,
      lastChecked: new Date().toISOString(),
    }

    setStatusCache(response)

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      {
        services: [],
        overallStatus: 'down',
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { checkLandingPage, checkAPI, checkBot } from '@/lib/health-checks'
import { setStatusCache } from '@/lib/status-cache'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  // This endpoint can now be called manually or via external monitoring services

  console.log('[v0] Running scheduled health check...')

  try {
    // Check all services in parallel
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

    const statusData = {
      services,
      overallStatus,
      lastChecked: new Date().toISOString(),
    }

    // Cache the results
    setStatusCache(statusData)

    console.log('[v0] Health check complete:', overallStatus)

    return NextResponse.json({ 
      success: true, 
      status: statusData,
      message: 'Health check completed successfully'
    })
  } catch (error) {
    console.error('[v0] Health check failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

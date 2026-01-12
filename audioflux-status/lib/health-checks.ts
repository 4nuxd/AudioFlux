interface ServiceStatus {
  name: string
  status: 'operational' | 'degraded' | 'down'
  responseTime: number
  message?: string
  lastChecked: string
}

export async function checkLandingPage(): Promise<ServiceStatus> {
  const startTime = Date.now()
  try {
    const landingUrl = process.env.LANDING_URL || 'https://your-landing-page.com'
    const response = await fetch(landingUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
    })
    const responseTime = Date.now() - startTime

    return {
      name: 'Landing Page',
      status: response.ok ? 'operational' : 'down',
      responseTime,
      message: response.ok ? `HTTP ${response.status}` : `Error: ${response.status}`,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    return {
      name: 'Landing Page',
      status: 'down',
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Connection failed',
      lastChecked: new Date().toISOString(),
    }
  }
}

export async function checkAPI(): Promise<ServiceStatus> {
  const startTime = Date.now()
  try {
    const apiUrl = process.env.API_URL || 'https://your-backend-api.com'
    const response = await fetch(
      `${apiUrl.replace(/\/$/, '')}/search/songs?query=test`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      }
    )
    const responseTime = Date.now() - startTime

    if (response.ok) {
      const data = await response.json()
      return {
        name: 'Music API',
        status: 'operational',
        responseTime,
        message: `${data.length || 0} results returned`,
        lastChecked: new Date().toISOString(),
      }
    }

    return {
      name: 'Music API',
      status: 'down',
      responseTime,
      message: `HTTP ${response.status}`,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    return {
      name: 'Music API',
      status: 'down',
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Connection failed',
      lastChecked: new Date().toISOString(),
    }
  }
}

export async function checkBot(): Promise<ServiceStatus> {
  const startTime = Date.now()
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      return {
        name: 'Telegram Bot',
        status: 'degraded',
        responseTime: 0,
        message: 'Bot token not configured',
        lastChecked: new Date().toISOString(),
      }
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      }
    )
    const responseTime = Date.now() - startTime

    if (response.ok) {
      const data = await response.json()
      return {
        name: 'Telegram Bot',
        status: 'operational',
        responseTime,
        message: data.result?.username ? `@${data.result.username}` : 'Bot is running',
        lastChecked: new Date().toISOString(),
      }
    }

    return {
      name: 'Telegram Bot',
      status: 'down',
      responseTime,
      message: `HTTP ${response.status}`,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    return {
      name: 'Telegram Bot',
      status: 'down',
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Connection failed',
      lastChecked: new Date().toISOString(),
    }
  }
}

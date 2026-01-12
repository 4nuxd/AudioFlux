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

// Simple in-memory cache for status data
let cachedStatus: StatusResponse | null = null

export function getStatusCache(): StatusResponse | null {
  return cachedStatus
}

export function setStatusCache(status: StatusResponse): void {
  cachedStatus = status
}

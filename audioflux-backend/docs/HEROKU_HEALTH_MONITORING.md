# Heroku Health Monitoring

Comprehensive health monitoring for all Heroku components using the Heroku Platform API.

## Features

- ✅ Real-time status of all Heroku apps (backend, frontend)
- ✅ Dyno status and metrics
- ✅ Database and addon monitoring
- ✅ Integrated with owner stats menu in Telegram bot
- ✅ REST API endpoints for external monitoring

## Setup

### 1. Get Heroku API Key

1. Go to [Heroku Dashboard Account Settings](https://dashboard.heroku.com/account)
2. Scroll to "API Key" section
3. Click "Reveal" to see your API key
4. Copy the API key

### 2. Configure Environment Variables

Add these to your `.env` file:

```bash
# Heroku API Configuration
HEROKU_API_KEY=your_heroku_api_key_here
HEROKU_BACKEND_APP=your-backend-app-name
HEROKU_FRONTEND_APP=your-frontend-app-name
```

**Example:**
```bash
HEROKU_API_KEY=12345678-abcd-1234-abcd-123456789abc
HEROKU_BACKEND_APP=audioflux-backend
HEROKU_FRONTEND_APP=audioflux-frontend
```

### 3. Restart Your Application

After adding the environment variables, restart your Heroku app:

```bash
heroku restart -a your-backend-app-name
```

## Usage

### Telegram Bot (Owner Only)

1. Send `/stats` command to the bot
2. Click "☁️ Heroku Health" button
3. View real-time status of all components

**Information Displayed:**
- Overall health status (🟢 Healthy / 🟡 Degraded / 🔴 Unhealthy)
- Backend app status and running dynos
- Frontend app status and running dynos
- Database and addon status
- Region information

### REST API Endpoints

#### 1. Full Heroku Health Status
```
GET /health/heroku
```

Returns detailed information about all Heroku apps including:
- App information (name, region, stack, URLs)
- Dyno status and metrics
- Addon details
- Timestamps

**Example Response:**
```json
{
  "timestamp": "2025-11-24T09:44:29.123Z",
  "configured": true,
  "backend": {
    "appName": "audioflux-backend",
    "info": {
      "name": "audioflux-backend",
      "region": "us",
      "stack": "heroku-22",
      "webUrl": "https://audioflux-backend.herokuapp.com"
    },
    "dynos": [...],
    "addons": [...],
    "metrics": {...},
    "status": "healthy"
  },
  "frontend": {...}
}
```

#### 2. Health Summary
```
GET /health/heroku/summary
```

Returns a simplified summary of health status.

**Example Response:**
```json
{
  "timestamp": "2025-11-24T09:44:29.123Z",
  "overall": "healthy",
  "components": {
    "backend": {
      "status": "healthy",
      "app": "audioflux-backend",
      "dynos": 1,
      "region": "us"
    },
    "frontend": {
      "status": "healthy",
      "app": "audioflux-frontend",
      "dynos": 1,
      "region": "us"
    },
    "database": {
      "addons": [
        {
          "name": "postgresql-addon",
          "service": "heroku-postgresql",
          "plan": "hobby-dev",
          "state": "provisioned"
        }
      ],
      "status": "healthy"
    }
  }
}
```

#### 3. Full System Health
```
GET /health/full
```

Returns complete health check including local services (Redis, Telegram Bot) and Heroku components.

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-24T09:44:29.123Z",
  "uptime": 12345.67,
  "responseTime": "234ms",
  "services": {
    "redis": {
      "status": "connected",
      "latency": "2ms"
    },
    "telegramBot": {
      "status": "connected"
    }
  },
  "memory": {
    "heapUsed": 128,
    "heapTotal": 256,
    "rss": 512,
    "external": 8
  },
  "environment": "production",
  "nodeVersion": "v20.11.0",
  "platform": "linux",
  "heroku": {...}
}
```

#### 4. Basic Health Check
```
GET /health/basic
```

Fast, minimal health check (only checks Redis).

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-24T09:44:29.123Z",
  "uptime": 12345.67
}
```

## Monitoring Components

### Backend App
- **Dynos**: Web and worker dyno status
- **Addons**: Database, Redis, and other addons
- **Metrics**: Running dyno count, states
- **Region**: Deployment region

### Frontend App
- **Dynos**: Web dyno status
- **Metrics**: Running dyno count, states
- **Region**: Deployment region

### Database & Addons
- **PostgreSQL**: Database status and plan
- **Redis**: Cache status (if using Heroku Redis)
- **Other Addons**: Any other provisioned addons

## Status Indicators

| Emoji | Status | Description |
|-------|--------|-------------|
| 🟢 | Healthy | All systems operational |
| 🟡 | Degraded | Some issues detected |
| 🔴 | Unhealthy | Critical issues |
| ⚠️ | Warning | Needs attention |
| ✅ | Provisioned | Addon is active |

## Troubleshooting

### "Not Configured" Error
- Ensure `HEROKU_API_KEY` is set in `.env`
- Verify the API key is valid
- Check that app names are correct

### "Invalid API Key" Error
- Regenerate API key from Heroku Dashboard
- Update `.env` with new key
- Restart the application

### "App Not Found" Error
- Verify app names in `.env` match Heroku app names exactly
- Ensure you have access to the apps with your API key

### Network/Timeout Errors
- Check Heroku API status: https://status.heroku.com
- Verify network connectivity
- Check if rate limits are being hit

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `.env` file** - It contains sensitive API keys
2. **Use environment variables** - Set via Heroku config vars in production
3. **Restrict API access** - Only owner can access health endpoints via bot
4. **Rotate API keys** - Periodically regenerate your Heroku API key
5. **Monitor access logs** - Check for unauthorized access attempts

## API Rate Limits

Heroku Platform API has rate limits:
- **Default**: 4,500 requests per hour per user
- **Burst**: Up to 75 requests per minute

The health check service is designed to be efficient and stay within these limits.

## Files Created

```
Backend/
├── services/
│   └── herokuHealthService.js    # Heroku API integration
├── routes/
│   └── health.js                 # Health check endpoints
└── bot/
    └── ownerStats.js             # Updated with Heroku health button
```

## Example Usage in Code

```javascript
const herokuHealthService = require('./services/herokuHealthService');

// Get full health status
const fullStatus = await herokuHealthService.getHerokuHealthStatus();

// Get summary
const summary = await herokuHealthService.getHealthSummary();

// Get specific app info
const appInfo = await herokuHealthService.getAppInfo('audioflux-backend');

// Get app dynos
const dynos = await herokuHealthService.getAppDynos('audioflux-backend');

// Get app addons
const addons = await herokuHealthService.getAppAddons('audioflux-backend');
```

## Support

For issues or questions:
- Check Heroku API documentation: https://devcenter.heroku.com/articles/platform-api-reference
- Verify API key permissions
- Check application logs for detailed error messages

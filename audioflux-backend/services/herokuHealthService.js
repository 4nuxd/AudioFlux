/**
 * Heroku Health Check Service
 * Monitors all Heroku apps (backend, frontend, database) using Heroku Platform API
 */

const axios = require('axios');
const logger = require('../logger');

const HEROKU_API_BASE = 'https://api.heroku.com';

// Helper functions to get env vars dynamically (not cached)
function getHerokuApiKey() {
    return process.env.HEROKU_API_KEY || null;
}

function getHerokuBackendApp() {
    return process.env.HEROKU_BACKEND_APP || null;
}

function getHerokuFrontendApp() {
    return process.env.HEROKU_FRONTEND_APP || null;
}

// Debug: Log what we loaded at startup
console.log('[Heroku Health] Service initialized. Env vars will be read dynamically.');

/**
 * Make authenticated request to Heroku API
 */
async function herokuApiRequest(endpoint) {
    const HEROKU_API_KEY = getHerokuApiKey();

    if (!HEROKU_API_KEY) {
        throw new Error('HEROKU_API_KEY not configured');
    }

    try {
        const response = await axios.get(`${HEROKU_API_BASE}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${HEROKU_API_KEY}`,
                'Accept': 'application/vnd.heroku+json; version=3',
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        return response.data;
    } catch (error) {
        logger.error('heroku_api_error', {
            endpoint,
            error: error.message,
            status: error.response?.status
        });
        throw error;
    }
}

/**
 * Get app information
 */
async function getAppInfo(appName) {
    if (!appName) return null;

    try {
        const app = await herokuApiRequest(`/apps/${appName}`);
        return {
            name: app.name,
            region: app.region?.name,
            stack: app.stack?.name,
            createdAt: app.created_at,
            updatedAt: app.updated_at,
            webUrl: app.web_url,
            repoSize: app.repo_size
        };
    } catch (error) {
        return {
            name: appName,
            error: error.message,
            status: 'error'
        };
    }
}

/**
 * Get app dynos status
 */
async function getAppDynos(appName) {
    if (!appName) return null;

    try {
        const dynos = await herokuApiRequest(`/apps/${appName}/dynos`);
        return dynos.map(dyno => ({
            id: dyno.id,
            name: dyno.name,
            type: dyno.type,
            size: dyno.size,
            state: dyno.state,
            command: dyno.command,
            createdAt: dyno.created_at,
            updatedAt: dyno.updated_at
        }));
    } catch (error) {
        return [{
            error: error.message,
            status: 'error'
        }];
    }
}

/**
 * Get app addons (database, redis, etc.)
 */
async function getAppAddons(appName) {
    if (!appName) return null;

    try {
        const addons = await herokuApiRequest(`/apps/${appName}/addons`);
        return addons.map(addon => ({
            id: addon.id,
            name: addon.name,
            addonService: addon.addon_service?.name,
            plan: addon.plan?.name,
            state: addon.state,
            createdAt: addon.created_at,
            updatedAt: addon.updated_at
        }));
    } catch (error) {
        return [{
            error: error.message,
            status: 'error'
        }];
    }
}

/**
 * Get app metrics (requires Heroku metrics addon or log-runtime-metrics)
 */
async function getAppMetrics(appName) {
    if (!appName) return null;

    try {
        // Get latest dyno metrics
        const dynos = await herokuApiRequest(`/apps/${appName}/dynos`);

        // Calculate uptime and status
        const webDynos = dynos.filter(d => d.type === 'web');
        const workerDynos = dynos.filter(d => d.type === 'worker');

        return {
            webDynos: {
                count: webDynos.length,
                running: webDynos.filter(d => d.state === 'up').length,
                states: webDynos.map(d => ({ name: d.name, state: d.state }))
            },
            workerDynos: {
                count: workerDynos.length,
                running: workerDynos.filter(d => d.state === 'up').length,
                states: workerDynos.map(d => ({ name: d.name, state: d.state }))
            }
        };
    } catch (error) {
        return {
            error: error.message,
            status: 'error'
        };
    }
}

/**
 * Get comprehensive health status for all Heroku components
 */
async function getHerokuHealthStatus() {
    const HEROKU_API_KEY = getHerokuApiKey();
    const HEROKU_BACKEND_APP = getHerokuBackendApp();
    const HEROKU_FRONTEND_APP = getHerokuFrontendApp();

    // Debug logging
    console.log('[Heroku Health] getHerokuHealthStatus called:', {
        hasApiKey: !!HEROKU_API_KEY,
        apiKeyLength: HEROKU_API_KEY ? HEROKU_API_KEY.length : 0,
        apiKeyPrefix: HEROKU_API_KEY ? HEROKU_API_KEY.substring(0, 15) + '...' : 'null',
        backendApp: HEROKU_BACKEND_APP,
        frontendApp: HEROKU_FRONTEND_APP,
        processEnvKeys: Object.keys(process.env).filter(k => k.includes('HEROKU'))
    });

    if (!HEROKU_API_KEY) {
        console.log('[Heroku Health] API key is null/empty, returning not configured');
        return {
            error: 'Heroku API key not configured',
            configured: false
        };
    }

    const healthStatus = {
        timestamp: new Date().toISOString(),
        configured: true,
        backend: null,
        frontend: null
    };

    // Check backend app
    if (HEROKU_BACKEND_APP) {
        try {
            const [appInfo, dynos, addons, metrics] = await Promise.all([
                getAppInfo(HEROKU_BACKEND_APP),
                getAppDynos(HEROKU_BACKEND_APP),
                getAppAddons(HEROKU_BACKEND_APP),
                getAppMetrics(HEROKU_BACKEND_APP)
            ]);

            healthStatus.backend = {
                appName: HEROKU_BACKEND_APP,
                info: appInfo,
                dynos: dynos,
                addons: addons,
                metrics: metrics,
                status: appInfo.error ? 'error' : 'healthy'
            };
        } catch (error) {
            healthStatus.backend = {
                appName: HEROKU_BACKEND_APP,
                error: error.message,
                status: 'error'
            };
        }
    }

    // Check frontend app
    if (HEROKU_FRONTEND_APP) {
        try {
            const [appInfo, dynos, addons, metrics] = await Promise.all([
                getAppInfo(HEROKU_FRONTEND_APP),
                getAppDynos(HEROKU_FRONTEND_APP),
                getAppAddons(HEROKU_FRONTEND_APP),
                getAppMetrics(HEROKU_FRONTEND_APP)
            ]);

            healthStatus.frontend = {
                appName: HEROKU_FRONTEND_APP,
                info: appInfo,
                dynos: dynos,
                addons: addons,
                metrics: metrics,
                status: appInfo.error ? 'error' : 'healthy'
            };
        } catch (error) {
            healthStatus.frontend = {
                appName: HEROKU_FRONTEND_APP,
                error: error.message,
                status: 'error'
            };
        }
    }

    return healthStatus;
}

/**
 * Get simple health summary
 */
async function getHealthSummary() {
    const fullStatus = await getHerokuHealthStatus();

    if (!fullStatus.configured) {
        return {
            status: 'not_configured',
            message: 'Heroku API key not configured'
        };
    }

    const summary = {
        timestamp: fullStatus.timestamp,
        overall: 'healthy',
        components: {}
    };

    // Backend summary
    if (fullStatus.backend) {
        const backendHealthy = fullStatus.backend.status === 'healthy' &&
            fullStatus.backend.metrics?.webDynos?.running > 0;
        summary.components.backend = {
            status: backendHealthy ? 'healthy' : 'unhealthy',
            app: fullStatus.backend.appName,
            dynos: fullStatus.backend.metrics?.webDynos?.running || 0,
            region: fullStatus.backend.info?.region
        };

        if (!backendHealthy) summary.overall = 'degraded';
    }

    // Frontend summary
    if (fullStatus.frontend) {
        const frontendHealthy = fullStatus.frontend.status === 'healthy' &&
            fullStatus.frontend.metrics?.webDynos?.running > 0;
        summary.components.frontend = {
            status: frontendHealthy ? 'healthy' : 'unhealthy',
            app: fullStatus.frontend.appName,
            dynos: fullStatus.frontend.metrics?.webDynos?.running || 0,
            region: fullStatus.frontend.info?.region
        };

        if (!frontendHealthy) summary.overall = 'degraded';
    }

    // Database summary (from addons)
    if (fullStatus.backend?.addons) {
        const dbAddons = fullStatus.backend.addons.filter(a =>
            a.addonService?.includes('postgres') ||
            a.addonService?.includes('redis') ||
            a.addonService?.includes('mysql')
        );

        if (dbAddons.length > 0) {
            summary.components.database = {
                addons: dbAddons.map(a => ({
                    name: a.name,
                    service: a.addonService,
                    plan: a.plan,
                    state: a.state
                })),
                status: dbAddons.every(a => a.state === 'provisioned') ? 'healthy' : 'degraded'
            };

            if (summary.components.database.status !== 'healthy') {
                summary.overall = 'degraded';
            }
        }
    }

    return summary;
}

module.exports = {
    getHerokuHealthStatus,
    getHealthSummary,
    getAppInfo,
    getAppDynos,
    getAppAddons,
    getAppMetrics
};

const cors = require('cors');
const config = require('../config');

const corsMiddleware = cors({
    origin: config.app.corsOrigins,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    credentials: true,
    optionsSuccessStatus: 200
});

module.exports = corsMiddleware;

const logger = require('../logger');

const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    logger.error('unhandled_error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
};

module.exports = errorHandler;

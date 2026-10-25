/**
 * In-memory sliding-window rate limiter for sensitive authentication endpoints
 */
function createRateLimiter({ windowMs = 15 * 60 * 1000, maxRequests = 25, message = 'Too many requests. Please try again later.' }) {
    const hits = new Map();

    // Periodic cleanup of stale IP records every 5 minutes
    const interval = setInterval(() => {
        const now = Date.now();
        for (const [ip, timestamps] of hits.entries()) {
            const valid = timestamps.filter(t => now - t < windowMs);
            if (valid.length === 0) {
                hits.delete(ip);
            } else {
                hits.set(ip, valid);
            }
        }
    }, 5 * 60 * 1000);

    // Prevent interval from blocking Node.js event loop shutdown
    if (interval.unref) {
        interval.unref();
    }

    return function rateLimiter(req, res, next) {
        // Skip rate limiting in automated test runs
        if (process.env.NODE_ENV === 'test') {
            return next();
        }

        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const now = Date.now();

        const timestamps = (hits.get(ip) || []).filter(t => now - t < windowMs);
        if (timestamps.length >= maxRequests) {
            const retryAfterSec = Math.ceil((windowMs - (now - timestamps[0])) / 1000);
            res.setHeader('Retry-After', retryAfterSec);
            return res.status(429).json({
                error: message,
                retryAfterSeconds: retryAfterSec
            });
        }

        timestamps.push(now);
        hits.set(ip, timestamps);
        next();
    };
}

module.exports = {
    createRateLimiter
};

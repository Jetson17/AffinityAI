const jwt = require('jsonwebtoken');
const db = require('../database/db');

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd) {
        if (!secret || secret.trim().length < 32 || secret.includes('btech_dsa_friend_recommendation')) {
            throw new Error('FATAL: A strong, unique JWT_SECRET (min 32 chars) must be set in environment variables for production.');
        }
        return secret;
    }

    if (!secret) {
        console.warn('⚠️ [SECURITY WARNING]: JWT_SECRET environment variable is not defined. Using development fallback secret.');
        return 'dev_secret_affinity_ai_development_only_key_2026';
    }

    return secret;
}

const JWT_SECRET = getJwtSecret();

/**
 * Middleware to authenticate requests using JWT Bearer token
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <TOKEN>

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Fetch current user from database to ensure user still exists and role is current
        const user = db.prepare('SELECT id, name, email, bio, interests, avatar, role, COALESCE(is_active, 1) AS is_active, created_at FROM users WHERE id = ?').get(decoded.id);

        if (!user) {
            return res.status(401).json({ error: 'Invalid session. User no longer exists.' });
        }

        if (user.is_active === 0) {
            return res.status(403).json({ error: 'Account has been deactivated. Please contact an administrator.' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired authentication token.' });
    }
}

/**
 * Middleware to restrict endpoints to administrators
 */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden. Administrator privileges required.' });
    }
    next();
}

/**
 * Generates signed JWT for a user
 * @param {object} user - User object {id, email, role}
 * @returns {string} Signed JWT
 */
function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

module.exports = {
    authenticateToken,
    requireAdmin,
    generateToken,
    JWT_SECRET
};

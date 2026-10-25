const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { authenticateToken, generateToken } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const authRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 25,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
});

/**
 * POST /api/auth/register
 * Registers a new user with name, email, and password
 */
router.post('/register', authRateLimiter, (req, res) => {
    try {
        const { name, email, password, bio, interests } = req.body;

        // Validation
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Full name is required.' });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ error: 'Valid email address is required.' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ error: 'Please provide a valid email format.' });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        // Check duplicate email
        const existing = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email.trim());
        if (existing) {
            return res.status(409).json({ error: 'An account with this email address already exists.' });
        }

        // Hash password securely with bcrypt
        const hashedPassword = bcrypt.hashSync(password, 10);

        const insert = db.prepare(`
            INSERT INTO users (name, email, password, bio, interests, avatar, role)
            VALUES (?, ?, ?, ?, ?, ?, 'user')
        `);

        // Generate nice default avatar with initials or fallback placeholder
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=4f46e5&color=fff&size=150`;

        const info = insert.run(
            name.trim(),
            email.trim().toLowerCase(),
            hashedPassword,
            bio ? bio.trim() : 'Computer Science Student',
            interests ? interests.trim() : '',
            defaultAvatar
        );

        const newUser = {
            id: info.lastInsertRowid,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            bio: bio ? bio.trim() : 'Computer Science Student',
            interests: interests ? interests.trim() : '',
            avatar: defaultAvatar,
            role: 'user',
            created_at: new Date().toISOString()
        };

        const token = generateToken(newUser);

        return res.status(201).json({
            message: 'User registered successfully!',
            user: newUser,
            token
        });
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ error: 'Internal server error during registration.' });
    }
});

/**
 * POST /api/auth/login
 * Validates credentials and returns JWT session
 */
router.post('/login', authRateLimiter, (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email.trim());

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const passwordValid = bcrypt.compareSync(password, user.password);
        if (!passwordValid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (user.is_active === 0) {
            return res.status(403).json({ error: 'Your account has been deactivated. Please contact an administrator.' });
        }

        // Exclude password hash from response
        const safeUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            bio: user.bio,
            interests: user.interests || '',
            avatar: user.avatar,
            role: user.role,
            is_active: user.is_active !== undefined ? user.is_active : 1,
            created_at: user.created_at
        };

        const token = generateToken(safeUser);

        return res.json({
            message: 'Login successful!',
            user: safeUser,
            token
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Internal server error during login.' });
    }
});

/**
 * GET /api/auth/me
 * Returns current authenticated user profile and stats
 */
router.get('/me', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;

        // Count friends
        const friendCountRow = db.prepare(`
            SELECT COUNT(*) AS count FROM friendships WHERE user1_id = ? OR user2_id = ?
        `).get(userId, userId);

        // Count pending incoming requests
        const pendingCountRow = db.prepare(`
            SELECT COUNT(*) AS count FROM friend_requests WHERE receiver_id = ? AND status = 'pending'
        `).get(userId);

        return res.json({
            user: req.user,
            stats: {
                friendsCount: friendCountRow.count,
                pendingRequestsCount: pendingCountRow.count
            }
        });
    } catch (err) {
        console.error('Auth /me error:', err);
        return res.status(500).json({ error: 'Internal server error fetching user.' });
    }
});

module.exports = router;

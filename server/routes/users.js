const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const FriendService = require('../services/friendService');

const router = express.Router();

/**
 * GET /api/users/search
 * Search registered users by name or email
 * Returns users with their relationship status relative to current user
 */
router.get('/search', authenticateToken, (req, res) => {
    try {
        const query = (req.query.q || '').trim();
        const currentUserId = req.user.id;

        let users = [];
        if (query) {
            users = db.prepare(`
                SELECT id, name, email, bio, interests, avatar, role, created_at
                FROM users
                WHERE (name LIKE ? OR email LIKE ? OR interests LIKE ?)
                ORDER BY name ASC
                LIMIT 30
            `).all(`%${query}%`, `%${query}%`, `%${query}%`);
        } else {
            // If empty search, return a recommended preview of users
            users = db.prepare(`
                SELECT id, name, email, bio, interests, avatar, role, created_at
                FROM users
                WHERE id != ?
                ORDER BY name ASC
                LIMIT 20
            `).all(currentUserId);
        }

        // Fetch user's friends and pending requests to determine relationship status
        const friendships = db.prepare(`
            SELECT user1_id, user2_id FROM friendships WHERE user1_id = ? OR user2_id = ?
        `).all(currentUserId, currentUserId);

        const friendIdSet = new Set();
        friendships.forEach(f => {
            friendIdSet.add(f.user1_id === currentUserId ? f.user2_id : f.user1_id);
        });

        const pendingRequests = db.prepare(`
            SELECT id, sender_id, receiver_id, status 
            FROM friend_requests 
            WHERE (sender_id = ? OR receiver_id = ?) AND status = 'pending'
        `).all(currentUserId, currentUserId);

        const pendingSentMap = new Map(); // targetId -> requestId
        const pendingReceivedMap = new Map(); // senderId -> requestId

        pendingRequests.forEach(r => {
            if (r.sender_id === currentUserId) {
                pendingSentMap.set(r.receiver_id, r.id);
            } else {
                pendingReceivedMap.set(r.sender_id, r.id);
            }
        });

        const annotatedUsers = users.map(u => {
            if (u.id === currentUserId) {
                return { ...u, relationshipStatus: 'self' };
            }
            if (friendIdSet.has(u.id)) {
                return { ...u, relationshipStatus: 'friends' };
            }
            if (pendingSentMap.has(u.id)) {
                return { ...u, relationshipStatus: 'pending_sent', requestId: pendingSentMap.get(u.id) };
            }
            if (pendingReceivedMap.has(u.id)) {
                return { ...u, relationshipStatus: 'pending_received', requestId: pendingReceivedMap.get(u.id) };
            }
            return { ...u, relationshipStatus: 'none' };
        });

        return res.json({ users: annotatedUsers });
    } catch (err) {
        console.error('User search error:', err);
        return res.status(500).json({ error: 'Failed to search users.' });
    }
});

/**
 * GET /api/users/:id
 * Retrieve public profile for a user
 */
router.get('/:id', authenticateToken, (req, res) => {
    try {
        const targetId = parseInt(req.params.id, 10);
        if (isNaN(targetId)) {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        const user = db.prepare('SELECT id, name, email, bio, interests, avatar, role, created_at FROM users WHERE id = ?').get(targetId);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const friendCount = db.prepare(`
            SELECT COUNT(*) AS count FROM friendships WHERE user1_id = ? OR user2_id = ?
        `).get(targetId, targetId).count;

        const isFriend = FriendService.areFriends(req.user.id, targetId);

        return res.json({
            user,
            stats: { friendCount },
            isFriend,
            isSelf: req.user.id === targetId
        });
    } catch (err) {
        console.error('Fetch profile error:', err);
        return res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
});

/**
 * PUT /api/users/profile
 * Update logged-in user's display name, bio, and interests (students only)
 * Enforces role-specific behavior on the server: administrators cannot set student-specific academic interests,
 * and protected security fields (role, email, is_active) cannot be altered.
 */
router.put('/profile', authenticateToken, (req, res) => {
    try {
        const { name, bio, interests } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Name cannot be empty.' });
        }

        const isAdmin = req.user.role === 'admin';

        if (isAdmin) {
            // For administrators: only name and bio (administrator description) are updated.
            // Student-specific academic interests are not accepted or stored.
            db.prepare(`
                UPDATE users 
                SET name = ?, bio = ?
                WHERE id = ?
            `).run(name.trim(), (bio !== undefined ? String(bio) : '').trim(), req.user.id);
        } else {
            // For regular students: name, bio, and academic interests are updated.
            db.prepare(`
                UPDATE users 
                SET name = ?, bio = ?, interests = ?
                WHERE id = ?
            `).run(name.trim(), (bio !== undefined ? String(bio) : '').trim(), (interests !== undefined ? String(interests) : '').trim(), req.user.id);
        }

        const updatedUser = db.prepare('SELECT id, name, email, bio, interests, avatar, role, is_active, created_at FROM users WHERE id = ?').get(req.user.id);

        return res.json({
            message: 'Profile updated successfully!',
            user: updatedUser
        });
    } catch (err) {
        console.error('Update profile error:', err);
        return res.status(500).json({ error: 'Failed to update profile.' });
    }
});

module.exports = router;

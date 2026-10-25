const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const FriendService = require('../services/friendService');

const router = express.Router();

/**
 * GET /api/friends
 * Retrieve list of confirmed friends for current user
 */
router.get('/', authenticateToken, (req, res) => {
    try {
        const friends = FriendService.getFriends(req.user.id);
        return res.json({ friends });
    } catch (err) {
        console.error('Error fetching friends:', err);
        return res.status(500).json({ error: 'Failed to retrieve friends list.' });
    }
});

/**
 * GET /api/friends/requests
 * Retrieve incoming and outgoing pending friend requests
 */
router.get('/requests', authenticateToken, (req, res) => {
    try {
        const requests = FriendService.getPendingRequests(req.user.id);
        return res.json(requests);
    } catch (err) {
        console.error('Error fetching friend requests:', err);
        return res.status(500).json({ error: 'Failed to retrieve friend requests.' });
    }
});

/**
 * POST /api/friends/request/:targetId
 * Send a friend request to targetId
 */
router.post('/request/:targetId', authenticateToken, (req, res) => {
    try {
        const targetId = parseInt(req.params.targetId, 10);
        if (isNaN(targetId)) {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        const request = FriendService.sendRequest(req.user.id, targetId);
        return res.status(201).json({
            message: 'Friend request sent successfully!',
            request
        });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/friends/request/:requestId/accept
 * Accept incoming friend request
 */
router.post('/request/:requestId/accept', authenticateToken, (req, res) => {
    try {
        const requestId = parseInt(req.params.requestId, 10);
        if (isNaN(requestId)) {
            return res.status(400).json({ error: 'Invalid request ID.' });
        }

        const friendship = FriendService.acceptRequest(requestId, req.user.id);
        return res.json({
            message: 'Friend request accepted!',
            friendship
        });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/friends/request/:requestId/reject
 * Reject incoming friend request
 */
router.post('/request/:requestId/reject', authenticateToken, (req, res) => {
    try {
        const requestId = parseInt(req.params.requestId, 10);
        if (isNaN(requestId)) {
            return res.status(400).json({ error: 'Invalid request ID.' });
        }

        const result = FriendService.rejectRequest(requestId, req.user.id);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * DELETE /api/friends/request/:requestId/cancel
 * Cancel outgoing friend request
 */
router.delete('/request/:requestId/cancel', authenticateToken, (req, res) => {
    try {
        const requestId = parseInt(req.params.requestId, 10);
        if (isNaN(requestId)) {
            return res.status(400).json({ error: 'Invalid request ID.' });
        }

        const result = FriendService.cancelRequest(requestId, req.user.id);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * DELETE /api/friends/:friendId
 * Remove a confirmed friend
 */
router.delete('/:friendId', authenticateToken, (req, res) => {
    try {
        const friendId = parseInt(req.params.friendId, 10);
        if (isNaN(friendId)) {
            return res.status(400).json({ error: 'Invalid friend ID.' });
        }

        const result = FriendService.removeFriend(req.user.id, friendId);
        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

module.exports = router;

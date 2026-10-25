const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const FriendService = require('../services/friendService');

const router = express.Router();

/**
 * GET /api/messages/conversations
 * Returns list of confirmed friends with the latest message snippet and unread status
 */
router.get('/conversations', authenticateToken, (req, res) => {
    try {
        const currentUserId = req.user.id;
        const friends = FriendService.getFriends(currentUserId);

        const conversations = friends.map(friend => {
            const lastMessage = db.prepare(`
                SELECT id, sender_id, receiver_id, content, created_at, is_read
                FROM messages
                WHERE (sender_id = ? AND receiver_id = ?)
                   OR (sender_id = ? AND receiver_id = ?)
                ORDER BY created_at DESC, id DESC
                LIMIT 1
            `).get(currentUserId, friend.id, friend.id, currentUserId);

            const unreadCount = db.prepare(`
                SELECT COUNT(*) AS count
                FROM messages
                WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
            `).get(friend.id, currentUserId).count;

            return {
                friend,
                lastMessage: lastMessage || null,
                unreadCount
            };
        });

        // Sort conversations: most recent message first, followed by friends without messages
        conversations.sort((a, b) => {
            const timeA = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
            const timeB = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
            return timeB - timeA;
        });

        return res.json({ conversations });
    } catch (err) {
        console.error('Error fetching conversations:', err);
        return res.status(500).json({ error: 'Failed to retrieve conversations.' });
    }
});

/**
 * GET /api/messages/:friendId
 * Retrieve message history between logged-in user and a confirmed friend
 * Strictly enforces that users must be confirmed friends!
 */
router.get('/:friendId', authenticateToken, (req, res) => {
    try {
        const currentUserId = req.user.id;
        const friendId = parseInt(req.params.friendId, 10);

        if (isNaN(friendId)) {
            return res.status(400).json({ error: 'Invalid friend ID.' });
        }

        // Strict authorization: Are they friends?
        if (!FriendService.areFriends(currentUserId, friendId)) {
            return res.status(403).json({ error: 'Access denied. You can only view messages with confirmed friends.' });
        }

        // Fetch messages in chronological order (oldest at top, newest at bottom)
        const messages = db.prepare(`
            SELECT id, sender_id, receiver_id, content, is_read, created_at
            FROM messages
            WHERE (sender_id = ? AND receiver_id = ?)
               OR (sender_id = ? AND receiver_id = ?)
            ORDER BY created_at ASC, id ASC
        `).all(currentUserId, friendId, friendId, currentUserId);

        // Mark unread messages sent by friend to current user as read
        db.prepare(`
            UPDATE messages
            SET is_read = 1
            WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
        `).run(friendId, currentUserId);

        const friend = db.prepare('SELECT id, name, email, bio, avatar FROM users WHERE id = ?').get(friendId);

        return res.json({
            friend,
            messages
        });
    } catch (err) {
        console.error('Error fetching messages:', err);
        return res.status(500).json({ error: 'Failed to fetch messages.' });
    }
});

/**
 * POST /api/messages/:friendId
 * Send a message to a confirmed friend
 * Strictly enforces that users must be confirmed friends!
 */
router.post('/:friendId', authenticateToken, (req, res) => {
    try {
        const currentUserId = req.user.id;
        const friendId = parseInt(req.params.friendId, 10);
        const { content } = req.body;

        if (isNaN(friendId)) {
            return res.status(400).json({ error: 'Invalid friend ID.' });
        }

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Message content cannot be empty.' });
        }

        // Strict authorization: Are they friends?
        if (!FriendService.areFriends(currentUserId, friendId)) {
            return res.status(403).json({ error: 'Access denied. You can only send messages to confirmed friends.' });
        }

        const now = new Date().toISOString();
        const insert = db.prepare(`
            INSERT INTO messages (sender_id, receiver_id, content, is_read, created_at)
            VALUES (?, ?, ?, 0, ?)
        `);

        const info = insert.run(currentUserId, friendId, content.trim(), now);

        const createdMessage = {
            id: info.lastInsertRowid,
            sender_id: currentUserId,
            receiver_id: friendId,
            content: content.trim(),
            is_read: 0,
            created_at: now
        };

        return res.status(201).json({
            message: 'Message sent successfully!',
            data: createdMessage
        });
    } catch (err) {
        console.error('Error sending message:', err);
        return res.status(500).json({ error: 'Failed to send message.' });
    }
});

module.exports = router;

const db = require('../database/db');

/**
 * Service handling friend relationships, requests, and validation
 */
class FriendService {
    /**
     * Checks if two users are already confirmed friends.
     * @param {number} userIdA
     * @param {number} userIdB
     * @returns {boolean}
     */
    static areFriends(userIdA, userIdB) {
        const u1 = Math.min(userIdA, userIdB);
        const u2 = Math.max(userIdA, userIdB);
        const row = db.prepare('SELECT id FROM friendships WHERE user1_id = ? AND user2_id = ?').get(u1, u2);
        return Boolean(row);
    }

    /**
     * Retrieves all confirmed friends for a given user.
     * @param {number} userId
     * @returns {Array<object>} List of friend user objects
     */
    static getFriends(userId) {
        // Query friendships where user is either user1 or user2, joining with users table
        const query = `
            SELECT 
                u.id, u.name, u.email, u.bio, u.avatar, u.role, u.created_at,
                f.created_at AS friendship_started_at
            FROM friendships f
            JOIN users u ON (u.id = CASE WHEN f.user1_id = ? THEN f.user2_id ELSE f.user1_id END)
            WHERE f.user1_id = ? OR f.user2_id = ?
            ORDER BY u.name ASC
        `;
        return db.prepare(query).all(userId, userId, userId);
    }

    /**
     * Retrieves pending incoming and outgoing friend requests for a user.
     * @param {number} userId
     * @returns {{ incoming: Array<object>, outgoing: Array<object> }}
     */
    static getPendingRequests(userId) {
        const incomingQuery = `
            SELECT 
                r.id, r.sender_id, r.receiver_id, r.status, r.created_at,
                u.name AS sender_name, u.email AS sender_email, u.bio AS sender_bio, u.avatar AS sender_avatar
            FROM friend_requests r
            JOIN users u ON u.id = r.sender_id
            WHERE r.receiver_id = ? AND r.status = 'pending'
            ORDER BY r.created_at DESC
        `;

        const outgoingQuery = `
            SELECT 
                r.id, r.sender_id, r.receiver_id, r.status, r.created_at,
                u.name AS receiver_name, u.email AS receiver_email, u.bio AS receiver_bio, u.avatar AS receiver_avatar
            FROM friend_requests r
            JOIN users u ON u.id = r.receiver_id
            WHERE r.sender_id = ? AND r.status = 'pending'
            ORDER BY r.created_at DESC
        `;

        const incoming = db.prepare(incomingQuery).all(userId);
        const outgoing = db.prepare(outgoingQuery).all(userId);

        return { incoming, outgoing };
    }

    /**
     * Sends a friend request from sender to receiver.
     * @param {number} senderId
     * @param {number} receiverId
     * @returns {object} created request
     */
    static sendRequest(senderId, receiverId) {
        if (senderId === receiverId) {
            throw new Error('You cannot send a friend request to yourself.');
        }

        const receiver = db.prepare('SELECT id, role FROM users WHERE id = ?').get(receiverId);
        if (!receiver) {
            throw new Error('Target user does not exist.');
        }

        const PRIVILEGED_ROLES = new Set(['admin', 'administrator', 'staff']);
        if (PRIVILEGED_ROLES.has((receiver.role || '').toLowerCase())) {
            throw new Error('Cannot send friend request to an administrator account.');
        }

        if (this.areFriends(senderId, receiverId)) {
            throw new Error('You are already friends with this user.');
        }

        // Check for existing pending request in either direction
        const existing = db.prepare(`
            SELECT id, sender_id, receiver_id, status 
            FROM friend_requests 
            WHERE (sender_id = ? AND receiver_id = ?) 
               OR (sender_id = ? AND receiver_id = ?)
        `).get(senderId, receiverId, receiverId, senderId);

        if (existing) {
            if (existing.status === 'pending') {
                if (existing.sender_id === senderId) {
                    throw new Error('Friend request already sent and pending.');
                } else {
                    throw new Error('This user has already sent you a friend request. You can accept it from your requests tab.');
                }
            } else if (existing.status === 'rejected') {
                // If previously rejected, allow re-requesting by updating the existing row
                db.prepare(`
                    UPDATE friend_requests 
                    SET sender_id = ?, receiver_id = ?, status = 'pending', updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `).run(senderId, receiverId, existing.id);
                return { id: existing.id, sender_id: senderId, receiver_id: receiverId, status: 'pending' };
            }
        }

        const info = db.prepare(`
            INSERT INTO friend_requests (sender_id, receiver_id, status)
            VALUES (?, ?, 'pending')
        `).run(senderId, receiverId);

        return { id: info.lastInsertRowid, sender_id: senderId, receiver_id: receiverId, status: 'pending' };
    }

    /**
     * Accepts a pending friend request and creates the canonical undirected friendship.
     * @param {number} requestId
     * @param {number} receiverId - ID of user accepting the request
     * @returns {object} friendship record
     */
    static acceptRequest(requestId, receiverId) {
        const request = db.prepare(`
            SELECT id, sender_id, receiver_id, status 
            FROM friend_requests 
            WHERE id = ?
        `).get(requestId);

        if (!request) {
            throw new Error('Friend request not found.');
        }

        if (request.receiver_id !== receiverId) {
            throw new Error('Unauthorized. You can only accept requests addressed to you.');
        }

        if (request.status !== 'pending') {
            throw new Error(`Cannot accept request with status '${request.status}'.`);
        }

        const u1 = Math.min(request.sender_id, request.receiver_id);
        const u2 = Math.max(request.sender_id, request.receiver_id);

        // Run both updates in a single database transaction
        const acceptTx = db.transaction(() => {
            db.prepare(`
                UPDATE friend_requests 
                SET status = 'accepted', updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `).run(requestId);

            // Insert into friendships if not already present
            const insertFriendship = db.prepare(`
                INSERT OR IGNORE INTO friendships (user1_id, user2_id)
                VALUES (?, ?)
            `);
            const info = insertFriendship.run(u1, u2);
            return { friendshipId: info.lastInsertRowid, user1_id: u1, user2_id: u2 };
        });

        return acceptTx();
    }

    /**
     * Rejects an incoming friend request.
     * @param {number} requestId
     * @param {number} receiverId
     */
    static rejectRequest(requestId, receiverId) {
        const request = db.prepare('SELECT id, receiver_id, status FROM friend_requests WHERE id = ?').get(requestId);
        if (!request) {
            throw new Error('Friend request not found.');
        }

        if (request.receiver_id !== receiverId) {
            throw new Error('Unauthorized. You can only reject requests addressed to you.');
        }

        db.prepare("UPDATE friend_requests SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(requestId);
        return { success: true, message: 'Friend request rejected.' };
    }

    /**
     * Cancels an outgoing friend request.
     * @param {number} requestId
     * @param {number} senderId
     */
    static cancelRequest(requestId, senderId) {
        const request = db.prepare('SELECT id, sender_id FROM friend_requests WHERE id = ?').get(requestId);
        if (!request) {
            throw new Error('Friend request not found.');
        }

        if (request.sender_id !== senderId) {
            throw new Error('Unauthorized. You can only cancel requests sent by you.');
        }

        db.prepare('DELETE FROM friend_requests WHERE id = ?').run(requestId);
        return { success: true, message: 'Friend request cancelled.' };
    }

    /**
     * Removes an existing friendship.
     * @param {number} userIdA
     * @param {number} userIdB
     */
    static removeFriend(userIdA, userIdB) {
        const u1 = Math.min(userIdA, userIdB);
        const u2 = Math.max(userIdA, userIdB);

        const result = db.prepare('DELETE FROM friendships WHERE user1_id = ? AND user2_id = ?').run(u1, u2);
        if (result.changes === 0) {
            throw new Error('No friendship found between these users.');
        }

        // Also clean up any lingering friend requests between them so they can send requests again in future
        db.prepare(`
            DELETE FROM friend_requests 
            WHERE (sender_id = ? AND receiver_id = ?) 
               OR (sender_id = ? AND receiver_id = ?)
        `).run(userIdA, userIdB, userIdB, userIdA);

        return { success: true, message: 'Friend removed successfully.' };
    }
}

module.exports = FriendService;

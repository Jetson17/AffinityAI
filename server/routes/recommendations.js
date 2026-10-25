const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { getHybridFriendRecommendations } = require('../algorithms/recommendation');

const router = express.Router();

/**
 * GET /api/recommendations
 * Computes hybrid ML-ranked friend recommendations for current user
 * with graceful fallback to graph heuristic.
 *
 * PIPELINE:
 * 1. Authenticate user session
 * 2. Retrieve confirmed friendships and pending requests
 * 3. Generate candidate pool via 2-hop graph traversal and cold-start discovery
 * 4. Filter confirmed friends and pending request partners
 * 5. Extract 7 explainable candidate-pair features
 * 6. Invoke supervised ML model (Logistic Regression) or heuristic fallback
 * 7. Rank candidates and return explainable feature rationale
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        if (req.user && req.user.role === 'admin') {
            return res.status(403).json({ error: 'Administrative accounts cannot receive student friend recommendations.' });
        }
        const currentUserId = req.user.id;

        // Fetch all active users with profile bio and interests
        const allUsers = db.prepare(`
            SELECT id, name, email, bio, interests, avatar, role FROM users
        `).all();

        // Fetch all confirmed friendships (undirected edges)
        const friendships = db.prepare(`
            SELECT user1_id, user2_id FROM friendships
        `).all();

        // Fetch all active pending requests involving any user or current user
        const pendingRequests = db.prepare(`
            SELECT sender_id, receiver_id FROM friend_requests WHERE status = 'pending'
        `).all();

        // Execute hybrid ML recommendation pipeline
        const result = await getHybridFriendRecommendations(
            currentUserId,
            allUsers,
            friendships,
            pendingRequests
        );

        // Ensure privileged accounts are never returned as friend recommendations
        const PRIVILEGED_ROLES = new Set(['admin', 'administrator', 'staff']);
        const eligibleRecommendations = (result.recommendations || []).filter(
            r => !PRIVILEGED_ROLES.has((r.user.role || '').toLowerCase())
        );

        return res.json({
            recommendations: eligibleRecommendations,
            meta: {
                totalCandidates: result.recommendations.length,
                recommendationMode: result.mode, // 'ml' | 'heuristic'
                modelName: result.modelName,
                algorithm: result.mode === 'ml' 
                    ? 'Supervised Logistic Regression (Calibrated Link Predictor) + Graph Traversal'
                    : 'Graph Triadic Closure & Heuristic Affinity (Fallback)',
                timeComplexity: 'O(V + E + K log K)',
                generatedAt: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error('Recommendations error:', err);
        return res.status(500).json({ error: 'Failed to generate recommendations.' });
    }
});

module.exports = router;

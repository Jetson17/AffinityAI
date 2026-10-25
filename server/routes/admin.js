const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const MLRecommendationService = require('../services/mlService');
const { extractAcademicTopics } = require('../algorithms/recommendation');

const router = express.Router();

/**
 * All admin routes require valid authentication AND 'admin' role
 */
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/admin/stats
 * Aggregate platform statistics for Admin Overview
 */
router.get('/stats', (req, res) => {
    try {
        const totalUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
        const totalStudents = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role != 'admin'").get().count;
        const totalAdmins = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get().count;
        
        // Exclude administrator accounts from student network calculations
        const studentFriendships = db.prepare(`
            SELECT COUNT(*) AS count 
            FROM friendships f
            JOIN users u1 ON f.user1_id = u1.id
            JOIN users u2 ON f.user2_id = u2.id
            WHERE u1.role != 'admin' AND u2.role != 'admin'
        `).get().count;

        const totalRequests = db.prepare('SELECT COUNT(*) AS count FROM friend_requests').get().count;
        const pendingRequests = db.prepare("SELECT COUNT(*) AS count FROM friend_requests WHERE status = 'pending'").get().count;
        const acceptedRequests = db.prepare("SELECT COUNT(*) AS count FROM friend_requests WHERE status = 'accepted'").get().count;
        const rejectedRequests = db.prepare("SELECT COUNT(*) AS count FROM friend_requests WHERE status = 'rejected'").get().count;
        const totalMessages = db.prepare('SELECT COUNT(*) AS count FROM messages').get().count;

        // Calculate student network average degree and density
        const avgDegree = totalStudents > 0 ? ((2 * studentFriendships) / totalStudents).toFixed(2) : '0.00';
        const possibleEdges = totalStudents > 1 ? (totalStudents * (totalStudents - 1)) / 2 : 0;
        const graphDensity = possibleEdges > 0 ? ((studentFriendships / possibleEdges) * 100).toFixed(2) : '0.00';

        // Check ML Model inference readiness
        const isMlAvailable = MLRecommendationService.isModelAvailable();

        return res.json({
            stats: {
                totalUsers,
                totalStudents,
                totalAdmins,
                totalFriendships: studentFriendships,
                totalRequests,
                pendingRequests,
                acceptedRequests,
                rejectedRequests,
                totalMessages,
                avgDegree: parseFloat(avgDegree),
                graphDensity: parseFloat(graphDensity),
                activeModel: {
                    isAvailable: isMlAvailable,
                    mode: isMlAvailable ? 'ml' : 'heuristic',
                    modelName: 'Logistic Regression (Calibrated Link Predictor)'
                }
            }
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        return res.status(500).json({ error: 'Failed to retrieve administrative statistics.' });
    }
});

/**
 * GET /api/admin/users
 * Lists registered users with their friend counts, request statistics and account status.
 * (Strictly excludes password hashes and private messages)
 */
router.get('/users', (req, res) => {
    try {
        const users = db.prepare(`
            SELECT 
                u.id, u.name, u.email, u.bio, u.interests, u.avatar, u.role, u.created_at,
                COALESCE(u.is_active, 1) AS is_active,
                (SELECT COUNT(*) FROM friendships WHERE user1_id = u.id OR user2_id = u.id) AS friend_count,
                (SELECT COUNT(*) FROM friend_requests WHERE sender_id = u.id) AS sent_requests_count,
                (SELECT COUNT(*) FROM friend_requests WHERE receiver_id = u.id) AS received_requests_count
            FROM users u
            ORDER BY u.id ASC
        `).all();

        return res.json({ users });
    } catch (err) {
        console.error('Admin users error:', err);
        return res.status(500).json({ error: 'Failed to retrieve user registry.' });
    }
});

/**
 * PUT /api/admin/users/:id/status
 * Safely toggle account status (is_active) with protections against self/admin modification.
 */
router.put('/users/:id/status', (req, res) => {
    try {
        const targetId = parseInt(req.params.id, 10);
        const { is_active } = req.body;

        if (isNaN(targetId)) {
            return res.status(400).json({ error: 'Invalid user ID.' });
        }

        // Prevent modification of self (active admin)
        if (req.user.id === targetId) {
            return res.status(400).json({ error: 'Cannot deactivate your own administrator account.' });
        }

        const targetUser = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(targetId);
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Prevent modification of other administrators
        if (targetUser.role === 'admin') {
            return res.status(400).json({ error: 'Cannot deactivate an administrator account.' });
        }

        const newStatus = is_active === 0 || is_active === false ? 0 : 1;
        db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newStatus, targetId);

        return res.json({
            message: `User "${targetUser.name}" has been ${newStatus === 1 ? 'activated' : 'deactivated'}.`,
            userId: targetId,
            is_active: newStatus
        });
    } catch (err) {
        console.error('Update user status error:', err);
        return res.status(500).json({ error: 'Failed to update user status.' });
    }
});

/**
 * GET /api/admin/ml-monitoring
 * Returns verified inference status, training metadata, synthetic-data disclosure,
 * actual stored evaluation metrics, and explainable feature coefficients.
 */
router.get('/ml-monitoring', (req, res) => {
    try {
        const metaPath = path.join(__dirname, '..', 'ml', 'model', 'model_meta.json');
        const evalPath = path.join(__dirname, '..', 'ml', 'model', 'evaluation_report.json');

        let modelMeta = null;
        let evalReport = null;

        if (fs.existsSync(metaPath)) {
            try {
                modelMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            } catch (_) { }
        }

        if (fs.existsSync(evalPath)) {
            try {
                evalReport = JSON.parse(fs.readFileSync(evalPath, 'utf8'));
            } catch (_) { }
        }

        const isAvailable = MLRecommendationService.isModelAvailable();
        const coefs = modelMeta?.feature_coefficients || null;

        const features = [
            {
                key: 'mutual_friends',
                name: 'Mutual Friends Count',
                description: 'Count of confirmed shared friends (triadic closure effect)',
                coefficient: typeof coefs?.mutual_friends === 'number' ? coefs.mutual_friends : null,
                interpretation: 'Strong positive indicator of social proximity and organic trust'
            },
            {
                key: 'friend_jaccard',
                name: 'Friend Jaccard Similarity',
                description: '|F(u) ∩ F(v)| / |F(u) ∪ F(v)| neighborhood overlap',
                coefficient: typeof coefs?.friend_jaccard === 'number' ? coefs.friend_jaccard : null,
                interpretation: 'Proportional community alignment in social graph'
            },
            {
                key: 'shared_interests',
                name: 'Shared Academic Topics',
                description: 'Count of overlapping canonical topics normalized from bio/interests',
                coefficient: typeof coefs?.shared_interests === 'number' ? coefs.shared_interests : null,
                interpretation: 'High positive weight driving academic homophily'
            },
            {
                key: 'interest_jaccard',
                name: 'Interest Jaccard Overlap',
                description: '|T(u) ∩ T(v)| / |T(u) ∪ T(v)| topic breadth ratio',
                coefficient: typeof coefs?.interest_jaccard === 'number' ? coefs.interest_jaccard : null,
                interpretation: 'Regularizes against over-diluted interest portfolios'
            },
            {
                key: 'target_degree',
                name: 'Target User Degree',
                description: 'Count of existing friends of the initiating student',
                coefficient: typeof coefs?.target_degree === 'number' ? coefs.target_degree : null,
                interpretation: 'Balances recommendations for well-connected vs cold-start users'
            },
            {
                key: 'candidate_degree',
                name: 'Candidate User Degree',
                description: 'Count of existing friends of candidate student',
                coefficient: typeof coefs?.candidate_degree === 'number' ? coefs.candidate_degree : null,
                interpretation: 'Prevents popular node centralization (hub bias mitigation)'
            },
            {
                key: 'adamic_adar_approx',
                name: 'Adamic-Adar Proximity',
                description: 'Log-penalized mutual friend proximity: Σ 1/log(deg(w))',
                coefficient: typeof coefs?.adamic_adar_approx === 'number' ? coefs.adamic_adar_approx : null,
                interpretation: 'Highest predictive weight rewarding shared niche connections'
            }
        ];

        const lrMetrics = modelMeta?.logistic_regression_metrics || null;
        const evalMlMetrics = evalReport?.metrics?.ml_logistic_regression || null;

        const evaluationMetrics = (lrMetrics || evalMlMetrics) ? {
            accuracy: typeof lrMetrics?.accuracy === 'number' ? lrMetrics.accuracy : null,
            precision: typeof evalMlMetrics?.precision === 'number' ? evalMlMetrics.precision : (typeof lrMetrics?.precision === 'number' ? lrMetrics.precision : null),
            recall: typeof evalMlMetrics?.recall === 'number' ? evalMlMetrics.recall : (typeof lrMetrics?.recall === 'number' ? lrMetrics.recall : null),
            f1_score: typeof evalMlMetrics?.f1_score === 'number' ? evalMlMetrics.f1_score : (typeof lrMetrics?.f1_score === 'number' ? lrMetrics.f1_score : null),
            roc_auc: typeof evalMlMetrics?.roc_auc === 'number' ? evalMlMetrics.roc_auc : (typeof lrMetrics?.roc_auc === 'number' ? lrMetrics.roc_auc : null)
        } : null;

        const topKMetrics = evalMlMetrics ? {
            precisionAt1: typeof evalMlMetrics['precision@1'] === 'number' ? evalMlMetrics['precision@1'] : null,
            precisionAt3: typeof evalMlMetrics['precision@3'] === 'number' ? evalMlMetrics['precision@3'] : null,
            precisionAt5: typeof evalMlMetrics['precision@5'] === 'number' ? evalMlMetrics['precision@5'] : null
        } : null;

        const trainingSamples = typeof modelMeta?.training_samples === 'number' ? modelMeta.training_samples : null;
        const testSamples = typeof evalReport?.test_samples === 'number'
            ? evalReport.test_samples
            : (typeof modelMeta?.test_samples === 'number' ? modelMeta.test_samples : null);

        return res.json({
            status: 'ok',
            modelAvailable: isAvailable,
            activeMode: isAvailable ? 'ml' : 'heuristic',
            modelName: modelMeta?.production_model || 'Logistic Regression',
            trainedAt: modelMeta?.trained_at || null,
            trainingSamples,
            testSamples,
            datasetType: modelMeta?.dataset_type || 'synthetic_educational_benchmark',
            syntheticDataDisclosure: 'The machine learning model was trained and evaluated on an educational benchmark dataset simulating university student friendship graphs and academic topic distributions. Real user data is kept private.',
            evaluationMetrics,
            topKMetrics,
            heuristicComparison: evalReport?.metrics?.heuristic_baseline || null,
            features,
            authoritativeArtifacts: {
                modelMetaPath: fs.existsSync(metaPath) ? 'server/ml/model/model_meta.json' : null,
                evaluationReportPath: fs.existsSync(evalPath) ? 'server/ml/model/evaluation_report.json' : null
            },
            pipelineStages: [
                {
                    step: 1,
                    title: 'Graph Traversal & Candidate Discovery',
                    details: 'Executes 2-hop BFS from target student to identify triadic closure candidates. Expands to cold-start peers with shared interests if fewer than 5 candidates exist. Privileged administrator accounts are strictly excluded.'
                },
                {
                    step: 2,
                    title: 'Pair-Wise Feature Extraction',
                    details: 'Constructs 7 explainable topological and academic affinity features (mutual friends, Jaccard similarities, degrees, Adamic-Adar proximity) without leaking private information.'
                },
                {
                    step: 3,
                    title: 'Supervised Link Probability Calibration',
                    details: 'Applies scikit-learn standard scaling and logistic sigmoid P(y=1|X) = 1 / (1 + exp(-(W·X + b))) to produce well-calibrated match probabilities.'
                },
                {
                    step: 4,
                    title: 'Stable Ranking & Heuristic Fallback',
                    details: 'Ranks candidates by predicted probability descending. Automatically falls back to transparent graph heuristic scoring if Python process or joblib model is unavailable.'
                }
            ]
        });
    } catch (err) {
        console.error('ML monitoring error:', err);
        return res.status(500).json({ error: 'Failed to retrieve ML monitoring data.' });
    }
});

/**
 * GET /api/admin/analytics
 * Real platform analytics: Degree distribution, topic affinity, request conversion rate, messaging volume.
 * Strictly excludes administrator accounts from student friendship network calculations.
 */
router.get('/analytics', (req, res) => {
    try {
        const allUsers = db.prepare('SELECT id, name, interests, bio, role FROM users').all();
        const studentUsers = allUsers.filter(u => u.role !== 'admin');
        const totalStudents = studentUsers.length;
        const studentIds = new Set(studentUsers.map(u => u.id));

        // Exclude administrator accounts from student network
        const allFriendships = db.prepare('SELECT user1_id, user2_id FROM friendships').all();
        const studentFriendships = allFriendships.filter(f => studentIds.has(f.user1_id) && studentIds.has(f.user2_id));
        const totalFriendships = studentFriendships.length;

        // 1. Degree distribution strictly for students within the student friendship network
        const degrees = new Map();
        studentUsers.forEach(u => degrees.set(u.id, 0));
        studentFriendships.forEach(f => {
            degrees.set(f.user1_id, (degrees.get(f.user1_id) || 0) + 1);
            degrees.set(f.user2_id, (degrees.get(f.user2_id) || 0) + 1);
        });

        const degreeBuckets = { '0 friends': 0, '1-2 friends': 0, '3-4 friends': 0, '5+ friends': 0 };
        studentUsers.forEach(u => {
            const deg = degrees.get(u.id) || 0;
            if (deg === 0) degreeBuckets['0 friends']++;
            else if (deg <= 2) degreeBuckets['1-2 friends']++;
            else if (deg <= 4) degreeBuckets['3-4 friends']++;
            else degreeBuckets['5+ friends']++;
        });

        // Consistent average degree and density
        const avgDegree = totalStudents > 0 ? ((2 * totalFriendships) / totalStudents).toFixed(2) : '0.00';
        const possibleEdges = totalStudents > 1 ? (totalStudents * (totalStudents - 1)) / 2 : 0;
        const graphDensity = possibleEdges > 0 ? ((totalFriendships / possibleEdges) * 100).toFixed(2) : '0.00';

        // 2. Real topic frequency from actual student profiles
        const topicCounts = {};
        studentUsers.forEach(u => {
            const topics = extractAcademicTopics(u);
            topics.forEach(t => {
                topicCounts[t] = (topicCounts[t] || 0) + 1;
            });
        });

        const sortedTopics = Object.entries(topicCounts)
            .map(([topic, count]) => ({ topic, count }))
            .sort((a, b) => b.count - a.count);

        // 3. Friend requests status breakdown
        const requestCounts = db.prepare(`
            SELECT status, COUNT(*) AS count FROM friend_requests GROUP BY status
        `).all();
        const requestBreakdown = { pending: 0, accepted: 0, rejected: 0 };
        requestCounts.forEach(r => { requestBreakdown[r.status] = r.count; });

        const totalRequests = (requestBreakdown.pending + requestBreakdown.accepted + requestBreakdown.rejected) || 0;
        const conversionRate = totalRequests > 0
            ? ((requestBreakdown.accepted / totalRequests) * 100).toFixed(1)
            : '0.0';

        // 4. Message activity overview (Counts only, zero message contents)
        const totalMessages = db.prepare('SELECT COUNT(*) AS count FROM messages').get().count;
        const activeChatPairs = db.prepare(`
            SELECT COUNT(DISTINCT (CASE WHEN sender_id < receiver_id THEN sender_id || '_' || receiver_id ELSE receiver_id || '_' || sender_id END)) AS count 
            FROM messages
        `).get().count;

        return res.json({
            degreeBuckets,
            topTopics: sortedTopics,
            requestBreakdown,
            conversionRate: parseFloat(conversionRate),
            totalMessages,
            activeChatPairs,
            totalStudents,
            totalFriendships,
            avgDegree: parseFloat(avgDegree),
            graphDensity: parseFloat(graphDensity)
        });
    } catch (err) {
        console.error('Admin analytics error:', err);
        return res.status(500).json({ error: 'Failed to retrieve platform analytics.' });
    }
});

module.exports = router;

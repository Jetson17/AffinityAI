const express = require('express');
const db = require('../database/db');
const { getFriendRecommendations } = require('../algorithms/recommendation');
const { runKruskalMST, sampleCampusBackboneGraph } = require('../algorithms/kruskalMST');
const { runKahnTopologicalSort, sampleProgressionDAG, sampleCoursePrerequisiteDAG } = require('../algorithms/kahnTopologicalSort');

const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * All DSA Lab demonstration endpoints require authentication AND 'admin' role
 */
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/dsa/friendship-graph
 * Provides graph representation of all users and friendships for visualization
 * Allows specifying ?rootId=<userId> to calculate recommendations and highlights for that user.
 */
router.get('/friendship-graph', (req, res) => {
    try {
        const users = db.prepare('SELECT id, name, email, bio, avatar, role FROM users').all();
        const friendships = db.prepare('SELECT id, user1_id, user2_id FROM friendships').all();
        const pendingRequests = db.prepare("SELECT sender_id, receiver_id FROM friend_requests WHERE status = 'pending'").all();

        const rootId = parseInt(req.query.rootId, 10) || (users[0] ? users[0].id : 1);

        // Nodes for graph visualization
        const nodes = users.map(u => ({
            id: u.id,
            label: u.name,
            role: u.role,
            avatar: u.avatar
        }));

        // Edges for graph visualization
        const edges = friendships.map(f => ({
            id: `e_${f.user1_id}_${f.user2_id}`,
            source: f.user1_id,
            target: f.user2_id,
            type: 'undirected'
        }));

        // Compute recommendations for root user
        const recommendations = getFriendRecommendations(rootId, users, friendships, pendingRequests);

        // Identify 1-hop friends for the root node
        const directFriends = new Set();
        friendships.forEach(f => {
            if (f.user1_id === rootId) directFriends.add(f.user2_id);
            if (f.user2_id === rootId) directFriends.add(f.user1_id);
        });

        return res.json({
            rootId,
            nodes,
            edges,
            directFriends: Array.from(directFriends),
            recommendations,
            stats: {
                totalVertices: nodes.length,
                totalEdges: edges.length
            }
        });
    } catch (err) {
        console.error('Error fetching friendship graph:', err);
        return res.status(500).json({ error: 'Failed to generate friendship graph.' });
    }
});

/**
 * GET /api/dsa/mst
 * Runs Kruskal's algorithm on the sample campus communication backbone graph
 */
router.get('/mst', (req, res) => {
    try {
        const result = runKruskalMST(
            sampleCampusBackboneGraph.vertices,
            sampleCampusBackboneGraph.edges
        );

        return res.json({
            graph: {
                vertices: result.canonicalVertices,
                edges: sampleCampusBackboneGraph.edges
            },
            result,
            explanation: {
                title: 'Minimum Spanning Tree (Kruskal + Disjoint Set Union)',
                concept: 'Connects all vertices with minimum possible total edge weight without introducing cycles.',
                distinction: 'Educational Demonstration: In social networks, MST identifies the minimal cost communication backbone connecting servers/nodes. It is separate from mutual-friend recommendation ranking.'
            }
        });
    } catch (err) {
        console.error('Error in MST demo:', err);
        return res.status(500).json({ error: 'Failed to execute Kruskal MST.' });
    }
});

/**
 * POST /api/dsa/mst
 * Runs Kruskal's algorithm on custom user-provided graph
 */
router.post('/mst', (req, res) => {
    try {
        const { vertices, edges } = req.body;
        if (!vertices || !Array.isArray(vertices) || !edges || !Array.isArray(edges)) {
            return res.status(400).json({ error: 'Please provide valid vertices and edges arrays.' });
        }

        const result = runKruskalMST(vertices, edges);
        return res.json({
            graph: {
                vertices: result.canonicalVertices,
                edges
            },
            result
        });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * GET /api/dsa/topological-sort
 * Runs Kahn's algorithm on sample DAGs (Social Progression Workflow or CS Prerequisites)
 */
router.get('/topological-sort', (req, res) => {
    try {
        const type = req.query.type === 'courses' ? 'courses' : 'workflow';
        const sampleGraph = type === 'courses' ? sampleCoursePrerequisiteDAG : sampleProgressionDAG;

        const result = runKahnTopologicalSort(sampleGraph.vertices, sampleGraph.edges);

        return res.json({
            graphType: type,
            graph: sampleGraph,
            result,
            explanation: {
                title: "Topological Sorting (Kahn's Algorithm)",
                concept: 'Finds a linear sequence for vertices in a Directed Acyclic Graph (DAG) respecting all prerequisite dependencies.',
                distinction: 'Educational Demonstration: Topological sorting requires directed acyclic edges (e.g. stage prerequisites). It is NOT applicable to ordinary mutual friendships which are undirected and cyclic.'
            }
        });
    } catch (err) {
        console.error('Error in Topological Sort demo:', err);
        return res.status(500).json({ error: 'Failed to execute Kahn Topological Sort.' });
    }
});

/**
 * POST /api/dsa/topological-sort
 * Runs Kahn's algorithm on custom user-provided DAG
 */
router.post('/topological-sort', (req, res) => {
    try {
        const { vertices, edges } = req.body;
        if (!vertices || !Array.isArray(vertices) || !edges || !Array.isArray(edges)) {
            return res.status(400).json({ error: 'Please provide valid vertices and edges arrays.' });
        }

        const result = runKahnTopologicalSort(vertices, edges);
        return res.json({ result });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

module.exports = router;

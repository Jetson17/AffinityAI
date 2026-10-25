const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { getFriendRecommendations, buildAdjacencyList } = require('../algorithms/recommendation');
const { runKruskalMST, DisjointSetUnion } = require('../algorithms/kruskalMST');
const { runKahnTopologicalSort } = require('../algorithms/kahnTopologicalSort');

describe('DSA Algorithms Unit Tests', () => {

    describe('1. Friend Recommendation Graph Algorithm', () => {
        test('Calculates mutual friend count and ranks candidates correctly', () => {
            // Test Graph:
            // Alice (1) -- Bob (2)
            // Alice (1) -- Charlie (3)
            // Bob (2) -- David (4)
            // Charlie (3) -- David (4)
            // Charlie (3) -- Emma (5)
            // Expected for Alice:
            // 1-hop friends: Bob (2), Charlie (3)
            // David (4) is friend with Bob and Charlie -> 2 mutual friends
            // Emma (5) is friend with Charlie -> 1 mutual friend
            // Ranking: David (2) > Emma (1)

            const users = [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Charlie' },
                { id: 4, name: 'David' },
                { id: 5, name: 'Emma' }
            ];

            const friendships = [
                { user1_id: 1, user2_id: 2 },
                { user1_id: 1, user2_id: 3 },
                { user1_id: 2, user2_id: 4 },
                { user1_id: 3, user2_id: 4 },
                { user1_id: 3, user2_id: 5 }
            ];

            const pending = [];

            const recs = getFriendRecommendations(1, users, friendships, pending);

            assert.equal(recs.length, 2, 'Should recommend David and Emma');
            assert.equal(recs[0].user.name, 'David');
            assert.equal(recs[0].mutualCount, 2, 'David should have 2 mutual friends');
            assert.equal(recs[1].user.name, 'Emma');
            assert.equal(recs[1].mutualCount, 1, 'Emma should have 1 mutual friend');
        });

        test('Excludes pending request targets and incoming requesters from recommendations', () => {
            const users = [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Charlie' }
            ];

            const friendships = [
                { user1_id: 1, user2_id: 2 },
                { user1_id: 2, user2_id: 3 }
            ];

            // Charlie has a pending request with Alice
            const pending = [{ sender_id: 1, receiver_id: 3 }];

            const recs = getFriendRecommendations(1, users, friendships, pending);
            assert.equal(recs.length, 0, 'Charlie should be excluded due to pending request');
        });

        test('Handles cold-start users with 0 friends gracefully', () => {
            const users = [
                { id: 10, name: 'New Student', bio: 'AI enthusiast', interests: 'Artificial Intelligence, Machine Learning' },
                { id: 11, name: 'Alice', bio: 'AI researcher', interests: 'Artificial Intelligence' },
                { id: 12, name: 'Bob', bio: 'Cybersecurity learner', interests: 'Cybersecurity' }
            ];
            const friendships = [];
            const pending = [];

            const recs = getFriendRecommendations(10, users, friendships, pending);
            assert.ok(Array.isArray(recs));
            assert.equal(recs.length, 2, 'Should provide cold-start recommendations from campus community');
            // Check that self is excluded
            assert.ok(!recs.some(r => r.user.id === 10));
            // All candidates have 0 mutual friends
            assert.equal(recs[0].mutualCount, 0);
            assert.ok(recs[0].reason.includes('discovery') || recs[0].reason.includes('community'));
        });

        test('Extracts academic topics with synonym normalization', () => {
            const { extractAcademicTopics } = require('../algorithms/recommendation');
            const topics1 = extractAcademicTopics('Working on AI and deep neural networks');
            assert.ok(topics1.includes('Artificial Intelligence'));

            const topics2 = extractAcademicTopics({ bio: 'Full-stack web dev', interests: 'React, Node, DSA' });
            assert.ok(topics2.includes('Web Development'));
            assert.ok(topics2.includes('Algorithms'));

            // Empty and undefined cases
            assert.deepEqual(extractAcademicTopics(''), []);
            assert.deepEqual(extractAcademicTopics(null), []);
            assert.deepEqual(extractAcademicTopics({ bio: '', interests: '' }), []);
        });

        test('Extracts candidate-pair ML features accurately', () => {
            const { extractCandidateFeatures } = require('../algorithms/recommendation');
            const targetUser = { id: 1, bio: 'AI, Algorithms', interests: 'Machine Learning' };
            const candidateUser = { id: 2, bio: 'Machine Learning enthusiast', interests: 'Algorithms' };

            const targetFriends = new Set([3, 4, 5]);
            const candidateFriends = new Set([4, 5, 6, 7]);
            const adj = new Map([
                [3, new Set([1])],
                [4, new Set([1, 2, 8])],
                [5, new Set([1, 2, 8, 9])],
                [6, new Set([2])],
                [7, new Set([2])]
            ]);

            const feat = extractCandidateFeatures(targetUser, candidateUser, targetFriends, candidateFriends, adj);

            assert.equal(feat.candidate_id, 2);
            assert.equal(feat.mutual_friends, 2, 'Mutual friends {4, 5} count is 2');
            assert.equal(feat.friend_jaccard, parseFloat((2 / 5).toFixed(4)));
            assert.ok(feat.shared_interests >= 2, 'Shared AI/ML and Algorithms');
            assert.equal(feat.target_degree, 3);
            assert.equal(feat.candidate_degree, 4);
            assert.ok(feat.adamic_adar_approx > 0);
        });

        test('Ensures duplicate candidate prevention and stable sorting', () => {
            const users = [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Charlie' },
                { id: 4, name: 'David' }
            ];
            // Multi-graph redundant edges should not cause duplicates
            const friendships = [
                { user1_id: 1, user2_id: 2 },
                { user1_id: 1, user2_id: 3 },
                { user1_id: 2, user2_id: 4 },
                { user1_id: 3, user2_id: 4 }
            ];

            const recs = getFriendRecommendations(1, users, friendships, []);
            const ids = recs.map(r => r.user.id);
            const uniqueIds = new Set(ids);
            assert.equal(ids.length, uniqueIds.size, 'Candidate IDs must be strictly unique');
            assert.equal(recs[0].user.name, 'David');
        });

        test('Excludes administrator accounts from 2-hop recommendations', () => {
            const users = [
                { id: 1, name: 'Alice', role: 'user' },
                { id: 2, name: 'Bob', role: 'user' },
                { id: 5, name: 'Emma', role: 'user' },
                { id: 9, name: 'Admin User', role: 'admin' }
            ];
            // Alice -- Bob -- Emma
            //       \-- Bob -- Admin User
            const friendships = [
                { user1_id: 1, user2_id: 2 },
                { user1_id: 2, user2_id: 5 },
                { user1_id: 2, user2_id: 9 }
            ];

            const recs = getFriendRecommendations(1, users, friendships, []);
            assert.ok(recs.some(r => r.user.id === 5), 'Emma should be recommended');
            assert.ok(!recs.some(r => r.user.id === 9), 'Admin User must NOT be recommended in 2-hop graph');
        });

        test('Excludes administrator accounts from cold-start recommendations', () => {
            const users = [
                { id: 10, name: 'New Student', role: 'user', bio: 'AI', interests: 'AI' },
                { id: 11, name: 'Classmate', role: 'user', bio: 'AI', interests: 'AI' },
                { id: 99, name: 'System Admin', role: 'admin', bio: 'AI', interests: 'AI' }
            ];
            const friendships = [];

            const recs = getFriendRecommendations(10, users, friendships, []);
            assert.equal(recs.length, 1, 'Only regular student should be recommended');
            assert.equal(recs[0].user.id, 11);
            assert.ok(!recs.some(r => r.user.id === 99), 'System Admin must NOT be recommended in cold-start');
        });
    });

    describe("2. Minimum Spanning Tree (Kruskal's + DSU)", () => {
        test('DSU correctly unites sets and detects cycles', () => {
            const dsu = new DisjointSetUnion(['A', 'B', 'C']);
            assert.equal(dsu.find('A'), 'A');
            assert.equal(dsu.find('B'), 'B');

            // Union A and B
            const united = dsu.union('A', 'B');
            assert.equal(united, true);
            assert.equal(dsu.find('A'), dsu.find('B'));

            // Second union should return false (cycle detection)
            const cycle = dsu.union('A', 'B');
            assert.equal(cycle, false);
        });

        test('Kruskal algorithm produces minimal total weight and V - 1 edges', () => {
            // Triangle with weights: A-B: 1, B-C: 2, A-C: 5
            // Expected MST: A-B (1), B-C (2), Total: 3
            const vertices = ['A', 'B', 'C'];
            const edges = [
                { u: 'A', v: 'B', weight: 1 },
                { u: 'B', v: 'C', weight: 2 },
                { u: 'A', v: 'C', weight: 5 }
            ];

            const result = runKruskalMST(vertices, edges);
            assert.equal(result.mstEdges.length, 2, 'MST must have V - 1 = 2 edges');
            assert.equal(result.totalWeight, 3, 'Total MST weight must be 1 + 2 = 3');
            assert.equal(result.isConnected, true);
        });

        test('Cycle rejection correctly identifies endpoints in same DSU set and marks REJECTED', () => {
            // Square with diagonal: A-B (1), B-C (2), C-D (3), D-A (4), B-D (1.5)
            const vertices = ['A', 'B', 'C', 'D'];
            const edges = [
                { u: 'A', v: 'B', weight: 1 },
                { u: 'B', v: 'D', weight: 1.5 },
                { u: 'B', v: 'C', weight: 2 },
                { u: 'C', v: 'D', weight: 3 },
                { u: 'D', v: 'A', weight: 4 }
            ];

            const result = runKruskalMST(vertices, edges);
            // Accepted: A-B (1), B-D (1.5), B-C (2) => Total 4.5, 3 edges (V-1)
            // Once V-1 = 3 edges are accepted: C-D and D-A are skipped or cycle-rejected
            assert.equal(result.mstEdges.length, 3);
            assert.equal(result.totalWeight, 4.5);
            assert.equal(result.isConnected, true);

            // Steps check
            const rejectedOrSkipped = result.steps.filter(s => s.action === 'REJECTED' || s.action === 'SKIPPED');
            assert.ok(rejectedOrSkipped.length >= 2);
        });

        test('Handles disconnected graph components gracefully (spanning forest)', () => {
            // Disconnected graph: Component 1 (A-B w=1), Component 2 (C-D w=2)
            // No path between {A, B} and {C, D}
            const vertices = ['A', 'B', 'C', 'D'];
            const edges = [
                { u: 'A', v: 'B', weight: 1 },
                { u: 'C', v: 'D', weight: 2 }
            ];

            const result = runKruskalMST(vertices, edges);
            assert.equal(result.vertexCount, 4);
            assert.equal(result.mstEdges.length, 2, 'Spanning forest has 2 edges for 2 components');
            assert.equal(result.totalWeight, 3);
            assert.equal(result.isConnected, false, 'Graph is disconnected');
        });

        test('DSU root reporting accurately tracks find(u) and find(v) in execution trace without misleading relationships', () => {
            const { sampleCampusBackboneGraph } = require('../algorithms/kruskalMST');
            const result = runKruskalMST(sampleCampusBackboneGraph.vertices, sampleCampusBackboneGraph.edges);

            assert.equal(result.vertexCount, 7);
            assert.equal(result.mstEdges.length, 6, 'Campus graph MST has exactly V - 1 = 6 edges');
            assert.equal(result.totalWeight, 21, 'Campus graph total MST weight is 21');
            assert.equal(result.isConnected, true);

            // Verify that every step contains rootU and rootV matching dsu.find()
            result.steps.forEach(step => {
                assert.ok(step.step > 0);
                assert.ok(step.edge);
                assert.ok(step.action);
                assert.ok(step.reason);
                assert.ok(typeof step.currentMstWeight === 'number');

                if (step.action === 'ACCEPTED') {
                    assert.notEqual(step.rootU, step.rootV, 'Accepted edge endpoints must belong to distinct sets');
                } else if (step.action === 'REJECTED') {
                    assert.equal(step.rootU, step.rootV, 'Rejected edge endpoints must have identical DSU root');
                }
            });

            // Verify that once 6 edges are accepted, the remaining edges are marked as SKIPPED
            const acceptedCount = result.steps.filter(s => s.action === 'ACCEPTED').length;
            assert.equal(acceptedCount, 6);
            const skippedSteps = result.steps.filter(s => s.action === 'SKIPPED');
            assert.equal(skippedSteps.length, 2);
        });

        test('Derives canonical unique vertices dynamically when vertices array is omitted or incomplete', () => {
            const edges = [
                { u: 'NodeX', v: 'NodeY', weight: 10 },
                { u: 'NodeY', v: 'NodeZ', weight: 20 },
                { u: 'NodeX', v: 'NodeZ', weight: 30 }
            ];
            // Vertices array is empty
            const result = runKruskalMST([], edges);
            assert.equal(result.vertexCount, 3);
            assert.deepEqual(result.canonicalVertices.sort(), ['NodeX', 'NodeY', 'NodeZ']);
            assert.equal(result.mstEdges.length, 2);
            assert.equal(result.totalWeight, 30);
        });
    });

    describe("3. Topological Sorting (Kahn's Algorithm)", () => {
        test('Produces valid topological sequence on Directed Acyclic Graph where every directed edge respects the returned ordering', () => {
            // Complex DAG
            const vertices = ['A', 'B', 'C', 'D', 'E'];
            const edges = [
                { from: 'A', to: 'B' },
                { from: 'A', to: 'C' },
                { from: 'B', to: 'D' },
                { from: 'C', to: 'D' },
                { from: 'D', to: 'E' }
            ];

            const result = runKahnTopologicalSort(vertices, edges);
            assert.equal(result.hasCycle, false);
            assert.equal(result.order.length, 5);

            // Crucial verification: for EVERY directed edge (from -> to), order.indexOf(from) < order.indexOf(to)
            edges.forEach(({ from, to }) => {
                const fromIdx = result.order.indexOf(from);
                const toIdx = result.order.indexOf(to);
                assert.ok(fromIdx !== -1 && toIdx !== -1);
                assert.ok(fromIdx < toIdx, `Edge ${from} -> ${to} must have ${from} (${fromIdx}) appear before ${to} (${toIdx})`);
            });
        });

        test('Social connection progression DAG respects all prerequisite edge orderings', () => {
            const { sampleProgressionDAG } = require('../algorithms/kahnTopologicalSort');
            const result = runKahnTopologicalSort(sampleProgressionDAG.vertices, sampleProgressionDAG.edges);

            assert.equal(result.hasCycle, false);
            assert.equal(result.order.length, sampleProgressionDAG.vertices.length);

            sampleProgressionDAG.edges.forEach(({ from, to }) => {
                const fromIdx = result.order.indexOf(from);
                const toIdx = result.order.indexOf(to);
                assert.ok(fromIdx < toIdx, `Prerequisite ordering violated for ${from} -> ${to}`);
            });
        });

        test('Detects directed cycles in a cyclic graph and reports hasCycle true', () => {
            // Cycle: A -> B -> C -> A
            const vertices = ['A', 'B', 'C'];
            const edges = [
                { from: 'A', to: 'B' },
                { from: 'B', to: 'C' },
                { from: 'C', to: 'A' }
            ];

            const result = runKahnTopologicalSort(vertices, edges);
            assert.equal(result.hasCycle, true, 'Should detect cycle');
            assert.notEqual(result.order.length, vertices.length);
        });
    });

});

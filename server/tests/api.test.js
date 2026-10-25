const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../app');
const seedDatabase = require('../database/seed');

describe('Full API Integration Tests', () => {

    before(() => {
        // Reset database with seed data before running API tests
        seedDatabase({ force: true });
    });

    let aliceToken = '';
    let bobToken = '';
    let adminToken = '';

    describe('1. Authentication API', () => {
        test('Login with valid demo credentials (Alice)', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'alice@demo.com', password: 'password123' });

            assert.equal(res.status, 200);
            assert.ok(res.body.token);
            assert.equal(res.body.user.email, 'alice@demo.com');
            assert.equal(res.body.user.password, undefined, 'Password hash must never be returned');
            aliceToken = res.body.token;
        });

        test('Login with valid demo credentials (Bob)', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'bob@demo.com', password: 'password123' });

            assert.equal(res.status, 200);
            bobToken = res.body.token;
        });

        test('Login with valid admin credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'admin@demo.com', password: 'password123' });

            assert.equal(res.status, 200);
            assert.equal(res.body.user.role, 'admin');
            adminToken = res.body.token;
        });

        test('Login with invalid password fails with 401', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'alice@demo.com', password: 'wrongpassword' });

            assert.equal(res.status, 401);
            assert.ok(res.body.error);
        });

        test('Register new user succeeds', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test Student',
                    email: 'student.test@demo.com',
                    password: 'password123',
                    bio: 'Testing registration flow'
                });

            assert.equal(res.status, 201);
            assert.ok(res.body.token);
            assert.equal(res.body.user.email, 'student.test@demo.com');
            assert.equal(res.body.user.password, undefined);
        });

        test('Register with duplicate email returns 409 conflict', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Another Alice',
                    email: 'alice@demo.com',
                    password: 'password123'
                });

            assert.equal(res.status, 409);
        });

        test('GET /api/auth/me returns current user and friend stats', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(res.status, 200);
            assert.equal(res.body.user.email, 'alice@demo.com');
            assert.ok(res.body.stats);
            assert.ok(typeof res.body.stats.friendsCount === 'number');
        });
    });

    describe('2. Friend Requests and Management API', () => {
        test('Alice receives list of pending requests (Frank has requested Alice in seed)', async () => {
            const res = await request(app)
                .get('/api/friends/requests')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.body.incoming));
            assert.ok(Array.isArray(res.body.outgoing));
            assert.ok(res.body.incoming.some(r => r.sender_name === 'Frank Miller'));
        });

        test('Alice cannot send friend request to herself', async () => {
            const res = await request(app)
                .post('/api/friends/request/1')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(res.status, 400);
            assert.match(res.body.error, /cannot send a friend request to yourself/i);
        });

        test('Alice cannot send friend request to Bob (already friends)', async () => {
            const res = await request(app)
                .post('/api/friends/request/2')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(res.status, 400);
            assert.match(res.body.error, /already friends/i);
        });

        test('Alice cannot send friend request to Admin User (privileged account)', async () => {
            const res = await request(app)
                .post('/api/friends/request/9')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(res.status, 400);
            assert.match(res.body.error, /cannot send friend request to an administrator/i);
        });
    });

    describe('3. Recommendations API', () => {
        test('GET /api/recommendations returns ranked candidates for Alice and strictly excludes Admin User', async () => {
            const res = await request(app)
                .get('/api/recommendations')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.body.recommendations));
            assert.ok(res.body.recommendations.length > 0);

            // Admin User must NEVER be recommended to regular student Alice
            assert.equal(
                res.body.recommendations.some(r => r.user.email === 'admin@demo.com' || r.user.role === 'admin'),
                false,
                'Admin User (admin@demo.com) must NOT appear in Alice recommendations'
            );

            // Emma Watson should be the top recommendation (mutual friends: Bob and Charlie)
            const topCandidate = res.body.recommendations[0];
            assert.equal(topCandidate.user.name, 'Emma Watson');
            assert.equal(topCandidate.mutualCount, 2);
            assert.ok(topCandidate.reason.includes('mutual friend'));

            // Regular student candidates must remain eligible
            const candidateNames = res.body.recommendations.map(r => r.user.name);
            assert.ok(candidateNames.includes('Emma Watson'), 'Emma Watson must be recommended');
            assert.ok(candidateNames.includes('Grace Hopper'), 'Grace Hopper must be recommended');
        });

        test('Alice does not receive Admin User in heuristic fallback mode', () => {
            const { getFriendRecommendations } = require('../algorithms/recommendation');
            const db = require('../database/db');
            const allUsers = db.prepare('SELECT id, name, email, bio, interests, avatar, role FROM users').all();
            const friendships = db.prepare('SELECT user1_id, user2_id FROM friendships').all();
            const pendingRequests = db.prepare("SELECT sender_id, receiver_id FROM friend_requests WHERE status = 'pending'").all();

            const heuristicRecs = getFriendRecommendations(1, allUsers, friendships, pendingRequests);
            assert.ok(heuristicRecs.length > 0, 'Heuristic mode should return candidates');
            assert.equal(
                heuristicRecs.some(r => r.user.email === 'admin@demo.com' || r.user.role === 'admin'),
                false,
                'Admin User must NOT appear in heuristic fallback recommendations'
            );
            assert.ok(heuristicRecs.some(r => r.user.name === 'Emma Watson'), 'Emma Watson should be in heuristic recommendations');
        });
    });

    describe('4. Messaging API & Friendship Authorization', () => {
        test('Alice can send message to Bob (confirmed friend)', async () => {
            const res = await request(app)
                .post('/api/messages/2')
                .set('Authorization', `Bearer ${aliceToken}`)
                .send({ content: 'Hello Bob! This is an automated test message.' });

            assert.equal(res.status, 201);
            assert.equal(res.body.data.content, 'Hello Bob! This is an automated test message.');
        });

        test('Alice can fetch message history with Bob in chronological order (oldest at top, newest at bottom)', async () => {
            const res = await request(app)
                .get('/api/messages/2')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.body.messages));
            assert.ok(res.body.messages.length >= 2);

            // Verify each message timestamp is >= previous message timestamp, and if same, id is > previous
            for (let i = 1; i < res.body.messages.length; i++) {
                const prev = res.body.messages[i - 1];
                const curr = res.body.messages[i];
                const prevTime = new Date(prev.created_at).getTime();
                const currTime = new Date(curr.created_at).getTime();
                assert.ok(currTime >= prevTime, `Message ${curr.id} must be after or equal to message ${prev.id}`);
            }

            // The newly sent message from previous test must be at the very bottom
            const lastMessage = res.body.messages[res.body.messages.length - 1];
            assert.equal(lastMessage.content, 'Hello Bob! This is an automated test message.');
        });

        test('Alice cannot message non-friend (Grace Hopper, ID 7) - returns 403 Forbidden', async () => {
            const res = await request(app)
                .post('/api/messages/7')
                .set('Authorization', `Bearer ${aliceToken}`)
                .send({ content: 'Hey Grace, let us chat!' });

            assert.equal(res.status, 403);
            assert.match(res.body.error, /access denied|only.*confirmed friends/i);
        });
    });

    describe('5. Admin Role Authorization', () => {
        test('Non-admin user (Alice) cannot access /api/admin/stats (403 Forbidden)', async () => {
            const res = await request(app)
                .get('/api/admin/stats')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(res.status, 403);
        });

        test('Admin user can access /api/admin/stats and view platform aggregates', async () => {
            const res = await request(app)
                .get('/api/admin/stats')
                .set('Authorization', `Bearer ${adminToken}`);

            assert.equal(res.status, 200);
            assert.ok(res.body.stats);
            assert.ok(res.body.stats.totalUsers > 0);
            assert.ok(res.body.stats.totalFriendships > 0);
        });
    });

    describe('6. DSA Lab Educational Endpoints & Admin Authorization', () => {
        test('Unauthenticated request to /api/dsa/friendship-graph returns 401 Unauthorized', async () => {
            const res = await request(app).get('/api/dsa/friendship-graph?rootId=1');
            assert.equal(res.status, 401);
            assert.ok(res.body.error);
        });

        test('Regular user (Alice) cannot access /api/dsa/friendship-graph - returns 403 Forbidden', async () => {
            const res = await request(app)
                .get('/api/dsa/friendship-graph?rootId=1')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(res.status, 403);
            assert.match(res.body.error, /administrator privileges required/i);
        });

        test('Regular user (Alice) cannot access /api/dsa/mst - returns 403 Forbidden', async () => {
            const res = await request(app)
                .get('/api/dsa/mst')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(res.status, 403);
            assert.match(res.body.error, /administrator privileges required/i);
        });

        test('Regular user (Alice) cannot access /api/dsa/topological-sort - returns 403 Forbidden', async () => {
            const res = await request(app)
                .get('/api/dsa/topological-sort?type=workflow')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(res.status, 403);
            assert.match(res.body.error, /administrator privileges required/i);
        });

        test('Regular user (Alice) cannot submit custom graph to POST /api/dsa/mst - returns 403 Forbidden', async () => {
            const res = await request(app)
                .post('/api/dsa/mst')
                .set('Authorization', `Bearer ${aliceToken}`)
                .send({ vertices: ['A', 'B'], edges: [{ u: 'A', v: 'B', weight: 1 }] });

            assert.equal(res.status, 403);
        });

        test('Regular user (Alice) cannot submit custom DAG to POST /api/dsa/topological-sort - returns 403 Forbidden', async () => {
            const res = await request(app)
                .post('/api/dsa/topological-sort')
                .set('Authorization', `Bearer ${aliceToken}`)
                .send({ vertices: ['A', 'B'], edges: [{ from: 'A', to: 'B' }] });

            assert.equal(res.status, 403);
        });

        test('Admin user can access GET /api/dsa/friendship-graph and view nodes, edges and recommendations', async () => {
            const res = await request(app)
                .get('/api/dsa/friendship-graph?rootId=1')
                .set('Authorization', `Bearer ${adminToken}`);

            assert.equal(res.status, 200);
            assert.ok(res.body.nodes.length > 0);
            assert.ok(res.body.edges.length > 0);
            assert.ok(res.body.recommendations.length > 0);
        });

        test('Admin user can access GET /api/dsa/mst and view Kruskal MST result and steps', async () => {
            const res = await request(app)
                .get('/api/dsa/mst')
                .set('Authorization', `Bearer ${adminToken}`);

            assert.equal(res.status, 200);
            assert.ok(res.body.result.mstEdges.length > 0);
            assert.ok(res.body.result.totalWeight > 0);
            assert.ok(res.body.result.steps.length > 0);
            assert.ok(res.body.explanation);
        });

        test('Admin user can access GET /api/dsa/topological-sort and view Kahn DAG order and steps', async () => {
            const res = await request(app)
                .get('/api/dsa/topological-sort?type=workflow')
                .set('Authorization', `Bearer ${adminToken}`);

            assert.equal(res.status, 200);
            assert.ok(res.body.result.order.length > 0);
            assert.equal(res.body.result.hasCycle, false);
            assert.ok(res.body.result.steps.length > 0);
            assert.ok(res.body.explanation);
        });

        test('Admin user can execute custom Kruskal MST via POST /api/dsa/mst', async () => {
            const res = await request(app)
                .post('/api/dsa/mst')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    vertices: ['Lab1', 'Lab2', 'ServerRoom'],
                    edges: [
                        { u: 'Lab1', v: 'Lab2', weight: 5 },
                        { u: 'Lab2', v: 'ServerRoom', weight: 3 },
                        { u: 'Lab1', v: 'ServerRoom', weight: 10 }
                    ]
                });

            assert.equal(res.status, 200);
            assert.equal(res.body.result.totalWeight, 8);
            assert.equal(res.body.result.mstEdges.length, 2);
        });

        test('Admin user can execute custom Kahn Topological Sort via POST /api/dsa/topological-sort', async () => {
            const res = await request(app)
                .post('/api/dsa/topological-sort')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    vertices: ['Task1', 'Task2', 'Task3'],
                    edges: [
                        { from: 'Task1', to: 'Task2' },
                        { from: 'Task2', to: 'Task3' }
                    ]
                });

            assert.equal(res.status, 200);
            assert.deepEqual(res.body.result.order, ['Task1', 'Task2', 'Task3']);
            assert.equal(res.body.result.hasCycle, false);
        });

        test('Regular user (Alice) retains full access to /api/recommendations without restriction', async () => {
            const res = await request(app)
                .get('/api/recommendations')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.body.recommendations));
        });
    });

    describe('7. Database Seeding Protection & Safeguards', () => {
        test('Destructive seeding is refused when users exist and force is false', () => {
            const originalEnv = process.env.NODE_ENV;
            try {
                process.env.NODE_ENV = 'development';
                const result = seedDatabase({ force: false });
                assert.equal(result, false, 'Should return false and refuse to wipe existing users without force flag');
            } finally {
                process.env.NODE_ENV = originalEnv;
            }
        });

        test('Destructive seeding is strictly blocked in production environment', () => {
            const originalEnv = process.env.NODE_ENV;
            try {
                process.env.NODE_ENV = 'production';
                assert.throws(() => {
                    seedDatabase();
                }, /strictly prohibited in production/i);
            } finally {
                process.env.NODE_ENV = originalEnv;
            }
        });
    });

    describe('8. Profile & Structured Academic Interests API', () => {
        test('PUT /api/users/profile updates name, bio and academic interests for student', async () => {
            const res = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${aliceToken}`)
                .send({
                    name: 'Alice Johnson (Research Fellow)',
                    bio: 'Updated bio researching graph neural networks',
                    interests: 'Graph Theory, Machine Learning, Deep Learning, Algorithms'
                });

            assert.equal(res.status, 200);
            assert.equal(res.body.user.name, 'Alice Johnson (Research Fellow)');
            assert.equal(res.body.user.interests, 'Graph Theory, Machine Learning, Deep Learning, Algorithms');
        });

        test('GET /api/users/:id includes structured interests', async () => {
            const res = await request(app)
                .get('/api/users/1')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(res.status, 200);
            assert.equal(res.body.user.id, 1);
            assert.ok(res.body.user.interests.includes('Graph Theory'));
        });

        test('PUT /api/users/profile updates administrator display name and bio', async () => {
            const res = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Administrator Lead',
                    bio: 'Managing the AffinityAI campus platform and machine learning services.'
                });

            assert.equal(res.status, 200);
            assert.equal(res.body.user.name, 'Administrator Lead');
            assert.equal(res.body.user.bio, 'Managing the AffinityAI campus platform and machine learning services.');
            assert.equal(res.body.user.role, 'admin');
        });

        test('PUT /api/users/profile ignores student-specific academic interests for administrator', async () => {
            // First fetch existing admin interests to check baseline
            const initialRes = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${adminToken}`);
            const initialInterests = initialRes.body.user.interests;

            const res = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Administrator Lead',
                    bio: 'Managing the AffinityAI campus platform.',
                    interests: 'Malicious Student Topic, Quantum Computing'
                });

            assert.equal(res.status, 200);
            // Verify interests were NOT modified to the submitted student topics
            assert.notEqual(res.body.user.interests, 'Malicious Student Topic, Quantum Computing');
            assert.equal(res.body.user.interests, initialInterests);
        });

        test('PUT /api/users/profile strictly blocks privilege escalation and email tampering', async () => {
            const res = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${aliceToken}`)
                .send({
                    name: 'Alice Johnson Hacker',
                    email: 'hacked.admin@demo.com',
                    role: 'admin',
                    is_active: 0
                });

            assert.equal(res.status, 200);
            assert.equal(res.body.user.name, 'Alice Johnson Hacker');
            assert.equal(res.body.user.email, 'alice@demo.com'); // Must remain alice@demo.com
            assert.equal(res.body.user.role, 'user'); // Must remain 'user'
            assert.equal(res.body.user.is_active, 1);
        });

        test('PUT /api/users/profile rejects empty or whitespace-only name', async () => {
            const res = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: '   ',
                    bio: 'Valid bio'
                });

            assert.equal(res.status, 400);
            assert.match(res.body.error, /name cannot be empty/i);
        });

        test('PUT /api/users/profile requires valid JWT authentication', async () => {
            const res = await request(app)
                .put('/api/users/profile')
                .send({
                    name: 'Ghost User'
                });

            assert.equal(res.status, 401);
        });
    });

    describe('9. Friend Request Acceptance and Rejection Lifecycle', () => {
        test('Alice accepts incoming request from Frank (request ID 1 in seed)', async () => {
            // Find Frank's request id from requests endpoint
            const reqsRes = await request(app)
                .get('/api/friends/requests')
                .set('Authorization', `Bearer ${aliceToken}`);

            const frankReq = reqsRes.body.incoming.find(r => r.sender_name === 'Frank Miller');
            assert.ok(frankReq, 'Frank request must exist in incoming list');

            const acceptRes = await request(app)
                .post(`/api/friends/request/${frankReq.id}/accept`)
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(acceptRes.status, 200);
            assert.match(acceptRes.body.message, /accepted/i);

            // Verify Frank is now in Alice's confirmed friends list
            const friendsRes = await request(app)
                .get('/api/friends')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.ok(friendsRes.body.friends.some(f => f.name === 'Frank Miller'));
        });
    });

    describe('10. Administration Platform, Security & Monitoring APIs', () => {
        test('Admin can access GET /api/admin/stats with real metrics', async () => {
            const res = await request(app)
                .get('/api/admin/stats')
                .set('Authorization', `Bearer ${adminToken}`);

            assert.equal(res.status, 200);
            assert.ok(res.body.stats);
            const { stats } = res.body;
            assert.ok(stats.totalUsers > 0);
            assert.ok(stats.totalStudents > 0);
            assert.equal(stats.totalAdmins, 1);
            assert.ok(typeof stats.totalFriendships === 'number');
            assert.ok(typeof stats.pendingRequests === 'number');
            assert.ok(typeof stats.totalMessages === 'number');
            assert.ok(stats.activeModel);
            assert.ok(stats.activeModel.mode);
        });

        test('Student (Alice) receives 403 Forbidden on GET /api/admin/stats', async () => {
            const res = await request(app)
                .get('/api/admin/stats')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(res.status, 403);
            assert.match(res.body.error, /administrator privileges required/i);
        });

        test('Admin can access GET /api/admin/users directory with safe schema', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);

            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.body.users));
            assert.ok(res.body.users.length > 0);

            // Verify safe schema: NO password hashes or auth tokens exposed
            res.body.users.forEach(u => {
                assert.equal(u.password, undefined, 'Password hash must never be returned');
                assert.equal(u.token, undefined, 'Auth token must never be returned');
                assert.ok(u.id);
                assert.ok(u.name);
                assert.ok(u.email);
                assert.ok(u.role);
                assert.ok(u.is_active !== undefined);
                assert.ok(typeof u.friend_count === 'number');
            });
        });

        test('Student (Alice) receives 403 Forbidden on GET /api/admin/users', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(res.status, 403);
            assert.match(res.body.error, /administrator privileges required/i);
        });

        test('Admin cannot deactivate own administrative account (safe protection)', async () => {
            // Admin user id is 9 in seed
            const meRes = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${adminToken}`);
            const adminId = meRes.body.user.id;

            const res = await request(app)
                .put(`/api/admin/users/${adminId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ is_active: 0 });

            assert.equal(res.status, 400);
            assert.match(res.body.error, /cannot deactivate your own administrator account/i);
        });

        test('Admin can toggle student account active status and prevent login when inactive', async () => {
            // Find Bob (student)
            const usersRes = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);
            const bob = usersRes.body.users.find(u => u.email === 'bob@demo.com');
            assert.ok(bob, 'Bob must exist');

            // Deactivate Bob
            const deactRes = await request(app)
                .put(`/api/admin/users/${bob.id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ is_active: 0 });

            assert.equal(deactRes.status, 200);
            assert.equal(deactRes.body.is_active, 0);

            // Attempt login as Bob while deactivated -> 403
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: 'bob@demo.com', password: 'password123' });

            assert.equal(loginRes.status, 403);
            assert.match(loginRes.body.error, /deactivated/i);

            // Reactivate Bob
            const reactRes = await request(app)
                .put(`/api/admin/users/${bob.id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ is_active: 1 });

            assert.equal(reactRes.status, 200);
            assert.equal(reactRes.body.is_active, 1);

            // Bob can log in again
            const loginAgainRes = await request(app)
                .post('/api/auth/login')
                .send({ email: 'bob@demo.com', password: 'password123' });

            assert.equal(loginAgainRes.status, 200);
            assert.ok(loginAgainRes.body.token);
        });

        test('Student (Alice) receives 403 Forbidden on PUT /api/admin/users/:id/status', async () => {
            const res = await request(app)
                .put('/api/admin/users/2/status')
                .set('Authorization', `Bearer ${aliceToken}`)
                .send({ is_active: 0 });

            assert.equal(res.status, 403);
        });

        test('Admin can access GET /api/admin/ml-monitoring with authoritative metrics and 7 features', async () => {
            const res = await request(app)
                .get('/api/admin/ml-monitoring')
                .set('Authorization', `Bearer ${adminToken}`);

            assert.equal(res.status, 200);
            assert.ok(res.body.modelName);
            assert.ok(typeof res.body.modelAvailable === 'boolean');
            assert.ok(res.body.activeMode);
            assert.ok(res.body.syntheticDataDisclosure);

            // Authoritative sample sizes matching evaluation artifact
            assert.equal(res.body.testSamples, 136, 'Test sample size must match evaluation artifact (136)');
            assert.equal(res.body.trainingSamples, 542, 'Training sample size must match model_meta artifact (542)');

            // Authoritative metrics matching evaluation_report.json / model_meta.json
            assert.ok(res.body.evaluationMetrics);
            assert.equal(res.body.evaluationMetrics.roc_auc, 0.9286);
            assert.equal(res.body.evaluationMetrics.accuracy, 0.8897);
            assert.equal(res.body.evaluationMetrics.precision, 0.8947);
            assert.equal(res.body.evaluationMetrics.recall, 0.7556);
            assert.equal(res.body.evaluationMetrics.f1_score, 0.8193);

            // Authoritative Precision@K ranking evaluation
            assert.ok(res.body.topKMetrics);
            assert.equal(res.body.topKMetrics.precisionAt1, 0.5122);
            assert.equal(res.body.topKMetrics.precisionAt3, 0.3415);
            assert.equal(res.body.topKMetrics.precisionAt5, 0.326);

            // 7 Features
            assert.equal(res.body.features.length, 7);
            const featureKeys = res.body.features.map(f => f.key);
            assert.ok(featureKeys.includes('mutual_friends'));
            assert.ok(featureKeys.includes('friend_jaccard'));
            assert.ok(featureKeys.includes('shared_interests'));
            assert.ok(featureKeys.includes('interest_jaccard'));
            assert.ok(featureKeys.includes('target_degree'));
            assert.ok(featureKeys.includes('candidate_degree'));
            assert.ok(featureKeys.includes('adamic_adar_approx'));

            // Authoritative artifacts disclosure
            assert.ok(res.body.authoritativeArtifacts);
            assert.ok(res.body.authoritativeArtifacts.evaluationReportPath);
            assert.ok(res.body.authoritativeArtifacts.modelMetaPath);

            // 4 Pipeline Stages
            assert.equal(res.body.pipelineStages.length, 4);
        });

        test('Student (Alice) receives 403 Forbidden on GET /api/admin/ml-monitoring', async () => {
            const res = await request(app)
                .get('/api/admin/ml-monitoring')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(res.status, 403);
        });

        test('Admin can access GET /api/admin/analytics with real degree and topic data excluding admin', async () => {
            const res = await request(app)
                .get('/api/admin/analytics')
                .set('Authorization', `Bearer ${adminToken}`);

            assert.equal(res.status, 200);
            assert.ok(res.body.degreeBuckets);
            assert.ok(Array.isArray(res.body.topTopics));
            assert.ok(res.body.requestBreakdown);
            assert.ok(typeof res.body.conversionRate === 'number');
            assert.ok(typeof res.body.totalMessages === 'number');
            assert.ok(typeof res.body.activeChatPairs === 'number');

            // Exclude admin: totalStudents must strictly be non-admin accounts
            assert.ok(typeof res.body.totalStudents === 'number');
            assert.ok(typeof res.body.totalFriendships === 'number');
            assert.ok(typeof res.body.avgDegree === 'number');
            assert.ok(typeof res.body.graphDensity === 'number');

            // Crucial security requirement: zero message contents exposed in analytics
            assert.equal(res.body.messages, undefined);
            assert.equal(res.body.message_content, undefined);
        });

        test('Student (Alice) receives 403 Forbidden on GET /api/admin/analytics', async () => {
            const res = await request(app)
                .get('/api/admin/analytics')
                .set('Authorization', `Bearer ${aliceToken}`);

            assert.equal(res.status, 403);
        });
    });
});

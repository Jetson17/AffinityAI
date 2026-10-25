/**
 * ============================================================================
 * INTELLIGENT RECOMMENDATION MODULE: Graph Traversal & Hybrid ML Pipeline
 * ============================================================================
 *
 * ARCHITECTURE:
 * 1. Structural Candidate Generation (Graph Traversal & Cold-Start Expansion):
 *    - In undirected network G = (V, E), primary candidates are discovered via
 *      2-hop breadth-first traversal (triadic closure).
 *    - Cold-start fallback: For users with 0 or few connections, expands to
 *      unconnected students prioritizing shared academic interests and community members.
 *    - Strictly excludes self, confirmed friends, and pending requests in either direction.
 * 2. Academic & Interest Affinity Scoring (Synonym Normalization):
 *    - Normalizes topic variations (e.g., 'AI' & 'Artificial Intelligence',
 *      'Full-Stack' & 'Web Development', 'CTF' & 'Cybersecurity').
 *    - Gracefully handles missing, empty, or undefined profile data.
 * 3. Machine Learning Inference & Graceful Fallback:
 *    - Extracts 7 explainable features per candidate pair.
 *    - Evaluates link likelihood via a trained supervised Logistic Regression model.
 *    - Automatically falls back to the transparent graph heuristic if the ML model
 *      or Python environment is unavailable.
 * ============================================================================
 */

const MLRecommendationService = require('../services/mlService');

/**
 * Canonical academic topic taxonomy with synonym mapping
 */
const TOPIC_SYNONYMS = {
    'Artificial Intelligence': ['ai', 'artificial intelligence', 'agi', 'neural networks'],
    'Machine Learning': ['ml', 'machine learning', 'deep learning', 'scikit-learn', 'tensorflow', 'pytorch'],
    'Data Science': ['data science', 'data analytics', 'data analysis', 'big data', 'pandas'],
    'Algorithms': ['algorithms', 'algorithm', 'dsa', 'data structures', 'competitive programming', 'leetcode'],
    'Graph Theory': ['graph theory', 'graphs', 'network analysis', 'graph algorithms'],
    'Web Development': ['web dev', 'web development', 'full-stack', 'fullstack', 'frontend', 'backend'],
    'UI/UX Design': ['ui/ux', 'ui', 'ux', 'user experience', 'design', 'figma'],
    'Robotics': ['robotics', 'robot', 'ros', 'embedded', 'arduino', 'iot'],
    'Cybersecurity': ['cybersecurity', 'security', 'ethical hacking', 'ctf', 'infosec', 'cryptography'],
    'Distributed Systems': ['distributed systems', 'cloud', 'microservices', 'systems'],
    'Compilers': ['compilers', 'compiler design', 'low-level', 'c++', 'rust'],
    'Mobile Development': ['mobile', 'flutter', 'react native', 'android', 'ios'],
    'Mathematics': ['math', 'mathematics', 'linear algebra', 'probability', 'discrete math']
};

/**
 * Extracts normalized academic topics from user profile bio and interests string.
 * Gracefully handles missing, empty, or undefined fields.
 *
 * @param {string|object} bioOrUser - Bio string or user object with bio/interests
 * @returns {Array<string>} Array of canonical detected topic strings
 */
function extractAcademicTopics(bioOrUser) {
    let combinedText = '';

    if (typeof bioOrUser === 'string') {
        combinedText = bioOrUser;
    } else if (bioOrUser && typeof bioOrUser === 'object') {
        const bio = bioOrUser.bio || '';
        const interests = bioOrUser.interests || '';
        combinedText = `${bio} ${interests}`;
    }

    if (!combinedText.trim()) return [];

    const textLower = combinedText.toLowerCase();
    const detected = new Set();

    for (const [canonical, synonyms] of Object.entries(TOPIC_SYNONYMS)) {
        for (const syn of synonyms) {
            const escaped = syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escaped}\\b`, 'i');
            if (regex.test(textLower)) {
                detected.add(canonical);
                break;
            }
        }
    }

    return Array.from(detected).sort();
}

/**
 * Modular baseline recommendation scoring service.
 * Computes transparent match score and explanation based on graph proximity
 * and shared academic interests.
 *
 * @param {object} targetUser - Logged-in user object
 * @param {object} candidateUser - Recommended candidate object
 * @param {number} mutualCount - Number of mutual friends
 * @param {Array<object>} mutualFriendObjects - List of mutual friend details
 * @returns {object} { score, matchPercentage, sharedTopics, candidateTopics, reason }
 */
function computeAffinityScore(targetUser, candidateUser, mutualCount = 0, mutualFriendObjects = []) {
    const targetTopics = extractAcademicTopics(targetUser);
    const candidateTopics = extractAcademicTopics(candidateUser);

    // Identify shared academic/interest topics
    const targetSet = new Set(targetTopics.map(t => t.toLowerCase()));
    const sharedTopics = candidateTopics.filter(t => targetSet.has(t.toLowerCase()));

    // Transparent heuristic scoring model:
    // Base graph closeness: 25 points per mutual friend (max 75)
    const graphScore = Math.min(75, mutualCount * 25);

    // Interest affinity: 10 points per shared topic (max 20)
    const interestScore = Math.min(20, sharedTopics.length * 10);

    // Baseline network baseline: 5 points
    const baseScore = 5;

    const totalScore = Math.min(99, baseScore + graphScore + interestScore);
    const matchPercentage = `${totalScore}%`;

    // Construct clear, transparent rationale without fabricating relationships
    let reason = '';
    if (mutualCount > 0) {
        const sampleNames = mutualFriendObjects.slice(0, 2).map(m => m.name).join(', ');
        const remainingCount = mutualCount - 2;
        reason = `You have ${mutualCount} mutual friend${mutualCount > 1 ? 's' : ''}`;
        if (sampleNames) {
            reason += ` (${sampleNames}${remainingCount > 0 ? ` +${remainingCount} more` : ''})`;
        }
        if (sharedTopics.length > 0) {
            reason += ` • Shared interests in ${sharedTopics.slice(0, 2).join(', ')}`;
        }
    } else {
        // Cold-start explanation
        if (sharedTopics.length > 0) {
            reason = `Recommended based on shared interests in ${sharedTopics.slice(0, 2).join(', ')} (campus network discovery)`;
        } else {
            reason = 'Active member of the campus student community';
        }
    }

    return {
        score: totalScore,
        matchPercentage,
        sharedTopics,
        candidateTopics,
        reason
    };
}

/**
 * Builds an undirected adjacency list from friendships data.
 * @param {Array<{user1_id: number, user2_id: number}>} friendships
 * @returns {Map<number, Set<number>>} adjacency list mapping userId -> Set of friendIds
 */
function buildAdjacencyList(friendships) {
    const adj = new Map();

    const addEdge = (u, v) => {
        if (!adj.has(u)) adj.set(u, new Set());
        adj.get(u).add(v);
    };

    for (const { user1_id, user2_id } of friendships) {
        addEdge(user1_id, user2_id);
        addEdge(user2_id, user1_id);
    }

    return adj;
}

/**
 * Extracts feature vector for ML model prediction for pair (targetUser, candidateUser)
 */
function extractCandidateFeatures(targetUser, candidateUser, targetFriends, candidateFriends, adj) {
    const mutualFriendsSet = new Set(
        [...targetFriends].filter(f => candidateFriends.has(f))
    );
    const mutualCount = mutualFriendsSet.size;

    const unionFriends = new Set([...targetFriends, ...candidateFriends]);
    const friendJaccard = unionFriends.size > 0 ? (mutualCount / unionFriends.size) : 0.0;

    const targetTopics = extractAcademicTopics(targetUser);
    const candidateTopics = extractAcademicTopics(candidateUser);
    const targetTopicSet = new Set(targetTopics);
    const candidateTopicSet = new Set(candidateTopics);

    const sharedTopics = targetTopics.filter(t => candidateTopicSet.has(t));
    const sharedTopicsCount = sharedTopics.length;

    const unionTopics = new Set([...targetTopics, ...candidateTopics]);
    const interestJaccard = unionTopics.size > 0 ? (sharedTopicsCount / unionTopics.size) : 0.0;

    const targetDegree = targetFriends.size;
    const candidateDegree = candidateFriends.size;

    // Adamic-Adar calculation
    let adamicAdar = 0.0;
    for (const friendId of mutualFriendsSet) {
        const neighborFriends = adj.get(friendId) || new Set();
        const deg = neighborFriends.size;
        if (deg > 1) {
            adamicAdar += 1.0 / Math.log(deg);
        } else {
            adamicAdar += 1.0;
        }
    }

    return {
        candidate_id: candidateUser.id,
        mutual_friends: mutualCount,
        friend_jaccard: parseFloat(friendJaccard.toFixed(4)),
        shared_interests: sharedTopicsCount,
        interest_jaccard: parseFloat(interestJaccard.toFixed(4)),
        target_degree: targetDegree,
        candidate_degree: candidateDegree,
        adamic_adar_approx: parseFloat(adamicAdar.toFixed(4)),
        sharedTopicsList: sharedTopics
    };
}

const PRIVILEGED_ROLES = new Set(['admin', 'administrator', 'staff']);

function isPrivilegedRole(role) {
    if (!role || typeof role !== 'string') return false;
    return PRIVILEGED_ROLES.has(role.trim().toLowerCase());
}

/**
 * Generates candidate recommendations structure before ranking.
 */
function generateCandidatePool(targetUserId, allUsers, friendships, pendingRequests = []) {
    const userMap = new Map();
    for (const u of allUsers) {
        userMap.set(u.id, u);
    }

    const targetUser = userMap.get(targetUserId);
    const adj = buildAdjacencyList(friendships);
    const directFriends = adj.get(targetUserId) || new Set();

    // Exclusion set: self, direct friends, and pending request partners
    const excludedUserIds = new Set(directFriends);
    excludedUserIds.add(targetUserId);

    for (const req of pendingRequests) {
        if (req.sender_id === targetUserId) {
            excludedUserIds.add(req.receiver_id);
        } else if (req.receiver_id === targetUserId) {
            excludedUserIds.add(req.sender_id);
        }
    }

    // Exclude administrator and privileged accounts from candidate pool
    // Privileged accounts must never appear in student peer recommendations
    for (const u of allUsers) {
        if (isPrivilegedRole(u.role)) {
            excludedUserIds.add(u.id);
        }
    }

    // Step 1: 2-hop graph candidates
    const candidateMutuals = new Map();

    for (const friendId of directFriends) {
        const friendsOfFriend = adj.get(friendId) || new Set();
        for (const candidateId of friendsOfFriend) {
            if (excludedUserIds.has(candidateId)) continue;
            if (!candidateMutuals.has(candidateId)) {
                candidateMutuals.set(candidateId, []);
            }
            candidateMutuals.get(candidateId).push(friendId);
        }
    }

    // Step 2: Cold-start expansion
    // If target user has few 2-hop candidates (e.g. 0 friends), expand candidate pool
    if (candidateMutuals.size < 5) {
        for (const u of allUsers) {
            if (!excludedUserIds.has(u.id) && !candidateMutuals.has(u.id)) {
                candidateMutuals.set(u.id, []);
            }
        }
    }

    const rawCandidates = [];
    for (const [candidateId, mutualIds] of candidateMutuals.entries()) {
        const candidateUser = userMap.get(candidateId);
        if (!candidateUser) continue;
        if (isPrivilegedRole(candidateUser.role)) continue; // Defense-in-depth

        // Unique mutual friend objects (excluding any privileged users)
        const uniqueMutualIds = Array.from(new Set(mutualIds));
        const mutualFriendObjects = uniqueMutualIds
            .map(id => userMap.get(id))
            .filter(Boolean)
            .filter(u => !isPrivilegedRole(u.role))
            .map(u => ({ id: u.id, name: u.name, avatar: u.avatar }));

        const mutualCount = mutualFriendObjects.length;

        // Baseline affinity calculation
        const affinity = computeAffinityScore(
            targetUser,
            candidateUser,
            mutualCount,
            mutualFriendObjects
        );

        // ML feature extraction
        const candidateFriends = adj.get(candidateId) || new Set();
        const features = extractCandidateFeatures(
            targetUser,
            candidateUser,
            directFriends,
            candidateFriends,
            adj
        );

        rawCandidates.push({
            user: {
                id: candidateUser.id,
                name: candidateUser.name,
                email: candidateUser.email,
                bio: candidateUser.bio || '',
                interests: candidateUser.interests || '',
                avatar: candidateUser.avatar,
                role: candidateUser.role || 'user'
            },
            mutualCount,
            mutualFriends: mutualFriendObjects,
            matchScore: affinity.score,
            matchPercentage: affinity.matchPercentage,
            sharedTopics: affinity.sharedTopics,
            reason: affinity.reason,
            features
        });
    }

    return { rawCandidates, targetUser, adj };
}

/**
 * Baseline Synchronous Recommendation Engine (preserved for DSA unit test backward-compatibility).
 */
function getFriendRecommendations(targetUserId, allUsers, friendships, pendingRequests = []) {
    const { rawCandidates } = generateCandidatePool(targetUserId, allUsers, friendships, pendingRequests);

    // Filter to only candidates with mutual friends if 2-hop candidates exist, or cold-start if none
    const hasMutualCandidates = rawCandidates.some(c => c.mutualCount > 0);
    const filtered = hasMutualCandidates ? rawCandidates.filter(c => c.mutualCount > 0) : rawCandidates;

    filtered.sort((a, b) => {
        if (b.mutualCount !== a.mutualCount) {
            return b.mutualCount - a.mutualCount;
        }
        if (b.matchScore !== a.matchScore) {
            return b.matchScore - a.matchScore;
        }
        return a.user.name.localeCompare(b.user.name);
    });

    return filtered.map(c => ({
        user: c.user,
        mutualCount: c.mutualCount,
        mutualFriends: c.mutualFriends,
        matchScore: c.matchScore,
        matchPercentage: c.matchPercentage,
        sharedTopics: c.sharedTopics,
        reason: c.reason,
        recommendationMethod: 'heuristic'
    }));
}

/**
 * Asynchronous Hybrid Recommendation Pipeline:
 * Discovers candidates via graph traversal, extracts pair features,
 * invokes supervised ML link prediction model, and falls back gracefully to graph heuristic.
 */
async function getHybridFriendRecommendations(targetUserId, allUsers, friendships, pendingRequests = []) {
    const { rawCandidates } = generateCandidatePool(targetUserId, allUsers, friendships, pendingRequests);

    if (rawCandidates.length === 0) {
        return {
            recommendations: [],
            mode: 'heuristic',
            modelName: 'None (No Candidates)'
        };
    }

    // Prepare feature batch for ML inference
    const featurePayload = rawCandidates.map(c => c.features);

    // Call ML Recommendation Service
    const mlResult = await MLRecommendationService.predictBatch(featurePayload);

    if (mlResult.available && mlResult.predictions && mlResult.predictions.size > 0) {
        // Enforce ML-ranked pipeline
        const scoredRecommendations = rawCandidates.map(c => {
            const pred = mlResult.predictions.get(c.user.id);
            const predictedScore = pred ? pred.predicted_score : c.matchScore;
            const predictedProb = pred ? pred.predicted_probability : (c.matchScore / 100);

            return {
                user: c.user,
                mutualCount: c.mutualCount,
                mutualFriends: c.mutualFriends,
                matchScore: c.matchScore,
                matchPercentage: c.matchPercentage,
                predictedScore,
                predictedProbability: predictedProb,
                recommendationMethod: 'ml',
                sharedTopics: c.sharedTopics,
                reason: c.reason,
                features: c.features
            };
        });

        // Stable hybrid ranking:
        // Primary: predictedScore descending
        // Secondary: mutualCount descending
        // Tertiary: candidate user name
        scoredRecommendations.sort((a, b) => {
            if (b.predictedScore !== a.predictedScore) {
                return b.predictedScore - a.predictedScore;
            }
            if (b.mutualCount !== a.mutualCount) {
                return b.mutualCount - a.mutualCount;
            }
            return a.user.name.localeCompare(b.user.name);
        });

        return {
            recommendations: scoredRecommendations,
            mode: 'ml',
            modelName: mlResult.modelName || 'Logistic Regression (Calibrated Link Predictor)'
        };
    }

    // Graceful fallback to graph heuristic
    const hasMutualCandidates = rawCandidates.some(c => c.mutualCount > 0);
    const filtered = hasMutualCandidates ? rawCandidates.filter(c => c.mutualCount > 0) : rawCandidates;

    filtered.sort((a, b) => {
        if (b.mutualCount !== a.mutualCount) {
            return b.mutualCount - a.mutualCount;
        }
        if (b.matchScore !== a.matchScore) {
            return b.matchScore - a.matchScore;
        }
        return a.user.name.localeCompare(b.user.name);
    });

    const fallbackRecommendations = filtered.map(c => ({
        user: c.user,
        mutualCount: c.mutualCount,
        mutualFriends: c.mutualFriends,
        matchScore: c.matchScore,
        matchPercentage: c.matchPercentage,
        predictedScore: c.matchScore,
        predictedProbability: parseFloat((c.matchScore / 100).toFixed(2)),
        recommendationMethod: 'heuristic',
        sharedTopics: c.sharedTopics,
        reason: c.reason,
        features: c.features
    }));

    return {
        recommendations: fallbackRecommendations,
        mode: 'heuristic',
        modelName: 'Graph Triadic Closure & Heuristic Affinity (Fallback)'
    };
}

module.exports = {
    TOPIC_SYNONYMS,
    extractAcademicTopics,
    computeAffinityScore,
    buildAdjacencyList,
    extractCandidateFeatures,
    generateCandidatePool,
    getFriendRecommendations,
    getHybridFriendRecommendations,
    PRIVILEGED_ROLES,
    isPrivilegedRole
};

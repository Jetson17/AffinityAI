/**
 * ============================================================================
 * DSA MODULE: Topological Sorting using Kahn's Algorithm (BFS-based)
 * ============================================================================
 *
 * CONCEPT & EDUCATIONAL OBJECTIVE:
 * A Topological Sort of a Directed Acyclic Graph (DAG) G = (V, E) is a linear ordering
 * of vertices such that for every directed edge (u -> v), vertex u comes before v
 * in the ordering.
 *
 * *IMPORTANT EDUCATIONAL NOTE*:
 * Topological sorting applies exclusively to DIRECTED ACYCLIC GRAPHS (DAGs), such as:
 * - Course prerequisite chains
 * - Connection pipeline stages (e.g., Profile Created -> Friend Request Sent -> Request Accepted -> Chat Enabled)
 * - Task scheduling & dependency resolution
 * It is NOT used for standard mutual friendships because friendships are symmetric
 * (undirected cycles like A - B - C - A are normal).
 *
 * KAHN'S ALGORITHM STEPS:
 * 1. Compute in-degree (number of incoming directed edges) for each vertex in G.
 * 2. Initialize a Queue and enqueue all vertices with in-degree = 0 (vertices with no prerequisites).
 * 3. While the Queue is not empty:
 *    a. Dequeue vertex u and append u to the topological ordering.
 *    b. For each neighbor v such that edge (u -> v) exists:
 *       - Decrement in-degree of v by 1.
 *       - If in-degree of v becomes 0, enqueue v.
 * 4. Cycle Detection:
 *    - If the number of vertices in topological ordering == total vertices V, the ordering is valid!
 *    - If count < V, the graph contains at least one DIRECTED CYCLE and cannot be topologically sorted.
 *
 * TIME COMPLEXITY ANALYSIS:
 * - In-degree computation: O(V + E)
 * - Initializing queue with 0 in-degree nodes: O(V)
 * - Processing vertices and edge decrements: Each vertex is enqueued/dequeued once,
 *   and each edge is traversed once: O(V + E).
 * - Overall Time Complexity: O(V + E).
 * - Space Complexity: O(V + E) for adjacency list, in-degree map, and queue.
 * ============================================================================
 */

/**
 * Runs Kahn's algorithm for Topological Sorting.
 *
 * @param {Array<string>} vertices - List of vertex identifiers
 * @param {Array<{from: string, to: string, label?: string}>} edges - Directed edges (from -> to)
 * @returns {object} { order, hasCycle, steps, initialInDegrees }
 */
function runKahnTopologicalSort(vertices, edges) {
    const uniqueVerticesSet = new Set();
    if (Array.isArray(vertices)) {
        vertices.forEach(v => {
            if (v !== undefined && v !== null && v !== '') uniqueVerticesSet.add(v);
        });
    }
    if (Array.isArray(edges)) {
        edges.forEach(e => {
            if (e && e.from !== undefined && e.from !== null && e.from !== '') uniqueVerticesSet.add(e.from);
            if (e && e.to !== undefined && e.to !== null && e.to !== '') uniqueVerticesSet.add(e.to);
        });
    }

    const canonicalVertices = Array.from(uniqueVerticesSet);
    if (canonicalVertices.length === 0) {
        return { order: [], hasCycle: false, steps: [], initialInDegrees: {}, vertexCount: 0, edgeCount: 0, canonicalVertices: [] };
    }

    const validEdges = (Array.isArray(edges) ? edges : []).filter(e => e && e.from && e.to);

    // Step 1: Initialize adjacency list and in-degree map
    const adj = new Map();
    const inDegree = new Map();

    for (const v of canonicalVertices) {
        adj.set(v, []);
        inDegree.set(v, 0);
    }

    for (const { from, to } of validEdges) {
        if (!adj.has(from)) adj.set(from, []);
        if (!inDegree.has(to)) inDegree.set(to, 0);

        adj.get(from).push(to);
        inDegree.set(to, inDegree.get(to) + 1);
    }

    const initialInDegrees = Object.fromEntries(inDegree);

    // Step 2: Initialize queue with all vertices having in-degree 0
    const queue = [];
    for (const v of canonicalVertices) {
        if (inDegree.get(v) === 0) {
            queue.push(v);
        }
    }

    const order = [];
    const steps = [];
    let stepNumber = 1;

    steps.push({
        step: stepNumber++,
        action: 'INITIALIZATION',
        queue: [...queue],
        inDegrees: Object.fromEntries(inDegree),
        description: `Found ${queue.length} starting vertex/vertices with in-degree 0: [${queue.join(', ')}].`
    });

    // Step 3: BFS processing
    while (queue.length > 0) {
        const u = queue.shift();
        order.push(u);

        const neighbors = adj.get(u) || [];
        const newlyZero = [];

        for (const v of neighbors) {
            const currentDeg = inDegree.get(v) - 1;
            inDegree.set(v, currentDeg);

            if (currentDeg === 0) {
                queue.push(v);
                newlyZero.push(v);
            }
        }

        steps.push({
            step: stepNumber++,
            action: 'PROCESS_VERTEX',
            dequeued: u,
            outgoingNeighbors: neighbors,
            queue: [...queue],
            inDegrees: Object.fromEntries(inDegree),
            newlyEnqueued: newlyZero,
            currentOrder: [...order],
            description: `Dequeued '${u}'. Decremented in-degrees of [${neighbors.join(', ')}]. ${
                newlyZero.length > 0 ? `In-degree became 0 for: [${newlyZero.join(', ')}], pushed to queue.` : 'No new in-degree 0 vertices.'
            }`
        });
    }

    // Step 4: Check for cycle
    const hasCycle = order.length !== canonicalVertices.length;

    steps.push({
        step: stepNumber,
        action: 'COMPLETION',
        hasCycle,
        finalOrder: order,
        description: hasCycle
            ? `Cycle Detected! Processed ${order.length} out of ${canonicalVertices.length} vertices. Graph has a cycle.`
            : `Success! Valid topological order found with all ${order.length} vertices.`
    });

    return {
        order,
        hasCycle,
        steps,
        initialInDegrees,
        vertexCount: canonicalVertices.length,
        edgeCount: validEdges.length,
        canonicalVertices
    };
}

/**
 * Sample Social Connection Progression DAG (Workflow from registration to deep engagement)
 */
const sampleProgressionDAG = {
    vertices: [
        'Registration',
        'ProfileSetup',
        'BrowseDirectory',
        'SendFriendRequest',
        'RequestAccepted',
        'DirectMessaging',
        'StudyGroupInvite',
        'CollaborativeProject'
    ],
    edges: [
        { from: 'Registration', to: 'ProfileSetup', label: 'Mandatory' },
        { from: 'ProfileSetup', to: 'BrowseDirectory', label: 'Unlocks' },
        { from: 'BrowseDirectory', to: 'SendFriendRequest', label: 'Action' },
        { from: 'SendFriendRequest', to: 'RequestAccepted', label: 'Receiver approval' },
        { from: 'RequestAccepted', to: 'DirectMessaging', label: 'Unlocks Chat' },
        { from: 'RequestAccepted', to: 'StudyGroupInvite', label: 'Group access' },
        { from: 'DirectMessaging', to: 'CollaborativeProject', label: 'Discussion' },
        { from: 'StudyGroupInvite', to: 'CollaborativeProject', label: 'Team formation' }
    ]
};

/**
 * Sample Computer Science Curriculum Prerequisite DAG
 */
const sampleCoursePrerequisiteDAG = {
    vertices: [
        'IntroToProgramming',
        'DiscreteMathematics',
        'DataStructures',
        'Algorithms',
        'OperatingSystems',
        'DatabaseSystems',
        'DistributedSystems',
        'MachineLearning'
    ],
    edges: [
        { from: 'IntroToProgramming', to: 'DataStructures' },
        { from: 'DiscreteMathematics', to: 'Algorithms' },
        { from: 'DataStructures', to: 'Algorithms' },
        { from: 'DataStructures', to: 'OperatingSystems' },
        { from: 'DataStructures', to: 'DatabaseSystems' },
        { from: 'Algorithms', to: 'MachineLearning' },
        { from: 'OperatingSystems', to: 'DistributedSystems' },
        { from: 'DatabaseSystems', to: 'DistributedSystems' }
    ]
};

module.exports = {
    runKahnTopologicalSort,
    sampleProgressionDAG,
    sampleCoursePrerequisiteDAG
};

/**
 * ============================================================================
 * DSA MODULE: Minimum Spanning Tree (MST) using Kruskal's Algorithm & DSU
 * ============================================================================
 *
 * CONCEPT & EDUCATIONAL OBJECTIVE:
 * A Minimum Spanning Tree (MST) of an undirected, connected, weighted graph G = (V, E)
 * is a subgraph that connects all V vertices with exactly V - 1 edges and minimal total weight,
 * without containing any cycles.
 *
 * *EDUCATIONAL DISTINCTION*:
 * MST demonstrates communication backbone optimization (e.g., campus server / network cabling).
 * It is distinct from user recommendation ranking, which uses 2-hop triadic closure
 * and calibrated supervised learning.
 *
 * ALGORITHM SPECIFICATION:
 * 1. Extract canonical unique vertices dynamically: V = |unique(vertices ∪ endpoints)|.
 * 2. Sort all edges in non-decreasing order of weight (E log E).
 * 3. Initialize Disjoint Set Union (DSU) with Path Compression and Union by Rank.
 * 4. Iterate over sorted edges:
 *    - For edge (u, v): compute rootU = find(u), rootV = find(v).
 *    - If rootU !== rootV: Accept edge, union(rootU, rootV), add weight to total MST weight.
 *    - If rootU === rootV: Reject edge (cycle detected).
 *    - Once exactly V - 1 edges are accepted, mark any remaining edges as SKIPPED.
 * 5. Return canonical graph, accepted MST edges, total weight, and step-by-step trace.
 * ============================================================================
 */

/**
 * Disjoint Set Union (DSU) / Union-Find data structure
 * Features:
 * - Path compression in `find` (flattens tree structure to set root)
 * - Union by rank in `union` (attaches shallower tree under root of deeper tree)
 */
class DisjointSetUnion {
    constructor(vertices) {
        this.parent = new Map();
        this.rank = new Map();

        const list = Array.isArray(vertices) ? vertices : [];
        for (const v of list) {
            if (v !== undefined && v !== null && v !== '') {
                this.parent.set(v, v);
                this.rank.set(v, 0);
            }
        }
    }

    /**
     * Finds the representative root of vertex u with path compression.
     * @param {string|number} u
     * @returns {string|number} Root representative
     */
    find(u) {
        if (!this.parent.has(u)) {
            this.parent.set(u, u);
            this.rank.set(u, 0);
        }

        if (this.parent.get(u) !== u) {
            // Path compression
            this.parent.set(u, this.find(this.parent.get(u)));
        }
        return this.parent.get(u);
    }

    /**
     * Unites sets containing u and v using union by rank.
     * @param {string|number} u
     * @param {string|number} v
     * @returns {boolean} True if sets were united, false if already in the same set (cycle)
     */
    union(u, v) {
        const rootU = this.find(u);
        const rootV = this.find(v);

        if (rootU === rootV) {
            return false;
        }

        const rankU = this.rank.get(rootU) || 0;
        const rankV = this.rank.get(rootV) || 0;

        if (rankU < rankV) {
            this.parent.set(rootU, rootV);
        } else if (rankU > rankV) {
            this.parent.set(rootV, rootU);
        } else {
            this.parent.set(rootV, rootU);
            this.rank.set(rootU, rankU + 1);
        }

        return true;
    }

    /**
     * Checks if u and v share the same representative root.
     * @param {string|number} u
     * @param {string|number} v
     * @returns {boolean}
     */
    connected(u, v) {
        return this.find(u) === this.find(v);
    }
}

/**
 * Runs Kruskal's algorithm on a weighted undirected graph.
 *
 * @param {Array<string|number>} vertices - Optional vertex labels/IDs
 * @param {Array<{u: string|number, v: string|number, weight: number}>} edges - List of weighted edges
 * @returns {object} { mstEdges, totalWeight, steps, isConnected, vertexCount, edgeCount, canonicalVertices }
 */
function runKruskalMST(vertices, edges) {
    // 1. Derive total vertex count dynamically from unique vertices and edge endpoints
    const uniqueVerticesSet = new Set();
    if (Array.isArray(vertices)) {
        vertices.forEach(v => {
            if (v !== undefined && v !== null && v !== '') uniqueVerticesSet.add(v);
        });
    }
    if (Array.isArray(edges)) {
        edges.forEach(e => {
            if (e && e.u !== undefined && e.u !== null && e.u !== '') uniqueVerticesSet.add(e.u);
            if (e && e.v !== undefined && e.v !== null && e.v !== '') uniqueVerticesSet.add(e.v);
        });
    }

    const canonicalVertices = Array.from(uniqueVerticesSet);
    const V = canonicalVertices.length;

    if (V === 0) {
        return {
            mstEdges: [],
            totalWeight: 0,
            steps: [],
            isConnected: true,
            vertexCount: 0,
            edgeCount: 0,
            canonicalVertices: []
        };
    }

    // 2. Clone and sort edges by ascending weight: O(E log E)
    const validEdges = (Array.isArray(edges) ? edges : []).filter(e => e && e.u !== undefined && e.v !== undefined && typeof e.weight === 'number');
    const sortedEdges = [...validEdges].sort((a, b) => a.weight - b.weight);

    // 3. Initialize DSU
    const dsu = new DisjointSetUnion(canonicalVertices);
    const mstEdges = [];
    let totalWeight = 0;
    const steps = [];

    // 4. Iterate over sorted edges
    for (let i = 0; i < sortedEdges.length; i++) {
        const edge = sortedEdges[i];

        // Once V - 1 edges have been accepted, the MST is complete for a connected graph.
        if (V > 1 && mstEdges.length === V - 1) {
            steps.push({
                step: i + 1,
                edge: `${edge.u} - ${edge.v}`,
                u: edge.u,
                v: edge.v,
                weight: edge.weight,
                action: 'SKIPPED',
                rootU: dsu.find(edge.u),
                rootV: dsu.find(edge.v),
                reason: `MST is complete with exactly V - 1 = ${V - 1} accepted edges spanning all ${V} vertices. Remaining edge skipped.`,
                currentMstWeight: totalWeight
            });
            continue;
        }

        // Calculate actual roots for both endpoints using find(u) and find(v)
        const rootU = dsu.find(edge.u);
        const rootV = dsu.find(edge.v);

        if (rootU !== rootV) {
            // Endpoints belong to different components: accept edge
            dsu.union(edge.u, edge.v);
            mstEdges.push({ u: edge.u, v: edge.v, weight: edge.weight });
            totalWeight += edge.weight;

            steps.push({
                step: i + 1,
                edge: `${edge.u} - ${edge.v}`,
                u: edge.u,
                v: edge.v,
                weight: edge.weight,
                action: 'ACCEPTED',
                rootU,
                rootV,
                reason: `find('${edge.u}') = '${rootU}' and find('${edge.v}') = '${rootV}' belong to distinct DSU components. Edge accepted into MST without forming a cycle.`,
                currentMstWeight: totalWeight
            });
        } else {
            // Endpoints already belong to the same component: cycle rejection
            steps.push({
                step: i + 1,
                edge: `${edge.u} - ${edge.v}`,
                u: edge.u,
                v: edge.v,
                weight: edge.weight,
                action: 'REJECTED',
                rootU,
                rootV,
                reason: `find('${edge.u}') = '${rootU}' and find('${edge.v}') = '${rootV}' are both in the same DSU set '${rootU}'. Adding this edge would form a cycle (cycle-rejected).`,
                currentMstWeight: totalWeight
            });
        }
    }

    const isConnected = V <= 1 ? true : (mstEdges.length === V - 1);

    return {
        mstEdges,
        totalWeight,
        steps,
        isConnected,
        vertexCount: V,
        edgeCount: sortedEdges.length,
        canonicalVertices
    };
}

/**
 * Canonical campus communication backbone graph for academic demonstration
 */
const sampleCampusBackboneGraph = {
    vertices: ['CampusServer', 'HostelA', 'HostelB', 'Library', 'CS_Lab', 'Cafeteria', 'SportsComplex'],
    edges: [
        { u: 'CampusServer', v: 'CS_Lab', weight: 4 },
        { u: 'CampusServer', v: 'Library', weight: 8 },
        { u: 'CS_Lab', v: 'Library', weight: 11 },
        { u: 'CS_Lab', v: 'HostelA', weight: 8 },
        { u: 'Library', v: 'Cafeteria', weight: 7 },
        { u: 'Library', v: 'HostelB', weight: 1 },
        { u: 'HostelA', v: 'HostelB', weight: 2 },
        { u: 'HostelA', v: 'SportsComplex', weight: 4 },
        { u: 'HostelB', v: 'Cafeteria', weight: 6 },
        { u: 'Cafeteria', v: 'SportsComplex', weight: 2 }
    ]
};

module.exports = {
    DisjointSetUnion,
    runKruskalMST,
    sampleCampusBackboneGraph
};

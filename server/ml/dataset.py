"""
Synthetic Educational Dataset Generator for AffinityAI.

Generates a realistic, documented educational benchmark dataset simulating
a student academic community. Pairs model triadic closure, homophily in
academic interests, and network degree distributions.

NOTE: This is a clearly documented synthetic educational dataset designed
for learning and evaluation within the B.Tech CSE project. It does NOT claim
to represent real-world commercial social network accuracy.
"""

import os
import sys
import random
import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Set

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from features import TOPIC_SYNONYMS, FEATURE_COLUMNS, compute_pair_features

RANDOM_SEED = 42

COHORTS = {
    'AI_Robotics': ['Artificial Intelligence', 'Machine Learning', 'Robotics', 'Data Science', 'Mathematics'],
    'Systems_Cybersecurity': ['Cybersecurity', 'Distributed Systems', 'Compilers', 'Algorithms', 'Mathematics'],
    'Web_FullStack': ['Web Development', 'UI/UX Design', 'Mobile Development', 'Algorithms'],
    'Data_Math': ['Data Science', 'Machine Learning', 'Mathematics', 'Algorithms', 'Artificial Intelligence']
}


def generate_synthetic_network(num_students: int = 100, seed: int = RANDOM_SEED) -> Tuple[Dict[int, Set[int]], Dict[int, Set[str]]]:
    """
    Generates a simulated student social network with academic interest clusters.
    """
    random.seed(seed)
    np.random.seed(seed)

    cohort_keys = list(COHORTS.keys())
    students_interests: Dict[int, Set[str]] = {}
    cohort_assignment: Dict[int, str] = {}

    for i in range(1, num_students + 1):
        cohort = cohort_keys[i % len(cohort_keys)]
        cohort_assignment[i] = cohort
        cohort_pool = COHORTS[cohort]
        num_topics = random.randint(1, 3)
        topics = set(random.sample(cohort_pool, k=num_topics))
        # Occasional cross-cohort interest
        if random.random() < 0.25:
            all_topics = list(TOPIC_SYNONYMS.keys())
            topics.add(random.choice(all_topics))
        students_interests[i] = topics

    # Build friendships based on interest similarity and triadic closure (sparse student graph)
    adj: Dict[int, Set[int]] = {i: set() for i in range(1, num_students + 1)}

    # Phase 1: Base homophily connections (cohorts & shared interests)
    for u in range(1, num_students + 1):
        for v in range(u + 1, num_students + 1):
            if len(adj[u]) >= 6 or len(adj[v]) >= 6:
                continue
            shared = len(students_interests[u].intersection(students_interests[v]))
            same_cohort = (cohort_assignment[u] == cohort_assignment[v])
            prob = 0.005
            if same_cohort:
                prob += 0.035
            prob += shared * 0.025
            if random.random() < prob:
                adj[u].add(v)
                adj[v].add(u)

    # Phase 2: Triadic closure (controlled friends-of-friends closure)
    initial_snapshot = {i: set(adj[i]) for i in range(1, num_students + 1)}
    for u in range(1, num_students + 1):
        for f in initial_snapshot[u]:
            for w in initial_snapshot[f]:
                if w > u and w not in adj[u] and len(adj[u]) < 8 and len(adj[w]) < 8:
                    shared_interests = len(students_interests[u].intersection(students_interests[w]))
                    closure_prob = 0.12 + (shared_interests * 0.08)
                    if random.random() < closure_prob:
                        adj[u].add(w)
                        adj[w].add(u)

    return adj, students_interests


def build_pair_dataset(num_students: int = 100, max_pairs: int = 1200, seed: int = RANDOM_SEED) -> pd.DataFrame:
    """
    Generates balanced positive and negative pair observations with extracted features.
    """
    adj, interests = generate_synthetic_network(num_students=num_students, seed=seed)
    all_degrees = {u: len(friends) for u, friends in adj.items()}

    positive_pairs: List[Tuple[int, int]] = []
    negative_pairs: List[Tuple[int, int]] = []

    for u in range(1, num_students + 1):
        for v in range(u + 1, num_students + 1):
            if v in adj[u]:
                positive_pairs.append((u, v))
            else:
                negative_pairs.append((u, v))

    random.seed(seed)
    random.shuffle(positive_pairs)
    random.shuffle(negative_pairs)

    # Sample balanced dataset (up to max_pairs // 2 positive, and matched negative)
    sample_pos_count = min(len(positive_pairs), max_pairs // 2)
    sample_neg_count = min(len(negative_pairs), sample_pos_count * 2)  # realistic ratio ~ 1:2

    selected_pos = positive_pairs[:sample_pos_count]
    selected_neg = negative_pairs[:sample_neg_count]

    rows = []
    for u, v in selected_pos:
        # Note: when computing features for predicting a link, mutual friends
        # are measured from the rest of the graph (simulating pre-formation features)
        u_friends = adj[u] - {v}
        v_friends = adj[v] - {u}
        feat = compute_pair_features(u_friends, v_friends, interests[u], interests[v], all_degrees)
        feat['pair_label'] = 1
        feat['user1_id'] = u
        feat['user2_id'] = v
        rows.append(feat)

    for u, v in selected_neg:
        feat = compute_pair_features(adj[u], adj[v], interests[u], interests[v], all_degrees)
        feat['pair_label'] = 0
        feat['user1_id'] = u
        feat['user2_id'] = v
        rows.append(feat)

    df = pd.DataFrame(rows)
    # Shuffle entire dataset
    df = df.sample(frac=1.0, random_state=seed).reset_index(drop=True)
    return df


if __name__ == '__main__':
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(data_dir, exist_ok=True)
    csv_path = os.path.join(data_dir, 'synthetic_student_network_dataset.csv')

    print(f"Generating synthetic educational dataset (seed={RANDOM_SEED})...")
    df = build_pair_dataset(num_students=120, max_pairs=1200, seed=RANDOM_SEED)
    df.to_csv(csv_path, index=False)

    print(f"[OK] Generated {len(df)} pair records.")
    print(f"   Positive samples (friendship formed): {sum(df['pair_label'] == 1)}")
    print(f"   Negative samples (no friendship): {sum(df['pair_label'] == 0)}")
    print(f"   Saved to: {csv_path}")

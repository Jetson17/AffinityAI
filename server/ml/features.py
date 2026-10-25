"""
Feature engineering and academic topic extraction for AffinityAI.

Provides canonical feature extraction for pair-wise student friendship
recommendations, including graph triadic closure, Jaccard similarities,
and academic topic synonym normalization.
"""

import re
from typing import List, Set, Dict, Any

# Canonical academic topic taxonomy with synonym mapping
TOPIC_SYNONYMS: Dict[str, List[str]] = {
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
}

FEATURE_COLUMNS = [
    'mutual_friends',
    'friend_jaccard',
    'shared_interests',
    'interest_jaccard',
    'target_degree',
    'candidate_degree',
    'adamic_adar_approx'
]


def extract_canonical_topics(text: str) -> List[str]:
    """
    Extracts canonical academic topics from profile bio or interest text.
    Handles synonyms and case variations (e.g., 'AI' and 'Artificial Intelligence').
    """
    if not text or not isinstance(text, str):
        return []

    text_lower = text.lower()
    detected_canonical = set()

    for canonical, synonyms in TOPIC_SYNONYMS.items():
        for syn in synonyms:
            # Word boundary regex to avoid partial substring matching
            pattern = r'\b' + re.escape(syn) + r'\b'
            if re.search(pattern, text_lower):
                detected_canonical.add(canonical)
                break

    return sorted(list(detected_canonical))


def compute_pair_features(
    target_friends: Set[int],
    candidate_friends: Set[int],
    target_topics: Set[str],
    candidate_topics: Set[str],
    all_degrees: Dict[int, int] = None
) -> Dict[str, float]:
    """
    Computes explainable ML feature dictionary for a candidate student pair (u, v).
    """
    # 1. Mutual friends count
    intersection_friends = target_friends.intersection(candidate_friends)
    mutual_count = len(intersection_friends)

    # 2. Friend Jaccard similarity
    union_friends = target_friends.union(candidate_friends)
    friend_jaccard = (mutual_count / len(union_friends)) if union_friends else 0.0

    # 3. Shared academic interests count
    shared_topics = target_topics.intersection(candidate_topics)
    shared_topics_count = len(shared_topics)

    # 4. Interest Jaccard similarity
    union_topics = target_topics.union(candidate_topics)
    interest_jaccard = (shared_topics_count / len(union_topics)) if union_topics else 0.0

    # 5. Node degrees
    target_deg = len(target_friends)
    cand_deg = len(candidate_friends)

    # 6. Adamic-Adar index (approximated using average degree if degrees map not provided)
    adamic_adar = 0.0
    if mutual_count > 0:
        if all_degrees:
            import math
            for friend_id in intersection_friends:
                deg = all_degrees.get(friend_id, 2)
                if deg > 1:
                    adamic_adar += 1.0 / math.log(deg)
                else:
                    adamic_adar += 1.0
        else:
            # Baseline approximation when degrees of neighbors are uniform
            import math
            avg_deg = max(2.0, (target_deg + cand_deg) / 2.0)
            adamic_adar = mutual_count / math.log(avg_deg)

    return {
        'mutual_friends': float(mutual_count),
        'friend_jaccard': float(round(friend_jaccard, 4)),
        'shared_interests': float(shared_topics_count),
        'interest_jaccard': float(round(interest_jaccard, 4)),
        'target_degree': float(target_deg),
        'candidate_degree': float(cand_deg),
        'adamic_adar_approx': float(round(adamic_adar, 4))
    }

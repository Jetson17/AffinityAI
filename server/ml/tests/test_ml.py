"""
Automated Unit Tests for AffinityAI Machine Learning Recommender.
Tests topic extraction, feature computation, dataset generation, training, and inference.
"""

import os
import sys
import json
import pytest
import numpy as np
import pandas as pd

# Add ml folder to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from features import (
    extract_canonical_topics,
    compute_pair_features,
    FEATURE_COLUMNS,
    TOPIC_SYNONYMS
)
from dataset import build_pair_dataset, generate_synthetic_network, RANDOM_SEED
from train import train_models
from predict import predict_candidates, load_model


class TestTopicExtraction:
    def test_canonical_synonym_normalization(self):
        # AI synonyms
        topics_ai1 = extract_canonical_topics("I study AI and neural networks")
        topics_ai2 = extract_canonical_topics("Passionate about Artificial Intelligence")
        assert 'Artificial Intelligence' in topics_ai1
        assert 'Artificial Intelligence' in topics_ai2

        # Web Dev synonyms
        topics_web = extract_canonical_topics("Full-stack engineer building React frontend and Node backend")
        assert 'Web Development' in topics_web

        # Cybersecurity synonyms
        topics_sec = extract_canonical_topics("Ethical hacking and CTF competitions")
        assert 'Cybersecurity' in topics_sec

    def test_empty_and_invalid_bios(self):
        assert extract_canonical_topics("") == []
        assert extract_canonical_topics(None) == []
        assert extract_canonical_topics("Just a general student.") == []

    def test_word_boundary_precision(self):
        # Ensure partial word matches like 'fair' don't trigger 'ai'
        topics = extract_canonical_topics("Enjoying the science fair with friends")
        assert 'Artificial Intelligence' not in topics


class TestFeatureComputation:
    def test_standard_pair_features(self):
        target_friends = {2, 3, 4}
        candidate_friends = {3, 4, 5, 6}
        target_topics = {'Artificial Intelligence', 'Algorithms'}
        candidate_topics = {'Algorithms', 'Web Development'}

        feat = compute_pair_features(target_friends, candidate_friends, target_topics, candidate_topics)

        # Mutual friends: {3, 4} -> 2
        assert feat['mutual_friends'] == 2.0
        # Friend Jaccard: 2 / |{2,3,4,5,6}| = 2 / 5 = 0.4
        assert feat['friend_jaccard'] == 0.4
        # Shared topics: {'Algorithms'} -> 1
        assert feat['shared_interests'] == 1.0
        # Interest Jaccard: 1 / |{AI, Algorithms, Web}| = 1 / 3 = 0.3333
        assert feat['interest_jaccard'] == 0.3333
        assert feat['target_degree'] == 3.0
        assert feat['candidate_degree'] == 4.0
        assert feat['adamic_adar_approx'] > 0.0

    def test_cold_start_zero_friends(self):
        target_friends = set()
        candidate_friends = {2, 3}
        target_topics = {'Artificial Intelligence'}
        candidate_topics = {'Artificial Intelligence'}

        feat = compute_pair_features(target_friends, candidate_friends, target_topics, candidate_topics)

        assert feat['mutual_friends'] == 0.0
        assert feat['friend_jaccard'] == 0.0
        assert feat['shared_interests'] == 1.0
        assert feat['interest_jaccard'] == 1.0
        assert feat['target_degree'] == 0.0
        assert feat['candidate_degree'] == 2.0
        assert feat['adamic_adar_approx'] == 0.0

    def test_missing_interests_graceful(self):
        target_friends = {2, 3}
        candidate_friends = {3, 4}
        target_topics = set()
        candidate_topics = set()

        feat = compute_pair_features(target_friends, candidate_friends, target_topics, candidate_topics)

        assert feat['mutual_friends'] == 1.0
        assert feat['shared_interests'] == 0.0
        assert feat['interest_jaccard'] == 0.0


class TestDatasetGeneration:
    def test_dataset_reproducibility_and_structure(self):
        df = build_pair_dataset(num_students=40, max_pairs=200, seed=RANDOM_SEED)

        assert isinstance(df, pd.DataFrame)
        assert len(df) > 0
        for col in FEATURE_COLUMNS:
            assert col in df.columns
        assert 'pair_label' in df.columns

        # Check binary labels 0 and 1 exist
        unique_labels = set(df['pair_label'].unique())
        assert 1 in unique_labels
        assert 0 in unique_labels

        # No null/NaN values
        assert df[FEATURE_COLUMNS].isna().sum().sum() == 0


class TestModelTrainingAndInference:
    def test_train_pipeline_and_prediction(self):
        lr_metrics, rf_metrics = train_models()

        assert lr_metrics['accuracy'] > 0.65
        assert lr_metrics['roc_auc'] > 0.65
        assert rf_metrics['accuracy'] > 0.65

        # Test inference on sample candidates
        candidates = [
            {
                'candidate_id': 101,
                'mutual_friends': 3,
                'friend_jaccard': 0.5,
                'shared_interests': 2,
                'interest_jaccard': 0.66,
                'target_degree': 4,
                'candidate_degree': 5,
                'adamic_adar_approx': 2.1
            },
            {
                'candidate_id': 102,
                'mutual_friends': 0,
                'friend_jaccard': 0.0,
                'shared_interests': 0,
                'interest_jaccard': 0.0,
                'target_degree': 1,
                'candidate_degree': 1,
                'adamic_adar_approx': 0.0
            }
        ]

        preds = predict_candidates(candidates)
        assert len(preds) == 2

        # Strong candidate 101 should score higher than disconnected candidate 102
        assert preds[0]['predicted_score'] > preds[1]['predicted_score']
        assert 0.0 <= preds[0]['predicted_probability'] <= 1.0
        assert 0.0 <= preds[1]['predicted_probability'] <= 1.0
        assert preds[0]['candidate_id'] == 101
        assert 'features' in preds[0]

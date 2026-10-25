"""
Inference Interface for AffinityAI Machine Learning Recommender.

Accepts candidate pair feature payloads via stdin or CLI argument,
loads the serialized scikit-learn model, and returns calibrated
friendship probabilities and explainable feature contributions.
"""

import sys
import os
import json
import joblib
import numpy as np
import pandas as pd

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from features import FEATURE_COLUMNS

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model', 'friend_recommender.joblib')
META_PATH = os.path.join(os.path.dirname(__file__), 'model', 'model_meta.json')


def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model artifact not found at {MODEL_PATH}. Run train.py first.")
    return joblib.load(MODEL_PATH)


def load_feature_coefficients():
    if os.path.exists(META_PATH):
        try:
            with open(META_PATH, 'r') as f:
                data = json.load(f)
                return data.get('feature_coefficients', {})
        except Exception:
            pass
    return {}


def predict_candidates(candidates_data):
    """
    Predicts connection probabilities for an array of candidate feature dicts.
    """
    model = load_model()
    coefs = load_feature_coefficients()

    if not isinstance(candidates_data, list):
        candidates_data = [candidates_data]

    if len(candidates_data) == 0:
        return []

    # Build DataFrame matching FEATURE_COLUMNS exactly
    rows = []
    for c in candidates_data:
        row = {col: float(c.get(col, 0.0)) for col in FEATURE_COLUMNS}
        rows.append(row)

    df_features = pd.DataFrame(rows)[FEATURE_COLUMNS]

    # Predict probabilities via logistic sigmoid: P(y=1|X)
    probs = model.predict_proba(df_features)[:, 1]

    results = []
    for idx, c in enumerate(candidates_data):
        prob = float(probs[idx])
        score = int(round(prob * 100))

        # Explainability: compute relative contribution per feature
        # z_i = coef_i * scaled_x_i
        feature_breakdown = {}
        for col in FEATURE_COLUMNS:
            feature_breakdown[col] = float(round(float(c.get(col, 0.0)), 4))

        results.append({
            'candidate_id': c.get('candidate_id'),
            'predicted_probability': float(round(prob, 4)),
            'predicted_score': score,
            'features': feature_breakdown
        })

    return results


def main():
    try:
        raw_input = ""
        # 1. Check if argument passed directly
        if len(sys.argv) > 1 and sys.argv[1] != '-':
            raw_input = sys.argv[1]
        else:
            # Read from standard input
            raw_input = sys.stdin.read().strip()

        if not raw_input:
            print(json.dumps({'status': 'error', 'error': 'No candidate features provided in input.'}))
            sys.exit(1)

        payload = json.loads(raw_input)
        candidates = payload.get('candidates', payload) if isinstance(payload, dict) else payload

        predictions = predict_candidates(candidates)

        response = {
            'status': 'ok',
            'model': 'Logistic Regression (Calibrated Link Predictor)',
            'recommendation_mode': 'ml',
            'count': len(predictions),
            'predictions': predictions
        }
        print(json.dumps(response))
        sys.exit(0)

    except Exception as e:
        # Secure error handling: do not expose stack traces or internal filesystem details
        print(json.dumps({
            'status': 'error',
            'error': str(e)
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()

"""
Model Training Script for AffinityAI.

Trains supervised learning models (Logistic Regression baseline and Random Forest)
on the synthetic student network dataset. Evaluates holdout test performance,
computes explainable feature coefficients, and persists the production model.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

from features import FEATURE_COLUMNS
from dataset import build_pair_dataset, RANDOM_SEED

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'model')
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')


def load_or_generate_data() -> pd.DataFrame:
    os.makedirs(DATA_DIR, exist_ok=True)
    csv_path = os.path.join(DATA_DIR, 'synthetic_student_network_dataset.csv')
    if os.path.exists(csv_path):
        return pd.read_csv(csv_path)
    print("Dataset CSV not found. Generating new synthetic dataset...")
    df = build_pair_dataset(num_students=120, max_pairs=1200, seed=RANDOM_SEED)
    df.to_csv(csv_path, index=False)
    return df


def train_models():
    print("=================================================================")
    print("AffinityAI — Model Training & Evaluation")
    print("=================================================================")

    df = load_or_generate_data()
    X = df[FEATURE_COLUMNS]
    y = df['pair_label']

    # Stratified 80/20 train/test split with fixed seed (prevents data leakage)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=RANDOM_SEED, stratify=y
    )

    print(f"Total dataset size: {len(df)} samples")
    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples (Holdout)")
    print(f"Features: {FEATURE_COLUMNS}\n")

    # 1. Model A: Logistic Regression (Interpretable Linear Baseline)
    lr_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('classifier', LogisticRegression(
            C=1.0,
            solver='lbfgs',
            max_iter=1000,
            random_state=RANDOM_SEED
        ))
    ])
    lr_pipeline.fit(X_train, y_train)

    lr_y_pred = lr_pipeline.predict(X_test)
    lr_y_prob = lr_pipeline.predict_proba(X_test)[:, 1]

    lr_metrics = {
        'model_name': 'Logistic Regression (Standardized)',
        'accuracy': float(round(accuracy_score(y_test, lr_y_pred), 4)),
        'precision': float(round(precision_score(y_test, lr_y_pred, zero_division=0), 4)),
        'recall': float(round(recall_score(y_test, lr_y_pred, zero_division=0), 4)),
        'f1_score': float(round(f1_score(y_test, lr_y_pred, zero_division=0), 4)),
        'roc_auc': float(round(roc_auc_score(y_test, lr_y_prob), 4))
    }

    # Extract feature weights / coefficients
    lr_coefs = lr_pipeline.named_steps['classifier'].coef_[0]
    feature_importances = {
        FEATURE_COLUMNS[i]: float(round(lr_coefs[i], 4)) for i in range(len(FEATURE_COLUMNS))
    }

    print("--- 1. Logistic Regression Model Results ---")
    for k, v in lr_metrics.items():
        print(f"  {k}: {v}")
    print("\nFeature Coefficients (Impact on Link Probability):")
    for feat, coef in sorted(feature_importances.items(), key=lambda x: abs(x[1]), reverse=True):
        print(f"  {feat:<22}: {coef:+.4f}")

    # 2. Model B: Random Forest Classifier (Non-linear Benchmark)
    rf_classifier = RandomForestClassifier(
        n_estimators=100,
        max_depth=5,
        min_samples_split=4,
        random_state=RANDOM_SEED
    )
    rf_classifier.fit(X_train, y_train)

    rf_y_pred = rf_classifier.predict(X_test)
    rf_y_prob = rf_classifier.predict_proba(X_test)[:, 1]

    rf_metrics = {
        'model_name': 'Random Forest Classifier (n=100, depth=5)',
        'accuracy': float(round(accuracy_score(y_test, rf_y_pred), 4)),
        'precision': float(round(precision_score(y_test, rf_y_pred, zero_division=0), 4)),
        'recall': float(round(recall_score(y_test, rf_y_pred, zero_division=0), 4)),
        'f1_score': float(round(f1_score(y_test, rf_y_pred, zero_division=0), 4)),
        'roc_auc': float(round(roc_auc_score(y_test, rf_y_prob), 4))
    }

    print("\n--- 2. Random Forest Benchmark Results ---")
    for k, v in rf_metrics.items():
        print(f"  {k}: {v}")

    # Save primary model artifact (Logistic Regression chosen for production explainability and calibrated output)
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_artifact_path = os.path.join(MODEL_DIR, 'friend_recommender.joblib')
    joblib.dump(lr_pipeline, model_artifact_path)
    print(f"\n[OK] Production model saved to: {model_artifact_path}")

    # Save metadata and evaluation summary
    meta = {
        'production_model': 'Logistic Regression',
        'trained_at': pd.Timestamp.now().isoformat(),
        'random_seed': RANDOM_SEED,
        'feature_columns': FEATURE_COLUMNS,
        'logistic_regression_metrics': lr_metrics,
        'random_forest_metrics': rf_metrics,
        'feature_coefficients': feature_importances,
        'training_samples': len(X_train),
        'test_samples': len(X_test),
        'dataset_type': 'synthetic_educational_benchmark'
    }
    meta_path = os.path.join(MODEL_DIR, 'model_meta.json')
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"[OK] Model metadata saved to: {meta_path}")

    return lr_metrics, rf_metrics


if __name__ == '__main__':
    train_models()

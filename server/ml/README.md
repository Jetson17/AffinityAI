# AffinityAI — Machine Learning Recommendation Module

This directory contains the supervised Machine Learning ranking subsystem for **AffinityAI: Intelligent Friend Recommendation System**.

## 1. Architecture & Model Design

While the baseline system uses graph traversal (triadic closure) and heuristic topic matching, this ML module provides a separate supervised binary classification and link prediction model.

### Features
Every candidate pair $(u, v)$ is evaluated on 7 explainable features:
1. `mutual_friends`: Count of mutual friends $|F_u \cap F_v|$ (structural network closeness).
2. `friend_jaccard`: Jaccard similarity coefficient between friend sets: $\frac{|F_u \cap F_v|}{|F_u \cup F_v|}$.
3. `shared_interests`: Count of shared academic topics extracted from user profiles and bios with synonym resolution.
4. `interest_jaccard`: Jaccard similarity of academic interests: $\frac{|I_u \cap I_v|}{|I_u \cup I_v|}$.
5. `target_degree`: Total friend count of the logged-in user $|F_u|$.
6. `candidate_degree`: Total friend count of the candidate $|F_v|$.
7. `adamic_adar_approx`: Adamic-Adar proximity index weighting mutual friends by the inverse log of degree.

### Model Choices
- **Production Model**: **Logistic Regression** with `StandardScaler`.
  - **Calibrated Probability**: Employs the logistic sigmoid function $P(y=1|\mathbf{x}) = \frac{1}{1 + e^{-(\beta_0 + \sum \beta_i x_i)}}$.
  - **Explainability**: Direct linear coefficients communicate the relative positive and negative impact of each feature.
- **Evaluation Benchmark**: **Random Forest Classifier** ($n=100$, $\text{depth}=5$) to benchmark non-linear splits.

---

## 2. Training Dataset & Educational Benchmark

- **Dataset Origin**: Synthetic educational benchmark simulating a university campus of 120 CS students partitioned into academic cohorts (AI/Robotics, Systems/Cybersecurity, Web/Full-Stack, Data/Math).
- **Leakage Prevention**:
  - Mutual friends and degree metrics for positive pairs are computed strictly from pre-formation graph state.
  - Stratified 80/20 train/test split with a fixed random seed (`random_state=42`).
- **Limitation Notice**: This dataset was synthetically generated for academic demonstration and reproducible B.Tech CSE evaluation. It does not claim commercial social network accuracy.

---

## 3. Evaluation Results on Holdout Test Set (20% Split, N=136)

| Metric | Heuristic Baseline | ML Model (Logistic Regression) | Random Forest Benchmark |
| :--- | :--- | :--- | :--- |
| **Precision** | 0.8750 | **0.8947** | 0.8974 |
| **Recall** | **0.7778** | 0.7556 | 0.7778 |
| **F1-Score** | 0.8235 | 0.8193 | **0.8333** |
| **ROC-AUC** | 0.9377 | 0.9286 | **0.9431** |
| **Precision@1** | 0.4878 | **0.5122** | **0.5122** |
| **Precision@3** | 0.3333 | **0.3415** | 0.3415 |
| **Precision@5** | 0.3260 | 0.3260 | 0.3260 |

### Learned Feature Coefficients (Logistic Regression)
- `adamic_adar_approx`: **+1.7210** (Strongest positive structural predictor)
- `shared_interests`: **+1.0180** (Strongest academic homophily predictor)
- `mutual_friends`: **+0.9236** (Triadic closure signal)
- `friend_jaccard`: **+0.4841**
- `target_degree`: -0.6240
- `candidate_degree`: -0.3283
- `interest_jaccard`: -0.1982

---

## 4. Serving & Graceful Fallback Strategy

- The Node.js Express server invokes `predict.py` as a child process via `server/services/mlService.js`.
- If Python or the trained model artifact (`friend_recommender.joblib`) is unavailable, the backend automatically falls back to the JavaScript graph heuristic and sets `recommendationMethod: 'heuristic'`.
- When the ML model is available, candidates are scored and ranked with `recommendationMethod: 'ml'`.

---

## 5. Execution Commands

### Train the model:
```bash
py train.py
```

### Run comparative evaluation:
```bash
py evaluate.py
```

### Test inference via stdin:
```bash
echo '[{"candidate_id": 5, "mutual_friends": 2, "friend_jaccard": 0.4, "shared_interests": 2, "interest_jaccard": 0.5, "target_degree": 3, "candidate_degree": 3, "adamic_adar_approx": 1.44}]' | py predict.py
```

### Run automated Python test suite:
```bash
py -m pytest -v
```

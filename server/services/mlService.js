const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PREDICT_SCRIPT_PATH = path.join(__dirname, '..', 'ml', 'predict.py');
const MODEL_ARTIFACT_PATH = path.join(__dirname, '..', 'ml', 'model', 'friend_recommender.joblib');

/**
 * Service to manage Machine Learning inference via Python subprocess
 */
class MLRecommendationService {
    /**
     * Checks if Python environment and trained model artifact are available
     * @returns {boolean}
     */
    static isModelAvailable() {
        return fs.existsSync(MODEL_ARTIFACT_PATH) && fs.existsSync(PREDICT_SCRIPT_PATH);
    }

    /**
     * Calls Python predict.py subprocess with candidate features
     * @param {Array<object>} candidates - Array of candidate feature objects
     * @returns {Promise<{ available: boolean, predictions?: Map<number, object>, error?: string }>}
     */
    static async predictBatch(candidates) {
        if (!candidates || candidates.length === 0) {
            return { available: true, predictions: new Map() };
        }

        if (!this.isModelAvailable()) {
            return {
                available: false,
                reason: 'Trained model artifact not found. Using graph heuristic fallback.'
            };
        }

        const pythonCmd = process.env.PYTHON_PATH || 'py';

        return new Promise((resolve) => {
            let stdout = '';
            let stderr = '';
            let isTimedOut = false;

            const child = spawn(pythonCmd, [PREDICT_SCRIPT_PATH, '-'], {
                cwd: path.join(__dirname, '..', 'ml'),
                windowsHide: true
            });

            const timeoutId = setTimeout(() => {
                isTimedOut = true;
                child.kill('SIGTERM');
                resolve({
                    available: false,
                    reason: 'ML inference timed out after 4000ms. Using heuristic fallback.'
                });
            }, 4000);

            child.stdout.on('data', (chunk) => {
                stdout += chunk.toString();
            });

            child.stderr.on('data', (chunk) => {
                stderr += chunk.toString();
            });

            child.on('error', (err) => {
                clearTimeout(timeoutId);
                if (!isTimedOut) {
                    resolve({
                        available: false,
                        reason: `Failed to spawn ML inference process (${err.message}). Using heuristic fallback.`
                    });
                }
            });

            child.on('close', (code) => {
                clearTimeout(timeoutId);
                if (isTimedOut) return;

                if (code !== 0) {
                    resolve({
                        available: false,
                        reason: `ML inference exited with code ${code}. Stderr: ${stderr.trim()}`
                    });
                    return;
                }

                try {
                    const parsed = JSON.parse(stdout.trim());
                    if (parsed.status !== 'ok') {
                        resolve({
                            available: false,
                            reason: parsed.error || 'ML inference error. Using heuristic fallback.'
                        });
                        return;
                    }

                    // Index predictions by candidate_id
                    const predictionMap = new Map();
                    for (const item of (parsed.predictions || [])) {
                        predictionMap.set(item.candidate_id, item);
                    }

                    resolve({
                        available: true,
                        modelName: parsed.model,
                        recommendationMode: 'ml',
                        predictions: predictionMap
                    });
                } catch (jsonErr) {
                    resolve({
                        available: false,
                        reason: `Failed to parse ML inference JSON response: ${jsonErr.message}`
                    });
                }
            });

            // Write candidate payload to stdin
            try {
                const payload = JSON.stringify({ candidates });
                child.stdin.write(payload);
                child.stdin.end();
            } catch (writeErr) {
                clearTimeout(timeoutId);
                resolve({
                    available: false,
                    reason: `Failed to write to ML stdin: ${writeErr.message}`
                });
            }
        });
    }
}

module.exports = MLRecommendationService;

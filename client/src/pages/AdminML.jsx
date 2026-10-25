import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Database,
  BarChart2,
  GitBranch,
  Layers,
  Sparkles,
  Info,
  Sliders,
  Scale
} from 'lucide-react';

export default function AdminML() {
  const [mlData, setMlData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMLData = async () => {
      try {
        setLoading(true);
        const res = await api.getAdminMLMonitoring();
        setMlData(res);
      } catch (err) {
        setError(err.message || 'Failed to retrieve AI/ML monitoring metrics.');
      } finally {
        setLoading(false);
      }
    };

    loadMLData();
  }, []);

  if (error) {
    return (
      <div className="page-container">
        <div className="alert-banner alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <AlertTriangle size={20} />
          <div>{error}</div>
        </div>
      </div>
    );
  }

  const isModelReady = mlData?.modelAvailable;
  const metrics = mlData?.evaluationMetrics || {};
  const topK = mlData?.topKMetrics;
  const features = mlData?.features || [];
  const pipeline = mlData?.pipelineStages || [];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem' }}>AI/ML Recommendation Monitoring</h1>
            <span className="badge badge-purple" style={{ padding: '0.3rem 0.75rem' }}>
              <ShieldCheck size={14} style={{ marginRight: '0.3rem' }} /> Verified Inference Telemetry
            </span>
          </div>
          <p className="page-description" style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
            Supervised machine learning model architecture, evaluation benchmarks, feature importance weights, and inference pipeline.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid var(--border-light)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <div>Verifying ML model status and loading evaluation metrics...</div>
        </div>
      ) : (
        <>
          {/* Status & Model Architecture Banner */}
          <div className="card" style={{ marginBottom: '1.75rem', padding: '1.5rem', background: 'linear-gradient(135deg, #ffffff 0%, var(--bg-muted) 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: isModelReady ? 'var(--success-subtle)' : 'var(--warning-subtle)',
                  color: isModelReady ? 'var(--success)' : 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Cpu size={28} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <h2 style={{ fontSize: '1.35rem', margin: 0 }}>{mlData?.modelName}</h2>
                    <span className={`badge ${isModelReady ? 'badge-success' : 'badge-warning'}`}>
                      {isModelReady ? '● Inference Active' : '● Heuristic Fallback'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Active Mode: <strong>{mlData?.activeMode?.toUpperCase()}</strong> &bull; Production Model verified via Python runtime
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last Trained</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    {mlData?.trainedAt ? new Date(mlData.trainedAt).toLocaleString() : 'Pre-trained Artifact'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dataset Sample Size</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    {mlData?.trainingSamples} train / {mlData?.testSamples} test
                  </div>
                </div>
              </div>
            </div>

            {/* Synthetic Data Disclosure */}
            <div style={{
              marginTop: '1.25rem',
              padding: '0.85rem 1rem',
              background: 'var(--primary-subtle)',
              borderLeft: '4px solid var(--primary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              color: 'var(--primary-text)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem'
            }}>
              <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Dataset & Privacy Disclosure: </strong>
                {mlData?.syntheticDataDisclosure}
              </div>
            </div>
          </div>

          {/* Actual Evaluation Metrics Grid */}
          <div className="card" style={{ marginBottom: '1.75rem', padding: '1.5rem' }}>
            <div className="card-header" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <BarChart2 size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>
                  Authoritative Model Evaluation Metrics (Test Split: N={typeof mlData?.testSamples === 'number' ? mlData.testSamples : 'Not available'})
                </h3>
              </div>
              <span className="badge badge-purple">Synthetic Benchmark Evaluation</span>
            </div>

            <div className="grid-4" style={{ marginBottom: '1.25rem' }}>
              <div style={{ background: 'var(--bg-muted)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>ROC-AUC</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.2rem' }}>
                  {typeof metrics?.roc_auc === 'number' ? (metrics.roc_auc * 100).toFixed(1) + '%' : 'Not available'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Discrimination Power</div>
              </div>

              <div style={{ background: 'var(--bg-muted)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Accuracy</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)', marginTop: '0.2rem' }}>
                  {typeof metrics?.accuracy === 'number' ? (metrics.accuracy * 100).toFixed(1) + '%' : 'Not available'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overall Match Correctness</div>
              </div>

              <div style={{ background: 'var(--bg-muted)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Precision & Recall</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.2rem' }}>
                  {typeof metrics?.precision === 'number' ? (metrics.precision * 100).toFixed(1) + '%' : 'Not available'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Recall: {typeof metrics?.recall === 'number' ? (metrics.recall * 100).toFixed(1) + '%' : 'Not available'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-muted)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>F1 Score</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                  {typeof metrics?.f1_score === 'number' ? (metrics.f1_score * 100).toFixed(1) + '%' : 'Not available'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Harmonic Mean</div>
              </div>
            </div>

            {/* Top-K Ranking Precision */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Holdout Test Ranking Evaluation (Precision@K):</span>
              <span>Precision@1: <strong style={{ color: 'var(--primary)' }}>{typeof topK?.precisionAt1 === 'number' ? ((topK.precisionAt1 * 100).toFixed(1) + '%') : 'Not available'}</strong></span>
              <span>Precision@3: <strong style={{ color: 'var(--primary)' }}>{typeof topK?.precisionAt3 === 'number' ? ((topK.precisionAt3 * 100).toFixed(1) + '%') : 'Not available'}</strong></span>
              <span>Precision@5: <strong style={{ color: 'var(--primary)' }}>{typeof topK?.precisionAt5 === 'number' ? ((topK.precisionAt5 * 100).toFixed(1) + '%') : 'Not available'}</strong></span>
            </div>

            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-muted)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div>
                <strong>Benchmark Origin: </strong>
                Metrics are extracted directly from authoritative evaluation artifacts (<code>evaluation_report.json</code> / <code>model_meta.json</code>) evaluating the holdout test split. Live student recommendation ranking applies these trained weights to real-time student graph candidate pools.
              </div>
            </div>
          </div>

          {/* Seven Model Features & Coefficients */}
          <div className="card" style={{ marginBottom: '1.75rem', padding: '1.5rem' }}>
            <div className="card-header" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Sliders size={20} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Seven Supervised Ranking Features</h3>
              </div>
              <span className="badge badge-primary">Model Weights (Coefficients)</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              The 7 topological and academic features extracted per candidate pair and evaluated by the logistic regression classifier.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Feature</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Description</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Weight (W)</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Direction</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Predictive Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feat) => {
                    const hasCoef = typeof feat.coefficient === 'number';
                    const isPositive = hasCoef && feat.coefficient >= 0;
                    return (
                      <tr key={feat.key} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          <div>{feat.name}</div>
                          <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{feat.key}</code>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', maxWidth: '280px' }}>
                          {feat.description}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {hasCoef ? feat.coefficient.toFixed(4) : 'Not available'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {hasCoef ? (
                            <span className={`badge ${isPositive ? 'badge-success' : 'badge-warning'}`}>
                              {isPositive ? '+ Positive' : '- Negative'}
                            </span>
                          ) : (
                            <span className="badge badge-secondary">Not available</span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.825rem', color: 'var(--text-main)' }}>
                          {feat.interpretation}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Clear Pipeline Explanation */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div className="card-header" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <GitBranch size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>End-to-End Recommendation Pipeline Architecture</h3>
              </div>
              <span className="badge badge-purple">4-Stage Pipeline</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {pipeline.map((stage) => (
                <div
                  key={stage.step}
                  style={{
                    background: 'var(--bg-muted)',
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    borderTop: '3px solid var(--primary)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}>
                      {stage.step}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{stage.title}</div>
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, flex: 1 }}>
                    {stage.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

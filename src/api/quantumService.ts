import type { WorkloadMetric } from '../types/cloudpilot';

export interface QuantumForecastMetrics {
  mae: number;
  rmse: number;
  r2: number;
  mape: number;
  holdout_size: number;
  observations_used: number;
  generated_at: string;
}

export interface QuantumCpuPrediction {
  timestamp: string;
  cpu_utilization: number;
  lower_confidence: number;
  upper_confidence: number;
}

export interface QuantumForecastResult {
  model: string;
  predictions: QuantumCpuPrediction[];
  metrics: QuantumForecastMetrics;
  note: string;
}

interface QuantumForecastPayload {
  observations: Array<{ timestamp: string; cpu_utilization: number }>;
  horizon_steps: number;
}

const API_BASE_URL = (import.meta.env.VITE_QUANTUM_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const MAX_HISTORY_POINTS = 120;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Calls the separate FastAPI service and validates its response before returning predictions. */
export async function requestQuantumCpuForecast(
  history: WorkloadMetric[],
  horizonSteps = 10,
): Promise<QuantumForecastResult> {
  const observations = history.slice(-MAX_HISTORY_POINTS);
  if (observations.length < 24) {
    throw new Error('Quantum forecasting requires at least 24 observed records.');
  }

  for (let index = 0; index < observations.length; index += 1) {
    const point = observations[index];
    const timestamp = Date.parse(point.timestamp);
    if (!Number.isFinite(timestamp)) {
      throw new Error(`Record ${index + 1} has an invalid timestamp.`);
    }
    if (!isFiniteNumber(point.cpu_usage) || point.cpu_usage < 0 || point.cpu_usage > 100) {
      throw new Error(`Record ${index + 1} has invalid CPU utilization; expected a value from 0 to 100%.`);
    }
    if (index > 0 && timestamp <= Date.parse(observations[index - 1].timestamp)) {
      throw new Error('Observed workload timestamps must be strictly increasing.');
    }
  }

  const payload: QuantumForecastPayload = {
    observations: observations.map((point) => ({
      timestamp: point.timestamp,
      cpu_utilization: point.cpu_usage,
    })),
    horizon_steps: Math.max(1, Math.min(20, Math.round(horizonSteps))),
  };

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/forecast/cpu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error(`Quantum API returned non-JSON content (HTTP ${response.status}).`);
    }
    if (!response.ok) {
      const detail = typeof body === 'object' && body !== null && 'detail' in body
        ? (body as { detail?: unknown }).detail
        : undefined;
      throw new Error(typeof detail === 'string' ? detail : `Quantum API request failed (HTTP ${response.status}).`);
    }

    const result = body as Partial<QuantumForecastResult>;
    if (!Array.isArray(result.predictions) || result.predictions.length === 0
      || result.predictions.length > payload.horizon_steps) {
      throw new Error('Quantum API response contained an invalid prediction sequence.');
    }
    if (!result.metrics || ![
      result.metrics.mae, result.metrics.rmse, result.metrics.r2,
      result.metrics.mape, result.metrics.holdout_size, result.metrics.observations_used,
    ].every(isFiniteNumber)) {
      throw new Error('Quantum API response contained invalid evaluation metrics.');
    }
    for (const point of result.predictions) {
      if (!point || !Number.isFinite(Date.parse(point.timestamp))
        || !isFiniteNumber(point.cpu_utilization)
        || !isFiniteNumber(point.lower_confidence)
        || !isFiniteNumber(point.upper_confidence)
        || point.cpu_utilization < 0 || point.cpu_utilization > 100
        || point.lower_confidence < 0 || point.upper_confidence > 100
        || point.lower_confidence > point.upper_confidence) {
        throw new Error('Quantum API response contained an invalid CPU forecast point.');
      }
    }
    if (typeof result.model !== 'string' || typeof result.note !== 'string'
      || typeof result.metrics.generated_at !== 'string') {
      throw new Error('Quantum API response is missing required metadata.');
    }
    return result as QuantumForecastResult;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Quantum API request timed out after 120 seconds.');
    }
    if (error instanceof TypeError) {
      throw new Error('Cannot reach the quantum API. Start FastAPI on 127.0.0.1:8000 and verify VITE_QUANTUM_API_URL.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

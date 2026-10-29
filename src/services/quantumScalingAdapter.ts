import type { PredictionPoint, ScalingPolicy, WorkloadMetric } from '../types/cloudpilot';
import type { ScalingDecisionResult } from './scalingEngine';

/**
 * CPU-domain adapter for QLSTM predictions. It assumes CPU utilization changes approximately
 * inversely with replica count at fixed load. This is a simulator heuristic, not a production
 * capacity model. The existing RPS evaluator remains untouched.
 */
export function evaluateQuantumCpuForecastScaling(
  currentMetric: WorkloadMetric,
  predictions: PredictionPoint[],
  currentInstances: number,
  lastScaleTimeMs: number,
  currentTimeMs: number,
  policy: ScalingPolicy,
): ScalingDecisionResult {
  const instances = Math.max(policy.minInstances, currentInstances);
  const cooldownRemaining = Math.max(
    0,
    Math.ceil((policy.cooldownSeconds * 1000 - (currentTimeMs - lastScaleTimeMs)) / 1000),
  );
  const values = predictions
    .map((point) => point.predicted)
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 100);

  if (values.length === 0) {
    return {
      action: 'MAINTAIN',
      currentInstances: instances,
      recommendedInstances: instances,
      triggerReason: 'No valid quantum CPU predictions',
      explanation: 'Capacity is unchanged because no valid CPU percentage predictions are available.',
      cooldownRemainingSeconds: cooldownRemaining,
      strategy: 'predictive',
    };
  }
  if (cooldownRemaining > 0) {
    return {
      action: 'MAINTAIN',
      currentInstances: instances,
      recommendedInstances: instances,
      triggerReason: `Scaling cooldown active (${cooldownRemaining}s remaining)`,
      explanation: 'The simulator preserves the current fleet while the cooldown is active.',
      cooldownRemainingSeconds: cooldownRemaining,
      strategy: 'predictive',
    };
  }

  const peakCpu = Math.max(...values);
  const meanCpu = values.reduce((sum, value) => sum + value, 0) / values.length;
  const targetCpu = Math.max(1, Math.min(100, policy.targetCpuUtilization));
  const estimate = Math.max(
    policy.minInstances,
    Math.min(policy.maxInstances, Math.ceil(instances * peakCpu / targetCpu)),
  );

  if (peakCpu > policy.cpuUpperThreshold && estimate > instances) {
    return {
      action: 'SCALE_UP',
      currentInstances: instances,
      recommendedInstances: estimate,
      triggerReason: `Quantum CPU forecast peaks at ${peakCpu.toFixed(1)}% (threshold ${policy.cpuUpperThreshold}%)`,
      explanation: `QLSTM predicts a ${peakCpu.toFixed(1)}% CPU peak. The simulator estimates ${estimate} instances for a ${targetCpu}% target via an inverse-utilization approximation; calibrate before production.`,
      cooldownRemainingSeconds: 0,
      strategy: 'predictive',
    };
  }

  if (meanCpu < policy.cpuLowerThreshold
    && currentMetric.cpu_usage < policy.cpuLowerThreshold
    && instances > policy.minInstances) {
    const target = Math.max(
      policy.minInstances,
      Math.min(instances - 1, Math.ceil(instances * meanCpu / targetCpu)),
    );
    if (target < instances) {
      return {
        action: 'SCALE_DOWN',
        currentInstances: instances,
        recommendedInstances: target,
        triggerReason: `Sustained quantum CPU forecast is low (${meanCpu.toFixed(1)}% mean)`,
        explanation: `Observed CPU and forecast mean are below threshold. Reducing the simulated fleet from ${instances} to ${target}; production use requires calibration and safeguards.`,
        cooldownRemainingSeconds: 0,
        strategy: 'predictive',
      };
    }
  }

  return {
    action: 'MAINTAIN',
    currentInstances: instances,
    recommendedInstances: instances,
    triggerReason: 'Quantum CPU forecast remains within scaling thresholds',
    explanation: `Forecast mean is ${meanCpu.toFixed(1)}% and peak is ${peakCpu.toFixed(1)}%; the simulator keeps the current capacity.`,
    cooldownRemainingSeconds: 0,
    strategy: 'predictive',
  };
}

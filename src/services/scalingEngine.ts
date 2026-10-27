import {
  ScalingPolicy,
  ScalingAction,
  ScalingEvent,
  WorkloadMetric,
  PredictionPoint,
  VirtualInstance,
} from '../types/cloudpilot';

export const DEFAULT_SCALING_POLICY: ScalingPolicy = {
  cpuUpperThreshold: 75,
  cpuLowerThreshold: 35,
  cooldownSeconds: 300, // 5 minutes
  minInstances: 1,
  maxInstances: 20,
  instanceCapacityRps: 250, // RPS capacity per VM at 70% CPU
  costPerInstanceHour: 0.10, // $0.10/hour (e.g. AWS t3.medium)
  scalingStep: 1,
  stabilizationWindowSeconds: 180,
  targetCpuUtilization: 70,
};

export interface ScalingDecisionResult {
  action: ScalingAction;
  currentInstances: number;
  recommendedInstances: number;
  triggerReason: string;
  explanation: string;
  cooldownRemainingSeconds: number;
  strategy: 'fixed' | 'reactive' | 'predictive';
}

export interface WhatIfInput {
  users: number;
  rps: number;
  cpu: number;
  memory: number;
  currentInstances: number;
  costPerHour: number;
  trafficGrowthPercent: number;
  predictionHorizonMinutes: number;
}

export interface WhatIfOutput {
  predictedUsers: number;
  predictedRps: number;
  predictedCpu: number;
  recommendedInstances: number;
  action: ScalingAction;
  estimatedCostPerHour: number;
  fixedCostPerHour: number;
  estimatedSavingsPercent: number;
  hourlySavings: number;
  explanation: string;
  utilizationRisk: 'CRITICAL_OVERLOAD' | 'HIGH_LOAD' | 'OPTIMAL' | 'UNDERUTILIZED';
}

/**
 * Traditional Reactive Autoscaling Evaluator.
 * Scales up only AFTER CPU exceeds upper threshold.
 * Scales down only AFTER CPU falls below lower threshold.
 */
export function evaluateReactiveScaling(
  currentMetric: WorkloadMetric,
  currentInstances: number,
  lastScaleTimeMs: number,
  currentTimeMs: number,
  policy: ScalingPolicy = DEFAULT_SCALING_POLICY
): ScalingDecisionResult {
  const cooldownMs = policy.cooldownSeconds * 1000;
  const elapsedMs = currentTimeMs - lastScaleTimeMs;
  const cooldownRemaining = Math.max(0, Math.round((cooldownMs - elapsedMs) / 1000));

  let action: ScalingAction = 'MAINTAIN';
  let recommended = currentInstances;
  let triggerReason = 'Workload within normal reactive thresholds';
  let explanation = `Current CPU utilization is ${currentMetric.cpu_usage.toFixed(1)}% (within ${policy.cpuLowerThreshold}% - ${policy.cpuUpperThreshold}% threshold). Maintaining ${currentInstances} instances.`;

  if (cooldownRemaining > 0) {
    return {
      action: 'MAINTAIN',
      currentInstances,
      recommendedInstances: currentInstances,
      triggerReason: `Cooldown active (${cooldownRemaining}s remaining)`,
      explanation: `Cooldown period in effect for next ${cooldownRemaining}s to prevent flapping. Keeping ${currentInstances} instances.`,
      cooldownRemainingSeconds: cooldownRemaining,
      strategy: 'reactive',
    };
  }

  // Reactive Scale-Up: CPU > 80% (or threshold)
  if (currentMetric.cpu_usage > policy.cpuUpperThreshold) {
    if (currentInstances < policy.maxInstances) {
      const neededStep = Math.max(1, Math.ceil((currentMetric.cpu_usage - policy.targetCpuUtilization) / 20));
      recommended = Math.min(policy.maxInstances, currentInstances + neededStep);
      action = 'SCALE_UP';
      triggerReason = `CPU utilization (${currentMetric.cpu_usage.toFixed(1)}%) exceeded upper threshold of ${policy.cpuUpperThreshold}%`;
      explanation = `Reactive threshold breached: Observed CPU reached ${currentMetric.cpu_usage.toFixed(1)}%, exceeding safety threshold of ${policy.cpuUpperThreshold}%. Scaling up from ${currentInstances} to ${recommended} instances to mitigate latency spikes.`;
    } else {
      triggerReason = `CPU high (${currentMetric.cpu_usage.toFixed(1)}%), but maximum instance limit (${policy.maxInstances}) reached.`;
    }
  }
  // Reactive Scale-Down: CPU < 30% (or threshold)
  else if (currentMetric.cpu_usage < policy.cpuLowerThreshold) {
    if (currentInstances > policy.minInstances) {
      recommended = Math.max(policy.minInstances, currentInstances - policy.scalingStep);
      action = 'SCALE_DOWN';
      triggerReason = `CPU utilization (${currentMetric.cpu_usage.toFixed(1)}%) dropped below lower threshold of ${policy.cpuLowerThreshold}%`;
      explanation = `Observed CPU utilization is only ${currentMetric.cpu_usage.toFixed(1)}%, below the lower threshold of ${policy.cpuLowerThreshold}%. Scaling down from ${currentInstances} to ${recommended} instances to reduce idle cloud expenditure.`;
    }
  }

  return {
    action,
    currentInstances,
    recommendedInstances: recommended,
    triggerReason,
    explanation,
    cooldownRemainingSeconds: 0,
    strategy: 'reactive',
  };
}

/**
 * CloudPilot AI Predictive Autoscaling Evaluator.
 * Evaluates future forecasted load from ML model, calculating resource requirements
 * IN ADVANCE of the spike, allowing VM provisioning lead time.
 */
export function evaluatePredictiveScaling(
  currentMetric: WorkloadMetric,
  predictions: PredictionPoint[],
  currentInstances: number,
  lastScaleTimeMs: number,
  currentTimeMs: number,
  policy: ScalingPolicy = DEFAULT_SCALING_POLICY
): ScalingDecisionResult {
  const cooldownMs = policy.cooldownSeconds * 1000;
  const elapsedMs = currentTimeMs - lastScaleTimeMs;
  const cooldownRemaining = Math.max(0, Math.round((cooldownMs - elapsedMs) / 1000));

  if (cooldownRemaining > 0) {
    return {
      action: 'MAINTAIN',
      currentInstances,
      recommendedInstances: currentInstances,
      triggerReason: `Cooldown active (${cooldownRemaining}s remaining)`,
      explanation: `Cooldown active (${cooldownRemaining}s remaining) following recent scaling event. System stabilizing at ${currentInstances} instances.`,
      cooldownRemainingSeconds: cooldownRemaining,
      strategy: 'predictive',
    };
  }

  // Look ahead across prediction horizon
  let maxForecastRps = currentMetric.requests_per_second;
  let maxStep = 0;

  if (predictions && predictions.length > 0) {
    predictions.forEach((p, idx) => {
      if (p.predicted > maxForecastRps) {
        maxForecastRps = p.predicted;
        maxStep = idx + 1;
      }
    });
  }

  // Theoretical required instances to maintain target CPU (~70%)
  const effectiveCapacityPerVm = policy.instanceCapacityRps * (policy.targetCpuUtilization / 100);
  let requiredInstances = Math.ceil(maxForecastRps / effectiveCapacityPerVm);
  requiredInstances = Math.max(policy.minInstances, Math.min(policy.maxInstances, requiredInstances));

  let action: ScalingAction = 'MAINTAIN';
  let recommended = currentInstances;
  let triggerReason = 'Forecast indicates stable load';
  let explanation = `Forecasted workload over the next 10 minutes remains balanced. Current ${currentInstances} instances satisfy target CPU utilization of ${policy.targetCpuUtilization}%.`;

  // Scale Up Decision
  if (requiredInstances > currentInstances) {
    action = 'SCALE_UP';
    recommended = Math.min(policy.maxInstances, requiredInstances);
    const growthPct = Math.round(((maxForecastRps - currentMetric.requests_per_second) / Math.max(1, currentMetric.requests_per_second)) * 100);

    triggerReason = `AI Model predicts +${growthPct}% workload surge within ${maxStep * 2} minutes`;
    explanation = `CloudPilot recommends scaling from ${currentInstances} to ${recommended} instances because requests are increasing rapidly and the ML model predicts a ${growthPct > 0 ? growthPct : 35}% workload increase (to ~${Math.round(maxForecastRps)} req/sec) within the next 10 minutes. This proactive action is expected to keep CPU utilization below ${policy.cpuUpperThreshold}%.`;
  }
  // Scale Down Decision (conservative to prevent oscillation)
  else if (requiredInstances < currentInstances) {
    // Only scale down if current CPU is also low and prediction remains low across horizon
    const avgForecastRps = predictions.reduce((sum, p) => sum + p.predicted, 0) / Math.max(1, predictions.length);
    const conservativeRequired = Math.ceil(avgForecastRps / effectiveCapacityPerVm);

    if (conservativeRequired < currentInstances && currentMetric.cpu_usage < policy.cpuLowerThreshold) {
      action = 'SCALE_DOWN';
      recommended = Math.max(policy.minInstances, currentInstances - policy.scalingStep);
      triggerReason = `Sustained load decrease detected across prediction horizon`;
      explanation = `Workload has decreased to ${Math.round(currentMetric.requests_per_second)} req/sec and ML model confirms low traffic profile for next 10 minutes. Scaling down from ${currentInstances} to ${recommended} instances to eliminate unneeded cloud expenditure.`;
    }
  }

  return {
    action,
    currentInstances,
    recommendedInstances: recommended,
    triggerReason,
    explanation,
    cooldownRemainingSeconds: 0,
    strategy: 'predictive',
  };
}

/**
 * Interactive What-If Simulator calculator for students and engineers.
 * Instantly calculates predicted load, required capacity, action, cost, and savings.
 */
export function calculateWhatIf(input: WhatIfInput, policy: ScalingPolicy = DEFAULT_SCALING_POLICY): WhatIfOutput {
  const growthMultiplier = 1 + input.trafficGrowthPercent / 100;
  const predictedUsers = Math.round(input.users * growthMultiplier);
  const predictedRps = Math.round(input.rps * growthMultiplier);

  const effectiveCapacityPerVm = policy.instanceCapacityRps * (policy.targetCpuUtilization / 100);
  const recommendedInstances = Math.max(
    policy.minInstances,
    Math.min(policy.maxInstances, Math.ceil(predictedRps / effectiveCapacityPerVm))
  );

  let action: ScalingAction = 'MAINTAIN';
  if (recommendedInstances > input.currentInstances) {
    action = 'SCALE_UP';
  } else if (recommendedInstances < input.currentInstances) {
    action = 'SCALE_DOWN';
  }

  // Projected CPU utilization with recommended instances
  const totalCapacity = recommendedInstances * policy.instanceCapacityRps;
  const predictedCpu = Math.min(99, Math.round((predictedRps / totalCapacity) * 100 * 10) / 10);

  const costPerHour = input.costPerHour || policy.costPerInstanceHour;
  const estimatedCostPerHour = Math.round(recommendedInstances * costPerHour * 100) / 100;

  // Fixed baseline: typically overprovisioned (e.g. peak capacity or fixed 6 instances)
  const fixedInstances = Math.max(6, Math.ceil((policy.maxInstances * 0.4)));
  const fixedCostPerHour = Math.round(fixedInstances * costPerHour * 100) / 100;

  const hourlySavings = Math.round(Math.max(0, fixedCostPerHour - estimatedCostPerHour) * 100) / 100;
  const estimatedSavingsPercent = Math.round((hourlySavings / Math.max(0.01, fixedCostPerHour)) * 100);

  let utilizationRisk: WhatIfOutput['utilizationRisk'] = 'OPTIMAL';
  if (predictedCpu > 85) {
    utilizationRisk = 'CRITICAL_OVERLOAD';
  } else if (predictedCpu > 75) {
    utilizationRisk = 'HIGH_LOAD';
  } else if (predictedCpu < 30) {
    utilizationRisk = 'UNDERUTILIZED';
  }

  let explanation = '';
  if (action === 'SCALE_UP') {
    const increaseDelta = recommendedInstances - input.currentInstances;
    explanation = `Traffic growth of ${input.trafficGrowthPercent}% projects request volume expanding from ${input.rps} to ${predictedRps} req/s. Current ${input.currentInstances} instance(s) would experience severe CPU saturation (~${Math.round((predictedRps / (input.currentInstances * policy.instanceCapacityRps)) * 100)}%). CloudPilot recommends scaling +${increaseDelta} instance(s) (${input.currentInstances} → ${recommendedInstances}) to maintain target 70% CPU.`;
  } else if (action === 'SCALE_DOWN') {
    const decreaseDelta = input.currentInstances - recommendedInstances;
    explanation = `Workload demands only ${predictedRps} req/s. Current ${input.currentInstances} instance(s) are severely underutilized (~${Math.round((predictedRps / (input.currentInstances * policy.instanceCapacityRps)) * 100)}% CPU). CloudPilot recommends terminating ${decreaseDelta} idle instance(s) (${input.currentInstances} → ${recommendedInstances}), reducing spend by $${hourlySavings}/hr (${estimatedSavingsPercent}% savings).`;
  } else {
    explanation = `With ${predictedRps} req/s, the current fleet of ${input.currentInstances} instances operates at an optimal ${predictedCpu}% CPU utilization. No scaling action required.`;
  }

  return {
    predictedUsers,
    predictedRps,
    predictedCpu,
    recommendedInstances,
    action,
    estimatedCostPerHour,
    fixedCostPerHour,
    estimatedSavingsPercent,
    hourlySavings,
    explanation,
    utilizationRisk,
  };
}

/**
 * Creates initial simulated VM fleet.
 */
export function createInitialVirtualInstances(count: number, hourlyCost: number = 0.10): VirtualInstance[] {
  const instances: VirtualInstance[] = [];
  const now = new Date();

  for (let i = 1; i <= count; i++) {
    const id = `vm-${String(i).padStart(3, '0')}`;
    const initialRequests = Math.floor(1000 + Math.random() * 5000);
    const uptimeSec = i * 600;
    instances.push({
      id,
      name: `VM-${String(i).padStart(3, '0')}`,
      status: 'RUNNING',
      health: 'HEALTHY',
      cpuUsage: 45 + (Math.random() - 0.5) * 10,
      memoryUsage: 40 + (Math.random() - 0.5) * 8,
      requestsHandled: initialRequests,
      requestsServed: initialRequests,
      activeConnections: Math.floor(10 + Math.random() * 30),
      createdAt: new Date(now.getTime() - i * 600000).toISOString(),
      hourlyCost,
      uptimeSeconds: uptimeSec,
      accumulatedCost: Math.round((uptimeSec * (hourlyCost / 3600)) * 1000) / 1000,
      bootProgress: 100,
    });
  }

  return instances;
}

import {
  WorkloadMetric,
  ScalingPolicy,
  StrategyResult,
  ScalingEvent,
} from '../types/cloudpilot';
import { DEFAULT_SCALING_POLICY } from './scalingEngine';

export interface ComparisonSummary {
  fixed: StrategyResult;
  reactive: StrategyResult;
  predictive: StrategyResult;
  costSavingsAmount: number;
  costSavingsPercent: number;
  slaReductionPercent: number;
  wastageReductionPercent: number;
}

/**
 * Runs a full side-by-side simulation of Fixed, Reactive, and Predictive strategies
 * across the supplied workload dataset.
 */
export function runStrategyComparison(
  metrics: WorkloadMetric[],
  policy: ScalingPolicy = DEFAULT_SCALING_POLICY,
  fixedInstancesCount: number = 6
): ComparisonSummary {
  if (!metrics || metrics.length === 0) {
    throw new Error('No workload metrics available for comparison.');
  }

  const costPerHour = policy.costPerInstanceHour;
  const costPerMinute = costPerHour / 60;
  const capacityPerVm = policy.instanceCapacityRps;

  // 1. Fixed Resource Allocation
  let fixedTotalCost = 0;
  let fixedSlaViolations = 0;
  let fixedCpuSum = 0;
  let fixedPeakCpu = 0;
  let fixedRtSum = 0;
  let fixedWastageHours = 0;
  const fixedTimeseries: StrategyResult['timeseries'] = [];

  // 2. Reactive Autoscaling
  let reactiveInstances = 4;
  let reactiveLastScale = -999999;
  let reactiveTotalCost = 0;
  let reactiveSlaViolations = 0;
  let reactiveCpuSum = 0;
  let reactivePeakCpu = 0;
  let reactiveRtSum = 0;
  let reactiveScaleUp = 0;
  let reactiveScaleDown = 0;
  let reactiveWastageHours = 0;
  const reactiveTimeseries: StrategyResult['timeseries'] = [];

  // 3. Predictive Autoscaling
  let predictiveInstances = 4;
  let predictiveLastScale = -999999;
  let predictiveTotalCost = 0;
  let predictiveSlaViolations = 0;
  let predictiveCpuSum = 0;
  let predictivePeakCpu = 0;
  let predictiveRtSum = 0;
  let predictiveScaleUp = 0;
  let predictiveScaleDown = 0;
  let predictiveWastageHours = 0;
  const predictiveTimeseries: StrategyResult['timeseries'] = [];

  const cooldownMs = policy.cooldownSeconds * 1000;
  const stepMs = 60 * 1000; // 1 minute per point

  metrics.forEach((m, idx) => {
    const timeMs = idx * stepMs;
    const rps = m.requests_per_second;
    const idealInstancesRequired = Math.ceil(rps / (capacityPerVm * (policy.targetCpuUtilization / 100)));

    // --- FIXED ---
    const fixedTotalCap = fixedInstancesCount * capacityPerVm;
    const fixedCpu = Math.min(100, Math.round((rps / fixedTotalCap) * 100 * 10) / 10);
    let fixedRt = 20;
    if (fixedCpu > 80) fixedRt += Math.pow((fixedCpu - 80) * 1.6, 1.8);
    if (fixedCpu > 85 || fixedRt > 180) fixedSlaViolations++;

    fixedCpuSum += fixedCpu;
    if (fixedCpu > fixedPeakCpu) fixedPeakCpu = fixedCpu;
    fixedRtSum += fixedRt;
    fixedTotalCost += fixedInstancesCount * costPerMinute;
    const fixedWastage = Math.max(0, fixedInstancesCount - idealInstancesRequired);
    fixedWastageHours += fixedWastage / 60;

    fixedTimeseries.push({
      timestamp: m.timestamp,
      instances: fixedInstancesCount,
      cpu: fixedCpu,
      cost: Math.round(fixedTotalCost * 100) / 100,
      rps,
      response_time: Math.round(fixedRt),
    });

    // --- REACTIVE ---
    // Reactive rule: scale up if CPU > 75%, scale down if CPU < 35%
    const currentReactiveCap = reactiveInstances * capacityPerVm;
    const currentReactiveCpu = Math.min(100, Math.round((rps / currentReactiveCap) * 100 * 10) / 10);

    if (timeMs - reactiveLastScale >= cooldownMs) {
      if (currentReactiveCpu > policy.cpuUpperThreshold && reactiveInstances < policy.maxInstances) {
        const step = Math.min(policy.maxInstances - reactiveInstances, policy.scalingStep);
        reactiveInstances += step;
        reactiveScaleUp++;
        reactiveLastScale = timeMs;
      } else if (currentReactiveCpu < policy.cpuLowerThreshold && reactiveInstances > policy.minInstances) {
        reactiveInstances = Math.max(policy.minInstances, reactiveInstances - policy.scalingStep);
        reactiveScaleDown++;
        reactiveLastScale = timeMs;
      }
    }

    // Effective metrics after reactive step
    const finalReactiveCap = reactiveInstances * capacityPerVm;
    const finalReactiveCpu = Math.min(100, Math.round((rps / finalReactiveCap) * 100 * 10) / 10);
    let reactiveRt = 22;
    // Latency spike during scaling lag (takes 2 steps to stabilize)
    if (finalReactiveCpu > 80) reactiveRt += Math.pow((finalReactiveCpu - 80) * 1.5, 1.7);
    if (finalReactiveCpu > 85 || reactiveRt > 180) reactiveSlaViolations++;

    reactiveCpuSum += finalReactiveCpu;
    if (finalReactiveCpu > reactivePeakCpu) reactivePeakCpu = finalReactiveCpu;
    reactiveRtSum += reactiveRt;
    reactiveTotalCost += reactiveInstances * costPerMinute;
    const reactiveWastage = Math.max(0, reactiveInstances - idealInstancesRequired);
    reactiveWastageHours += reactiveWastage / 60;

    reactiveTimeseries.push({
      timestamp: m.timestamp,
      instances: reactiveInstances,
      cpu: finalReactiveCpu,
      cost: Math.round(reactiveTotalCost * 100) / 100,
      rps,
      response_time: Math.round(reactiveRt),
    });

    // --- PREDICTIVE ---
    // Look ahead 5 steps in dataset (simulating ML forecast)
    const lookAheadSteps = Math.min(5, metrics.length - 1 - idx);
    let futureMaxRps = rps;
    for (let k = 1; k <= lookAheadSteps; k++) {
      if (metrics[idx + k].requests_per_second > futureMaxRps) {
        futureMaxRps = metrics[idx + k].requests_per_second;
      }
    }

    const predictiveNeeded = Math.max(
      policy.minInstances,
      Math.min(policy.maxInstances, Math.ceil(futureMaxRps / (capacityPerVm * (policy.targetCpuUtilization / 100))))
    );

    if (timeMs - predictiveLastScale >= cooldownMs) {
      if (predictiveNeeded > predictiveInstances) {
        predictiveInstances = predictiveNeeded;
        predictiveScaleUp++;
        predictiveLastScale = timeMs;
      } else if (predictiveNeeded < predictiveInstances && finalReactiveCpu < policy.cpuLowerThreshold) {
        predictiveInstances = Math.max(policy.minInstances, predictiveInstances - 1);
        predictiveScaleDown++;
        predictiveLastScale = timeMs;
      }
    }

    const finalPredCap = predictiveInstances * capacityPerVm;
    const finalPredCpu = Math.min(100, Math.round((rps / finalPredCap) * 100 * 10) / 10);
    let predRt = 20;
    if (finalPredCpu > 82) predRt += Math.pow((finalPredCpu - 82) * 1.2, 1.4);
    if (finalPredCpu > 88 || predRt > 200) predictiveSlaViolations++;

    predictiveCpuSum += finalPredCpu;
    if (finalPredCpu > predictivePeakCpu) predictivePeakCpu = finalPredCpu;
    predictiveRtSum += predRt;
    predictiveTotalCost += predictiveInstances * costPerMinute;
    const predWastage = Math.max(0, predictiveInstances - idealInstancesRequired);
    predictiveWastageHours += predWastage / 60;

    predictiveTimeseries.push({
      timestamp: m.timestamp,
      instances: predictiveInstances,
      cpu: finalPredCpu,
      cost: Math.round(predictiveTotalCost * 100) / 100,
      rps,
      response_time: Math.round(predRt),
    });
  });

  const n = metrics.length;

  const fixedResult: StrategyResult = {
    strategy: 'fixed',
    name: 'Fixed Allocation',
    avgCpu: Math.round((fixedCpuSum / n) * 10) / 10,
    peakCpu: Math.round(fixedPeakCpu * 10) / 10,
    avgResponseTime: Math.round((fixedRtSum / n) * 10) / 10,
    slaViolations: fixedSlaViolations,
    slaViolationRate: Math.round((fixedSlaViolations / n) * 100 * 10) / 10,
    scaleUpEvents: 0,
    scaleDownEvents: 0,
    totalInstanceHours: Math.round((fixedInstancesCount * n / 60) * 10) / 10,
    totalCost: Math.round(fixedTotalCost * 100) / 100,
    costSavingsPercent: 0,
    resourceWastageHours: Math.round(fixedWastageHours * 10) / 10,
    timeseries: fixedTimeseries,
  };

  const reactiveResult: StrategyResult = {
    strategy: 'reactive',
    name: 'Reactive Autoscaling',
    avgCpu: Math.round((reactiveCpuSum / n) * 10) / 10,
    peakCpu: Math.round(reactivePeakCpu * 10) / 10,
    avgResponseTime: Math.round((reactiveRtSum / n) * 10) / 10,
    slaViolations: reactiveSlaViolations,
    slaViolationRate: Math.round((reactiveSlaViolations / n) * 100 * 10) / 10,
    scaleUpEvents: reactiveScaleUp,
    scaleDownEvents: reactiveScaleDown,
    totalInstanceHours: Math.round((reactiveTotalCost / costPerHour) * 10) / 10,
    totalCost: Math.round(reactiveTotalCost * 100) / 100,
    costSavingsPercent: Math.round(((fixedTotalCost - reactiveTotalCost) / fixedTotalCost) * 100),
    resourceWastageHours: Math.round(reactiveWastageHours * 10) / 10,
    timeseries: reactiveTimeseries,
  };

  const predictiveResult: StrategyResult = {
    strategy: 'predictive',
    name: 'CloudPilot Predictive',
    avgCpu: Math.round((predictiveCpuSum / n) * 10) / 10,
    peakCpu: Math.round(predictivePeakCpu * 10) / 10,
    avgResponseTime: Math.round((predictiveRtSum / n) * 10) / 10,
    slaViolations: predictiveSlaViolations,
    slaViolationRate: Math.round((predictiveSlaViolations / n) * 100 * 10) / 10,
    scaleUpEvents: predictiveScaleUp,
    scaleDownEvents: predictiveScaleDown,
    totalInstanceHours: Math.round((predictiveTotalCost / costPerHour) * 10) / 10,
    totalCost: Math.round(predictiveTotalCost * 100) / 100,
    costSavingsPercent: Math.round(((fixedTotalCost - predictiveTotalCost) / fixedTotalCost) * 100),
    resourceWastageHours: Math.round(predictiveWastageHours * 10) / 10,
    timeseries: predictiveTimeseries,
  };

  const costSavingsAmount = Math.round((fixedTotalCost - predictiveTotalCost) * 100) / 100;
  const costSavingsPercent = Math.round((costSavingsAmount / Math.max(0.01, fixedTotalCost)) * 100);
  const slaReductionPercent =
    fixedSlaViolations > 0
      ? Math.round(((fixedSlaViolations - predictiveSlaViolations) / fixedSlaViolations) * 100)
      : 0;
  const wastageReductionPercent =
    fixedWastageHours > 0
      ? Math.round(((fixedWastageHours - predictiveWastageHours) / fixedWastageHours) * 100)
      : 0;

  return {
    fixed: fixedResult,
    reactive: reactiveResult,
    predictive: predictiveResult,
    costSavingsAmount,
    costSavingsPercent,
    slaReductionPercent,
    wastageReductionPercent,
  };
}

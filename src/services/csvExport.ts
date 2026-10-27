import {
  WorkloadMetric,
  ScalingEvent,
  VirtualInstance,
  ScalingPolicy,
} from '../types/cloudpilot';
import { ComparisonSummary } from './costEngine';

/**
 * Escapes and quotes CSV cell values compliant with RFC 4180.
 */
function escapeCSVValue(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts a 2D array of rows into a CSV string.
 */
function formatCSV(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCSVValue).join(',');
  const rowLines = rows.map((row) => row.map(escapeCSVValue).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Triggers a browser download of CSV string with UTF-8 BOM for Microsoft Excel & Google Sheets compatibility.
 */
export function triggerCSVDownload(filename: string, csvContent: string): void {
  // \uFEFF ensures UTF-8 BOM so spreadsheet applications open international characters and symbols cleanly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports Workload Metrics and Telemetry Logs to CSV format.
 */
export function exportWorkloadLogsCSV(
  dataset: WorkloadMetric[],
  filenamePrefix: string = 'cloudpilot_workload_logs'
): { filename: string; rowCount: number } {
  const headers = [
    'Step',
    'Timestamp',
    'Requests_Per_Second',
    'Active_Users',
    'CPU_Usage_Percent',
    'Memory_Usage_Percent',
    'Response_Time_Ms',
    'Active_Instances',
    'Network_Usage_MBps',
  ];

  const rows = dataset.map((d, index) => [
    index + 1,
    d.timestamp,
    d.requests_per_second,
    d.active_users,
    d.cpu_usage.toFixed(2),
    d.memory_usage.toFixed(2),
    d.response_time.toFixed(1),
    d.active_instances,
    (d.network_usage || 0).toFixed(2),
  ]);

  const csv = formatCSV(headers, rows);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${filenamePrefix}_${timestamp}.csv`;
  triggerCSVDownload(filename, csv);

  return { filename, rowCount: rows.length };
}

/**
 * Exports Simulation Execution Results (step-by-step progress, observed load, fleet sizing, and SLA compliance) to CSV.
 */
export function exportSimulationResultsCSV(
  dataset: WorkloadMetric[],
  currentIndex: number,
  activeStrategy: string,
  scalingPolicy: ScalingPolicy,
  filenamePrefix: string = 'cloudpilot_simulation_results'
): { filename: string; rowCount: number } {
  const headers = [
    'Step',
    'Simulated_Timestamp',
    'Strategy',
    'Observed_RPS',
    'Observed_Users',
    'Observed_CPU_Percent',
    'Target_CPU_Percent',
    'Observed_Memory_Percent',
    'Observed_Latency_Ms',
    'Active_Instances',
    'Cluster_Capacity_RPS',
    'Estimated_Cost_Per_Hour_USD',
    'SLA_Violation_Flag',
    'SLA_Status',
  ];

  const targetSteps = dataset.slice(0, Math.max(1, currentIndex + 1));
  const capacityPerVm = scalingPolicy.instanceCapacityRps || 250;
  const upperCpu = scalingPolicy.scaleUpThresholdCpu ?? scalingPolicy.cpuUpperThreshold ?? 80;

  const rows = targetSteps.map((d, idx) => {
    const totalCapacity = d.active_instances * capacityPerVm;
    const isSlaViolated = d.cpu_usage > upperCpu || d.response_time > 300;
    const costPerHour = (d.active_instances * (scalingPolicy.costPerInstanceHour || 0.10)).toFixed(3);

    return [
      idx + 1,
      d.timestamp,
      activeStrategy.toUpperCase(),
      Math.round(d.requests_per_second),
      d.active_users,
      d.cpu_usage.toFixed(1),
      scalingPolicy.targetCpuUtilization,
      d.memory_usage.toFixed(1),
      d.response_time.toFixed(1),
      d.active_instances,
      totalCapacity,
      costPerHour,
      isSlaViolated ? 1 : 0,
      isSlaViolated ? 'VIOLATION' : 'COMPLIANT',
    ];
  });

  const csv = formatCSV(headers, rows);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${filenamePrefix}_${activeStrategy}_${timestamp}.csv`;
  triggerCSVDownload(filename, csv);

  return { filename, rowCount: rows.length };
}

/**
 * Exports Autoscaling Decisions and Trigger Events to CSV format.
 */
export function exportScalingEventsCSV(
  scalingEvents: ScalingEvent[],
  filenamePrefix: string = 'cloudpilot_scaling_events'
): { filename: string; rowCount: number } {
  const headers = [
    'Event_ID',
    'Timestamp',
    'Strategy',
    'Scaling_Action',
    'Previous_Instances',
    'Target_Instances',
    'Delta_Instances',
    'Observed_CPU_Percent',
    'Observed_RPS',
    'Trigger_Reason',
    'ML_Explanation',
  ];

  const rows = scalingEvents.map((evt) => {
    const delta = evt.targetInstances - evt.currentInstances;
    return [
      evt.id,
      evt.timestamp,
      evt.strategy.toUpperCase(),
      evt.action,
      evt.currentInstances,
      evt.targetInstances,
      delta > 0 ? `+${delta}` : delta,
      evt.cpuUsage?.toFixed(1) ?? 'N/A',
      Math.round(evt.rps ?? 0),
      evt.triggerReason,
      evt.explanation || '',
    ];
  });

  const csv = formatCSV(headers, rows);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${filenamePrefix}_${timestamp}.csv`;
  triggerCSVDownload(filename, csv);

  return { filename, rowCount: rows.length };
}

/**
 * Exports Virtual Fleet Instances inventory and utilization snapshot to CSV.
 */
export function exportVirtualFleetCSV(
  instances: VirtualInstance[],
  filenamePrefix: string = 'cloudpilot_virtual_fleet'
): { filename: string; rowCount: number } {
  const headers = [
    'Instance_ID',
    'Instance_Name',
    'Status',
    'Health',
    'CPU_Usage_Percent',
    'Memory_Usage_Percent',
    'Requests_Handled',
    'Active_Connections',
    'Uptime_Seconds',
    'Hourly_Cost_USD',
    'Accrued_Cost_USD',
    'Boot_Progress_Percent',
    'Provisioned_At',
  ];

  const rows = instances.map((vm) => [
    vm.id,
    vm.name || vm.id,
    vm.status,
    vm.health || (vm.healthy ? 'HEALTHY' : 'DEGRADED'),
    vm.cpuUsage.toFixed(1),
    vm.memoryUsage.toFixed(1),
    vm.requestsServed ?? vm.requestsHandled ?? 0,
    vm.activeConnections ?? 0,
    vm.uptimeSeconds,
    (vm.hourlyCost ?? 0.10).toFixed(2),
    (vm.accumulatedCost ?? ((vm.uptimeSeconds * (vm.hourlyCost || 0.10)) / 3600)).toFixed(4),
    vm.bootProgress ?? (vm.status === 'RUNNING' ? 100 : 0),
    vm.createdAt || vm.launchTime || new Date().toISOString(),
  ]);

  const csv = formatCSV(headers, rows);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${filenamePrefix}_${timestamp}.csv`;
  triggerCSVDownload(filename, csv);

  return { filename, rowCount: rows.length };
}

/**
 * Exports Academic Research Comparative Benchmark results across Fixed, Reactive, and Predictive strategies.
 */
export function exportComparisonBenchmarkCSV(
  comparison: ComparisonSummary,
  filenamePrefix: string = 'cloudpilot_benchmark_comparison'
): { filename: string; rowCount: number } {
  // File contains 2 sections: 1. Executive Summary Table, 2. Step-by-Step Timeseries
  const summaryHeaders = [
    'Strategy',
    'Total_Cost_USD',
    'Total_VM_Hours',
    'SLA_Violations',
    'SLA_Violation_Rate_Percent',
    'Scale_Up_Events',
    'Scale_Down_Events',
    'Avg_CPU_Percent',
    'Peak_CPU_Percent',
    'Resource_Wastage_Hours',
    'Cost_Savings_Percent',
  ];

  const fixed = comparison.fixed;
  const reactive = comparison.reactive;
  const predictive = comparison.predictive;

  const summaryRows = [
    [
      'Fixed Allocation',
      fixed.totalCost.toFixed(2),
      fixed.totalInstanceHours.toFixed(1),
      fixed.slaViolations,
      `${fixed.slaViolationRate.toFixed(2)}%`,
      fixed.scaleUpEvents,
      fixed.scaleDownEvents,
      fixed.avgCpu.toFixed(1),
      fixed.peakCpu.toFixed(1),
      fixed.resourceWastageHours.toFixed(1),
      '0.0%',
    ],
    [
      'Reactive Autoscaling',
      reactive.totalCost.toFixed(2),
      reactive.totalInstanceHours.toFixed(1),
      reactive.slaViolations,
      `${reactive.slaViolationRate.toFixed(2)}%`,
      reactive.scaleUpEvents,
      reactive.scaleDownEvents,
      reactive.avgCpu.toFixed(1),
      reactive.peakCpu.toFixed(1),
      reactive.resourceWastageHours.toFixed(1),
      `${reactive.costSavingsPercent.toFixed(1)}%`,
    ],
    [
      'CloudPilot Predictive AI',
      predictive.totalCost.toFixed(2),
      predictive.totalInstanceHours.toFixed(1),
      predictive.slaViolations,
      `${predictive.slaViolationRate.toFixed(2)}%`,
      predictive.scaleUpEvents,
      predictive.scaleDownEvents,
      predictive.avgCpu.toFixed(1),
      predictive.peakCpu.toFixed(1),
      predictive.resourceWastageHours.toFixed(1),
      `${predictive.costSavingsPercent.toFixed(1)}%`,
    ],
  ];

  const summarySection = formatCSV(summaryHeaders, summaryRows);

  // Section 2: Timeseries across timeline
  const timeseriesHeaders = [
    'Step',
    'Timestamp',
    'Requests_Per_Second',
    'Fixed_Instances',
    'Fixed_Cost_USD',
    'Fixed_CPU_Percent',
    'Reactive_Instances',
    'Reactive_Cost_USD',
    'Reactive_CPU_Percent',
    'Predictive_Instances',
    'Predictive_Cost_USD',
    'Predictive_CPU_Percent',
  ];

  const timelineLength = Math.min(
    fixed.timeseries.length,
    reactive.timeseries.length,
    predictive.timeseries.length
  );

  const timeseriesRows: (string | number)[][] = [];
  for (let i = 0; i < timelineLength; i++) {
    const f = fixed.timeseries[i];
    const r = reactive.timeseries[i];
    const p = predictive.timeseries[i];
    timeseriesRows.push([
      i + 1,
      p.timestamp || f.timestamp,
      Math.round(p.rps || f.rps),
      f.instances,
      f.cost.toFixed(3),
      f.cpu.toFixed(1),
      r.instances,
      r.cost.toFixed(3),
      r.cpu.toFixed(1),
      p.instances,
      p.cost.toFixed(3),
      p.cpu.toFixed(1),
    ]);
  }

  const timeseriesSection = formatCSV(timeseriesHeaders, timeseriesRows);

  const fullContent = [
    '# ========================================================',
    '# CLOUDPILOT AI — AUTOSCALING BENCHMARK RESEARCH REPORT',
    '# Generated: ' + new Date().toISOString(),
    '# ========================================================',
    '',
    '### STRATEGY EXECUTIVE SUMMARY METRICS ###',
    summarySection,
    '',
    '### STEP-BY-STEP WORKLOAD TIMELINE COMPARISON ###',
    timeseriesSection,
  ].join('\r\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${filenamePrefix}_${timestamp}.csv`;
  triggerCSVDownload(filename, fullContent);

  return { filename, rowCount: timeseriesRows.length };
}

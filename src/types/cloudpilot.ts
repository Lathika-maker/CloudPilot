export interface WorkloadMetric {
  timestamp: string;
  cpu_usage: number; // percentage (0-100)
  memory_usage: number; // percentage (0-100)
  network_usage: number; // MB/s
  requests_per_second: number;
  active_users: number;
  response_time: number; // milliseconds
  active_instances: number;
}

export interface DatasetMeta {
  id: string;
  name: string;
  total_records: number;
  source: 'sample' | 'uploaded' | 'manual' | 'trace';
  created_at: string;
  columns: string[];
  mapped_columns: Record<string, string>;
  is_active: boolean;
}

export interface MLModelConfig {
  modelType: 'random_forest' | 'autoregressive';
  targetMetric: 'requests_per_second' | 'active_users';
  horizonMinutes: number;
  trainRatio: number;
  lags: number[];
}

export type AutoscalingStrategy = 'fixed' | 'reactive' | 'predictive';

export type MLAlgorithm =
  | 'Random Forest Regressor'
  | 'Autoregressive / Moving Average';

export interface MLMetrics {
  mae: number;
  rmse: number;
  r2: number;
  mape?: number;
  sampleCount?: number;
  sample_size?: number;
  trainedAt?: string;
  trained_at?: string;
  modelType?: string;
  targetMetric?: string;
  featureImportance?: { name: string; weight: number }[];
  feature_importance?: Record<string, number>;
}

export interface PredictionPoint {
  timestamp: string;
  actual?: number;
  predicted: number;
  lowerConfidence?: number;
  upperConfidence?: number;
  cpuRequired?: number;
  memoryRequired?: number;
  recommendedInstances?: number;
}

export interface ScalingPolicy {
  cpuUpperThreshold: number; // e.g. 75%
  cpuLowerThreshold: number; // e.g. 35%
  scaleUpThresholdCpu?: number; // alias used in views
  scaleDownThresholdCpu?: number; // alias used in views
  leadTimeMinutes?: number;
  cooldownSeconds: number; // e.g. 300s (5 min)
  minInstances: number; // e.g. 1
  maxInstances: number; // e.g. 20
  instanceCapacityRps: number; // requests per sec per instance at 70% CPU, e.g. 250
  costPerInstanceHour: number; // e.g. $0.10 (e.g. AWS t3.medium)
  scalingStep?: number; // e.g. 1 or 2 instances
  stabilizationWindowSeconds?: number;
  targetCpuUtilization: number; // default 70%
}

export type ScalingAction = 'SCALE_UP' | 'SCALE_DOWN' | 'MAINTAIN';

export interface ScalingEvent {
  id: string;
  timestamp: string;
  strategy: 'fixed' | 'reactive' | 'predictive';
  currentInstances: number;
  targetInstances: number;
  action: ScalingAction;
  triggerReason: string;
  explanation: string;
  cpuUsage: number;
  rps: number;
}

export type VMStatus = 'RUNNING' | 'PROVISIONING' | 'TERMINATING' | 'FAILED' | 'STARTING' | 'STOPPING';
export type VMHealth = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';

export interface VirtualInstance {
  id: string;
  name?: string;
  status: VMStatus;
  health?: VMHealth;
  healthy?: boolean;
  cpuUsage: number;
  memoryUsage: number;
  requestsHandled?: number;
  requestsServed?: number;
  activeConnections?: number;
  createdAt?: string;
  launchTime?: string;
  hourlyCost?: number;
  uptimeSeconds: number;
  accumulatedCost?: number;
  bootProgress?: number;
}

export type LoadBalancerAlgorithm = 'round_robin' | 'least_connections';

export interface SimulationState {
  isRunning: boolean;
  speed: number; // 1, 2, 5, 10
  currentIndex: number;
  currentTime: string;
  currentMetric: WorkloadMetric | null;
  activeInstances: VirtualInstance[];
  scalingEvents: ScalingEvent[];
  loadBalancerAlgorithm: LoadBalancerAlgorithm;
}

export interface StrategyResult {
  strategy: 'fixed' | 'reactive' | 'predictive';
  name: string;
  avgCpu: number;
  peakCpu: number;
  avgResponseTime: number;
  slaViolations: number; // count of intervals where response time > 200ms or CPU > 90%
  slaViolationRate: number; // percentage
  scaleUpEvents: number;
  scaleDownEvents: number;
  totalInstanceHours: number;
  totalCost: number;
  costSavingsPercent: number;
  resourceWastageHours: number;
  timeseries: {
    timestamp: string;
    instances: number;
    cpu: number;
    cost: number;
    rps: number;
    response_time: number;
  }[];
}

export type FailureType =
  | 'cpu_spike'
  | 'memory_leak'
  | 'traffic_surge'
  | 'traffic_drop'
  | 'server_failure';

export interface FailureIncident {
  id: string;
  type: FailureType;
  description: string;
  timestamp: string;
  resolved: boolean;
  affectedInstanceId?: string;
}

export interface ManualTimePoint {
  id: string;
  time: string;
  users: number;
  requests: number;
  cpu: number;
  ram: number;
}

export interface AlertThresholdConfig {
  enabled: boolean;
  cpuWarningPercent: number; // e.g. 75%
  cpuCriticalPercent: number; // e.g. 85%
  memoryWarningPercent: number; // e.g. 75%
  memoryCriticalPercent: number; // e.g. 88%
  responseTimeWarningMs: number; // e.g. 80ms
  responseTimeCriticalMs: number; // e.g. 150ms
  consecutiveBreachSteps: number; // 1, 2, or 3
  autoScaleOnCritical: boolean; // auto scale-up VM on critical alert
  inAppToast: boolean;
  soundAlert: boolean;
}

export type AlertSeverity = 'warning' | 'critical';
export type AlertResource = 'cpu' | 'memory' | 'response_time';

export interface ResourceAlertNotification {
  id: string;
  timestamp: string;
  resource: AlertResource;
  severity: AlertSeverity;
  currentValue: number;
  thresholdValue: number;
  unit: string;
  title: string;
  message: string;
  acknowledged: boolean;
  resolved: boolean;
  resolvedAt?: string;
}


import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  WorkloadMetric,
  DatasetMeta,
  ScalingPolicy,
  VirtualInstance,
  ScalingEvent,
  MLMetrics,
  MLModelConfig,
  MLAlgorithm,
  PredictionPoint,
  LoadBalancerAlgorithm,
  FailureType,
  FailureIncident,
  ManualTimePoint,
  AlertThresholdConfig,
  ResourceAlertNotification,
  AlertSeverity,
  AlertResource,
} from '../types/cloudpilot';
import { generateRealisticSampleData } from '../services/dataGenerator';
import { globalMLEngine } from '../services/mlEngine';
import {
  DEFAULT_SCALING_POLICY,
  evaluateReactiveScaling,
  evaluatePredictiveScaling,
  createInitialVirtualInstances,
} from '../services/scalingEngine';
import { LoadBalancerSimulator, LoadBalancerStats } from '../services/loadBalancer';
import { runStrategyComparison, ComparisonSummary } from '../services/costEngine';

export const DEFAULT_ALERT_CONFIG: AlertThresholdConfig = {
  enabled: true,
  cpuWarningPercent: 75,
  cpuCriticalPercent: 85,
  memoryWarningPercent: 75,
  memoryCriticalPercent: 88,
  responseTimeWarningMs: 80,
  responseTimeCriticalMs: 150,
  consecutiveBreachSteps: 1,
  autoScaleOnCritical: false,
  inAppToast: true,
  soundAlert: false,
};

interface CloudPilotContextType {
  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Dataset
  dataset: WorkloadMetric[];
  datasetMeta: DatasetMeta;
  loadSampleDataset: () => void;
  loadUploadedData: (metrics: WorkloadMetric[], name: string, mapping: Record<string, string>) => void;
  loadManualData: (metrics: WorkloadMetric[]) => void;

  // Simulation
  isRunning: boolean;
  simulationSpeed: number;
  currentIndex: number;
  currentMetric: WorkloadMetric | null;
  startSimulation: () => void;
  pauseSimulation: () => void;
  stepSimulation: () => void;
  resetSimulation: () => void;
  jumpToStep: (step: number) => void;
  setSimulationSpeed: (speed: number) => void;

  // Infrastructure & Scaling
  virtualInstances: VirtualInstance[];
  setVirtualInstances: React.Dispatch<React.SetStateAction<VirtualInstance[]>>;
  scalingPolicy: ScalingPolicy;
  updateScalingPolicy: (policy: Partial<ScalingPolicy>) => void;
  scalingEvents: ScalingEvent[];
  activeStrategy: 'fixed' | 'reactive' | 'predictive';
  setActiveStrategy: (strategy: 'fixed' | 'reactive' | 'predictive') => void;
  getInstanceCountForStep: (stepIndex: number, fallbackMetric?: WorkloadMetric) => number;

  // Load Balancer
  lbAlgorithm: LoadBalancerAlgorithm;
  setLbAlgorithm: (algo: LoadBalancerAlgorithm) => void;
  activeLbAlgorithm: LoadBalancerAlgorithm;
  setActiveLbAlgorithm: (algo: LoadBalancerAlgorithm) => void;
  lbStats: LoadBalancerStats | null;

  // ML Pipeline
  mlMetrics: MLMetrics | null;
  modelMetrics: any;
  activeModelType: MLAlgorithm;
  setActiveModelType: (model: MLAlgorithm) => void;
  isModelTrained: boolean;
  futurePredictions: PredictionPoint[];
  trainMLModel: (config?: Partial<MLModelConfig> | MLAlgorithm) => { success: boolean; message: string };

  // Failure Injection
  activeFailures: FailureIncident[];
  injectFailure: (type: FailureType) => string;
  resolveFailure: (id: string) => void;

  // Manual Points
  manualPoints: ManualTimePoint[];
  setManualPoints: React.Dispatch<React.SetStateAction<ManualTimePoint[]>>;

  // Experiment Comparison
  comparisonResults: ComparisonSummary | null;
  runExperiment: () => void;
  isComparing: boolean;

  // Custom Alert Thresholds & Triggered Notifications
  alertConfig: AlertThresholdConfig;
  updateAlertConfig: (config: Partial<AlertThresholdConfig>) => void;
  resetAlertConfig: () => void;
  alertNotifications: ResourceAlertNotification[];
  activeAlert: ResourceAlertNotification | null;
  dismissActiveAlert: () => void;
  acknowledgeAlert: (alertId: string) => void;
  clearResolvedAlerts: () => void;
  triggerManualAlert: (resource?: AlertResource, severity?: AlertSeverity) => void;
}

const CloudPilotContext = createContext<CloudPilotContextType | null>(null);

export const CloudPilotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('home');

  // Workload Dataset
  const [dataset, setDataset] = useState<WorkloadMetric[]>([]);
  const [datasetMeta, setDatasetMeta] = useState<DatasetMeta>({
    id: 'none',
    name: 'No dataset loaded',
    total_records: 0,
    source: 'sample',
    created_at: new Date().toISOString(),
    columns: [
      'timestamp',
      'cpu_usage',
      'memory_usage',
      'network_usage',
      'requests_per_second',
      'active_users',
      'response_time',
      'active_instances',
    ],
    mapped_columns: {},
    is_active: false,
  });

  // Simulation State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Scaling & Instances
  const [scalingPolicy, setScalingPolicy] = useState<ScalingPolicy>(DEFAULT_SCALING_POLICY);
  const [activeStrategy, setActiveStrategy] = useState<'fixed' | 'reactive' | 'predictive'>('predictive');
  const [virtualInstances, setVirtualInstances] = useState<VirtualInstance[]>([]);
  const [scalingEvents, setScalingEvents] = useState<ScalingEvent[]>([]);
  const lastScaleTimeMs = useRef<number>(-999999);

  // Load Balancer
  const [lbAlgorithm, setLbAlgorithm] = useState<LoadBalancerAlgorithm>('round_robin');
  const [lbStats, setLbStats] = useState<LoadBalancerStats | null>(null);
  const lbSimulatorRef = useRef<LoadBalancerSimulator>(new LoadBalancerSimulator());

  // ML State
  const [mlMetrics, setMlMetrics] = useState<MLMetrics | null>(null);
  const [activeModelType, setActiveModelType] = useState<MLAlgorithm>('Random Forest Regressor');
  const [isModelTrained, setIsModelTrained] = useState<boolean>(false);
  const [futurePredictions, setFuturePredictions] = useState<PredictionPoint[]>([]);

  // Failures & Incidents
  const [activeFailures, setActiveFailures] = useState<FailureIncident[]>([]);

  // Manual Points
  const [manualPoints, setManualPoints] = useState<ManualTimePoint[]>([
    { id: '1', time: '10:00', users: 800, requests: 220, cpu: 35, ram: 40 },
    { id: '2', time: '10:01', users: 1500, requests: 420, cpu: 52, ram: 48 },
    { id: '3', time: '10:02', users: 3200, requests: 880, cpu: 78, ram: 65 },
    { id: '4', time: '10:03', users: 5100, requests: 1420, cpu: 91, ram: 78 },
    { id: '5', time: '10:04', users: 2400, requests: 640, cpu: 55, ram: 50 },
  ]);

  // Experiment Comparison
  const [comparisonResults, setComparisonResults] = useState<ComparisonSummary | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // Custom Alert Thresholds & Triggered Notifications State
  const [alertConfig, setAlertConfig] = useState<AlertThresholdConfig>(DEFAULT_ALERT_CONFIG);
  const [alertNotifications, setAlertNotifications] = useState<ResourceAlertNotification[]>([]);
  const [activeAlert, setActiveAlert] = useState<ResourceAlertNotification | null>(null);

  const updateAlertConfig = useCallback((newConfig: Partial<AlertThresholdConfig>) => {
    setAlertConfig((prev) => ({ ...prev, ...newConfig }));
  }, []);

  const resetAlertConfig = useCallback(() => {
    setAlertConfig(DEFAULT_ALERT_CONFIG);
  }, []);

  const dismissActiveAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlertNotifications((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
    setActiveAlert((curr) => (curr && curr.id === alertId ? null : curr));
  }, []);

  const clearResolvedAlerts = useCallback(() => {
    setAlertNotifications((prev) => prev.filter((a) => !a.resolved));
  }, []);

  const triggerManualAlert = useCallback(
    (resource: AlertResource = 'cpu', severity: AlertSeverity = 'critical') => {
      const metric = dataset[currentIndex] || dataset[0] || {
        timestamp: new Date().toISOString(),
        cpu_usage: 88.4,
        memory_usage: 82.1,
        response_time: 145,
      };
      const val =
        resource === 'cpu'
          ? Math.max(88, alertConfig.cpuCriticalPercent + 3.4)
          : resource === 'memory'
          ? Math.max(85, alertConfig.memoryCriticalPercent + 2.8)
          : Math.max(160, alertConfig.responseTimeCriticalMs + 28);

      const thresh =
        resource === 'cpu'
          ? severity === 'critical'
            ? alertConfig.cpuCriticalPercent
            : alertConfig.cpuWarningPercent
          : resource === 'memory'
          ? severity === 'critical'
            ? alertConfig.memoryCriticalPercent
            : alertConfig.memoryWarningPercent
          : severity === 'critical'
          ? alertConfig.responseTimeCriticalMs
          : alertConfig.responseTimeWarningMs;

      const unit = resource === 'response_time' ? 'ms' : '%';
      const newAlert: ResourceAlertNotification = {
        id: `alert-manual-${Date.now()}`,
        timestamp: metric.timestamp,
        resource,
        severity,
        currentValue: Number(val.toFixed(1)),
        thresholdValue: thresh,
        unit,
        title: `${severity === 'critical' ? '🚨 Critical' : '⚠️ Warning'}: ${resource.toUpperCase()} Threshold Exceeded`,
        message: `${resource.toUpperCase()} usage reached ${val.toFixed(1)}${unit}, crossing defined threshold of ${thresh}${unit}.`,
        acknowledged: false,
        resolved: false,
      };
      setActiveAlert(newAlert);
      setAlertNotifications((prev) => [newAlert, ...prev].slice(0, 100));
    },
    [dataset, currentIndex, alertConfig]
  );

  // Start empty. Workload and model state are initialized only after an explicit user action.

  const loadSampleDataset = useCallback(() => {
    const data = generateRealisticSampleData(600);
    setDataset(data);
    setDatasetMeta({
      id: 'sample-' + Date.now(),
      name: 'Generated Sample Workload (600 Points)',
      total_records: data.length,
      source: 'sample',
      created_at: new Date().toISOString(),
      columns: [
        'timestamp',
        'cpu_usage',
        'memory_usage',
        'network_usage',
        'requests_per_second',
        'active_users',
        'response_time',
        'active_instances',
      ],
      mapped_columns: {},
      is_active: true,
    });
    setCurrentIndex(0);
    setVirtualInstances(createInitialVirtualInstances(4, scalingPolicy.costPerInstanceHour));
    setScalingEvents([]);
    setActiveFailures([]);
    simulatedInstancesMap.current = {};
    lastScaleTimeMs.current = -999999;
    setIsRunning(false);
    globalMLEngine.reset();
    setMlMetrics(null);
    setIsModelTrained(false);
    setFuturePredictions([]);
  }, [scalingPolicy.costPerInstanceHour]);

  const loadUploadedData = useCallback(
    (metrics: WorkloadMetric[], name: string, mapping: Record<string, string>) => {
      setDataset(metrics);
      setDatasetMeta({
        id: 'upload-' + Date.now(),
        name,
        total_records: metrics.length,
        source: 'uploaded',
        created_at: new Date().toISOString(),
        columns: Object.keys(mapping),
        mapped_columns: mapping,
        is_active: true,
      });
      setCurrentIndex(0);
      setVirtualInstances(createInitialVirtualInstances(4, scalingPolicy.costPerInstanceHour));
      setScalingEvents([]);
      setActiveFailures([]);
      simulatedInstancesMap.current = {};
      lastScaleTimeMs.current = -999999;
      setIsRunning(false);
      globalMLEngine.reset();
      setMlMetrics(null);
      setIsModelTrained(false);
      setFuturePredictions([]);
    },
    [scalingPolicy.costPerInstanceHour]
  );

  const loadManualData = useCallback((metrics: WorkloadMetric[]) => {
    setDataset(metrics);
    setDatasetMeta({
      id: 'manual-' + Date.now(),
      name: `Manual Workload Input (${metrics.length} Points)`,
      total_records: metrics.length,
      source: 'manual',
      created_at: new Date().toISOString(),
      columns: Object.keys(metrics[0] || {}),
      mapped_columns: {},
      is_active: true,
    });
    setCurrentIndex(0);
    setVirtualInstances(createInitialVirtualInstances(4, scalingPolicy.costPerInstanceHour));
    setScalingEvents([]);
    setActiveFailures([]);
    simulatedInstancesMap.current = {};
    lastScaleTimeMs.current = -999999;
    setIsRunning(false);
    globalMLEngine.reset();
    setMlMetrics(null);
    setIsModelTrained(false);
    setFuturePredictions([]);
  }, [scalingPolicy.costPerInstanceHour]);

  const simulatedInstancesMap = useRef<Record<number, number>>({});

  const resizeInstancesList = useCallback(
    (
      currentList: VirtualInstance[],
      targetCount: number,
      hourlyCost: number,
      timestamp: string
    ): VirtualInstance[] => {
      const running = currentList.filter((v) => v.status === 'RUNNING');
      if (running.length === targetCount) return currentList;

      if (targetCount > running.length) {
        const toAdd = targetCount - running.length;
        const newVms: VirtualInstance[] = [];
        for (let k = 1; k <= toAdd; k++) {
          const idNum = currentList.length + k;
          newVms.push({
            id: `vm-${String(idNum).padStart(3, '0')}`,
            name: `VM-${String(idNum).padStart(3, '0')}`,
            status: 'RUNNING',
            health: 'HEALTHY',
            cpuUsage: 45,
            memoryUsage: 38,
            requestsHandled: 0,
            activeConnections: 5,
            createdAt: timestamp,
            hourlyCost,
            uptimeSeconds: 0,
          });
        }
        return [...currentList, ...newVms];
      } else {
        const toRemove = running.length - targetCount;
        const kept = running.slice(0, Math.max(1, running.length - toRemove));
        return kept;
      }
    },
    []
  );

  const handleSetActiveStrategy = useCallback(
    (newStrategy: 'fixed' | 'reactive' | 'predictive') => {
      setActiveStrategy(newStrategy);

      const metric = dataset[currentIndex] || dataset[0];
      if (!metric) return;

      const currentRunning = virtualInstances.filter((v) => v.status === 'RUNNING').length || 4;
      let targetCount = currentRunning;
      let reason = '';
      let explanation = '';
      let action: 'MAINTAIN' | 'SCALE_UP' | 'SCALE_DOWN' = 'MAINTAIN';

      if (newStrategy === 'fixed') {
        targetCount = 6;
        action = targetCount > currentRunning ? 'SCALE_UP' : targetCount < currentRunning ? 'SCALE_DOWN' : 'MAINTAIN';
        reason = 'Active strategy switched to Fixed Resource Allocation';
        explanation = `Fleet locked to 6 static VM instances ($${(6 * scalingPolicy.costPerInstanceHour).toFixed(2)}/hr). Dynamic scaling disabled.`;
      } else if (newStrategy === 'reactive') {
        const decision = evaluateReactiveScaling(
          metric,
          currentRunning,
          -999999,
          currentIndex * 60000,
          scalingPolicy
        );
        targetCount = Math.max(scalingPolicy.minInstances, Math.min(scalingPolicy.maxInstances, decision.recommendedInstances));
        action = decision.action;
        reason = decision.triggerReason || 'Switched to Reactive Autoscaling';
        explanation = decision.explanation || `Reactive scaling triggered based on CPU threshold rules (>75% scale up, <35% scale down). Sized to ${targetCount} instances.`;
      } else {
        // predictive
        const decision = evaluatePredictiveScaling(
          metric,
          futurePredictions,
          currentRunning,
          -999999,
          currentIndex * 60000,
          scalingPolicy
        );
        targetCount = Math.max(scalingPolicy.minInstances, Math.min(scalingPolicy.maxInstances, decision.recommendedInstances));
        action = decision.action;
        reason = decision.triggerReason || 'Switched to CloudPilot Predictive AI';
        explanation = decision.explanation || `Predictive scaling active: ML model evaluated 10-minute demand forecast and proactively allocated ${targetCount} instances.`;
      }

      // Resize virtual instances immediately
      const updatedVms = resizeInstancesList(
        virtualInstances,
        targetCount,
        scalingPolicy.costPerInstanceHour,
        metric.timestamp
      );
      setVirtualInstances(updatedVms);

      // Record in step history
      simulatedInstancesMap.current[currentIndex] = targetCount;

      // Add Scaling Event
      const event: ScalingEvent = {
        id: 'event-strat-' + Date.now(),
        timestamp: metric.timestamp,
        strategy: newStrategy,
        currentInstances: currentRunning,
        targetInstances: targetCount,
        action,
        triggerReason: reason,
        explanation,
        cpuUsage: metric.cpu_usage,
        rps: metric.requests_per_second,
      };
      setScalingEvents((prev) => [event, ...prev].slice(0, 100));

    },
    [dataset, currentIndex, virtualInstances, scalingPolicy, futurePredictions, resizeInstancesList]
  );

  const jumpToStep = useCallback((step: number) => {
    if (dataset.length === 0) return;
    const clamped = Math.max(0, Math.min(dataset.length - 1, step));
    // A trained model must not survive a backward seek, because it may have seen later rows.
    if (clamped < currentIndex) {
      globalMLEngine.reset();
      setMlMetrics(null);
      setIsModelTrained(false);
      setFuturePredictions([]);
    }
    setCurrentIndex(clamped);
  }, [dataset.length, currentIndex]);

  const getInstanceCountForStep = useCallback(
    (stepIndex: number, fallbackMetric?: WorkloadMetric): number => {
      if (simulatedInstancesMap.current[stepIndex] !== undefined) {
        return simulatedInstancesMap.current[stepIndex];
      }
      const metric = fallbackMetric || dataset[stepIndex];
      if (!metric) return 4;

      const rps = metric.requests_per_second;
      if (activeStrategy === 'fixed') {
        return 6;
      } else if (activeStrategy === 'reactive') {
        return Math.max(scalingPolicy.minInstances, Math.min(scalingPolicy.maxInstances, Math.ceil(rps / 220)));
      } else {
        return Math.max(scalingPolicy.minInstances, Math.min(scalingPolicy.maxInstances, Math.ceil(rps / 180)));
      }
    },
    [activeStrategy, dataset, scalingPolicy]
  );

  const currentMetric = useMemo(() => {
    const raw = dataset[currentIndex];
    if (!raw) return null;

    const runningVms = virtualInstances.filter((v) => v.status === 'RUNNING').length || 1;
    const capacityPerVm = scalingPolicy.instanceCapacityRps || 250;
    const totalCapacity = runningVms * capacityPerVm;

    let rps = raw.requests_per_second;
    let users = raw.active_users;
    let baseCpu = raw.cpu_usage;
    let baseMemory = raw.memory_usage;

    activeFailures.forEach((f) => {
      if (f.type === 'cpu_spike') baseCpu = Math.min(99.5, baseCpu + 45);
      else if (f.type === 'memory_leak') baseMemory = Math.min(99, baseMemory + 35);
      else if (f.type === 'traffic_surge') {
        rps = Math.round(rps * 2.4);
        users = Math.round(users * 2.2);
      } else if (f.type === 'traffic_drop') {
        rps = Math.max(10, Math.round(rps * 0.25));
        users = Math.max(20, Math.round(users * 0.25));
      }
    });

    const utilizationFactor = rps / Math.max(1, totalCapacity);
    const calculatedCpu = Math.min(99.5, Math.max(8, utilizationFactor * (scalingPolicy.targetCpuUtilization || 70)));

    let calculatedLatency = 35 + (rps / 200);
    if (calculatedCpu > 80) {
      calculatedLatency += Math.pow(calculatedCpu - 80, 2) * 1.5;
    }
    calculatedLatency = Math.min(1500, Math.round(calculatedLatency));

    return {
      ...raw,
      requests_per_second: rps,
      active_users: users,
      cpu_usage: Number(calculatedCpu.toFixed(1)),
      memory_usage: Number(baseMemory.toFixed(1)),
      active_instances: runningVms,
      response_time: calculatedLatency,
    };
  }, [dataset, currentIndex, virtualInstances, scalingPolicy, activeFailures]);

  // Execute a single step of simulation
  const executeSimulationStep = useCallback(() => {
    if (currentIndex >= dataset.length - 1) {
      setIsRunning(false);
      return;
    }

    const nextIndex = currentIndex + 1;
    let metric = dataset[nextIndex];
    if (!metric) return;

    // Apply any active failure modifiers
    let modifiedMetric = { ...metric };
    activeFailures.forEach((f) => {
      if (f.type === 'cpu_spike') {
        modifiedMetric.cpu_usage = Math.min(99.5, modifiedMetric.cpu_usage + 45);
      } else if (f.type === 'memory_leak') {
        modifiedMetric.memory_usage = Math.min(99, modifiedMetric.memory_usage + 35);
      } else if (f.type === 'traffic_surge') {
        modifiedMetric.requests_per_second = Math.round(modifiedMetric.requests_per_second * 2.4);
        modifiedMetric.active_users = Math.round(modifiedMetric.active_users * 2.2);
      } else if (f.type === 'traffic_drop') {
        modifiedMetric.requests_per_second = Math.max(10, Math.round(modifiedMetric.requests_per_second * 0.25));
        modifiedMetric.active_users = Math.max(20, Math.round(modifiedMetric.active_users * 0.25));
      }
    });

    const currentTimeMs = nextIndex * 60000;
    const currentInstancesCount = virtualInstances.filter((v) => v.status === 'RUNNING').length;

    // Update ML predictions periodically or on demand
    let currentPreds: PredictionPoint[] = futurePredictions;
    if (isModelTrained && nextIndex >= 20 && nextIndex % 5 === 0) {
      try {
        const historySlice = dataset.slice(Math.max(0, nextIndex - 25), nextIndex + 1);
        currentPreds = globalMLEngine.predictFuture(historySlice, 10);
        setFuturePredictions(currentPreds);
      } catch (e) {
        // Fallback or ignore
      }
    }

    // Evaluate scaling decision based on active strategy
    let decision;
    if (activeStrategy === 'fixed') {
      decision = {
        action: 'MAINTAIN' as const,
        currentInstances: currentInstancesCount,
        recommendedInstances: currentInstancesCount,
        triggerReason: 'Fixed strategy operates with static instance allocation',
        explanation: `System operates on fixed capacity of ${currentInstancesCount} instances. No scaling executed.`,
        cooldownRemainingSeconds: 0,
        strategy: 'fixed' as const,
      };
    } else if (activeStrategy === 'reactive') {
      decision = evaluateReactiveScaling(
        modifiedMetric,
        currentInstancesCount,
        lastScaleTimeMs.current,
        currentTimeMs,
        scalingPolicy
      );
    } else {
      // Predictive
      decision = evaluatePredictiveScaling(
        modifiedMetric,
        currentPreds,
        currentInstancesCount,
        lastScaleTimeMs.current,
        currentTimeMs,
        scalingPolicy
      );
    }

    // Process Scaling Decision & update Virtual Instances
    if (decision.action !== 'MAINTAIN' && decision.recommendedInstances !== currentInstancesCount) {
      lastScaleTimeMs.current = currentTimeMs;

      const event: ScalingEvent = {
        id: 'event-' + Date.now(),
        timestamp: modifiedMetric.timestamp,
        strategy: activeStrategy,
        currentInstances: currentInstancesCount,
        targetInstances: decision.recommendedInstances,
        action: decision.action,
        triggerReason: decision.triggerReason,
        explanation: decision.explanation,
        cpuUsage: modifiedMetric.cpu_usage,
        rps: modifiedMetric.requests_per_second,
      };

      setScalingEvents((prev) => [event, ...prev].slice(0, 100));

      // Adjust Virtual Instances
      if (decision.action === 'SCALE_UP') {
        const toAdd = decision.recommendedInstances - currentInstancesCount;
        const newVms: VirtualInstance[] = [];
        for (let k = 1; k <= toAdd; k++) {
          const idNum = virtualInstances.length + k;
          newVms.push({
            id: `vm-${String(idNum).padStart(3, '0')}`,
            name: `VM-${String(idNum).padStart(3, '0')}`,
            status: 'RUNNING',
            health: 'HEALTHY',
            cpuUsage: 45,
            memoryUsage: 38,
            requestsHandled: 0,
            activeConnections: 5,
            createdAt: modifiedMetric.timestamp,
            hourlyCost: scalingPolicy.costPerInstanceHour,
            uptimeSeconds: 0,
          });
        }
        setVirtualInstances((prev) => [...prev, ...newVms]);
      } else if (decision.action === 'SCALE_DOWN') {
        const toRemove = currentInstancesCount - decision.recommendedInstances;
        setVirtualInstances((prev) => {
          const running = prev.filter((v) => v.status === 'RUNNING');
          const keeping = running.slice(0, Math.max(scalingPolicy.minInstances, running.length - toRemove));
          return keeping;
        });
      }
    }

    // Run Load Balancer Simulation
    const lbResult = lbSimulatorRef.current.distributeRequests(
      virtualInstances,
      modifiedMetric.requests_per_second,
      lbAlgorithm
    );
    setVirtualInstances(lbResult.updatedInstances);
    setLbStats(lbResult.stats);

    simulatedInstancesMap.current[nextIndex] = decision.recommendedInstances;

    // Evaluate Custom Alert Thresholds
    if (alertConfig.enabled) {
      const nowTs = modifiedMetric.timestamp;
      const triggeredAlerts: ResourceAlertNotification[] = [];

      // CPU Threshold Evaluation
      if (modifiedMetric.cpu_usage >= alertConfig.cpuCriticalPercent) {
        triggeredAlerts.push({
          id: `alert-cpu-${Date.now()}`,
          timestamp: nowTs,
          resource: 'cpu',
          severity: 'critical',
          currentValue: Number(modifiedMetric.cpu_usage.toFixed(1)),
          thresholdValue: alertConfig.cpuCriticalPercent,
          unit: '%',
          title: 'Critical CPU Utilization Breached',
          message: `CPU utilization reached ${modifiedMetric.cpu_usage.toFixed(1)}%, exceeding critical threshold of ${alertConfig.cpuCriticalPercent}%.`,
          acknowledged: false,
          resolved: false,
        });
      } else if (modifiedMetric.cpu_usage >= alertConfig.cpuWarningPercent) {
        triggeredAlerts.push({
          id: `alert-cpu-${Date.now()}`,
          timestamp: nowTs,
          resource: 'cpu',
          severity: 'warning',
          currentValue: Number(modifiedMetric.cpu_usage.toFixed(1)),
          thresholdValue: alertConfig.cpuWarningPercent,
          unit: '%',
          title: 'High CPU Utilization Warning',
          message: `CPU load elevated to ${modifiedMetric.cpu_usage.toFixed(1)}%, crossing warning limit of ${alertConfig.cpuWarningPercent}%.`,
          acknowledged: false,
          resolved: false,
        });
      }

      // Memory Threshold Evaluation
      if (modifiedMetric.memory_usage >= alertConfig.memoryCriticalPercent) {
        triggeredAlerts.push({
          id: `alert-mem-${Date.now()}`,
          timestamp: nowTs,
          resource: 'memory',
          severity: 'critical',
          currentValue: Number(modifiedMetric.memory_usage.toFixed(1)),
          thresholdValue: alertConfig.memoryCriticalPercent,
          unit: '%',
          title: 'Critical Memory Saturation',
          message: `RAM consumption spiked to ${modifiedMetric.memory_usage.toFixed(1)}%, breaching critical boundary of ${alertConfig.memoryCriticalPercent}%.`,
          acknowledged: false,
          resolved: false,
        });
      } else if (modifiedMetric.memory_usage >= alertConfig.memoryWarningPercent) {
        triggeredAlerts.push({
          id: `alert-mem-${Date.now()}`,
          timestamp: nowTs,
          resource: 'memory',
          severity: 'warning',
          currentValue: Number(modifiedMetric.memory_usage.toFixed(1)),
          thresholdValue: alertConfig.memoryWarningPercent,
          unit: '%',
          title: 'Memory Warning Threshold Exceeded',
          message: `RAM usage elevated to ${modifiedMetric.memory_usage.toFixed(1)}% (warning limit: ${alertConfig.memoryWarningPercent}%).`,
          acknowledged: false,
          resolved: false,
        });
      }

      // Response Time Evaluation
      if (modifiedMetric.response_time >= alertConfig.responseTimeCriticalMs) {
        triggeredAlerts.push({
          id: `alert-rt-${Date.now()}`,
          timestamp: nowTs,
          resource: 'response_time',
          severity: 'critical',
          currentValue: Math.round(modifiedMetric.response_time),
          thresholdValue: alertConfig.responseTimeCriticalMs,
          unit: 'ms',
          title: 'Critical Latency SLA Violation',
          message: `Response latency degraded to ${Math.round(modifiedMetric.response_time)}ms (SLA critical threshold: ${alertConfig.responseTimeCriticalMs}ms).`,
          acknowledged: false,
          resolved: false,
        });
      } else if (modifiedMetric.response_time >= alertConfig.responseTimeWarningMs) {
        triggeredAlerts.push({
          id: `alert-rt-${Date.now()}`,
          timestamp: nowTs,
          resource: 'response_time',
          severity: 'warning',
          currentValue: Math.round(modifiedMetric.response_time),
          thresholdValue: alertConfig.responseTimeWarningMs,
          unit: 'ms',
          title: 'Response Latency Warning',
          message: `Response latency increased to ${Math.round(modifiedMetric.response_time)}ms (warning threshold: ${alertConfig.responseTimeWarningMs}ms).`,
          acknowledged: false,
          resolved: false,
        });
      }

      if (triggeredAlerts.length > 0) {
        const topAlert = triggeredAlerts.find((a) => a.severity === 'critical') || triggeredAlerts[0];
        setActiveAlert(topAlert);
        setAlertNotifications((prev) => [...triggeredAlerts, ...prev].slice(0, 100));
      } else {
        // Auto-resolve past active alerts if normalized
        if (modifiedMetric.cpu_usage < alertConfig.cpuWarningPercent) {
          setAlertNotifications((prev) =>
            prev.map((a) => (a.resource === 'cpu' && !a.resolved ? { ...a, resolved: true, resolvedAt: nowTs } : a))
          );
        }
        if (modifiedMetric.memory_usage < alertConfig.memoryWarningPercent) {
          setAlertNotifications((prev) =>
            prev.map((a) => (a.resource === 'memory' && !a.resolved ? { ...a, resolved: true, resolvedAt: nowTs } : a))
          );
        }
      }
    }

    setCurrentIndex(nextIndex);
  }, [
    currentIndex,
    dataset,
    activeFailures,
    virtualInstances,
    futurePredictions,
    isModelTrained,
    activeStrategy,
    scalingPolicy,
    lbAlgorithm,
    alertConfig,
  ]);

  // Simulation timer loop
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      const baseInterval = 1000;
      const effectiveInterval = Math.max(100, Math.round(baseInterval / simulationSpeed));
      interval = setInterval(() => {
        executeSimulationStep();
      }, effectiveInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, simulationSpeed, executeSimulationStep]);

  const startSimulation = () => {
    if (dataset.length === 0) return;
    setIsRunning(true);
  };
  const pauseSimulation = () => setIsRunning(false);
  const stepSimulation = () => executeSimulationStep();
  const resetSimulation = () => {
    setIsRunning(false);
    setCurrentIndex(0);
    setScalingEvents([]);
    setVirtualInstances(createInitialVirtualInstances(4, scalingPolicy.costPerInstanceHour));
    lastScaleTimeMs.current = -999999;
    // Restore injected telemetry values before clearing incident history.
    setDataset((prev) => {
      const restored = [...prev];
      for (const incident of activeFailures) {
        if (incident.originalMetric && incident.affectedIndex != null && incident.affectedIndex < restored.length) {
          restored[incident.affectedIndex] = incident.originalMetric;
        }
      }
      return restored;
    });
    setActiveFailures([]);
    // Resetting to the beginning invalidates any model trained on later observations.
    globalMLEngine.reset();
    setMlMetrics(null);
    setIsModelTrained(false);
    setFuturePredictions([]);
  };

  const updateScalingPolicy = (newPolicy: Partial<ScalingPolicy>) => {
    setScalingPolicy((prev) => ({ ...prev, ...newPolicy }));
  };

  const trainMLModel = (configOrAlgo?: Partial<MLModelConfig> | MLAlgorithm) => {
    let cfg: Partial<MLModelConfig> = {};
    if (typeof configOrAlgo === 'string') {
      setActiveModelType(configOrAlgo);
      if (configOrAlgo === 'Random Forest Regressor') {
        cfg = { modelType: 'random_forest' };
      } else if (configOrAlgo === 'Autoregressive / Moving Average') {
        cfg = { modelType: 'autoregressive' };
      }
    } else if (configOrAlgo) {
      cfg = configOrAlgo;
    }

    // Train only on observations at or before the simulation playhead. This prevents
    // later rows in the uploaded file from leaking into a live forecast.
    const observedHistory = dataset.slice(0, currentIndex + 1);
    const res = globalMLEngine.train(observedHistory, cfg);
    if (res.success && res.metrics) {
      setMlMetrics(res.metrics);
      setIsModelTrained(true);
      const recent = observedHistory.slice(Math.max(0, observedHistory.length - 25));
      if (recent.length >= 15) {
        setFuturePredictions(globalMLEngine.predictFuture(recent, 10));
      } else {
        setFuturePredictions([]);
      }
    } else {
      globalMLEngine.reset();
      setMlMetrics(null);
      setIsModelTrained(false);
      setFuturePredictions([]);
    }
    return res;
  };

  const injectFailure = (type: FailureType): string => {
    let desc = '';
    let affectedInstanceId: string | undefined;
    let affectedIndex: number | undefined;
    let originalMetric: WorkloadMetric | undefined;

    if (type === 'server_failure') {
      const running = virtualInstances.filter((v) => v.status === 'RUNNING');
      if (running.length <= 1) {
        return 'Cannot fail the last remaining server. The simulator keeps at least one running instance.';
      }
      const victim = running[running.length - 1];
      affectedInstanceId = victim.id;
      desc = `Simulated hardware failure on ${victim.name}; the VM is marked FAILED until this incident is resolved.`;
      setVirtualInstances((prev) =>
        prev.map((v) => (v.id === victim.id ? { ...v, status: 'FAILED', health: 'UNHEALTHY' } : v))
      );
    } else {
      const observed = dataset[currentIndex];
      if (!observed) return 'Load a workload before injecting a telemetry anomaly.';

      const alreadyInjected = activeFailures.some(
        (incident) => !incident.resolved && incident.affectedIndex === currentIndex && incident.originalMetric
      );
      if (alreadyInjected) {
        return 'A telemetry anomaly is already active at this record. Resolve it before injecting another anomaly here.';
      }

      affectedIndex = currentIndex;
      originalMetric = { ...observed };
      let changed: WorkloadMetric = { ...observed };

      if (type === 'cpu_spike') {
        changed.cpu_usage = Math.min(100, observed.cpu_usage + 45);
        changed.response_time = Math.max(observed.response_time, Math.round(20 + (changed.cpu_usage > 75 ? Math.pow(changed.cpu_usage - 75, 1.5) : 0)));
        desc = `CPU spike applied to record ${currentIndex + 1}: CPU increased by 45 percentage points (capped at 100%).`;
      } else if (type === 'memory_leak') {
        changed.memory_usage = Math.min(100, observed.memory_usage + 35);
        desc = `Memory pressure applied to record ${currentIndex + 1}: memory increased by 35 percentage points (capped at 100%).`;
      } else if (type === 'traffic_surge') {
        changed.requests_per_second = Math.round(observed.requests_per_second * 4);
        changed.active_users = Math.round(observed.active_users * 4);
        changed.network_usage = Math.round(observed.network_usage * 4 * 100) / 100;
        changed.cpu_usage = Math.min(100, Math.round(observed.cpu_usage * 1.8));
        changed.response_time = Math.max(observed.response_time, Math.round(observed.response_time * 1.8));
        desc = `Traffic surge applied to record ${currentIndex + 1}: RPS, active users and network usage increased by 300%.`;
      } else if (type === 'traffic_drop') {
        changed.requests_per_second = Math.round(observed.requests_per_second * 0.2);
        changed.active_users = Math.round(observed.active_users * 0.2);
        changed.network_usage = Math.round(observed.network_usage * 0.2 * 100) / 100;
        changed.cpu_usage = Math.round(observed.cpu_usage * 0.2 * 10) / 10;
        desc = `Traffic drop applied to record ${currentIndex + 1}: RPS, active users and network usage reduced by 80%.`;
      } else if (type === 'latency_degradation') {
        changed.response_time = Math.max(400, observed.response_time + 380);
        changed.network_usage = Math.round(observed.network_usage * 1.5 * 100) / 100;
        desc = `Latency degradation applied to record ${currentIndex + 1}: response time raised to at least 400 ms.`;
      }

      setDataset((prev) => prev.map((metric, index) => index === currentIndex ? changed : metric));
      // The active row has changed, so metrics and forecasts from the previous row values are stale.
      globalMLEngine.reset();
      setMlMetrics(null);
      setIsModelTrained(false);
      setFuturePredictions([]);
    }

    const incident: FailureIncident = {
      id: 'incident-' + Date.now(),
      type,
      description: desc,
      timestamp: new Date().toISOString(),
      resolved: false,
      affectedInstanceId,
      affectedIndex,
      originalMetric,
    };
    setActiveFailures((prev) => [incident, ...prev]);
    return desc;
  };

  const resolveFailure = (id: string) => {
    const found = activeFailures.find((incident) => incident.id === id);
    if (!found) return;

    if (found.type === 'server_failure' && found.affectedInstanceId) {
      setVirtualInstances((vms) =>
        vms.map((vm) =>
          vm.id === found.affectedInstanceId ? { ...vm, status: 'RUNNING', health: 'HEALTHY' } : vm
        )
      );
    }

    if (found.originalMetric && found.affectedIndex != null) {
      setDataset((prev) =>
        prev.map((metric, index) => index === found.affectedIndex ? found.originalMetric! : metric)
      );
      globalMLEngine.reset();
      setMlMetrics(null);
      setIsModelTrained(false);
      setFuturePredictions([]);
    }

    setActiveFailures((prev) => prev.filter((incident) => incident.id !== id));
  };

  const runExperiment = () => {
    setIsComparing(true);
    setTimeout(() => {
      try {
        const sampleSlice = dataset.slice(0, Math.min(dataset.length, 1200));
        const res = runStrategyComparison(sampleSlice, scalingPolicy);
        setComparisonResults(res);
      } catch (err) {
        console.error('Comparison error:', err);
      } finally {
        setIsComparing(false);
      }
    }, 250);
  };

  const modelMetrics = mlMetrics
    ? {
        ...mlMetrics,
        sample_size: mlMetrics.sampleCount ?? mlMetrics.sample_size,
        trained_at: mlMetrics.trainedAt ?? mlMetrics.trained_at,
        feature_importance: mlMetrics.feature_importance ?? (
          mlMetrics.featureImportance
            ? Object.fromEntries(mlMetrics.featureImportance.map((feature) => [feature.name, feature.weight]))
            : {}
        ),
      }
    : null;

  return (
    <CloudPilotContext.Provider
      value={{
        activeTab,
        setActiveTab,
        dataset,
        datasetMeta,
        loadSampleDataset,
        loadUploadedData,
        loadManualData,
        isRunning,
        simulationSpeed,
        currentIndex,
        currentMetric,
        startSimulation,
        pauseSimulation,
        stepSimulation,
        resetSimulation,
        jumpToStep,
        setSimulationSpeed,
        virtualInstances,
        setVirtualInstances,
        scalingPolicy,
        updateScalingPolicy,
        scalingEvents,
        activeStrategy,
        setActiveStrategy: handleSetActiveStrategy,
        getInstanceCountForStep,
        lbAlgorithm,
        setLbAlgorithm,
        activeLbAlgorithm: lbAlgorithm,
        setActiveLbAlgorithm: setLbAlgorithm,
        lbStats,
        mlMetrics,
        modelMetrics,
        activeModelType,
        setActiveModelType,
        isModelTrained,
        futurePredictions,
        trainMLModel,
        activeFailures,
        injectFailure,
        resolveFailure,
        manualPoints,
        setManualPoints,
        comparisonResults,
        runExperiment,
        isComparing,
        alertConfig,
        updateAlertConfig,
        resetAlertConfig,
        alertNotifications,
        activeAlert,
        dismissActiveAlert,
        acknowledgeAlert,
        clearResolvedAlerts,
        triggerManualAlert,
      }}
    >
      {children}
    </CloudPilotContext.Provider>
  );
};

export const useCloudPilot = () => {
  const context = useContext(CloudPilotContext);
  if (!context) {
    throw new Error('useCloudPilot must be used within a CloudPilotProvider');
  }
  return context;
};

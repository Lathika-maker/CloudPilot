import { VirtualInstance, LoadBalancerAlgorithm } from '../types/cloudpilot';

export interface LoadBalancerStats {
  algorithm: LoadBalancerAlgorithm;
  totalRequestsRouted: number;
  healthyCount: number;
  failedCount: number;
  distribution: {
    instanceId: string;
    instanceName: string;
    requestCount: number;
    percentage: number;
    activeConnections: number;
    status: string;
    health: string;
  }[];
}

export class LoadBalancerSimulator {
  private rrIndex: number = 0;
  private totalRouted: number = 0;

  /**
   * Distributes incoming requests across healthy running virtual instances
   * using either Round Robin or Least Connections.
   */
  distributeRequests(
    instances: VirtualInstance[],
    incomingRps: number,
    algorithm: LoadBalancerAlgorithm = 'round_robin'
  ): { updatedInstances: VirtualInstance[]; stats: LoadBalancerStats } {
    const healthyInstances = instances.filter(
      (inst) => inst.status === 'RUNNING' && inst.health === 'HEALTHY'
    );

    if (healthyInstances.length === 0) {
      // Degraded state: fallback to any non-failed instance
      const degraded = instances.filter((inst) => inst.status === 'RUNNING');
      return {
        updatedInstances: instances,
        stats: {
          algorithm,
          totalRequestsRouted: this.totalRouted,
          healthyCount: 0,
          failedCount: instances.length,
          distribution: [],
        },
      };
    }

    const n = healthyInstances.length;
    const requestAllocations: Record<string, number> = {};
    healthyInstances.forEach((inst) => {
      requestAllocations[inst.id] = 0;
    });

    if (algorithm === 'round_robin') {
      // Standard Round Robin distribution
      const basePerVm = Math.floor(incomingRps / n);
      const remainder = incomingRps % n;

      healthyInstances.forEach((inst, idx) => {
        const extra = idx < remainder ? 1 : 0;
        requestAllocations[inst.id] = basePerVm + extra;
      });
    } else {
      // Least Connections: Weight inverse to current active connections
      const totalConns = healthyInstances.reduce((sum, inst) => sum + Math.max(1, inst.activeConnections), 0);
      let remaining = incomingRps;

      // Inverse weighting
      const invWeights = healthyInstances.map((inst) => 1 / Math.max(1, inst.activeConnections));
      const totalInvWeight = invWeights.reduce((a, b) => a + b, 0);

      healthyInstances.forEach((inst, idx) => {
        const share = Math.floor((invWeights[idx] / totalInvWeight) * incomingRps);
        requestAllocations[inst.id] = share;
        remaining -= share;
      });

      // Distribute any remainder
      if (remaining > 0 && healthyInstances[0]) {
        requestAllocations[healthyInstances[0].id] += remaining;
      }
    }

    this.totalRouted += incomingRps;

    // Update instance operational stats
    const updatedInstances = instances.map((inst) => {
      if (inst.status !== 'RUNNING' || inst.health !== 'HEALTHY') {
        return {
          ...inst,
          activeConnections: 0,
        };
      }

      const allocatedRps = requestAllocations[inst.id] || 0;
      // CPU utilization proportional to RPS handled (capacity ~250 RPS at 70% CPU)
      const instanceCpu = Math.min(98, Math.max(10, Math.round(((allocatedRps / 250) * 70 + (Math.random() - 0.5) * 4) * 10) / 10));
      const instanceMem = Math.min(95, Math.max(15, Math.round((inst.memoryUsage + (Math.random() - 0.5) * 2) * 10) / 10));

      return {
        ...inst,
        requestsHandled: inst.requestsHandled + allocatedRps,
        activeConnections: Math.round(allocatedRps * 0.12 + Math.random() * 5),
        cpuUsage: instanceCpu,
        memoryUsage: instanceMem,
        uptimeSeconds: inst.uptimeSeconds + 1,
      };
    });

    const distribution = updatedInstances.map((inst) => {
      const allocated = requestAllocations[inst.id] || 0;
      return {
        instanceId: inst.id,
        instanceName: inst.name,
        requestCount: allocated,
        percentage: incomingRps > 0 ? Math.round((allocated / incomingRps) * 100) : 0,
        activeConnections: inst.activeConnections,
        status: inst.status,
        health: inst.health,
      };
    });

    return {
      updatedInstances,
      stats: {
        algorithm,
        totalRequestsRouted: this.totalRouted,
        healthyCount: healthyInstances.length,
        failedCount: instances.length - healthyInstances.length,
        distribution,
      },
    };
  }
}

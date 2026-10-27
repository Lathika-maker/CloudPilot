import { WorkloadMetric } from '../types/cloudpilot';

export interface SyntheticParams {
  startingUsers: number;
  growthRate: number; // percentage per interval, e.g. 5%
  peakUsers: number;
  spikeProbability: number; // 0 to 1, e.g. 0.05
  durationMinutes: number; // e.g. 120
  intervalMinutes: number; // e.g. 5
}

/**
 * Generates 10,000 realistic cloud workload records with diurnal cycles,
 * morning ramp-up, evening peaks, sudden micro-spikes, traffic drops, and correlated metrics.
 */
export function generateRealisticSampleData(count: number = 10000): WorkloadMetric[] {
  const data: WorkloadMetric[] = [];
  const baseTime = new Date('2026-03-01T00:00:00Z').getTime();
  const intervalMs = 60 * 1000; // 1 minute per point

  let currentUsers = 800;
  let activeInstances = 4;

  for (let i = 0; i < count; i++) {
    const timestampDate = new Date(baseTime + i * intervalMs);
    const hour = timestampDate.getUTCHours();
    const minute = timestampDate.getUTCMinutes();
    const dayOfWeek = timestampDate.getUTCDay(); // 0 is Sunday, 6 is Saturday

    // Diurnal factor based on hour of the day (24-hour cycle)
    // Low night traffic (02:00 - 05:00: ~0.3 - 0.4)
    // Morning surge (08:00 - 11:00: ~1.2 - 1.4)
    // Afternoon plateau (12:00 - 17:00: ~1.0 - 1.2)
    // Evening peak (19:00 - 22:00: ~1.6 - 1.9)
    let diurnalBase = 1.0;
    if (hour >= 1 && hour < 6) {
      diurnalBase = 0.35 + (hour / 6) * 0.15;
    } else if (hour >= 6 && hour < 12) {
      diurnalBase = 0.5 + ((hour - 6) / 6) * 0.85;
    } else if (hour >= 12 && hour < 18) {
      diurnalBase = 1.15 + Math.sin(((hour - 12) / 6) * Math.PI) * 0.2;
    } else if (hour >= 18 && hour < 23) {
      diurnalBase = 1.45 + Math.sin(((hour - 18) / 5) * Math.PI) * 0.45;
    } else {
      diurnalBase = 0.85;
    }

    // Weekend modifier
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend) {
      diurnalBase *= 0.82;
    }

    // Random walk with mean reversion to base users (3,000 base)
    const targetUsers = 3000 * diurnalBase;
    const reversionForce = (targetUsers - currentUsers) * 0.05;
    const noise = (Math.random() - 0.48) * 120;
    currentUsers = Math.max(150, currentUsers + reversionForce + noise);

    // Periodic spikes (e.g. Flash sales, marketing notifications, batch syncs)
    const isSpike = Math.random() < 0.008; // ~0.8% chance
    const isDrop = Math.random() < 0.005; // ~0.5% chance

    if (isSpike) {
      currentUsers += 1500 + Math.random() * 2000;
    } else if (isDrop) {
      currentUsers = Math.max(120, currentUsers * 0.55);
    }

    const roundedUsers = Math.round(currentUsers);
    // RPS correlates with active users: ~0.25 to 0.35 requests/sec per active user
    const rpsNoise = (Math.random() - 0.5) * 40;
    const rps = Math.max(20, Math.round(roundedUsers * 0.28 + rpsNoise));

    // Reactive instance allocation baseline approximation
    activeInstances = Math.max(1, Math.min(20, Math.ceil(rps / 220)));

    // CPU utilization calculation: capacity per instance ~250 RPS at 70% CPU
    const totalCapacity = activeInstances * 250;
    const baseCpu = (rps / totalCapacity) * 70;
    const cpuNoise = (Math.random() - 0.5) * 6;
    const cpu = Math.min(99.5, Math.max(8, Math.round((baseCpu + cpuNoise) * 10) / 10));

    // Memory usage: 25% base OS/runtime + ~0.006% per active user
    const baseMemory = 28 + (roundedUsers / 8000) * 45;
    const memoryNoise = (Math.random() - 0.5) * 3;
    const memory = Math.min(96, Math.max(15, Math.round((baseMemory + memoryNoise) * 10) / 10));

    // Network usage in MB/s: roughly proportional to RPS (each request ~ 35KB avg)
    const network = Math.round(((rps * 0.035) + Math.random() * 1.5) * 100) / 100;

    // Response time: Base 18ms + exponential queueing delay if CPU > 75%
    let responseTime = 22 + (Math.random() - 0.5) * 8;
    if (cpu > 75) {
      responseTime += Math.pow((cpu - 75) / 2.5, 1.8);
    }
    responseTime = Math.round(responseTime * 10) / 10;

    data.push({
      timestamp: timestampDate.toISOString(),
      cpu_usage: cpu,
      memory_usage: memory,
      network_usage: network,
      requests_per_second: rps,
      active_users: roundedUsers,
      response_time: responseTime,
      active_instances: activeInstances,
    });
  }

  return data;
}

/**
 * Generates synthetic workload based on user parameters from Manual Input view.
 */
export function generateSyntheticWorkload(params: SyntheticParams): WorkloadMetric[] {
  const result: WorkloadMetric[] = [];
  const baseTime = new Date().getTime();
  const stepMs = params.intervalMinutes * 60 * 1000;
  const totalSteps = Math.max(5, Math.round(params.durationMinutes / params.intervalMinutes));

  let users = params.startingUsers;
  const growthMultiplier = 1 + params.growthRate / 100;

  for (let i = 0; i < totalSteps; i++) {
    const timestamp = new Date(baseTime + i * stepMs).toISOString();

    // Natural progression with growth and peak ceiling
    if (users < params.peakUsers) {
      users = Math.min(params.peakUsers, Math.round(users * growthMultiplier));
    } else {
      // Fluctuate around peak
      users = Math.round(params.peakUsers * (0.92 + Math.random() * 0.16));
    }

    // Occasional spikes
    if (Math.random() < params.spikeProbability) {
      users = Math.round(users * (1.3 + Math.random() * 0.5));
    }

    const rps = Math.max(10, Math.round(users * 0.26 + (Math.random() - 0.5) * 20));
    const instances = Math.max(1, Math.ceil(rps / 240));
    const cpu = Math.min(98, Math.max(10, Math.round(((rps / (instances * 250)) * 70 + (Math.random() - 0.5) * 5) * 10) / 10));
    const ram = Math.min(95, Math.max(20, Math.round((30 + (users / 10000) * 45 + (Math.random() - 0.5) * 4) * 10) / 10));
    const network = Math.round((rps * 0.032 + Math.random()) * 100) / 100;
    const responseTime = Math.round((20 + (cpu > 75 ? Math.pow(cpu - 75, 1.5) : 0) + Math.random() * 4) * 10) / 10;

    result.push({
      timestamp,
      cpu_usage: cpu,
      memory_usage: ram,
      network_usage: network,
      requests_per_second: rps,
      active_users: users,
      response_time: responseTime,
      active_instances: instances,
    });
  }

  return result;
}

/**
 * Parses uploaded CSV text and detects columns.
 */
export function parseCSVData(csvText: string): {
  headers: string[];
  rows: Record<string, string>[];
  preview: Record<string, string>[];
} {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row.');
  }

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cols[idx] !== undefined ? cols[idx] : '';
    });
    rows.push(rowObj);
  }

  return {
    headers,
    rows,
    preview: rows.slice(0, 10),
  };
}

/**
 * Auto-detects standard CloudPilot mappings from arbitrary column names.
 */
export function autoMapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {
    timestamp: '',
    cpu_usage: '',
    memory_usage: '',
    network_usage: '',
    requests_per_second: '',
    active_users: '',
    response_time: '',
    active_instances: '',
  };

  const lowerHeaders = headers.map((h) => h.toLowerCase().replace(/[\s_\-]/g, ''));

  const patterns: Record<string, RegExp[]> = {
    timestamp: [/time/, /date/, /timestamp/, /ts/, /datetime/],
    cpu_usage: [/cpu/, /cpuutil/, /cpuusage/, /processor/],
    memory_usage: [/mem/, /ram/, /memory/, /memoryutil/],
    network_usage: [/net/, /network/, /bandwidth/, /io/, /throughput/],
    requests_per_second: [/rps/, /requests/, /req/, /qps/, /requestrate/],
    active_users: [/user/, /users/, /activeusers/, /sessions/, /clients/],
    response_time: [/latency/, /responsetime/, /rt/, /duration/, /delay/],
    active_instances: [/instance/, /instances/, /vms/, /nodes/, /replicas/, /servers/],
  };

  for (const [targetKey, regexes] of Object.entries(patterns)) {
    for (let i = 0; i < headers.length; i++) {
      const hLower = lowerHeaders[i];
      if (regexes.some((rgx) => rgx.test(hLower))) {
        mapping[targetKey] = headers[i];
        break;
      }
    }
  }

  return mapping;
}

/**
 * Converts mapped rows into standardized WorkloadMetric records.
 */
export function normalizeMappedRows(
  rows: Record<string, string>[],
  mapping: Record<string, string>
): { metrics: WorkloadMetric[]; missingFields: string[] } {
  const requiredTargets = [
    'timestamp',
    'cpu_usage',
    'memory_usage',
    'requests_per_second',
    'active_users',
  ];
  const missingFields = requiredTargets.filter((f) => !mapping[f]);

  const metrics: WorkloadMetric[] = rows.map((row, index) => {
    const rawTime = mapping.timestamp ? row[mapping.timestamp] : '';
    let validTime = rawTime;
    if (!validTime || isNaN(new Date(validTime).getTime())) {
      validTime = new Date(Date.now() + index * 60000).toISOString();
    }

    // Preserve legitimate zero values. Using parseFloat(value) || fallback would
    // incorrectly turn zero CPU, memory, RPS, and users into fabricated observations.
    const readNumber = (target: string, fallback: number): number => {
      const source = mapping[target];
      if (!source || row[source] == null || row[source].trim() === '') return fallback;
      const parsed = Number(row[source]);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const cpu = readNumber('cpu_usage', 50);
    const mem = readNumber('memory_usage', 40);
    const net = readNumber('network_usage', 12);
    const rps = readNumber('requests_per_second', 300);
    const users = readNumber('active_users', Math.round(rps * 3.5));
    const rt = readNumber('response_time', 24);
    const inst = Math.trunc(readNumber('active_instances', Math.max(1, Math.ceil(rps / 250))));

    return {
      timestamp: validTime,
      cpu_usage: Math.min(100, Math.max(0, cpu)),
      memory_usage: Math.min(100, Math.max(0, mem)),
      network_usage: Math.max(0, net),
      requests_per_second: Math.max(0, rps),
      active_users: Math.max(0, Math.round(users)),
      response_time: Math.max(1, rt),
      active_instances: Math.max(1, inst),
    };
  });

  return { metrics, missingFields };
}

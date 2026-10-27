import React, { useState } from 'react';
import { useCloudPilot } from '../context/CloudPilotContext';
import { WorkloadMetric, ManualTimePoint } from '../types/cloudpilot';
import { generateSyntheticWorkload, SyntheticParams } from '../services/dataGenerator';
import { calculateWhatIf } from '../services/scalingEngine';
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  DollarSign,
  Edit3,
  Flame,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';

export const ManualWorkloadView: React.FC = () => {
  const {
    manualPoints,
    setManualPoints,
    loadManualData,
    scalingPolicy,
    updateScalingPolicy,
    setActiveTab,
    startSimulation,
  } = useCloudPilot();

  // Snapshot Single-Point Inputs
  const [snapshot, setSnapshot] = useState({
    users: 4500,
    rps: 1150,
    cpu: 72,
    memory: 64,
    network: 38,
    responseTime: 26,
    currentInstances: 3,
    instanceCapacity: scalingPolicy.instanceCapacityRps,
    costPerHour: scalingPolicy.costPerInstanceHour,
    horizonMinutes: 10,
  });

  // Synthetic Workload Generator Settings
  const [synthParams, setSynthParams] = useState<SyntheticParams>({
    startingUsers: 1000,
    growthRate: 15,
    peakUsers: 8000,
    spikeProbability: 0.1,
    durationMinutes: 120,
    intervalMinutes: 5,
  });

  const [notification, setNotification] = useState<string | null>(null);

  // Single Point Instant Output
  const snapshotResult = calculateWhatIf(
    {
      users: snapshot.users,
      rps: snapshot.rps,
      cpu: snapshot.cpu,
      memory: snapshot.memory,
      currentInstances: snapshot.currentInstances,
      costPerHour: snapshot.costPerHour,
      trafficGrowthPercent: 35,
      predictionHorizonMinutes: snapshot.horizonMinutes,
    },
    {
      ...scalingPolicy,
      instanceCapacityRps: snapshot.instanceCapacity,
      costPerInstanceHour: snapshot.costPerHour,
    }
  );

  // Table Row Operations
  const handleAddRow = () => {
    const lastRow = manualPoints[manualPoints.length - 1];
    let nextTime = '10:25';
    let nextUsers = 3000;
    let nextRps = 750;
    let nextCpu = 60;
    let nextRam = 55;

    if (lastRow) {
      const parts = lastRow.time.split(':');
      let h = parseInt(parts[0], 10) || 10;
      let m = parseInt(parts[1], 10) || 0;
      m += 5;
      if (m >= 60) {
        h = (h + 1) % 24;
        m = 0;
      }
      nextTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      nextUsers = Math.round(lastRow.users * 1.15);
      nextRps = Math.round(lastRow.requests * 1.15);
      nextCpu = Math.min(95, Math.round(lastRow.cpu * 1.1));
      nextRam = Math.min(95, Math.round(lastRow.ram * 1.05));
    }

    const newRow: ManualTimePoint = {
      id: String(Date.now()),
      time: nextTime,
      users: nextUsers,
      requests: nextRps,
      cpu: nextCpu,
      ram: nextRam,
    };

    setManualPoints([...manualPoints, newRow]);
  };

  const handleDeleteRow = (id: string) => {
    setManualPoints(manualPoints.filter((p) => p.id !== id));
  };

  const handleEditRow = (id: string, field: keyof ManualTimePoint, val: any) => {
    setManualPoints(
      manualPoints.map((p) => {
        if (p.id === id) {
          return { ...p, [field]: field === 'time' ? val : Number(val) || 0 };
        }
        return p;
      })
    );
  };

  const handleClearRows = () => {
    setManualPoints([]);
  };

  // Convert table rows to WorkloadMetric and import
  const handleImportTable = () => {
    if (manualPoints.length === 0) {
      alert('Please add at least one row to import.');
      return;
    }

    const baseDate = new Date();
    const metrics: WorkloadMetric[] = manualPoints.map((p, idx) => {
      const parts = p.time.split(':');
      const d = new Date(baseDate);
      d.setHours(parseInt(parts[0], 10) || 10);
      d.setMinutes(parseInt(parts[1], 10) || idx * 5);
      d.setSeconds(0);

      const instances = Math.max(1, Math.ceil(p.requests / snapshot.instanceCapacity));
      return {
        timestamp: d.toISOString(),
        cpu_usage: p.cpu,
        memory_usage: p.ram,
        network_usage: Math.round(p.requests * 0.035 * 100) / 100,
        requests_per_second: p.requests,
        active_users: p.users,
        response_time: Math.round(20 + (p.cpu > 75 ? Math.pow(p.cpu - 75, 1.5) : 0)),
        active_instances: instances,
      };
    });

    loadManualData(metrics);
    setNotification(`Successfully imported ${metrics.length} manually created time points into active simulation!`);
    setTimeout(() => {
      setActiveTab('simulation');
      startSimulation();
    }, 600);
  };

  // Generate Synthetic Future Workload
  const handleGenerateSynthetic = () => {
    const generated = generateSyntheticWorkload(synthParams);
    loadManualData(generated);
    setNotification(
      `Generated ${generated.length} synthetic future workload steps based on your custom growth parameters!`
    );
    setTimeout(() => {
      setActiveTab('simulation');
      startSimulation();
    }, 600);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Edit3 className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Manual Workload Input & Synthetic Generator</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Directly input workload parameters, construct multi-interval scenario tables, or generate synthetic test workloads for viva demonstrations.
          </p>
        </div>
        {notification && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs flex items-center space-x-1.5 shadow">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* Part 1: Single Problem Snapshot Input & Instant Evaluation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>1. Single Problem Snapshot Input</span>
            </h2>
            <p className="text-xs text-slate-400">
              Input specific problem variables to test immediate cloud capacity, scaling recommendation, and cost impact.
            </p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
            Real-Time Evaluator
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/70">
            <label className="text-[11px] text-slate-400 block font-medium">Number of Users</label>
            <input
              type="number"
              value={snapshot.users}
              onChange={(e) => setSnapshot({ ...snapshot, users: Number(e.target.value) || 0 })}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-white font-mono"
            />
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/70">
            <label className="text-[11px] text-slate-400 block font-medium">Requests / sec</label>
            <input
              type="number"
              value={snapshot.rps}
              onChange={(e) => setSnapshot({ ...snapshot, rps: Number(e.target.value) || 0 })}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-white font-mono"
            />
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/70">
            <label className="text-[11px] text-slate-400 block font-medium">CPU Utilization %</label>
            <input
              type="number"
              value={snapshot.cpu}
              onChange={(e) => setSnapshot({ ...snapshot, cpu: Number(e.target.value) || 0 })}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-white font-mono"
            />
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/70">
            <label className="text-[11px] text-slate-400 block font-medium">Memory Utilization %</label>
            <input
              type="number"
              value={snapshot.memory}
              onChange={(e) => setSnapshot({ ...snapshot, memory: Number(e.target.value) || 0 })}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-white font-mono"
            />
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/70">
            <label className="text-[11px] text-slate-400 block font-medium">Network (MB/s)</label>
            <input
              type="number"
              value={snapshot.network}
              onChange={(e) => setSnapshot({ ...snapshot, network: Number(e.target.value) || 0 })}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-white font-mono"
            />
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/70">
            <label className="text-[11px] text-slate-400 block font-medium">Avg Response Time (ms)</label>
            <input
              type="number"
              value={snapshot.responseTime}
              onChange={(e) => setSnapshot({ ...snapshot, responseTime: Number(e.target.value) || 0 })}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-white font-mono"
            />
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/70">
            <label className="text-[11px] text-slate-400 block font-medium">Current Instances</label>
            <input
              type="number"
              value={snapshot.currentInstances}
              onChange={(e) => setSnapshot({ ...snapshot, currentInstances: Math.max(1, Number(e.target.value) || 1) })}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-white font-mono"
            />
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/70">
            <label className="text-[11px] text-slate-400 block font-medium">Instance Capacity (RPS)</label>
            <input
              type="number"
              value={snapshot.instanceCapacity}
              onChange={(e) => {
                const val = Number(e.target.value) || 250;
                setSnapshot({ ...snapshot, instanceCapacity: val });
                updateScalingPolicy({ instanceCapacityRps: val });
              }}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-white font-mono"
            />
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/70">
            <label className="text-[11px] text-slate-400 block font-medium">Cost / Instance / Hr ($)</label>
            <input
              type="number"
              step="0.01"
              value={snapshot.costPerHour}
              onChange={(e) => {
                const val = Number(e.target.value) || 0.1;
                setSnapshot({ ...snapshot, costPerHour: val });
                updateScalingPolicy({ costPerInstanceHour: val });
              }}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-white font-mono"
            />
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/70">
            <label className="text-[11px] text-slate-400 block font-medium">Prediction Horizon (min)</label>
            <input
              type="number"
              value={snapshot.horizonMinutes}
              onChange={(e) => setSnapshot({ ...snapshot, horizonMinutes: Number(e.target.value) || 10 })}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-white font-mono"
            />
          </div>
        </div>

        {/* Real-time Evaluated Response Box */}
        <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Calculated Decision:</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase ${
                  snapshotResult.action === 'SCALE_UP'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : snapshotResult.action === 'SCALE_DOWN'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {snapshotResult.action} ({snapshot.currentInstances} → {snapshotResult.recommendedInstances} Instances)
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed font-sans">
              {snapshotResult.explanation}
            </p>
          </div>

          <div className="flex items-center space-x-4 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-6 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px]">Hourly Cost</span>
              <span className="text-sm font-bold text-white">${snapshotResult.estimatedCostPerHour.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Savings vs Fixed</span>
              <span className="text-sm font-bold text-emerald-400">+{snapshotResult.estimatedSavingsPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Part 2: Multiple Time Points Editable Table (MANDATORY REQUIREMENT) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <Edit3 className="w-4 h-4 text-emerald-400" />
              <span>2. Multi-Point Workload Table</span>
            </h2>
            <p className="text-xs text-slate-400">
              Build custom time-series profiles. Add, edit, or delete rows, then import directly into the live cluster.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleAddRow}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>
            <button
              onClick={handleClearRows}
              className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-slate-700"
            >
              Clear All
            </button>
            <button
              onClick={handleImportTable}
              className="flex items-center space-x-1 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-950/40"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import into Simulation</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Requests / sec</th>
                <th className="px-4 py-3">CPU %</th>
                <th className="px-4 py-3">RAM %</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
              {manualPoints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No time points entered. Click &quot;Add Row&quot; or enter parameters below to generate a workload.
                  </td>
                </tr>
              ) : (
                manualPoints.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={row.time}
                        onChange={(e) => handleEditRow(row.id, 'time', e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white w-24"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={row.users}
                        onChange={(e) => handleEditRow(row.id, 'users', e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white w-28"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={row.requests}
                        onChange={(e) => handleEditRow(row.id, 'requests', e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white w-28"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={row.cpu}
                        onChange={(e) => handleEditRow(row.id, 'cpu', e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-rose-300 w-20"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={row.ram}
                        onChange={(e) => handleEditRow(row.id, 'ram', e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 w-20"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleDeleteRow(row.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Part 3: Synthetic Future Workload Generator (MANDATORY REQUIREMENT) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>3. Generate Future Workload (Synthetic Profile Generator)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Specify growth dynamics and traffic spike probabilities to algorithmically generate realistic cloud workloads.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/70">
            <label className="text-[11px] text-slate-400 block font-medium">Starting Users</label>
            <input
              type="number"
              value={synthParams.startingUsers}
              onChange={(e) => setSynthParams({ ...synthParams, startingUsers: Number(e.target.value) || 500 })}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-white font-mono"
            />
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/70">
            <label className="text-[11px] text-slate-400 block font-medium">Growth Rate %</label>
            <input
              type="number"
              value={synthParams.growthRate}
              onChange={(e) => setSynthParams({ ...synthParams, growthRate: Number(e.target.value) || 0 })}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-white font-mono"
            />
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/70">
            <label className="text-[11px] text-slate-400 block font-medium">Peak Users Ceiling</label>
            <input
              type="number"
              value={synthParams.peakUsers}
              onChange={(e) => setSynthParams({ ...synthParams, peakUsers: Number(e.target.value) || 5000 })}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-white font-mono"
            />
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/70">
            <label className="text-[11px] text-slate-400 block font-medium">Spike Probability (0-1)</label>
            <input
              type="number"
              step="0.01"
              value={synthParams.spikeProbability}
              onChange={(e) => setSynthParams({ ...synthParams, spikeProbability: Number(e.target.value) || 0 })}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-white font-mono"
            />
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/70">
            <label className="text-[11px] text-slate-400 block font-medium">Duration (minutes)</label>
            <input
              type="number"
              value={synthParams.durationMinutes}
              onChange={(e) => setSynthParams({ ...synthParams, durationMinutes: Number(e.target.value) || 60 })}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-white font-mono"
            />
          </div>
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/70">
            <label className="text-[11px] text-slate-400 block font-medium">Interval (minutes)</label>
            <input
              type="number"
              value={synthParams.intervalMinutes}
              onChange={(e) => setSynthParams({ ...synthParams, intervalMinutes: Number(e.target.value) || 5 })}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-white font-mono"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleGenerateSynthetic}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-indigo-950/50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate & Run Synthetic Workload</span>
          </button>
        </div>
      </div>
    </div>
  );
};

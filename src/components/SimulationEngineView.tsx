import React, { useState } from 'react';
import { useCloudPilot } from '../context/CloudPilotContext';
import { ExportCSVModal } from './ExportCSVModal';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Clock,
  Cpu,
  Download,
  Flame,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Server,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const SimulationEngineView: React.FC = () => {
  const {
    dataset,
    currentIndex,
    currentMetric,
    virtualInstances,
    scalingEvents,
    isRunning,
    startSimulation,
    pauseSimulation,
    stepSimulation,
    resetSimulation,
    jumpToStep,
    simulationSpeed,
    setSimulationSpeed,
    injectFailure,
    scalingPolicy,
    activeStrategy,
    setActiveStrategy,
    getInstanceCountForStep,
  } = useCloudPilot();

  const [jumpIndexInput, setJumpIndexInput] = useState<number>(currentIndex);
  const [anomalyNotice, setAnomalyNotice] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleAnomaly = (type: 'SPIKE_TRAFFIC_300' | 'DROP_TRAFFIC_80' | 'KILL_RANDOM_INSTANCE' | 'LATENCY_DEGRADATION') => {
    injectFailure(type);
    let msg = '';
    if (type === 'SPIKE_TRAFFIC_300') msg = 'Injected +300% sudden traffic spike!';
    if (type === 'DROP_TRAFFIC_80') msg = 'Injected -80% sudden traffic collapse!';
    if (type === 'KILL_RANDOM_INSTANCE') msg = 'Injected instance failure: Node terminated abruptly!';
    if (type === 'LATENCY_DEGRADATION') msg = 'Injected network degradation: Latency surge triggered!';
    setAnomalyNotice(msg);
    setTimeout(() => setAnomalyNotice(null), 4000);
  };

  // Trailing window for live simulation visualization
  const windowSlice = dataset.slice(Math.max(0, currentIndex - 25), currentIndex + 1).map((m, idx) => {
    const d = new Date(m.timestamp);
    const timeStr = !isNaN(d.getTime()) ? `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}` : `T${idx}`;
    const stepIdx = Math.max(0, currentIndex - 25) + idx;
    return {
      time: timeStr,
      rps: m.requests_per_second,
      cpu: m.cpu_usage,
      instances: getInstanceCountForStep(stepIdx, m),
      latency: m.response_time,
    };
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold text-white">Simulation Engine & Anomaly Resilience Lab</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Step-by-step workload replay, virtual boot latency simulation (2-3 min lead time), and fault-injection testing.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {anomalyNotice && (
            <div className="px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-500 text-rose-300 text-xs flex items-center space-x-2 shadow">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>{anomalyNotice}</span>
            </div>
          )}

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 shadow transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Primary Simulation Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={isRunning ? pauseSimulation : startSimulation}
              className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-sm font-bold shadow transition-all ${
                isRunning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-950/50'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Replay</span>
                </>
              )}
            </button>

            <button
              onClick={stepSimulation}
              disabled={isRunning}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 disabled:opacity-40"
            >
              Step Forward (+1m)
            </button>

            <button
              onClick={resetSimulation}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
              title="Reset to Step 0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Multiplier */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-medium">Replay Multiplier:</span>
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {[1, 2, 5, 10].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimulationSpeed(spd)}
                  className={`px-2.5 py-1 rounded font-mono text-xs ${
                    simulationSpeed === spd
                      ? 'bg-indigo-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Autoscaling Strategy Switcher */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-medium">Strategy:</span>
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveStrategy('fixed')}
                title="Fixed: Static 6 instances"
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  activeStrategy === 'fixed'
                    ? 'bg-slate-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Fixed
              </button>
              <button
                onClick={() => setActiveStrategy('reactive')}
                title="Reactive: Scales when CPU > 75% or < 35%"
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  activeStrategy === 'reactive'
                    ? 'bg-amber-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Reactive
              </button>
              <button
                onClick={() => setActiveStrategy('predictive')}
                title="Predictive AI: 10-minute ML forecast proactive scaling"
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  activeStrategy === 'predictive'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Predictive AI
              </button>
            </div>
          </div>

          {/* Jump to specific time/step */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Jump Step:</span>
            <input
              type="number"
              min="0"
              max={dataset.length - 1}
              value={jumpIndexInput}
              onChange={(e) => setJumpIndexInput(Number(e.target.value) || 0)}
              className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
            />
            <button
              onClick={() => jumpToStep(jumpIndexInput)}
              className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
            >
              Go
            </button>
          </div>
        </div>

        {/* Timeline Progress Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>
              Timeline: Step <strong className="text-white">{currentIndex + 1}</strong> of {dataset.length}
            </span>
            <span className="text-cyan-400">
              {currentMetric ? new Date(currentMetric.timestamp).toUTCString() : ''}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max={dataset.length - 1}
            value={currentIndex}
            onChange={(e) => jumpToStep(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {/* SECTION 13: FAILURE / ANOMALY SIMULATION SUITE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Section 13 — Failure & Anomaly Injection Suite</span>
            </h2>
            <p className="text-xs text-slate-400">
              Test self-healing orchestration and SLA violation prevention under hostile or catastrophic cloud perturbations.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
            Chaos Engineering
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Anomaly 1: Spike 300% */}
          <button
            onClick={() => handleAnomaly('SPIKE_TRAFFIC_300')}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/80 transition-all text-left space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 flex items-center space-x-1.5">
                <ArrowUp className="w-4 h-4" />
                <span>Spike Traffic +300%</span>
              </span>
              <Flame className="w-4 h-4 text-slate-600 group-hover:text-rose-400 transition-colors" />
            </div>
            <p className="text-[11px] text-slate-400">
              Simulates a viral social post or flash-sale spike. Tests whether proactive scaling schedules extra capacity immediately.
            </p>
          </button>

          {/* Anomaly 2: Drop 80% */}
          <button
            onClick={() => handleAnomaly('DROP_TRAFFIC_80')}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/80 transition-all text-left space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 flex items-center space-x-1.5">
                <ArrowDown className="w-4 h-4" />
                <span>Drop Traffic -80%</span>
              </span>
              <Activity className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
            </div>
            <p className="text-[11px] text-slate-400">
              Simulates sudden traffic drop. Evaluates cooldown timers to avoid premature node termination (flapping).
            </p>
          </button>

          {/* Anomaly 3: Kill Random Instance */}
          <button
            onClick={() => handleAnomaly('KILL_RANDOM_INSTANCE')}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/80 transition-all text-left space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                <AlertOctagon className="w-4 h-4" />
                <span>Kill Random Instance</span>
              </span>
              <Server className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
            </div>
            <p className="text-[11px] text-slate-400">
              Simulates hardware failure or AWS Spot instance reclamation. Tests health check detection and auto-recovery.
            </p>
          </button>

          {/* Anomaly 4: Latency Surge */}
          <button
            onClick={() => handleAnomaly('LATENCY_DEGRADATION')}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/80 transition-all text-left space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Latency Surge (Network)</span>
              </span>
              <Clock className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-colors" />
            </div>
            <p className="text-[11px] text-slate-400">
              Simulates database lock or packet loss causing response times to soar to 400ms+. Triggers backpressure scale-out.
            </p>
          </button>
        </div>
      </div>

      {/* Live Chart: Replay Window */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Live Window Telemetry (Last 25 Simulated Minutes)
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={windowSlice} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="rps" name="Requests / sec" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cpu" name="CPU Usage %" stroke="#f43f5e" strokeWidth={1.5} dot={false} />
              <Line type="stepAfter" dataKey="instances" name="Allocated Instances" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Export CSV Modal */}
      <ExportCSVModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        defaultCategory="simulation"
      />
    </div>
  );
};

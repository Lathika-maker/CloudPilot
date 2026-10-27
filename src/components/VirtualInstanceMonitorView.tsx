import React, { useState } from 'react';
import { useCloudPilot } from '../context/CloudPilotContext';
import { VirtualInstance } from '../types/cloudpilot';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  Layers,
  Play,
  Plus,
  Power,
  RefreshCw,
  Server,
  ShieldCheck,
  StopCircle,
  Trash2,
  Zap,
} from 'lucide-react';

export const VirtualInstanceMonitorView: React.FC = () => {
  const {
    virtualInstances,
    setVirtualInstances,
    scalingPolicy,
    activeLbAlgorithm,
    setActiveLbAlgorithm,
    currentMetric,
  } = useCloudPilot();

  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Instance lifecycle actions
  const handleStartInstance = (id: string) => {
    setVirtualInstances(
      virtualInstances.map((v) => (v.id === id ? { ...v, status: 'STARTING', bootProgress: 10 } : v))
    );
    showToast(`Instance ${id} triggered boot sequence.`);
  };

  const handleStopInstance = (id: string) => {
    setVirtualInstances(
      virtualInstances.map((v) => (v.id === id ? { ...v, status: 'STOPPING' } : v))
    );
    showToast(`Instance ${id} gracefully draining connections.`);
  };

  const handleRestartInstance = (id: string) => {
    setVirtualInstances(
      virtualInstances.map((v) => (v.id === id ? { ...v, status: 'STARTING', bootProgress: 20, requestsServed: 0 } : v))
    );
    showToast(`Instance ${id} rebooted.`);
  };

  const handleTerminateInstance = (id: string) => {
    setVirtualInstances(virtualInstances.filter((v) => v.id !== id));
    showToast(`Instance ${id} terminated and removed from target group.`);
  };

  const handleAddNewInstance = () => {
    const nextNum = virtualInstances.length + 1;
    const newId = `inst-${String(nextNum).padStart(2, '0')}`;
    const newVm: VirtualInstance = {
      id: newId,
      status: 'STARTING',
      cpuUsage: 15,
      memoryUsage: 25,
      requestsServed: 0,
      activeConnections: 0,
      uptimeSeconds: 0,
      accumulatedCost: 0,
      launchTime: new Date().toISOString(),
      bootProgress: 15,
      healthy: true,
    };
    setVirtualInstances([...virtualInstances, newVm]);
    showToast(`Manually provisioned virtual instance ${newId}.`);
  };

  const runningCount = virtualInstances.filter((v) => v.status === 'RUNNING').length;
  const startingCount = virtualInstances.filter((v) => v.status === 'STARTING').length;
  const stoppingCount = virtualInstances.filter((v) => v.status === 'STOPPING').length;

  return (
    <div className="space-y-8 pb-12">
      {/* Title & Add Instance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Virtual Instance Monitor & Target Group</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time fleet state of AWS EC2 / Container instances, lifecycle control, and health checks.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {notification && (
            <div className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-cyan-300 flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{notification}</span>
            </div>
          )}

          <button
            onClick={handleAddNewInstance}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Launch Virtual Instance</span>
          </button>
        </div>
      </div>

      {/* Fleet Summary Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Total Fleet Size</span>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white">{virtualInstances.length}</span>
            <span className="text-xs text-slate-500">instances</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Running & Healthy</span>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">{runningCount}</span>
            <span className="text-xs text-emerald-500/70">active targets</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Starting (Booting Lag)</span>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-amber-400">{startingCount}</span>
            <span className="text-xs text-amber-500/70">~2-3 min delay</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Stopping / Draining</span>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-rose-400">{stoppingCount}</span>
            <span className="text-xs text-slate-500">cooldown period</span>
          </div>
        </div>
      </div>

      {/* SECTION 9: APPLICATION LOAD BALANCER (ALB) SIMULATOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Section 9 — Simulated Application Load Balancer (ALB)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Directs incoming request traffic across healthy target group members in real time.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-medium">Routing Algorithm:</span>
            <button
              onClick={() => setActiveLbAlgorithm('round-robin')}
              className={`px-2.5 py-1 rounded-md font-mono ${
                activeLbAlgorithm === 'round-robin'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Round Robin
            </button>
            <button
              onClick={() => setActiveLbAlgorithm('least-connections')}
              className={`px-2.5 py-1 rounded-md font-mono ${
                activeLbAlgorithm === 'least-connections'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Least Connections
            </button>
          </div>
        </div>

        {/* Load Balancer Traffic Pipeline Visualizer */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
              ALB
            </div>
            <div>
              <span className="text-xs font-bold text-white block">alb-cloudpilot-ingress-v2</span>
              <span className="text-[11px] text-slate-400 font-mono">
                Total Ingress: <strong className="text-indigo-300">{currentMetric?.requests_per_second || 0} req/s</strong> | Algorithm: {activeLbAlgorithm.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Health Check: HTTP 200 (OK)</span>
            </div>
            <div>Unhealthy Threshold: 2 fails</div>
          </div>
        </div>
      </div>

      {/* Instance Cards Grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Active Virtual Instances ({virtualInstances.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {virtualInstances.map((vm) => {
            const isRunning = vm.status === 'RUNNING';
            const isStarting = vm.status === 'STARTING';
            const isStopping = vm.status === 'STOPPING';

            return (
              <div
                key={vm.id}
                className={`rounded-xl border p-5 space-y-4 transition-all shadow-sm ${
                  isRunning
                    ? 'bg-slate-900 border-slate-800'
                    : isStarting
                    ? 'bg-slate-900/90 border-amber-500/50 ring-1 ring-amber-500/30'
                    : 'bg-slate-950 border-slate-800/80 opacity-70'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Server
                      className={`w-4 h-4 ${
                        isRunning ? 'text-emerald-400' : isStarting ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    />
                    <span className="font-mono font-bold text-white text-sm">{vm.id}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono tracking-wider ${
                      isRunning
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isStarting
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {vm.status}
                  </span>
                </div>

                {/* Boot progress bar if starting */}
                {isStarting && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-amber-300">
                      <span>Booting VM (Lead time)...</span>
                      <span>{vm.bootProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-amber-400 h-full transition-all" style={{ width: `${vm.bootProgress}%` }}></div>
                    </div>
                  </div>
                )}

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">CPU Load</span>
                    <span
                      className={`font-bold ${
                        vm.cpuUsage > 80 ? 'text-rose-400' : vm.cpuUsage > 60 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {vm.cpuUsage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">RAM Load</span>
                    <span className="font-bold text-cyan-300">{vm.memoryUsage.toFixed(1)}%</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Requests Handled</span>
                    <span className="font-bold text-indigo-300">
                      {(vm.requestsServed ?? vm.requestsHandled ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Accrued Cost</span>
                    <span className="font-bold text-emerald-400">
                      ${(vm.accumulatedCost ?? ((vm.uptimeSeconds || 0) * (vm.hourlyCost || 0.10) / 3600)).toFixed(3)}
                    </span>
                  </div>
                </div>

                {/* Footer Uptime & Controls */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Uptime: {Math.floor(vm.uptimeSeconds / 60)}m {vm.uptimeSeconds % 60}s
                  </span>

                  <div className="flex items-center space-x-1">
                    {isRunning ? (
                      <button
                        onClick={() => handleStopInstance(vm.id)}
                        className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800"
                        title="Stop Instance"
                      >
                        <StopCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartInstance(vm.id)}
                        className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                        title="Start Instance"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleRestartInstance(vm.id)}
                      className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                      title="Restart Instance"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleTerminateInstance(vm.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                      title="Terminate Instance"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

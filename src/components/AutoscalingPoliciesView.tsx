import React, { useState } from 'react';
import { useCloudPilot } from '../context/CloudPilotContext';
import { ScalingPolicy, AutoscalingStrategy } from '../types/cloudpilot';
import {
  Activity,
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  Layers,
  RotateCcw,
  Save,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

export const AutoscalingPoliciesView: React.FC = () => {
  const {
    scalingPolicy,
    updateScalingPolicy,
    activeStrategy,
    setActiveStrategy,
  } = useCloudPilot();

  const [form, setForm] = useState<ScalingPolicy>({ ...scalingPolicy });
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateScalingPolicy(form);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleResetDefaults = () => {
    const defaults: ScalingPolicy = {
      minInstances: 1,
      maxInstances: 15,
      targetCpuUtilization: 70,
      scaleUpThresholdCpu: 75,
      scaleDownThresholdCpu: 30,
      cpuUpperThreshold: 75,
      cpuLowerThreshold: 30,
      cooldownSeconds: 180,
      instanceCapacityRps: 250,
      costPerInstanceHour: 0.10,
      leadTimeMinutes: 3,
    };
    setForm(defaults);
    updateScalingPolicy(defaults);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title & Saved Toast */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white">Autoscaling Strategies & Rule Policies</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Switch the active orchestrator engine between Fixed, Reactive, and Predictive modes, or tune scaling thresholds.
          </p>
        </div>

        {savedNotice && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs flex items-center space-x-1.5 shadow">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Scaling policy parameters saved successfully!</span>
          </div>
        )}
      </div>

      {/* 3 Strategy Switcher Cards */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Select Active Orchestration Strategy
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Strategy 1: Fixed */}
          <div
            onClick={() => setActiveStrategy('fixed')}
            className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              activeStrategy === 'fixed'
                ? 'bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">1. Fixed Resource Allocation</span>
                {activeStrategy === 'fixed' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-600 text-white">ACTIVE</span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Statically pins a constant number of VMs (default: 6 instances) 24/7. No dynamic adaptation.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
              <div>• Massive idle wastage during troughs</div>
              <div>• Unpredictable SLA breach when traffic exceeds cap</div>
            </div>
          </div>

          {/* Strategy 2: Reactive */}
          <div
            onClick={() => setActiveStrategy('reactive')}
            className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              activeStrategy === 'reactive'
                ? 'bg-slate-900 border-amber-500 ring-2 ring-amber-500/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">2. Reactive Autoscaling</span>
                {activeStrategy === 'reactive' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-600 text-white">ACTIVE</span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Classic AWS CloudWatch / Kubernetes HPA threshold scaling: scale up when CPU &gt; {form.scaleUpThresholdCpu}%, scale down when CPU &lt; {form.scaleDownThresholdCpu}%.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
              <div>• Suffers from 2-3 minute VM boot-up lag</div>
              <div>• High latency & SLA breaches during sudden traffic spikes</div>
            </div>
          </div>

          {/* Strategy 3: Predictive */}
          <div
            onClick={() => setActiveStrategy('predictive')}
            className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              activeStrategy === 'predictive'
                ? 'bg-gradient-to-b from-indigo-950/40 to-slate-900 border-cyan-400 ring-2 ring-cyan-500/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>3. CloudPilot Predictive AI</span>
                </span>
                {activeStrategy === 'predictive' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-600 text-white">ACTIVE</span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                When a model has been trained and forecast points are available, uses the forecast to recommend simulated capacity {form.leadTimeMinutes} minutes prior to surge arrival.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-cyan-400/80 space-y-1">
              <div>• Eliminates boot-time lag & SLA drops</div>
              <div>• Saves up to 38% cost compared to fixed baseline</div>
            </div>
          </div>
        </div>
      </div>

      {/* Policy Configuration Form */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Orchestrator Operational Parameters</span>
            </h2>
            <p className="text-xs text-slate-400">
              Fine-tune min/max bounds, capacity ratios, cooldown guards, and cloud pricing.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Min Instances */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <label className="text-xs text-slate-400 block font-medium">Minimum Fleet Size (VMs)</label>
            <input
              type="number"
              min="1"
              max="10"
              value={form.minInstances}
              onChange={(e) => setForm({ ...form, minInstances: Number(e.target.value) || 1 })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white font-mono"
            />
            <span className="text-[10px] text-slate-500 block">Baseline lower bound</span>
          </div>

          {/* Max Instances */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <label className="text-xs text-slate-400 block font-medium">Maximum Fleet Size (VMs)</label>
            <input
              type="number"
              min="2"
              max="50"
              value={form.maxInstances}
              onChange={(e) => setForm({ ...form, maxInstances: Number(e.target.value) || 15 })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white font-mono"
            />
            <span className="text-[10px] text-slate-500 block">Safety ceiling ceiling</span>
          </div>

          {/* Target CPU % */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <label className="text-xs text-slate-400 block font-medium">Target CPU Utilization %</label>
            <input
              type="number"
              min="30"
              max="90"
              value={form.targetCpuUtilization}
              onChange={(e) => setForm({ ...form, targetCpuUtilization: Number(e.target.value) || 70 })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-cyan-400 font-mono"
            />
            <span className="text-[10px] text-slate-500 block">Optimal operating sweetspot</span>
          </div>

          {/* Scale Up Threshold */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <label className="text-xs text-slate-400 block font-medium">Scale-Up Threshold (CPU %)</label>
            <input
              type="number"
              min="50"
              max="95"
              value={form.scaleUpThresholdCpu ?? form.cpuUpperThreshold}
              onChange={(e) => {
                const val = Number(e.target.value) || 75;
                setForm({ ...form, scaleUpThresholdCpu: val, cpuUpperThreshold: val });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-rose-400 font-mono"
            />
            <span className="text-[10px] text-slate-500 block">Reactive scale trigger</span>
          </div>

          {/* Scale Down Threshold */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <label className="text-xs text-slate-400 block font-medium">Scale-Down Threshold (CPU %)</label>
            <input
              type="number"
              min="10"
              max="60"
              value={form.scaleDownThresholdCpu ?? form.cpuLowerThreshold}
              onChange={(e) => {
                const val = Number(e.target.value) || 30;
                setForm({ ...form, scaleDownThresholdCpu: val, cpuLowerThreshold: val });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-amber-400 font-mono"
            />
            <span className="text-[10px] text-slate-500 block">Idle reduction trigger</span>
          </div>

          {/* Cooldown Period */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <label className="text-xs text-slate-400 block font-medium">Cooldown Period (Seconds)</label>
            <input
              type="number"
              min="30"
              max="600"
              step="30"
              value={form.cooldownSeconds}
              onChange={(e) => setForm({ ...form, cooldownSeconds: Number(e.target.value) || 180 })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white font-mono"
            />
            <span className="text-[10px] text-slate-500 block">Prevents scaling flapping</span>
          </div>

          {/* Instance Capacity RPS */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <label className="text-xs text-slate-400 block font-medium">Instance Capacity (Requests/sec)</label>
            <input
              type="number"
              min="50"
              max="2000"
              step="50"
              value={form.instanceCapacityRps}
              onChange={(e) => setForm({ ...form, instanceCapacityRps: Number(e.target.value) || 250 })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white font-mono"
            />
            <span className="text-[10px] text-slate-500 block">Throughput per virtual machine</span>
          </div>

          {/* Cost per instance per hour */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <label className="text-xs text-slate-400 block font-medium">Cost / Instance-Hour ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="5.0"
              value={form.costPerInstanceHour}
              onChange={(e) => setForm({ ...form, costPerInstanceHour: Number(e.target.value) || 0.10 })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-emerald-400 font-mono"
            />
            <span className="text-[10px] text-slate-500 block">e.g. AWS t3.medium @ $0.0416/hr</span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-950/50"
          >
            <Save className="w-4 h-4" />
            <span>Apply Scaling Policies</span>
          </button>
        </div>
      </form>
    </div>
  );
};

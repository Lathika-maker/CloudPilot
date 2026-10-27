import React, { useState } from 'react';
import { useCloudPilot } from '../context/CloudPilotContext';
import { calculateWhatIf, WhatIfInput } from '../services/scalingEngine';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  DollarSign,
  Edit3,
  Flame,
  HelpCircle,
  Layers,
  Play,
  Server,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Upload,
  Zap,
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const {
    setActiveTab,
    loadSampleDataset,
    dataset,
    datasetMeta,
    scalingPolicy,
    startSimulation,
  } = useCloudPilot();

  // Quick interactive What-If sandbox directly on the home page
  const [quickInput, setQuickInput] = useState<WhatIfInput>({
    users: 5000,
    rps: 1200,
    cpu: 78,
    memory: 70,
    currentInstances: 3,
    costPerHour: 0.10,
    trafficGrowthPercent: 40,
    predictionHorizonMinutes: 10,
  });

  const whatIfResult = calculateWhatIf(quickInput, scalingPolicy);

  const handleUseSample = () => {
    loadSampleDataset();
    setActiveTab('dashboard');
    startSimulation();
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner with Academic Project Branding */}
      <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/50 border border-slate-800 p-6 md:p-10 shadow-xl overflow-hidden">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/3 -bottom-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Autonomous Cloud Resource Orchestrator & Cost Optimizer</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            CloudPilot <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-blue-400">AI</span>
          </h1>

          <p className="mt-3 text-base sm:text-lg text-slate-300 leading-relaxed">
            Eliminate cloud overprovisioning and SLA violations with predictive machine learning.
            CloudPilot forecasts workload surges in advance, proactively schedules virtual instances,
            and cuts unnecessary cloud expenditure by up to <strong className="text-emerald-400 font-semibold">38%</strong>.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
            <span className="flex items-center space-x-1 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Random Forest ML</span>
            </span>
            <span className="flex items-center space-x-1 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Lead-Time Provisioning</span>
            </span>
            <span className="flex items-center space-x-1 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Load Balancer Simulation</span>
            </span>
            <span className="flex items-center space-x-1 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Docker & AWS Ready</span>
            </span>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 3 PRIMARY DATA INPUT OPTIONS (MANDATORY REQUIREMENT) */}
      {/* ================================================== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
              <span>Choose Data Ingestion Mode</span>
            </h2>
            <p className="text-xs text-slate-400">
              Select how you want to feed workload metrics into the orchestration pipeline:
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
            Active: {datasetMeta?.name || 'Dataset'} ({(datasetMeta?.total_records ?? dataset?.length ?? 0).toLocaleString()} records)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* MODE A: USE SAMPLE DATASET */}
          <div
            id="btn-mode-sample"
            onClick={handleUseSample}
            className="group relative rounded-xl bg-slate-900 border border-slate-800 p-6 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-950/40 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Database className="w-6 h-6" />
              </div>
              <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-indigo-950 text-indigo-300 border border-indigo-800">
                Mode A — Built-In
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                Use Sample Dataset
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Instantly load <strong>10,000 realistic production records</strong> featuring low nighttime traffic,
                morning ramp-up, evening peaks, sudden flash-sale spikes, and correlated CPU/RAM/RPS telemetry.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
              <span>Launch 10K Simulation</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* MODE B: UPLOAD DATASET */}
          <div
            id="btn-mode-upload"
            onClick={() => setActiveTab('dataset')}
            className="group relative rounded-xl bg-slate-900 border border-slate-800 p-6 hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-950/40 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                <Upload className="w-6 h-6" />
              </div>
              <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-cyan-950 text-cyan-300 border border-cyan-800">
                Mode B — Custom File
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                Upload Dataset
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload custom <strong>CSV or JSON files</strong> with smart schema detection, interactive column
                mapping, data validation, and support for Google and Alibaba cluster traces.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-cyan-400 group-hover:text-cyan-300">
              <span>Open Dataset Manager</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* MODE C: MANUAL WORKLOAD INPUT (MANDATORY PROMINENT BUTTON) */}
          <div
            id="btn-mode-manual"
            onClick={() => setActiveTab('manual')}
            className="group relative rounded-xl bg-slate-900 border border-slate-800 p-6 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-950/40 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <Edit3 className="w-6 h-6" />
              </div>
              <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                Mode C — Manual Input
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                Enter Workload Manually
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Type custom values for Users, RPS, CPU%, RAM%, or enter multiple time intervals in an editable table.
                Also includes a synthetic future workload generator with custom growth rates and spike probabilities.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
              <span>Enter Manual Values</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* WHAT-IF SIMULATOR QUICK CARD (STUDENT VIVA DEMO) */}
      {/* ================================================== */}
      <div className="rounded-xl bg-slate-900/90 border border-indigo-900/50 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Instant &quot;What-If&quot; Scaling Simulator</h2>
            </div>
            <p className="text-xs text-slate-400">
              Test immediate scaling reactions: adjust workload parameters below to instantly see the AI prediction, recommended instance count, cost, and rationale.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('what-if')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
          >
            <span>Open Full What-If Lab</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Controls */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Workload State (Input)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/80">
                <label className="text-[11px] text-slate-400 block">Active Users</label>
                <input
                  type="number"
                  value={quickInput.users}
                  onChange={(e) => setQuickInput({ ...quickInput, users: Number(e.target.value) || 0 })}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono"
                />
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/80">
                <label className="text-[11px] text-slate-400 block">Requests / sec</label>
                <input
                  type="number"
                  value={quickInput.rps}
                  onChange={(e) => setQuickInput({ ...quickInput, rps: Number(e.target.value) || 0 })}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono"
                />
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/80">
                <label className="text-[11px] text-slate-400 block">Current CPU %</label>
                <input
                  type="number"
                  value={quickInput.cpu}
                  onChange={(e) => setQuickInput({ ...quickInput, cpu: Number(e.target.value) || 0 })}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono"
                />
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/80">
                <label className="text-[11px] text-slate-400 block">Current Instances</label>
                <input
                  type="number"
                  value={quickInput.currentInstances}
                  onChange={(e) => setQuickInput({ ...quickInput, currentInstances: Math.max(1, Number(e.target.value) || 1) })}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono"
                />
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/80">
                <label className="text-[11px] text-slate-400 block">Growth Rate %</label>
                <input
                  type="number"
                  value={quickInput.trafficGrowthPercent}
                  onChange={(e) => setQuickInput({ ...quickInput, trafficGrowthPercent: Number(e.target.value) || 0 })}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono"
                />
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/80">
                <label className="text-[11px] text-slate-400 block">Cost/Instance/Hr ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={quickInput.costPerHour}
                  onChange={(e) => setQuickInput({ ...quickInput, costPerHour: Number(e.target.value) || 0.1 })}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Presets:</span>
              <button
                onClick={() => setQuickInput({ ...quickInput, users: 12000, rps: 3100, cpu: 88, trafficGrowthPercent: 65 })}
                className="px-2 py-0.5 rounded bg-slate-800 text-rose-300 hover:bg-slate-700 border border-slate-700"
              >
                Sudden Spike
              </button>
              <button
                onClick={() => setQuickInput({ ...quickInput, users: 1200, rps: 300, cpu: 22, trafficGrowthPercent: -50 })}
                className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 hover:bg-slate-700 border border-slate-700"
              >
                Traffic Drop
              </button>
              <button
                onClick={() => setQuickInput({ ...quickInput, users: 4000, rps: 1000, cpu: 65, trafficGrowthPercent: 5 })}
                className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 hover:bg-slate-700 border border-slate-700"
              >
                Steady State
              </button>
            </div>
          </div>

          {/* Real-time Output & Orchestrator Decision */}
          <div className="lg:col-span-6 bg-slate-950/80 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Orchestrator Evaluation (Output)</h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    whatIfResult.action === 'SCALE_UP'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : whatIfResult.action === 'SCALE_DOWN'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {whatIfResult.action === 'SCALE_UP' ? '⚡ SCALE UP' : whatIfResult.action === 'SCALE_DOWN' ? '📉 SCALE DOWN' : '✓ MAINTAIN'}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Forecasted Load</span>
                  <span className="text-base font-bold text-white font-mono">{(whatIfResult?.predictedRps ?? 0).toLocaleString()} <span className="text-[10px] font-normal text-slate-400">rps</span></span>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Target Fleet</span>
                  <span className="text-base font-bold text-cyan-400 font-mono">{whatIfResult.recommendedInstances} <span className="text-[10px] font-normal text-slate-400">VMs</span></span>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Cloud Cost / Hr</span>
                  <span className="text-base font-bold text-indigo-400 font-mono">${whatIfResult.estimatedCostPerHour.toFixed(2)}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Cost Savings</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">+{whatIfResult.estimatedSavingsPercent}%</span>
                </div>
              </div>

              {/* Natural Language AI Explanation */}
              <div className="mt-3 p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/50 text-xs text-indigo-200 leading-relaxed font-sans">
                <div className="flex items-center space-x-1.5 font-semibold text-indigo-300 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Explainable Decision Rationale</span>
                </div>
                {whatIfResult.explanation}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Formula: N = ⌈ Predicted RPS / (250 RPS × 70% Target CPU) ⌉</span>
              <button
                onClick={() => setActiveTab('simulation')}
                className="text-cyan-400 hover:text-cyan-300 font-medium"
              >
                Test in Live Cluster →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Strategy Comparison Cards */}
      <div>
        <h2 className="text-lg font-bold text-slate-100 mb-3">Architectural Strategy Benchmark</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200 text-sm">1. Fixed Resource Baseline</h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">Static</span>
            </div>
            <p className="text-xs text-slate-400">
              Allocates a static number of VMs (e.g. 6 instances) continuously to accommodate peak traffic.
            </p>
            <div className="pt-2 text-xs font-mono space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Resource Wastage:</span>
                <span className="text-rose-400 font-semibold">High (50-65% idle)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SLA Violations:</span>
                <span className="text-amber-400">Low until peak breached</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cost Efficiency:</span>
                <span className="text-rose-400">Poor (Continuous maximum spend)</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-200 text-sm">2. Traditional Reactive Autoscaling</h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">Thresholds</span>
            </div>
            <p className="text-xs text-slate-400">
              Triggers scale-up only after CPU breaches 75%. Suffers from a 2-3 minute VM boot-up delay during surges.
            </p>
            <div className="pt-2 text-xs font-mono space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Resource Wastage:</span>
                <span className="text-emerald-400">Moderate</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SLA Violations:</span>
                <span className="text-rose-400 font-semibold">High (Booting lag)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cost Efficiency:</span>
                <span className="text-emerald-400">Better than Fixed</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-4 border border-indigo-800/60 bg-gradient-to-b from-indigo-950/20 to-slate-900 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-cyan-300 text-sm">3. CloudPilot Predictive AI</h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 font-bold">Proactive ML</span>
            </div>
            <p className="text-xs text-slate-300">
              Forecasts future request volume 10 minutes ahead using Random Forest and starts provisioning VMs prior to the surge.
            </p>
            <div className="pt-2 text-xs font-mono space-y-1 text-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-400">Resource Wastage:</span>
                <span className="text-emerald-400 font-semibold">Minimal (Tight tracking)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SLA Violations:</span>
                <span className="text-emerald-400 font-semibold">Near Zero</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cost Savings:</span>
                <span className="text-cyan-400 font-bold">Up to 38% vs Fixed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

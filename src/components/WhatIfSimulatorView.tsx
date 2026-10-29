import React, { useState } from 'react';
import { useCloudPilot } from '../context/CloudPilotContext';
import { calculateWhatIf, WhatIfInput } from '../services/scalingEngine';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Cpu,
  DollarSign,
  HelpCircle,
  RotateCcw,
  Server,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export const WhatIfSimulatorView: React.FC = () => {
  const { scalingPolicy } = useCloudPilot();

  const [input, setInput] = useState<WhatIfInput>({
    users: 5000,
    rps: 1200,
    cpu: 78,
    memory: 70,
    currentInstances: 3,
    costPerHour: 0.10,
    trafficGrowthPercent: 35,
    predictionHorizonMinutes: 10,
  });

  const result = calculateWhatIf(input, scalingPolicy);

  // Cost comparison bars for What-If
  const costData = [
    { name: 'Overprovisioned Fixed (6 VMs)', cost: result.fixedCostPerHour, fill: '#64748b' },
    { name: 'Current Allocation', cost: Number((input.currentInstances * input.costPerHour).toFixed(2)), fill: '#f59e0b' },
    { name: 'Rule-Based Recommendation', cost: result.estimatedCostPerHour, fill: '#10b981' },
  ];

  const resetToPromptExample = () => {
    setInput({
      users: 5000,
      rps: 1200,
      cpu: 78,
      memory: 70,
      currentInstances: 3,
      costPerHour: 0.10,
      trafficGrowthPercent: 35,
      predictionHorizonMinutes: 10,
    });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white">Manual &quot;What-If&quot; Scaling Lab</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Explore a hypothetical workload with rule-based capacity and cost estimates. This calculator does not run the trained ML model or use uploaded telemetry.
          </p>
        </div>
        <button
          onClick={resetToPromptExample}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 self-start"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Benchmark Case</span>
        </button>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Inputs and Sliders (Col 5) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Hypothetical Workload State (Input)
            </h2>
            <span className="text-[10px] font-mono text-cyan-400">Live Updating</span>
          </div>

          {/* Active Users */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Active Concurrent Users</span>
              <span className="font-mono text-cyan-400 font-bold">{(input?.users ?? 0).toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="200"
              max="25000"
              step="100"
              value={input.users}
              onChange={(e) => {
                const u = Number(e.target.value);
                setInput({ ...input, users: u, rps: Math.round(u * 0.24) });
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Requests per second */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Requests per Second (RPS)</span>
              <span className="font-mono text-indigo-400 font-bold">{(input?.rps ?? 0).toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="50"
              max="6000"
              step="50"
              value={input.rps}
              onChange={(e) => setInput({ ...input, rps: Number(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Observed CPU % */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Current CPU Utilization</span>
              <span
                className={`font-mono font-bold ${
                  input.cpu > 80 ? 'text-rose-400' : input.cpu > 65 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {input.cpu}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="99"
              value={input.cpu}
              onChange={(e) => setInput({ ...input, cpu: Number(e.target.value) })}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          {/* Observed Memory % */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Current RAM Utilization</span>
              <span className="font-mono text-purple-400 font-bold">{input.memory}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="95"
              value={input.memory}
              onChange={(e) => setInput({ ...input, memory: Number(e.target.value) })}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          {/* Current Instances */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Current Fleet Instances</span>
              <span className="font-mono text-emerald-400 font-bold">{input.currentInstances} VMs</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              value={input.currentInstances}
              onChange={(e) => setInput({ ...input, currentInstances: Number(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Projected Traffic Growth Rate % */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Upcoming Traffic Growth Delta</span>
              <span className={`font-mono font-bold ${input.trafficGrowthPercent >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                {input.trafficGrowthPercent >= 0 ? `+${input.trafficGrowthPercent}%` : `${input.trafficGrowthPercent}%`}
              </span>
            </div>
            <input
              type="range"
              min="-80"
              max="200"
              step="5"
              value={input.trafficGrowthPercent}
              onChange={(e) => setInput({ ...input, trafficGrowthPercent: Number(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Hourly Cost per Instance */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Cost / Instance-Hour</span>
            <div className="flex items-center space-x-1 font-mono">
              <span className="text-slate-500">$</span>
              <input
                type="number"
                step="0.01"
                value={input.costPerHour}
                onChange={(e) => setInput({ ...input, costPerHour: Number(e.target.value) || 0.1 })}
                className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-white text-right"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Instant Mathematical Output & AI Rationale (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Decision Outcome Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Orchestrator Decision Outcome (Output)
              </h2>
              <span
                className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center space-x-1.5 ${
                  result.action === 'SCALE_UP'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : result.action === 'SCALE_DOWN'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                <span>{result.action === 'SCALE_UP' ? '⚡ SCALE UP' : result.action === 'SCALE_DOWN' ? '📉 SCALE DOWN' : '✓ MAINTAIN'}</span>
              </span>
            </div>

            {/* Output Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Forecasted Load</span>
                <span className="text-lg font-bold font-mono text-purple-400">
                  {(result?.predictedRps ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">rps</span>
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">~{(result?.predictedUsers ?? 0).toLocaleString()} users</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Target Instances</span>
                <div className="flex items-baseline space-x-1.5 mt-0.5">
                  <span className="text-lg font-bold font-mono text-white">{result.recommendedInstances}</span>
                  <span className="text-xs text-slate-400">from {input.currentInstances}</span>
                </div>
                <span className="text-[10px] text-emerald-400 block mt-0.5">
                  {result.recommendedInstances > input.currentInstances
                    ? `+${result.recommendedInstances - input.currentInstances} Scale Up`
                    : result.recommendedInstances < input.currentInstances
                    ? `-${input.currentInstances - result.recommendedInstances} Scale Down`
                    : 'Optimized Fleet'}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Target Fleet Cost</span>
                <span className="text-lg font-bold font-mono text-white mt-0.5 block">
                  ${result.estimatedCostPerHour.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 block">per hour</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 bg-gradient-to-br from-emerald-950/40 to-slate-950">
                <span className="text-[11px] text-emerald-400 block">Estimated Savings</span>
                <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5 block">
                  +{result.estimatedSavingsPercent}%
                </span>
                <span className="text-[10px] text-slate-400 block">${result.hourlySavings}/hr saved</span>
              </div>
            </div>

            {/* Explainable Decision Rationale Box */}
            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-xs text-indigo-200 leading-relaxed font-sans space-y-1.5">
              <div className="flex items-center space-x-2 font-bold text-indigo-300">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Explainable AI Recommendation</span>
              </div>
              <p>{result.explanation}</p>
            </div>
          </div>

          {/* Visual Cost Comparison Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Hourly Expenditure Comparison
            </h3>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} unit="$" />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={150} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`$${val}/hr`, 'Cost']}
                  />
                  <Bar dataKey="cost" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

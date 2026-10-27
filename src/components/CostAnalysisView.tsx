import React, { useState } from 'react';
import { useCloudPilot } from '../context/CloudPilotContext';
import { runStrategyComparison, ComparisonSummary } from '../services/costEngine';
import { exportComparisonBenchmarkCSV } from '../services/csvExport';
import { ExportCSVModal } from './ExportCSVModal';
import {
  AlertTriangle,
  ArrowDownRight,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  TrendingDown,
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
  Legend,
} from 'recharts';

export const CostAnalysisView: React.FC = () => {
  const { dataset, scalingPolicy } = useCloudPilot();

  // Run or memoize benchmark across the active dataset
  const [benchmarkResult, setBenchmarkResult] = useState<ComparisonSummary>(() =>
    runStrategyComparison(dataset, scalingPolicy)
  );

  const [isRecomputing, setIsRecomputing] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleRerunBenchmark = () => {
    setIsRecomputing(true);
    setTimeout(() => {
      const res = runStrategyComparison(dataset, scalingPolicy);
      setBenchmarkResult(res);
      setIsRecomputing(false);
    }, 400);
  };

  // Prepare chart comparison data
  const costChartData = [
    {
      metric: 'Total Cloud Cost ($)',
      'Fixed Fleet': benchmarkResult.fixed.totalCost,
      'Reactive Autoscaling': benchmarkResult.reactive.totalCost,
      'CloudPilot Predictive AI': benchmarkResult.predictive.totalCost,
    },
    {
      metric: 'SLA Violations (Count)',
      'Fixed Fleet': benchmarkResult.fixed.slaViolations,
      'Reactive Autoscaling': benchmarkResult.reactive.slaViolations,
      'CloudPilot Predictive AI': benchmarkResult.predictive.slaViolations,
    },
    {
      metric: 'Scaling Actions',
      'Fixed Fleet': benchmarkResult.fixed.scaleUpEvents + benchmarkResult.fixed.scaleDownEvents,
      'Reactive Autoscaling': benchmarkResult.reactive.scaleUpEvents + benchmarkResult.reactive.scaleDownEvents,
      'CloudPilot Predictive AI': benchmarkResult.predictive.scaleUpEvents + benchmarkResult.predictive.scaleDownEvents,
    },
  ];

  const utilizationData = [
    {
      name: 'Fixed Allocation',
      utilization: benchmarkResult.fixed.avgCpu,
      fill: '#64748b',
    },
    {
      name: 'Reactive Autoscaling',
      utilization: benchmarkResult.reactive.avgCpu,
      fill: '#f59e0b',
    },
    {
      name: 'Predictive AI (CloudPilot)',
      utilization: benchmarkResult.predictive.avgCpu,
      fill: '#10b981',
    },
  ];

  // Export benchmark as JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(benchmarkResult, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `cloudpilot_benchmark_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export benchmark as CSV
  const handleExportCSV = () => {
    const res = exportComparisonBenchmarkCSV(benchmarkResult);
    setExportNotice(`Exported benchmark comparison (${res.rowCount} timeline points) to ${res.filename}`);
    setTimeout(() => setExportNotice(null), 4500);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Cost & Autoscaling Comparison</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Estimated strategy comparison from {(dataset?.length || 0).toLocaleString()} simulated workload steps. Results depend on this dataset and the selected policy.
          </p>
          {exportNotice && (
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-mono mt-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{exportNotice}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRerunBenchmark}
            disabled={isRecomputing}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRecomputing ? 'animate-spin' : ''}`} />
            <span>Re-run Benchmark</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 shadow"
            title="Download Academic Research Benchmark as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Benchmark CSV</span>
          </button>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow"
            title="Open Full CSV Export Hub (Simulation, Workload, Events, Fleet)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Hub</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 shadow"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 px-4 py-3 text-xs leading-relaxed text-amber-100/90">
        These are simulator estimates, not live cloud bills or production measurements. Costs assume the configured per-instance hourly rate and one minute per workload point; SLA results follow this project's simplified response-time and CPU model.
      </div>

      {/* Hero Cost Savings Card */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-emerald-500/30 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulation estimate</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            Predictive scaling is <span className="text-emerald-400">{Math.abs(benchmarkResult.costSavingsPercent)}% {benchmarkResult.costSavingsPercent >= 0 ? 'lower cost' : 'higher cost'}</span> than fixed
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Estimated predictive cost is <strong className="text-white font-mono">${benchmarkResult.predictive.totalCost.toFixed(2)}</strong> versus
            <strong className="text-white font-mono"> ${benchmarkResult.fixed.totalCost.toFixed(2)}</strong> for fixed allocation. The simulator estimates
            <strong className="text-white font-mono"> ${Math.abs(benchmarkResult.costSavingsAmount).toFixed(2)}</strong> {benchmarkResult.costSavingsAmount >= 0 ? 'lower spend' : 'additional spend'}.
            SLA breach estimates are <strong className="text-rose-400 font-mono">{benchmarkResult.reactive.slaViolations}</strong> for reactive and
            <strong className="text-emerald-400 font-mono"> {benchmarkResult.predictive.slaViolations}</strong> for predictive scaling.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800 shrink-0">
          <div className="text-center px-3">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">{benchmarkResult.costSavingsAmount >= 0 ? 'Estimated savings' : 'Estimated cost increase'}</span>
            <span className={`text-2xl font-extrabold font-mono ${benchmarkResult.costSavingsAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {benchmarkResult.costSavingsAmount >= 0 ? '+' : '−'}{Math.abs(benchmarkResult.costSavingsPercent)}%
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">${Math.abs(benchmarkResult.costSavingsAmount).toFixed(2)} {benchmarkResult.costSavingsAmount >= 0 ? 'estimated savings' : 'estimated additional cost'}</span>
          </div>
          <div className="h-10 w-px bg-slate-800"></div>
          <div className="text-center px-3">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Predicted SLA</span>
            <span className="text-2xl font-extrabold font-mono text-cyan-400">
              {Math.max(0, 100 - benchmarkResult.predictive.slaViolationRate).toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Steps within SLA (model estimate)</span>
          </div>
        </div>
      </div>

      {/* Comprehensive Empirical Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span>Simulated Strategy Comparison</span>
        </h2>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">Evaluation Metric</th>
                <th className="px-4 py-3">1. Fixed Baseline (6 VMs)</th>
                <th className="px-4 py-3">2. Reactive (Thresholds)</th>
                <th className="px-4 py-3 text-cyan-400 font-bold">3. CloudPilot Predictive AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
              <tr>
                <td className="px-4 py-3 font-sans font-medium text-slate-300">Total Cloud Cost ($)</td>
                <td className="px-4 py-3 text-slate-400">${benchmarkResult.fixed.totalCost.toFixed(2)}</td>
                <td className="px-4 py-3 text-amber-300">${benchmarkResult.reactive.totalCost.toFixed(2)}</td>
                <td className="px-4 py-3 text-emerald-400 font-bold">${benchmarkResult.predictive.totalCost.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-sans font-medium text-slate-300">Total VM-Hours Consumed</td>
                <td className="px-4 py-3 text-slate-400">{benchmarkResult.fixed.totalInstanceHours.toFixed(1)} hrs</td>
                <td className="px-4 py-3 text-slate-300">{benchmarkResult.reactive.totalInstanceHours.toFixed(1)} hrs</td>
                <td className="px-4 py-3 text-cyan-400 font-bold">{benchmarkResult.predictive.totalInstanceHours.toFixed(1)} hrs</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-sans font-medium text-slate-300">Average CPU Utilization (%)</td>
                <td className="px-4 py-3 text-rose-400">{benchmarkResult.fixed.avgCpu.toFixed(1)}% (Idle)</td>
                <td className="px-4 py-3 text-amber-300">{benchmarkResult.reactive.avgCpu.toFixed(1)}%</td>
                <td className="px-4 py-3 text-emerald-400 font-bold">{benchmarkResult.predictive.avgCpu.toFixed(1)}% (Optimal)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-sans font-medium text-slate-300">Scaling Actions Triggered</td>
                <td className="px-4 py-3 text-slate-500">0 (Static)</td>
                <td className="px-4 py-3 text-slate-300">
                  {benchmarkResult.reactive.scaleUpEvents + benchmarkResult.reactive.scaleDownEvents} actions
                </td>
                <td className="px-4 py-3 text-indigo-300 font-bold">
                  {benchmarkResult.predictive.scaleUpEvents + benchmarkResult.predictive.scaleDownEvents} actions
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-sans font-medium text-slate-300">SLA Violations (CPU &gt; 90% or Latency &gt; 100ms)</td>
                <td className="px-4 py-3 text-amber-400">{benchmarkResult.fixed.slaViolations} breaches</td>
                <td className="px-4 py-3 text-rose-400 font-semibold">{benchmarkResult.reactive.slaViolations} breaches (Boot lag)</td>
                <td className="px-4 py-3 text-emerald-400 font-bold">{benchmarkResult.predictive.slaViolations} breaches (Proactive)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-sans font-medium text-slate-300">Resource Wastage Hours</td>
                <td className="px-4 py-3 text-rose-400 font-semibold">{benchmarkResult.fixed.resourceWastageHours} hrs</td>
                <td className="px-4 py-3 text-slate-300">{benchmarkResult.reactive.resourceWastageHours} hrs</td>
                <td className="px-4 py-3 text-cyan-400 font-bold">{benchmarkResult.predictive.resourceWastageHours} hrs</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Chart Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost & Metrics Grouped Bars */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Total Expenditure ($) & SLA Violations Comparison
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="metric" stroke="#64748b" fontSize={11} />
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
                <Bar dataKey="Fixed Fleet" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Reactive Autoscaling" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="CloudPilot Predictive AI" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CPU Utilization Efficiency */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Resource Utilization Efficiency (Average CPU %)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={utilizationData} layout="vertical" margin={{ top: 10, right: 30, left: 50, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={11} unit="%" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={140} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val}%`, 'Avg CPU Utilization']}
                />
                <Bar dataKey="utilization" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Export CSV Modal */}
      <ExportCSVModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        defaultCategory="benchmark"
      />
    </div>
  );
};

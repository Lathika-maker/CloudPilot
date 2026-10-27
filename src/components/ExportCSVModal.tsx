import React, { useState } from 'react';
import { useCloudPilot } from '../context/CloudPilotContext';
import {
  exportWorkloadLogsCSV,
  exportSimulationResultsCSV,
  exportScalingEventsCSV,
  exportVirtualFleetCSV,
  exportComparisonBenchmarkCSV,
} from '../services/csvExport';
import {
  Download,
  FileSpreadsheet,
  CheckCircle2,
  X,
  Database,
  Activity,
  Zap,
  Server,
  TrendingUp,
} from 'lucide-react';

interface ExportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: 'workload' | 'simulation' | 'events' | 'fleet' | 'benchmark';
}

export const ExportCSVModal: React.FC<ExportCSVModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'simulation',
}) => {
  const {
    dataset,
    currentIndex,
    scalingEvents,
    virtualInstances,
    activeStrategy,
    scalingPolicy,
    comparisonResults,
  } = useCloudPilot();

  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const showSuccess = (filename: string, count: number) => {
    setDownloadSuccessMsg(`Exported ${count.toLocaleString()} records to ${filename}`);
    setTimeout(() => {
      setDownloadSuccessMsg(null);
    }, 4500);
  };

  const handleExportWorkload = () => {
    const res = exportWorkloadLogsCSV(dataset);
    showSuccess(res.filename, res.rowCount);
  };

  const handleExportSimulationResults = () => {
    const res = exportSimulationResultsCSV(dataset, currentIndex, activeStrategy, scalingPolicy);
    showSuccess(res.filename, res.rowCount);
  };

  const handleExportScalingEvents = () => {
    const res = exportScalingEventsCSV(scalingEvents);
    showSuccess(res.filename, res.rowCount);
  };

  const handleExportFleet = () => {
    const res = exportVirtualFleetCSV(virtualInstances);
    showSuccess(res.filename, res.rowCount);
  };

  const handleExportBenchmark = () => {
    if (comparisonResults) {
      const res = exportComparisonBenchmarkCSV(comparisonResults);
      showSuccess(res.filename, res.rowCount);
    }
  };

  const simulatedStepsCount = Math.max(1, currentIndex + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Export Simulation & Workload Data (CSV)</h2>
              <p className="text-xs text-slate-400">
                Download structured RFC-4180 CSV files compatible with Excel, Google Sheets, Pandas, R, and Tableau.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {downloadSuccessMsg && (
          <div className="flex items-center space-x-2 p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 animate-in slide-in-from-top-2 duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-mono">{downloadSuccessMsg}</span>
          </div>
        )}

        {/* Export Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card 1: Simulation Run History */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-white">Simulation Results</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {simulatedStepsCount.toLocaleString()} steps
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Step-by-step telemetry, active instance sizing, cluster capacity, and SLA violations evaluated up to step {currentIndex + 1}.
              </p>
            </div>

            <button
              onClick={handleExportSimulationResults}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Simulation CSV</span>
            </button>
          </div>

          {/* Card 2: Workload Raw Logs */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-white">Workload Dataset Logs</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {(dataset?.length || 0).toLocaleString()} points
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Complete workload timeseries including timestamp, RPS, users, CPU, memory, response times, and network I/O.
              </p>
            </div>

            <button
              onClick={handleExportWorkload}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Workload CSV</span>
            </button>
          </div>

          {/* Card 3: Autoscaling Event Audit Log */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-white">Autoscaling Event Log</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  {scalingEvents.length} events
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Scale-up and scale-down decisions, previous and new VM counts, trigger causes, and ML prediction rationales.
              </p>
            </div>

            <button
              onClick={handleExportScalingEvents}
              disabled={scalingEvents.length === 0}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Scaling Events CSV</span>
            </button>
          </div>

          {/* Card 4: Virtual Fleet Inventory */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-white">Virtual Fleet Snapshot</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {virtualInstances.length} nodes
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Target group status, node health, load distributions, active TCP connections, uptime, and accumulated costs.
              </p>
            </div>

            <button
              onClick={handleExportFleet}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Fleet CSV</span>
            </button>
          </div>
        </div>

        {/* Card 5: Research Comparative Benchmark (Full Width) */}
        {comparisonResults && (
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">
                  Academic Strategy Benchmark (Fixed vs Reactive vs Predictive)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Includes executive research summary metrics and per-step comparative timeline over{' '}
                {comparisonResults.timeline.length.toLocaleString()} points.
              </p>
            </div>

            <button
              onClick={handleExportBenchmark}
              className="shrink-0 flex items-center space-x-2 py-2 px-4 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Benchmark CSV</span>
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Standards: RFC 4180 • UTF-8 with BOM</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

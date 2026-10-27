import React from 'react';
import { useCloudPilot } from '../context/CloudPilotContext';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Database,
  DollarSign,
  Edit3,
  Layers,
  Sparkles,
  Upload,
  Layers,
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const {
    setActiveTab,
    loadSampleDataset,
    dataset,
    datasetMeta,
    startSimulation,
  } = useCloudPilot();

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
            Explore predictive workload forecasting and autoscaling trade-offs in a controlled simulator.
            Use generated, uploaded or manually entered workload data to compare policies. Results are
            scenario-based; validate them against real traces before making production savings claims.
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
              <span>Docker & AWS deployment blueprint</span>
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

      <section className="space-y-3" aria-label="Recommended next steps">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Explore the workspace</h2>
            <p className="text-sm text-slate-400">Move from workload data to forecasting and measurable scenario comparisons.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button onClick={() => setActiveTab('dashboard')} className="group text-left rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 hover:border-sky-800 p-5 transition-colors">
            <span className="mb-4 grid place-items-center w-10 h-10 rounded-lg border border-sky-800/70 bg-sky-950/60 text-sky-300"><Activity size={19}/></span>
            <span className="block text-sm font-semibold text-slate-100">Live dashboard</span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-400">Inspect simulated workload, VM state, scaling events and alerts in one place.</span>
            <span className="mt-4 block text-xs font-semibold text-sky-300">Open dashboard <ArrowRight size={13} className="ml-1 inline transition-transform group-hover:translate-x-1"/></span>
          </button>
          <button onClick={() => setActiveTab('ml')} className="group text-left rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 hover:border-indigo-800 p-5 transition-colors">
            <span className="mb-4 grid place-items-center w-10 h-10 rounded-lg border border-indigo-800/70 bg-indigo-950/60 text-indigo-300"><Layers size={19}/></span>
            <span className="block text-sm font-semibold text-slate-100">Forecasting pipeline</span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-400">Train the in-browser model on the selected workload and review its validation metrics.</span>
            <span className="mt-4 block text-xs font-semibold text-indigo-300">Inspect model <ArrowRight size={13} className="ml-1 inline transition-transform group-hover:translate-x-1"/></span>
          </button>
          <button onClick={() => setActiveTab('cost')} className="group text-left rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 hover:border-emerald-800 p-5 transition-colors">
            <span className="mb-4 grid place-items-center w-10 h-10 rounded-lg border border-emerald-800/70 bg-emerald-950/60 text-emerald-300"><DollarSign size={19}/></span>
            <span className="block text-sm font-semibold text-slate-100">Compare strategies</span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-400">Compare fixed, reactive and predictive policies on the active simulation dataset.</span>
            <span className="mt-4 block text-xs font-semibold text-emerald-300">View cost analysis <ArrowRight size={13} className="ml-1 inline transition-transform group-hover:translate-x-1"/></span>
          </button>
        </div>
      </section>
    </div>
  );
};

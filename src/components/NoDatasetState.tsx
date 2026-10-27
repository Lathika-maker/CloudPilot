import React from 'react';
import { Database, FileUp, Play, Sparkles } from 'lucide-react';

interface NoDatasetStateProps {
  title?: string;
  description?: string;
  onLoadSample: () => void;
  onOpenDataset: () => void;
  onOpenManual: () => void;
}

export const NoDatasetState: React.FC<NoDatasetStateProps> = ({
  title = 'Load a workload to begin',
  description = 'CloudPilot does not have any workload records yet. Nothing will be simulated until you choose a sample, upload a file, or enter workload points.',
  onLoadSample,
  onOpenDataset,
  onOpenManual,
}) => (
  <section className="mx-auto my-10 max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-10 text-center shadow-xl">
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
      <Database size={25} />
    </div>
    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">No active dataset</p>
    <h1 className="mt-2 text-2xl font-bold text-white">{title}</h1>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">{description}</p>
    <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <button onClick={onLoadSample} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-600/15 p-4 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-600/25">
        <Sparkles size={19} />
        <span>Load demo workload</span>
        <span className="text-[11px] font-normal text-slate-400">600 synthetic points</span>
      </button>
      <button onClick={onOpenDataset} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/15">
        <FileUp size={19} />
        <span>Upload CSV / JSON</span>
        <span className="text-[11px] font-normal text-slate-400">Use your own workload</span>
      </button>
      <button onClick={onOpenManual} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 p-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800">
        <Play size={19} />
        <span>Manual input</span>
        <span className="text-[11px] font-normal text-slate-400">Enter scenario points</span>
      </button>
    </div>
    <p className="mt-6 text-[11px] leading-5 text-slate-500">Demo values are synthetic estimates. They are not live cloud telemetry or provider billing data.</p>
  </section>
);

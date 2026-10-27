import React, { useMemo } from 'react';
import {
  X,
  Sliders,
  Sparkles,
  Zap,
  Lock,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Server,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { useCloudPilot } from '../context/CloudPilotContext';
import { runStrategyComparison } from '../services/costEngine';

interface StrategyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StrategyInfoModal: React.FC<StrategyInfoModalProps> = ({ isOpen, onClose }) => {
  const { activeStrategy, setActiveStrategy, virtualInstances, currentMetric, scalingPolicy, dataset } = useCloudPilot();
  const comparison = useMemo(() => dataset.length > 0 ? runStrategyComparison(dataset, scalingPolicy) : null, [dataset, scalingPolicy]);

  if (!isOpen) return null;

  const runningVms = virtualInstances.filter((v) => v.status === 'RUNNING').length;
  const currentCost = (runningVms * scalingPolicy.costPerInstanceHour).toFixed(2);
  const getImpact = (strategy: 'fixed' | 'reactive' | 'predictive') => {
    if (!comparison || dataset.length === 0) {
      return {
        instances: strategy === 'fixed' ? '6 static VMs' : 'Workload-dependent',
        slaCompliance: 'Not evaluated — load data',
        avgCostPerHour: 'Not evaluated — load data',
      };
    }
    const result = comparison[strategy];
    const durationHours = Math.max(dataset.length / 60, 1 / 60);
    const hourlyCost = result.totalCost / durationHours;
    const averageInstances = result.totalInstanceHours / durationHours;
    const counts = result.timeseries.map((point) => point.instances);
    const minCount = counts.length ? Math.min(...counts) : 0;
    const maxCount = counts.length ? Math.max(...counts) : 0;
    return {
      instances: strategy === 'fixed' ? '6 static VMs' : `${minCount}–${maxCount} VMs (${averageInstances.toFixed(1)} avg.)`,
      slaCompliance: `${Math.max(0, 100 - result.slaViolationRate).toFixed(1)}% estimated`,
      avgCostPerHour: `$${hourlyCost.toFixed(2)}/hr (~$${(hourlyCost * 24 * 30).toFixed(0)}/30 days)`,
    };
  };

  const strategies = [
    {
      id: 'fixed' as const,
      name: 'Fixed Allocation',
      subtitle: 'Static Capacity (Traditional On-Premises / Legacy Cloud)',
      badge: 'Baseline',
      badgeColor: 'bg-slate-700 text-slate-200 border-slate-600',
      icon: Lock,
      color: 'from-slate-700 to-slate-900 border-slate-700',
      accentColor: 'text-slate-300',
      activeBorder: 'border-slate-400 ring-2 ring-slate-500/40',
      description:
        'Keeps a constant pool of 6 simulated Virtual Machines regardless of incoming workload.',
      howItWorks:
        'The simulated fleet remains fixed at 6 nodes. It does not respond to changes in incoming traffic.',
      pros: ['Predictable capacity and straightforward budgeting', 'No scaling-policy decisions are required'],
      cons: [
        'Can leave capacity idle during low-demand periods',
        'Can breach configured CPU/latency thresholds during demand surges',
      ],
      impact: {
        ...getImpact('fixed'),
      },
    },
    {
      id: 'reactive' as const,
      name: 'Reactive Autoscaling',
      subtitle: 'Threshold-based autoscaling, conceptually similar to common cloud autoscalers',
      badge: 'Industry Standard',
      badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
      icon: Zap,
      color: 'from-amber-950/50 to-slate-900 border-amber-800/40',
      accentColor: 'text-amber-400',
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/40',
      description:
        'Monitors current simulated CPU utilization and applies the configured scale-up/scale-down thresholds and cooldown.',
      howItWorks:
        'Makes decisions from the current observed workload, so it cannot anticipate a spike before the workload changes. Real VM boot and warm-up delays are not modelled by this simulator.',
      pros: ['Can reduce idle capacity when demand falls', 'Responds automatically to configured thresholds'],
      cons: [
        'Cannot anticipate demand before it is observed',
        'Results depend on thresholds, cooldown and workload shape',
      ],
      impact: {
        ...getImpact('reactive'),
      },
    },
    {
      id: 'predictive' as const,
      name: 'Predictive Scaling (Trend Baseline)',
      subtitle: 'Short-horizon trend heuristic used by the strategy cost comparison',
      badge: 'Forecast-based',
      badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60',
      icon: Sparkles,
      color: 'from-indigo-950/60 to-slate-900 border-indigo-700/50',
      accentColor: 'text-cyan-400',
      activeBorder: 'border-cyan-400 ring-2 ring-cyan-500/40',
      description:
        'The comparison benchmark extrapolates recent observed RPS trend. The separate ML Pipeline trains and evaluates the browser model.',
      howItWorks:
        'The comparison uses only current and past rows to estimate short-horizon demand. It does not read future rows, use the trained ML model, or provision real VMs.',
      pros: [
        'Can allocate ahead when the recent trend indicates rising demand',
        'Uses only observations available at the current step',
      ],
      cons: ['This benchmark is a trend heuristic, not the trained ML model', 'Does not guarantee lower cost or fewer SLA breaches'],
      impact: {
        ...getImpact('predictive'),
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-950/50">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Autoscaling Strategies: Operational Guide & Live Telemetry
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Explainer
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Understand what each strategy does, why it scales, and what the live dashboard shows.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Summary */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Currently Active:</span>
            <span className="font-semibold px-2 py-0.5 rounded bg-indigo-900/60 border border-indigo-700/70 text-indigo-200 uppercase tracking-wider text-[11px]">
              {activeStrategy === 'fixed'
                ? 'Fixed Resource Allocation'
                : activeStrategy === 'reactive'
                ? 'Reactive Autoscaling (Thresholds)'
                : 'CloudPilot Predictive AI'}
            </span>
          </div>
          <div className="flex items-center space-x-4 font-mono text-slate-300">
            <div className="flex items-center space-x-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span>{runningVms} Active VMs</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span>{currentMetric ? `${currentMetric.cpu_usage.toFixed(1)}% Cluster CPU` : 'No workload loaded'}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              <span>${currentCost}/hr</span>
            </div>
          </div>
        </div>

        {/* 3 Strategy Comparison Cards */}
        <p className="text-[11px] text-slate-500">SLA and cost values are calculated from the loaded workload using the simulator's one-minute-per-row assumption. They are estimates, not production measurements. Load a dataset to populate them.</p>
        <div className="mt-5 space-y-4 overflow-y-auto pr-1 flex-1">
          {strategies.map((strat) => {
            const Icon = strat.icon;
            const isCurrent = activeStrategy === strat.id;

            return (
              <div
                key={strat.id}
                className={`p-5 rounded-xl border transition-all ${
                  isCurrent
                    ? `${strat.activeBorder} bg-slate-800/90 shadow-lg`
                    : 'bg-slate-800/40 border-slate-700/70 hover:border-slate-600'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br ${strat.color}`}
                    >
                      <Icon className={`w-5 h-5 ${strat.accentColor}`} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-bold text-white">{strat.name}</h3>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${strat.badgeColor}`}>
                          {strat.badge}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-300 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                            <span>ACTIVE NOW</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{strat.subtitle}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveStrategy(strat.id);
                    }}
                    className={`text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-all self-start md:self-auto ${
                      isCurrent
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/50 cursor-default'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/30'
                    }`}
                  >
                    <span>{isCurrent ? 'Currently Active' : 'Switch To This Strategy'}</span>
                    {!isCurrent && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <p className="text-xs text-slate-200 mt-3 leading-relaxed">{strat.description}</p>
                <p className="text-xs text-slate-400 mt-1.5 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="font-semibold text-slate-300">Mechanism: </span>
                  {strat.howItWorks}
                </p>

                {/* Pros and Cons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs">
                  <div className="space-y-1.5 bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
                    <span className="font-semibold text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Advantages</span>
                    </span>
                    <ul className="space-y-1 text-slate-300 text-[11px] list-disc list-inside">
                      {strat.pros.map((p, idx) => (
                        <li key={idx}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-1.5 bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
                    <span className="font-semibold text-rose-400 flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Limitations / Vulnerabilities</span>
                    </span>
                    <ul className="space-y-1 text-slate-300 text-[11px] list-disc list-inside">
                      {strat.cons.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Benchmark Metrics */}
                <div className="mt-3 pt-3 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center space-x-1 text-slate-400">
                    <span>Fleet Size:</span>
                    <span className="font-mono text-slate-200 font-semibold">{strat.impact.instances}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-slate-400">
                    <span>SLA Compliance:</span>
                    <span className="font-mono text-cyan-300 font-semibold">{strat.impact.slaCompliance}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-slate-400">
                    <span>Projected Run Rate:</span>
                    <span className="font-mono text-amber-300 font-semibold">{strat.impact.avgCostPerHour}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Click any strategy button above or in the navigation bar to switch algorithms instantly.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

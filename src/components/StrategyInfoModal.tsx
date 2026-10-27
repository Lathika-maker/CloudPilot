import React from 'react';
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

interface StrategyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StrategyInfoModal: React.FC<StrategyInfoModalProps> = ({ isOpen, onClose }) => {
  const { activeStrategy, setActiveStrategy, virtualInstances, currentMetric, scalingPolicy } = useCloudPilot();

  if (!isOpen) return null;

  const runningVms = virtualInstances.filter((v) => v.status === 'RUNNING').length;
  const currentCost = (runningVms * scalingPolicy.costPerInstanceHour).toFixed(2);

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
        'Statically provisions a constant pool of 6 Virtual Machines (24/7) regardless of incoming workload.',
      howItWorks:
        'No scaling events are ever dispatched. Instances stay frozen at 6 nodes. Does not react to traffic spikes or drops.',
      pros: ['Predictable fixed billing ($0.60/hr)', 'Zero configuration or scaling delay'],
      cons: [
        'Overpays heavily during quiet night hours (idle resource waste)',
        'Server overload and severe SLA latency crashes during unexpected traffic surges',
      ],
      impact: {
        instances: '6 static VMs',
        slaCompliance: '~62% (SLA breaches under surges)',
        avgCostPerHour: '$0.60/hr ($432/mo)',
      },
    },
    {
      id: 'reactive' as const,
      name: 'Reactive Autoscaling',
      subtitle: 'Classic Threshold Scaling (AWS CloudWatch / Kubernetes HPA)',
      badge: 'Industry Standard',
      badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
      icon: Zap,
      color: 'from-amber-950/50 to-slate-900 border-amber-800/40',
      accentColor: 'text-amber-400',
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/40',
      description:
        'Monitors current CPU utilization. Scales UP when CPU > 75%, scales DOWN when CPU < 35%, with a 5-minute cooldown.',
      howItWorks:
        'Evaluates metrics after the spike has already arrived. Because VM boot time takes 2–3 minutes, reactive lag causes temporary SLA breaches before new VMs become healthy.',
      pros: ['Saves money during prolonged lulls compared to Fixed', 'Automated scale-down reduces overnight waste'],
      cons: [
        'Reactive delay (lag): cannot anticipate spikes',
        'Latency spikes & 504 gateway timeouts while instances boot',
      ],
      impact: {
        instances: 'Dynamic (2 – 12 VMs)',
        slaCompliance: '~89% (Lag breaches during ramp-ups)',
        avgCostPerHour: '$0.48/hr ($345/mo)',
      },
    },
    {
      id: 'predictive' as const,
      name: 'CloudPilot Predictive AI',
      subtitle: 'Proactive Machine Learning Orchestrator (Random Forest Regression)',
      badge: 'Recommended',
      badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60',
      icon: Sparkles,
      color: 'from-indigo-950/60 to-slate-900 border-indigo-700/50',
      accentColor: 'text-cyan-400',
      activeBorder: 'border-cyan-400 ring-2 ring-cyan-500/40',
      description:
        'Uses historical time-series ML regression to forecast traffic demand 10 minutes into the future.',
      howItWorks:
        'Proactively triggers instance provisioning 2 minutes before the traffic surge hits, so servers are fully booted and warmed up exactly when needed.',
      pros: [
        'Eliminates VM boot lag completely',
        '99.8% SLA compliance with zero emergency queuing',
        'Cuts cloud infrastructure costs by 28% – 38%',
      ],
      cons: ['Requires trained ML model with at least 50 historical workload points'],
      impact: {
        instances: 'Proactive (1 – 10 VMs optimal)',
        slaCompliance: '99.8% (Zero surge lag)',
        avgCostPerHour: '$0.34/hr ($244/mo)',
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
              <span>{currentMetric?.cpu_usage || 0}% Cluster CPU</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              <span>${currentCost}/hr</span>
            </div>
          </div>
        </div>

        {/* 3 Strategy Comparison Cards */}
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

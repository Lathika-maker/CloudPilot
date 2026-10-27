import React from 'react';
import { useCloudPilot } from '../context/CloudPilotContext';
import {
  Activity,
  BarChart3,
  Cpu,
  Database,
  DollarSign,
  Edit3,
  HelpCircle,
  Layers,
  Play,
  Pause,
  Server,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';

interface NavbarProps {
  onOpenStrategyInfo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenStrategyInfo }) => {
  const {
    activeTab,
    setActiveTab,
    isRunning,
    startSimulation,
    pauseSimulation,
    activeStrategy,
    setActiveStrategy,
    virtualInstances,
    currentMetric,
    activeFailures,
  } = useCloudPilot();

  const navItems = [
    { id: 'home', label: 'Home', icon: Sparkles },
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'dataset', label: 'Datasets', icon: Database },
    { id: 'manual', label: 'Manual Input', icon: Edit3 },
    { id: 'what-if', label: 'What-If Lab', icon: Zap },
    { id: 'simulation', label: 'Simulation', icon: Play },
    { id: 'ml', label: 'ML Pipeline', icon: Layers },
    { id: 'scaling', label: 'Scaling Engine', icon: Sliders },
    { id: 'instances', label: 'VMs & Balancer', icon: Server },
    { id: 'cost', label: 'Cost Analysis', icon: DollarSign },
    { id: 'experiment', label: 'Experiment Mode', icon: BarChart3 },
    { id: 'viva', label: 'Viva & AWS Guide', icon: HelpCircle },
  ];

  const runningVms = virtualInstances.filter((v) => v.status === 'RUNNING').length;

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-md">
      {/* Top Banner with Brand and Telemetry status */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-900/30 group-hover:scale-105 transition-transform">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">
                  CloudPilot <span className="text-cyan-400">AI</span>
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300">
                  v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Predictive Cloud Resource Orchestrator & Cost Optimizer
              </p>
            </div>
          </div>
        </div>

        {/* Live System Status Bar */}
        <div className="flex items-center space-x-3">
          {activeFailures.length > 0 && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-rose-950/80 border border-rose-600 text-rose-300 text-xs animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>{activeFailures.length} Anomaly Injected</span>
            </div>
          )}

          {/* Active Strategy Selector */}
          <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/80 text-xs shadow-inner">
            <button
              onClick={() => setActiveStrategy('fixed')}
              title="Fixed Resource Allocation: 6 static VMs ($0.60/hr). No scaling."
              className={`px-2 py-1 rounded-md font-medium transition-all ${
                activeStrategy === 'fixed'
                  ? 'bg-slate-600 text-white shadow font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Fixed
            </button>
            <button
              onClick={() => setActiveStrategy('reactive')}
              title="Reactive Autoscaling: Threshold rules (>75% scale up, <35% scale down). 5-min cooldown."
              className={`px-2 py-1 rounded-md font-medium transition-all ${
                activeStrategy === 'reactive'
                  ? 'bg-amber-600 text-white shadow font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Reactive
            </button>
            <button
              onClick={() => setActiveStrategy('predictive')}
              title="CloudPilot Predictive AI: 10-min ML workload forecast. Proactive VM provisioning."
              className={`px-2 py-1 rounded-md font-medium transition-all ${
                activeStrategy === 'predictive'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Predictive AI
            </button>
            {onOpenStrategyInfo && (
              <button
                onClick={onOpenStrategyInfo}
                title="What is this strategy for? Click for architecture comparison & live guide"
                className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-700/60 transition-colors ml-0.5"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="hidden lg:flex items-center space-x-2 text-xs font-mono bg-slate-800/70 border border-slate-700/70 px-2.5 py-1 rounded-md">
            <span className="text-slate-400">VMs:</span>
            <span className="text-emerald-400 font-semibold">{runningVms}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">CPU:</span>
            <span
              className={`font-semibold ${
                (currentMetric?.cpu_usage || 0) > 80
                  ? 'text-rose-400'
                  : (currentMetric?.cpu_usage || 0) > 65
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {currentMetric ? `${currentMetric.cpu_usage.toFixed(0)}%` : '--'}
            </span>
          </div>

          {/* Play / Pause simulation toggle */}
          <button
            onClick={isRunning ? pauseSimulation : startSimulation}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow transition-all ${
              isRunning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simulate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="max-w-7xl mx-auto px-4 overflow-x-auto scrollbar-thin border-t border-slate-800/80 bg-slate-900/90">
        <ul className="flex space-x-1 py-1.5 min-w-max text-xs font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-900/40'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
};

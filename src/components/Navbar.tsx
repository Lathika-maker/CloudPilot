import React, { useMemo, useState } from 'react';
import { useCloudPilot } from '../context/CloudPilotContext';
import {
  Activity, BarChart3, Cpu, Database, DollarSign, Edit3, HelpCircle,
  Layers, Play, Pause, Server, Sliders, Sparkles, Zap, ChevronDown,
} from 'lucide-react';

interface NavbarProps { onOpenStrategyInfo?: () => void; }

export const Navbar: React.FC<NavbarProps> = ({ onOpenStrategyInfo }) => {
  const {
    activeTab, setActiveTab, isRunning, startSimulation, pauseSimulation,
    activeStrategy, setActiveStrategy, virtualInstances, currentMetric, activeFailures,
  } = useCloudPilot();
  const [groupOpen, setGroupOpen] = useState(false);

  const groups = useMemo(() => [
    { label: 'Overview', items: [
      { id: 'home', label: 'Home', icon: Sparkles },
      { id: 'dashboard', label: 'Dashboard', icon: Activity },
    ] },
    { label: 'Workloads', items: [
      { id: 'dataset', label: 'Datasets', icon: Database },
      { id: 'manual', label: 'Manual input', icon: Edit3 },
      { id: 'what-if', label: 'What-if lab', icon: Zap },
      { id: 'simulation', label: 'Simulation', icon: Play },
    ] },
    { label: 'Operations', items: [
      { id: 'ml', label: 'ML pipeline', icon: Layers },
      { id: 'scaling', label: 'Scaling policy', icon: Sliders },
      { id: 'instances', label: 'VM fleet', icon: Server },
      { id: 'cost', label: 'Cost analysis', icon: DollarSign },
    ] },
    { label: 'Reference', items: [
      { id: 'report', label: 'Architecture report', icon: BarChart3 },
      { id: 'aws', label: 'AWS deployment guide', icon: HelpCircle },
    ] },
  ], []);
  const navItems = groups.flatMap((group) => group.items);
  const selected = navItems.find((item) => item.id === activeTab) ?? navItems[0];
  const runningVms = virtualInstances.filter((v) => v.status === 'RUNNING').length;

  const navigate = (id: string) => {
    setActiveTab(id);
    setGroupOpen(false);
  };

  return (
    <header className="cp-header sticky top-0 z-50 text-slate-100">
      <div className="cp-topbar">
        <button onClick={() => navigate('home')} className="cp-brand" aria-label="CloudPilot AI home">
          <span className="cp-brand-mark"><Cpu size={19} /></span>
          <span className="cp-brand-copy">
            <span className="cp-brand-title">CloudPilot <span>AI</span></span>
            <span className="cp-brand-subtitle">Predictive cloud orchestration</span>
          </span>
        </button>
        <div className="cp-topbar-actions">
          <div className="cp-live-summary" aria-label="Current simulation summary">
            <span className="cp-status-dot" />
            <span>{runningVms} running</span>
            <span className="cp-summary-divider" />
            <span className="cp-summary-label">CPU</span>
            <strong className={(currentMetric?.cpu_usage || 0) > 80 ? 'cp-metric-danger' : (currentMetric?.cpu_usage || 0) > 65 ? 'cp-metric-warn' : ''}>
              {currentMetric ? `${currentMetric.cpu_usage.toFixed(0)}%` : '—'}
            </strong>
          </div>
          <button
            onClick={isRunning ? pauseSimulation : startSimulation}
            className={`cp-button cp-sim-button ${isRunning ? 'is-running' : ''}`}
            aria-label={isRunning ? 'Pause simulation' : 'Start simulation'}
          >
            {isRunning ? <Pause size={15} /> : <Play size={15} />}
            <span>{isRunning ? 'Pause' : 'Run simulation'}</span>
          </button>
        </div>
      </div>

      <div className="cp-nav-row">
        <nav className="cp-nav-wide" aria-label="Primary navigation">
          {groups.map((group) => (
            <div className="cp-nav-group" key={group.label}>
              <span className="cp-nav-group-label">{group.label}</span>
              <div className="cp-nav-group-items">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button key={item.id} id={`nav-tab-${item.id}`} onClick={() => navigate(item.id)}
                      aria-current={active ? 'page' : undefined} className={`cp-nav-item ${active ? 'active' : ''}`}>
                      <Icon size={15} strokeWidth={1.8} /><span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="cp-nav-compact">
          <button className="cp-current-page" onClick={() => setGroupOpen(!groupOpen)} aria-expanded={groupOpen}>
            {React.createElement(selected.icon, { size: 16 })}
            <span>{selected.label}</span>
            <ChevronDown size={15} className={groupOpen ? 'rotated' : ''} />
          </button>
          {groupOpen && <div className="cp-nav-popover">
            {groups.map((group) => <div key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return <button key={item.id} onClick={() => navigate(item.id)} className={activeTab === item.id ? 'active' : ''}><Icon size={15}/>{item.label}</button>;
              })}
            </div>)}
          </div>}
        </div>
      </div>

      <div className="cp-context-strip">
        <span className={activeFailures.length > 0 ? 'cp-context-alert' : 'cp-context-neutral'}>
          <span className="cp-status-dot" />
          {activeFailures.length > 0
            ? `Simulation mode • ${activeFailures.length} injected incident${activeFailures.length > 1 ? 's' : ''}`
            : 'Simulation mode • no cloud resources are modified'}
        </span>
        <div className="cp-strategy-switch" aria-label="Autoscaling strategy">
          {(['fixed', 'reactive', 'predictive'] as const).map((strategy) => (
            <button key={strategy} onClick={() => setActiveStrategy(strategy)} className={activeStrategy === strategy ? `active ${strategy}` : ''}>
              {strategy === 'fixed' ? 'Fixed' : strategy === 'reactive' ? 'Reactive' : 'Predictive'}
            </button>
          ))}
          {onOpenStrategyInfo && <button aria-label="Explain strategies" className="cp-help-button" onClick={onOpenStrategyInfo}><HelpCircle size={14}/></button>}
        </div>
      </div>
    </header>
  );
};

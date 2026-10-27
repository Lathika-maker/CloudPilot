import React, { useState } from 'react';
import { useCloudPilot } from '../context/CloudPilotContext';
import {
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  Cpu,
  Layers,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Timer,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { AlertResource, AlertSeverity } from '../types/cloudpilot';

interface AlertConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertConfigModal: React.FC<AlertConfigModalProps> = ({ isOpen, onClose }) => {
  const {
    alertConfig,
    updateAlertConfig,
    resetAlertConfig,
    triggerManualAlert,
  } = useCloudPilot();

  const [localConfig, setLocalConfig] = useState(alertConfig);
  const [saveToast, setSaveToast] = useState(false);

  // Sync whenever opened
  React.useEffect(() => {
    if (isOpen) {
      setLocalConfig(alertConfig);
    }
  }, [isOpen, alertConfig]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateAlertConfig(localConfig);
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      onClose();
    }, 600);
  };

  const handleReset = () => {
    resetAlertConfig();
    setLocalConfig(alertConfig);
  };

  const applyPreset = (preset: 'strict' | 'standard' | 'burst' | 'cost') => {
    if (preset === 'strict') {
      setLocalConfig((prev) => ({
        ...prev,
        cpuWarningPercent: 70,
        cpuCriticalPercent: 80,
        memoryWarningPercent: 70,
        memoryCriticalPercent: 82,
        responseTimeWarningMs: 65,
        responseTimeCriticalMs: 110,
      }));
    } else if (preset === 'standard') {
      setLocalConfig((prev) => ({
        ...prev,
        cpuWarningPercent: 75,
        cpuCriticalPercent: 85,
        memoryWarningPercent: 75,
        memoryCriticalPercent: 88,
        responseTimeWarningMs: 80,
        responseTimeCriticalMs: 150,
      }));
    } else if (preset === 'burst') {
      setLocalConfig((prev) => ({
        ...prev,
        cpuWarningPercent: 82,
        cpuCriticalPercent: 92,
        memoryWarningPercent: 82,
        memoryCriticalPercent: 94,
        responseTimeWarningMs: 120,
        responseTimeCriticalMs: 220,
      }));
    } else if (preset === 'cost') {
      setLocalConfig((prev) => ({
        ...prev,
        cpuWarningPercent: 85,
        cpuCriticalPercent: 95,
        memoryWarningPercent: 85,
        memoryCriticalPercent: 95,
        responseTimeWarningMs: 140,
        responseTimeCriticalMs: 250,
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Alert Thresholds Configuration</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Custom Rules
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Define resource utilization percentages that trigger automated warning & critical notifications.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
          {/* Master Enable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${localConfig.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white block">Resource Alert Engine</span>
                <span className="text-xs text-slate-400">
                  Active monitoring will evaluate CPU, memory, and latency against defined thresholds every simulation tick.
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localConfig.enabled}
                onChange={(e) => setLocalConfig((p) => ({ ...p, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Industry Standard Presets
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('strict')}
                className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-slate-700 text-left transition-all hover:bg-slate-800/50"
              >
                <span className="text-xs font-semibold text-rose-300 block">Strict SLA</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">70% Warn / 80% Crit</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('standard')}
                className="p-2.5 rounded-lg border border-indigo-500/40 bg-indigo-950/20 hover:border-indigo-500/60 text-left transition-all"
              >
                <span className="text-xs font-semibold text-indigo-300 block">Standard (AWS/GCP)</span>
                <span className="text-[10px] text-indigo-200/70 block mt-0.5">75% Warn / 85% Crit</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('burst')}
                className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-slate-700 text-left transition-all hover:bg-slate-800/50"
              >
                <span className="text-xs font-semibold text-amber-300 block">High-Burst</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">82% Warn / 92% Crit</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('cost')}
                className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-slate-700 text-left transition-all hover:bg-slate-800/50"
              >
                <span className="text-xs font-semibold text-emerald-300 block">Cost-Optimized</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">85% Warn / 95% Crit</span>
              </button>
            </div>
          </div>

          {/* Threshold Sliders Section */}
          <div className="space-y-5">
            {/* 1. CPU Threshold */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/90 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-rose-400" />
                  <span className="text-sm font-bold text-white">CPU Utilization Thresholds</span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Warn: {localConfig.cpuWarningPercent}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                    Crit: {localConfig.cpuCriticalPercent}%
                  </span>
                </div>
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Warning Level (%)</span>
                    <span className="font-mono text-amber-300">{localConfig.cpuWarningPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max={localConfig.cpuCriticalPercent - 2}
                    value={localConfig.cpuWarningPercent}
                    onChange={(e) =>
                      setLocalConfig((p) => ({
                        ...p,
                        cpuWarningPercent: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Critical Alert Level (%)</span>
                    <span className="font-mono text-rose-400 font-bold">{localConfig.cpuCriticalPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={localConfig.cpuWarningPercent + 2}
                    max="99"
                    value={localConfig.cpuCriticalPercent}
                    onChange={(e) =>
                      setLocalConfig((p) => ({
                        ...p,
                        cpuCriticalPercent: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Visual Zone Bar */}
              <div className="pt-1">
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                  <div
                    style={{ width: `${localConfig.cpuWarningPercent}%` }}
                    className="h-full bg-emerald-500/80"
                    title={`Normal Operational Zone (0% - ${localConfig.cpuWarningPercent}%)`}
                  ></div>
                  <div
                    style={{ width: `${localConfig.cpuCriticalPercent - localConfig.cpuWarningPercent}%` }}
                    className="h-full bg-amber-500"
                    title={`Warning Alert Zone (${localConfig.cpuWarningPercent}% - ${localConfig.cpuCriticalPercent}%)`}
                  ></div>
                  <div
                    style={{ width: `${100 - localConfig.cpuCriticalPercent}%` }}
                    className="h-full bg-rose-500"
                    title={`Critical Escalation Zone (${localConfig.cpuCriticalPercent}% - 100%)`}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>0% Safe</span>
                  <span>{localConfig.cpuWarningPercent}% Warning</span>
                  <span>{localConfig.cpuCriticalPercent}% Critical</span>
                  <span>100% Max</span>
                </div>
              </div>
            </div>

            {/* 2. Memory Threshold */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/90 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-bold text-white">Memory (RAM) Allocation Thresholds</span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Warn: {localConfig.memoryWarningPercent}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                    Crit: {localConfig.memoryCriticalPercent}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Warning Level (%)</span>
                    <span className="font-mono text-amber-300">{localConfig.memoryWarningPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max={localConfig.memoryCriticalPercent - 2}
                    value={localConfig.memoryWarningPercent}
                    onChange={(e) =>
                      setLocalConfig((p) => ({
                        ...p,
                        memoryWarningPercent: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Critical Alert Level (%)</span>
                    <span className="font-mono text-rose-400 font-bold">{localConfig.memoryCriticalPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={localConfig.memoryWarningPercent + 2}
                    max="99"
                    value={localConfig.memoryCriticalPercent}
                    onChange={(e) =>
                      setLocalConfig((p) => ({
                        ...p,
                        memoryCriticalPercent: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Visual Zone Bar */}
              <div className="pt-1">
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                  <div
                    style={{ width: `${localConfig.memoryWarningPercent}%` }}
                    className="h-full bg-cyan-500/80"
                  ></div>
                  <div
                    style={{ width: `${localConfig.memoryCriticalPercent - localConfig.memoryWarningPercent}%` }}
                    className="h-full bg-amber-500"
                  ></div>
                  <div
                    style={{ width: `${100 - localConfig.memoryCriticalPercent}%` }}
                    className="h-full bg-rose-500"
                  ></div>
                </div>
              </div>
            </div>

            {/* 3. Response Time Latency Threshold */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/90 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Timer className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-bold text-white">Response Latency SLA Thresholds</span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Warn: {localConfig.responseTimeWarningMs}ms
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                    SLA Breach: {localConfig.responseTimeCriticalMs}ms
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Warning Latency</span>
                    <span className="font-mono text-amber-300">{localConfig.responseTimeWarningMs} ms</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max={localConfig.responseTimeCriticalMs - 10}
                    step="5"
                    value={localConfig.responseTimeWarningMs}
                    onChange={(e) =>
                      setLocalConfig((p) => ({
                        ...p,
                        responseTimeWarningMs: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Critical SLA Spike</span>
                    <span className="font-mono text-rose-400 font-bold">{localConfig.responseTimeCriticalMs} ms</span>
                  </div>
                  <input
                    type="range"
                    min={localConfig.responseTimeWarningMs + 10}
                    max="400"
                    step="10"
                    value={localConfig.responseTimeCriticalMs}
                    onChange={(e) =>
                      setLocalConfig((p) => ({
                        ...p,
                        responseTimeCriticalMs: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
              <span className="text-xs text-slate-300 flex items-center space-x-2">
                <Bell className="w-3.5 h-3.5 text-indigo-400" />
                <span>In-App Banner Toasts</span>
              </span>
              <input
                type="checkbox"
                checked={localConfig.inAppToast}
                onChange={(e) => setLocalConfig((p) => ({ ...p, inAppToast: e.target.checked }))}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
              <span className="text-xs text-slate-300 flex items-center space-x-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Remediate (Scale On Critical)</span>
              </span>
              <input
                type="checkbox"
                checked={localConfig.autoScaleOnCritical}
                onChange={(e) => setLocalConfig((p) => ({ ...p, autoScaleOnCritical: e.target.checked }))}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
              />
            </label>
          </div>

          {/* Interactive Test Triggers */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Test Notification Triggers</span>
              </span>
              <span className="text-[10px] text-slate-500">Verify notification delivery</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => triggerManualAlert('cpu', 'warning')}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-medium transition-colors"
              >
                ⚠️ Trigger CPU Warning ({localConfig.cpuWarningPercent}%)
              </button>
              <button
                type="button"
                onClick={() => triggerManualAlert('cpu', 'critical')}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-medium transition-colors"
              >
                🚨 Trigger CPU Critical ({localConfig.cpuCriticalPercent}%)
              </button>
              <button
                type="button"
                onClick={() => triggerManualAlert('memory', 'critical')}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-medium transition-colors"
              >
                🚨 Trigger Memory Critical ({localConfig.memoryCriticalPercent}%)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/70">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all"
            >
              {saveToast ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Alert Configuration</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect } from 'react';
import { useCloudPilot } from '../context/CloudPilotContext';
import { Sparkles, Zap, Lock, X, ArrowRight, Server, DollarSign, Info } from 'lucide-react';

interface StrategyNotificationBannerProps {
  onOpenInfoModal: () => void;
}

export const StrategyNotificationBanner: React.FC<StrategyNotificationBannerProps> = ({ onOpenInfoModal }) => {
  const { strategyNotice, dismissStrategyNotice } = useCloudPilot();

  useEffect(() => {
    if (!strategyNotice) return;
    const timer = setTimeout(() => {
      dismissStrategyNotice();
    }, 7000);
    return () => clearTimeout(timer);
  }, [strategyNotice, dismissStrategyNotice]);

  if (!strategyNotice) return null;

  const isFixed = strategyNotice.strategy === 'fixed';
  const isReactive = strategyNotice.strategy === 'reactive';
  const isPredictive = strategyNotice.strategy === 'predictive';

  const getTheme = () => {
    if (isFixed) {
      return {
        bg: 'bg-slate-900/95 border-slate-700',
        badge: 'bg-slate-700 text-slate-200 border-slate-600',
        icon: Lock,
        iconColor: 'text-slate-300',
        iconBg: 'bg-slate-800',
      };
    }
    if (isReactive) {
      return {
        bg: 'bg-amber-950/95 border-amber-600/70',
        badge: 'bg-amber-900/80 text-amber-200 border-amber-600',
        icon: Zap,
        iconColor: 'text-amber-400',
        iconBg: 'bg-amber-900/50',
      };
    }
    return {
      bg: 'bg-slate-900/95 border-cyan-500/80 shadow-cyan-950/40',
      badge: 'bg-cyan-950/90 text-cyan-300 border-cyan-600',
      icon: Sparkles,
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-900/40',
    };
  };

  const theme = getTheme();
  const Icon = theme.icon;

  return (
    <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`p-4 rounded-xl border backdrop-blur-md shadow-2xl text-slate-100 ${theme.bg} transition-all`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme.iconBg}`}>
              <Icon className={`w-4 h-4 ${theme.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  {strategyNotice.title}
                </h4>
                <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${theme.badge}`}>
                  Active
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{strategyNotice.message}</p>
            </div>
          </div>
          <button
            onClick={dismissStrategyNotice}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
          <div className="flex items-center space-x-3 font-mono text-slate-300">
            <span className="flex items-center space-x-1">
              <Server className="w-3 h-3 text-emerald-400" />
              <span>{strategyNotice.instances} VMs</span>
            </span>
            <span className="flex items-center space-x-1">
              <DollarSign className="w-3 h-3 text-amber-400" />
              <span>${strategyNotice.hourlyCost.toFixed(2)}/hr</span>
            </span>
          </div>

          <button
            onClick={onOpenInfoModal}
            className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
          >
            <Info className="w-3 h-3" />
            <span>Explain Strategy</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

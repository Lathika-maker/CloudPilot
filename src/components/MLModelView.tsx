import React, { useState } from 'react';
import { useCloudPilot } from '../context/CloudPilotContext';
import { MLAlgorithm } from '../types/cloudpilot';
import {
  Brain,
  Layers,
  RotateCw,
  Sparkles,
  FlaskConical,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  Line,
} from 'recharts';

export const MLModelView: React.FC = () => {
  const {
    modelMetrics,
    futurePredictions,
    trainMLModel,
    activeModelType,
    setActiveModelType,
    dataset,
    currentIndex,
    jumpToStep,
    setActiveTab,
    activeForecastProvider,
    setActiveForecastProvider,
    forecastWithQuantum,
    quantumMetrics,
  } = useCloudPilot();

  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [selectedHorizon, setSelectedHorizon] = useState<number>(10);
  const [selectedTargetMetric, setSelectedTargetMetric] = useState<string>('requests_per_second');
  const standardTargets = [
    { key: 'requests_per_second', label: 'Requests per second (req/s)' },
    { key: 'active_users', label: 'Active users' },
    { key: 'cpu_usage', label: 'CPU utilization (%)' },
    { key: 'memory_usage', label: 'Memory utilization (%)' },
    { key: 'network_usage', label: 'Network throughput (MB/s)' },
    { key: 'response_time', label: 'Response time / latency (ms)' },
    { key: 'active_instances', label: 'Active instances' },
  ];
  const sourceTargets = Array.from(new Set(dataset.flatMap((point) => Object.keys(point.source_metrics || {}))))
    .map((key) => ({ key: `source:${key}`, label: `${key} (source units)` }));
  const targetOptions = [...standardTargets, ...sourceTargets];
  const selectedTargetLabel = targetOptions.find((option) => option.key === selectedTargetMetric)?.label || selectedTargetMetric;
  const [trainingMessage, setTrainingMessage] = useState<{ success: boolean; message: string } | null>(null);
  const [quantumRequestNotice, setQuantumRequestNotice] = useState<string | null>(null);

  const runTraining = (model: MLAlgorithm) => {
    setIsTraining(true);
    setTrainingMessage(null);
    // Yield to the browser so the busy state is visible before synchronous model fitting.
    setTimeout(() => {
      try {
        const result = trainMLModel({
          modelType: model === 'Random Forest Regressor' ? 'random_forest' : 'autoregressive',
          targetMetric: selectedTargetMetric,
        });
        setTrainingMessage(result);
      } catch (error) {
        setTrainingMessage({
          success: false,
          message: error instanceof Error ? error.message : 'Training failed. Check the selected workload data.',
        });
      } finally {
        setIsTraining(false);
      }
    }, 50);
  };

  const handleRetrain = async () => {
    if (activeForecastProvider === 'quantum') {
      setIsTraining(true);
      setTrainingMessage(null);
      setQuantumRequestNotice(null);
      try {
        const observedHistory = dataset.slice(0, currentIndex + 1).slice(-120);
        // Show immediate feedback while the CPU-based QLSTM request is running.
        setQuantumRequestNotice(`Connecting to FastAPI with ${observedHistory.length} observed CPU records. The first quantum-simulator run may take a while; keep the backend terminal open.`);
        setTrainingMessage(await forecastWithQuantum(observedHistory, selectedHorizon));
        setQuantumRequestNotice(null);
      } catch (error) {
        setQuantumRequestNotice(null);
        setTrainingMessage({ success: false, message: error instanceof Error ? error.message : 'Quantum forecast request failed.' });
      } finally {
        setIsTraining(false);
      }
      return;
    }
    runTraining(activeModelType);
  };
  const quantumModelSelected = activeForecastProvider === 'quantum';
  const displayMae = quantumModelSelected ? quantumMetrics?.mae : modelMetrics?.mae;
  const displayRmse = quantumModelSelected ? quantumMetrics?.rmse : modelMetrics?.rmse;
  const displayMape = quantumModelSelected ? quantumMetrics?.mape : modelMetrics?.mape;
  const displayR2 = quantumModelSelected ? quantumMetrics?.r2 : modelMetrics?.r2;

  // Convert feature importance to chart data
  const featureImportanceObj = quantumModelSelected ? {} : (modelMetrics?.feature_importance || {});
  const featureChartData = Object.entries(featureImportanceObj)
    .map(([feature, weight]) => ({
      feature: feature.replace(/_/g, ' '),
      importance: Number(((Number(weight) || 0) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.importance - a.importance);

  // Future predictions chart
  const predictionPoints = futurePredictions.map((p) => {
    const d = new Date(p.timestamp);
    const timeStr = !isNaN(d.getTime()) ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '+min';
    return {
      time: timeStr,
      predicted: p.predicted,
      lower: p.lowerConfidence,
      upper: p.upperConfidence,
    };
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Title & Retrain Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-bold text-white">Machine Learning Pipeline & Time-Series Engine</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Classical browser forecasting plus an opt-in FastAPI/PennyLane CPU forecasting service.
          </p>
        </div>

        <div className="flex flex-wrap items-center space-x-3 gap-y-2">
          <label className="text-xs text-slate-400 flex items-center gap-2">
            Forecast target
            <select
              value={selectedTargetMetric}
              onChange={(e) => { setSelectedTargetMetric(e.target.value); setTrainingMessage(null); }}
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-3 py-1.5 font-mono max-w-64"
            >
              {targetOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
          </label>
          {/* Provider selection leaves the original classical models on the browser engine. */}
          <div className="flex flex-col gap-1">
            <select
              value={activeForecastProvider === 'quantum' ? 'quantum' : activeModelType}
              onChange={(e) => {
                setTrainingMessage(null);
                if (e.target.value === 'quantum') {
                  setActiveForecastProvider('quantum');
                  setSelectedTargetMetric('cpu_usage');
                } else {
                  setActiveForecastProvider('classical');
                  setActiveModelType(e.target.value as MLAlgorithm);
                }
              }}
              aria-label="Forecasting model"
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-3 py-1.5 font-mono"
            >
              <option value="Random Forest Regressor">Random Forest Regressor (Classical)</option>
              <option value="Autoregressive / Moving Average">Autoregressive / Moving Average (Baseline)</option>
              <option value="quantum">Hybrid-Quantum QLSTM (Experimental API)</option>
            </select>
            {quantumModelSelected && (
              <span title="Requires the local FastAPI quantum simulator; quantum circuits run in the backend, not the browser."
                className="max-w-[360px] rounded-md border border-purple-700/60 bg-purple-950/30 px-2 py-1 text-[10px] leading-relaxed text-purple-200">
                <FlaskConical className="mr-1 inline h-3 w-3" />
                Experimental PennyLane/PyTorch QLSTM simulation. Metrics are computed from the observed CPU history.
              </span>
            )}
          </div>

          <button
            onClick={handleRetrain}
            disabled={isTraining || currentIndex + 1 < 35}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 shadow-md shadow-purple-950/50 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isTraining ? 'animate-spin' : ''}`} />
            <span>{isTraining ? (quantumModelSelected ? 'Running QLSTM...' : 'Training...') : (quantumModelSelected ? 'Run QLSTM Forecast' : 'Retrain Model')}</span>
          </button>
        </div>
      </div>
      {quantumRequestNotice && quantumModelSelected && isTraining && (
        <div role="status" aria-live="polite" className="rounded-lg border border-purple-700/60 bg-purple-950/30 px-3 py-2 text-xs leading-relaxed text-purple-200">
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-purple-400" />{quantumRequestNotice}
        </div>
      )}
      {trainingMessage && (
        <div
          role="status"
          className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${trainingMessage.success ? 'border-emerald-800/60 bg-emerald-950/20 text-emerald-200' : 'border-rose-800/60 bg-rose-950/20 text-rose-200'}`}
        >
          {trainingMessage.message}
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">Observed workload history: {Math.min(currentIndex + 1, dataset.length).toLocaleString()} / {dataset.length.toLocaleString()} records</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Training uses only records at or before the simulation playhead. At least 35 observed records are required, so later rows cannot leak into the forecast.
          </p>
        </div>
        {currentIndex + 1 < 35 && dataset.length >= 35 && (
          <button
            onClick={() => { jumpToStep(34); setTrainingMessage({ success: true, message: 'Playhead moved to record 35. This selects the first 35 records as observed history; it does not replay the skipped scaling events.' }); }}
            className="shrink-0 rounded-lg border border-indigo-500/40 bg-indigo-600/15 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-600/25"
          >
            Use first 35 records as history
          </button>
        )}
        {dataset.length < 35 && (
          <button onClick={() => setActiveTab('dataset')} className="shrink-0 rounded-lg border border-cyan-500/40 bg-cyan-600/15 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-600/25">
            Load a larger dataset
          </button>
        )}
      </div>

      {/* Model Evaluation Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* MAE */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block">{quantumModelSelected ? 'Holdout MAE' : 'Mean Absolute Error (MAE)'}</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-cyan-400">
              {displayMae != null ? displayMae.toFixed(2) : '—'}
            </span>
            <span className="text-xs font-mono text-slate-500">{quantumModelSelected ? 'CPU % points' : (selectedTargetMetric === 'requests_per_second' ? 'req/s' : 'target units')}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">{quantumModelSelected ? 'Chronological holdout MAE in CPU percentage points' : 'Average absolute error in selected target units'}</span>
        </div>

        {/* RMSE */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block">Root Mean Squared Error (RMSE)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-purple-400">
              {displayRmse != null ? displayRmse.toFixed(2) : '—'}
            </span>
            <span className="text-xs font-mono text-slate-500">{quantumModelSelected ? 'CPU % points' : (selectedTargetMetric === 'requests_per_second' ? 'req/s' : 'target units')}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Penalizes large errors in selected target units</span>
        </div>

        {/* MAPE */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block">Mean Absolute Percentage Error (MAPE)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {displayMape != null ? `${displayMape.toFixed(1)}%` : '—'}
            </span>
            <span className="text-xs font-mono text-slate-500">{displayMape != null ? (quantumModelSelected ? "API holdout" : "Measured") : "Not evaluated"}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Mean Absolute Percentage Error</span>
        </div>

        {/* R2 Score */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block">{quantumModelSelected ? 'Model Alignment (R²)' : 'Coefficient of Determination (R²)'}</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-indigo-400">
              {displayR2 != null ? displayR2.toFixed(3) : '—'}
            </span>
            <span className="text-xs font-mono text-slate-500">Max 1.0</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">{quantumModelSelected ? 'Chronological holdout R² from the API model' : 'Explained variance proportion'}</span>
        </div>
      </div>

      {/* Two Column Layout: Feature Importance (Left) & Forecast Bands (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Feature Engineering & Feature Importance */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Feature Scores (normalized)
              </h2>
              <p className="text-[11px] text-slate-500">
                {quantumModelSelected ? 'The quantum recurrent model does not expose the browser tree-engine feature-importance scores.' : 'Tree split gains or normalized absolute baseline coefficients; scores are derived from the fitted model.'}
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>

          <div className="h-64 w-full relative">
            {featureChartData.length === 0 && (
              <div className="absolute inset-0 z-10 grid place-items-center rounded-lg border border-dashed border-slate-800 bg-slate-950/40 px-6 text-center text-xs leading-relaxed text-slate-500">
                {quantumModelSelected ? 'Feature importance is not produced by the quantum recurrent model.' : 'Feature scores appear after a successful training run on the observed history.'}
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureChartData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={11} unit="%" />
                <YAxis dataKey="feature" type="category" stroke="#94a3b8" fontSize={10} width={90} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val}%`, 'Importance']}
                />
                <Bar dataKey="importance" fill="#a855f7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1 font-mono text-[11px]">
            <p><strong>Observed History Points:</strong> {quantumModelSelected ? (quantumMetrics?.observations_used ?? '—') : (modelMetrics?.sample_size != null ? Number(modelMetrics.sample_size).toLocaleString() : '—')} records</p>
            <p><strong>Split Strategy:</strong> Chronological 80/20 (No future leakage)</p>
            <p><strong>Last Trained:</strong> {quantumModelSelected ? (quantumMetrics?.generated_at ? new Date(quantumMetrics.generated_at).toLocaleTimeString() : 'API not run') : (modelMetrics?.trained_at || modelMetrics?.trainedAt ? new Date(modelMetrics.trained_at || modelMetrics.trainedAt).toLocaleTimeString() : 'Not trained')}</p>
          </div>
        </div>

        {/* Multi-Step Prediction Forecast with Confidence Intervals */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Workload Forecast — {selectedTargetLabel}
              </h2>
              <p className="text-[11px] text-slate-500">
                Recursive forecast for the selected horizon. Shaded bands estimate model spread; they are not calibrated 95% confidence intervals.
              </p>
            </div>

            {/* Horizon Selector */}
            <div className="flex items-center space-x-1 text-xs">
              {[5, 10].map((h) => (
                <button
                  key={h}
                  onClick={() => setSelectedHorizon(h)}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                    selectedHorizon === h
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  +{h}m
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full relative">
            {predictionPoints.length === 0 && (
              <div className="absolute inset-0 z-10 grid place-items-center rounded-lg border border-dashed border-slate-800 bg-slate-950/40 px-6 text-center text-xs leading-relaxed text-slate-500">
                {quantumModelSelected ? 'Run the API forecast after selecting at least 35 observed records. Returned CPU predictions appear here.' : 'Train the model after selecting at least 35 observed records. Forecasts use only data at or before the current playhead.'}
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={predictionPoints.slice(0, selectedHorizon)} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="upper"
                  name="Upper forecast band"
                  stroke="transparent"
                  fill="#c084fc"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  name="Lower forecast band"
                  stroke="transparent"
                  fill="#c084fc"
                  fillOpacity={0.1}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name={`Predicted ${selectedTargetLabel}`}
                  stroke="#a855f7"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#c084fc' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-purple-950/30 rounded-lg border border-purple-800/40 text-xs text-purple-200 flex items-center justify-between">
            <span>
              {quantumModelSelected ? 'CPU forecasts come from FastAPI/PennyLane and can drive the simulator through its CPU-specific capacity adapter. ' : ''}
              {selectedTargetMetric.startsWith('source:') ? 'This forecast is in source-column units. Autoscaling therefore falls back to observed RPS thresholds rather than treating this metric as RPS. ' : ''}
              Forecast-guided scaling is a simulation policy. Real VM provisioning and boot-time latency are not connected or measured here.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

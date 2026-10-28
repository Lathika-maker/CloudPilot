import { WorkloadMetric, MLModelConfig, MLMetrics, PredictionPoint } from '../types/cloudpilot';

/**
 * Feature vector representation for time-series forecasting.
 */
export interface FeatureVector {
  hourSin: number;
  hourCos: number;
  minuteSin: number;
  minuteCos: number;
  dayOfWeek: number;
  lag1: number;
  lag2: number;
  lag5: number;
  rollingMean5: number;
  rollingMean15: number;
  rollingStd5: number;
  trend: number;
}

/**
 * Decision tree node for Random Forest implementation.
 */
interface TreeNode {
  isLeaf: boolean;
  value?: number;
  featureIndex?: number;
  threshold?: number;
  gain?: number;
  left?: TreeNode;
  right?: TreeNode;
}

/**
 * Real Decision Tree Regressor implemented for browser/Node environment.
 */
class DecisionTreeRegressor {
  root: TreeNode | null = null;
  maxDepth: number;
  minSamplesSplit: number;

  constructor(maxDepth = 6, minSamplesSplit = 4) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  fit(X: number[][], y: number[]) {
    this.root = this.buildTree(X, y, 0);
  }

  private calculateVariance(y: number[]): number {
    if (y.length === 0) return 0;
    const mean = y.reduce((a, b) => a + b, 0) / y.length;
    return y.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / y.length;
  }

  private buildTree(X: number[][], y: number[], depth: number): TreeNode {
    const nSamples = X.length;
    const nFeatures = X[0]?.length || 0;

    if (depth >= this.maxDepth || nSamples < this.minSamplesSplit) {
      const meanVal = y.reduce((a, b) => a + b, 0) / (nSamples || 1);
      return { isLeaf: true, value: meanVal };
    }

    let bestVarReduction = -1;
    let bestFeatureIndex = -1;
    let bestThreshold = 0;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    const currentVar = this.calculateVariance(y);

    // Random subset of features (Random Forest feature subsampling)
    const featureIndices: number[] = [];
    for (let f = 0; f < nFeatures; f++) {
      if (Math.random() > 0.3) featureIndices.push(f);
    }
    if (featureIndices.length === 0) featureIndices.push(0);

    for (const fIdx of featureIndices) {
      // Sample up to 10 quantiles for split evaluation
      const values = X.map((row) => row[fIdx]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      if (min === max) continue;

      const step = (max - min) / 6;
      for (let s = 1; s <= 5; s++) {
        const threshold = min + s * step;
        const leftIdx: number[] = [];
        const rightIdx: number[] = [];

        for (let i = 0; i < nSamples; i++) {
          if (X[i][fIdx] <= threshold) leftIdx.push(i);
          else rightIdx.push(i);
        }

        if (leftIdx.length === 0 || rightIdx.length === 0) continue;

        const leftY = leftIdx.map((i) => y[i]);
        const rightY = rightIdx.map((i) => y[i]);

        const varLeft = this.calculateVariance(leftY);
        const varRight = this.calculateVariance(rightY);

        const varReduction =
          currentVar -
          (leftIdx.length / nSamples) * varLeft -
          (rightIdx.length / nSamples) * varRight;

        if (varReduction > bestVarReduction) {
          bestVarReduction = varReduction;
          bestFeatureIndex = fIdx;
          bestThreshold = threshold;
          bestLeftIndices = leftIdx;
          bestRightIndices = rightIdx;
        }
      }
    }

    if (bestVarReduction <= 0.001 || bestLeftIndices.length === 0 || bestRightIndices.length === 0) {
      const meanVal = y.reduce((a, b) => a + b, 0) / (nSamples || 1);
      return { isLeaf: true, value: meanVal };
    }

    const leftX = bestLeftIndices.map((i) => X[i]);
    const leftY = bestLeftIndices.map((i) => y[i]);
    const rightX = bestRightIndices.map((i) => X[i]);
    const rightY = bestRightIndices.map((i) => y[i]);

    return {
      isLeaf: false,
      featureIndex: bestFeatureIndex,
      threshold: bestThreshold,
      gain: bestVarReduction * nSamples,
      left: this.buildTree(leftX, leftY, depth + 1),
      right: this.buildTree(rightX, rightY, depth + 1),
    };
  }

  predictRow(row: number[], node: TreeNode | null): number {
    if (!node) return 0;
    if (node.isLeaf) return node.value ?? 0;
    if (node.featureIndex !== undefined && node.threshold !== undefined) {
      if (row[node.featureIndex] <= node.threshold) {
        return this.predictRow(row, node.left || null);
      } else {
        return this.predictRow(row, node.right || null);
      }
    }
    return node.value ?? 0;
  }

  getFeatureImportances(featureCount: number): number[] {
    const importances = new Array(featureCount).fill(0);
    const visit = (node: TreeNode | null | undefined) => {
      if (!node || node.isLeaf) return;
      if (node.featureIndex !== undefined && node.featureIndex >= 0 && node.featureIndex < featureCount) {
        importances[node.featureIndex] += node.gain ?? 0;
      }
      visit(node.left);
      visit(node.right);
    };
    visit(this.root);
    return importances;
  }
}

/**
 * Random Forest Regressor comprising multiple bootstrapped decision trees.
 */
export class RandomForestRegressor {
  trees: DecisionTreeRegressor[] = [];
  nEstimators: number;
  maxDepth: number;

  constructor(nEstimators = 12, maxDepth = 6) {
    this.nEstimators = nEstimators;
    this.maxDepth = maxDepth;
  }

  fit(X: number[][], y: number[]) {
    this.trees = [];
    const nSamples = X.length;

    for (let t = 0; t < this.nEstimators; t++) {
      // Bootstrap sampling with replacement (75% sample)
      const bootX: number[][] = [];
      const bootY: number[] = [];
      const sampleSize = Math.floor(nSamples * 0.75);

      for (let i = 0; i < sampleSize; i++) {
        const randIdx = Math.floor(Math.random() * nSamples);
        bootX.push(X[randIdx]);
        bootY.push(y[randIdx]);
      }

      const tree = new DecisionTreeRegressor(this.maxDepth, 4);
      tree.fit(bootX, bootY);
      this.trees.push(tree);
    }
  }

  predict(X: number[][]): number[] {
    return X.map((row) => {
      const preds = this.trees.map((t) => t.predictRow(row, t.root));
      return preds.reduce((a, b) => a + b, 0) / preds.length;
    });
  }

  predictSingle(row: number[]): { mean: number; std: number } {
    const preds = this.trees.map((t) => t.predictRow(row, t.root));
    const mean = preds.reduce((a, b) => a + b, 0) / preds.length;
    const variance = preds.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / preds.length;
    return { mean, std: Math.sqrt(variance) };
  }

  getFeatureImportances(featureCount: number): number[] {
    const totals = new Array(featureCount).fill(0);
    for (const tree of this.trees) {
      tree.getFeatureImportances(featureCount).forEach((gain, index) => {
        totals[index] += gain;
      });
    }
    const total = totals.reduce((sum, value) => sum + value, 0);
    return total > 0 ? totals.map((value) => value / total) : totals;
  }
}

/**
 * Autoregressive Linear Model with regularized ridge estimation.
 */
export class AutoregressiveModel {
  weights: number[] = [];
  bias: number = 0;

  fit(X: number[][], y: number[]) {
    const n = X.length;
    if (n === 0) return;
    const p = X[0].length;
    this.weights = new Array(p).fill(0);
    this.bias = y.reduce((a, b) => a + b, 0) / n;

    // Gradient descent with L2 regularization
    const lr = 0.005;
    const lambda = 0.01;
    const epochs = 250;

    for (let epoch = 0; epoch < epochs; epoch++) {
      const gradW = new Array(p).fill(0);
      let gradB = 0;

      for (let i = 0; i < n; i++) {
        const pred = this.predictRow(X[i]);
        const err = pred - y[i];
        gradB += err;
        for (let j = 0; j < p; j++) {
          gradW[j] += err * X[i][j];
        }
      }

      this.bias -= (lr * gradB) / n;
      for (let j = 0; j < p; j++) {
        this.weights[j] -= lr * ((gradW[j] / n) + lambda * this.weights[j]);
      }
    }
  }

  predictRow(row: number[]): number {
    let sum = this.bias;
    for (let j = 0; j < row.length; j++) {
      sum += (this.weights[j] || 0) * row[j];
    }
    return sum;
  }

  predict(X: number[][]): number[] {
    return X.map((r) => this.predictRow(r));
  }

  getFeatureImportances(): number[] {
    const magnitudes = this.weights.map((weight) => Math.abs(weight));
    const total = magnitudes.reduce((sum, value) => sum + value, 0);
    return total > 0 ? magnitudes.map((value) => value / total) : magnitudes;
  }
}

export class MLEngine {
  private rfModel: RandomForestRegressor | null = null;
  private arModel: AutoregressiveModel | null = null;

  /** Clear trained state whenever the workload dataset changes. */
  reset(): void {
    this.rfModel = null;
    this.arModel = null;
    this.metrics = null;
    this.isTrained = false;
  }
  private currentConfig: MLModelConfig = {
    modelType: 'random_forest',
    targetMetric: 'requests_per_second',
    horizonMinutes: 10,
    trainRatio: 0.8,
    lags: [1, 2, 5],
  };
  private metrics: MLMetrics | null = null;
  private isTrained: boolean = false;
  private featureNames: string[] = [
    'Hour (Sin)',
    'Hour (Cos)',
    'Minute (Sin)',
    'Minute (Cos)',
    'Day of Week',
    'Lag 1 (Previous step)',
    'Lag 2 (Two steps back)',
    'Lag 5 (Five steps back)',
    'Rolling Mean (5-step)',
    'Rolling Mean (15-step)',
    'Rolling Std (5-step)',
    'Trend Delta',
  ];

  private getMetricValue(metric: WorkloadMetric, targetKey: string): number {
    if (targetKey.startsWith('source:')) {
      const value = metric.source_metrics?.[targetKey.slice('source:'.length)];
      return typeof value === 'number' && Number.isFinite(value) ? value : 0;
    }
    const value = (metric as unknown as Record<string, unknown>)[targetKey];
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  /**
   * Extracts engineered features from raw metric series.
   */
  extractFeatures(data: WorkloadMetric[], targetKey: string): {
    X: number[][];
    y: number[];
    timestamps: string[];
  } {
    const y: number[] = [];
    const timestamps: string[] = [];

    const featureRows: number[][] = [];

    for (let i = 15; i < data.length; i++) {
      const item = data[i];
      const targetVal = this.getMetricValue(item, targetKey);
      const date = new Date(item.timestamp);

      const hour = isNaN(date.getUTCHours()) ? 12 : date.getUTCHours();
      const minute = isNaN(date.getUTCMinutes()) ? 0 : date.getUTCMinutes();
      const day = isNaN(date.getUTCDay()) ? 3 : date.getUTCDay();

      // Cyclical time encoding
      const hourSin = Math.sin((hour / 24) * 2 * Math.PI);
      const hourCos = Math.cos((hour / 24) * 2 * Math.PI);
      const minuteSin = Math.sin((minute / 60) * 2 * Math.PI);
      const minuteCos = Math.cos((minute / 60) * 2 * Math.PI);

      // Lag features
      const lag1 = this.getMetricValue(data[i - 1], targetKey);
      const lag2 = this.getMetricValue(data[i - 2], targetKey);
      const lag5 = this.getMetricValue(data[i - 5], targetKey);

      // Rolling window features
      const slice5 = data.slice(i - 5, i).map((d) => this.getMetricValue(d, targetKey));
      const rollingMean5 = slice5.reduce((a, b) => a + b, 0) / 5;

      const slice15 = data.slice(i - 15, i).map((d) => this.getMetricValue(d, targetKey));
      const rollingMean15 = slice15.reduce((a, b) => a + b, 0) / 15;

      const variance5 = slice5.reduce((sum, v) => sum + Math.pow(v - rollingMean5, 2), 0) / 5;
      const rollingStd5 = Math.sqrt(variance5);

      const trend = lag1 - lag2;

      featureRows.push([
        hourSin,
        hourCos,
        minuteSin,
        minuteCos,
        day / 7,
        lag1,
        lag2,
        lag5,
        rollingMean5,
        rollingMean15,
        rollingStd5,
        trend,
      ]);

      y.push(targetVal);
      timestamps.push(item.timestamp);
    }

    return { X: featureRows, y, timestamps };
  }

  /**
   * Performs Time-Series-Aware chronological Train/Test split without random shuffling.
   */
  train(
    data: WorkloadMetric[],
    config: Partial<MLModelConfig> = {}
  ): { success: boolean; message: string; metrics?: MLMetrics } {
    this.currentConfig = { ...this.currentConfig, ...config };

    if (!data || data.length < 35) {
      return {
        success: false,
        message: 'Insufficient data for reliable prediction. At least 35 records required.',
      };
    }

    const { X, y } = this.extractFeatures(data, this.currentConfig.targetMetric);
    if (X.length < 20) {
      return {
        success: false,
        message: 'Insufficient engineered feature points for time-series validation.',
      };
    }

    // STRICT Time-Series Aware Chronological Split (NO random shuffling)
    const splitIndex = Math.floor(X.length * this.currentConfig.trainRatio);
    const X_train = X.slice(0, splitIndex);
    const y_train = y.slice(0, splitIndex);
    const X_test = X.slice(splitIndex);
    const y_test = y.slice(splitIndex);

    let testPredictions: number[] = [];

    if (this.currentConfig.modelType === 'random_forest') {
      const rf = new RandomForestRegressor(16, 7);
      rf.fit(X_train, y_train);
      this.rfModel = rf;
      this.arModel = null;
      testPredictions = rf.predict(X_test);
    } else {
      const ar = new AutoregressiveModel();
      ar.fit(X_train, y_train);
      this.arModel = ar;
      this.rfModel = null;
      testPredictions = ar.predict(X_test);
    }

    // Calculate real mathematical evaluation metrics
    const n = y_test.length;
    let sumAbsErr = 0;
    let sumSqErr = 0;
    let sumAbsolutePercentageError = 0;
    let percentageErrorCount = 0;
    const yTestMean = y_test.reduce((a, b) => a + b, 0) / n;
    let totalSumSquares = 0;

    for (let i = 0; i < n; i++) {
      const actual = y_test[i];
      const err = actual - testPredictions[i];
      sumAbsErr += Math.abs(err);
      sumSqErr += err * err;
      totalSumSquares += Math.pow(actual - yTestMean, 2);
      // MAPE is undefined for zero-valued targets; omit those points from its denominator.
      if (Math.abs(actual) > Number.EPSILON) {
        sumAbsolutePercentageError += Math.abs(err / actual);
        percentageErrorCount += 1;
      }
    }

    const mae = Math.round((sumAbsErr / n) * 100) / 100;
    const rmse = Math.round(Math.sqrt(sumSqErr / n) * 100) / 100;
    const r2 =
      totalSumSquares === 0
        ? 1.0
        : Math.round((1 - sumSqErr / totalSumSquares) * 1000) / 1000;
    const mape = percentageErrorCount > 0
      ? Math.round((sumAbsolutePercentageError / percentageErrorCount) * 1000) / 10
      : undefined;

    // Derive feature scores from observed tree split gains or normalized baseline coefficient magnitudes.
    const featureNames = [
      'hour_sin', 'hour_cos', 'minute_sin', 'minute_cos', 'day_of_week',
      'lag_1', 'lag_2', 'lag_5', 'rolling_mean_5m', 'rolling_mean_15m',
      'rolling_std_5m', 'trend_delta',
    ];
    const rawFeatureScores = this.currentConfig.modelType === 'autoregressive'
      ? (this.arModel?.getFeatureImportances() ?? [])
      : (this.rfModel?.getFeatureImportances(featureNames.length) ?? []);
    const scoreTotal = rawFeatureScores.reduce((sum, value) => sum + value, 0);
    const featureWeights = featureNames.map((name, index) => ({
      name,
      weight: scoreTotal > 0 ? rawFeatureScores[index] / scoreTotal : 0,
    }));

    this.metrics = {
      mae,
      rmse,
      r2,
      mape,
      sampleCount: data.length,
      trainedAt: new Date().toISOString(),
      modelType: this.currentConfig.modelType,
      targetMetric: this.currentConfig.targetMetric,
      featureImportance: featureWeights,
    };

    this.isTrained = true;

    return {
      success: true,
      message: `Model successfully trained on ${X_train.length} chronological samples and evaluated on ${X_test.length} test samples.`,
      metrics: this.metrics,
    };
  }

  /**
   * Predicts future workload for given horizon from the current historical window.
   */
  predictFuture(
    recentHistory: WorkloadMetric[],
    horizonSteps: number = 10,
    intervalMinutes: number = 1
  ): PredictionPoint[] {
    if (!this.isTrained) {
      throw new Error('Model not trained yet.');
    }

    if (!recentHistory || recentHistory.length < 15) {
      throw new Error('Insufficient data for reliable prediction. At least 15 historical points needed.');
    }

    const targetKey = this.currentConfig.targetMetric;
    const sourceTarget = targetKey.startsWith('source:');
    const simulatedHistory = [...recentHistory];
    const predictions: PredictionPoint[] = [];

    const lastTime = new Date(recentHistory[recentHistory.length - 1].timestamp).getTime();

    for (let step = 1; step <= horizonSteps; step++) {
      const predTime = new Date(lastTime + step * intervalMinutes * 60 * 1000).toISOString();
      const n = simulatedHistory.length;

      const date = new Date(predTime);
      const hour = date.getUTCHours();
      const minute = date.getUTCMinutes();
      const day = date.getUTCDay();

      const hourSin = Math.sin((hour / 24) * 2 * Math.PI);
      const hourCos = Math.cos((hour / 24) * 2 * Math.PI);
      const minuteSin = Math.sin((minute / 60) * 2 * Math.PI);
      const minuteCos = Math.cos((minute / 60) * 2 * Math.PI);

      const lag1 = this.getMetricValue(simulatedHistory[n - 1], targetKey);
      const lag2 = this.getMetricValue(simulatedHistory[n - 2], targetKey);
      const lag5 = this.getMetricValue(simulatedHistory[n - 5], targetKey);

      const slice5 = simulatedHistory.slice(n - 5, n).map((d) => this.getMetricValue(d, targetKey));
      const rollingMean5 = slice5.reduce((a, b) => a + b, 0) / 5;

      const slice15 = simulatedHistory.slice(n - 15, n).map((d) => this.getMetricValue(d, targetKey));
      const rollingMean15 = slice15.reduce((a, b) => a + b, 0) / 15;

      const variance5 = slice5.reduce((sum, v) => sum + Math.pow(v - rollingMean5, 2), 0) / 5;
      const rollingStd5 = Math.sqrt(variance5);

      const trend = lag1 - lag2;

      const featureRow = [
        hourSin,
        hourCos,
        minuteSin,
        minuteCos,
        day / 7,
        lag1,
        lag2,
        lag5,
        rollingMean5,
        rollingMean15,
        rollingStd5,
        trend,
      ];

      let predictedVal = 0;
      let stdDev = 15;

      if (this.rfModel) {
        const res = this.rfModel.predictSingle(featureRow);
        predictedVal = res.mean;
        stdDev = Math.max(8, res.std * (1 + step * 0.08));
      } else if (this.arModel) {
        predictedVal = this.arModel.predictRow(featureRow);
        stdDev = 12 * (1 + step * 0.06);
      }

      predictedVal = Math.max(10, Math.round(predictedVal));

      // Append into simulated history so multi-step recursive autoregression works
      const dummyMetric: WorkloadMetric = {
        timestamp: predTime,
        ...(sourceTarget ? { source_metrics: { [targetKey.slice('source:'.length)]: predictedVal } } : {}),
        cpu_usage: 65,
        memory_usage: 50,
        network_usage: predictedVal * 0.03,
        requests_per_second: targetKey === 'requests_per_second' ? predictedVal : 0,
        active_users: targetKey === 'active_users' ? predictedVal : 0,
        response_time: 25,
        active_instances: Math.max(1, Math.ceil(predictedVal / 250)),
      };
      simulatedHistory.push(dummyMetric);

      const lowerConfidence = Math.max(0, Math.round(predictedVal - 1.96 * stdDev));
      const upperConfidence = Math.round(predictedVal + 1.96 * stdDev);

      // Estimate required instances from prediction (Capacity ~250 RPS at target 70% CPU)
      // Capacity recommendations are valid only when the forecast target is requests/second.
      // Other metrics are forecast in their source units and must not be silently converted to RPS.
      const hasRpsCapacityModel = targetKey === 'requests_per_second';
      const recommendedInstances = hasRpsCapacityModel ? Math.max(1, Math.ceil(predictedVal / (250 * 0.70))) : undefined;
      const cpuRequired = hasRpsCapacityModel && recommendedInstances
        ? Math.min(99, Math.max(15, Math.round((predictedVal / (recommendedInstances * 250)) * 70)))
        : undefined;
      const memoryRequired = hasRpsCapacityModel
        ? Math.min(95, Math.max(25, Math.round(38 + (predictedVal / 1200) * 35)))
        : undefined;

      predictions.push({
        timestamp: predTime,
        predicted: predictedVal,
        lowerConfidence,
        upperConfidence,
        cpuRequired,
        memoryRequired,
        ...(recommendedInstances !== undefined ? { recommendedInstances } : {}),
        ...(cpuRequired !== undefined ? { cpuRequired } : {}),
        ...(memoryRequired !== undefined ? { memoryRequired } : {}),
      });
    }

    return predictions;
  }

  predictSingle(
    historySlice: WorkloadMetric[],
    targetKey: string = 'requests_per_second'
  ): number {
    if (!this.isTrained || !historySlice || historySlice.length < 15) {
      const last = historySlice && historySlice.length > 0 ? historySlice[historySlice.length - 1] : null;
      return last ? this.getMetricValue(last, targetKey) : 0;
    }
    const n = historySlice.length;
    const date = new Date(historySlice[n - 1].timestamp);
    const hour = isNaN(date.getUTCHours()) ? 12 : date.getUTCHours();
    const minute = isNaN(date.getUTCMinutes()) ? 0 : date.getUTCMinutes();
    const day = isNaN(date.getUTCDay()) ? 3 : date.getUTCDay();

    const hourSin = Math.sin((hour / 24) * 2 * Math.PI);
    const hourCos = Math.cos((hour / 24) * 2 * Math.PI);
    const minuteSin = Math.sin((minute / 60) * 2 * Math.PI);
    const minuteCos = Math.cos((minute / 60) * 2 * Math.PI);

    const lag1 = this.getMetricValue(historySlice[n - 1], targetKey);
    const lag2 = this.getMetricValue(historySlice[n - 2], targetKey);
    const lag5 = this.getMetricValue(historySlice[n - 5], targetKey);

    const slice5 = historySlice.slice(n - 5, n).map((d) => this.getMetricValue(d, targetKey));
    const rollingMean5 = slice5.reduce((a, b) => a + b, 0) / 5;

    const slice15 = historySlice.slice(n - 15, n).map((d) => this.getMetricValue(d, targetKey));
    const rollingMean15 = slice15.reduce((a, b) => a + b, 0) / 15;

    const variance5 = slice5.reduce((sum, v) => sum + Math.pow(v - rollingMean5, 2), 0) / 5;
    const rollingStd5 = Math.sqrt(variance5);

    const trend = lag1 - lag2;

    const featureRow = [
      hourSin,
      hourCos,
      minuteSin,
      minuteCos,
      day / 7,
      lag1,
      lag2,
      lag5,
      rollingMean5,
      rollingMean15,
      rollingStd5,
      trend,
    ];

    if (this.rfModel) {
      const res = this.rfModel.predictSingle(featureRow);
      return Math.max(10, Math.round(res.mean));
    } else if (this.arModel) {
      return Math.max(10, Math.round(this.arModel.predictRow(featureRow)));
    }
    return lag1;
  }

  getMetrics(): MLMetrics | null {
    return this.metrics;
  }

  isModelTrained(): boolean {
    return this.isTrained;
  }

  getConfig(): MLModelConfig {
    return this.currentConfig;
  }
}

// Global ML engine singleton
export const globalMLEngine = new MLEngine();

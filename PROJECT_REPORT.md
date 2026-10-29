# CloudPilot AI: Project Report

**Project title:** CloudPilot AI — Predictive Cloud Workload Forecasting and Autoscaling Simulator  
**Domain:** Cloud computing, time-series forecasting, resource management  
**Project type:** Academic prototype and simulation

## 1. Abstract

Cloud workloads vary over time. A fixed-size fleet can waste resources during low traffic, while a reactive scaling policy may respond only after current utilization crosses a threshold. CloudPilot AI is a prototype for exploring these trade-offs. It accepts generated, uploaded, or manually entered workload data; trains a forecasting model; simulates fixed, reactive, and predictive scaling; and compares estimated compute cost, utilization, scaling actions, and simplified SLA breaches.

The project combines a React/Vite interface, TypeScript simulation engines, and a FastAPI/Python API with a scikit-learn Random Forest training pipeline. The included Python dataset is a **synthetic 24-hour workload with 288 five-minute points**, not a production trace. All virtual machines and scaling actions are simulated. The application does not provision real cloud infrastructure, and cost results are model estimates rather than live provider bills.

## 2. Problem statement and research gap

Traditional threshold-based autoscaling observes current resource usage and then makes a scaling decision. A sudden demand increase can create a delay between the start of the surge, its detection, and the availability of extra capacity. A fixed allocation avoids some reaction delay but may keep more capacity running than the scenario requires.

The project investigates this question:

> On the same workload sequence, how do fixed allocation, reactive threshold scaling, and forecast-guided scaling differ in estimated cost, simulated CPU utilization, number of scaling actions, and threshold-based SLA violations?

The prototype is intended to make the comparison repeatable and inspectable. The Cost Analysis comparison's predictive policy is a past-only five-step linear-trend baseline, separate from the browser ML model. The browser ML pipeline trains only on observations at or before the current playhead. The project does **not** assume that predictive scaling always wins. Any savings or reliability claim must be calculated from the selected data and policy and then evaluated against a realistic workload before being generalised.

## 3. Objectives

1. Provide workload input through synthetic generation, CSV/JSON import in the browser, and manual entry.
2. Implement forecasting and display out-of-sample evaluation metrics.
3. Compare fixed, reactive, and predictive resource-allocation policies on a common workload sequence.
4. Track simulated VM lifecycle and scaling events.
5. Display cost and SLA estimates with the assumptions that generated them.
6. Keep the application usable on smaller screens and make the primary workflow clear.

## 4. System design

### 4.1 Main components

- **Frontend:** React, TypeScript, Vite, Tailwind CSS and Recharts. Views include Home, Dashboard, Dataset Manager, Manual Input, What-if Lab, Simulation, ML Pipeline, Scaling Policy, VM Fleet, Cost Analysis, Architecture Report, and AWS Deployment Guide.
- **Browser simulation:** A shared context coordinates workload data, playhead, simulated VM state, policies, incidents, and scaling events.
- **Browser ML engine:** A custom Random-Forest-style tree ensemble and an autoregressive linear baseline. These are the two selectable models currently exposed by the UI. Training requires at least 35 observed records and uses only rows at or before the current simulation playhead; rewinding/resetting clears the model. The UI does not offer Gradient Boosting or LSTM because those choices were not implemented as separate models.
- **Python API:** FastAPI with a scikit-learn Random Forest training script, feature engineering, recursive forecasting, request-driven strategy comparison, and in-memory demo cluster state.
- **Database assets:** A PostgreSQL service, schema, and seed SQL are included. The current API simulator does not persist its VM state or telemetry to PostgreSQL.

### 4.2 Workload data

The browser can generate a larger synthetic sequence or accept custom data. The checked-in Python sample file, `datasets/sample_workload.csv`, contains 288 workload points at five-minute intervals with timestamp, RPS, active-user, CPU, and memory columns. It is a generated sample for development and reproducibility, not an external public production trace.

Uploaded files sent to the Python `/api/dataset/upload` endpoint are validated and previewed only. That endpoint does not persist uploaded records or feed them directly into training. Browser-side file ingestion is a separate path.

### 4.3 Feature engineering and forecasting

The Python training path transforms timestamped RPS into cyclical time features, lagged RPS values, rolling means, and rolling standard deviation. It splits the ordered feature rows chronologically: the first 80% is the training partition and the remaining 20% is the holdout partition. Random shuffling is avoided so the validation sequence follows the temporal order.

The Random Forest is fitted only on the training partition. MAE, RMSE, MAPE (excluding zero-valued actuals from the percentage denominator), and R² are calculated from the held-out predictions. Feature importance is returned from the fitted estimator. Forecasts are generated recursively from observed RPS history. The illustrative ±10% output range is not a statistically calibrated confidence interval.

The browser-side implementation is separate. Its metrics are shown only after training on the selected workload; changing the dataset resets the displayed model metrics and forecast so an earlier model result cannot be mistaken for validation on the newly selected data.

### 4.4 Autoscaling and cost model

The simulator compares:

- **Fixed allocation:** a constant configured number of instances.
- **Reactive allocation:** scaling changes based on the current simulated utilization and policy thresholds.
- **Predictive allocation in Cost Analysis:** uses a five-step linear-trend estimate based only on current and prior RPS rows; it is a comparison baseline, not the trained browser ML model. The separate browser ML-driven scaling path uses the trained model's forecast when available and remains simulation-only.

For an instance capacity (C), target utilization (U), and forecasted demand (hat{\lambda}), the nominal target fleet size is

\[
N_{target}=\max\left(N_{min},\min\left(N_{max},\left\lceil\frac{\hat{\lambda}}{C\cdot U}\right\rceil\right)\right).
\]

The cost estimate is based on the configured per-instance hourly rate and simulated instance-hours. Results are not linked to AWS billing or real VM creation. SLA breaches are simplified model events, not measured production outages.

## 5. Evaluation methodology and output

No universal result is asserted in this report. The application computes model metrics and strategy comparisons from the data and policy used in a particular run. The result must be recorded after running the experiment; fixed values should not be copied into the report as though they were measured.

### 5.1 Model validation

Record the following from the ML Pipeline page or `POST /api/train` response:

| Item | What to report |
|---|---|
| Dataset | Source, point count, timestamp interval, target variable |
| Split | Chronological train/test split ratio and exact sample counts |
| Model | Browser Random-Forest-style ensemble, browser autoregressive baseline, or Python Random Forest |
| MAE | Mean absolute error on the holdout partition, in RPS |
| RMSE | Root mean squared error on the holdout partition, in RPS |
| MAPE | Mean absolute percentage error on non-zero actuals; percent |
| R² | Coefficient of determination on the holdout partition |
| Feature scores | Computed from tree split gains or normalized baseline coefficients where available |

### 5.2 Strategy comparison

Use the same ordered workload sequence and policy for all three strategies. Record the actual output of the Cost Analysis page:

| Metric | Fixed | Reactive | Predictive |
|---|---:|---:|---:|
| Estimated total cost (USD) | Run output | Run output | Run output |
| Simulated instance-hours | Run output | Run output | Run output |
| Average simulated CPU (%) | Run output | Run output | Run output |
| Estimated threshold breaches | Run output | Run output | Run output |
| Scaling actions | Run output | Run output | Run output |

These entries must be populated from an actual run before submission. Cost comparisons should state the per-instance hourly rate and the workload interval. The meaning of a simulated SLA violation should also be reported, for example, the configured CPU or response-time condition that triggers it.

### 5.3 Reproducibility checklist

1. Identify whether the workload is synthetic, uploaded, or manually entered.
2. Preserve the dataset or an export of the exact workload used.
3. Record model type, training/test split, scaling thresholds, target utilization, VM capacity, cooldown, and cost per instance-hour.
4. Train the model and save its measured holdout metrics.
5. Re-run the strategy comparison and export the calculated results.
6. Report unexpected or negative savings honestly; do not change assumptions solely to produce a favourable result.

## 6. Limitations and future work

- The browser simulator and Python API maintain separate model state and simulator state.
- The backend API stores simulated cluster state in memory; PostgreSQL persistence is not wired up.
- Uploads sent to the backend are previewed but are not yet included in backend model training.
- The included workload is synthetic; it does not establish performance on an external production trace.
- The cost and SLA models simplify provider billing, workload queues, VM boot timing, network effects, and application-level latency.
- The AWS guide is explanatory only; this repository does not currently deploy or modify real AWS resources.
- Further work should include a documented public dataset, benchmark scripts that record full parameters, tests of the API training and prediction path, database persistence, calibrated uncertainty estimates, and a separate cloud experiment before any real-world cost-saving claim.

## 7. Viva preparation

**Q1. Why compare predictive and reactive autoscaling?**  
Reactive policies make decisions from the current state, while predictive policies attempt to use a forecast to allocate capacity earlier. The comparison measures whether the forecast changes cost and simulated breach outcomes under the same workload; predictive scaling is not guaranteed to perform better.

**Q2. How is temporal data leakage limited?**  
Training data precedes the holdout data in chronological order. The future segment is not shuffled into training. Feature engineering uses lag and rolling features derived from the ordered series.

**Q3. What does MAPE mean, and what are its limits?**  
MAPE averages absolute prediction error as a percentage of the actual value. It is undefined for actual values of zero, so the implementation omits zero-valued actuals from that metric. MAE, RMSE, and R² should also be reported.

**Q4. Are the reported cloud costs real provider charges?**  
No. They are estimates calculated from the workload, simulated fleet sizes, and the configured per-instance hourly rate. The app does not connect to provider billing APIs.

**Q5. Does this project launch AWS instances?**  
No. The current project simulates instance lifecycle and includes an explanatory AWS deployment guide. It does not include a working Terraform deployment or a real-resource autoscaling daemon.

**Q6. Why are LSTM and Gradient Boosting no longer offered in the browser model selector?**  
They were previously presented as selectable options without independent implementations; they were mapped to the same underlying model. They were removed so the UI only exposes implemented choices.

---

*Prepared as project documentation for CloudPilot AI. Populate the evaluation tables with measured outputs from the exact experiment used for submission.*

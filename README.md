# CloudPilot AI

**Predictive cloud workload forecasting and autoscaling — an academic prototype**

CloudPilot AI is a cloud-computing project that explores whether workload forecasting can help a simulated virtual-machine fleet scale more deliberately than fixed allocation or threshold-based reactive scaling. The application combines a React/Vite dashboard, an in-browser workload simulator, a TypeScript forecasting/scaling pipeline, and a separate FastAPI/Python ML API.

> **Scope note:** CloudPilot is a simulation and research prototype. Its VM actions do not create, modify, or terminate real cloud resources. Cost figures are estimates based on configured rates, and any reported savings must be validated against the exact workload and policy used.

## What is included

### Workload input and simulation
- Built-in **synthetic** workload generation, including daily traffic patterns and occasional spikes. The app starts with no active dataset; loading data is an explicit user action.
- Browser-based CSV/JSON dataset import and column mapping. The included upload-test file is `public/datasets/cloudpilot_demo_workload.csv` (1,440 rows at one-minute intervals).
- Manual workload input and editable workload points.
- A dashboard for simulated workload, VM lifecycle, scaling decisions, resource alarms, and failure-injection scenarios.

### Forecasting and autoscaling
- The browser ML pipeline offers two implemented choices: a custom Random-Forest-style tree ensemble and an autoregressive linear baseline.
- The browser model trains only on observations at or before the simulation playhead and uses a chronological holdout split to calculate MAE, RMSE, MAPE, and R². At least 35 observed rows are required; move the playhead forward, then train. Rewinding/resetting clears trained state to avoid future-data leakage.
- Feature scores are derived from fitted tree split gains or the baseline's normalized coefficient magnitudes.
- The Python API has a separate scikit-learn Random Forest pipeline with cyclical, lag, and rolling features. Its checked-in training data is synthetic.
- Fixed, reactive, and predictive scaling are simulated against workload points. The Cost Analysis comparison's predictive policy is a past-only linear-trend baseline, separate from the trained browser ML model. These are not direct AWS, Azure, or Google Cloud autoscaling integrations.

### Cost analysis and export
- Side-by-side strategy comparison runs on the active workload and configured policy.
- Costs are estimated from the configured per-instance hourly rate and the time interval assigned to each workload point.
- CSV and JSON exports support further analysis. Exported estimates should be accompanied by the workload source, point interval, policy values, and model validation results.

### Deployment and data persistence
- Docker Compose contains frontend, FastAPI, and PostgreSQL services. The current API's cluster state is in memory; the API does **not** currently persist its VM state or telemetry to PostgreSQL.
- The AWS deployment guide is explanatory material. This repository does not include Terraform or a daemon that provisions real AWS resources.

## Quick start

### Frontend only
Requirements: Node.js 20 or newer is recommended.

```bash
git clone https://github.com/Lathika-maker/CloudPilot.git
cd CloudPilot
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful frontend commands:

```bash
npm run lint
npm run build
```

### Python API
Requirements: Python 3.11 is recommended.

```bash
python -m venv .venv
source .venv/bin/activate       # macOS/Linux
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

### Docker Compose
First create a local environment file and set a unique password:

```bash
cp .env.example .env
# Edit .env and set POSTGRES_PASSWORD to a unique URL-safe local password.
docker compose up --build
```

The compose configuration starts the frontend at port 3000, the API at port 8000, and PostgreSQL at port 5432. PostgreSQL is initialized with the checked-in schema and seed SQL, but API state persistence is not wired up yet. The ignored `.env` file contains local credentials; do not commit it or reuse it in a deployed environment.

### Tests
```bash
pytest tests/
npm run lint
npm run build
```

## Python API endpoints

| Endpoint | Purpose | Notes |
|---|---|---|
| `GET /api/health` | API health summary | Reports in-memory simulator state |
| `GET /api/telemetry/stream` | Current simulated telemetry | Not live cloud telemetry |
| `POST /api/dataset/upload` | Validate a CSV/JSON file and return a preview | Preview only; uploaded content is not persisted or passed to model training |
| `POST /api/workload/generate` | Generate synthetic workload points | Output is synthetic |
| `POST /api/train` | Train a scikit-learn Random Forest on `datasets/sample_workload.csv` | Returns metrics computed on the chronological holdout split |
| `GET /api/predict` | Generate recursive forecasts from supplied observed RPS history | Requires a trained model and at least 15 repeated `history_rps` query parameters |
| `POST /api/cost/compare` | Compare fixed, reactive, and model-based predictive scaling | Requires a trained model and at least 15 RPS values at a 5-minute interval; returns simulation estimates only |

Example model-training request:

```bash
curl -X POST http://localhost:8000/api/train \
  -H 'Content-Type: application/json' \
  -d '{"algorithm":"Random Forest Regressor"}'
```

Example prediction request (repeat `history_rps` for each observed value; include at least 15 points):

```bash
curl 'http://localhost:8000/api/predict?history_rps=220&history_rps=235&history_rps=240&history_rps=250&history_rps=275&history_rps=290&history_rps=310&history_rps=325&history_rps=340&history_rps=360&history_rps=375&history_rps=390&history_rps=410&history_rps=430&history_rps=450&current_hour=8&current_day=1'
```

For cost comparison, send a JSON body containing `workload_rps` with at least 15 chronological observations, `interval_minutes: 5`, and optionally `fixed_instances`, `start_hour`, and `start_day`.

## Repository layout

```text
backend/main.py                 FastAPI API and in-memory simulator state
ml/feature_engineering.py       Python time-series feature engineering
ml/train.py                     Python Random Forest training and holdout metrics
ml/predict.py                   Recursive prediction from observed RPS history
datasets/sample_workload.csv    288-point synthetic 24-hour workload (5-minute intervals)
public/datasets/cloudpilot_demo_workload.csv  1,440-point browser upload test (1-minute intervals)
db/schema.sql                   PostgreSQL schema
db/seed.sql                     Initial database seed data
src/components/                 React views and shared UI
src/context/CloudPilotContext.tsx Shared browser simulation state
src/services/                   Browser data, ML, cost, and scaling engines
src/types/                      Domain TypeScript interfaces
tests/                          Python tests
PROJECT_REPORT.md               Academic report and methodology
```

## Evaluation guidance

For an academic or research submission, record the dataset source and time interval, selected model, chronological train/test sample counts, MAE, RMSE, MAPE, R², scaling policy, cost-per-instance rate, total simulated cost, VM-hours, SLA-violation definition, and number of scaling actions. Do not describe generated data as production telemetry or use simulation savings as evidence of real-world savings without a separate experiment.

## Current limitations

- The browser simulator and Python API maintain separate state and model artifacts.
- Uploaded files sent to the Python API are validated and previewed, not persisted or trained automatically.
- The PostgreSQL schema is present, but API persistence is not connected.
- The AWS guide does not deploy infrastructure.
- The workload and cost models simplify provider billing, boot latency, queueing, and SLA behavior; the simulator should not be used as a production controller.

---
Academic cloud-computing project: **CloudPilot AI**.

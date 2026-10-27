# CloudPilot AI

### An AI-Powered Predictive Cloud Resource Orchestrator for Intelligent Resource Scaling and Cost Optimization

**CloudPilot AI** is a production-grade, academic final-year cloud computing project designed for 2-person teams. It delivers an end-to-end intelligent predictive autoscaling engine that forecasts incoming traffic surges, pre-provisions virtual machines before traffic arrives, prevents scaling flapping, and optimizes cloud costs.

---

## Key Capabilities

1. **3 Workload Ingestion Modes:**
   - **Sample Traces:** Built-in production traces (NASA HTTP log patterns, diurnal e-commerce cycles).
   - **Dataset Uploader:** Upload your own CSV or JSON workload metrics with automatic column mapping.
   - **Manual Matrix Input & Synthetic Generator:** Interactive matrix editing and spike/noise generator.

2. **Machine Learning Pipeline:**
   - Cyclical feature extraction ($\sin/\cos$ of hour and day of week).
   - Autoregressive lag terms ($t-1, t-2, t-5$) and rolling statistical indicators ($5m, 15m$).
   - Chronological train/test split with zero data leakage.
   - Models: Random Forest Regressor, Gradient Boosting, Ridge Regression.
   - Metrics: MAE, RMSE, MAPE, $R^2$, and Feature Importance ranking.

3. **Autoscaling & Strategy Comparison Benchmark:**
   - **Strategy A:** Fixed Allocation (Static VM baseline).
   - **Strategy B:** Reactive Autoscaling (Threshold-based with boot latency lag).
   - **Strategy C:** CloudPilot AI (Predictive forecasting + lead-time provisioning + cooldown hysteresis).
   - Computes dollar savings, VM-hours, SLA breach count, and over/under-provisioning minutes.

4. **Virtual Fleet & Load Balancer Simulator:**
   - Lifecycle simulation: `STARTING`, `RUNNING`, `STOPPING`, `TERMINATED`.
   - Application Load Balancer with **Round Robin** and **Least Connections** routing.
   - Health checks and automatic removal of unhealthy nodes.

5. **Academic Viva Defense Guide & Report:**
   - Full mathematical formulations ($M/M/c$ queueing theory, predictive sizing).
   - 10 structured Viva Q&A responses covering common examiner questions.
   - One-click Markdown/CSV report exports.

6. **AWS Production Blueprint (Optional):**
   - Terraform IaC (`aws/terraform/main.tf`) for ALB + ASG + EC2.
   - Boto3 daemon (`aws/orchestrator_daemon.py`) for setting ASG desired capacity.
   - Free-tier eligible instructions and clean teardown guide.

---

## Quick Start (Local Docker Compose)

The primary application runs locally with zero paid cloud accounts required:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/cloudpilot-ai.git
cd cloudpilot-ai

# 2. Launch with Docker Compose
docker-compose up --build
```

Access the services:
- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL Database:** `localhost:5432` (`user: cloudpilot_user`, `db: cloudpilot`)

---

## Local Development (Without Docker)

### Frontend (React + Vite + Tailwind)
```bash
npm install
npm run dev
# Running on http://localhost:3000
```

### Backend (Python FastAPI)
```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
# API docs at http://localhost:8000/docs
```

### Running Unit Tests
```bash
pytest tests/
```

---

## Project Structure

```
cloudpilot-ai/
├── backend/
│   └── main.py                 # FastAPI REST API endpoints
├── ml/
│   ├── feature_engineering.py  # Cyclical encodings, lags, rolling stats
│   ├── train.py                # Chronological train/test split & model fitting
│   └── predict.py              # Multi-step horizon inference engine
├── db/
│   ├── schema.sql              # PostgreSQL DDL for metrics, nodes, events
│   └── seed.sql                # Initial seed cluster data
├── datasets/
│   └── sample_workload.csv     # 24-hour production benchmark trace
├── src/
│   ├── components/             # UI views (Dashboard, ML, Cost, Simulation, etc.)
│   ├── context/                # CloudPilotContext central state
│   ├── services/               # TypeScript simulation engines (ML, Scaling, LB)
│   └── types/                  # Domain TypeScript interfaces
├── tests/
│   ├── test_scaling.py         # Autoscaling logic and cooldown tests
│   └── test_ml.py              # Cyclical feature & split integrity tests
├── aws/
│   ├── terraform/main.tf       # AWS IaC for ALB + ASG
│   └── orchestrator_daemon.py  # Boto3 autoscaling controller
├── docker-compose.yml          # Multi-container orchestration
├── Dockerfile.frontend         # React production build + Nginx
├── Dockerfile.backend          # Python 3.11 + Scikit-Learn
├── PROJECT_REPORT.md           # Full academic project report & viva guide
└── README.md                   # System documentation
```

---

## Academic Viva Questions & Answers Summary

* **Q: Why does reactive autoscaling fail during sudden surges?**  
  *A:* Reactive scaling triggers only *after* an alarm breaches a threshold. Instances require 120–180 seconds to initialize, causing heavy packet drops and SLA breaches during the boot window. CloudPilot predicts the surge in advance and provisions instances before traffic arrives.

* **Q: How is data leakage prevented in time-series training?**  
  *A:* By strictly using chronological train/test splitting (first 80% train, subsequent 20% test) instead of random shuffling.

* **Q: How is flapping prevented?**  
  *A:* Through hysteresis dual thresholds (scale-up at 75%, scale-down at 30%) and a mandatory 180-second cooldown timer.

---
*Developed for Academic Cloud Computing Capstone Project.*

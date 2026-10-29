# CloudPilot Hybrid-Quantum QLSTM API

This opt-in service uses PennyLane's `default.qubit` with a trainable quantum feature layer inside a PyTorch recurrent cell. The simulator runs on classical hardware; it does not access quantum hardware or claim quantum advantage.

## Start locally

```bash
cd backend/quantum_api
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Health check: <http://127.0.0.1:8000/health>

At the repository root, create `.env.local` and restart Vite:

```dotenv
VITE_QUANTUM_API_URL=http://127.0.0.1:8000
```

For another trusted frontend origin, set `QUANTUM_ALLOWED_ORIGINS` to a comma-separated explicit allowlist. Wildcards are rejected.

The endpoint `POST /api/v1/forecast/cpu` accepts 24–240 strictly increasing observations and 1–20 future steps. CPU values must be finite and within 0–100. Holdout MAE/RMSE/R²/MAPE are computed from a chronological one-step-ahead split. Forecast bands are residual-spread estimates, not calibrated confidence intervals.

Run tests from this directory with `pytest -q`.

The model is trained per request and CPU simulation can be slow. The downstream autoscaling adapter is a simulator approximation and needs calibration before production use. CORS is not authentication; keep the backend bound to loopback for local development and add authentication, TLS, rate limits, monitoring, and model lifecycle controls before any remote deployment.

# CloudPilot Hybrid-Quantum QLSTM API

This opt-in service uses PennyLane's `default.qubit` with a trainable quantum feature layer inside a PyTorch recurrent cell. The simulator runs on classical hardware; it does not access quantum hardware or claim quantum advantage.

## Start locally (recommended: one command)

From the repository root, install the frontend dependencies once and start both services:

```bash
npm install
npm run dev:quantum
```

The script creates `backend/quantum_api/.venv`, installs backend requirements when first needed or when they change, starts FastAPI, and then starts Vite. Leave that terminal open and press Ctrl+C to stop both. Requirements: Node.js 20+ and Python 3.11 or 3.12. The first Python dependency installation may take several minutes.

### Manual two-terminal startup


Terminal A, from the repository root:

```bash
cd backend/quantum_api
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Confirm the backend directly at <http://127.0.0.1:8000/health>. It should return JSON with `"status": "ok"`.

Terminal B, from the repository root:

```bash
npm run dev
```

Open the Vite URL printed in Terminal B (normally <http://localhost:3000>). In development, the Vite server forwards `/health` and `/api/*` to FastAPI through a same-origin proxy. This avoids CORS problems between `localhost` and `127.0.0.1`. Local development does not require `VITE_QUANTUM_API_URL`; if you previously added it to `.env.local`, the Vite development client intentionally uses the proxy instead. Restart Vite after pulling these changes because this project has HMR disabled.

To proxy to a different backend host, set `QUANTUM_API_PROXY_TARGET` before starting Vite (for example, `http://127.0.0.1:8000`).

For a production frontend, set `VITE_QUANTUM_API_URL` at build time to a separately hosted, reachable FastAPI base URL. Its CORS allowlist must include the frontend origin. Do not set this to `127.0.0.1` for a remotely hosted website; that address refers to the viewer's own device.

## API

`POST /api/v1/forecast/cpu` accepts 24–240 strictly increasing observations and 1–20 forecast steps. CPU values must be finite and within 0–100. Holdout MAE/RMSE/R²/MAPE are computed from a chronological one-step-ahead split; forecast bands are residual-spread estimates, not calibrated confidence intervals.

Run tests from this directory with `pytest -q`.

The model is trained per request and CPU simulation can be slow. The downstream autoscaling adapter is a simulator approximation and needs capacity calibration before production use. CORS is not authentication; keep the backend bound to loopback for local development and add authentication, TLS, rate limits, monitoring, and model lifecycle controls before any remote deployment.

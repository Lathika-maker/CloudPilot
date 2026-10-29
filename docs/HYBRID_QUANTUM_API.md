# Hybrid-Quantum API integration

## Additions

- `src/api/quantumService.ts`: isolated React API client with a FastAPI health preflight, request validation, response validation, and a longer timeout for CPU simulation.
- `vite.config.ts`: same-origin development proxies for `/health` and `/api/*`, avoiding browser CORS problems between localhost origins.
- `src/services/quantumScalingAdapter.ts`: a CPU-domain capacity adapter that avoids treating CPU percentages as requests/second.
- `backend/quantum_api/main.py`: Pydantic-validated FastAPI endpoint, explicit CORS allowlist, PennyLane quantum layer inside a PyTorch recurrent QLSTM-style cell, holdout metrics and future CPU forecasts.
- The provider flag routes experimental selection to the API; existing classical model functions and `src/services/mlEngine.ts` remain unchanged.

## Run locally

1. Terminal A: `cd backend/quantum_api && python3.11 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn main:app --reload --host 127.0.0.1 --port 8000`.
2. Confirm <http://127.0.0.1:8000/health> returns `"status": "ok"`.
3. Terminal B at the repository root: `npm run dev`. Open the Vite URL it prints, normally <http://localhost:3000>. The dev proxy forwards frontend requests to FastAPI; no local `VITE_QUANTUM_API_URL` is needed.
4. In the ML Pipeline, select **Hybrid-Quantum QLSTM (Experimental API)** and click **Run QLSTM Forecast** after at least 35 records are observed.
5. Verify with `npm run lint`, `npm run build`, and `pytest -q` from `backend/quantum_api`.

For a remote production frontend, configure `VITE_QUANTUM_API_URL` with a separately hosted API URL and allow the frontend origin in the backend CORS allowlist. A remote website must not call localhost on the user's laptop.

## Interpretation

The differentiable PennyLane quantum feature layer runs on classical `default.qubit` simulation. Holdout metrics are computed from submitted observed data. The CPU-to-instance adapter is a simulator heuristic, not production-calibrated capacity management.

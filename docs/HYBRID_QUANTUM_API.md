# Hybrid-Quantum API integration

## Additions

- `src/api/quantumService.ts`: an isolated React API client that submits observed CPU history and validates the response.
- `src/services/quantumScalingAdapter.ts`: a CPU-domain capacity adapter that avoids treating CPU percentages as requests/second.
- `backend/quantum_api/main.py`: Pydantic-validated FastAPI endpoint, explicit CORS allowlist, PennyLane quantum layer inside a PyTorch recurrent QLSTM-style cell, holdout metrics and future CPU forecasts.
- A separate provider flag routes the experimental selection to the API. The original browser ML training functions and `src/services/mlEngine.ts` are unchanged.
- Dataset replacement, reset and backward playhead movement invalidate stale API responses.

## Run locally

1. Terminal A: `cd backend/quantum_api && python3.11 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn main:app --reload --host 127.0.0.1 --port 8000`.
2. At the repo root, create `.env.local` with `VITE_QUANTUM_API_URL=http://127.0.0.1:8000` and restart Vite using `npm run dev`.
3. Check `http://127.0.0.1:8000/health`. Select **Hybrid-Quantum QLSTM (Experimental API)** and click **Run QLSTM Forecast** with at least 35 observed records.
4. Verify with `npm run lint`, `npm run build`, and `pytest -q` from `backend/quantum_api`.

## Interpretation

This is a hybrid recurrent architecture with a differentiable PennyLane quantum feature layer, executed on classical `default.qubit` simulation. Holdout metrics are generated from observed data. The CPU-to-instance adapter is a simulator heuristic, not production-calibrated capacity management.

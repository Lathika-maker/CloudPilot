from datetime import datetime, timedelta, timezone

import numpy as np
from fastapi.testclient import TestClient

from main import CpuObservation, ForecastRequest, app, fit_and_forecast

client = TestClient(app)


def test_health_describes_simulated_backend():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert "default.qubit" in response.json()["quantum_device"]


def test_forecast_rejects_too_few_observations():
    payload = {
        "observations": [
            {"timestamp": f"2026-01-01T00:{index:02d}:00Z", "cpu_utilization": 35.0}
            for index in range(23)
        ],
        "horizon_steps": 5,
    }
    assert client.post("/api/v1/forecast/cpu", json=payload).status_code == 422


def test_forecast_rejects_out_of_range_cpu():
    payload = {
        "observations": [
            {"timestamp": f"2026-01-01T00:{index:02d}:00Z", "cpu_utilization": 35.0}
            for index in range(24)
        ],
        "horizon_steps": 5,
    }
    payload["observations"][4]["cpu_utilization"] = 101.0
    assert client.post("/api/v1/forecast/cpu", json=payload).status_code == 422


def test_forecast_rejects_non_monotonic_timestamps():
    payload = {
        "observations": [
            {"timestamp": f"2026-01-01T00:{index:02d}:00Z", "cpu_utilization": 35.0}
            for index in range(24)
        ],
        "horizon_steps": 5,
    }
    payload["observations"][10]["timestamp"] = payload["observations"][9]["timestamp"]
    assert client.post("/api/v1/forecast/cpu", json=payload).status_code == 422


def test_forecast_runs_temporal_qlstm_and_reports_persistence_baseline():
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    observations = [
        CpuObservation(
            timestamp=start + timedelta(minutes=index),
            cpu_utilization=42.0 + 5.0 * np.sin(index / 4.0) + 0.08 * index,
        )
        for index in range(45)
    ]
    result = fit_and_forecast(ForecastRequest(observations=observations, horizon_steps=5))

    assert len(result.predictions) == 5
    assert result.metrics.observations_used == 45
    assert result.metrics.training_epochs >= 4
    assert result.metrics.training_windows > 0
    assert result.metrics.baseline_mae >= 0
    assert result.metrics.forecast_std >= 0
    assert all(0 <= point.cpu_utilization <= 100 for point in result.predictions)
    assert all(
        point.lower_confidence <= point.cpu_utilization <= point.upper_confidence
        for point in result.predictions
    )
    assert all(np.isfinite(value) for value in (
        result.metrics.mae,
        result.metrics.rmse,
        result.metrics.r2,
        result.metrics.mape,
        result.metrics.baseline_mae,
    ))


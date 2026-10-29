from fastapi.testclient import TestClient

from main import app

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

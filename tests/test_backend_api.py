"""Integration tests for the simulation-only FastAPI endpoints."""
from pathlib import Path

import numpy as np
import pytest

from backend import main as api


def test_api_trains_predicts_and_compares_actual_workload(tmp_path, monkeypatch):
    model_path = tmp_path / "cloudpilot-test-model.pkl"
    monkeypatch.setattr(api, "MODEL_ARTIFACT_PATH", model_path)

    trained = api.train_model(api.TrainRequest())
    assert trained["status"] == "ready"
    assert model_path.is_file()
    assert trained["source_data_type"].startswith("synthetic")
    assert trained["test_samples"] > 0
    assert np.isfinite(trained["metrics"]["mae"])
    assert np.isfinite(trained["metrics"]["rmse"])
    assert np.isfinite(trained["metrics"]["r2"])

    history = [
        240, 255, 262, 280, 292, 310, 325, 340, 360,
        372, 390, 405, 420, 445, 460, 480, 490, 515,
    ]
    forecast = api.get_prediction(history_rps=history, current_hour=10, current_day=1)
    assert forecast["model"] == "Random Forest Regressor"
    assert forecast["predicted_workload_5m"] >= 0
    assert forecast["predicted_workload_10m"] >= 0
    assert forecast["predicted_workload_15m"] >= 0

    comparison = api.compare_costs(
        api.CostCompareRequest(workload_rps=history, interval_minutes=5)
    )
    assert comparison["simulation_only"] is True
    assert comparison["workload_points"] == len(history)
    assert set(comparison["strategies"]) == {"fixed", "reactive", "predictive"}
    assert comparison["data_source"].startswith("RPS values supplied")
    assert all(
        result["total_cost_usd"] >= 0
        for result in comparison["strategies"].values()
    )


def test_instance_lifecycle_actions_change_simulated_state(monkeypatch):
    monkeypatch.setattr(api, "cluster_instances", {})

    created = api.instance_lifecycle_action("test-vm", "create")
    assert created["status"] == "created"
    assert created["instance"].status == "RUNNING"

    stopped = api.instance_lifecycle_action("test-vm", "stop")
    assert stopped["instance"].status == "TERMINATED"
    assert stopped["instance"].healthy is False

    started = api.instance_lifecycle_action("test-vm", "start")
    assert started["instance"].status == "RUNNING"
    assert started["instance"].healthy is True

    terminated = api.instance_lifecycle_action("test-vm", "terminate")
    assert terminated["status"] == "terminated"
    assert "test-vm" not in api.cluster_instances


def test_invalid_instance_action_is_rejected():
    with pytest.raises(api.HTTPException) as error:
        api.instance_lifecycle_action("inst-01", "scale-magic")
    assert error.value.status_code == 400

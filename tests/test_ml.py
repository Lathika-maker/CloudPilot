"""
CloudPilot AI - Machine Learning Pipeline Unit Tests
Tests cyclical features, chronological splitting, and the actual sample-data training path.
"""
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from ml.feature_engineering import engineer_features
from ml.train import train_predictive_model


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SAMPLE_DATASET = PROJECT_ROOT / "datasets" / "sample_workload.csv"


def test_cyclical_time_encoding():
    hours = np.array([0, 6, 12, 18, 24])
    sin_hour = np.sin(2 * np.pi * hours / 24.0)
    cos_hour = np.cos(2 * np.pi * hours / 24.0)

    assert np.isclose(sin_hour[0], 0.0, atol=1e-5)
    assert np.isclose(cos_hour[0], 1.0, atol=1e-5)
    assert np.isclose(sin_hour[4], 0.0, atol=1e-5)
    assert np.isclose(cos_hour[4], 1.0, atol=1e-5)
    assert np.isclose(sin_hour[1], 1.0, atol=1e-5)
    assert np.isclose(cos_hour[1], 0.0, atol=1e-5)


def test_chronological_split_no_leakage():
    data = list(range(100))
    split_idx = int(len(data) * 0.80)
    train = data[:split_idx]
    test = data[split_idx:]

    assert len(train) == 80
    assert len(test) == 20
    assert max(train) < min(test)


def test_bundled_workload_has_regular_five_minute_steps():
    df = pd.read_csv(SAMPLE_DATASET)
    timestamps = pd.to_datetime(df["timestamp"], utc=True)
    intervals = timestamps.diff().dropna().dt.total_seconds() / 60

    assert len(df) == 288
    assert np.allclose(intervals.to_numpy(), 5.0)
    assert (df["requests_per_second"] >= 0).all()


def test_engineered_lag_uses_only_prior_observations():
    df = pd.read_csv(SAMPLE_DATASET)
    X, y, features = engineer_features(df, target_col="requests_per_second")

    assert len(X) == len(y)
    assert len(features) == X.shape[1]
    # Every feature for a target row must come strictly from earlier observations.
    # The shifted rolling-15 mean makes input index 15 the first complete row.
    assert X["lag_1"].iloc[0] == df["requests_per_second"].iloc[14]
    assert y.iloc[0] == df["requests_per_second"].iloc[15]
    assert np.isclose(
        X["rolling_mean_15"].iloc[0],
        df["requests_per_second"].iloc[:15].mean(),
    )


def test_model_training_returns_measured_holdout_metrics(tmp_path):
    model_path = tmp_path / "trained-model.pkl"
    artifact = train_predictive_model(str(SAMPLE_DATASET), str(model_path))

    assert model_path.exists()
    assert artifact["dataset_rows"] == 288
    assert artifact["train_samples"] > artifact["test_samples"] > 0
    for metric in ("mae", "rmse", "mape", "r2"):
        assert artifact["metrics"][metric] is not None
        assert np.isfinite(artifact["metrics"][metric])
    assert np.isclose(sum(artifact["feature_importance"].values()), 1.0, atol=1e-6)

"""
CloudPilot AI - Model Training Script
Trains predictive time-series models with chronological train/test split.
"""
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

try:
    from .feature_engineering import engineer_features
except ImportError:  # Supports running this file directly as a script.
    from feature_engineering import engineer_features

def train_predictive_model(csv_path: str, model_save_path: str = "model.pkl", split_ratio: float = 0.8):
    print(f"Loading workload dataset from {csv_path}...")
    df = pd.read_csv(csv_path)

    print("Extracting cyclical and lag features...")
    if "requests_per_second" not in df.columns:
        raise ValueError("Dataset must contain a requests_per_second column.")
    if len(df) < 40:
        raise ValueError("At least 40 workload rows are required for chronological validation.")
    if not 0.5 <= split_ratio <= 0.9:
        raise ValueError("split_ratio must be between 0.5 and 0.9.")

    X, y, feature_names = engineer_features(df, target_col="requests_per_second")

    # Time-series aware chronological split (NO random shuffling to prevent data leakage)
    split_idx = int(len(X) * split_ratio)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    if len(X_train) < 10 or len(X_test) < 5:
        raise ValueError("Dataset is too small for a meaningful train/test split.")

    print(f"Train samples: {len(X_train)} | Test samples: {len(X_test)}")

    # Initialize model
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )

    print("Fitting Random Forest Regressor...")
    model.fit(X_train, y_train)

    # Evaluation
    predictions = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, predictions))
    rmse = float(np.sqrt(mean_squared_error(y_test, predictions)))
    r2 = float(r2_score(y_test, predictions))
    nonzero_actuals = np.abs(y_test.to_numpy()) > np.finfo(float).eps
    mape = float(np.mean(
        np.abs((y_test.to_numpy()[nonzero_actuals] - predictions[nonzero_actuals]) /
               y_test.to_numpy()[nonzero_actuals])
    ) * 100) if np.any(nonzero_actuals) else None

    print("=" * 45)
    print("CloudPilot Model Evaluation Metrics:")
    print(f"MAE:  {mae:.2f} RPS")
    print(f"RMSE: {rmse:.2f} RPS")
    print(f"MAPE: {mape:.2f}%")
    print(f"R²:   {r2:.4f}")
    print("=" * 45)

    # Save model artifact and feature metadata
    artifact = {
        "model": model,
        "features": feature_names,
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "dataset_rows": int(len(df)),
        "trained_at": pd.Timestamp.utcnow().isoformat(),
        "metrics": {"mae": mae, "rmse": rmse, "mape": mape, "r2": r2},
        "feature_importance": {
            name: float(score)
            for name, score in zip(feature_names, model.feature_importances_)
        },
    }

    with open(model_save_path, "wb") as f:
        pickle.dump(artifact, f)

    print(f"Model artifact successfully saved to {model_save_path}")
    return artifact

if __name__ == "__main__":
    import sys
    dataset_file = sys.argv[1] if len(sys.argv) > 1 else "../datasets/sample_workload.csv"
    train_predictive_model(dataset_file)

"""
CloudPilot AI - Model Training Script
Trains predictive time-series models with chronological train/test split.
"""
import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from feature_engineering import engineer_features

def train_predictive_model(csv_path: str, model_save_path: str = "model.pkl", split_ratio: float = 0.8):
    print(f"Loading workload dataset from {csv_path}...")
    df = pd.read_csv(csv_path)

    print("Extracting cyclical and lag features...")
    X, y, feature_names = engineer_features(df, target_col="requests_per_second")

    # Time-series aware chronological split (NO random shuffling to prevent data leakage)
    split_idx = int(len(X) * split_ratio)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

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
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    r2 = r2_score(y_test, predictions)
    mape = np.mean(np.abs((y_test - predictions) / np.maximum(1, y_test))) * 100

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
        "metrics": {"mae": mae, "rmse": rmse, "mape": mape, "r2": r2}
    }

    with open(model_save_path, "wb") as f:
        pickle.dump(artifact, f)

    print(f"Model artifact successfully saved to {model_save_path}")
    return artifact

if __name__ == "__main__":
    import sys
    dataset_file = sys.argv[1] if len(sys.argv) > 1 else "../datasets/sample_workload.csv"
    train_predictive_model(dataset_file)

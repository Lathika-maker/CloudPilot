"""
CloudPilot AI - Model Prediction & Inference Engine
Loads serialized model and forecasts multi-horizon workload metrics.
"""
import pickle
import pandas as pd
import numpy as np

class WorkloadPredictor:
    def __init__(self, model_path: str = "model.pkl"):
        self.model_path = model_path
        self.artifact = None
        self.model = None
        self.features = None
        self.load_model()

    def load_model(self):
        try:
            with open(self.model_path, "rb") as f:
                self.artifact = pickle.load(f)
                self.model = self.artifact["model"]
                self.features = self.artifact["features"]
        except Exception as e:
            print(f"Warning: Could not load {self.model_path}. Using analytical fallback. ({e})")

    def predict_next(self, recent_history_rps: list, current_hour: int = 14, current_day: int = 2) -> dict:
        """
        Forecasts workload for horizons t+5m, t+10m, and t+15m.
        """
        if not recent_history_rps or len(recent_history_rps) < 5:
            current = recent_history_rps[-1] if recent_history_rps else 300
            return {
                "t_5m": current * 1.05,
                "t_10m": current * 1.10,
                "t_15m": current * 1.12,
                "confidence_interval": [current * 0.95, current * 1.25]
            }

        curr = recent_history_rps[-1]
        lag1 = recent_history_rps[-1]
        lag2 = recent_history_rps[-2]
        lag5 = recent_history_rps[-5]
        mean5 = np.mean(recent_history_rps[-5:])
        mean15 = np.mean(recent_history_rps[-15:]) if len(recent_history_rps) >= 15 else mean5
        std5 = np.std(recent_history_rps[-5:])

        sin_h = np.sin(2 * np.pi * current_hour / 24.0)
        cos_h = np.cos(2 * np.pi * current_hour / 24.0)
        sin_d = np.sin(2 * np.pi * current_day / 7.0)
        cos_d = np.cos(2 * np.pi * current_day / 7.0)

        feature_vector = np.array([[
            sin_h, cos_h, sin_d, cos_d,
            lag1, lag2, lag5,
            mean5, mean15, std5
        ]])

        if self.model:
            pred_5m = float(self.model.predict(feature_vector)[0])
        else:
            trend = (lag1 - lag5) / 5.0
            pred_5m = lag1 + trend * 2.0

        pred_10m = pred_5m * 1.05
        pred_15m = pred_5m * 1.08

        return {
            "current_rps": curr,
            "predicted_workload_5m": round(pred_5m, 1),
            "predicted_workload_10m": round(pred_10m, 1),
            "predicted_workload_15m": round(pred_15m, 1),
            "confidence_lower": round(pred_10m * 0.90, 1),
            "confidence_upper": round(pred_10m * 1.10, 1)
        }

if __name__ == "__main__":
    predictor = WorkloadPredictor()
    sample_stream = [240, 255, 270, 290, 310, 330, 360, 400]
    forecast = predictor.predict_next(sample_stream)
    print("Inference result:", forecast)

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
        Recursively forecasts workload at t+5m, t+10m, and t+15m.
        Requires an actually trained model and observed workload history.
        The returned range is illustrative, not a calibrated confidence interval.
        """
        if self.model is None:
            raise RuntimeError("No trained model is available. Call /api/train first.")
        if not recent_history_rps or len(recent_history_rps) < 15:
            raise ValueError("At least 15 recent RPS observations are required for forecasting.")

        simulated_history = [max(0.0, float(value)) for value in recent_history_rps]
        forecasts = []

        for step in range(1, 4):
            forecast_minutes = step * 5
            total_minutes = current_hour * 60 + forecast_minutes
            forecast_hour = (total_minutes // 60) % 24
            forecast_day = (current_day + total_minutes // (24 * 60)) % 7

            lag1 = simulated_history[-1]
            lag2 = simulated_history[-2]
            lag5 = simulated_history[-5:]
            mean5 = float(np.mean(lag5))
            last15 = simulated_history[-15:]
            mean15 = float(np.mean(last15))
            std5 = float(np.std(lag5, ddof=1)) if len(lag5) > 1 else 0.0

            feature_vector = np.array([[
                np.sin(2 * np.pi * forecast_hour / 24.0),
                np.cos(2 * np.pi * forecast_hour / 24.0),
                np.sin(2 * np.pi * forecast_day / 7.0),
                np.cos(2 * np.pi * forecast_day / 7.0),
                lag1, lag2, simulated_history[-4],
                mean5, mean15, std5,
            ]])

            predicted = max(0.0, float(self.model.predict(feature_vector)[0]))
            predicted = round(predicted, 1)
            forecasts.append(predicted)
            simulated_history.append(predicted)

        current = float(recent_history_rps[-1])
        ten_minute = forecasts[1]
        return {
            "current_rps": current,
            "predicted_workload_5m": forecasts[0],
            "predicted_workload_10m": forecasts[1],
            "predicted_workload_15m": forecasts[2],
            "estimated_range_10m": {
                "lower": round(max(0.0, ten_minute * 0.90), 1),
                "upper": round(ten_minute * 1.10, 1),
            },
            "range_note": "Illustrative +/-10% range; not a calibrated statistical confidence interval.",
            "model": "Random Forest Regressor",
            "forecast_steps": 3,
        }

if __name__ == "__main__":
    predictor = WorkloadPredictor()
    sample_stream = [240, 255, 270, 290, 310, 330, 360, 400]
    forecast = predictor.predict_next(sample_stream)
    print("Inference result:", forecast)

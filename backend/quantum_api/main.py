from __future__ import annotations

import asyncio
import logging
import math
import os
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

import numpy as np
import pennylane as qml
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, model_validator
from starlette.concurrency import run_in_threadpool
from torch import nn

MODEL_NAME = "Hybrid-Quantum QLSTM (Experimental)"
SEQUENCE_LENGTH, N_QUBITS, HIDDEN_SIZE = 8, 3, 6
MAX_TRAIN_WINDOWS, MAX_EVAL_WINDOWS, MAX_FIT_WINDOWS = 16, 20, 20
TRAIN_EPOCHS = max(4, min(10, int(os.getenv("QLSTM_TRAIN_EPOCHS", "6"))))
DEFAULT_ORIGINS = [
    "http://localhost:3000", "http://127.0.0.1:3000",
    "http://localhost:5173", "http://127.0.0.1:5173",
]
torch.set_num_threads(max(1, min(4, int(os.getenv("QUANTUM_TORCH_THREADS", "1")))))


def configured_origins() -> list[str]:
    configured = os.getenv("QUANTUM_ALLOWED_ORIGINS", "").strip()
    origins = [value.strip() for value in configured.split(",") if value.strip()] if configured else DEFAULT_ORIGINS
    if not origins or "*" in origins:
        raise RuntimeError("QUANTUM_ALLOWED_ORIGINS must be an explicit allowlist; wildcard origins are disabled.")
    return origins


def as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


class CpuObservation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    timestamp: datetime
    cpu_utilization: Annotated[float, Field(ge=0.0, le=100.0, allow_inf_nan=False)]


class ForecastRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    observations: Annotated[list[CpuObservation], Field(min_length=24, max_length=240)]
    horizon_steps: Annotated[int, Field(ge=1, le=20)] = 10

    @model_validator(mode="after")
    def timestamps_must_increase(self) -> "ForecastRequest":
        previous: datetime | None = None
        for item in self.observations:
            current = as_utc(item.timestamp)
            if previous is not None and current <= previous:
                raise ValueError("Observation timestamps must be strictly increasing.")
            previous = current
        return self


class ForecastPoint(BaseModel):
    timestamp: str
    cpu_utilization: float
    lower_confidence: float
    upper_confidence: float


class ForecastMetrics(BaseModel):
    mae: float
    rmse: float
    r2: float
    mape: float
    baseline_mae: float
    holdout_size: int
    observations_used: int
    training_epochs: int
    training_windows: int
    forecast_std: float
    generated_at: str


class ForecastResponse(BaseModel):
    model: Literal["Hybrid-Quantum QLSTM (Experimental)"] = MODEL_NAME
    predictions: list[ForecastPoint]
    metrics: ForecastMetrics
    note: str


def evenly_spaced_subset(items: list, maximum: int) -> list:
    if len(items) <= maximum:
        return items
    indices = np.linspace(0, len(items) - 1, maximum, dtype=int).tolist()
    return [items[index] for index in indices]


def quantum_window_features(window: np.ndarray, center: float, scale: float) -> np.ndarray:
    """Normalize CPU level and first difference so the model learns state and direction."""
    level = (window - center) / scale
    delta = np.diff(window, prepend=window[0]) / scale
    return np.clip(np.stack([level, delta], axis=-1), -5.0, 5.0).astype(np.float32)


def create_quantum_layer() -> nn.Module:
    device = qml.device("default.qubit", wires=N_QUBITS)

    @qml.qnode(device, interface="torch", diff_method="backprop")
    def circuit(inputs, weights):
        qml.AngleEmbedding(inputs, wires=range(N_QUBITS), rotation="Y")
        qml.BasicEntanglerLayers(weights, wires=range(N_QUBITS))
        return [qml.expval(qml.PauliZ(wire)) for wire in range(N_QUBITS)]

    return qml.qnn.TorchLayer(circuit, weight_shapes={"weights": (1, N_QUBITS)})


class QuantumLstmCell(nn.Module):
    """QLSTM-style recurrent cell with a trainable quantum feature map in its gate path."""

    def __init__(self) -> None:
        super().__init__()
        self.encoder = nn.Linear(2 + HIDDEN_SIZE, N_QUBITS)
        self.quantum_layer = create_quantum_layer()
        self.gates = nn.Linear(N_QUBITS, HIDDEN_SIZE * 4)

    def forward(self, x: torch.Tensor, state: tuple[torch.Tensor, torch.Tensor]):
        hidden, cell = state
        encoded = torch.tanh(self.encoder(torch.cat([x, hidden], dim=-1))) * math.pi
        qfeatures = torch.stack([self.quantum_layer(row) for row in encoded], dim=0).to(dtype=x.dtype)
        input_gate, forget_gate, candidate, output_gate = self.gates(qfeatures).chunk(4, dim=-1)
        next_cell = torch.sigmoid(forget_gate) * cell + torch.sigmoid(input_gate) * torch.tanh(candidate)
        next_hidden = torch.sigmoid(output_gate) * torch.tanh(next_cell)
        return next_hidden, next_cell


class HybridQuantumQLSTM(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.cell = QuantumLstmCell()
        # A linear standardized output avoids forcing forecasts toward a sigmoid midpoint.
        self.output = nn.Linear(HIDDEN_SIZE, 1)

    def forward(self, sequence: torch.Tensor) -> torch.Tensor:
        hidden = torch.zeros(sequence.shape[0], HIDDEN_SIZE, dtype=sequence.dtype, device=sequence.device)
        cell = torch.zeros_like(hidden)
        for step in range(sequence.shape[1]):
            hidden, cell = self.cell(sequence[:, step, :], (hidden, cell))
        return self.output(hidden)


TrainingExample = tuple[np.ndarray, float, float]


def examples_for(values: np.ndarray, start: int, end: int, center: float, scale: float) -> list[TrainingExample]:
    examples: list[TrainingExample] = []
    for index in range(max(SEQUENCE_LENGTH, start), end):
        raw_window = values[index - SEQUENCE_LENGTH:index]
        examples.append((
            quantum_window_features(raw_window, center, scale),
            float((values[index] - center) / scale),
            float(raw_window[-1]),
        ))
    return examples


def fit_one_epoch(model: HybridQuantumQLSTM, optimizer: torch.optim.Optimizer, examples: list[TrainingExample]) -> None:
    model.train()
    loss_fn = nn.MSELoss()
    for features, target, _ in examples:
        x = torch.tensor(features, dtype=torch.float32).unsqueeze(0)
        y = torch.tensor([[target]], dtype=torch.float32)
        optimizer.zero_grad(set_to_none=True)
        loss = loss_fn(model(x), y)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()


def fit_model(model: HybridQuantumQLSTM, optimizer: torch.optim.Optimizer, examples: list[TrainingExample]) -> None:
    # A small fixed epoch budget keeps local CPU state-vector simulation practical.
    for _ in range(TRAIN_EPOCHS):
        fit_one_epoch(model, optimizer, examples)


def predict_one(model: HybridQuantumQLSTM, features: np.ndarray) -> float:
    x = torch.tensor(features, dtype=torch.float32).unsqueeze(0)
    model.eval()
    with torch.no_grad():
        return float(model(x).item())


def safe_r2(actual: np.ndarray, predicted: np.ndarray) -> float:
    residual = float(np.sum((actual - predicted) ** 2))
    total = float(np.sum((actual - np.mean(actual)) ** 2))
    return 0.0 if total <= 1e-12 else float(1.0 - residual / total)


def median_interval_seconds(observations: list[CpuObservation]) -> float:
    times = [as_utc(item.timestamp).timestamp() for item in observations]
    intervals = [right - left for left, right in zip(times, times[1:]) if right > left]
    return float(np.median(intervals)) if intervals else 60.0


def fit_and_forecast(payload: ForecastRequest) -> ForecastResponse:
    torch.manual_seed(17)
    np.random.seed(17)
    values = np.asarray([item.cpu_utilization for item in payload.observations], dtype=np.float32)
    total = len(values)
    split = min(total - 2, max(SEQUENCE_LENGTH + 2, int(total * 0.8)))
    train_values = values[:split]
    center = float(np.mean(train_values))
    scale = max(2.0, float(np.std(train_values)))

    train_examples = evenly_spaced_subset(
        examples_for(values, SEQUENCE_LENGTH, split, center, scale), MAX_TRAIN_WINDOWS
    )
    holdout_examples = evenly_spaced_subset(
        examples_for(values, split, total, center, scale), MAX_EVAL_WINDOWS
    )
    if not train_examples or not holdout_examples:
        raise ValueError("Not enough usable windows to train and evaluate this CPU series.")

    model = HybridQuantumQLSTM()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.008)
    fit_model(model, optimizer, train_examples)

    actual = np.asarray([target * scale + center for _, target, _ in holdout_examples], dtype=np.float64)
    predicted = np.asarray([
        predict_one(model, features) * scale + center for features, _, _ in holdout_examples
    ], dtype=np.float64)
    predicted = np.clip(predicted, 0.0, 100.0)
    baseline = np.asarray([last_value for _, _, last_value in holdout_examples], dtype=np.float64)
    errors = actual - predicted
    mae = float(np.mean(np.abs(errors)))
    rmse = float(np.sqrt(np.mean(errors ** 2)))
    r2 = safe_r2(actual, predicted)
    nonzero = np.abs(actual) > 1e-6
    mape = float(np.mean(np.abs(errors[nonzero] / actual[nonzero])) * 100.0) if np.any(nonzero) else 0.0
    baseline_mae = float(np.mean(np.abs(actual - baseline)))
    residual_spread = max(0.5, float(np.std(errors, ddof=0)))

    # Holdout scores are captured first, then the same QLSTM is refitted on all observed records.
    all_examples = evenly_spaced_subset(
        examples_for(values, SEQUENCE_LENGTH, total, center, scale), MAX_FIT_WINDOWS
    )
    fit_model(model, optimizer, all_examples)

    rolling_window = values[-SEQUENCE_LENGTH:].copy()
    cadence = timedelta(seconds=max(1.0, median_interval_seconds(payload.observations)))
    last_timestamp = as_utc(payload.observations[-1].timestamp)
    predictions: list[ForecastPoint] = []
    for offset in range(1, payload.horizon_steps + 1):
        features = quantum_window_features(rolling_window, center, scale)
        normalized = float(np.clip(predict_one(model, features), -3.0, 3.0))
        forecast = float(np.clip(center + normalized * scale, 0.0, 100.0))
        uncertainty = min(25.0, residual_spread * (1.0 + (offset - 1) * 0.10))
        timestamp = last_timestamp + cadence * offset
        predictions.append(ForecastPoint(
            timestamp=timestamp.isoformat().replace("+00:00", "Z"),
            cpu_utilization=round(forecast, 4),
            lower_confidence=round(max(0.0, forecast - 1.96 * uncertainty), 4),
            upper_confidence=round(min(100.0, forecast + 1.96 * uncertainty), 4),
        ))
        rolling_window = np.concatenate([rolling_window[1:], np.asarray([forecast], dtype=np.float32)])

    forecast_values = np.asarray([point.cpu_utilization for point in predictions], dtype=np.float64)
    return ForecastResponse(
        predictions=predictions,
        metrics=ForecastMetrics(
            mae=round(mae, 6),
            rmse=round(rmse, 6),
            r2=round(r2, 6),
            mape=round(mape, 6),
            baseline_mae=round(baseline_mae, 6),
            holdout_size=len(holdout_examples),
            observations_used=total,
            training_epochs=TRAIN_EPOCHS,
            training_windows=len(train_examples),
            forecast_std=round(float(np.std(forecast_values, ddof=0)), 6),
            generated_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        ),
        note=(
            "QLSTM uses normalized CPU level and first-difference inputs with a trainable PennyLane "
            "quantum gate feature map. Holdout scores are chronological; baseline_mae is a last-value "
            "persistence baseline. Forecast bands use holdout residual spread and are not calibrated "
            "prediction intervals. PennyLane default.qubit is a classical state-vector simulator, not hardware."
        ),
    )


app = FastAPI(title="CloudPilot Hybrid-Quantum QLSTM API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    max_age=600,
)
_forecast_semaphore = asyncio.Semaphore(1)


@app.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "quantum_device": "PennyLane default.qubit (classical state-vector simulation)",
    }


@app.post("/api/v1/forecast/cpu", response_model=ForecastResponse)
async def forecast_cpu(payload: ForecastRequest) -> ForecastResponse:
    async with _forecast_semaphore:
        try:
            return await run_in_threadpool(fit_and_forecast, payload)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        except Exception as error:
            logging.getLogger(__name__).exception("Quantum forecast failed")
            raise HTTPException(status_code=500, detail="Quantum forecast failed; inspect backend logs.") from error

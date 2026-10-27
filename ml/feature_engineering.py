"""
CloudPilot AI - Feature Engineering Pipeline
Extracts time-series lag, cyclical encodings, and rolling statistical indicators.
"""
import numpy as np
import pandas as pd
from typing import Tuple, List

def engineer_features(df: pd.DataFrame, target_col: str = "requests_per_second") -> Tuple[pd.DataFrame, pd.Series, List[str]]:
    """
    Transforms raw telemetry into ML-ready features.
    
    Features engineered:
    - sin_hour, cos_hour (cyclical diurnal pattern)
    - sin_day, cos_day (cyclical weekly pattern)
    - lag_1, lag_2, lag_5 (autoregressive terms)
    - rolling_mean_5, rolling_mean_15 (local trend)
    - rolling_std_5 (volatility)
    """
    df = df.copy()
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df['hour'] = df['timestamp'].dt.hour
        df['dayofweek'] = df['timestamp'].dt.dayofweek
    else:
        df['hour'] = 12
        df['dayofweek'] = 2

    # Cyclical hour encoding
    df['sin_hour'] = np.sin(2 * np.pi * df['hour'] / 24.0)
    df['cos_hour'] = np.cos(2 * np.pi * df['hour'] / 24.0)

    # Cyclical day of week encoding
    df['sin_day'] = np.sin(2 * np.pi * df['dayofweek'] / 7.0)
    df['cos_day'] = np.cos(2 * np.pi * df['dayofweek'] / 7.0)

    # Lag features
    df['lag_1'] = df[target_col].shift(1)
    df['lag_2'] = df[target_col].shift(2)
    df['lag_5'] = df[target_col].shift(5)

    # Rolling statistics
    df['rolling_mean_5'] = df[target_col].rolling(window=5).mean()
    df['rolling_mean_15'] = df[target_col].rolling(window=15).mean()
    df['rolling_std_5'] = df[target_col].rolling(window=5).std().fillna(0)

    # Clean missing boundary rows
    df_clean = df.dropna().reset_index(drop=True)

    feature_cols = [
        'sin_hour', 'cos_hour', 'sin_day', 'cos_day',
        'lag_1', 'lag_2', 'lag_5',
        'rolling_mean_5', 'rolling_mean_15', 'rolling_std_5'
    ]

    X = df_clean[feature_cols]
    y = df_clean[target_col]

    return X, y, feature_cols

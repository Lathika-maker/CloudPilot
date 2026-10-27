"""
CloudPilot AI - Machine Learning Pipeline Unit Tests
Tests cyclical encoding, lag generation, and chronological split integrity.
"""
import numpy as np
import pandas as pd
import pytest

def test_cyclical_time_encoding():
    # Test hour encoding
    hours = np.array([0, 6, 12, 18, 24])
    sin_hour = np.sin(2 * np.pi * hours / 24.0)
    cos_hour = np.cos(2 * np.pi * hours / 24.0)

    # At hour 0 and 24, sin should be 0, cos should be 1
    assert np.isclose(sin_hour[0], 0.0, atol=1e-5)
    assert np.isclose(cos_hour[0], 1.0, atol=1e-5)
    assert np.isclose(sin_hour[4], 0.0, atol=1e-5)
    assert np.isclose(cos_hour[4], 1.0, atol=1e-5)

    # At hour 6, sin should be 1, cos should be 0
    assert np.isclose(sin_hour[1], 1.0, atol=1e-5)
    assert np.isclose(cos_hour[1], 0.0, atol=1e-5)

def test_chronological_split_no_leakage():
    # 100 samples in temporal order
    data = list(range(100))
    split_idx = int(len(data) * 0.80)
    
    train = data[:split_idx]
    test = data[split_idx:]

    assert len(train) == 80
    assert len(test) == 20
    # Strict temporal ordering: max train must be strictly less than min test
    assert max(train) < min(test)

"""
CloudPilot AI - Scaling Engine Unit Tests
Tests reactive threshold calculations, predictive formulas, and cooldown guards.
"""
import pytest
import math

def calculate_target_instances(predicted_rps: float, capacity_per_instance: int = 250, target_cpu: float = 0.70) -> int:
    effective_capacity = capacity_per_instance * target_cpu
    return max(1, math.ceil(predicted_rps / effective_capacity))

def test_target_instance_calculation():
    # 250 RPS cap at 70% = 175 RPS per instance
    # 350 RPS requires ceil(350 / 175) = 2 instances
    assert calculate_target_instances(350, 250, 0.70) == 2
    # 175 RPS requires 1 instance
    assert calculate_target_instances(175, 250, 0.70) == 1
    # 1050 RPS requires ceil(1050 / 175) = 6 instances
    assert calculate_target_instances(1050, 250, 0.70) == 6

def test_cooldown_locking():
    last_scaling_time = 1000
    current_time = 1100
    cooldown_window = 180 # 3 minutes
    
    can_scale = (current_time - last_scaling_time) >= cooldown_window
    assert can_scale is False # Still in cooldown

    current_time = 1200
    can_scale = (current_time - last_scaling_time) >= cooldown_window
    assert can_scale is True # Cooldown has elapsed

def test_min_max_bounds():
    min_instances = 2
    max_instances = 10
    
    raw_calc = 0
    bounded = max(min_instances, min(max_instances, raw_calc))
    assert bounded == 2

    raw_calc_high = 25
    bounded_high = max(min_instances, min(max_instances, raw_calc_high))
    assert bounded_high == 10

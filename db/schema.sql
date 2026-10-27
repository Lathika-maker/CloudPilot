-- CloudPilot AI - PostgreSQL Relational Database Schema
-- Stores telemetry, predictions, scaling events, and experiment results

CREATE TABLE IF NOT EXISTS workload_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    requests_per_second INT NOT NULL,
    active_users INT NOT NULL,
    cpu_usage NUMERIC(5,2) NOT NULL,
    memory_usage NUMERIC(5,2) NOT NULL,
    response_time_ms NUMERIC(7,2) DEFAULT 45.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON workload_metrics(timestamp);

CREATE TABLE IF NOT EXISTS virtual_instances (
    instance_id VARCHAR(32) PRIMARY KEY,
    status VARCHAR(20) NOT NULL, -- 'RUNNING', 'STARTING', 'STOPPING', 'TERMINATED'
    cpu_usage NUMERIC(5,2) DEFAULT 0.0,
    memory_usage NUMERIC(5,2) DEFAULT 0.0,
    requests_served BIGINT DEFAULT 0,
    uptime_seconds INT DEFAULT 0,
    accumulated_cost NUMERIC(8,4) DEFAULT 0.0,
    launch_time TIMESTAMPTZ DEFAULT NOW(),
    termination_time TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS scaling_events (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action VARCHAR(20) NOT NULL, -- 'SCALE_UP', 'SCALE_DOWN', 'MAINTAIN'
    strategy VARCHAR(20) NOT NULL, -- 'fixed', 'reactive', 'predictive'
    previous_instances INT NOT NULL,
    target_instances INT NOT NULL,
    cpu_trigger NUMERIC(5,2),
    predicted_workload NUMERIC(8,2),
    cooldown_expires TIMESTAMPTZ,
    reason TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ml_model_metadata (
    id SERIAL PRIMARY KEY,
    model_version VARCHAR(32) NOT NULL,
    algorithm VARCHAR(64) NOT NULL,
    mae NUMERIC(6,3) NOT NULL,
    rmse NUMERIC(6,3) NOT NULL,
    mape NUMERIC(5,2) NOT NULL,
    r2_score NUMERIC(5,4) NOT NULL,
    trained_at TIMESTAMPTZ DEFAULT NOW(),
    features_json JSONB
);

CREATE TABLE IF NOT EXISTS benchmark_experiments (
    id SERIAL PRIMARY KEY,
    experiment_name VARCHAR(128) NOT NULL,
    dataset_name VARCHAR(128) NOT NULL,
    total_samples INT NOT NULL,
    fixed_cost NUMERIC(8,2) NOT NULL,
    reactive_cost NUMERIC(8,2) NOT NULL,
    predictive_cost NUMERIC(8,2) NOT NULL,
    cost_savings_pct NUMERIC(5,2) NOT NULL,
    sla_violations_fixed INT NOT NULL,
    sla_violations_reactive INT NOT NULL,
    sla_violations_predictive INT NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- CloudPilot AI - PostgreSQL Initial Seed Data

INSERT INTO virtual_instances (instance_id, status, cpu_usage, memory_usage, requests_served, uptime_seconds, accumulated_cost)
VALUES
('inst-01', 'RUNNING', 45.2, 52.0, 1420, 1840, 0.0820),
('inst-02', 'RUNNING', 48.0, 54.5, 1390, 1840, 0.0820),
('inst-03', 'RUNNING', 42.8, 50.1, 1310, 1840, 0.0820)
ON CONFLICT (instance_id) DO NOTHING;

INSERT INTO scaling_events (action, strategy, previous_instances, target_instances, cpu_trigger, predicted_workload, reason)
VALUES
('SCALE_UP', 'predictive', 2, 3, 71.4, 850.0, 'Forecasted +28% surge in next 10m horizon. Proactively provisioning 1 additional VM before arrival.'),
('SCALE_UP', 'reactive', 3, 4, 86.2, NULL, 'Threshold breached: Cluster CPU 86.2% > 75.0% for 60s.')
ON CONFLICT DO NOTHING;

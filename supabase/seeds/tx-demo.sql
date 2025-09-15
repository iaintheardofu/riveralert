-- Texas Demo Data for RiverAlert
-- Focused on Bexar and Kerr Counties

-- Clear existing demo data
TRUNCATE TABLE sensors, sensor_readings, alerts, zones, evacuation_routes CASCADE;

-- Insert Texas sensors
INSERT INTO sensors (id, name, type, location, status, metadata) VALUES
-- Bexar County sensors
('bexar-01', 'Huebner Creek at Vance Jackson', 'water_level',
 ST_SetSRID(ST_MakePoint(-98.4016, 29.5051), 4326), 'active',
 '{"county": "bexar", "crossing": true, "critical_level": 15}'),

('bexar-02', 'Helotes Creek at Scenic Loop', 'water_level',
 ST_SetSRID(ST_MakePoint(-98.6189, 29.4432), 4326), 'active',
 '{"county": "bexar", "crossing": true, "critical_level": 12}'),

('bexar-03', 'San Pedro Creek at Probandt', 'water_level',
 ST_SetSRID(ST_MakePoint(-98.4537, 29.3829), 4326), 'active',
 '{"county": "bexar", "crossing": false, "critical_level": 18}'),

('bexar-04', 'Salado Creek at Eisenhauer', 'water_level',
 ST_SetSRID(ST_MakePoint(-98.3892, 29.5464), 4326), 'active',
 '{"county": "bexar", "crossing": true, "critical_level": 14}'),

-- Kerr County sensors
('kerr-01', 'Guadalupe River at Kerrville', 'combined',
 ST_SetSRID(ST_MakePoint(-99.1406, 30.0508), 4326), 'active',
 '{"county": "kerr", "river": "guadalupe", "critical_level": 20}'),

('kerr-02', 'Town Creek at Junction Hwy', 'water_level',
 ST_SetSRID(ST_MakePoint(-99.1623, 30.0672), 4326), 'active',
 '{"county": "kerr", "crossing": true, "critical_level": 10}'),

('kerr-03', 'Guadalupe at River Hills', 'combined',
 ST_SetSRID(ST_MakePoint(-99.1139, 30.0394), 4326), 'active',
 '{"county": "kerr", "residential": true, "critical_level": 18}'),

('kerr-04', 'North Fork at Ingram', 'water_level',
 ST_SetSRID(ST_MakePoint(-99.1812, 30.0812), 4326), 'active',
 '{"county": "kerr", "crossing": false, "critical_level": 15}');

-- Insert recent sensor readings (simulating rising water conditions)
INSERT INTO sensor_readings (sensor_id, water_level_ft, flow_cfs, rainfall_in, timestamp) VALUES
-- Bexar readings showing concerning trends
('bexar-01', 8.5, 1250, 0.5, NOW() - INTERVAL '6 hours'),
('bexar-01', 9.2, 1450, 0.8, NOW() - INTERVAL '5 hours'),
('bexar-01', 10.1, 1680, 1.2, NOW() - INTERVAL '4 hours'),
('bexar-01', 11.3, 1920, 1.5, NOW() - INTERVAL '3 hours'),
('bexar-01', 12.5, 2200, 1.8, NOW() - INTERVAL '2 hours'),
('bexar-01', 13.2, 2450, 2.1, NOW() - INTERVAL '1 hour'),
('bexar-01', 13.8, 2680, 2.3, NOW()),

-- Kerr readings showing moderate conditions
('kerr-01', 10.2, 2800, 0.3, NOW() - INTERVAL '6 hours'),
('kerr-01', 10.5, 2950, 0.4, NOW() - INTERVAL '5 hours'),
('kerr-01', 10.8, 3100, 0.5, NOW() - INTERVAL '4 hours'),
('kerr-01', 11.2, 3250, 0.6, NOW() - INTERVAL '3 hours'),
('kerr-01', 11.5, 3400, 0.7, NOW() - INTERVAL '2 hours'),
('kerr-01', 11.8, 3550, 0.8, NOW() - INTERVAL '1 hour'),
('kerr-01', 12.1, 3700, 0.9, NOW());

-- Insert district zones
INSERT INTO zones (id, name, type, geometry, population, metadata) VALUES
-- Bexar County zones
('zone-bexar-school-01', 'Northside ISD', 'school',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(-98.55 29.55, -98.45 29.55, -98.45 29.45, -98.55 29.45, -98.55 29.55)')), 4326),
 45000, '{"schools": 12, "priority": 1}'),

('zone-bexar-emergency-01', 'University Hospital', 'emergency',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(-98.52 29.51, -98.48 29.51, -98.48 29.47, -98.52 29.47, -98.52 29.51)')), 4326),
 5000, '{"beds": 800, "critical": true}'),

('zone-bexar-residential-01', 'Stone Oak', 'residential',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(-98.50 29.62, -98.42 29.62, -98.42 29.54, -98.50 29.54, -98.50 29.62)')), 4326),
 25000, '{"households": 8500}'),

-- Kerr County zones
('zone-kerr-school-01', 'Kerrville ISD', 'school',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(-99.16 30.06, -99.12 30.06, -99.12 30.02, -99.16 30.02, -99.16 30.06)')), 4326),
 8000, '{"schools": 5, "priority": 1}'),

('zone-kerr-emergency-01', 'Peterson Regional Medical', 'emergency',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(-99.15 30.05, -99.13 30.05, -99.13 30.03, -99.15 30.03, -99.15 30.05)')), 4326),
 2000, '{"beds": 200, "critical": true}');

-- Insert active alerts
INSERT INTO alerts (id, type, severity, title, description, affected_area, expires_at, metadata) VALUES
(gen_random_uuid(), 'flood_warning', 'high',
 'Flash Flood Warning - Bexar County',
 'Heavy rainfall has caused rapid water rise in Huebner Creek. Low-water crossings are impassable.',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(-98.45 29.52, -98.35 29.52, -98.35 29.48, -98.45 29.48, -98.45 29.52)')), 4326),
 NOW() + INTERVAL '6 hours',
 '{"source": "NWS", "certainty": "observed"}'),

(gen_random_uuid(), 'flood_watch', 'moderate',
 'Flood Watch - Kerr County',
 'Guadalupe River levels rising steadily. Monitor conditions closely.',
 ST_SetSRID(ST_MakePolygon(ST_GeomFromText('LINESTRING(-99.18 30.08, -99.10 30.08, -99.10 30.02, -99.18 30.02, -99.18 30.08)')), 4326),
 NOW() + INTERVAL '12 hours',
 '{"source": "RiverAlert", "certainty": "likely"}');

-- Insert evacuation routes
INSERT INTO evacuation_routes (id, name, description, route_geometry, distance_miles, estimated_time_minutes, status) VALUES
(gen_random_uuid(), 'Bexar North Route',
 'Primary evacuation route from North Bexar to higher ground via I-35',
 ST_SetSRID(ST_GeomFromText('LINESTRING(-98.45 29.50, -98.44 29.52, -98.43 29.54, -98.42 29.56, -98.41 29.58)'), 4326),
 12.5, 18, 'open'),

(gen_random_uuid(), 'Kerr West Route',
 'Evacuation route from Kerrville west via Highway 27',
 ST_SetSRID(ST_GeomFromText('LINESTRING(-99.14 30.05, -99.16 30.05, -99.18 30.06, -99.20 30.07, -99.22 30.08)'), 4326),
 8.3, 12, 'open');

-- Insert ML model predictions (for demo)
INSERT INTO predictions (sensor_id, model_type, prediction_horizon_hours, predicted_values, confidence_score, created_at) VALUES
('bexar-01', 'lstm_nn_ensemble', 6,
 '[14.2, 14.8, 15.3, 15.7, 16.0, 16.2]',
 0.85, NOW()),

('kerr-01', 'lstm_nn_ensemble', 6,
 '[12.3, 12.5, 12.7, 12.8, 12.9, 12.9]',
 0.78, NOW());

-- Create demo notification subscriptions
INSERT INTO notification_subscriptions (user_id, channel, target, zone_ids, alert_severities) VALUES
('demo-user-1', 'sms', '+1-210-555-0001', ARRAY['zone-bexar-school-01'], ARRAY['high', 'extreme']),
('demo-user-2', 'email', 'emergency@bexarcounty.gov', ARRAY['zone-bexar-emergency-01'], ARRAY['moderate', 'high', 'extreme']),
('demo-user-3', 'app', 'fcm-token-123', ARRAY['zone-kerr-school-01'], ARRAY['high', 'extreme']);
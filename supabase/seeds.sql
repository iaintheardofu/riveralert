-- Seed data for RiverAlert including Kerrville incident demonstration
-- Based on July 4, 2025 Guadalupe River flooding event

-- Insert test organization
INSERT INTO organizations (id, name, slug) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kerr County Emergency Management', 'kerr-county'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Bexar County Flood Control', 'bexar-county');

-- Insert sensors for Kerrville area (Guadalupe River)
INSERT INTO sensors (external_id, name, type, status, location, elevation_m, organization_id, installed_at) VALUES
    -- Kerrville sensors
    ('USGS-08167000', 'Guadalupe River at Comfort', 'usgs', 'active',
     ST_GeogFromText('POINT(-98.9078 29.9678)'), 1404, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '2024-01-15'),
    ('KRVT2', 'Guadalupe River at Kerrville', 'usgs', 'active',
     ST_GeogFromText('POINT(-99.1403 30.0474)'), 1645, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '2024-01-15'),
    ('SNS-001', 'Hunt Bridge Sensor', 'radar', 'active',
     ST_GeogFromText('POINT(-99.3356 30.0703)'), 1720, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '2024-06-01'),
    -- Bexar County sensors
    ('SNS-BCX-001', 'Salado Creek at Rittiman Road', 'radar', 'active',
     ST_GeogFromText('POINT(-98.451 29.507)'), 650, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', '2025-03-01'),
    ('SNS-BCX-002', 'Leon Creek at Bandera Road', 'radar', 'active',
     ST_GeogFromText('POINT(-98.6278 29.4567)'), 850, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', '2025-03-01'),
    ('SNS-BCX-003', 'Martinez Creek at Somerset Road', 'ultrasonic', 'active',
     ST_GeogFromText('POINT(-98.6556 29.2111)'), 500, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', '2025-03-01');

-- Insert crossings
INSERT INTO crossings (name, location, status, road_name, flood_stage_ft, action_stage_ft, critical_stage_ft, organization_id) VALUES
    -- Kerrville crossings
    ('Guadalupe River at Hunt', ST_GeogFromText('POINT(-99.3356 30.0703)'), 'open', 'FM 1340', 10.0, 8.0, 15.0, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('Guadalupe River at Kerrville', ST_GeogFromText('POINT(-99.1403 30.0474)'), 'open', 'TX-27', 13.0, 10.0, 20.0, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('Guadalupe River at Comfort', ST_GeogFromText('POINT(-98.9078 29.9678)'), 'open', 'US-87', 19.0, 15.0, 25.0, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    -- Bexar County crossings
    ('Salado Creek at Rittiman Road', ST_GeogFromText('POINT(-98.451 29.507)'), 'open', 'Rittiman Road', 5.0, 3.0, 8.0, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
    ('Leon Creek at Bandera Road', ST_GeogFromText('POINT(-98.6278 29.4567)'), 'open', 'Bandera Road', 6.0, 4.0, 10.0, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
    ('Martinez Creek at Somerset Road', ST_GeogFromText('POINT(-98.6556 29.2111)'), 'open', 'Somerset Road', 4.0, 2.0, 7.0, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12');

-- Map sensors to crossings
INSERT INTO sensor_crossings (sensor_id, crossing_id, is_primary)
SELECT s.id, c.id, true
FROM sensors s
JOIN crossings c ON c.name LIKE '%' ||
    CASE
        WHEN s.name LIKE '%Hunt%' THEN 'Hunt'
        WHEN s.name LIKE '%Kerrville%' THEN 'Kerrville'
        WHEN s.name LIKE '%Comfort%' THEN 'Comfort'
        WHEN s.name LIKE '%Salado%' THEN 'Salado'
        WHEN s.name LIKE '%Leon%' THEN 'Leon'
        WHEN s.name LIKE '%Martinez%' THEN 'Martinez'
    END || '%';

-- Insert historical readings simulating July 4, 2025 Kerrville flood event
-- Timeline: Normal → Rising → Critical → Extreme → Peak → Receding
WITH time_series AS (
    SELECT generate_series(
        '2025-07-04 00:00:00'::timestamp,
        '2025-07-04 12:00:00'::timestamp,
        '15 minutes'::interval
    ) AS ts
)
INSERT INTO readings (sensor_id, water_level_ft, timestamp, quality_score)
SELECT
    (SELECT id FROM sensors WHERE external_id = 'SNS-001'),
    CASE
        WHEN ts < '2025-07-04 03:00:00' THEN 2.5 + random() * 0.5  -- Normal
        WHEN ts < '2025-07-04 03:30:00' THEN 4.0 + random() * 2.0  -- Rising
        WHEN ts < '2025-07-04 04:00:00' THEN 8.0 + random() * 3.0  -- Action stage
        WHEN ts < '2025-07-04 05:00:00' THEN 15.0 + random() * 5.0 -- Flood stage
        WHEN ts < '2025-07-04 06:00:00' THEN 25.0 + random() * 5.0 -- Critical
        WHEN ts < '2025-07-04 07:00:00' THEN 35.0 + random() * 2.0 -- Peak (37 ft)
        ELSE 30.0 - (EXTRACT(epoch FROM ts - '2025-07-04 07:00:00') / 3600) * 3 -- Receding
    END,
    ts,
    0.95 + random() * 0.05
FROM time_series;

-- Insert current readings for Bexar County sensors (normal conditions)
INSERT INTO readings (sensor_id, water_level_ft, timestamp, quality_score, battery_voltage, signal_strength)
SELECT
    s.id,
    1.5 + random() * 1.0,
    NOW() - (random() * INTERVAL '30 minutes'),
    0.95 + random() * 0.05,
    12.4 + random() * 0.4,
    -65 + floor(random() * 20)::int
FROM sensors s
WHERE s.external_id LIKE 'SNS-BCX-%';

-- Insert sample alerts for Kerrville event
INSERT INTO alerts (crossing_id, sensor_id, severity, water_level_ft, threshold_exceeded_ft, message, issued_at, expires_at) VALUES
    (
        (SELECT id FROM crossings WHERE name = 'Guadalupe River at Hunt'),
        (SELECT id FROM sensors WHERE external_id = 'SNS-001'),
        'extreme',
        37.0,
        22.0,
        'EXTREME FLOOD WARNING: Guadalupe River at Hunt has reached 37 feet - life-threatening flooding in progress',
        '2025-07-04 05:34:00',
        '2025-07-04 12:00:00'
    ),
    (
        (SELECT id FROM crossings WHERE name = 'Salado Creek at Rittiman Road'),
        (SELECT id FROM sensors WHERE external_id = 'SNS-BCX-001'),
        'low',
        2.8,
        0.0,
        'Water level at Salado Creek is approaching action stage',
        NOW() - INTERVAL '2 hours',
        NOW() + INTERVAL '2 hours'
    );

-- Insert demo API keys
INSERT INTO api_keys (organization_id, name, key_hash, scopes, created_by) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'IoT Sensor Network',
     '$2b$10$K7L1OJ0TfmCmqz5t6e3kY.kP4Gkq1S1kH8gC5B8mN3jL9kF6H8sK2',
     '{readings:write,alerts:read}', NULL),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Public Dashboard',
     '$2b$10$L8M2PK1UgmDnra6u7f4lZ.lQ5Hlr2T2lI9hD6C9nO4kM0lG7I9tL3',
     '{alerts:read,crossings:read}', NULL);

-- Create a function to generate recent readings for demo
CREATE OR REPLACE FUNCTION generate_demo_readings()
RETURNS void AS $$
BEGIN
    -- Generate readings for the last hour
    INSERT INTO readings (sensor_id, water_level_ft, timestamp, quality_score, battery_voltage, signal_strength)
    SELECT
        s.id,
        CASE
            WHEN s.external_id LIKE 'SNS-BCX-%' THEN 1.5 + random() * 2.0
            ELSE 3.0 + random() * 3.0
        END,
        NOW() - (i * INTERVAL '5 minutes'),
        0.90 + random() * 0.10,
        12.0 + random() * 0.8,
        -70 + floor(random() * 25)::int
    FROM sensors s
    CROSS JOIN generate_series(0, 11) AS i
    WHERE s.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Generate demo readings
SELECT generate_demo_readings();

-- Refresh materialized view
REFRESH MATERIALIZED VIEW current_conditions;
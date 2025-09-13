-- Seed data for RiverAlert demo

-- Insert organizations
INSERT INTO organizations (id, name, type, contact_email, contact_phone, website) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Bexar County Emergency Management', 'Government', 'emergency@bexar.gov', '210-335-0300', 'https://www.bexar.org'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'San Antonio River Authority', 'Government', 'info@sara-tx.org', '210-227-1373', 'https://www.sariverauthority.org'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'USGS Texas Water Science Center', 'Federal', 'info@usgs.gov', '512-927-3500', 'https://www.usgs.gov/centers/tx-water');

-- Insert zones (San Antonio area)
INSERT INTO zones (id, name, organization_id, boundary, risk_level, population) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'Downtown San Antonio', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    ST_GeomFromText('POLYGON((-98.5 29.42, -98.5 29.44, -98.48 29.44, -98.48 29.42, -98.5 29.42))', 4326),
    'high', 25000),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'Brackenridge Park Area', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    ST_GeomFromText('POLYGON((-98.47 29.45, -98.47 29.47, -98.45 29.47, -98.45 29.45, -98.47 29.45))', 4326),
    'moderate', 15000),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13', 'Leon Valley', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    ST_GeomFromText('POLYGON((-98.62 29.48, -98.62 29.50, -98.60 29.50, -98.60 29.48, -98.62 29.48))', 4326),
    'high', 12000);

-- Insert sensors
INSERT INTO sensors (id, external_id, name, type, location, zone_id, organization_id, status, installation_date) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 'USGS-08178050', 'San Antonio River at Mitchell St', 'water_level',
    ST_GeomFromText('POINT(-98.4936 29.4241)', 4326), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'active', '2020-01-15'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c12', 'SARA-001', 'San Pedro Creek at Houston St', 'water_level',
    ST_GeomFromText('POINT(-98.4989 29.4267)', 4326), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'active', '2019-06-01'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c13', 'SARA-002', 'Olmos Creek at Dresden Dr', 'water_level',
    ST_GeomFromText('POINT(-98.4628 29.4589)', 4326), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'active', '2018-03-20'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c14', 'USGS-08181500', 'Medina River at San Antonio', 'water_level',
    ST_GeomFromText('POINT(-98.5481 29.3389)', 4326), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'active', '2015-11-10'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c15', 'SARA-003', 'Leon Creek at Loop 410', 'water_level',
    ST_GeomFromText('POINT(-98.6125 29.4897)', 4326), 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'active', '2021-02-28');

-- Insert crossings
INSERT INTO crossings (id, name, location, zone_id, sensor_id, status, closure_threshold, warning_threshold, road_name) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d11', 'Josephine St Crossing', ST_GeomFromText('POINT(-98.4875 29.4189)', 4326),
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 'open', 5.0, 3.0, 'Josephine Street'),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d12', 'Broadway at Hildebrand', ST_GeomFromText('POINT(-98.4628 29.4589)', 4326),
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c13', 'open', 4.5, 2.5, 'Broadway Street'),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d13', 'Babcock Rd at Huebner Creek', ST_GeomFromText('POINT(-98.6089 29.4911)', 4326),
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c15', 'open', 4.0, 2.0, 'Babcock Road'),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d14', 'Commerce St Bridge', ST_GeomFromText('POINT(-98.4936 29.4241)', 4326),
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 'open', 6.0, 4.0, 'Commerce Street'),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d15', 'Culebra Rd at Alazan Creek', ST_GeomFromText('POINT(-98.5456 29.4511)', 4326),
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c12', 'open', 3.5, 2.0, 'Culebra Road');

-- Insert recent sensor readings (simulating real-time data)
INSERT INTO sensor_readings (sensor_id, water_level, flow_rate, temperature, battery_level, timestamp) VALUES
-- San Antonio River readings
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 1.2, 45.5, 22.3, 95.0, NOW() - INTERVAL '2 hours'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 1.3, 48.2, 22.1, 94.8, NOW() - INTERVAL '1 hour 30 minutes'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 1.4, 52.1, 22.0, 94.5, NOW() - INTERVAL '1 hour'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 1.5, 55.3, 21.8, 94.2, NOW() - INTERVAL '30 minutes'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 1.6, 58.7, 21.5, 94.0, NOW()),

-- San Pedro Creek readings
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c12', 0.8, 22.3, 23.1, 89.5, NOW() - INTERVAL '2 hours'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c12', 0.9, 24.1, 23.0, 89.2, NOW() - INTERVAL '1 hour 30 minutes'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c12', 1.0, 26.5, 22.8, 89.0, NOW() - INTERVAL '1 hour'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c12', 1.1, 28.2, 22.6, 88.8, NOW() - INTERVAL '30 minutes'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c12', 1.2, 30.1, 22.4, 88.5, NOW()),

-- Olmos Creek readings (elevated levels)
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c13', 2.5, 78.5, 21.5, 91.0, NOW() - INTERVAL '2 hours'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c13', 2.8, 85.2, 21.3, 90.8, NOW() - INTERVAL '1 hour 30 minutes'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c13', 3.2, 92.1, 21.1, 90.5, NOW() - INTERVAL '1 hour'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c13', 3.5, 98.7, 20.9, 90.2, NOW() - INTERVAL '30 minutes'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c13', 3.8, 105.3, 20.7, 90.0, NOW()),

-- Medina River readings
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c14', 1.8, 62.4, 24.2, 87.5, NOW() - INTERVAL '2 hours'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c14', 1.9, 64.8, 24.0, 87.2, NOW() - INTERVAL '1 hour 30 minutes'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c14', 2.0, 67.2, 23.8, 87.0, NOW() - INTERVAL '1 hour'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c14', 2.1, 69.5, 23.6, 86.8, NOW() - INTERVAL '30 minutes'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c14', 2.2, 71.8, 23.4, 86.5, NOW()),

-- Leon Creek readings (warning level)
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c15', 3.8, 110.5, 20.8, 92.0, NOW() - INTERVAL '2 hours'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c15', 4.2, 125.3, 20.6, 91.8, NOW() - INTERVAL '1 hour 30 minutes'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c15', 4.5, 138.7, 20.4, 91.5, NOW() - INTERVAL '1 hour'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c15', 4.8, 145.2, 20.2, 91.2, NOW() - INTERVAL '30 minutes'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c15', 5.1, 152.8, 20.0, 91.0, NOW());

-- Insert sample weather data
INSERT INTO weather_data (location, temperature, precipitation, humidity, wind_speed, wind_direction, pressure, conditions, source, timestamp) VALUES
(ST_GeomFromText('POINT(-98.4936 29.4241)', 4326), 22.5, 0.0, 65, 12.5, 180, 1013.2, 'Partly Cloudy', 'NWS', NOW()),
(ST_GeomFromText('POINT(-98.4628 29.4589)', 4326), 22.3, 0.0, 68, 10.8, 175, 1013.0, 'Partly Cloudy', 'NWS', NOW()),
(ST_GeomFromText('POINT(-98.6125 29.4897)', 4326), 21.8, 2.5, 75, 15.2, 190, 1012.8, 'Light Rain', 'NWS', NOW());

-- Note: The trigger will automatically generate alerts based on water levels when readings are inserted
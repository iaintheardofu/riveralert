-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create custom types
CREATE TYPE alert_severity AS ENUM ('low', 'moderate', 'high', 'extreme');
CREATE TYPE sensor_status AS ENUM ('active', 'inactive', 'maintenance');
CREATE TYPE crossing_status AS ENUM ('open', 'closed', 'warning');

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    website VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Zones table for geographic areas
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    boundary GEOMETRY(Polygon, 4326),
    risk_level VARCHAR(50),
    population INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sensors table
CREATE TABLE IF NOT EXISTS sensors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    location GEOMETRY(Point, 4326),
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    status sensor_status DEFAULT 'active',
    installation_date DATE,
    last_maintenance DATE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Low water crossings table
CREATE TABLE IF NOT EXISTS crossings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location GEOMETRY(Point, 4326),
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    sensor_id UUID REFERENCES sensors(id) ON DELETE SET NULL,
    status crossing_status DEFAULT 'open',
    closure_threshold DECIMAL(10, 2),
    warning_threshold DECIMAL(10, 2),
    road_name VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sensor readings table
CREATE TABLE IF NOT EXISTS sensor_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id UUID REFERENCES sensors(id) ON DELETE CASCADE,
    water_level DECIMAL(10, 2),
    flow_rate DECIMAL(10, 2),
    temperature DECIMAL(5, 2),
    battery_level DECIMAL(5, 2),
    raw_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_sensor_timestamp UNIQUE (sensor_id, timestamp)
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
    sensor_id UUID REFERENCES sensors(id) ON DELETE SET NULL,
    crossing_id UUID REFERENCES crossings(id) ON DELETE SET NULL,
    severity alert_severity NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    location GEOMETRY(Point, 4326),
    is_active BOOLEAN DEFAULT true,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Weather data table
CREATE TABLE IF NOT EXISTS weather_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location GEOMETRY(Point, 4326),
    temperature DECIMAL(5, 2),
    precipitation DECIMAL(10, 2),
    humidity DECIMAL(5, 2),
    wind_speed DECIMAL(10, 2),
    wind_direction INTEGER,
    pressure DECIMAL(10, 2),
    conditions VARCHAR(255),
    forecast JSONB,
    source VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_sensors_location ON sensors USING GIST (location);
CREATE INDEX idx_zones_boundary ON zones USING GIST (boundary);
CREATE INDEX idx_crossings_location ON crossings USING GIST (location);
CREATE INDEX idx_alerts_location ON alerts USING GIST (location);
CREATE INDEX idx_sensor_readings_sensor_timestamp ON sensor_readings (sensor_id, timestamp DESC);
CREATE INDEX idx_alerts_active ON alerts (is_active) WHERE is_active = true;
CREATE INDEX idx_weather_data_timestamp ON weather_data (timestamp DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sensors_updated_at BEFORE UPDATE ON sensors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crossings_updated_at BEFORE UPDATE ON crossings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically generate alerts based on water levels
CREATE OR REPLACE FUNCTION generate_water_level_alert()
RETURNS TRIGGER AS $$
DECLARE
    v_severity alert_severity;
    v_crossing RECORD;
BEGIN
    -- Determine severity based on water level
    IF NEW.water_level >= 10 THEN
        v_severity := 'extreme';
    ELSIF NEW.water_level >= 7 THEN
        v_severity := 'high';
    ELSIF NEW.water_level >= 4 THEN
        v_severity := 'moderate';
    ELSIF NEW.water_level >= 2 THEN
        v_severity := 'low';
    ELSE
        RETURN NEW; -- No alert needed
    END IF;

    -- Check if there's an active alert for this sensor
    IF NOT EXISTS (
        SELECT 1 FROM alerts
        WHERE sensor_id = NEW.sensor_id
        AND is_active = true
        AND severity = v_severity
    ) THEN
        -- Get sensor location
        INSERT INTO alerts (
            sensor_id,
            severity,
            title,
            message,
            location
        )
        SELECT
            NEW.sensor_id,
            v_severity,
            'Water Level Alert - ' || s.name,
            'Water level at ' || s.name || ' has reached ' || NEW.water_level || ' meters',
            s.location
        FROM sensors s
        WHERE s.id = NEW.sensor_id;
    END IF;

    -- Update crossing status if applicable
    FOR v_crossing IN
        SELECT * FROM crossings
        WHERE sensor_id = NEW.sensor_id
    LOOP
        IF NEW.water_level >= v_crossing.closure_threshold THEN
            UPDATE crossings SET status = 'closed' WHERE id = v_crossing.id;
        ELSIF NEW.water_level >= v_crossing.warning_threshold THEN
            UPDATE crossings SET status = 'warning' WHERE id = v_crossing.id;
        ELSE
            UPDATE crossings SET status = 'open' WHERE id = v_crossing.id;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic alert generation
CREATE TRIGGER trigger_water_level_alert
AFTER INSERT ON sensor_readings
FOR EACH ROW
EXECUTE FUNCTION generate_water_level_alert();

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE crossings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (for demo)
CREATE POLICY "Public read access" ON organizations FOR SELECT USING (true);
CREATE POLICY "Public read access" ON zones FOR SELECT USING (true);
CREATE POLICY "Public read access" ON sensors FOR SELECT USING (true);
CREATE POLICY "Public read access" ON crossings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON sensor_readings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON alerts FOR SELECT USING (true);
CREATE POLICY "Public read access" ON weather_data FOR SELECT USING (true);
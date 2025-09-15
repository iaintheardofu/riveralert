-- RiverAlert Database Schema
-- Enable PostGIS extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE alert_severity AS ENUM ('low', 'moderate', 'high', 'extreme');
CREATE TYPE alert_type AS ENUM ('flood_warning', 'flood_watch', 'flash_flood', 'river_flood', 'coastal_flood');
CREATE TYPE sensor_status AS ENUM ('active', 'inactive', 'maintenance', 'error');
CREATE TYPE sensor_type AS ENUM ('water_level', 'flow_rate', 'rainfall', 'combined', 'weather');

-- Sensors table
CREATE TABLE sensors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type sensor_type NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    status sensor_status DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for spatial queries
CREATE INDEX idx_sensors_location ON sensors USING GIST (location);
CREATE INDEX idx_sensors_status ON sensors (status);
CREATE INDEX idx_sensors_type ON sensors (type);

-- Sensor readings table
CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id TEXT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    water_level_ft REAL,
    flow_cfs REAL,
    rainfall_in REAL,
    temperature_f REAL,
    humidity_percent REAL,
    pressure_mb REAL,
    wind_speed_mph REAL,
    wind_direction_deg REAL,
    soil_moisture_percent REAL,
    turbidity_ntu REAL,
    ph REAL,
    dissolved_oxygen_mg_l REAL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for time-series queries
CREATE INDEX idx_sensor_readings_sensor_time ON sensor_readings (sensor_id, timestamp DESC);
CREATE INDEX idx_sensor_readings_timestamp ON sensor_readings (timestamp DESC);

-- Zones table (for district-specific alerts)
CREATE TABLE zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'school', 'emergency', 'residential', 'commercial'
    geometry GEOMETRY(POLYGON, 4326) NOT NULL,
    population INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for spatial queries
CREATE INDEX idx_zones_geometry ON zones USING GIST (geometry);
CREATE INDEX idx_zones_type ON zones (type);

-- Alerts table
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type alert_type NOT NULL,
    severity alert_severity NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    affected_area GEOMETRY(POLYGON, 4326),
    zone_ids TEXT[] DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for alert queries
CREATE INDEX idx_alerts_severity ON alerts (severity);
CREATE INDEX idx_alerts_type ON alerts (type);
CREATE INDEX idx_alerts_active ON alerts (is_active, created_at DESC);
CREATE INDEX idx_alerts_affected_area ON alerts USING GIST (affected_area);

-- Evacuation routes table
CREATE TABLE evacuation_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    route_geometry GEOMETRY(LINESTRING, 4326) NOT NULL,
    distance_miles REAL,
    estimated_time_minutes INTEGER,
    status TEXT DEFAULT 'open', -- 'open', 'closed', 'restricted'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for spatial queries
CREATE INDEX idx_evacuation_routes_geometry ON evacuation_routes USING GIST (route_geometry);
CREATE INDEX idx_evacuation_routes_status ON evacuation_routes (status);

-- ML Predictions table
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id TEXT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    model_type TEXT NOT NULL,
    prediction_horizon_hours INTEGER NOT NULL,
    predicted_values JSONB NOT NULL, -- Array of predicted values
    confidence_score REAL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for prediction queries
CREATE INDEX idx_predictions_sensor_time ON predictions (sensor_id, created_at DESC);
CREATE INDEX idx_predictions_model ON predictions (model_type);

-- Weather data table
CREATE TABLE weather_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location GEOMETRY(POINT, 4326) NOT NULL,
    temperature_f REAL,
    humidity_percent REAL,
    pressure_mb REAL,
    wind_speed_mph REAL,
    wind_direction_deg REAL,
    precipitation_in REAL,
    conditions TEXT,
    visibility_mi REAL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for weather data
CREATE INDEX idx_weather_data_location ON weather_data USING GIST (location);
CREATE INDEX idx_weather_data_timestamp ON weather_data (timestamp DESC);

-- Notification subscriptions table
CREATE TABLE notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    channel TEXT NOT NULL, -- 'email', 'sms', 'push', 'app'
    target TEXT NOT NULL, -- email address, phone number, or device token
    zone_ids TEXT[] DEFAULT '{}',
    alert_severities alert_severity[] DEFAULT '{moderate,high,extreme}',
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for notification queries
CREATE INDEX idx_notification_subscriptions_user ON notification_subscriptions (user_id);
CREATE INDEX idx_notification_subscriptions_active ON notification_subscriptions (is_active);

-- Real-time sensor data aggregates (for performance)
CREATE TABLE sensor_aggregates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id TEXT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    time_bucket TIMESTAMPTZ NOT NULL,
    interval_minutes INTEGER NOT NULL, -- 5, 15, 60 minute intervals
    avg_water_level_ft REAL,
    max_water_level_ft REAL,
    min_water_level_ft REAL,
    avg_flow_cfs REAL,
    total_rainfall_in REAL,
    reading_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for aggregate queries
CREATE INDEX idx_sensor_aggregates_sensor_bucket ON sensor_aggregates (sensor_id, time_bucket DESC);
CREATE INDEX idx_sensor_aggregates_interval ON sensor_aggregates (interval_minutes, time_bucket DESC);

-- Row Level Security (RLS) policies
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE evacuation_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_aggregates ENABLE ROW LEVEL SECURITY;

-- Public read access for most tables (adjust as needed for your security requirements)
CREATE POLICY "Public read access" ON sensors FOR SELECT USING (true);
CREATE POLICY "Public read access" ON sensor_readings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON zones FOR SELECT USING (true);
CREATE POLICY "Public read access" ON alerts FOR SELECT USING (true);
CREATE POLICY "Public read access" ON evacuation_routes FOR SELECT USING (true);
CREATE POLICY "Public read access" ON predictions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON weather_data FOR SELECT USING (true);
CREATE POLICY "Public read access" ON sensor_aggregates FOR SELECT USING (true);

-- Service role can insert/update sensor readings (for IoT devices)
CREATE POLICY "Service role can insert sensor readings" ON sensor_readings
FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can insert predictions" ON predictions
FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- User-specific access for notification subscriptions
CREATE POLICY "Users can manage their subscriptions" ON notification_subscriptions
FOR ALL USING (auth.uid()::text = user_id);

-- Functions for real-time aggregation
CREATE OR REPLACE FUNCTION update_sensor_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    -- Update 5-minute aggregates
    INSERT INTO sensor_aggregates (
        sensor_id,
        time_bucket,
        interval_minutes,
        avg_water_level_ft,
        max_water_level_ft,
        min_water_level_ft,
        avg_flow_cfs,
        total_rainfall_in,
        reading_count
    )
    SELECT
        NEW.sensor_id,
        date_trunc('minute', NEW.timestamp) + INTERVAL '5 minute' * FLOOR(EXTRACT(MINUTE FROM NEW.timestamp) / 5),
        5,
        AVG(water_level_ft),
        MAX(water_level_ft),
        MIN(water_level_ft),
        AVG(flow_cfs),
        SUM(rainfall_in),
        COUNT(*)
    FROM sensor_readings
    WHERE sensor_id = NEW.sensor_id
      AND timestamp >= date_trunc('minute', NEW.timestamp) + INTERVAL '5 minute' * FLOOR(EXTRACT(MINUTE FROM NEW.timestamp) / 5)
      AND timestamp < date_trunc('minute', NEW.timestamp) + INTERVAL '5 minute' * (FLOOR(EXTRACT(MINUTE FROM NEW.timestamp) / 5) + 1)
    ON CONFLICT (sensor_id, time_bucket, interval_minutes)
    DO UPDATE SET
        avg_water_level_ft = EXCLUDED.avg_water_level_ft,
        max_water_level_ft = EXCLUDED.max_water_level_ft,
        min_water_level_ft = EXCLUDED.min_water_level_ft,
        avg_flow_cfs = EXCLUDED.avg_flow_cfs,
        total_rainfall_in = EXCLUDED.total_rainfall_in,
        reading_count = EXCLUDED.reading_count;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic aggregation
CREATE TRIGGER trigger_update_sensor_aggregates
    AFTER INSERT ON sensor_readings
    FOR EACH ROW
    EXECUTE FUNCTION update_sensor_aggregates();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_sensors_updated_at BEFORE UPDATE ON sensors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evacuation_routes_updated_at BEFORE UPDATE ON evacuation_routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_subscriptions_updated_at BEFORE UPDATE ON notification_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
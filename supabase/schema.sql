-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Create custom types
CREATE TYPE alert_severity AS ENUM ('low', 'moderate', 'high', 'extreme');
CREATE TYPE crossing_status AS ENUM ('open', 'closed', 'caution');
CREATE TYPE sensor_type AS ENUM ('radar', 'ultrasonic', 'pressure', 'manual', 'usgs', 'nws');
CREATE TYPE sensor_status AS ENUM ('active', 'inactive', 'maintenance', 'error');

-- Organizations for multi-tenancy
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- User roles
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'official', 'resident', 'viewer')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Sensors
CREATE TABLE sensors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type sensor_type NOT NULL,
    status sensor_status DEFAULT 'active',
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    elevation_m DECIMAL(6,2),
    organization_id UUID REFERENCES organizations(id),
    installed_at TIMESTAMP,
    last_maintenance TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sensors_location ON sensors USING GIST(location);
CREATE INDEX idx_sensors_status ON sensors(status) WHERE status = 'active';

-- Crossings
CREATE TABLE crossings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    status crossing_status DEFAULT 'open',
    road_name VARCHAR(255),
    flood_stage_ft DECIMAL(5,2),
    action_stage_ft DECIMAL(5,2),
    critical_stage_ft DECIMAL(5,2),
    organization_id UUID REFERENCES organizations(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_crossings_location ON crossings USING GIST(location);
CREATE INDEX idx_crossings_status ON crossings(status);

-- Sensor-Crossing mapping
CREATE TABLE sensor_crossings (
    sensor_id UUID REFERENCES sensors(id) ON DELETE CASCADE,
    crossing_id UUID REFERENCES crossings(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    PRIMARY KEY (sensor_id, crossing_id)
);

-- Readings (partitioned by month)
CREATE TABLE readings (
    id UUID DEFAULT uuid_generate_v4(),
    sensor_id UUID NOT NULL REFERENCES sensors(id),
    water_level_ft DECIMAL(5,2) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
    battery_voltage DECIMAL(4,2),
    signal_strength INTEGER,
    temperature_c DECIMAL(4,1),
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create initial partitions
CREATE TABLE readings_2025_09 PARTITION OF readings
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE readings_2025_10 PARTITION OF readings
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE readings_2025_11 PARTITION OF readings
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE readings_2025_12 PARTITION OF readings
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE INDEX idx_readings_sensor_timestamp ON readings(sensor_id, timestamp DESC);
CREATE INDEX idx_readings_timestamp ON readings(timestamp DESC);

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crossing_id UUID REFERENCES crossings(id),
    sensor_id UUID REFERENCES sensors(id),
    severity alert_severity NOT NULL,
    water_level_ft DECIMAL(5,2),
    threshold_exceeded_ft DECIMAL(5,2),
    rate_of_rise_ft_per_hour DECIMAL(4,2),
    message TEXT NOT NULL,
    affected_area GEOGRAPHY(POLYGON, 4326),
    issued_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    acknowledged_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_issued ON alerts(issued_at DESC);
CREATE INDEX idx_alerts_active ON alerts(expires_at) WHERE expires_at > NOW();
CREATE INDEX idx_alerts_area ON alerts USING GIST(affected_area);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID REFERENCES alerts(id),
    user_id UUID REFERENCES auth.users(id),
    channel VARCHAR(50) CHECK (channel IN ('push', 'sms', 'email', 'webhook')),
    recipient TEXT NOT NULL,
    message TEXT,
    status VARCHAR(20) CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_alert ON notifications(alert_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- User preferences
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_zones GEOGRAPHY(MULTIPOLYGON, 4326)[],
    alert_severities alert_severity[] DEFAULT '{moderate,high,extreme}',
    notification_channels TEXT[] DEFAULT '{push,email}',
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    language VARCHAR(5) DEFAULT 'en',
    units VARCHAR(10) DEFAULT 'imperial',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- API keys
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    scopes TEXT[] DEFAULT '{}',
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;

-- Audit log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- Materialized view for current conditions
CREATE MATERIALIZED VIEW current_conditions AS
SELECT
    c.id as crossing_id,
    c.name as crossing_name,
    c.location,
    c.status,
    c.flood_stage_ft,
    r.water_level_ft as current_level_ft,
    r.timestamp as last_reading,
    r.quality_score,
    CASE
        WHEN r.water_level_ft >= c.critical_stage_ft THEN 'extreme'
        WHEN r.water_level_ft >= c.flood_stage_ft THEN 'high'
        WHEN r.water_level_ft >= c.action_stage_ft THEN 'moderate'
        ELSE 'low'
    END as risk_level,
    s.status as sensor_status
FROM crossings c
LEFT JOIN LATERAL (
    SELECT r.*, sc.sensor_id
    FROM sensor_crossings sc
    JOIN readings r ON r.sensor_id = sc.sensor_id
    WHERE sc.crossing_id = c.id
    AND r.timestamp > NOW() - INTERVAL '1 hour'
    ORDER BY r.timestamp DESC
    LIMIT 1
) r ON true
LEFT JOIN sensors s ON s.id = r.sensor_id;

CREATE INDEX idx_current_conditions_crossing ON current_conditions(crossing_id);
CREATE INDEX idx_current_conditions_risk ON current_conditions(risk_level);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sensors_updated_at BEFORE UPDATE ON sensors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_crossings_updated_at BEFORE UPDATE ON crossings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Alert generation function
CREATE OR REPLACE FUNCTION check_water_level_alert()
RETURNS TRIGGER AS $$
DECLARE
    v_crossing crossings%ROWTYPE;
    v_severity alert_severity;
    v_message TEXT;
BEGIN
    SELECT c.* INTO v_crossing
    FROM crossings c
    JOIN sensor_crossings sc ON sc.crossing_id = c.id
    WHERE sc.sensor_id = NEW.sensor_id
    AND sc.is_primary = true;

    IF v_crossing.id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.water_level_ft >= v_crossing.critical_stage_ft THEN
        v_severity := 'extreme';
        v_message := format('EXTREME: Water level at %s is %s ft (Critical: %s ft)',
            v_crossing.name, NEW.water_level_ft, v_crossing.critical_stage_ft);
    ELSIF NEW.water_level_ft >= v_crossing.flood_stage_ft THEN
        v_severity := 'high';
        v_message := format('HIGH: Water level at %s is %s ft (Flood: %s ft)',
            v_crossing.name, NEW.water_level_ft, v_crossing.flood_stage_ft);
    ELSIF NEW.water_level_ft >= v_crossing.action_stage_ft THEN
        v_severity := 'moderate';
        v_message := format('MODERATE: Water level at %s is %s ft (Action: %s ft)',
            v_crossing.name, NEW.water_level_ft, v_crossing.action_stage_ft);
    ELSE
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM alerts
        WHERE crossing_id = v_crossing.id
        AND severity = v_severity
        AND expires_at > NOW()
    ) THEN
        INSERT INTO alerts (
            crossing_id,
            sensor_id,
            severity,
            water_level_ft,
            threshold_exceeded_ft,
            message,
            expires_at
        ) VALUES (
            v_crossing.id,
            NEW.sensor_id,
            v_severity,
            NEW.water_level_ft,
            NEW.water_level_ft - v_crossing.action_stage_ft,
            v_message,
            NOW() + INTERVAL '4 hours'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_water_level_alert
AFTER INSERT ON readings
FOR EACH ROW EXECUTE FUNCTION check_water_level_alert();

-- Enable RLS
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE crossings ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
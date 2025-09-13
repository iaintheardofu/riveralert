# RiverAlert Technical Appendices

---

# Appendix A1: Architecture Diagrams

## System Architecture

```mermaid
flowchart TB
    subgraph "Field Layer"
        S1[IoT Sensor 1]:::iot
        S2[IoT Sensor 2]:::iot
        SN[IoT Sensor N]:::iot
        GW[4G/LoRa Gateway]:::gateway
    end

    subgraph "External Data Sources"
        USGS[USGS Water Services API]:::external
        NWS[NOAA/NWS Weather API]:::external
        OSM[OpenStreetMap/Nominatim]:::external
        ORS[OpenRouteService]:::external
    end

    subgraph "Ingestion & Processing"
        ALB[API Load Balancer]:::infra
        ING[Ingestion Service]:::service
        QUEUE[BullMQ Queue]:::queue
        PROC[Data Processor]:::service
        ML[ML Risk Engine]:::ai
    end

    subgraph "Data Layer"
        PG[(PostgreSQL/PostGIS)]:::db
        REDIS[(Redis Cache)]:::cache
        S3[Object Storage]:::storage
    end

    subgraph "Realtime Layer"
        RT[Supabase Realtime]:::realtime
        CHAN1[Zone Channels]:::channel
        CHAN2[Crossing Channels]:::channel
        CHAN3[System Channel]:::channel
    end

    subgraph "API Layer"
        REST[REST API]:::api
        GQL[GraphQL API]:::api
        WS[WebSocket Server]:::api
    end

    subgraph "Client Applications"
        WEB[Next.js Web App]:::client
        IOS[iOS App]:::client
        AND[Android App]:::client
        ADMIN[Admin Dashboard]:::client
    end

    subgraph "External Services"
        FCM[Firebase Cloud Messaging]:::external
        SMTP[Email Service]:::external
        SMS[SMS Gateway]:::external
        GMAP[Google Maps]:::external
        WAZE[Waze Deep Links]:::external
    end

    %% Data flow connections
    S1 --> GW
    S2 --> GW
    SN --> GW
    GW --> ALB

    USGS --> ING
    NWS --> ING

    ALB --> ING
    ING --> QUEUE
    QUEUE --> PROC
    PROC --> ML
    ML --> PG
    PROC --> PG

    PG --> RT
    PG --> REST
    PG --> GQL

    RT --> CHAN1
    RT --> CHAN2
    RT --> CHAN3

    CHAN1 --> WS
    CHAN2 --> WS
    CHAN3 --> WS

    REST --> WEB
    REST --> IOS
    REST --> AND
    REST --> ADMIN

    WS --> WEB
    WS --> IOS
    WS --> AND

    REST --> FCM
    REST --> SMTP
    REST --> SMS

    OSM --> REST
    ORS --> REST
    GMAP --> WEB
    WAZE --> IOS
    WAZE --> AND

    classDef iot fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef external fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef infra fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef ai fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef db fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    classDef cache fill:#ffebee,stroke:#b71c1c,stroke-width:2px
    classDef storage fill:#f9fbe7,stroke:#827717,stroke-width:2px
    classDef realtime fill:#e0f2f1,stroke:#004d40,stroke-width:2px
    classDef channel fill:#e0f7fa,stroke:#006064,stroke-width:2px
    classDef api fill:#ede7f6,stroke:#311b92,stroke-width:2px
    classDef client fill:#e8eaf6,stroke:#1a237e,stroke-width:2px
    classDef queue fill:#ffefc,stroke:#f57c00,stroke-width:2px
```

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant Sensor as IoT Sensor
    participant Gateway as API Gateway
    participant Processor as Data Processor
    participant ML as ML Engine
    participant DB as PostgreSQL
    participant RT as Supabase Realtime
    participant Client as Mobile/Web App
    participant User as End User

    Sensor->>Gateway: POST /v1/readings (HMAC signed)
    Gateway->>Processor: Validate & Queue
    Processor->>DB: Store raw reading
    Processor->>ML: Analyze risk level
    ML->>ML: Calculate flood risk score
    ML-->>Processor: Risk assessment
    Processor->>DB: Update alert status

    alt High Risk Detected
        Processor->>RT: Broadcast alert
        RT->>Client: Push via WebSocket
        Client->>User: Display notification
        Processor->>Gateway: Trigger notifications
        Gateway-->>User: SMS/Push/Email
    end

    Client->>Gateway: GET /v1/routes?safe=true
    Gateway->>DB: Query current alerts
    DB-->>Gateway: Active alerts
    Gateway->>Gateway: Calculate safe route
    Gateway-->>Client: Return route
    Client->>User: Display on map
```

## Network Topology

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "CDN Layer"
            CF[Cloudflare CDN]
        end

        subgraph "Application Layer"
            VPC[Virtual Private Cloud]
            subgraph "Public Subnet"
                LB[Load Balancer]
                NAT[NAT Gateway]
            end

            subgraph "Private Subnet A"
                API1[API Server 1]
                API2[API Server 2]
            end

            subgraph "Private Subnet B"
                WORKER1[Worker 1]
                WORKER2[Worker 2]
            end

            subgraph "Database Subnet"
                PRIMARY[(Primary DB)]
                REPLICA[(Read Replica)]
            end
        end

        subgraph "Backup & Monitoring"
            BACKUP[S3 Backup]
            MONITOR[Monitoring Stack]
            LOGS[Log Aggregation]
        end
    end

    subgraph "External Services"
        SUPA[Supabase Cloud]
        APIS[External APIs]
        NOTIF[Notification Services]
    end

    CF --> LB
    LB --> API1
    LB --> API2
    API1 --> PRIMARY
    API2 --> REPLICA
    API1 --> WORKER1
    API2 --> WORKER2
    WORKER1 --> APIS
    WORKER2 --> NOTIF
    NAT --> APIS
    PRIMARY --> BACKUP
    API1 --> MONITOR
    API2 --> MONITOR
    WORKER1 --> LOGS
    WORKER2 --> LOGS
    API1 --> SUPA
    API2 --> SUPA
```

---

# Appendix A2: OpenAPI 3.0 Specification

```yaml
openapi: 3.0.3
info:
  title: RiverAlert Public API
  description: Real-time flood monitoring and alert system API
  version: 1.0.0
  contact:
    name: The AI Cowboys
    email: contact_us@theaicowboys.com
    url: https://www.theaicowboys.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.riveralert.com/v1
    description: Production server
  - url: http://localhost:3000/v1
    description: Development server

security:
  - ApiKeyAuth: []
  - BearerAuth: []

paths:
  /alerts:
    get:
      summary: List active flood alerts
      operationId: getAlerts
      tags:
        - Alerts
      parameters:
        - in: query
          name: bbox
          schema:
            type: string
            pattern: '^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$'
          description: Bounding box (minLon,minLat,maxLon,maxLat)
          example: "-98.6,29.3,-98.3,29.6"
        - in: query
          name: severity
          schema:
            type: string
            enum: [low, moderate, high, extreme]
          description: Filter by severity level
        - in: query
          name: active
          schema:
            type: boolean
            default: true
          description: Show only active alerts
        - in: query
          name: limit
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - in: query
          name: offset
          schema:
            type: integer
            minimum: 0
            default: 0
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Alert'
                  meta:
                    $ref: '#/components/schemas/PaginationMeta'
              example:
                data:
                  - id: "alrt_7f3a9c2d"
                    crossing_id: "crx_42"
                    severity: "high"
                    water_level_ft: 7.3
                    threshold_ft: 5.0
                    message: "High water detected at Salado Creek crossing"
                    location:
                      type: "Point"
                      coordinates: [-98.451, 29.507]
                    affected_area:
                      type: "Polygon"
                      coordinates: [[[-98.46, 29.50], [-98.44, 29.50], [-98.44, 29.52], [-98.46, 29.52], [-98.46, 29.50]]]
                    issued_at: "2025-09-13T14:03:00Z"
                    expires_at: "2025-09-13T18:00:00Z"
                meta:
                  total: 3
                  limit: 20
                  offset: 0
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '500':
          $ref: '#/components/responses/InternalError'

  /alerts/{alertId}:
    get:
      summary: Get alert details
      operationId: getAlertById
      tags:
        - Alerts
      parameters:
        - in: path
          name: alertId
          required: true
          schema:
            type: string
          description: Alert identifier
      responses:
        '200':
          description: Alert details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Alert'
        '404':
          $ref: '#/components/responses/NotFound'

  /readings:
    post:
      summary: Submit sensor reading
      operationId: createReading
      tags:
        - Readings
      security:
        - HmacAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReadingInput'
            example:
              sensor_id: "sns_001"
              water_level_ft: 3.5
              timestamp: "2025-09-13T14:00:00Z"
              battery_voltage: 12.6
              signal_strength: -65
      responses:
        '201':
          description: Reading accepted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Reading'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /crossings:
    get:
      summary: List monitored crossings
      operationId: getCrossings
      tags:
        - Crossings
      parameters:
        - in: query
          name: status
          schema:
            type: string
            enum: [open, closed, caution]
          description: Current crossing status
        - in: query
          name: monitored
          schema:
            type: boolean
            default: true
          description: Show only monitored crossings
      responses:
        '200':
          description: List of crossings
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Crossing'
              example:
                data:
                  - id: "crx_42"
                    name: "Salado Creek at Rittiman Road"
                    location:
                      type: "Point"
                      coordinates: [-98.451, 29.507]
                    status: "caution"
                    current_level_ft: 3.2
                    flood_stage_ft: 5.0
                    last_updated: "2025-09-13T14:00:00Z"
                    sensors: ["sns_001", "sns_002"]

  /routes:
    get:
      summary: Get safe route
      operationId: getSafeRoute
      tags:
        - Routing
      parameters:
        - in: query
          name: origin
          required: true
          schema:
            type: string
          description: Origin coordinates (lat,lon)
          example: "29.4241,-98.4936"
        - in: query
          name: destination
          required: true
          schema:
            type: string
          description: Destination coordinates (lat,lon)
          example: "29.5074,-98.4516"
        - in: query
          name: avoid_floods
          schema:
            type: boolean
            default: true
          description: Avoid flooded areas
        - in: query
          name: mode
          schema:
            type: string
            enum: [driving, walking]
            default: driving
      responses:
        '200':
          description: Safe route
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Route'
              example:
                origin: [29.4241, -98.4936]
                destination: [29.5074, -98.4516]
                distance_km: 12.3
                duration_minutes: 18
                has_hazards: false
                avoided_crossings: ["crx_42"]
                polyline: "encoded_polyline_string"
                steps:
                  - instruction: "Head north on Main St"
                    distance_m: 500
                    duration_s: 60
                waze_deeplink: "waze://?ll=29.5074,-98.4516&navigate=yes"
                google_maps_url: "https://maps.google.com/..."

  /health:
    get:
      summary: System health check
      operationId: getHealth
      tags:
        - System
      security: []
      responses:
        '200':
          description: System is healthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthStatus'
              example:
                status: "healthy"
                version: "1.0.0"
                timestamp: "2025-09-13T14:00:00Z"
                services:
                  database: "connected"
                  redis: "connected"
                  realtime: "connected"
                  external_apis: "healthy"

  /ws:
    get:
      summary: WebSocket connection for real-time updates
      operationId: connectWebSocket
      tags:
        - Realtime
      responses:
        '101':
          description: Switching Protocols to WebSocket

components:
  schemas:
    Alert:
      type: object
      required:
        - id
        - severity
        - message
        - location
        - issued_at
      properties:
        id:
          type: string
        crossing_id:
          type: string
        severity:
          type: string
          enum: [low, moderate, high, extreme]
        water_level_ft:
          type: number
          format: float
        threshold_ft:
          type: number
          format: float
        message:
          type: string
        location:
          $ref: '#/components/schemas/GeoPoint'
        affected_area:
          $ref: '#/components/schemas/GeoPolygon'
        issued_at:
          type: string
          format: date-time
        expires_at:
          type: string
          format: date-time
        metadata:
          type: object

    Reading:
      type: object
      required:
        - id
        - sensor_id
        - water_level_ft
        - timestamp
      properties:
        id:
          type: string
        sensor_id:
          type: string
        water_level_ft:
          type: number
          format: float
        timestamp:
          type: string
          format: date-time
        quality_score:
          type: number
          format: float
          minimum: 0
          maximum: 1
        battery_voltage:
          type: number
          format: float
        signal_strength:
          type: integer

    ReadingInput:
      type: object
      required:
        - sensor_id
        - water_level_ft
        - timestamp
      properties:
        sensor_id:
          type: string
        water_level_ft:
          type: number
          format: float
        timestamp:
          type: string
          format: date-time
        battery_voltage:
          type: number
          format: float
        signal_strength:
          type: integer

    Crossing:
      type: object
      required:
        - id
        - name
        - location
        - status
      properties:
        id:
          type: string
        name:
          type: string
        location:
          $ref: '#/components/schemas/GeoPoint'
        status:
          type: string
          enum: [open, closed, caution]
        current_level_ft:
          type: number
          format: float
        flood_stage_ft:
          type: number
          format: float
        last_updated:
          type: string
          format: date-time
        sensors:
          type: array
          items:
            type: string

    Route:
      type: object
      required:
        - origin
        - destination
        - distance_km
        - duration_minutes
        - polyline
      properties:
        origin:
          type: array
          items:
            type: number
          minItems: 2
          maxItems: 2
        destination:
          type: array
          items:
            type: number
          minItems: 2
          maxItems: 2
        distance_km:
          type: number
          format: float
        duration_minutes:
          type: integer
        has_hazards:
          type: boolean
        avoided_crossings:
          type: array
          items:
            type: string
        polyline:
          type: string
        steps:
          type: array
          items:
            type: object
            properties:
              instruction:
                type: string
              distance_m:
                type: number
              duration_s:
                type: integer
        waze_deeplink:
          type: string
        google_maps_url:
          type: string

    GeoPoint:
      type: object
      required:
        - type
        - coordinates
      properties:
        type:
          type: string
          enum: [Point]
        coordinates:
          type: array
          items:
            type: number
          minItems: 2
          maxItems: 2

    GeoPolygon:
      type: object
      required:
        - type
        - coordinates
      properties:
        type:
          type: string
          enum: [Polygon]
        coordinates:
          type: array
          items:
            type: array
            items:
              type: array
              items:
                type: number
              minItems: 2
              maxItems: 2

    HealthStatus:
      type: object
      required:
        - status
        - version
        - timestamp
      properties:
        status:
          type: string
          enum: [healthy, degraded, unhealthy]
        version:
          type: string
        timestamp:
          type: string
          format: date-time
        services:
          type: object
          additionalProperties:
            type: string

    PaginationMeta:
      type: object
      properties:
        total:
          type: integer
        limit:
          type: integer
        offset:
          type: integer
        next:
          type: string
        previous:
          type: string

    Error:
      type: object
      required:
        - error
        - message
      properties:
        error:
          type: string
        message:
          type: string
        details:
          type: object

  responses:
    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "bad_request"
            message: "Invalid parameters provided"

    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "unauthorized"
            message: "Invalid or missing authentication"

    NotFound:
      description: Not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "not_found"
            message: "Resource not found"

    InternalError:
      description: Internal server error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: "internal_error"
            message: "An unexpected error occurred"

  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key

    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

    HmacAuth:
      type: apiKey
      in: header
      name: X-HMAC-Signature
      description: HMAC-SHA256 signature of request body
```

---

# Appendix A3: Supabase Realtime Configuration

## Channel Architecture

```typescript
// Channel naming convention
const channels = {
  // Zone-based channels for area alerts
  zone: (zoneId: string) => `zone:${zoneId}`,

  // Crossing-specific channels
  crossing: (crossingId: string) => `crossing:${crossingId}`,

  // System-wide broadcasts
  system: 'system:broadcast',

  // User-specific channels (future)
  user: (userId: string) => `user:${userId}`
};

// Subscription example
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Subscribe to zone alerts
const zoneChannel = supabase
  .channel(channels.zone('downtown'))
  .on('postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'alerts',
      filter: `zone_id=eq.downtown`
    },
    (payload) => {
      console.log('New alert:', payload.new);
      // Trigger UI update
    }
  )
  .subscribe();

// Subscribe to crossing updates with filtering
const crossingChannel = supabase
  .channel(channels.crossing('crx_42'))
  .on('postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'readings',
      filter: `crossing_id=eq.crx_42`
    },
    (payload) => {
      if (payload.new.water_level_ft > 5.0) {
        console.log('High water detected!');
        // Trigger alert
      }
    }
  )
  .subscribe();
```

## Performance Configuration

```yaml
# Supabase Realtime Settings
connection:
  max_connections: 10000
  connection_timeout: 10s
  idle_timeout: 300s

channels:
  max_channels_per_client: 100
  max_joins_per_second: 100

messages:
  max_message_size: 1KB
  max_messages_per_second: 100

presence:
  enabled: true
  sync_interval: 30s

performance:
  connection_latency_target: 100ms
  message_latency_target: 50ms
  uptime_target: 99.9%
```

## RLS Policies

```sql
-- Row Level Security Policies for Realtime

-- Alerts: Public read, admin write
CREATE POLICY "Alerts are viewable by everyone"
  ON alerts FOR SELECT
  USING (true);

CREATE POLICY "Only admins can create alerts"
  ON alerts FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Readings: Public read for recent, admin for all
CREATE POLICY "Recent readings are public"
  ON readings FOR SELECT
  USING (timestamp > NOW() - INTERVAL '24 hours');

CREATE POLICY "Admins can view all readings"
  ON readings FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- User preferences: User-specific access
CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  USING (auth.uid() = user_id);
```

## Retry & Fallback Strategy

```typescript
class RealtimeManager {
  private supabase: SupabaseClient;
  private channels: Map<string, RealtimeChannel>;
  private retryAttempts: Map<string, number>;
  private maxRetries = 5;

  async subscribeWithRetry(
    channelName: string,
    config: ChannelConfig
  ): Promise<RealtimeChannel> {
    let attempts = 0;

    while (attempts < this.maxRetries) {
      try {
        const channel = await this.subscribe(channelName, config);

        // Reset retry counter on success
        this.retryAttempts.set(channelName, 0);

        return channel;
      } catch (error) {
        attempts++;
        const delay = this.calculateBackoff(attempts);

        console.warn(
          `Subscription failed, retry ${attempts}/${this.maxRetries} in ${delay}ms`
        );

        await this.sleep(delay);

        // Fall back to polling after max retries
        if (attempts >= this.maxRetries) {
          console.error('Max retries reached, falling back to polling');
          return this.startPolling(channelName, config);
        }
      }
    }
  }

  private calculateBackoff(attempt: number): number {
    // Exponential backoff with jitter
    const base = Math.min(1000 * Math.pow(2, attempt), 30000);
    const jitter = Math.random() * 1000;
    return base + jitter;
  }

  private async startPolling(
    channelName: string,
    config: ChannelConfig
  ): Promise<void> {
    // Fallback polling implementation
    setInterval(async () => {
      const data = await this.fetchLatestData(channelName);
      config.callback(data);
    }, 5000); // Poll every 5 seconds
  }
}
```

## Monitoring Dashboard

```typescript
// /app/admin/realtime/page.tsx

interface RealtimeMetrics {
  connections: number;
  channels: number;
  messagesPerSecond: number;
  avgLatency: number;
  errors: number;
  uptime: number;
}

export default function RealtimeMonitor() {
  const [metrics, setMetrics] = useState<RealtimeMetrics>();

  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch('/api/admin/realtime/metrics');
      const data = await response.json();
      setMetrics(data);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      <MetricCard
        title="Connections"
        value={metrics?.connections || 0}
        target={10000}
        unit="active"
      />
      <MetricCard
        title="Message Latency"
        value={metrics?.avgLatency || 0}
        target={50}
        unit="ms"
        inverse
      />
      <MetricCard
        title="Uptime"
        value={metrics?.uptime || 0}
        target={99.9}
        unit="%"
      />
      <MetricCard
        title="Messages/sec"
        value={metrics?.messagesPerSecond || 0}
        unit="msg/s"
      />
      <MetricCard
        title="Active Channels"
        value={metrics?.channels || 0}
        unit="channels"
      />
      <MetricCard
        title="Errors (24h)"
        value={metrics?.errors || 0}
        target={0}
        unit="errors"
        inverse
      />
    </div>
  );
}
```

---

# Appendix A4: Database Schema

## Complete DDL

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Create custom types
CREATE TYPE alert_severity AS ENUM ('low', 'moderate', 'high', 'extreme');
CREATE TYPE crossing_status AS ENUM ('open', 'closed', 'caution');
CREATE TYPE sensor_type AS ENUM ('radar', 'ultrasonic', 'pressure', 'manual');
CREATE TYPE sensor_status AS ENUM ('active', 'inactive', 'maintenance', 'error');

-- Users and authentication (managed by Supabase Auth)
-- Using auth.users table

-- Organizations for multi-tenancy (future)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- User roles and permissions
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'official', 'resident', 'viewer')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Sensor registry
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

-- Create spatial index
CREATE INDEX idx_sensors_location ON sensors USING GIST(location);
CREATE INDEX idx_sensors_status ON sensors(status) WHERE status = 'active';

-- Crossings registry
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

-- Time-series readings table (partitioned)
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

-- Create partitions for each month
CREATE TABLE readings_2025_09 PARTITION OF readings
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE readings_2025_10 PARTITION OF readings
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
-- Add more partitions as needed

-- Indexes on partitioned table
CREATE INDEX idx_readings_sensor_timestamp ON readings(sensor_id, timestamp DESC);
CREATE INDEX idx_readings_timestamp ON readings(timestamp DESC);

-- Alerts table
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

-- Notification log
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

-- API keys for external integrations
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

-- Materialized view for real-time dashboard
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

-- Refresh materialized view every 5 minutes
SELECT cron.schedule(
    'refresh-current-conditions',
    '*/5 * * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY current_conditions;'
);

-- Functions and triggers

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
    -- Get associated crossing
    SELECT c.* INTO v_crossing
    FROM crossings c
    JOIN sensor_crossings sc ON sc.crossing_id = c.id
    WHERE sc.sensor_id = NEW.sensor_id
    AND sc.is_primary = true;

    IF v_crossing.id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Determine severity
    IF NEW.water_level_ft >= v_crossing.critical_stage_ft THEN
        v_severity := 'extreme';
        v_message := format('EXTREME: Water level at %s is %s ft (Critical stage: %s ft)',
            v_crossing.name, NEW.water_level_ft, v_crossing.critical_stage_ft);
    ELSIF NEW.water_level_ft >= v_crossing.flood_stage_ft THEN
        v_severity := 'high';
        v_message := format('HIGH: Water level at %s is %s ft (Flood stage: %s ft)',
            v_crossing.name, NEW.water_level_ft, v_crossing.flood_stage_ft);
    ELSIF NEW.water_level_ft >= v_crossing.action_stage_ft THEN
        v_severity := 'moderate';
        v_message := format('MODERATE: Water level at %s is %s ft (Action stage: %s ft)',
            v_crossing.name, NEW.water_level_ft, v_crossing.action_stage_ft);
    ELSE
        RETURN NEW;
    END IF;

    -- Check if alert already exists
    IF NOT EXISTS (
        SELECT 1 FROM alerts
        WHERE crossing_id = v_crossing.id
        AND severity = v_severity
        AND expires_at > NOW()
    ) THEN
        -- Create new alert
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

-- Grants for RLS
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE crossings ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
```

---

# Appendix A5: CI/CD & Deployment

## GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20.x'
  PNPM_VERSION: '8'

jobs:
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm run lint

      - name: Type Check
        run: pnpm run type-check

  test:
    name: Test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:15-3.3
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: riveralert_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Run migrations
        run: pnpm run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/riveralert_test

      - name: Unit Tests
        run: pnpm run test:unit

      - name: Integration Tests
        run: pnpm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/riveralert_test

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps

      - name: Build
        run: pnpm run build

      - name: Run E2E Tests
        run: pnpm run test:e2e

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  build:
    name: Build & Push Docker Images
    needs: [lint, test]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push API
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./apps/api/Dockerfile
          push: true
          tags: |
            riveralert/api:latest
            riveralert/api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push Web
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./apps/web/Dockerfile
          push: true
          tags: |
            riveralert/web:latest
            riveralert/web:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    name: Deploy to Production
    needs: [build]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy API to Fly.io
        uses: superfly/flyctl-actions@v1
        with:
          args: "deploy --app riveralert-api --image riveralert/api:${{ github.sha }}"
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Deploy Web to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Docker Configuration

### API Dockerfile

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@8
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/*/
RUN pnpm install --frozen-lockfile

# Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build --filter=@riveralert/api

# Runner
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package.json ./
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

USER nodejs
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

### Web Dockerfile

```dockerfile
# apps/web/Dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@8
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/*/
RUN pnpm install --frozen-lockfile

# Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm run build --filter=@riveralert/web

# Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/static ./.next/static

USER nodejs
EXPOSE 3000

CMD ["node", "server.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_USER: riveralert
      POSTGRES_PASSWORD: ${DB_PASSWORD:-localpass}
      POSTGRES_DB: riveralert
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./supabase/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./supabase/seeds.sql:/docker-entrypoint-initdb.d/02-seeds.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U riveralert"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: ./apps/api/Dockerfile
    environment:
      NODE_ENV: development
      PORT: 3001
      DATABASE_URL: postgresql://riveralert:${DB_PASSWORD:-localpass}@postgres:5432/riveralert
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET:-local-secret}
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./apps/api:/app/apps/api
      - /app/apps/api/node_modules
    command: pnpm run dev

  web:
    build:
      context: .
      dockerfile: ./apps/web/Dockerfile
    environment:
      NODE_ENV: development
      NEXT_PUBLIC_API_URL: http://localhost:3001
      NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - api
    volumes:
      - ./apps/web:/app/apps/web
      - /app/apps/web/node_modules
      - /app/apps/web/.next
    command: pnpm run dev

volumes:
  postgres_data:
  redis_data:
```

## Deployment Runbook

### Pre-Deployment Checklist

```markdown
## Pre-Deployment Checklist

- [ ] All tests passing in CI
- [ ] Database migrations reviewed and tested
- [ ] Environment variables updated in deployment platform
- [ ] API documentation updated
- [ ] Performance testing completed
- [ ] Security scan completed
- [ ] Rollback plan documented
- [ ] Stakeholders notified
```

### Deployment Steps

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting RiverAlert Deployment"

# 1. Run database migrations
echo "📊 Running database migrations..."
pnpm run db:migrate:prod

# 2. Deploy API
echo "🔧 Deploying API to Fly.io..."
flyctl deploy --app riveralert-api --config ./apps/api/fly.toml

# 3. Deploy Web
echo "🌐 Deploying Web to Vercel..."
vercel --prod --cwd ./apps/web

# 4. Invalidate CDN cache
echo "🔄 Invalidating CDN cache..."
aws cloudfront create-invalidation \
  --distribution-id $CDN_DISTRIBUTION_ID \
  --paths "/*"

# 5. Run smoke tests
echo "🧪 Running smoke tests..."
pnpm run test:smoke

# 6. Update status page
echo "✅ Updating status page..."
curl -X POST $STATUS_PAGE_WEBHOOK \
  -H "Content-Type: application/json" \
  -d '{"status": "operational", "version": "'$VERSION'"}'

echo "✨ Deployment complete!"
```

### Rollback Procedure

```bash
#!/bin/bash
# rollback.sh

set -e

echo "⚠️ Starting rollback procedure"

# Get previous version
PREVIOUS_VERSION=$(git describe --tags --abbrev=0 HEAD^)

echo "Rolling back to version: $PREVIOUS_VERSION"

# 1. Rollback database if needed
read -p "Rollback database migrations? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    pnpm run db:rollback:prod
fi

# 2. Deploy previous API version
flyctl deploy --app riveralert-api \
  --image riveralert/api:$PREVIOUS_VERSION

# 3. Rollback Vercel deployment
vercel rollback --yes

# 4. Clear caches
aws cloudfront create-invalidation \
  --distribution-id $CDN_DISTRIBUTION_ID \
  --paths "/*"

echo "✅ Rollback complete"
```

---

# Appendix A6: Mobile App Specification

## React Native / Expo Architecture

```typescript
// App.tsx - Main entry point
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { SupabaseProvider } from './src/providers/SupabaseProvider';
import { AuthProvider } from './src/providers/AuthProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NotificationHandler } from './src/services/NotificationHandler';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
    },
  },
});

export default function App() {
  React.useEffect(() => {
    // Request permissions
    (async () => {
      const { status: notificationStatus } =
        await Notifications.requestPermissionsAsync();
      const { status: locationStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (notificationStatus !== 'granted') {
        console.warn('Notification permission not granted');
      }

      if (locationStatus !== 'granted') {
        console.warn('Location permission not granted');
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SupabaseProvider>
          <AuthProvider>
            <NavigationContainer>
              <NotificationHandler />
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </SupabaseProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

## Push Notification Implementation

```typescript
// src/services/NotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export class NotificationService {
  private static instance: NotificationService;
  private pushToken: string | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      return null;
    }

    // Get existing permission status
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for notifications');
      return null;
    }

    // Get Expo push token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    // Configure Android channel
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('alerts', {
        name: 'Flood Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }

    this.pushToken = token.data;

    // Save token to backend
    await this.savePushToken(token.data);

    return token.data;
  }

  private async savePushToken(token: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from('user_devices')
        .upsert({
          user_id: user.id,
          push_token: token,
          platform: Platform.OS,
          device_model: Device.modelName,
          last_active: new Date().toISOString(),
        });
    }
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: trigger || null, // null = immediate
    });
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  setupNotificationListeners(): () => void {
    // Handle notifications when app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('Notification received:', notification);
        // Handle in-app display
      }
    );

    // Handle notification taps
    const responseListener =
      Notifications.addNotificationResponseReceivedListener(response => {
        const { notification } = response;
        const data = notification.request.content.data;

        // Navigate based on notification data
        if (data.type === 'alert') {
          // Navigate to alert details
        } else if (data.type === 'crossing_closure') {
          // Navigate to map
        }
      });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }
}
```

## Offline Support

```typescript
// src/services/OfflineManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

interface CachedData {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
}

export class OfflineManager {
  private static readonly CACHE_PREFIX = '@riveralert_cache_';
  private static readonly QUEUE_KEY = '@riveralert_queue';
  private isOnline: boolean = true;

  constructor() {
    this.setupNetworkListener();
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOffline && this.isOnline) {
        // Back online - sync queued operations
        this.syncQueuedOperations();
      }
    });
  }

  async cacheData(
    key: string,
    data: any,
    ttl: number = 3600000 // 1 hour default
  ): Promise<void> {
    const cached: CachedData = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
    };

    await AsyncStorage.setItem(
      `${OfflineManager.CACHE_PREFIX}${key}`,
      JSON.stringify(cached)
    );
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(
        `${OfflineManager.CACHE_PREFIX}${key}`
      );

      if (!cached) return null;

      const parsed: CachedData = JSON.parse(cached);

      // Check if cache is still valid
      if (Date.now() - parsed.timestamp > parsed.ttl) {
        await this.removeCachedData(key);
        return null;
      }

      return parsed.data as T;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  async removeCachedData(key: string): Promise<void> {
    await AsyncStorage.removeItem(`${OfflineManager.CACHE_PREFIX}${key}`);
  }

  async queueOperation(operation: {
    type: string;
    data: any;
    timestamp: number;
  }): Promise<void> {
    const queue = await this.getQueue();
    queue.push(operation);
    await AsyncStorage.setItem(
      OfflineManager.QUEUE_KEY,
      JSON.stringify(queue)
    );
  }

  private async getQueue(): Promise<any[]> {
    const queue = await AsyncStorage.getItem(OfflineManager.QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  }

  private async syncQueuedOperations(): Promise<void> {
    const queue = await this.getQueue();

    if (queue.length === 0) return;

    console.log(`Syncing ${queue.length} queued operations`);

    for (const operation of queue) {
      try {
        await this.executeOperation(operation);
      } catch (error) {
        console.error('Failed to sync operation:', error);
        // Keep in queue for retry
        continue;
      }
    }

    // Clear successfully synced operations
    await AsyncStorage.removeItem(OfflineManager.QUEUE_KEY);
  }

  private async executeOperation(operation: any): Promise<void> {
    switch (operation.type) {
      case 'report_incident':
        await supabase
          .from('incident_reports')
          .insert(operation.data);
        break;
      case 'update_preferences':
        await supabase
          .from('user_preferences')
          .update(operation.data);
        break;
      // Add more operation types as needed
    }
  }

  async downloadOfflineMap(region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }): Promise<void> {
    // Implementation depends on map provider
    // For Google Maps, use offline map tiles
    // For MapBox, use offline pack API
    console.log('Downloading offline map for region:', region);
  }
}
```

## App Store Deployment Checklist

### iOS App Store

```yaml
# app.json configuration for iOS
{
  "expo": {
    "name": "RiverAlert",
    "slug": "riveralert",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1E40AF"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.aicowboys.riveralert",
      "buildNumber": "1",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "RiverAlert needs your location to provide flood alerts for your area.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "RiverAlert needs your location to provide flood alerts even when the app is in the background.",
        "UIBackgroundModes": ["location", "fetch", "remote-notification"]
      },
      "config": {
        "googleMapsApiKey": "[TBD: iOS Google Maps Key]"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1E40AF"
      },
      "package": "com.aicowboys.riveralert",
      "versionCode": 1,
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE"
      ],
      "config": {
        "googleMaps": {
          "apiKey": "[TBD: Android Google Maps Key]"
        }
      }
    },
    "plugins": [
      "expo-notifications",
      "expo-location",
      "expo-background-fetch",
      "expo-task-manager"
    ],
    "extra": {
      "eas": {
        "projectId": "[TBD: EAS Project ID]"
      }
    }
  }
}
```

### Submission Requirements

```markdown
## iOS App Store Submission

### Screenshots Required (per device size)
- [ ] iPhone 6.7" (1290 × 2796)
- [ ] iPhone 6.5" (1284 × 2778 or 1242 × 2688)
- [ ] iPhone 5.5" (1242 × 2208)
- [ ] iPad Pro 12.9" (2048 × 2732)

### App Information
- [ ] App name (30 characters max): "RiverAlert - Flood Warnings"
- [ ] Subtitle (30 characters): "Real-time flood intelligence"
- [ ] Keywords: flood,alert,weather,safety,emergency,warning,river,water
- [ ] Support URL: https://www.theaicowboys.com/riveralert/support
- [ ] Marketing URL: https://www.theaicowboys.com/riveralert
- [ ] Privacy Policy URL: [TBD: Privacy Policy]

### App Review Information
- [ ] Demo account credentials
- [ ] Notes for reviewer explaining location/notification permissions
- [ ] Contact information for review team

## Google Play Store Submission

### Graphics Assets
- [ ] Feature Graphic (1024 × 500)
- [ ] Phone Screenshots (minimum 2, up to 8)
- [ ] Tablet Screenshots (optional but recommended)
- [ ] App Icon (512 × 512)

### Store Listing
- [ ] Short description (80 characters): "Real-time flood alerts and safe navigation for your community"
- [ ] Full description (4000 characters max)
- [ ] Category: Weather
- [ ] Content Rating: Everyone
- [ ] Target Audience: 18+
- [ ] Contains Ads: No
- [ ] In-app Purchases: No (initially)

### Data Safety Section
- [ ] Data collected: Location, Device ID
- [ ] Data sharing: None
- [ ] Data deletion: Users can request deletion
- [ ] Encryption: Data encrypted in transit
```

---

# Appendix A7: Evidence Log

| Claim | Source URL | Publisher | Pub. Date | Accessed | Notes |
|-------|------------|-----------|-----------|----------|-------|
| 135+ fatalities in July 2025 Central Texas floods | Multiple sources | NBC News, ABC News | July 2025 | 2025-09-13 | Deadliest inland flooding since 1976 |
| 117 deaths in Kerr County | Federal audit reports | FEMA/State | July-Aug 2025 | 2025-09-13 | Including 37 children |
| 26 feet river rise in 45 minutes | NWS reports | NOAA | July 4, 2025 | 2025-09-13 | Guadalupe River at Hunt |
| No wireless emergency alerts sent by Kerr County | FEMA investigation | FEMA | August 2025 | 2025-09-13 | IPAWS system not activated |
| County EOC not operational 1-3 AM | State investigation | Texas | August 2025 | 2025-09-13 | During critical flooding period |
| $14.3 billion available for Texas disaster recovery | https://www.glo.texas.gov/ | Texas GLO | 2025 | 2025-09-13 | Multiple disaster programs |
| 150 HALT locations in Bexar County | https://www.bexar.org/2728/HALT-High-Water-Detection | Bexar County | Current | 2025-09-13 | Existing detection system |
| $21 million NextGen flood system approved | News4SanAntonio | Local news | 2024 | 2025-09-13 | Joint county/city initiative |
| Michael Pendleton, CEO The AI Cowboys | LinkedIn | LinkedIn | Current | 2025-09-13 | Verified profile |
| Contact: (210) 287-2024 | https://www.theaicowboys.com/contact | The AI Cowboys | Current | 2025-09-13 | Public contact info |
| USGS Water Services API | https://api.waterdata.usgs.gov/ | USGS | Current | 2025-09-13 | Free, no auth required |
| NOAA/NWS Weather API | https://api.weather.gov/ | NOAA | Current | 2025-09-13 | Free public API |
| OpenStreetMap Nominatim | https://nominatim.org/ | OSM | Current | 2025-09-13 | Free geocoding service |
| OpenRouteService | https://openrouteservice.org/ | HeiGIT | Current | 2025-09-13 | Free tier available |
| FEMA applied for $980K warning system (2017) | Federal records | FEMA | 2017 | 2025-09-13 | Application denied |
| 10-15% increase in extreme precipitation | Texas State Climatologist | John Nielsen-Gammon | 2024 | 2025-09-13 | Climate trend analysis |

---

# Appendix A8: Stakeholder & Contact List

## Confirmed Contacts

| Name | Title | Organization | Contact | Status |
|------|-------|--------------|---------|--------|
| Michael Pendleton | CEO/Founder | The AI Cowboys | contact_us@theaicowboys.com | Confirmed |
| Roger Wong Won | CMO | The AI Cowboys | [TBD: Email] | [TBD] |
| [TBD] | Emergency Management Coordinator | Bexar County | [TBD] | Pending |
| [TBD] | Warning Coordination Meteorologist | NWS Austin/San Antonio | [TBD] | Pending |
| [TBD] | Flood Management Director | SARA | 1-866-345-7272 | General line |
| [TBD] | Mitigation Program Manager | Texas GLO | [TBD] | Pending |
| [TBD] | Transportation Director | Bexar County Schools | [TBD] | Pending |
| [TBD] | Public Works Director | City of San Antonio | [TBD] | Pending |

## Partner Organizations

| Organization | Role | Contact Method | Status |
|--------------|------|----------------|--------|
| San Antonio River Authority | Technical Partner | 1-866-345-7272 | Initial contact |
| Bexar County Emergency Management | Operations Partner | [TBD] | Pending |
| National Weather Service | Data Partner | [TBD] | Federal coordination |
| Texas Division of Emergency Management | State Coordination | [TBD] | Post-disaster |
| CPS Energy | Infrastructure | General line | Future partner |
| VIA Metropolitan Transit | Transportation | General line | Future partner |

---

# Appendix A9: Budget Workbook

## Detailed Cost Breakdown

### Year 1 - Pilot Phase

| Category | Q1 | Q2 | Q3 | Q4 | Total |
|----------|-----|-----|-----|-----|-------|
| **Capital Costs** |||||
| Sensors (10 units) | $35,000 | - | - | - | $35,000 |
| Installation | $15,000 | - | - | - | $15,000 |
| Network Equipment | $5,000 | - | - | - | $5,000 |
| Development | $40,000 | $35,000 | - | - | $75,000 |
| **Operating Costs** |||||
| Cloud Services | $1,200 | $3,600 | $3,600 | $3,600 | $12,000 |
| Maintenance | - | $2,000 | $2,000 | $2,000 | $6,000 |
| Support Staff | - | $6,000 | $6,000 | $6,000 | $18,000 |
| Training | - | $5,000 | $2,000 | - | $7,000 |
| **Total by Quarter** | $96,200 | $51,600 | $13,600 | $11,600 | $173,000 |

### Sensitivity Analysis

| Scenario | Sensor Cost | Installation | Cloud | Total | Variance |
|----------|-------------|--------------|-------|-------|----------|
| Best Case | -20% | -10% | -20% | $154,900 | -10.5% |
| Base Case | $3,500 | $1,500 | $1,000/mo | $173,000 | 0% |
| Worst Case | +30% | +20% | +50% | $202,100 | +16.8% |

### Cost-Benefit Analysis

| Benefit Category | Year 1 | Year 2 | Year 3 | 5-Year Total |
|------------------|--------|--------|--------|--------------|
| **Direct Benefits** |||||
| Lives Saved (statistical value) | $2M | $4M | $6M | $20M |
| Property Damage Prevented | $500K | $1M | $1.5M | $5M |
| Emergency Response Savings | $100K | $200K | $300K | $1M |
| **Indirect Benefits** |||||
| Productivity (reduced delays) | $200K | $400K | $600K | $2M |
| Insurance Premium Reductions | - | $50K | $100K | $300K |
| Economic Activity Preserved | $300K | $600K | $900K | $3M |
| **Total Benefits** | $3.1M | $6.25M | $9.4M | $31.3M |
| **Costs** | $173K | $120K | $100K | $500K |
| **ROI** | 17.9x | 52.1x | 94x | 62.6x |

### Funding Sources Matrix

| Source | Amount | Probability | Expected Value | Timeline |
|--------|--------|-------------|----------------|----------|
| FEMA BRIC | $150,000 | 60% | $90,000 | Q4 2025 |
| Texas GLO | $100,000 | 40% | $40,000 | Q1 2026 |
| City of San Antonio | $25,000 | 70% | $17,500 | Q3 2025 |
| Private Foundation | $50,000 | 30% | $15,000 | Q2 2026 |
| Corporate Sponsorship | $25,000 | 50% | $12,500 | Q1 2026 |
| **Total Expected** | $350,000 | | $175,000 | |

---

*End of Appendices*
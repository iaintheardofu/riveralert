import { z } from 'zod'
import crypto from 'crypto'

// IoT Sensor Reading Schema
export const IoTReadingSchema = z.object({
  sensor_id: z.string().min(1).max(100),
  water_level_ft: z.number().min(0).max(100),
  flow_cfs: z.number().min(0).optional(),
  rainfall_in: z.number().min(0).optional(),
  air_temp_c: z.number().min(-50).max(60).optional(),
  humidity_pct: z.number().min(0).max(100).optional(),
  pressure_hpa: z.number().min(800).max(1200).optional(),
  wind_mps: z.number().min(0).max(100).optional(),
  soil_moisture_pct: z.number().min(0).max(100).optional(),
  turbidity_ntu: z.number().min(0).max(5000).optional(),
  timestamp: z.string().datetime()
})

export type IoTReading = z.infer<typeof IoTReadingSchema>

// HMAC Signature Verification
export function verifyHMACSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

// HMAC Signature Generator (for client use)
export function generateHMACSignature(
  payload: string | object,
  secret: string
): string {
  const payloadString = typeof payload === 'string'
    ? payload
    : JSON.stringify(payload)

  return crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex')
}

// Sensor location helper
export interface SensorLocation {
  lat: number
  lng: number
  county?: string
  zone?: string
}

// Sensor metadata
export interface SensorMetadata {
  id: string
  name: string
  type: 'water_level' | 'weather' | 'combined'
  location: SensorLocation
  installed_date: string
  last_maintenance?: string
  status: 'active' | 'maintenance' | 'offline'
}

// Process and validate IoT reading
export async function processIoTReading(
  reading: IoTReading,
  metadata?: SensorMetadata
): Promise<{
  valid: boolean
  processed: any
  alerts: string[]
}> {
  const alerts: string[] = []

  // Check for rapid rise conditions
  if (reading.water_level_ft > 10) {
    alerts.push('HIGH_WATER_LEVEL')
  }

  // Check for heavy rainfall
  if (reading.rainfall_in && reading.rainfall_in > 2) {
    alerts.push('HEAVY_RAINFALL')
  }

  // Check for low pressure (storm conditions)
  if (reading.pressure_hpa && reading.pressure_hpa < 990) {
    alerts.push('LOW_PRESSURE_SYSTEM')
  }

  // Check for high turbidity (debris flow)
  if (reading.turbidity_ntu && reading.turbidity_ntu > 1000) {
    alerts.push('HIGH_TURBIDITY')
  }

  // Process location data if available
  const processed = {
    ...reading,
    metadata,
    processed_at: new Date().toISOString(),
    alerts,
    location: metadata?.location ? {
      type: 'Point',
      coordinates: [metadata.location.lng, metadata.location.lat]
    } : undefined
  }

  return {
    valid: true,
    processed,
    alerts
  }
}

// Rate limiting helper
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}

  isAllowed(sensorId: string): boolean {
    const now = Date.now()
    const timestamps = this.requests.get(sensorId) || []

    // Filter out old timestamps
    const recentTimestamps = timestamps.filter(
      t => now - t < this.windowMs
    )

    if (recentTimestamps.length >= this.maxRequests) {
      return false
    }

    recentTimestamps.push(now)
    this.requests.set(sensorId, recentTimestamps)

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup()
    }

    return true
  }

  private cleanup() {
    const now = Date.now()
    for (const [sensorId, timestamps] of this.requests.entries()) {
      const recent = timestamps.filter(t => now - t < this.windowMs)
      if (recent.length === 0) {
        this.requests.delete(sensorId)
      } else {
        this.requests.set(sensorId, recent)
      }
    }
  }
}

// Database upsert helper (PostgreSQL with PostGIS)
export function buildUpsertQuery(reading: IoTReading, metadata?: SensorMetadata) {
  const query = `
    INSERT INTO sensor_readings (
      sensor_id,
      water_level_ft,
      flow_cfs,
      rainfall_in,
      air_temp_c,
      humidity_pct,
      pressure_hpa,
      wind_mps,
      soil_moisture_pct,
      turbidity_ntu,
      timestamp,
      location,
      metadata
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
      ${metadata?.location ? 'ST_SetSRID(ST_MakePoint($12, $13), 4326)' : 'NULL'},
      $14
    )
    ON CONFLICT (sensor_id, timestamp)
    DO UPDATE SET
      water_level_ft = EXCLUDED.water_level_ft,
      flow_cfs = EXCLUDED.flow_cfs,
      rainfall_in = EXCLUDED.rainfall_in,
      air_temp_c = EXCLUDED.air_temp_c,
      humidity_pct = EXCLUDED.humidity_pct,
      pressure_hpa = EXCLUDED.pressure_hpa,
      wind_mps = EXCLUDED.wind_mps,
      soil_moisture_pct = EXCLUDED.soil_moisture_pct,
      turbidity_ntu = EXCLUDED.turbidity_ntu,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `

  const values = [
    reading.sensor_id,
    reading.water_level_ft,
    reading.flow_cfs || null,
    reading.rainfall_in || null,
    reading.air_temp_c || null,
    reading.humidity_pct || null,
    reading.pressure_hpa || null,
    reading.wind_mps || null,
    reading.soil_moisture_pct || null,
    reading.turbidity_ntu || null,
    reading.timestamp
  ]

  if (metadata?.location) {
    values.push(metadata.location.lng, metadata.location.lat)
  }

  values.push(JSON.stringify(metadata || {}))

  return { query, values }
}
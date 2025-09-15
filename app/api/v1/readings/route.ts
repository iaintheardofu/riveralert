import { NextRequest, NextResponse } from 'next/server'
import {
  IoTReadingSchema,
  verifyHMACSignature,
  processIoTReading,
  RateLimiter
} from '@/apps/api/src/sensors/iot'

// Initialize rate limiter
const rateLimiter = new RateLimiter(100, 60000) // 100 requests per minute per sensor

export async function POST(request: NextRequest) {
  try {
    // Get HMAC signature from header
    const signature = request.headers.get('X-HMAC-Signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing HMAC signature' },
        { status: 401 }
      )
    }

    // Get request body
    const bodyText = await request.text()

    // Verify HMAC signature
    const hmacSecret = process.env.HMAC_SECRET || 'default-hmac-secret'

    if (!verifyHMACSignature(bodyText, signature, hmacSecret)) {
      return NextResponse.json(
        { error: 'Invalid HMAC signature' },
        { status: 401 }
      )
    }

    // Parse and validate the reading
    const body = JSON.parse(bodyText)
    const reading = IoTReadingSchema.parse(body)

    // Check rate limiting
    if (!rateLimiter.isAllowed(reading.sensor_id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Process the reading
    const result = await processIoTReading(reading)

    // Store in database (simplified for now - in production, use proper DB connection)
    console.log('Processing IoT reading:', result)

    // TODO: Store in PostgreSQL with PostGIS
    // const { query, values } = buildUpsertQuery(reading)
    // await db.query(query, values)

    // TODO: Send to Supabase Realtime
    // await supabase.from('sensor_readings').insert(result.processed)

    // TODO: Trigger alerts if needed
    // if (result.alerts.length > 0) {
    //   await triggerAlerts(result.alerts, reading.sensor_id)
    // }

    return NextResponse.json({
      success: true,
      sensor_id: reading.sensor_id,
      timestamp: reading.timestamp,
      alerts: result.alerts,
      message: 'Reading processed successfully'
    })

  } catch (error) {
    console.error('Error processing IoT reading:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid reading format', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for sensor status
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sensorId = searchParams.get('sensor_id')

  if (!sensorId) {
    return NextResponse.json(
      { error: 'Sensor ID required' },
      { status: 400 }
    )
  }

  // TODO: Fetch from database
  // const status = await db.query('SELECT * FROM sensor_readings WHERE sensor_id = $1 ORDER BY timestamp DESC LIMIT 1', [sensorId])

  // Mock response for now
  return NextResponse.json({
    sensor_id: sensorId,
    status: 'active',
    last_reading: new Date().toISOString(),
    current_level: 3.5,
    trend: 'stable'
  })
}
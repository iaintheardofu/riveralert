import { createClient } from '@supabase/supabase-js'
import { Sensor, SensorReading, Alert, Zone } from './supabase-realtime'

// Function to load initial data from your existing database
export async function loadInitialData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Load existing sensors
    const { data: sensors, error: sensorsError } = await supabase
      .from('sensors')
      .select('*')
      .eq('is_active', true)

    if (sensorsError) {
      console.error('Error loading sensors:', sensorsError)
      return { sensors: [], readings: [], alerts: [], zones: [] }
    }

    // Load existing readings (if any)
    const { data: readings, error: readingsError } = await supabase
      .from('readings')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(10)

    if (readingsError) {
      console.error('Error loading readings:', readingsError)
    }

    // Load existing alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (alertsError) {
      console.error('Error loading alerts:', alertsError)
    }

    // Load existing zones
    const { data: zones, error: zonesError } = await supabase
      .from('zones')
      .select('*')

    if (zonesError) {
      console.error('Error loading zones:', zonesError)
    }

    return {
      sensors: sensors || [],
      readings: readings || [],
      alerts: alerts || [],
      zones: zones || []
    }

  } catch (error) {
    console.error('Error loading initial data:', error)
    return { sensors: [], readings: [], alerts: [], zones: [] }
  }
}

// Create mock sensor readings from existing sensors if no readings exist
export function createMockReadings(sensors: Sensor[]): Record<string, SensorReading> {
  const mockReadings: Record<string, SensorReading> = {}

  sensors.forEach((sensor, index) => {
    // Create realistic water levels based on sensor type and location
    const baseWaterLevel = 0.5 + Math.random() * 2.5 // 0.5 to 3.0 meters
    const variance = (Math.random() - 0.5) * 0.5 // ±0.25m variance

    mockReadings[sensor.id] = {
      id: `mock-${sensor.id}-${Date.now()}`,
      sensor_id: sensor.id,
      water_level_m: baseWaterLevel + variance,
      flow_rate: Math.random() * 50 + 10, // 10-60 m³/s
      rainfall_mm: Math.random() * 10, // 0-10mm
      temperature_c: 15 + Math.random() * 15, // 15-30°C
      humidity_percent: 40 + Math.random() * 40, // 40-80%
      pressure_mb: 995 + Math.random() * 30, // 995-1025 mb
      wind_speed_mps: Math.random() * 15, // 0-15 m/s
      wind_direction_deg: Math.random() * 360,
      battery_voltage: 11.5 + Math.random() * 1.5, // 11.5-13V
      signal_strength: 60 + Math.random() * 40, // 60-100%
      metadata: { mock: true, generated_at: new Date().toISOString() },
      recorded_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
  })

  return mockReadings
}
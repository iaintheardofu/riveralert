import { createClient } from '@supabase/supabase-js'
import { Sensor, SensorReading, Alert, Zone } from './supabase-realtime'

// Function to load initial data from your existing database
export async function loadInitialData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase environment variables not configured, using demo data')
    return createDemoData()
  }

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
    // For demo purposes, return mock data when database is unavailable
    return createDemoData()
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

// Create comprehensive demo data for presentation purposes
export function createDemoData() {
  const demoSensors: Sensor[] = [
    {
      id: 'bexar-downtown',
      external_id: 'TX-BEXAR-001',
      name: 'San Antonio River - Downtown',
      type: 'combined',
      status: 'active',
      location: 'POINT(-98.4936 29.4241)',
      elevation_m: 198,
      threshold_low_m: 1.0,
      threshold_high_m: 3.5,
      threshold_critical_m: 5.0,
      metadata: { zone: 'downtown', priority: 'high' },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'bexar-southside',
      external_id: 'TX-BEXAR-002',
      name: 'San Antonio River - Southside',
      type: 'combined',
      status: 'active',
      location: 'POINT(-98.4951 29.3960)',
      elevation_m: 201,
      threshold_low_m: 1.2,
      threshold_high_m: 3.8,
      threshold_critical_m: 5.5,
      metadata: { zone: 'southside', priority: 'high' },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'kerr-kerrville',
      external_id: 'TX-KERR-001',
      name: 'Guadalupe River - Kerrville',
      type: 'combined',
      status: 'active',
      location: 'POINT(-99.1403 30.0474)',
      elevation_m: 515,
      threshold_low_m: 0.8,
      threshold_high_m: 2.5,
      threshold_critical_m: 4.0,
      metadata: { zone: 'hill_country', priority: 'medium' },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'comal-new-braunfels',
      external_id: 'TX-COMAL-001',
      name: 'Comal River - New Braunfels',
      type: 'combined',
      status: 'active',
      location: 'POINT(-98.1244 29.7030)',
      elevation_m: 187,
      threshold_low_m: 0.9,
      threshold_high_m: 3.0,
      threshold_critical_m: 4.5,
      metadata: { zone: 'comal_county', priority: 'high' },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]

  const demoReadings = createMockReadings(demoSensors)

  const demoAlerts: Alert[] = [
    {
      id: 'alert-moderate-001',
      title: 'Moderate Flood Watch - San Antonio River',
      message: 'Rising water levels detected due to recent rainfall. Monitor conditions.',
      severity: 'moderate',
      sensor_id: 'bexar-downtown',
      water_level_m: 2.1,
      rate_of_change: 0.15,
      predicted_peak_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      predicted_peak_level_m: 2.8,
      is_active: true,
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 21600000).toISOString(), // 6 hours from now
      created_at: new Date().toISOString()
    }
  ]

  const demoZones: Zone[] = [
    {
      id: 'downtown-san-antonio',
      name: 'Downtown San Antonio',
      type: 'commercial',
      geometry: 'POLYGON((-98.500 29.420, -98.485 29.420, -98.485 29.430, -98.500 29.430, -98.500 29.420))',
      population: 15000,
      metadata: { evacuation_routes: ['route-1', 'route-2'] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]

  return {
    sensors: demoSensors,
    readings: Object.values(demoReadings),
    alerts: demoAlerts,
    zones: demoZones
  }
}
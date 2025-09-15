import { createClient } from '@supabase/supabase-js'

// Database setup and seeding functions
export async function setupRiverAlertDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration')
    return { success: false, error: 'Missing Supabase configuration' }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('🌊 Setting up RiverAlert database...')

    // First, create basic tables if they don't exist
    console.log('📋 Creating tables if they don\'t exist...')

    const tables = [
      {
        name: 'sensors',
        sql: `
          CREATE TABLE IF NOT EXISTS sensors (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT DEFAULT 'water_level',
            location JSONB,
            status TEXT DEFAULT 'active',
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      },
      {
        name: 'sensor_readings',
        sql: `
          CREATE TABLE IF NOT EXISTS sensor_readings (
            id BIGSERIAL PRIMARY KEY,
            sensor_id TEXT REFERENCES sensors(id),
            water_level_ft DECIMAL,
            flow_cfs DECIMAL,
            rainfall_in DECIMAL,
            temperature_f DECIMAL,
            humidity_percent DECIMAL,
            pressure_mb DECIMAL,
            wind_speed_mph DECIMAL,
            wind_direction_deg DECIMAL,
            timestamp TIMESTAMPTZ DEFAULT NOW()
          );
        `
      },
      {
        name: 'zones',
        sql: `
          CREATE TABLE IF NOT EXISTS zones (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT DEFAULT 'residential',
            geometry JSONB,
            population INTEGER DEFAULT 0,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      },
      {
        name: 'alerts',
        sql: `
          CREATE TABLE IF NOT EXISTS alerts (
            id BIGSERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            severity TEXT DEFAULT 'moderate',
            title TEXT NOT NULL,
            description TEXT,
            zone_ids TEXT[],
            expires_at TIMESTAMPTZ,
            is_active BOOLEAN DEFAULT true,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      }
    ]

    // Try to create tables using SQL if possible
    let tablesCreated = false
    for (const table of tables) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: table.sql })
        if (!error) {
          console.log(`✅ ${table.name} table created/verified`)
          tablesCreated = true
        }
      } catch (sqlError) {
        // RPC might not be available
        console.log(`⚠️  Could not create ${table.name} via SQL RPC`)
      }
    }

    if (!tablesCreated) {
      console.log('📝 Tables need to be created manually via Supabase dashboard')
      console.log('⚠️  Please create the following tables in your Supabase dashboard:')
      tables.forEach(table => {
        console.log(`- ${table.name}`)
      })
    }

    // 1. Seed Texas sensors
    const { data: existingSensors, error: sensorCheckError } = await supabase
      .from('sensors')
      .select('id')
      .limit(1)

    if (sensorCheckError) {
      console.error('❌ Cannot access sensors table:', sensorCheckError.message)

      // If we can't access the table, it might not exist or we lack permissions
      if (sensorCheckError.message.includes('relation "sensors" does not exist')) {
        console.log('💡 The sensors table does not exist. Please create it manually or check your database schema.')
      } else if (sensorCheckError.message.includes('Invalid API key')) {
        console.log('💡 API key issue. Please verify your SUPABASE_SERVICE_KEY in .env.local')
      }

      return {
        success: false,
        error: 'Database access failed',
        details: sensorCheckError.message,
        needsManualSetup: true
      }
    }

    if (!existingSensors?.length) {
      console.log('📡 Seeding sensors...')

      const sensors = [
        {
          id: 'bexar-01',
          name: 'Huebner Creek at Vance Jackson',
          type: 'water_level',
          location: {
            type: 'Point',
            coordinates: [-98.4016, 29.5051]
          },
          status: 'active',
          metadata: { county: 'bexar', crossing: true, critical_level: 15 }
        },
        {
          id: 'bexar-02',
          name: 'Helotes Creek at Scenic Loop',
          type: 'water_level',
          location: {
            type: 'Point',
            coordinates: [-98.6189, 29.4432]
          },
          status: 'active',
          metadata: { county: 'bexar', crossing: true, critical_level: 12 }
        },
        {
          id: 'kerr-01',
          name: 'Guadalupe River at Kerrville',
          type: 'combined',
          location: {
            type: 'Point',
            coordinates: [-99.1406, 30.0508]
          },
          status: 'active',
          metadata: { county: 'kerr', river: 'guadalupe', critical_level: 20 }
        },
        {
          id: 'kerr-02',
          name: 'Town Creek at Junction Hwy',
          type: 'water_level',
          location: {
            type: 'Point',
            coordinates: [-99.1623, 30.0672]
          },
          status: 'active',
          metadata: { county: 'kerr', crossing: true, critical_level: 10 }
        }
      ]

      const { error: sensorsError } = await supabase
        .from('sensors')
        .insert(sensors)

      if (sensorsError) {
        console.error('Error seeding sensors:', sensorsError)
      } else {
        console.log('✅ Sensors seeded successfully')
      }
    }

    // 2. Seed zones
    const { data: existingZones } = await supabase
      .from('zones')
      .select('id')
      .limit(1)

    if (!existingZones?.length) {
      console.log('🏫 Seeding zones...')

      const zones = [
        {
          id: 'zone-bexar-school-01',
          name: 'Northside ISD',
          type: 'school',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-98.55, 29.55],
              [-98.45, 29.55],
              [-98.45, 29.45],
              [-98.55, 29.45],
              [-98.55, 29.55]
            ]]
          },
          population: 45000,
          metadata: { schools: 12, priority: 1 }
        },
        {
          id: 'zone-bexar-emergency-01',
          name: 'University Hospital',
          type: 'emergency',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-98.52, 29.51],
              [-98.48, 29.51],
              [-98.48, 29.47],
              [-98.52, 29.47],
              [-98.52, 29.51]
            ]]
          },
          population: 5000,
          metadata: { beds: 800, critical: true }
        },
        {
          id: 'zone-kerr-school-01',
          name: 'Kerrville ISD',
          type: 'school',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-99.16, 30.06],
              [-99.12, 30.06],
              [-99.12, 30.02],
              [-99.16, 30.02],
              [-99.16, 30.06]
            ]]
          },
          population: 8000,
          metadata: { schools: 5, priority: 1 }
        }
      ]

      const { error: zonesError } = await supabase
        .from('zones')
        .insert(zones)

      if (zonesError) {
        console.error('Error seeding zones:', zonesError)
      } else {
        console.log('✅ Zones seeded successfully')
      }
    }

    // 3. Add initial sensor readings
    console.log('📊 Adding initial sensor readings...')

    const initialReadings = [
      {
        sensor_id: 'bexar-01',
        water_level_ft: 13.8,
        flow_cfs: 2680,
        rainfall_in: 2.3,
        temperature_f: 78.5,
        humidity_percent: 65,
        timestamp: new Date().toISOString()
      },
      {
        sensor_id: 'bexar-02',
        water_level_ft: 8.2,
        flow_cfs: 1450,
        rainfall_in: 1.8,
        temperature_f: 79.2,
        humidity_percent: 62,
        timestamp: new Date().toISOString()
      },
      {
        sensor_id: 'kerr-01',
        water_level_ft: 12.1,
        flow_cfs: 3700,
        rainfall_in: 0.9,
        temperature_f: 75.8,
        humidity_percent: 58,
        timestamp: new Date().toISOString()
      },
      {
        sensor_id: 'kerr-02',
        water_level_ft: 6.5,
        flow_cfs: 890,
        rainfall_in: 0.4,
        temperature_f: 76.1,
        humidity_percent: 60,
        timestamp: new Date().toISOString()
      }
    ]

    const { error: readingsError } = await supabase
      .from('sensor_readings')
      .insert(initialReadings)

    if (readingsError) {
      console.error('Error adding initial readings:', readingsError)
    } else {
      console.log('✅ Initial sensor readings added')
    }

    // 4. Add sample alerts
    const { data: existingAlerts } = await supabase
      .from('alerts')
      .select('id')
      .eq('is_active', true)
      .limit(1)

    if (!existingAlerts?.length) {
      console.log('🚨 Adding sample alerts...')

      const alerts = [
        {
          type: 'flood_warning',
          severity: 'high',
          title: 'Flash Flood Warning - Bexar County',
          description: 'Heavy rainfall has caused rapid water rise in Huebner Creek. Low-water crossings are impassable.',
          zone_ids: ['zone-bexar-school-01', 'zone-bexar-emergency-01'],
          expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          metadata: { source: 'NWS', certainty: 'observed' }
        },
        {
          type: 'flood_watch',
          severity: 'moderate',
          title: 'Flood Watch - Kerr County',
          description: 'Guadalupe River levels rising steadily. Monitor conditions closely.',
          zone_ids: ['zone-kerr-school-01'],
          expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          metadata: { source: 'RiverAlert', certainty: 'likely' }
        }
      ]

      const { error: alertsError } = await supabase
        .from('alerts')
        .insert(alerts)

      if (alertsError) {
        console.error('Error adding alerts:', alertsError)
      } else {
        console.log('✅ Sample alerts added')
      }
    }

    console.log('🎉 RiverAlert database setup complete!')
    return { success: true }

  } catch (error) {
    console.error('❌ Database setup failed:', error)
    return { success: false, error }
  }
}

// Function to simulate real-time sensor data
export async function startSensorSimulation() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔄 Starting sensor simulation...')

  const sensorIds = ['bexar-01', 'bexar-02', 'kerr-01', 'kerr-02']

  // Update sensors every 30 seconds
  const simulationInterval = setInterval(async () => {
    for (const sensorId of sensorIds) {
      // Generate realistic sensor data with some variation
      const baseWaterLevel = sensorId.includes('bexar') ?
        Math.random() * 5 + 10 : // Bexar: 10-15 ft
        Math.random() * 4 + 8    // Kerr: 8-12 ft

      const reading = {
        sensor_id: sensorId,
        water_level_ft: baseWaterLevel + (Math.random() - 0.5) * 2,
        flow_cfs: Math.random() * 2000 + 1000,
        rainfall_in: Math.random() * 1.5,
        temperature_f: Math.random() * 15 + 70,
        humidity_percent: Math.random() * 30 + 50,
        pressure_mb: Math.random() * 50 + 1000,
        wind_speed_mph: Math.random() * 15,
        wind_direction_deg: Math.random() * 360,
        timestamp: new Date().toISOString()
      }

      const { error } = await supabase
        .from('sensor_readings')
        .insert([reading])

      if (error) {
        console.error(`Error inserting reading for ${sensorId}:`, error)
      } else {
        console.log(`📊 Updated ${sensorId}: ${reading.water_level_ft.toFixed(1)} ft`)
      }
    }
  }, 30000) // Every 30 seconds

  // Return function to stop simulation
  return () => {
    clearInterval(simulationInterval)
    console.log('⏹️ Sensor simulation stopped')
  }
}

// Helper function to check database connection
export async function checkDatabaseConnection() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables')
      return { connected: false, error: 'Missing environment variables' }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Try to connect to a basic table first
    const { data, error } = await supabase
      .from('sensors')
      .select('count', { count: 'exact' })
      .limit(1)

    if (error) {
      console.error('Database connection failed:', error.message)

      // If table doesn't exist, we can still consider the connection valid
      if (error.message.includes('relation "sensors" does not exist')) {
        console.log('⚠️  Database connected but tables need to be created')
        return {
          connected: true,
          needsSetup: true,
          error: 'Tables need to be created',
          count: 0
        }
      }

      return { connected: false, error: error.message }
    }

    console.log('✅ Database connected successfully')
    return { connected: true, count: data?.length || 0 }

  } catch (error) {
    console.error('Database connection error:', error)
    return { connected: false, error: String(error) }
  }
}
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function addTestData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('🧪 Adding test sensor reading...')

  // Get the existing sensor ID from your database
  const { data: sensors, error: sensorError } = await supabase
    .from('sensors')
    .select('id, name')
    .limit(1)

  if (sensorError || !sensors || sensors.length === 0) {
    console.error('❌ Could not find existing sensor:', sensorError?.message)
    return
  }

  const sensor = sensors[0]
  console.log('✅ Found sensor:', sensor.name, '(', sensor.id, ')')

  // Add a test reading
  const testReading = {
    sensor_id: sensor.id,
    water_level_m: 2.1,
    flow_rate: 15.5,
    rainfall_mm: 5.2,
    temperature_c: 22.5,
    humidity_percent: 68,
    pressure_mb: 1013.2,
    wind_speed_mps: 3.2,
    wind_direction_deg: 180,
    battery_voltage: 12.6,
    signal_strength: 85,
    metadata: { test: true },
    recorded_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('readings')
    .insert([testReading])
    .select()

  if (error) {
    console.error('❌ Error adding test reading:', error.message)

    // If table doesn't exist or permission issue, we can still test with the existing data
    console.log('📊 Let\'s check what readings already exist...')

    const { data: existingReadings, error: readError } = await supabase
      .from('readings')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(5)

    if (existingReadings) {
      console.log(`✅ Found ${existingReadings.length} existing readings`)
      existingReadings.forEach((reading, index) => {
        console.log(`   ${index + 1}. Sensor: ${reading.sensor_id}, Water Level: ${reading.water_level_m}m`)
      })
    } else {
      console.log('❌ Cannot access readings table:', readError?.message)
    }
  } else {
    console.log('✅ Test reading added successfully:', data[0].id)
    console.log('📊 Reading data:', {
      water_level_m: testReading.water_level_m,
      flow_rate: testReading.flow_rate,
      rainfall_mm: testReading.rainfall_mm
    })
  }
}

addTestData()
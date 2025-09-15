const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkExistingTables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('🔍 Checking existing tables with anon key...')
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Common table names that might exist
  const possibleTables = [
    'sensors', 'sensor_readings', 'zones', 'alerts',
    'public.sensors', 'public.sensor_readings', 'public.zones', 'public.alerts',
    'riveralert_sensors', 'riveralert_readings', 'riveralert_zones', 'riveralert_alerts',
    'flood_sensors', 'flood_readings', 'flood_zones', 'flood_alerts',
    'users', 'profiles', 'organizations', 'projects',
    'water_levels', 'weather_data', 'evacuation_routes', 'predictions'
  ]

  console.log('📊 Testing possible table names...')

  for (const tableName of possibleTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)

      if (data && !error) {
        console.log(`✅ Found table: ${tableName} (${data.length} records in sample)`)
        if (data.length > 0) {
          console.log(`   Sample record keys:`, Object.keys(data[0]))
        }
      } else if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
        console.log(`⚠️  Table ${tableName} exists but has access restrictions: ${error.message}`)
      }
    } catch (e) {
      // Silent ignore for non-existent tables
    }
  }

  console.log('\n🔍 Checking what we can access with basic queries...')

  // Try some basic Supabase system tables that should always be accessible
  try {
    const { data: buckets } = await supabase.storage.listBuckets()
    console.log('📁 Storage buckets accessible:', buckets?.length || 0)
  } catch (e) {
    console.log('❌ Storage not accessible')
  }

  // Test realtime connection
  console.log('\n🔗 Testing realtime connection...')
  try {
    const channel = supabase.channel('test')
    console.log('✅ Realtime channel created successfully')
    supabase.removeChannel(channel)
  } catch (e) {
    console.log('❌ Realtime connection failed:', e.message)
  }
}

checkExistingTables()
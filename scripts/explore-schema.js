const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function exploreSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('🔍 Exploring existing schema...')

  // Check all the tables we found
  const tables = ['sensors', 'zones', 'alerts', 'organizations']

  for (const table of tables) {
    console.log(`\n📊 Table: ${table}`)

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(3)

    if (data) {
      console.log(`   Records: ${data.length}`)
      if (data.length > 0) {
        console.log(`   Sample record:`, JSON.stringify(data[0], null, 2))
      }
    } else {
      console.log(`   Error:`, error?.message)
    }
  }

  // Check for sensor readings table variants
  console.log('\n🔍 Looking for sensor readings table...')
  const readingsTables = ['sensor_readings', 'readings', 'water_levels', 'measurements', 'data']

  for (const table of readingsTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (data && !error) {
        console.log(`✅ Found readings table: ${table}`)
        if (data.length > 0) {
          console.log(`   Sample reading:`, JSON.stringify(data[0], null, 2))
        }
      }
    } catch (e) {
      // Silent ignore
    }
  }
}

exploreSchema()
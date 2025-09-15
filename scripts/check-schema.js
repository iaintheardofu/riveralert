const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('🔍 Checking existing schema...')

    // Method 1: Try to query sensors table directly
    const { data: sensorsData, error: sensorsError } = await supabase
      .from('sensors')
      .select('*')
      .limit(5)

    if (sensorsData) {
      console.log('✅ Sensors table exists with', sensorsData.length, 'records')
      if (sensorsData.length > 0) {
        console.log('📊 Sample sensor:', sensorsData[0])
      }
    } else {
      console.log('❌ Sensors table error:', sensorsError?.message)
    }

    // Method 2: Try other expected tables
    const tables = ['sensor_readings', 'zones', 'alerts', 'evacuation_routes']

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (data) {
        console.log(`✅ ${table} table exists`)
      } else {
        console.log(`❌ ${table} table error:`, error?.message)
      }
    }

    // Method 3: Use SQL to get table list (if we have permissions)
    const { data: sqlData, error: sqlError } = await supabase
      .rpc('exec_sql', {
        sql: "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
      })

    if (sqlData) {
      console.log('📋 Tables via SQL:', sqlData)
    } else {
      console.log('⚠️  Cannot execute SQL:', sqlError?.message)
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkSchema()
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkReadingsSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('🔍 Checking readings table schema...')

  // Try to insert with minimal data to see what fields are required/available
  const { data, error } = await supabase
    .from('readings')
    .insert([{ sensor_id: 'test' }])
    .select()

  if (error) {
    console.log('❌ Insert error (this helps us understand the schema):', error.message)

    // Try to understand the error message to see what fields are required
    if (error.message.includes('null value in column')) {
      console.log('💡 This tells us about required fields')
    }
  }

  // Let's also try to select with a LIMIT 0 to just get the column structure without data
  const { data: schemaCheck, error: schemaError } = await supabase
    .from('readings')
    .select('*')
    .limit(0)

  if (schemaCheck !== null) {
    console.log('✅ Successfully accessed readings table (empty result expected)')
  } else {
    console.log('❌ Schema check error:', schemaError?.message)
  }

  // Try some common field names that might exist
  console.log('\n🧪 Testing common field patterns...')

  const possibleFields = [
    'id',
    'sensor_id',
    'water_level',
    'water_level_m',
    'water_level_ft',
    'value',
    'measurement',
    'data',
    'timestamp',
    'recorded_at',
    'created_at',
    'updated_at',
    'reading_value',
    'level',
    'flow',
    'rainfall',
    'temperature',
    'metadata'
  ]

  // Try to select each field individually to see which ones exist
  for (const field of possibleFields) {
    try {
      const { error: fieldError } = await supabase
        .from('readings')
        .select(field)
        .limit(1)

      if (!fieldError) {
        console.log(`✅ Field exists: ${field}`)
      }
    } catch (e) {
      // Silent ignore
    }
  }
}

checkReadingsSchema()
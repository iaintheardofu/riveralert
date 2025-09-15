const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function createTables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  console.log('🔍 Environment check:')
  console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing')
  console.log('Service Key:', supabaseServiceKey ? 'Set (length: ' + supabaseServiceKey.length + ')' : 'Missing')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('🔧 Creating tables...')

    // Create sensors table
    const { error: sensorsError } = await supabase.rpc('exec_sql', {
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
    })

    if (sensorsError) {
      console.log('📋 Trying direct table creation...')
      // If RPC doesn't work, try direct table creation
      const { error: directError } = await supabase
        .from('sensors')
        .select('id')
        .limit(1)

      if (directError && directError.code === 'PGRST116') {
        console.log('✅ Tables need to be created via Supabase dashboard or migrations')
        console.log('🔍 Let\'s check what tables exist...')

        // Try to list existing tables
        const { data, error } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')

        if (data) {
          console.log('📊 Existing tables:', data.map(t => t.table_name))
        } else {
          console.log('❌ Cannot access table information:', error)
        }
      }
    } else {
      console.log('✅ Sensors table created/verified')
    }

    // Test connection with anon key
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { error: testError } = await anonClient
      .from('sensors')
      .select('count', { count: 'exact' })
      .limit(1)

    if (testError) {
      console.log('⚠️  Anon key test error:', testError.message)
    } else {
      console.log('✅ Anon key connection successful')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

createTables()
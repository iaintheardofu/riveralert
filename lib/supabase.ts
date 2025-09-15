import { createClient } from '@supabase/supabase-js'

// Safe Supabase client initialization
export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not configured - using demo mode')
    return null
  }

  return createClient(supabaseUrl, supabaseKey)
}

// Mock data for demo mode when Supabase is not configured
export const demoData = {
  sensors: [
    {
      id: 'bexar-01',
      name: 'Huebner Creek at Vance Jackson',
      type: 'water_level',
      location: { lat: 29.5051, lng: -98.4016 },
      status: 'active',
      metadata: { county: 'bexar', crossing: true, critical_level: 15 }
    },
    {
      id: 'kerr-01',
      name: 'Guadalupe River at Kerrville',
      type: 'combined',
      location: { lat: 30.0508, lng: -99.1406 },
      status: 'active',
      metadata: { county: 'kerr', river: 'guadalupe', critical_level: 20 }
    }
  ],
  readings: [
    {
      sensor_id: 'bexar-01',
      water_level_ft: 13.8,
      flow_cfs: 2680,
      rainfall_in: 2.3,
      timestamp: new Date().toISOString()
    },
    {
      sensor_id: 'kerr-01',
      water_level_ft: 12.1,
      flow_cfs: 3700,
      rainfall_in: 0.9,
      timestamp: new Date().toISOString()
    }
  ],
  alerts: [
    {
      id: '1',
      type: 'flood_warning',
      severity: 'high',
      title: 'Flash Flood Warning - Bexar County',
      description: 'Heavy rainfall has caused rapid water rise in Huebner Creek.',
      affected_area: { lat: 29.50, lng: -98.40, radius: 5 },
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
    }
  ],
  predictions: [
    {
      sensor_id: 'bexar-01',
      model_type: 'lstm_nn_ensemble',
      prediction_horizon_hours: 6,
      predicted_values: [14.2, 14.8, 15.3, 15.7, 16.0, 16.2],
      confidence_score: 0.85,
      created_at: new Date().toISOString()
    }
  ]
}
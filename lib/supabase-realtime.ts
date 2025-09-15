import { createClient } from '@supabase/supabase-js'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Types matching your existing database schema
export interface SensorReading {
  id: string
  sensor_id: string
  water_level_m?: number
  flow_rate?: number
  rainfall_mm?: number
  temperature_c?: number
  humidity_percent?: number
  pressure_mb?: number
  wind_speed_mps?: number
  wind_direction_deg?: number
  battery_voltage?: number
  signal_strength?: number
  metadata?: any
  recorded_at: string
  created_at?: string
}

export interface Alert {
  id: string
  sensor_id?: string
  crossing_id?: string
  zone_id?: string
  severity: 'low' | 'moderate' | 'high' | 'extreme'
  title: string
  message?: string
  water_level_m?: number
  rate_of_change?: number
  predicted_peak_time?: string
  predicted_peak_level_m?: number
  metadata?: any
  is_active: boolean
  issued_at: string
  expires_at?: string
  resolved_at?: string
  created_at: string
}

export interface Sensor {
  id: string
  external_id: string
  name: string
  type: string
  status: string
  location: string // PostGIS geometry
  elevation_m: number
  zone_id: string
  organization_id: string
  metadata: any
  is_active: boolean
  installed_at: string
  last_reading_at?: string
  battery_level?: number
  created_at: string
  updated_at: string
}

export interface Zone {
  id: string
  name: string
  code: string
  boundary: string // PostGIS geometry
  center_point: string // PostGIS geometry
  population: number
  risk_level: string
  description: string
  created_at: string
  updated_at: string
}

// Real-time Supabase client with enhanced configuration
export function createRealtimeClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables not configured')
  }

  return createClient(supabaseUrl, supabaseKey, {
    realtime: {
      params: {
        eventsPerSecond: 20, // Increased for high-frequency sensor data
      },
      heartbeatIntervalMs: 30000,
      reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 5000),
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

// Real-time subscription manager
export class RiverAlertRealtime {
  private supabase: ReturnType<typeof createRealtimeClient> | null = null
  private subscriptions = new Map<string, any>()
  private initialized = false

  constructor() {
    // Don't initialize immediately - do it lazily
  }

  private initializeClient() {
    if (!this.initialized) {
      try {
        this.supabase = createRealtimeClient()
        this.initialized = true
      } catch (error) {
        console.error('Failed to initialize Supabase realtime client:', error)
        this.supabase = null
        this.initialized = true // Mark as initialized even if failed
      }
    }
  }

  private ensureClient() {
    this.initializeClient()
    return this.supabase
  }

  // Subscribe to sensor readings for real-time updates
  subscribeSensorReadings(
    sensorIds?: string[],
    onUpdate?: (payload: RealtimePostgresChangesPayload<SensorReading>) => void,
    onInsert?: (payload: RealtimePostgresChangesPayload<SensorReading>) => void
  ) {
    const client = this.ensureClient()
    if (!client) {
      console.warn('Supabase client not available, skipping realtime subscription')
      return null
    }

    let query = client.channel('sensor_readings')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'readings',
          filter: sensorIds ? `sensor_id=in.(${sensorIds.join(',')})` : undefined,
        },
        (payload) => {
          console.log('New sensor reading:', payload.new)
          onInsert?.(payload as RealtimePostgresChangesPayload<SensorReading>)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'readings',
          filter: sensorIds ? `sensor_id=in.(${sensorIds.join(',')})` : undefined,
        },
        (payload) => {
          console.log('Updated sensor reading:', payload.new)
          onUpdate?.(payload as RealtimePostgresChangesPayload<SensorReading>)
        }
      )
      .subscribe()

    this.subscriptions.set('readings', query)
    return query
  }

  // Subscribe to alerts for real-time updates
  subscribeAlerts(
    onUpdate?: (payload: RealtimePostgresChangesPayload<Alert>) => void,
    onInsert?: (payload: RealtimePostgresChangesPayload<Alert>) => void,
    onDelete?: (payload: RealtimePostgresChangesPayload<Alert>) => void
  ) {
    const client = this.ensureClient()
    if (!client) {
      console.warn('Supabase client not available, skipping alerts subscription')
      return null
    }

    const query = client.channel('alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          console.log('New alert:', payload.new)
          onInsert?.(payload as RealtimePostgresChangesPayload<Alert>)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          console.log('Updated alert:', payload.new)
          onUpdate?.(payload as RealtimePostgresChangesPayload<Alert>)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          console.log('Deleted alert:', payload.old)
          onDelete?.(payload as RealtimePostgresChangesPayload<Alert>)
        }
      )
      .subscribe()

    this.subscriptions.set('alerts', query)
    return query
  }

  // Subscribe to sensor status changes
  subscribeSensorStatus(
    onUpdate?: (payload: RealtimePostgresChangesPayload<Sensor>) => void
  ) {
    const client = this.ensureClient()
    if (!client) {
      console.warn('Supabase client not available, skipping sensor status subscription')
      return null
    }

    const query = client.channel('sensors')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sensors',
        },
        (payload) => {
          console.log('Sensor status changed:', payload.new)
          onUpdate?.(payload as RealtimePostgresChangesPayload<Sensor>)
        }
      )
      .subscribe()

    this.subscriptions.set('sensors', query)
    return query
  }

  // Subscribe to predictions for ML updates
  subscribePredictions(
    sensorIds?: string[],
    onInsert?: (payload: any) => void
  ) {
    const client = this.ensureClient()
    if (!client) {
      console.warn('Supabase client not available, skipping predictions subscription')
      return null
    }

    const query = client.channel('predictions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'predictions',
          filter: sensorIds ? `sensor_id=in.(${sensorIds.join(',')})` : undefined,
        },
        (payload) => {
          console.log('New prediction:', payload.new)
          onInsert?.(payload)
        }
      )
      .subscribe()

    this.subscriptions.set('predictions', query)
    return query
  }

  // Subscribe to multiple channels with custom filtering
  subscribeCustom(
    channelName: string,
    tableName: string,
    events: ('INSERT' | 'UPDATE' | 'DELETE')[],
    filter?: string,
    callback?: (payload: any) => void
  ) {
    const client = this.ensureClient()
    if (!client) {
      console.warn('Supabase client not available, skipping custom subscription')
      return null
    }

    let channel = client.channel(channelName)

    events.forEach(event => {
      channel = channel.on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table: tableName,
          filter,
        },
        (payload) => {
          console.log(`${event} on ${tableName}:`, payload)
          callback?.(payload)
        }
      )
    })

    const subscription = channel.subscribe()
    this.subscriptions.set(channelName, subscription)
    return subscription
  }

  // Unsubscribe from a specific channel
  unsubscribe(channelName: string) {
    const subscription = this.subscriptions.get(channelName)
    if (subscription) {
      const client = this.ensureClient()
      if (client) {
        client.removeChannel(subscription)
      }
      this.subscriptions.delete(channelName)
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll() {
    const client = this.ensureClient()
    if (client) {
      this.subscriptions.forEach((subscription, name) => {
        client.removeChannel(subscription)
      })
    }
    this.subscriptions.clear()
  }

  // Get connection status
  getConnectionStatus() {
    const client = this.ensureClient()
    return client?.realtime.isConnected() ?? false
  }

  // Manual reconnection
  reconnect() {
    const client = this.ensureClient()
    client?.realtime.disconnect()
    // Resubscribe to all channels
    const channelNames = Array.from(this.subscriptions.keys())
    this.unsubscribeAll()

    // Reconnect would need to be implemented based on stored subscription configs
    console.log('Manual reconnection triggered for channels:', channelNames)
  }

  // Helper to simulate real-time data for demo purposes
  async simulateRealTimeData() {
    const client = this.ensureClient()
    if (!client) {
      console.warn('Supabase client not available, skipping simulation')
      return
    }

    // Get existing sensors
    const { data: sensors } = await client
      .from('sensors')
      .select('id')
      .eq('status', 'active')
      .limit(5)

    if (!sensors?.length) return

    // Simulate sensor readings every 30 seconds
    setInterval(async () => {
      for (const sensor of sensors) {
        const reading = {
          sensor_id: sensor.id,
          water_level_ft: Math.random() * 20 + 5,
          flow_cfs: Math.random() * 5000 + 1000,
          rainfall_in: Math.random() * 3,
          temperature_f: Math.random() * 30 + 60,
          humidity_percent: Math.random() * 40 + 40,
          timestamp: new Date().toISOString(),
        }

        await client
          .from('sensor_readings')
          .insert(reading)
      }
    }, 30000) // Every 30 seconds
  }

  // Get the Supabase client for direct queries
  getClient() {
    return this.ensureClient()
  }
}

// Export singleton instance
export const riverAlertRealtime = new RiverAlertRealtime()

// React hooks for easy integration
export function useRealTimeSensorReadings(sensorIds?: string[]) {
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    try {
      const subscription = riverAlertRealtime.subscribeSensorReadings(
        sensorIds,
        (payload) => {
          setReadings(prev => prev.map(r =>
            r.id === payload.new.id ? payload.new : r
          ))
        },
        (payload) => {
          setReadings(prev => [payload.new, ...prev.slice(0, 99)]) // Keep last 100
        }
      )

      // Only update connection status if subscription was successful
      if (subscription) {
        setIsConnected(riverAlertRealtime.getConnectionStatus())
      } else {
        setIsConnected(false)
      }

      return () => {
        try {
          riverAlertRealtime.unsubscribe('readings')
        } catch (error) {
          console.warn('Error unsubscribing from sensor readings:', error)
        }
      }
    } catch (error) {
      console.warn('Error setting up sensor readings subscription:', error)
      setIsConnected(false)
    }
  }, [sensorIds])

  return { readings: readings ?? [], isConnected }
}

export function useRealTimeAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    try {
      const subscription = riverAlertRealtime.subscribeAlerts(
        (payload) => {
          setAlerts(prev => prev.map(a =>
            a.id === payload.new.id ? payload.new : a
          ))
        },
        (payload) => {
          setAlerts(prev => [payload.new, ...prev])
        },
        (payload) => {
          setAlerts(prev => prev.filter(a => a.id !== payload.old.id))
        }
      )

      // Only update connection status if subscription was successful
      if (subscription) {
        setIsConnected(riverAlertRealtime.getConnectionStatus())
      } else {
        setIsConnected(false)
      }

      return () => {
        try {
          riverAlertRealtime.unsubscribe('alerts')
        } catch (error) {
          console.warn('Error unsubscribing from alerts:', error)
        }
      }
    } catch (error) {
      console.warn('Error setting up alerts subscription:', error)
      setIsConnected(false)
    }
  }, [])

  return { alerts: alerts ?? [], isConnected }
}
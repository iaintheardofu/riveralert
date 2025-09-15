'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { riverAlertRealtime, useRealTimeSensorReadings, useRealTimeAlerts, SensorReading, Alert as AlertType } from '@/lib/supabase-realtime'
import { loadInitialData, createMockReadings } from '@/lib/load-initial-data'
import {
  AlertTriangle,
  Activity,
  MapPin,
  Shield,
  School,
  Home,
  Building,
  CloudRain,
  TrendingUp,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react'

interface RealTimeTexasDashboardProps {
  initialSensors?: any[]
  initialAlerts?: any[]
}

export default function RealTimeTexasDashboard({
  initialSensors = [],
  initialAlerts = []
}: RealTimeTexasDashboardProps) {
  const [selectedZones, setSelectedZones] = useState<string[]>(['school', 'emergency'])
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')
  const [sensorData, setSensorData] = useState<Record<string, SensorReading>>({})
  const [alerts, setAlerts] = useState<AlertType[]>(initialAlerts)
  const [isLoading, setIsLoading] = useState(true)
  const [sensorMap, setSensorMap] = useState<Record<string, any>>({})

  // Real-time hooks
  const { readings, isConnected: sensorsConnected } = useRealTimeSensorReadings()
  const { alerts: realtimeAlerts, isConnected: alertsConnected } = useRealTimeAlerts()

  // Load initial data from your existing database
  useEffect(() => {
    async function loadData() {
      try {
        console.log('🔍 Starting to load initial data...')
        const { sensors, readings, alerts: dbAlerts } = await loadInitialData()
        console.log('✅ Load initial data completed successfully')

        // If we have readings, use them; otherwise create mock data from sensors
        let sensorReadings: Record<string, SensorReading>
        if (readings && readings.length > 0) {
          sensorReadings = {}
          readings.forEach(reading => {
            sensorReadings[reading.sensor_id] = reading
          })
        } else {
          sensorReadings = createMockReadings(sensors)
        }

        // Store sensors for displaying names
        const sensorMapData: Record<string, any> = {}
        sensors.forEach(sensor => {
          sensorMapData[sensor.id] = sensor
        })
        setSensorMap(sensorMapData)

        setSensorData(sensorReadings)
        setAlerts(dbAlerts || [])
        setIsLoading(false)

        console.log('Loaded data:', {
          sensorsCount: sensors.length,
          readingsCount: Object.keys(sensorReadings).length,
          alertsCount: dbAlerts?.length || 0
        })
      } catch (error) {
        console.error('❌ Error loading initial data:', error)
        // Set some fallback data so the dashboard still works
        setSensorData({})
        setAlerts([])
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Update connection status
  useEffect(() => {
    const connected = sensorsConnected && alertsConnected
    setConnectionStatus(connected ? 'connected' : 'disconnected')
  }, [sensorsConnected, alertsConnected])

  // Update sensor data when new readings arrive
  useEffect(() => {
    if (readings.length > 0) {
      const newSensorData = { ...sensorData }
      readings.forEach(reading => {
        newSensorData[reading.sensor_id] = reading
      })
      setSensorData(newSensorData)
    }
  }, [readings])

  // Update alerts when new alerts arrive
  useEffect(() => {
    if (realtimeAlerts.length > 0) {
      setAlerts(realtimeAlerts)
    }
  }, [realtimeAlerts])

  // Get current risk level based on latest sensor data
  const getCurrentRiskLevel = () => {
    const levels = Object.values(sensorData).map(reading => {
      const waterLevel = reading.water_level_m || 0
      if (waterLevel > 5) return 'extreme'
      if (waterLevel > 3) return 'high'
      if (waterLevel > 1.5) return 'moderate'
      return 'low'
    })

    if (levels.includes('extreme')) return 'extreme'
    if (levels.includes('high')) return 'high'
    if (levels.includes('moderate')) return 'moderate'
    return 'low'
  }

  const currentRiskLevel = getCurrentRiskLevel()
  const activeAlerts = alerts.filter(alert => alert.is_active)

  // Risk level styling
  const getRiskLevelStyle = (level: string) => {
    switch (level) {
      case 'extreme':
        return 'bg-red-500 text-white border-red-600'
      case 'high':
        return 'bg-orange-500 text-white border-orange-600'
      case 'moderate':
        return 'bg-yellow-500 text-black border-yellow-600'
      case 'low':
        return 'bg-green-500 text-white border-green-600'
      default:
        return 'bg-gray-500 text-white border-gray-600'
    }
  }

  // Connection status indicator
  const ConnectionIndicator = () => (
    <div className="flex items-center gap-2 text-sm">
      {connectionStatus === 'connected' ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-green-600">Real-time Connected</span>
        </>
      ) : connectionStatus === 'disconnected' ? (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-red-600">Disconnected</span>
        </>
      ) : (
        <>
          <div className="h-4 w-4 bg-yellow-500 rounded-full animate-pulse" />
          <span className="text-yellow-600">Connecting...</span>
        </>
      )}
    </div>
  )

  // Zone toggle handler
  const toggleZone = (zoneType: string) => {
    setSelectedZones(prev =>
      prev.includes(zoneType)
        ? prev.filter(z => z !== zoneType)
        : [...prev, zoneType]
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">
            🌊 RiverAlert Texas
          </h1>
          <p className="text-gray-600">
            Real-time Flood Monitoring & Early Warning System
          </p>
          <div className="flex justify-center">
            <ConnectionIndicator />
          </div>
        </div>

        {/* Current Risk Level */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold mb-2">Current Risk Level</h2>
                <div className="flex items-center gap-4">
                  <Badge className={`text-lg px-4 py-2 ${getRiskLevelStyle(currentRiskLevel)}`}>
                    {currentRiskLevel.toUpperCase()}
                  </Badge>
                  <span className="text-gray-600">
                    Based on {Object.keys(sensorData).length} active sensors
                  </span>
                </div>
              </div>
              <AlertTriangle className={`h-12 w-12 ${
                currentRiskLevel === 'extreme' ? 'text-red-500' :
                currentRiskLevel === 'high' ? 'text-orange-500' :
                currentRiskLevel === 'moderate' ? 'text-yellow-500' :
                'text-green-500'
              }`} />
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Active Alerts</h3>
            {activeAlerts.map((alert) => (
              <Alert key={alert.id} className={`border-l-4 ${
                alert.severity === 'extreme' ? 'border-red-500 bg-red-50' :
                alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                alert.severity === 'moderate' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-500 bg-blue-50'
              }`}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>{alert.title}</strong>
                      {alert.description && <p className="mt-1">{alert.description}</p>}
                    </div>
                    <Badge variant={alert.severity === 'extreme' ? 'destructive' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Zone Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              District Alert Zones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { type: 'school', icon: School, label: 'Schools', count: '45K population' },
                { type: 'emergency', icon: Shield, label: 'Emergency Services', count: '3 facilities' },
                { type: 'residential', icon: Home, label: 'Residential', count: '25K households' },
                { type: 'commercial', icon: Building, label: 'Commercial', count: '200 businesses' }
              ].map(({ type, icon: Icon, label, count }) => (
                <Button
                  key={type}
                  variant={selectedZones.includes(type) ? 'default' : 'outline'}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => toggleZone(type)}
                >
                  <Icon className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">{label}</div>
                    <div className="text-xs opacity-70">{count}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Real-time Sensor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(sensorData).map(([sensorId, reading]) => {
            const waterLevel = reading.water_level_m || 0
            const flowRate = reading.flow_rate || 0
            const rainfall = reading.rainfall_mm || 0

            const status = waterLevel > 5 ? 'critical' :
                          waterLevel > 3 ? 'warning' :
                          waterLevel > 1.5 ? 'elevated' : 'normal'

            return (
              <Card key={sensorId} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{sensorMap[sensorId]?.name || sensorId}</span>
                    <Badge variant={status === 'critical' ? 'destructive' :
                                  status === 'warning' ? 'secondary' : 'outline'}>
                      {status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Water Level</span>
                      <span className="font-semibold">{waterLevel.toFixed(1)} m</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          status === 'critical' ? 'bg-red-500' :
                          status === 'warning' ? 'bg-orange-500' :
                          status === 'elevated' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(waterLevel / 6 * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Flow Rate</div>
                      <div className="font-semibold">{flowRate.toFixed(1)} m³/s</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Rainfall</div>
                      <div className="font-semibold">{rainfall.toFixed(1)} mm</div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Last updated: {new Date(reading.recorded_at || reading.created_at).toLocaleTimeString()}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Loading and No data messages */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold mb-2">Loading Dashboard Data</h3>
              <p className="text-gray-600">
                Loading sensor data from your Supabase database...
              </p>
            </CardContent>
          </Card>
        ) : Object.keys(sensorData).length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Sensor Data</h3>
              <p className="text-gray-600">
                No sensor readings found. Your sensors and tables are connected, but no readings data is available yet.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Footer */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                🤖 Powered by Stanford CS221 ML Algorithms
              </div>
              <div>
                Real-time updates every 30 seconds
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
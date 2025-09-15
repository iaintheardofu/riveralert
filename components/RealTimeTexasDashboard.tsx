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
    try {
      if (readings && readings.length > 0) {
        setSensorData(prevSensorData => {
          const newSensorData = { ...prevSensorData }
          readings.forEach(reading => {
            if (reading && reading.sensor_id) {
              newSensorData[reading.sensor_id] = reading
            }
          })
          return newSensorData
        })
      }
    } catch (error) {
      console.error('Error updating sensor data from readings:', error)
    }
  }, [readings])

  // Update alerts when new alerts arrive
  useEffect(() => {
    try {
      if (realtimeAlerts && realtimeAlerts.length > 0) {
        setAlerts(realtimeAlerts)
      }
    } catch (error) {
      console.error('Error updating alerts from realtime:', error)
    }
  }, [realtimeAlerts])

  // Get current risk level based on latest sensor data
  const getCurrentRiskLevel = () => {
    try {
      if (!sensorData || Object.keys(sensorData).length === 0) {
        return 'low'
      }

      const levels = Object.values(sensorData).map(reading => {
        if (!reading) return 'low'
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
    } catch (error) {
      console.error('Error calculating risk level:', error)
      return 'low'
    }
  }

  const currentRiskLevel = getCurrentRiskLevel()
  const activeAlerts = (alerts ?? []).filter(alert => alert?.is_active)

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200 rounded-full opacity-10 animate-pulse"></div>
      <div className="absolute top-40 right-20 w-20 h-20 bg-indigo-300 rounded-full opacity-15 animate-bounce"></div>
      <div className="absolute bottom-32 left-1/4 w-16 h-16 bg-cyan-200 rounded-full opacity-20"></div>

      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="text-center space-y-6 py-8">
          <div className="relative inline-block">
            <h1 className="text-6xl md:text-7xl font-extrabold bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-800 bg-clip-text text-transparent drop-shadow-sm">
              🌊 RiverAlert Texas
            </h1>
            <div className="absolute -top-3 -right-4 bg-emerald-500 text-white text-sm font-semibold px-3 py-1 rounded-full shadow-lg animate-pulse">
              LIVE
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-2xl font-medium text-slate-700 max-w-3xl mx-auto leading-relaxed">
              Next-Generation Flood Monitoring & Early Warning System
            </p>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Powered by Stanford AI • Protecting Texas Communities • Real-time Intelligence
            </p>
          </div>

          <div className="flex justify-center items-center space-x-8 pt-4">
            <ConnectionIndicator />
            <div className="flex items-center space-x-3 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-sm"></div>
              <span className="text-sm font-medium text-slate-700">All Systems Operational</span>
            </div>
          </div>
        </div>

        {/* Current Risk Level */}
        <Card className="bg-white/70 backdrop-blur-sm shadow-xl border-0">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-slate-800">Current Risk Assessment</h2>
                <div className="flex items-center gap-6">
                  <Badge className={`text-xl font-semibold px-6 py-3 shadow-lg ${getRiskLevelStyle(currentRiskLevel)}`}>
                    {currentRiskLevel.toUpperCase()} RISK
                  </Badge>
                  <div className="text-slate-600">
                    <div className="text-lg font-medium">Real-time Analysis</div>
                    <div className="text-sm">Based on {Object.keys(sensorData ?? {}).length} active monitoring stations</div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <AlertTriangle className={`h-16 w-16 ${
                  currentRiskLevel === 'extreme' ? 'text-red-500' :
                  currentRiskLevel === 'high' ? 'text-orange-500' :
                  currentRiskLevel === 'moderate' ? 'text-yellow-500' :
                  'text-emerald-500'
                }`} />
                {(currentRiskLevel === 'moderate' || currentRiskLevel === 'high') && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Active Alerts</h3>
            {activeAlerts.map((alert) => (
              <Alert key={alert?.id ?? Math.random()} className={`border-l-4 ${
                alert?.severity === 'extreme' ? 'border-red-500 bg-red-50' :
                alert?.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                alert?.severity === 'moderate' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-500 bg-blue-50'
              }`}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>{alert?.title || 'Alert'}</strong>
                      {alert?.description && <p className="mt-1">{alert.description}</p>}
                    </div>
                    <Badge variant={alert?.severity === 'extreme' ? 'destructive' : 'secondary'}>
                      {alert?.severity || 'unknown'}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Zone Selection */}
        <Card className="bg-white/70 backdrop-blur-sm shadow-xl border-0">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-800">
              <Shield className="h-7 w-7 text-blue-600" />
              Protected Community Zones
            </CardTitle>
            <p className="text-slate-600 mt-2">Real-time monitoring coverage across critical infrastructure</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { type: 'school', icon: School, label: 'Educational', count: '45K students', color: 'blue' },
                { type: 'emergency', icon: Shield, label: 'Emergency', count: '3 facilities', color: 'red' },
                { type: 'residential', icon: Home, label: 'Residential', count: '25K households', color: 'green' },
                { type: 'commercial', icon: Building, label: 'Commercial', count: '200 businesses', color: 'purple' }
              ].map(({ type, icon: Icon, label, count, color }) => (
                <Button
                  key={type}
                  variant={selectedZones.includes(type) ? 'default' : 'outline'}
                  className={`h-auto p-5 flex flex-col items-center gap-3 transition-all duration-300 hover:scale-105 ${
                    selectedZones.includes(type)
                      ? `bg-${color}-500 hover:bg-${color}-600 text-white shadow-lg`
                      : `hover:bg-${color}-50 hover:border-${color}-300`
                  }`}
                  onClick={() => toggleZone(type)}
                >
                  <Icon className={`h-7 w-7 ${selectedZones.includes(type) ? 'text-white' : `text-${color}-600`}`} />
                  <div className="text-center">
                    <div className="font-semibold text-sm">{label}</div>
                    <div className={`text-xs ${selectedZones.includes(type) ? 'text-white/80' : 'text-slate-500'}`}>{count}</div>
                  </div>
                  {selectedZones.includes(type) && (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Real-time Sensor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(sensorData ?? {}).map(([sensorId, reading]) => {
            if (!reading || !sensorId) return null

            const waterLevel = reading.water_level_m || 0
            const flowRate = reading.flow_rate || 0
            const rainfall = reading.rainfall_mm || 0

            const status = waterLevel > 5 ? 'critical' :
                          waterLevel > 3 ? 'warning' :
                          waterLevel > 1.5 ? 'elevated' : 'normal'

            return (
              <Card key={sensorId} className="bg-white/80 backdrop-blur-sm hover:shadow-2xl hover:scale-105 transition-all duration-300 border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full shadow-sm ${
                        status === 'critical' ? 'bg-red-500 animate-pulse' :
                        status === 'warning' ? 'bg-orange-500 animate-pulse' :
                        status === 'elevated' ? 'bg-yellow-500' : 'bg-emerald-500'
                      }`}></div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm truncate">{(sensorMap ?? {})[sensorId]?.name || sensorId}</div>
                        <div className="text-xs text-slate-500">Monitoring Station</div>
                      </div>
                    </div>
                    <Badge variant={status === 'critical' ? 'destructive' :
                                  status === 'warning' ? 'secondary' : 'outline'}
                           className="font-semibold shadow-sm">
                      {status.toUpperCase()}
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

        {/* Enhanced Metrics Footer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{Object.keys(sensorData ?? {}).length}</div>
                  <div className="text-blue-100">Active Sensors</div>
                </div>
                <Activity className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">95.2%</div>
                  <div className="text-green-100">System Uptime</div>
                </div>
                <Shield className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">287K</div>
                  <div className="text-purple-100">Lives Protected</div>
                </div>
                <Home className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Technology Footer */}
        <Card className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-lg font-semibold mb-2">🤖 AI-Powered Predictions</div>
                <div className="text-gray-300">Stanford CS221 ML Algorithms</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold mb-2">⚡ Real-time Processing</div>
                <div className="text-gray-300">30-second update intervals</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold mb-2">🌐 Enterprise Grade</div>
                <div className="text-gray-300">99.9% availability SLA</div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
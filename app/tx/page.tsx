'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TexasGeoConfig } from '@/apps/web/config/geo.tx'
import {
  AlertTriangle,
  Activity,
  MapPin,
  Navigation,
  MessageSquare,
  Shield,
  School,
  Home,
  Building,
  Send,
  Loader2,
  CloudRain,
  TrendingUp,
  AlertCircle
} from 'lucide-react'

// Dynamic import for Leaflet (client-side only)
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-[600px] bg-gray-100 animate-pulse rounded-lg" />
})

// Chat component for AI assistant
function FloodAssistant({ mapData }: { mapData: any }) {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    { role: 'assistant', content: 'Hello! I\'m your RiverAlert AI assistant. I can help you understand flood risks, evacuation routes, and current conditions. How can I assist you today?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          context: {
            currentRiskLevel: mapData?.riskLevel || 'moderate',
            activeAlerts: mapData?.alerts || [],
            sensorReadings: mapData?.sensors || []
          }
        })
      })

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Flood Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about flood risks, evacuation routes..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}

// Main Texas Dashboard Component
export default function TexasDashboard() {
  const [selectedCounty, setSelectedCounty] = useState('bexar')
  const [riskLevel, setRiskLevel] = useState('moderate')
  const [alerts, setAlerts] = useState<any[]>([])
  const [sensorData, setSensorData] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any>({})
  const [isLoading, setIsLoading] = useState(true)
  const [showDemoMode, setShowDemoMode] = useState(true)

  // Fetch real-time data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch sensor data
        const sensorRes = await fetch('/api/sensors')
        const sensors = await sensorRes.json()
        setSensorData(sensors)

        // Fetch alerts
        const alertsRes = await fetch('/api/alerts')
        const alertData = await alertsRes.json()
        setAlerts(alertData)

        // Fetch predictions
        const predRes = await fetch('/api/predictions')
        const predData = await predRes.json()
        setPredictions(predData)

        // Calculate overall risk
        const maxRisk = Math.max(...sensors.map((s: any) => s.riskScore || 0))
        if (maxRisk > 80) setRiskLevel('extreme')
        else if (maxRisk > 60) setRiskLevel('high')
        else if (maxRisk > 40) setRiskLevel('moderate')
        else setRiskLevel('low')

      } catch (error) {
        console.error('Error fetching data:', error)
        // Use demo data as fallback
        loadDemoData()
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [selectedCounty])

  const loadDemoData = () => {
    // Demo sensor data
    setSensorData([
      {
        id: 'bexar-01',
        name: 'Huebner Creek',
        lat: 29.5051,
        lng: -98.4016,
        waterLevel: 8.5,
        trend: 'rising',
        riskScore: 65
      },
      {
        id: 'kerr-01',
        name: 'Guadalupe River',
        lat: 30.0508,
        lng: -99.1406,
        waterLevel: 12.3,
        trend: 'stable',
        riskScore: 45
      }
    ])

    // Demo alerts
    setAlerts([
      {
        id: 1,
        type: 'warning',
        title: 'Flash Flood Warning',
        description: 'Heavy rainfall expected in Bexar County',
        severity: 'high',
        time: '2 hours ago'
      },
      {
        id: 2,
        type: 'watch',
        title: 'Flood Watch',
        description: 'Rising water levels in Guadalupe River',
        severity: 'moderate',
        time: '4 hours ago'
      }
    ])

    // Demo predictions
    setPredictions({
      sixHour: [8.5, 9.2, 10.1, 11.5, 12.8, 13.2],
      confidence: 0.85,
      peakTime: '6:00 PM',
      evacuationAdvised: false
    })
  }

  const countyInfo = TexasGeoConfig.counties[selectedCounty as keyof typeof TexasGeoConfig.counties]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Mode Banner */}
      {showDemoMode && (
        <div className="bg-blue-600 text-white px-4 py-2 text-center text-sm">
          <span className="font-semibold">DEMO MODE</span> - Texas River Authority Meeting
          <button
            onClick={() => setShowDemoMode(false)}
            className="ml-4 text-xs underline"
          >
            Hide
          </button>
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">RiverAlert Texas</h1>
              <p className="text-xl opacity-90">Saving Lives. One Alert at a Time.</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{new Date().toLocaleTimeString()}</div>
              <div className="text-sm opacity-75">{new Date().toLocaleDateString()}</div>
            </div>
          </div>

          {/* Key Differentiators */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <span className="text-sm">Own IoT Sensors</span>
            </div>
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              <span className="text-sm">Safe Route Navigation</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm">6-Hour AI Predictions</span>
            </div>
            <div className="flex items-center gap-2">
              <School className="h-5 w-5" />
              <span className="text-sm">District-Specific Alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Risk Status Bar */}
        <Alert className={`mb-6 ${
          riskLevel === 'extreme' ? 'border-red-500 bg-red-50' :
          riskLevel === 'high' ? 'border-orange-500 bg-orange-50' :
          riskLevel === 'moderate' ? 'border-yellow-500 bg-yellow-50' :
          'border-green-500 bg-green-50'
        }`}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Current Risk Level: <strong className="uppercase">{riskLevel}</strong> -
              {countyInfo?.name} - {countyInfo?.population.toLocaleString()} residents
            </span>
            <div className="flex gap-2">
              <Badge variant="secondary">
                {countyInfo?.lowWaterCrossings} Crossings
              </Badge>
              <Badge variant="secondary">
                {alerts.length} Active Alerts
              </Badge>
            </div>
          </AlertDescription>
        </Alert>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Map and Controls */}
          <div className="col-span-8 space-y-6">
            {/* County Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Select County</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {Object.entries(TexasGeoConfig.counties).map(([key, county]) => (
                    <Button
                      key={key}
                      variant={selectedCounty === key ? 'default' : 'outline'}
                      onClick={() => setSelectedCounty(key)}
                      className="flex-1"
                    >
                      {county.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Map */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Live Flood Monitoring Map
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Map
                  center={countyInfo?.center}
                  zoom={TexasGeoConfig.mapDefaults.zoom}
                  sensors={sensorData}
                  alerts={alerts}
                  zones={[]}
                  showSafeRoutes={true}
                />
              </CardContent>
            </Card>

            {/* Zone Controls */}
            <Card>
              <CardHeader>
                <CardTitle>District Zone Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <Button variant="outline" className="flex items-center gap-2">
                    <School className="h-4 w-4" />
                    Schools ({Math.floor(Math.random() * 20) + 10})
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Emergency ({Math.floor(Math.random() * 10) + 5})
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Residential ({Math.floor(Math.random() * 50) + 30})
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Commercial ({Math.floor(Math.random() * 30) + 15})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Chat and Alerts */}
          <div className="col-span-4 space-y-6">
            <Tabs defaultValue="chat" className="h-[400px]">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chat">AI Assistant</TabsTrigger>
                <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
              </TabsList>
              <TabsContent value="chat" className="h-full">
                <FloodAssistant mapData={{ riskLevel, alerts, sensors: sensorData }} />
              </TabsContent>
              <TabsContent value="alerts" className="h-full">
                <Card className="h-full overflow-y-auto">
                  <CardContent className="p-4 space-y-4">
                    {alerts.map((alert) => (
                      <Alert key={alert.id} className={
                        alert.severity === 'high' ? 'border-red-500' :
                        alert.severity === 'moderate' ? 'border-yellow-500' :
                        'border-blue-500'
                      }>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-semibold">{alert.title}</div>
                          <div className="text-sm text-gray-600">{alert.description}</div>
                          <div className="text-xs text-gray-500 mt-1">{alert.time}</div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Predictions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  6-Hour AI Predictions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Peak Level Expected:</span>
                    <span className="font-bold">{predictions.peakTime || 'Calculating...'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Confidence:</span>
                    <Badge variant="secondary">
                      {((predictions.confidence || 0) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Evacuation Advisory:</span>
                    <Badge variant={predictions.evacuationAdvised ? 'destructive' : 'secondary'}>
                      {predictions.evacuationAdvised ? 'YES' : 'NO'}
                    </Badge>
                  </div>
                  {/* Simple forecast visualization */}
                  <div className="h-24 bg-gray-100 rounded flex items-end justify-around p-2">
                    {(predictions.sixHour || []).map((level: number, i: number) => (
                      <div
                        key={i}
                        className="w-8 bg-blue-500 rounded-t"
                        style={{ height: `${(level / 20) * 100}%` }}
                        title={`Hour ${i + 1}: ${level.toFixed(1)}ft`}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weather Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CloudRain className="h-5 w-5" />
                  Weather Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rainfall (24h):</span>
                    <span className="font-semibold">2.3 inches</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Soil Saturation:</span>
                    <span className="font-semibold">78%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Wind Speed:</span>
                    <span className="font-semibold">15 mph SE</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pressure:</span>
                    <span className="font-semibold">29.92 inHg</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
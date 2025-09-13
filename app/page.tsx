'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';
import { AlertTriangle, MapPin, Activity, Users, Bell, Brain } from 'lucide-react';
import MLPredictions from '@/components/MLPredictions';

// Dynamic import for Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Alert {
  id: string;
  severity: 'low' | 'moderate' | 'high' | 'extreme';
  message: string;
  created_at: string;
  location?: {
    lat: number;
    lng: number;
  };
}

interface Crossing {
  id: string;
  name: string;
  status: 'open' | 'closed' | 'warning';
  water_level: number;
  last_updated: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface Sensor {
  id: string;
  name: string;
  water_level: number;
  flow_rate: number;
  status: 'normal' | 'elevated' | 'critical';
  coordinates: {
    lat: number;
    lng: number;
  };
}

export default function Home() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [crossings, setCrossings] = useState<Crossing[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'predictions'>('dashboard');

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions
    const alertsChannel = supabase
      .channel('alerts-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const crossingsChannel = supabase
      .channel('crossings-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crossings' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(crossingsChannel);
    };
  }, []);

  const fetchData = async () => {
    try {
      // Fetch alerts
      const { data: alertsData } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch crossings
      const { data: crossingsData } = await supabase
        .from('crossings')
        .select('*, water_levels: sensor_readings(water_level)')
        .limit(20);

      // Fetch sensors
      const { data: sensorsData } = await supabase
        .from('sensors')
        .select('*, readings: sensor_readings(water_level, flow_rate)')
        .limit(50);

      // Process data
      if (alertsData) {
        setAlerts(alertsData.map((alert: any) => ({
          ...alert,
          location: alert.location ? {
            lat: alert.location.coordinates[1],
            lng: alert.location.coordinates[0]
          } : undefined
        })));
      }

      if (crossingsData) {
        setCrossings(crossingsData.map((crossing: any) => ({
          id: crossing.id,
          name: crossing.name,
          status: determineStatus(crossing.water_levels?.[0]?.water_level || 0),
          water_level: crossing.water_levels?.[0]?.water_level || 0,
          last_updated: crossing.updated_at,
          coordinates: {
            lat: crossing.location?.coordinates?.[1] || 29.4241,
            lng: crossing.location?.coordinates?.[0] || -98.4936
          }
        })));
      }

      if (sensorsData) {
        setSensors(sensorsData.map((sensor: any) => ({
          id: sensor.id,
          name: sensor.name,
          water_level: sensor.readings?.[0]?.water_level || 0,
          flow_rate: sensor.readings?.[0]?.flow_rate || 0,
          status: determineSensorStatus(sensor.readings?.[0]?.water_level || 0),
          coordinates: {
            lat: sensor.location?.coordinates?.[1] || 29.4241,
            lng: sensor.location?.coordinates?.[0] || -98.4936
          }
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const determineStatus = (waterLevel: number): 'open' | 'closed' | 'warning' => {
    if (waterLevel > 5) return 'closed';
    if (waterLevel > 3) return 'warning';
    return 'open';
  };

  const determineSensorStatus = (waterLevel: number): 'normal' | 'elevated' | 'critical' => {
    if (waterLevel > 6) return 'critical';
    if (waterLevel > 3) return 'elevated';
    return 'normal';
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'extreme': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">RiverAlert</h1>
                <p className="text-sm text-gray-500">AI-Powered Flood Intelligence System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 rounded-lg hover:bg-gray-100">
                <Bell className="w-6 h-6 text-gray-600" />
                {alerts.length > 0 && (
                  <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full"></span>
                )}
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Users className="w-5 h-5" />
                <span>Admin</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex space-x-4 border-b">
          <button
            onClick={() => setSelectedTab('dashboard')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Real-Time Dashboard</span>
            </div>
          </button>
          <button
            onClick={() => setSelectedTab('predictions')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'predictions'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4" />
              <span>AI Predictions</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedTab === 'dashboard' ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                    <p className="text-3xl font-bold text-gray-900">{alerts.length}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Closed Crossings</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {crossings.filter(c => c.status === 'closed').length}
                    </p>
                  </div>
                  <MapPin className="w-8 h-8 text-red-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Sensors</p>
                    <p className="text-3xl font-bold text-gray-900">{sensors.length}</p>
                  </div>
                  <Activity className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Critical Levels</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {sensors.filter(s => s.status === 'critical').length}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Map */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Flood Map</h2>
                <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Interactive map loading...</p>
                </div>
              </div>

              {/* Recent Alerts */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Recent Alerts</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {loading ? (
                    <p className="text-gray-500">Loading alerts...</p>
                  ) : alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-lg border ${getAlertColor(alert.severity)}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold capitalize">{alert.severity} Alert</p>
                            <p className="text-sm mt-1">{alert.message}</p>
                          </div>
                          <span className="text-xs">
                            {new Date(alert.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No active alerts</p>
                  )}
                </div>
              </div>
            </div>

            {/* Crossings Table */}
            <div className="mt-8 bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-xl font-bold">Low Water Crossings</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Water Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {crossings.map((crossing) => (
                      <tr key={crossing.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {crossing.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            crossing.status === 'open' ? 'bg-green-100 text-green-800' :
                            crossing.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {crossing.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {crossing.water_level.toFixed(2)}m
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(crossing.last_updated).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <MLPredictions />
        )}
      </main>
    </div>
  );
}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { demoSensors } from '@/lib/demoData';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const isSupabaseConfigured = supabaseUrl && supabaseKey &&
  !supabaseUrl.includes('YOUR_PROJECT_ID') &&
  !supabaseKey.includes('YOUR-') &&
  supabaseKey.length > 10;
const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');

    // Use demo data if Supabase is not configured
    if (!isSupabaseConfigured || !supabase) {
      const filteredSensors = status
        ? demoSensors.filter(s => s.status === status)
        : demoSensors;

      return NextResponse.json({
        sensors: filteredSensors.slice(0, limit),
        count: Math.min(filteredSensors.length, limit)
      });
    }

    // Fetch sensors with their latest readings
    let query = supabase
      .from('sensors')
      .select(`
        *,
        sensor_readings (
          water_level,
          flow_rate,
          temperature,
          timestamp
        )
      `)
      .order('name')
      .limit(limit);

    const { data: sensors, error } = await query;

    if (error) {
      throw error;
    }

    // Process sensor data to include latest reading
    const processedSensors = sensors?.map(sensor => {
      const latestReading = sensor.sensor_readings?.[0] || {};
      const waterLevel = latestReading.water_level || 0;
      
      return {
        id: sensor.id,
        name: sensor.name,
        water_level: waterLevel,
        flow_rate: latestReading.flow_rate || 0,
        temperature: latestReading.temperature || null,
        status: determineStatus(waterLevel),
        coordinates: sensor.location?.coordinates ? {
          lat: sensor.location.coordinates[1],
          lng: sensor.location.coordinates[0]
        } : {
          lat: 29.4241,
          lng: -98.4936
        },
        last_updated: latestReading.timestamp || sensor.updated_at
      };
    }) || [];

    // Filter by status if requested
    const filteredSensors = status 
      ? processedSensors.filter(s => s.status === status)
      : processedSensors;

    return NextResponse.json({ 
      sensors: filteredSensors,
      count: filteredSensors.length 
    });
  } catch (error) {
    console.error('Error fetching sensors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sensors' },
      { status: 500 }
    );
  }
}

function determineStatus(waterLevel: number): 'normal' | 'elevated' | 'critical' {
  if (waterLevel > 6) return 'critical';
  if (waterLevel > 3) return 'elevated';
  return 'normal';
}
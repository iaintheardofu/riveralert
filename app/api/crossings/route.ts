import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { demoCrossings } from '@/lib/demoData';

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
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    // Use demo data if Supabase is not configured
    if (!isSupabaseConfigured || !supabase) {
      const filteredCrossings = status
        ? demoCrossings.filter(c => c.status === status)
        : demoCrossings;

      return NextResponse.json({
        crossings: filteredCrossings.slice(0, limit),
        count: Math.min(filteredCrossings.length, limit)
      });
    }

    // Fetch crossings with their latest sensor readings
    let query = supabase
      .from('crossings')
      .select(`
        *,
        sensor_readings (
          water_level,
          timestamp
        )
      `)
      .order('name')
      .limit(limit);

    const { data: crossings, error } = await query;

    if (error) {
      throw error;
    }

    // Process crossing data
    const processedCrossings = crossings?.map(crossing => {
      const waterLevel = crossing.sensor_readings?.[0]?.water_level || 0;
      const crossingStatus = determineStatus(waterLevel, crossing.threshold_warning, crossing.threshold_danger);
      
      return {
        id: crossing.id,
        name: crossing.name,
        status: crossingStatus,
        water_level: waterLevel,
        threshold_warning: crossing.threshold_warning || 3,
        threshold_danger: crossing.threshold_danger || 5,
        coordinates: crossing.location?.coordinates ? {
          lat: crossing.location.coordinates[1],
          lng: crossing.location.coordinates[0]
        } : {
          lat: 29.4241,
          lng: -98.4936
        },
        last_updated: crossing.sensor_readings?.[0]?.timestamp || crossing.updated_at
      };
    }) || [];

    // Filter by status if requested
    const filteredCrossings = status 
      ? processedCrossings.filter(c => c.status === status)
      : processedCrossings;

    return NextResponse.json({ 
      crossings: filteredCrossings,
      count: filteredCrossings.length 
    });
  } catch (error) {
    console.error('Error fetching crossings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crossings' },
      { status: 500 }
    );
  }
}

function determineStatus(
  waterLevel: number, 
  warningThreshold: number = 3, 
  dangerThreshold: number = 5
): 'open' | 'warning' | 'closed' {
  if (waterLevel >= dangerThreshold) return 'closed';
  if (waterLevel >= warningThreshold) return 'warning';
  return 'open';
}
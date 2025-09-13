import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { demoAlerts } from '@/lib/demoData';

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
    const limit = parseInt(searchParams.get('limit') || '10');
    const severity = searchParams.get('severity');

    // Use demo data if Supabase is not configured
    if (!isSupabaseConfigured || !supabase) {
      const filteredAlerts = severity
        ? demoAlerts.filter(a => a.severity === severity)
        : demoAlerts;

      return NextResponse.json({
        alerts: filteredAlerts.slice(0, limit),
        count: Math.min(filteredAlerts.length, limit)
      });
    }

    let query = supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data: alerts, error } = await query;

    if (error) {
      throw error;
    }

    // Process alerts to include location coordinates
    const processedAlerts = alerts?.map(alert => ({
      id: alert.id,
      severity: alert.severity,
      message: alert.message,
      created_at: alert.created_at,
      location: alert.location ? {
        lat: alert.location.coordinates[1],
        lng: alert.location.coordinates[0]
      } : null,
      affected_area: alert.affected_area,
      status: alert.status || 'active'
    })) || [];

    return NextResponse.json({ 
      alerts: processedAlerts,
      count: processedAlerts.length 
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { severity, message, location, affected_area } = body;

    const { data, error } = await supabase
      .from('alerts')
      .insert({
        severity,
        message,
        location: location ? {
          type: 'Point',
          coordinates: [location.lng, location.lat]
        } : null,
        affected_area,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ alert: data });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}
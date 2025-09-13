import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FloodAnalyzer } from '@/lib/ml/floodAnalyzer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize flood analyzer
const floodAnalyzer = new FloodAnalyzer();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sensorId = searchParams.get('sensor_id');
    const hours = parseInt(searchParams.get('hours') || '24');

    // Fetch recent sensor readings
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('sensor_readings')
      .select('*')
      .gte('timestamp', since)
      .order('timestamp', { ascending: true });

    if (sensorId) {
      query = query.eq('sensor_id', sensorId);
    }

    const { data: readings, error: readingsError } = await query;

    if (readingsError) {
      throw readingsError;
    }

    // Fetch weather data if available
    const { data: weatherData } = await supabase
      .from('weather_data')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    // Group readings by sensor
    const sensorReadings = new Map<string, any[]>();
    for (const reading of readings || []) {
      if (!sensorReadings.has(reading.sensor_id)) {
        sensorReadings.set(reading.sensor_id, []);
      }
      sensorReadings.get(reading.sensor_id)!.push(reading);
    }

    // Generate predictions for each sensor
    const predictions = [];
    for (const [sensorId, sensorData] of sensorReadings) {
      const prediction = await floodAnalyzer.analyzeConditions(sensorData, weatherData);
      predictions.push({
        sensor_id: sensorId,
        ...prediction,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error('Error generating predictions:', error);
    return NextResponse.json(
      { error: 'Failed to generate predictions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'train') {
      // Fetch historical data for training
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [readingsResult, alertsResult] = await Promise.all([
        supabase
          .from('sensor_readings')
          .select('*')
          .gte('timestamp', thirtyDaysAgo)
          .order('timestamp', { ascending: true }),
        supabase
          .from('alerts')
          .select('*')
          .gte('created_at', thirtyDaysAgo)
      ]);

      if (readingsResult.error) throw readingsResult.error;
      if (alertsResult.error) throw alertsResult.error;

      // Train the models
      await floodAnalyzer.trainModels({
        readings: readingsResult.data || [],
        alerts: alertsResult.data || []
      });

      // Get model metrics
      const metrics = floodAnalyzer.getModelMetrics();

      return NextResponse.json({
        message: 'Models trained successfully',
        metrics
      });
    } else if (action === 'update') {
      // Update model with observation
      const { prevState, action: observedAction, newState, outcome } = body;

      await floodAnalyzer.updateWithObservation(
        prevState,
        observedAction,
        newState,
        outcome
      );

      return NextResponse.json({
        message: 'Model updated successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in prediction API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
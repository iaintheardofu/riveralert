import { NextRequest, NextResponse } from 'next/server'
import { setupRiverAlertDatabase, startSensorSimulation, checkDatabaseConnection } from '@/lib/database-setup'

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    switch (action) {
      case 'setup':
        const setupResult = await setupRiverAlertDatabase()
        return NextResponse.json(setupResult)

      case 'check':
        const connectionResult = await checkDatabaseConnection()
        return NextResponse.json(connectionResult)

      case 'start-simulation':
        const stopSimulation = await startSensorSimulation()
        return NextResponse.json({
          success: true,
          message: 'Sensor simulation started',
          note: 'Simulation will run until server restart'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: setup, check, or start-simulation' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Database setup API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Simple health check
  try {
    const result = await checkDatabaseConnection()
    return NextResponse.json({
      status: 'ok',
      database: result.connected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: error },
      { status: 500 }
    )
  }
}
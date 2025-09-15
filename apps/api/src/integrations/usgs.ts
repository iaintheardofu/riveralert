// USGS Water Data Integration for Texas Stations
import { TexasGeoConfig } from '@/apps/web/config/geo.tx'

export interface USGSReading {
  site_no: string
  site_name: string
  datetime: string
  water_level_ft?: number
  discharge_cfs?: number
  gage_height_ft?: number
  temperature_c?: number
  county: string
}

export class USGSIntegration {
  private readonly baseUrl = 'https://waterservices.usgs.gov/nwis/iv/'
  private readonly cache = new Map<string, { data: any; timestamp: number }>()
  private readonly cacheExpiry = 15 * 60 * 1000 // 15 minutes

  async fetchStationData(stationId: string): Promise<USGSReading | null> {
    // Check cache
    const cached = this.cache.get(stationId)
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data
    }

    try {
      const params = new URLSearchParams({
        format: 'json',
        sites: stationId,
        parameterCd: '00060,00065,00010', // Discharge, Gage height, Temperature
        siteStatus: 'active'
      })

      const response = await fetch(`${this.baseUrl}?${params}`)

      if (!response.ok) {
        throw new Error(`USGS API error: ${response.status}`)
      }

      const data = await response.json()
      const reading = this.parseUSGSResponse(data)

      // Update cache
      if (reading) {
        this.cache.set(stationId, {
          data: reading,
          timestamp: Date.now()
        })
      }

      return reading
    } catch (error) {
      console.error(`Failed to fetch USGS data for ${stationId}:`, error)
      return null
    }
  }

  async fetchTexasStations(): Promise<USGSReading[]> {
    const readings: USGSReading[] = []

    // Fetch data for all configured Texas stations
    for (const [county, stationIds] of Object.entries(TexasGeoConfig.usgsStations)) {
      for (const stationId of stationIds) {
        const reading = await this.fetchStationData(stationId)
        if (reading) {
          reading.county = county
          readings.push(reading)
        }
      }
    }

    return readings
  }

  async fetchCountyStations(county: string): Promise<USGSReading[]> {
    const stationIds = TexasGeoConfig.usgsStations[county as keyof typeof TexasGeoConfig.usgsStations]

    if (!stationIds) {
      return []
    }

    const readings: USGSReading[] = []

    for (const stationId of stationIds) {
      const reading = await this.fetchStationData(stationId)
      if (reading) {
        reading.county = county
        readings.push(reading)
      }
    }

    return readings
  }

  private parseUSGSResponse(data: any): USGSReading | null {
    try {
      const timeSeries = data.value?.timeSeries?.[0]

      if (!timeSeries) {
        return null
      }

      const siteName = timeSeries.sourceInfo?.siteName || ''
      const siteCode = timeSeries.sourceInfo?.siteCode?.[0]?.value || ''

      // Get the latest values for each parameter
      const values: any = {}

      for (const series of data.value.timeSeries) {
        const variable = series.variable?.variableCode?.[0]?.value
        const latestValue = series.values?.[0]?.value?.[0]

        if (variable && latestValue) {
          switch (variable) {
            case '00060': // Discharge in cfs
              values.discharge_cfs = parseFloat(latestValue.value)
              break
            case '00065': // Gage height in feet
              values.gage_height_ft = parseFloat(latestValue.value)
              values.water_level_ft = parseFloat(latestValue.value)
              break
            case '00010': // Temperature in Celsius
              values.temperature_c = parseFloat(latestValue.value)
              break
          }

          // Update datetime with the latest reading time
          if (!values.datetime || latestValue.dateTime > values.datetime) {
            values.datetime = latestValue.dateTime
          }
        }
      }

      return {
        site_no: siteCode,
        site_name: siteName,
        datetime: values.datetime || new Date().toISOString(),
        water_level_ft: values.water_level_ft,
        discharge_cfs: values.discharge_cfs,
        gage_height_ft: values.gage_height_ft,
        temperature_c: values.temperature_c,
        county: ''
      }
    } catch (error) {
      console.error('Failed to parse USGS response:', error)
      return null
    }
  }

  // Get historical data for trend analysis
  async fetchHistoricalData(
    stationId: string,
    days: number = 7
  ): Promise<any[]> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const params = new URLSearchParams({
      format: 'json',
      sites: stationId,
      parameterCd: '00060,00065',
      startDT: startDate.toISOString(),
      endDT: endDate.toISOString()
    })

    try {
      const response = await fetch(`${this.baseUrl}?${params}`)
      const data = await response.json()

      // Parse historical values
      const historical: any[] = []

      for (const series of data.value?.timeSeries || []) {
        const variable = series.variable?.variableCode?.[0]?.value

        for (const valueSet of series.values || []) {
          for (const value of valueSet.value || []) {
            historical.push({
              datetime: value.dateTime,
              parameter: variable,
              value: parseFloat(value.value),
              qualifiers: value.qualifiers
            })
          }
        }
      }

      return historical.sort((a, b) =>
        new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
      )
    } catch (error) {
      console.error('Failed to fetch historical data:', error)
      return []
    }
  }

  // Check for flood conditions based on USGS data
  analyzeFloodRisk(reading: USGSReading): {
    risk_level: string
    alerts: string[]
  } {
    const alerts: string[] = []
    let riskLevel = 'none'

    // Check water level thresholds
    if (reading.water_level_ft) {
      if (reading.water_level_ft > 15) {
        riskLevel = 'extreme'
        alerts.push('EXTREME_FLOOD_RISK')
      } else if (reading.water_level_ft > 10) {
        riskLevel = 'high'
        alerts.push('HIGH_FLOOD_RISK')
      } else if (reading.water_level_ft > 5) {
        riskLevel = 'moderate'
        alerts.push('MODERATE_FLOOD_RISK')
      } else if (reading.water_level_ft > 2) {
        riskLevel = 'low'
        alerts.push('LOW_FLOOD_RISK')
      }
    }

    // Check discharge rates
    if (reading.discharge_cfs) {
      if (reading.discharge_cfs > 10000) {
        alerts.push('EXTREME_DISCHARGE_RATE')
      } else if (reading.discharge_cfs > 5000) {
        alerts.push('HIGH_DISCHARGE_RATE')
      }
    }

    return { risk_level: riskLevel, alerts }
  }
}

// Singleton instance
export const usgsIntegration = new USGSIntegration()
// Open-Meteo Weather API Integration for Precipitation Forecasts
export interface OpenMeteoForecast {
  latitude: number
  longitude: number
  hourly: {
    time: string[]
    precipitation: number[]
    precipitation_probability?: number[]
    rain?: number[]
    temperature_2m?: number[]
    soil_moisture_0_to_1cm?: number[]
    soil_moisture_1_to_3cm?: number[]
    river_discharge?: number[]
  }
  daily?: {
    time: string[]
    precipitation_sum: number[]
    precipitation_probability_max?: number[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
  }
}

export class OpenMeteoIntegration {
  private readonly baseUrl = 'https://api.open-meteo.com/v1'
  private readonly floodUrl = 'https://flood-api.open-meteo.com/v1'
  private readonly cache = new Map<string, { data: any; timestamp: number }>()
  private readonly cacheExpiry = 30 * 60 * 1000 // 30 minutes

  // Fetch weather forecast with precipitation focus
  async fetchPrecipitationForecast(
    lat: number,
    lng: number,
    days: number = 7
  ): Promise<OpenMeteoForecast | null> {
    const cacheKey = `meteo_${lat}_${lng}_${days}`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data
    }

    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lng.toString(),
        hourly: [
          'temperature_2m',
          'precipitation',
          'precipitation_probability',
          'rain',
          'soil_moisture_0_to_1cm',
          'soil_moisture_1_to_3cm'
        ].join(','),
        daily: [
          'precipitation_sum',
          'precipitation_probability_max',
          'temperature_2m_max',
          'temperature_2m_min'
        ].join(','),
        forecast_days: days.toString(),
        timezone: 'America/Chicago'
      })

      const response = await fetch(`${this.baseUrl}/forecast?${params}`)

      if (!response.ok) {
        throw new Error(`Open-Meteo API error: ${response.status}`)
      }

      const data = await response.json()

      // Cache the results
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })

      return data as OpenMeteoForecast
    } catch (error) {
      console.error('Failed to fetch Open-Meteo forecast:', error)
      return null
    }
  }

  // Fetch flood-specific data if available
  async fetchFloodForecast(
    lat: number,
    lng: number
  ): Promise<any | null> {
    const cacheKey = `flood_${lat}_${lng}`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data
    }

    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lng.toString(),
        daily: 'river_discharge',
        forecast_days: '7'
      })

      const response = await fetch(`${this.floodUrl}/forecast?${params}`)

      if (!response.ok) {
        // Flood API might not be available for all locations
        console.log('Flood API not available for this location')
        return null
      }

      const data = await response.json()

      // Cache the results
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })

      return data
    } catch (error) {
      console.error('Failed to fetch flood forecast:', error)
      return null
    }
  }

  // Analyze precipitation risk
  analyzePrecipitationRisk(forecast: OpenMeteoForecast): {
    risk_level: string
    total_precipitation_24h: number
    total_precipitation_72h: number
    max_hourly_precipitation: number
    peak_hours: string[]
    soil_saturation: number
  } {
    const hourly = forecast.hourly
    const now = new Date()

    // Calculate precipitation totals
    let total24h = 0
    let total72h = 0
    let maxHourly = 0
    const peakHours: string[] = []

    // Calculate soil saturation average
    let soilSaturation = 0
    let soilReadings = 0

    for (let i = 0; i < hourly.time.length; i++) {
      const time = new Date(hourly.time[i])
      const hoursFromNow = (time.getTime() - now.getTime()) / (1000 * 60 * 60)

      if (hoursFromNow >= 0 && hoursFromNow <= 72) {
        const precip = hourly.precipitation[i] || 0

        if (hoursFromNow <= 24) {
          total24h += precip
        }
        total72h += precip

        if (precip > maxHourly) {
          maxHourly = precip
        }

        // Track peak precipitation hours (> 5mm/hr)
        if (precip > 5) {
          peakHours.push(hourly.time[i])
        }

        // Average soil moisture
        if (hourly.soil_moisture_0_to_1cm?.[i]) {
          soilSaturation += hourly.soil_moisture_0_to_1cm[i]
          soilReadings++
        }
      }
    }

    soilSaturation = soilReadings > 0 ? soilSaturation / soilReadings : 0

    // Determine risk level based on precipitation and soil saturation
    let riskLevel = 'none'

    if (total24h > 100 || (total24h > 50 && soilSaturation > 0.8)) {
      riskLevel = 'extreme'
    } else if (total24h > 50 || (total24h > 25 && soilSaturation > 0.7)) {
      riskLevel = 'high'
    } else if (total24h > 25 || (total24h > 15 && soilSaturation > 0.6)) {
      riskLevel = 'moderate'
    } else if (total24h > 10) {
      riskLevel = 'low'
    }

    return {
      risk_level: riskLevel,
      total_precipitation_24h: Math.round(total24h * 10) / 10,
      total_precipitation_72h: Math.round(total72h * 10) / 10,
      max_hourly_precipitation: Math.round(maxHourly * 10) / 10,
      peak_hours: peakHours.slice(0, 5), // Top 5 peak hours
      soil_saturation: Math.round(soilSaturation * 100)
    }
  }

  // Get nowcast (short-term) precipitation
  async fetchNowcast(lat: number, lng: number): Promise<any> {
    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lng.toString(),
        hourly: 'precipitation',
        forecast_days: '1',
        past_days: '1'
      })

      const response = await fetch(`${this.baseUrl}/forecast?${params}`)

      if (!response.ok) {
        throw new Error(`Open-Meteo nowcast error: ${response.status}`)
      }

      const data = await response.json()

      // Extract next 6 hours of precipitation
      const now = new Date()
      const nowcast = {
        time: [] as string[],
        precipitation: [] as number[],
        total_next_6h: 0
      }

      for (let i = 0; i < data.hourly.time.length; i++) {
        const time = new Date(data.hourly.time[i])
        const hoursFromNow = (time.getTime() - now.getTime()) / (1000 * 60 * 60)

        if (hoursFromNow >= 0 && hoursFromNow <= 6) {
          nowcast.time.push(data.hourly.time[i])
          nowcast.precipitation.push(data.hourly.precipitation[i] || 0)
          nowcast.total_next_6h += data.hourly.precipitation[i] || 0
        }
      }

      return nowcast
    } catch (error) {
      console.error('Failed to fetch nowcast:', error)
      return null
    }
  }

  // Batch fetch for multiple locations
  async fetchMultipleLocations(
    locations: Array<{ lat: number; lng: number; name: string }>
  ): Promise<Map<string, OpenMeteoForecast>> {
    const results = new Map<string, OpenMeteoForecast>()

    // Use Promise.all for parallel fetching
    const promises = locations.map(async (loc) => {
      const forecast = await this.fetchPrecipitationForecast(loc.lat, loc.lng, 3)
      if (forecast) {
        results.set(loc.name, forecast)
      }
    })

    await Promise.all(promises)
    return results
  }
}

// Singleton instance
export const openMeteoIntegration = new OpenMeteoIntegration()
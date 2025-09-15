// NWS/NOAA Weather Alerts and Forecasts Integration
export interface NWSAlert {
  id: string
  areaDesc: string
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown'
  urgency: 'Immediate' | 'Expected' | 'Future' | 'Past' | 'Unknown'
  event: string
  headline: string
  description: string
  instruction: string
  effective: string
  expires: string
  coordinates?: { lat: number; lng: number }[]
}

export interface NWSForecast {
  name: string
  temperature: number
  temperatureUnit: string
  windSpeed: string
  windDirection: string
  icon: string
  shortForecast: string
  detailedForecast: string
  probabilityOfPrecipitation?: {
    unitCode: string
    value: number
  }
}

export class NWSIntegration {
  private readonly baseUrl = 'https://api.weather.gov'
  private readonly cache = new Map<string, { data: any; timestamp: number }>()
  private readonly cacheExpiry = 10 * 60 * 1000 // 10 minutes

  // Fetch alerts for Texas counties
  async fetchAlertsForCounty(county: string, state: string = 'TX'): Promise<NWSAlert[]> {
    const cacheKey = `alerts_${state}_${county}`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/alerts/active?area=${state}&urgency=Immediate,Expected,Future`
      )

      if (!response.ok) {
        throw new Error(`NWS API error: ${response.status}`)
      }

      const data = await response.json()
      const alerts = this.parseAlerts(data, county)

      // Cache the results
      this.cache.set(cacheKey, {
        data: alerts,
        timestamp: Date.now()
      })

      return alerts
    } catch (error) {
      console.error('Failed to fetch NWS alerts:', error)
      return []
    }
  }

  // Fetch forecast for coordinates
  async fetchForecast(lat: number, lng: number): Promise<NWSForecast[]> {
    const cacheKey = `forecast_${lat}_${lng}`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data
    }

    try {
      // First, get the forecast grid endpoint
      const pointResponse = await fetch(
        `${this.baseUrl}/points/${lat},${lng}`
      )

      if (!pointResponse.ok) {
        throw new Error(`NWS points API error: ${pointResponse.status}`)
      }

      const pointData = await pointResponse.json()
      const forecastUrl = pointData.properties?.forecast

      if (!forecastUrl) {
        throw new Error('No forecast URL found')
      }

      // Fetch the actual forecast
      const forecastResponse = await fetch(forecastUrl)

      if (!forecastResponse.ok) {
        throw new Error(`NWS forecast API error: ${forecastResponse.status}`)
      }

      const forecastData = await forecastResponse.json()
      const forecasts = this.parseForecast(forecastData)

      // Cache the results
      this.cache.set(cacheKey, {
        data: forecasts,
        timestamp: Date.now()
      })

      return forecasts
    } catch (error) {
      console.error('Failed to fetch NWS forecast:', error)
      return []
    }
  }

  // Fetch precipitation forecast
  async fetchPrecipitationForecast(lat: number, lng: number): Promise<any> {
    try {
      const pointResponse = await fetch(
        `${this.baseUrl}/points/${lat},${lng}`
      )

      if (!pointResponse.ok) {
        throw new Error(`NWS points API error: ${pointResponse.status}`)
      }

      const pointData = await pointResponse.json()
      const gridId = pointData.properties?.gridId
      const gridX = pointData.properties?.gridX
      const gridY = pointData.properties?.gridY

      if (!gridId || !gridX || !gridY) {
        throw new Error('Grid information not found')
      }

      // Fetch quantitative precipitation forecast
      const qpfResponse = await fetch(
        `${this.baseUrl}/gridpoints/${gridId}/${gridX},${gridY}`
      )

      if (!qpfResponse.ok) {
        throw new Error(`NWS gridpoints API error: ${qpfResponse.status}`)
      }

      const gridData = await qpfResponse.json()

      return {
        quantitativePrecipitation: gridData.properties?.quantitativePrecipitation,
        probabilityOfPrecipitation: gridData.properties?.probabilityOfPrecipitation,
        weather: gridData.properties?.weather
      }
    } catch (error) {
      console.error('Failed to fetch precipitation forecast:', error)
      return null
    }
  }

  // Parse NWS alerts
  private parseAlerts(data: any, county?: string): NWSAlert[] {
    const features = data.features || []

    return features
      .filter((feature: any) => {
        // Filter by county if provided
        if (county) {
          const areaDesc = feature.properties?.areaDesc?.toLowerCase() || ''
          return areaDesc.includes(county.toLowerCase())
        }
        return true
      })
      .map((feature: any) => {
        const props = feature.properties

        return {
          id: props.id,
          areaDesc: props.areaDesc,
          severity: props.severity || 'Unknown',
          urgency: props.urgency || 'Unknown',
          event: props.event,
          headline: props.headline,
          description: props.description,
          instruction: props.instruction || '',
          effective: props.effective,
          expires: props.expires,
          coordinates: feature.geometry?.coordinates?.[0]?.map((coord: number[]) => ({
            lat: coord[1],
            lng: coord[0]
          }))
        }
      })
      .filter((alert: NWSAlert) => {
        // Filter for flood-related alerts
        const floodKeywords = ['flood', 'flash', 'water', 'rain', 'storm']
        const eventLower = alert.event.toLowerCase()
        return floodKeywords.some(keyword => eventLower.includes(keyword))
      })
  }

  // Parse NWS forecast
  private parseForecast(data: any): NWSForecast[] {
    const periods = data.properties?.periods || []

    return periods.map((period: any) => ({
      name: period.name,
      temperature: period.temperature,
      temperatureUnit: period.temperatureUnit,
      windSpeed: period.windSpeed,
      windDirection: period.windDirection,
      icon: period.icon,
      shortForecast: period.shortForecast,
      detailedForecast: period.detailedForecast,
      probabilityOfPrecipitation: period.probabilityOfPrecipitation
    }))
  }

  // Analyze weather conditions for flood risk
  analyzeWeatherRisk(forecast: NWSForecast[]): {
    risk_level: string
    factors: string[]
  } {
    const factors: string[] = []
    let maxPrecipProb = 0

    for (const period of forecast.slice(0, 4)) { // Check next 48 hours
      if (period.probabilityOfPrecipitation?.value) {
        maxPrecipProb = Math.max(maxPrecipProb, period.probabilityOfPrecipitation.value)
      }

      const forecastLower = period.detailedForecast.toLowerCase()

      if (forecastLower.includes('heavy rain') || forecastLower.includes('thunderstorm')) {
        factors.push('Heavy rain expected')
      }

      if (forecastLower.includes('flood')) {
        factors.push('Flood conditions mentioned in forecast')
      }
    }

    let riskLevel = 'none'

    if (maxPrecipProb > 80) {
      riskLevel = 'high'
      factors.push(`High precipitation probability: ${maxPrecipProb}%`)
    } else if (maxPrecipProb > 60) {
      riskLevel = 'moderate'
      factors.push(`Moderate precipitation probability: ${maxPrecipProb}%`)
    } else if (maxPrecipProb > 40) {
      riskLevel = 'low'
    }

    return { risk_level: riskLevel, factors }
  }

  // Get all Texas flood alerts
  async fetchTexasFloodAlerts(): Promise<NWSAlert[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/alerts/active?area=TX&event=Flood,Flash%20Flood%20Warning,Flood%20Warning,Flood%20Watch`
      )

      if (!response.ok) {
        throw new Error(`NWS API error: ${response.status}`)
      }

      const data = await response.json()
      return this.parseAlerts(data)
    } catch (error) {
      console.error('Failed to fetch Texas flood alerts:', error)
      return []
    }
  }
}

// Singleton instance
export const nwsIntegration = new NWSIntegration()
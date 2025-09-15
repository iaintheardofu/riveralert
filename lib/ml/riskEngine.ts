// Enhanced Risk Engine with Early Detection and Alert Management
import { IoTReading } from '@/apps/api/src/sensors/iot'
import { USGSReading } from '@/apps/api/src/integrations/usgs'
import { NWSForecast } from '@/apps/api/src/integrations/nws'
import { OpenMeteoForecast } from '@/apps/api/src/integrations/open-meteo'

export interface RiskFactors {
  waterLevelTrend: number        // Rate of rise (ft/hr)
  forecastProbability: number    // Probability of overflow (0-1)
  rainfallNowcast: number        // Expected rainfall next 6h (inches)
  soilMoisture: number           // Soil saturation (0-1)
  historicalAccuracy: number     // Past prediction accuracy (0-1)
  urbanDensity: number           // Population density factor (0-1)
  infrastructureCriticality: number // Critical infrastructure factor (0-1)
}

export interface RiskAssessment {
  score: number                  // Combined risk score (0-100)
  level: 'none' | 'low' | 'moderate' | 'high' | 'extreme'
  confidence: number             // Confidence in assessment (0-1)
  factors: RiskFactors
  alerts: string[]
  recommendations: string[]
  timeToImpact: number | null   // Minutes until critical level
  evacuationRecommended: boolean
}

export class RiskEngine {
  private readonly historicalData: Map<string, any[]> = new Map()
  private readonly falsePositivePenalty = 0.15

  // Main risk assessment function
  assessRisk(
    currentReading: IoTReading | USGSReading,
    forecast: NWSForecast[] | OpenMeteoForecast | null,
    historicalReadings: any[],
    locationMetadata?: {
      population?: number
      criticalInfrastructure?: string[]
      lowWaterCrossings?: number
    }
  ): RiskAssessment {
    // Calculate individual risk factors
    const factors = this.calculateRiskFactors(
      currentReading,
      forecast,
      historicalReadings,
      locationMetadata
    )

    // Calculate combined risk score
    const score = this.calculateRiskScore(factors)

    // Determine risk level
    const level = this.determineRiskLevel(score)

    // Generate alerts based on conditions
    const alerts = this.generateAlerts(factors, level)

    // Generate recommendations
    const recommendations = this.generateRecommendations(level, factors)

    // Calculate time to impact
    const timeToImpact = this.calculateTimeToImpact(factors, historicalReadings)

    // Determine if evacuation is recommended
    const evacuationRecommended = this.shouldEvacuate(score, factors, timeToImpact)

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(factors, historicalReadings)

    return {
      score,
      level,
      confidence,
      factors,
      alerts,
      recommendations,
      timeToImpact,
      evacuationRecommended
    }
  }

  private calculateRiskFactors(
    currentReading: any,
    forecast: any,
    historicalReadings: any[],
    locationMetadata?: any
  ): RiskFactors {
    // Calculate water level trend (rate of rise)
    const waterLevelTrend = this.calculateTrend(
      historicalReadings,
      'water_level_ft'
    )

    // Calculate forecast probability of overflow
    const forecastProbability = this.calculateOverflowProbability(
      currentReading,
      forecast,
      waterLevelTrend
    )

    // Extract rainfall nowcast
    const rainfallNowcast = this.extractRainfallNowcast(forecast)

    // Get soil moisture
    const soilMoisture = currentReading.soil_moisture_pct
      ? currentReading.soil_moisture_pct / 100
      : this.estimateSoilMoisture(historicalReadings)

    // Calculate historical accuracy
    const historicalAccuracy = this.calculateHistoricalAccuracy(
      currentReading.sensor_id || currentReading.site_no
    )

    // Calculate location-based factors
    const urbanDensity = this.calculateUrbanDensity(locationMetadata)
    const infrastructureCriticality = this.calculateInfrastructureCriticality(
      locationMetadata
    )

    return {
      waterLevelTrend,
      forecastProbability,
      rainfallNowcast,
      soilMoisture,
      historicalAccuracy,
      urbanDensity,
      infrastructureCriticality
    }
  }

  private calculateRiskScore(factors: RiskFactors): number {
    // Weighted combination of risk factors
    const weights = {
      waterLevelTrend: 0.25,
      forecastProbability: 0.20,
      rainfallNowcast: 0.15,
      soilMoisture: 0.10,
      historicalAccuracy: -0.05, // Negative weight for false positive penalty
      urbanDensity: 0.15,
      infrastructureCriticality: 0.20
    }

    let score = 0

    // Water level trend contribution (normalized to 0-100)
    score += weights.waterLevelTrend * Math.min(100, Math.abs(factors.waterLevelTrend) * 20)

    // Forecast probability contribution
    score += weights.forecastProbability * factors.forecastProbability * 100

    // Rainfall nowcast contribution (capped at 100mm = 4 inches)
    score += weights.rainfallNowcast * Math.min(100, (factors.rainfallNowcast / 4) * 100)

    // Soil moisture contribution
    score += weights.soilMoisture * factors.soilMoisture * 100

    // Historical accuracy (penalty for false positives)
    score += weights.historicalAccuracy * (1 - factors.historicalAccuracy) * 100

    // Urban density contribution
    score += weights.urbanDensity * factors.urbanDensity * 100

    // Infrastructure criticality contribution
    score += weights.infrastructureCriticality * factors.infrastructureCriticality * 100

    return Math.min(100, Math.max(0, score))
  }

  private determineRiskLevel(score: number): RiskAssessment['level'] {
    if (score >= 80) return 'extreme'
    if (score >= 60) return 'high'
    if (score >= 40) return 'moderate'
    if (score >= 20) return 'low'
    return 'none'
  }

  private calculateTrend(readings: any[], field: string): number {
    if (readings.length < 2) return 0

    // Get last 6 hours of readings
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000
    const recentReadings = readings.filter(r =>
      new Date(r.timestamp || r.datetime).getTime() > sixHoursAgo
    )

    if (recentReadings.length < 2) return 0

    // Calculate rate of change (ft/hr)
    const firstReading = recentReadings[0][field] || 0
    const lastReading = recentReadings[recentReadings.length - 1][field] || 0
    const timeDiff = (
      new Date(recentReadings[recentReadings.length - 1].timestamp || recentReadings[recentReadings.length - 1].datetime).getTime() -
      new Date(recentReadings[0].timestamp || recentReadings[0].datetime).getTime()
    ) / (1000 * 60 * 60) // Convert to hours

    return timeDiff > 0 ? (lastReading - firstReading) / timeDiff : 0
  }

  private calculateOverflowProbability(
    currentReading: any,
    forecast: any,
    trend: number
  ): number {
    const currentLevel = currentReading.water_level_ft || 0
    const criticalLevel = 15 // feet - adjust based on location

    if (currentLevel >= criticalLevel) return 1.0

    // Project level based on trend
    const hoursToProject = 6
    const projectedLevel = currentLevel + (trend * hoursToProject)

    // Basic sigmoid function for probability
    const x = (projectedLevel - criticalLevel) / 5
    const probability = 1 / (1 + Math.exp(-x))

    return probability
  }

  private extractRainfallNowcast(forecast: any): number {
    if (!forecast) return 0

    // Handle Open-Meteo format
    if (forecast.hourly?.precipitation) {
      let total = 0
      const hourly = forecast.hourly
      const now = Date.now()

      for (let i = 0; i < Math.min(6, hourly.time.length); i++) {
        const time = new Date(hourly.time[i]).getTime()
        if (time > now) {
          total += hourly.precipitation[i] || 0
        }
      }

      return total * 0.0393701 // mm to inches
    }

    // Handle NWS format
    if (Array.isArray(forecast)) {
      let maxPrecip = 0
      for (const period of forecast.slice(0, 2)) {
        if (period.probabilityOfPrecipitation?.value) {
          maxPrecip = Math.max(maxPrecip, period.probabilityOfPrecipitation.value / 100)
        }
      }
      return maxPrecip * 2 // Rough estimate
    }

    return 0
  }

  private estimateSoilMoisture(historicalReadings: any[]): number {
    // Estimate based on recent rainfall
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    const recentRainfall = historicalReadings
      .filter(r => new Date(r.timestamp || r.datetime).getTime() > dayAgo)
      .reduce((sum, r) => sum + (r.rainfall_in || 0), 0)

    // Simple model: 1 inch of rain = 0.2 soil moisture increase
    return Math.min(1, recentRainfall * 0.2)
  }

  private calculateHistoricalAccuracy(sensorId: string): number {
    const history = this.historicalData.get(sensorId) || []

    if (history.length === 0) return 0.5 // Default neutral accuracy

    const correctPredictions = history.filter(h => h.correct).length
    return correctPredictions / history.length
  }

  private calculateUrbanDensity(metadata?: any): number {
    if (!metadata?.population) return 0.5

    // Normalize population to 0-1 scale
    const maxPopulation = 5000000 // Adjust based on region
    return Math.min(1, metadata.population / maxPopulation)
  }

  private calculateInfrastructureCriticality(metadata?: any): number {
    if (!metadata?.criticalInfrastructure) return 0.3

    const criticalTypes = ['hospital', 'school', 'emergency', 'power', 'water']
    const criticalCount = metadata.criticalInfrastructure.filter((infra: string) =>
      criticalTypes.some(type => infra.toLowerCase().includes(type))
    ).length

    return Math.min(1, criticalCount * 0.2)
  }

  private generateAlerts(factors: RiskFactors, level: string): string[] {
    const alerts: string[] = []

    if (factors.waterLevelTrend > 2) {
      alerts.push('RAPID_WATER_RISE')
    }

    if (factors.forecastProbability > 0.7) {
      alerts.push('HIGH_OVERFLOW_PROBABILITY')
    }

    if (factors.rainfallNowcast > 2) {
      alerts.push('HEAVY_RAIN_EXPECTED')
    }

    if (factors.soilMoisture > 0.8) {
      alerts.push('SATURATED_SOIL_CONDITIONS')
    }

    if (level === 'extreme') {
      alerts.push('IMMEDIATE_EVACUATION_RECOMMENDED')
    } else if (level === 'high') {
      alerts.push('PREPARE_FOR_EVACUATION')
    }

    if (factors.infrastructureCriticality > 0.7) {
      alerts.push('CRITICAL_INFRASTRUCTURE_AT_RISK')
    }

    return alerts
  }

  private generateRecommendations(level: string, factors: RiskFactors): string[] {
    const recommendations: string[] = []

    switch (level) {
      case 'extreme':
        recommendations.push('Evacuate immediately to higher ground')
        recommendations.push('Avoid all low-water crossings')
        recommendations.push('Follow emergency evacuation routes')
        break
      case 'high':
        recommendations.push('Prepare for potential evacuation')
        recommendations.push('Move valuables to higher floors')
        recommendations.push('Monitor emergency broadcasts')
        recommendations.push('Avoid unnecessary travel')
        break
      case 'moderate':
        recommendations.push('Stay alert for changing conditions')
        recommendations.push('Prepare emergency supplies')
        recommendations.push('Plan evacuation routes')
        break
      case 'low':
        recommendations.push('Monitor weather forecasts')
        recommendations.push('Check emergency supplies')
        break
    }

    if (factors.infrastructureCriticality > 0.5) {
      recommendations.push('Critical facilities should activate emergency protocols')
    }

    return recommendations
  }

  private calculateTimeToImpact(factors: RiskFactors, historicalReadings: any[]): number | null {
    if (factors.waterLevelTrend <= 0) return null

    const currentLevel = historicalReadings[historicalReadings.length - 1]?.water_level_ft || 0
    const criticalLevel = 15 // feet

    if (currentLevel >= criticalLevel) return 0

    const hoursToImpact = (criticalLevel - currentLevel) / factors.waterLevelTrend
    return hoursToImpact * 60 // Convert to minutes
  }

  private shouldEvacuate(score: number, factors: RiskFactors, timeToImpact: number | null): boolean {
    // Immediate evacuation if score is extreme
    if (score >= 80) return true

    // Evacuate if high risk and impact within 2 hours
    if (score >= 60 && timeToImpact !== null && timeToImpact < 120) return true

    // Evacuate if rapid rise and high infrastructure criticality
    if (factors.waterLevelTrend > 3 && factors.infrastructureCriticality > 0.7) return true

    return false
  }

  private calculateConfidence(factors: RiskFactors, historicalReadings: any[]): number {
    let confidence = 0.5 // Base confidence

    // More data points increase confidence
    if (historicalReadings.length > 10) confidence += 0.1
    if (historicalReadings.length > 50) confidence += 0.1

    // Historical accuracy affects confidence
    confidence += factors.historicalAccuracy * 0.2

    // Recent data increases confidence
    const lastReading = historicalReadings[historicalReadings.length - 1]
    if (lastReading) {
      const age = Date.now() - new Date(lastReading.timestamp || lastReading.datetime).getTime()
      if (age < 30 * 60 * 1000) confidence += 0.1 // Less than 30 minutes old
    }

    return Math.min(1, Math.max(0, confidence))
  }

  // Anomaly detection using z-score
  detectAnomalies(readings: number[], threshold: number = 3): {
    anomalies: number[]
    indices: number[]
  } {
    if (readings.length < 3) return { anomalies: [], indices: [] }

    // Calculate mean and standard deviation
    const mean = readings.reduce((a, b) => a + b, 0) / readings.length
    const variance = readings.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / readings.length
    const stdDev = Math.sqrt(variance)

    const anomalies: number[] = []
    const indices: number[] = []

    readings.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / stdDev)
      if (zScore > threshold) {
        anomalies.push(value)
        indices.push(index)
      }
    })

    return { anomalies, indices }
  }

  // Update historical accuracy based on outcomes
  updateHistoricalAccuracy(
    sensorId: string,
    prediction: { level: string; timestamp: string },
    actualOutcome: { level: string; timestamp: string }
  ) {
    const history = this.historicalData.get(sensorId) || []

    history.push({
      prediction,
      actual: actualOutcome,
      correct: prediction.level === actualOutcome.level,
      timestamp: new Date().toISOString()
    })

    // Keep only last 100 predictions
    if (history.length > 100) {
      history.shift()
    }

    this.historicalData.set(sensorId, history)
  }
}

// Singleton instance
export const riskEngine = new RiskEngine()
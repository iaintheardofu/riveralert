/**
 * Flood Analyzer - Integrates all ML models for comprehensive flood analysis
 * Combines linear prediction, neural networks, and MDPs for intelligent decision making
 */

import { LinearPredictor, NeuralNetwork, FloodMDP, DataPoint } from './predictor';

export interface SensorReading {
  sensor_id: string;
  water_level: number;
  flow_rate?: number;
  temperature?: number;
  timestamp: string;
}

export interface FloodPrediction {
  predictedLevel: number;
  confidence: number;
  timeHorizon: number;  // hours
  riskLevel: 'low' | 'moderate' | 'high' | 'extreme';
  recommendedAction: string;
  reasoning: string[];
}

export interface HistoricalData {
  readings: SensorReading[];
  alerts: any[];
  weatherData?: any[];
}

export class FloodAnalyzer {
  private linearPredictor: LinearPredictor;
  private neuralNetwork: NeuralNetwork;
  private mdp: FloodMDP;
  private isTraining: boolean = false;

  constructor() {
    // Initialize models
    this.linearPredictor = new LinearPredictor(5, 0.01, 1000);
    this.neuralNetwork = new NeuralNetwork([5, 10, 5, 1], 0.01);
    this.mdp = new FloodMDP(0.9);

    // Run initial MDP value iteration
    this.mdp.valueIteration(100);
  }

  /**
   * Train all models with historical data
   */
  async trainModels(historicalData: HistoricalData): Promise<void> {
    this.isTraining = true;

    try {
      // Prepare training data for linear predictor
      const linearData = this.prepareLinearData(historicalData.readings);
      if (linearData.length > 0) {
        this.linearPredictor.train(linearData);
      }

      // Prepare training data for neural network
      const nnData = this.prepareNeuralNetworkData(historicalData);
      if (nnData.length > 0) {
        this.neuralNetwork.train(nnData, 100);
      }

      // MDP learns continuously through updates
      console.log('Models trained successfully');
    } catch (error) {
      console.error('Error training models:', error);
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Prepare data for linear predictor training
   */
  private prepareLinearData(readings: SensorReading[]): DataPoint[] {
    const dataPoints: DataPoint[] = [];
    const windowSize = 6;  // Use 6 readings to predict next

    for (let i = windowSize; i < readings.length; i++) {
      const window = readings.slice(i - windowSize, i);
      const features = LinearPredictor.extractFeatures(window);
      const label = readings[i].water_level;

      dataPoints.push({ features, label });
    }

    return dataPoints;
  }

  /**
   * Prepare data for neural network training
   */
  private prepareNeuralNetworkData(historicalData: HistoricalData): { features: number[], label: number }[] {
    const data: { features: number[], label: number }[] = [];

    // Group readings by time windows
    const timeWindows = this.createTimeWindows(historicalData.readings, 12);  // 12-hour windows

    for (const window of timeWindows) {
      if (window.length === 0) continue;

      const features = LinearPredictor.extractFeatures(window);

      // Determine label based on whether an alert was triggered
      const windowEnd = new Date(window[window.length - 1].timestamp);
      const windowStart = new Date(window[0].timestamp);

      const alertInWindow = historicalData.alerts.some(alert => {
        const alertTime = new Date(alert.created_at);
        return alertTime >= windowStart && alertTime <= windowEnd;
      });

      const maxLevel = Math.max(...window.map(r => r.water_level));
      let label = 0;  // 0 to 1 scale
      if (maxLevel < 2) label = 0;
      else if (maxLevel < 4) label = 0.25;
      else if (maxLevel < 6) label = 0.5;
      else if (maxLevel < 8) label = 0.75;
      else label = 1;

      data.push({ features, label });
    }

    return data;
  }

  /**
   * Create time windows from readings
   */
  private createTimeWindows(readings: SensorReading[], windowHours: number): SensorReading[][] {
    const windows: SensorReading[][] = [];
    const windowMs = windowHours * 60 * 60 * 1000;

    if (readings.length === 0) return windows;

    let currentWindow: SensorReading[] = [];
    let windowStart = new Date(readings[0].timestamp).getTime();

    for (const reading of readings) {
      const readingTime = new Date(reading.timestamp).getTime();

      if (readingTime - windowStart <= windowMs) {
        currentWindow.push(reading);
      } else {
        if (currentWindow.length > 0) {
          windows.push(currentWindow);
        }
        currentWindow = [reading];
        windowStart = readingTime;
      }
    }

    if (currentWindow.length > 0) {
      windows.push(currentWindow);
    }

    return windows;
  }

  /**
   * Analyze current conditions and make predictions
   */
  async analyzeConditions(
    currentReadings: SensorReading[],
    weatherData?: any
  ): Promise<FloodPrediction> {
    const reasoning: string[] = [];

    // Extract features from current readings
    const features = LinearPredictor.extractFeatures(currentReadings);

    // Linear prediction for water level
    const predictedLevel = this.linearPredictor.predict(features);
    reasoning.push(`Linear model predicts water level: ${predictedLevel.toFixed(2)}m`);

    // Neural network for risk classification
    const riskAssessment = this.neuralNetwork.classifyFloodRisk(features);
    reasoning.push(`Neural network risk assessment: ${riskAssessment.risk} (confidence: ${(riskAssessment.confidence * 100).toFixed(1)}%)`);

    // Calculate rate of change
    const changeRate = this.calculateChangeRate(currentReadings);
    reasoning.push(`Water level change rate: ${changeRate.toFixed(3)}m/hour`);

    // MDP for optimal action
    const currentLevel = currentReadings.length > 0
      ? currentReadings[currentReadings.length - 1].water_level
      : 0;
    const optimalAction = this.mdp.getOptimalAction(currentLevel, changeRate);
    reasoning.push(`MDP recommends action: ${optimalAction}`);

    // Combine predictions
    const combinedRisk = this.combineRiskAssessments(
      riskAssessment.risk,
      predictedLevel,
      changeRate,
      optimalAction
    );

    // Weather adjustment
    if (weatherData) {
      const weatherAdjustment = this.adjustForWeather(weatherData, combinedRisk);
      if (weatherAdjustment.adjusted) {
        reasoning.push(`Weather adjustment applied: ${weatherAdjustment.reason}`);
      }
    }

    return {
      predictedLevel,
      confidence: riskAssessment.confidence,
      timeHorizon: 6,  // 6-hour prediction
      riskLevel: combinedRisk.risk,
      recommendedAction: this.getActionDescription(optimalAction),
      reasoning
    };
  }

  /**
   * Calculate rate of change in water levels
   */
  private calculateChangeRate(readings: SensorReading[]): number {
    if (readings.length < 2) return 0;

    const recent = readings.slice(-5);  // Last 5 readings
    if (recent.length < 2) return 0;

    const firstLevel = recent[0].water_level;
    const lastLevel = recent[recent.length - 1].water_level;
    const firstTime = new Date(recent[0].timestamp).getTime();
    const lastTime = new Date(recent[recent.length - 1].timestamp).getTime();

    const hoursDiff = (lastTime - firstTime) / (1000 * 60 * 60);
    if (hoursDiff === 0) return 0;

    return (lastLevel - firstLevel) / hoursDiff;
  }

  /**
   * Combine risk assessments from different models
   */
  private combineRiskAssessments(
    nnRisk: 'low' | 'moderate' | 'high' | 'extreme',
    predictedLevel: number,
    changeRate: number,
    mdpAction: string
  ): { risk: 'low' | 'moderate' | 'high' | 'extreme', confidence: number } {
    // Weight different factors
    let riskScore = 0;

    // Neural network contribution (40%)
    const nnScore = { low: 0, moderate: 0.33, high: 0.66, extreme: 1 }[nnRisk];
    riskScore += nnScore * 0.4;

    // Predicted level contribution (30%)
    const levelScore = Math.min(predictedLevel / 10, 1);
    riskScore += levelScore * 0.3;

    // Change rate contribution (20%)
    const rateScore = Math.min(Math.abs(changeRate) / 2, 1);
    riskScore += rateScore * 0.2;

    // MDP action contribution (10%)
    const actionScore = {
      no_alert: 0,
      low_alert: 0.2,
      moderate_alert: 0.4,
      high_alert: 0.6,
      extreme_alert: 0.8,
      evacuate: 1
    }[mdpAction] || 0.5;
    riskScore += actionScore * 0.1;

    // Convert score to risk level
    let risk: 'low' | 'moderate' | 'high' | 'extreme';
    if (riskScore < 0.25) risk = 'low';
    else if (riskScore < 0.5) risk = 'moderate';
    else if (riskScore < 0.75) risk = 'high';
    else risk = 'extreme';

    return { risk, confidence: Math.min(0.95, 0.5 + riskScore * 0.5) };
  }

  /**
   * Adjust predictions based on weather data
   */
  private adjustForWeather(
    weatherData: any,
    currentAssessment: { risk: 'low' | 'moderate' | 'high' | 'extreme', confidence: number }
  ): { adjusted: boolean, reason: string } {
    // Check for heavy rainfall predictions
    if (weatherData.precipitation_probability > 80 && weatherData.precipitation_amount > 50) {
      // Increase risk level if heavy rain is expected
      const riskLevels = ['low', 'moderate', 'high', 'extreme'];
      const currentIndex = riskLevels.indexOf(currentAssessment.risk);
      if (currentIndex < 3) {
        currentAssessment.risk = riskLevels[currentIndex + 1] as any;
        return { adjusted: true, reason: 'Heavy rainfall expected' };
      }
    }

    return { adjusted: false, reason: '' };
  }

  /**
   * Convert MDP action to human-readable description
   */
  private getActionDescription(action: string): string {
    const descriptions: Record<string, string> = {
      no_alert: 'Continue monitoring',
      low_alert: 'Issue low-level advisory',
      moderate_alert: 'Issue moderate flood warning',
      high_alert: 'Issue high flood warning - prepare for flooding',
      extreme_alert: 'Issue extreme flood warning - immediate action required',
      evacuate: 'Issue evacuation order - life-threatening conditions'
    };

    return descriptions[action] || 'Monitor conditions closely';
  }

  /**
   * Update models with new observation
   */
  async updateWithObservation(
    prevState: { level: number, rate: number },
    action: string,
    newState: { level: number, rate: number },
    outcome: 'success' | 'false_positive' | 'false_negative'
  ): Promise<void> {
    // Calculate reward based on outcome
    let reward = 0;
    switch (outcome) {
      case 'success':
        reward = 10;
        break;
      case 'false_positive':
        reward = -5;
        break;
      case 'false_negative':
        reward = -20;
        break;
    }

    // Convert to MDP states
    const prevMdpState = this.toMdpState(prevState.level, prevState.rate);
    const newMdpState = this.toMdpState(newState.level, newState.rate);

    // Update MDP model
    this.mdp.updateModel(prevMdpState, action, newMdpState, reward);
  }

  /**
   * Convert continuous values to MDP state
   */
  private toMdpState(level: number, rate: number): string {
    let levelState: string;
    if (level < 2) levelState = 'normal';
    else if (level < 4) levelState = 'elevated';
    else if (level < 6) levelState = 'high';
    else levelState = 'critical';

    let rateState: string;
    if (rate < 0.1) rateState = 'stable';
    else if (rate < 0.5) rateState = 'rising';
    else rateState = 'rapidly_rising';

    return `${levelState}_${rateState}`;
  }

  /**
   * Get model performance metrics
   */
  getModelMetrics(): {
    linearLoss: number;
    neuralAccuracy: number;
    mdpConvergence: boolean;
  } {
    // These would be calculated during training
    return {
      linearLoss: 0.15,  // Example MSE loss
      neuralAccuracy: 0.92,  // Example accuracy
      mdpConvergence: true  // Whether value iteration has converged
    };
  }
}
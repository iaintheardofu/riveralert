/**
 * Linear Predictor for Water Level Forecasting
 * Based on CS221 linear regression and gradient descent algorithms
 */

export interface DataPoint {
  features: number[];
  label: number;
}

export class LinearPredictor {
  private weights: number[];
  private bias: number;
  private learningRate: number;
  private iterations: number;

  constructor(featureSize: number, learningRate = 0.01, iterations = 1000) {
    this.weights = new Array(featureSize).fill(0).map(() => Math.random() * 0.01);
    this.bias = 0;
    this.learningRate = learningRate;
    this.iterations = iterations;
  }

  /**
   * Compute score: f_w(x) = w · φ(x)
   */
  predict(features: number[]): number {
    let score = this.bias;
    for (let i = 0; i < features.length; i++) {
      score += this.weights[i] * features[i];
    }
    return score;
  }

  /**
   * Compute squared loss: Loss(x, y, w) = (f_w(x) - y)²
   */
  computeLoss(data: DataPoint[]): number {
    let totalLoss = 0;
    for (const point of data) {
      const prediction = this.predict(point.features);
      const loss = Math.pow(prediction - point.label, 2);
      totalLoss += loss;
    }
    return totalLoss / data.length;
  }

  /**
   * Stochastic Gradient Descent (SGD)
   * w := w - η∇_w Loss(x, y, w)
   */
  train(data: DataPoint[]): void {
    for (let iter = 0; iter < this.iterations; iter++) {
      // Shuffle data for SGD
      const shuffled = [...data].sort(() => Math.random() - 0.5);

      for (const point of shuffled) {
        const prediction = this.predict(point.features);
        const error = prediction - point.label;

        // Update weights using gradient
        for (let i = 0; i < this.weights.length; i++) {
          const gradient = 2 * error * point.features[i];
          this.weights[i] -= this.learningRate * gradient;
        }

        // Update bias
        this.bias -= this.learningRate * 2 * error;
      }

      // Decay learning rate
      if (iter % 100 === 0) {
        this.learningRate *= 0.95;
      }
    }
  }

  /**
   * Extract features from sensor readings
   */
  static extractFeatures(readings: any[]): number[] {
    if (readings.length === 0) return [0, 0, 0, 0, 0];

    const waterLevels = readings.map(r => r.water_level);
    const flowRates = readings.map(r => r.flow_rate || 0);

    return [
      waterLevels[waterLevels.length - 1] || 0,  // Current level
      waterLevels.length > 1 ? waterLevels[waterLevels.length - 2] : 0,  // Previous level
      Math.max(...waterLevels),  // Max level in window
      waterLevels.reduce((a, b) => a + b, 0) / waterLevels.length,  // Average level
      flowRates.reduce((a, b) => a + b, 0) / flowRates.length,  // Average flow rate
    ];
  }
}

/**
 * Neural Network for Flood Pattern Recognition
 * Implements forward propagation and backpropagation
 */
export class NeuralNetwork {
  private layers: number[][];
  private biases: number[][];
  private learningRate: number;

  constructor(architecture: number[], learningRate = 0.01) {
    this.learningRate = learningRate;
    this.layers = [];
    this.biases = [];

    // Initialize weights and biases
    for (let i = 1; i < architecture.length; i++) {
      const layerWeights = [];
      const layerBiases = [];

      for (let j = 0; j < architecture[i]; j++) {
        const neuronWeights = [];
        for (let k = 0; k < architecture[i - 1]; k++) {
          // Xavier initialization
          neuronWeights.push((Math.random() - 0.5) * Math.sqrt(2 / architecture[i - 1]));
        }
        layerWeights.push(neuronWeights);
        layerBiases.push(0);
      }

      this.layers.push(layerWeights);
      this.biases.push(layerBiases);
    }
  }

  /**
   * ReLU activation function
   */
  private relu(x: number): number {
    return Math.max(0, x);
  }

  /**
   * Sigmoid activation for output layer
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Forward propagation
   */
  forward(input: number[]): number[] {
    let activations = [...input];

    for (let l = 0; l < this.layers.length; l++) {
      const newActivations = [];

      for (let n = 0; n < this.layers[l].length; n++) {
        let sum = this.biases[l][n];
        for (let i = 0; i < activations.length; i++) {
          sum += this.layers[l][n][i] * activations[i];
        }

        // Use ReLU for hidden layers, sigmoid for output
        const activation = l < this.layers.length - 1 ? this.relu(sum) : this.sigmoid(sum);
        newActivations.push(activation);
      }

      activations = newActivations;
    }

    return activations;
  }

  /**
   * Classify flood risk level
   */
  classifyFloodRisk(features: number[]): {
    risk: 'low' | 'moderate' | 'high' | 'extreme';
    confidence: number;
  } {
    const output = this.forward(features);
    const riskScore = output[0];

    let risk: 'low' | 'moderate' | 'high' | 'extreme';
    if (riskScore < 0.25) risk = 'low';
    else if (riskScore < 0.5) risk = 'moderate';
    else if (riskScore < 0.75) risk = 'high';
    else risk = 'extreme';

    return { risk, confidence: Math.abs(riskScore - 0.5) * 2 };
  }

  /**
   * Train the network using backpropagation
   */
  train(data: { features: number[], label: number }[], epochs: number): void {
    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const sample of data) {
        // Forward pass
        const layerOutputs: number[][] = [sample.features];
        let activations = [...sample.features];

        for (let l = 0; l < this.layers.length; l++) {
          const newActivations = [];
          for (let n = 0; n < this.layers[l].length; n++) {
            let sum = this.biases[l][n];
            for (let i = 0; i < activations.length; i++) {
              sum += this.layers[l][n][i] * activations[i];
            }
            const activation = l < this.layers.length - 1 ? this.relu(sum) : this.sigmoid(sum);
            newActivations.push(activation);
          }
          activations = newActivations;
          layerOutputs.push(activations);
        }

        // Backward pass (simplified)
        const error = layerOutputs[layerOutputs.length - 1][0] - sample.label;

        // Update output layer
        const lastLayer = this.layers.length - 1;
        for (let i = 0; i < this.layers[lastLayer][0].length; i++) {
          this.layers[lastLayer][0][i] -= this.learningRate * error * layerOutputs[lastLayer][i];
        }
        this.biases[lastLayer][0] -= this.learningRate * error;
      }
    }
  }
}

/**
 * Markov Decision Process for Optimal Alert Generation
 * Handles decision-making under uncertainty
 */
export class FloodMDP {
  private states: Map<string, number>;
  private actions: string[];
  private transitions: Map<string, Map<string, number>>;
  private rewards: Map<string, number>;
  private values: Map<string, number>;
  private policy: Map<string, string>;
  private gamma: number;

  constructor(gamma = 0.9) {
    this.gamma = gamma;
    this.states = new Map();
    this.actions = ['no_alert', 'low_alert', 'moderate_alert', 'high_alert', 'extreme_alert', 'evacuate'];
    this.transitions = new Map();
    this.rewards = new Map();
    this.values = new Map();
    this.policy = new Map();

    this.initializeStates();
    this.initializeTransitions();
    this.initializeRewards();
  }

  private initializeStates(): void {
    // Define states based on water level and rate of change
    const waterLevels = ['normal', 'elevated', 'high', 'critical'];
    const changeRates = ['stable', 'rising', 'rapidly_rising'];

    for (const level of waterLevels) {
      for (const rate of changeRates) {
        const state = `${level}_${rate}`;
        this.states.set(state, 0);
        this.values.set(state, 0);
      }
    }
  }

  private initializeTransitions(): void {
    // Define transition probabilities
    this.transitions.set('normal_stable', new Map([
      ['normal_stable', 0.8],
      ['normal_rising', 0.15],
      ['elevated_stable', 0.05],
    ]));

    this.transitions.set('elevated_rising', new Map([
      ['elevated_stable', 0.1],
      ['elevated_rising', 0.3],
      ['high_rising', 0.4],
      ['high_rapidly_rising', 0.2],
    ]));

    // Add more transitions as needed
  }

  private initializeRewards(): void {
    // Define rewards for state-action pairs
    // Negative rewards for false alarms, positive for correct warnings
    this.rewards.set('normal_stable_no_alert', 1);
    this.rewards.set('normal_stable_extreme_alert', -10);  // False alarm
    this.rewards.set('critical_rapidly_rising_evacuate', 100);  // Life-saving
    this.rewards.set('critical_rapidly_rising_no_alert', -1000);  // Catastrophic

    // Add more rewards as needed
  }

  /**
   * Value Iteration to find optimal policy
   */
  valueIteration(iterations = 100): void {
    for (let iter = 0; iter < iterations; iter++) {
      const newValues = new Map<string, number>();

      for (const [state] of this.states) {
        let maxValue = -Infinity;
        let bestAction = this.actions[0];

        for (const action of this.actions) {
          let value = this.getReward(state, action);

          const nextStates = this.transitions.get(state);
          if (nextStates) {
            for (const [nextState, prob] of nextStates) {
              value += this.gamma * prob * (this.values.get(nextState) || 0);
            }
          }

          if (value > maxValue) {
            maxValue = value;
            bestAction = action;
          }
        }

        newValues.set(state, maxValue);
        this.policy.set(state, bestAction);
      }

      this.values = newValues;
    }
  }

  private getReward(state: string, action: string): number {
    const key = `${state}_${action}`;
    return this.rewards.get(key) || -1;
  }

  /**
   * Get optimal action for current state
   */
  getOptimalAction(waterLevel: number, changeRate: number): string {
    // Map continuous values to discrete states
    let levelState: string;
    if (waterLevel < 2) levelState = 'normal';
    else if (waterLevel < 4) levelState = 'elevated';
    else if (waterLevel < 6) levelState = 'high';
    else levelState = 'critical';

    let rateState: string;
    if (changeRate < 0.1) rateState = 'stable';
    else if (changeRate < 0.5) rateState = 'rising';
    else rateState = 'rapidly_rising';

    const state = `${levelState}_${rateState}`;
    return this.policy.get(state) || 'moderate_alert';
  }

  /**
   * Update model with observed transitions
   */
  updateModel(prevState: string, action: string, nextState: string, reward: number): void {
    // Update transition probabilities using observed data
    if (!this.transitions.has(prevState)) {
      this.transitions.set(prevState, new Map());
    }

    const stateTransitions = this.transitions.get(prevState)!;
    const currentProb = stateTransitions.get(nextState) || 0;
    stateTransitions.set(nextState, currentProb + 0.01);  // Simple update

    // Update rewards
    const key = `${prevState}_${action}`;
    const currentReward = this.rewards.get(key) || 0;
    this.rewards.set(key, 0.9 * currentReward + 0.1 * reward);  // Exponential moving average

    // Re-run value iteration periodically
    this.valueIteration(10);
  }
}
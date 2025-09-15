// MDP (Markov Decision Process) Alert Policy Solver
// Optimizes alert decisions to minimize false positives while ensuring safety

export type AlertLevel = 'none' | 'watch' | 'warning' | 'evacuate'
export type WaterState = 'normal' | 'rising' | 'high' | 'critical'

export interface MDPState {
  waterLevel: number
  rateOfChange: number
  precipitation: number
  timeOfDay: 'day' | 'night'
  previousAlert: AlertLevel
}

export interface MDPAction {
  alert: AlertLevel
  confidence: number
}

export interface MDPReward {
  correctAlert: number
  falsePositive: number
  falseNegative: number
  timingBonus: number
}

export class MDPAlertPolicy {
  private readonly states: Map<string, MDPState> = new Map()
  private readonly qTable: Map<string, Map<AlertLevel, number>> = new Map()
  private readonly learningRate = 0.1
  private readonly discountFactor = 0.95
  private readonly explorationRate = 0.1

  // Reward structure
  private readonly rewards: MDPReward = {
    correctAlert: 10,
    falsePositive: -5,
    falseNegative: -20,
    timingBonus: 5
  }

  // State transition probabilities
  private readonly transitionProbs = {
    normal: { normal: 0.7, rising: 0.25, high: 0.04, critical: 0.01 },
    rising: { normal: 0.1, rising: 0.5, high: 0.35, critical: 0.05 },
    high: { normal: 0.05, rising: 0.15, high: 0.5, critical: 0.3 },
    critical: { normal: 0.01, rising: 0.04, high: 0.25, critical: 0.7 }
  }

  // Get optimal alert action for current state
  getOptimalAction(state: MDPState): MDPAction {
    const stateKey = this.encodeState(state)

    // Initialize Q-values for new state
    if (!this.qTable.has(stateKey)) {
      this.initializeQValues(stateKey)
    }

    // Epsilon-greedy action selection
    if (Math.random() < this.explorationRate) {
      // Explore: random action
      const actions: AlertLevel[] = ['none', 'watch', 'warning', 'evacuate']
      const randomAlert = actions[Math.floor(Math.random() * actions.length)]
      return {
        alert: randomAlert,
        confidence: 0.5
      }
    }

    // Exploit: choose best action based on Q-values
    const qValues = this.qTable.get(stateKey)!
    let bestAction: AlertLevel = 'none'
    let maxQ = -Infinity

    for (const [action, qValue] of qValues.entries()) {
      if (qValue > maxQ) {
        maxQ = qValue
        bestAction = action
      }
    }

    // Calculate confidence based on Q-value spread
    const confidence = this.calculateConfidence(qValues, maxQ)

    return {
      alert: bestAction,
      confidence
    }
  }

  // Update Q-values based on observed outcome
  updatePolicy(
    state: MDPState,
    action: AlertLevel,
    reward: number,
    nextState: MDPState
  ) {
    const stateKey = this.encodeState(state)
    const nextStateKey = this.encodeState(nextState)

    // Initialize Q-values if needed
    if (!this.qTable.has(stateKey)) {
      this.initializeQValues(stateKey)
    }
    if (!this.qTable.has(nextStateKey)) {
      this.initializeQValues(nextStateKey)
    }

    // Get current Q-value
    const currentQ = this.qTable.get(stateKey)!.get(action) || 0

    // Get max Q-value for next state
    const nextQValues = this.qTable.get(nextStateKey)!
    const maxNextQ = Math.max(...Array.from(nextQValues.values()))

    // Q-learning update rule
    const newQ = currentQ + this.learningRate * (
      reward + this.discountFactor * maxNextQ - currentQ
    )

    // Update Q-table
    this.qTable.get(stateKey)!.set(action, newQ)
  }

  // Calculate reward based on action and actual outcome
  calculateReward(
    action: AlertLevel,
    actualWaterState: WaterState,
    timeToImpact?: number
  ): number {
    let reward = 0

    // Reward matrix based on action vs actual state
    const rewardMatrix = {
      none: {
        normal: this.rewards.correctAlert,
        rising: -2,
        high: this.rewards.falseNegative / 2,
        critical: this.rewards.falseNegative
      },
      watch: {
        normal: this.rewards.falsePositive / 2,
        rising: this.rewards.correctAlert,
        high: -2,
        critical: this.rewards.falseNegative / 2
      },
      warning: {
        normal: this.rewards.falsePositive,
        rising: -2,
        high: this.rewards.correctAlert,
        critical: -5
      },
      evacuate: {
        normal: this.rewards.falsePositive * 2,
        rising: this.rewards.falsePositive,
        high: -2,
        critical: this.rewards.correctAlert
      }
    }

    reward = rewardMatrix[action][actualWaterState]

    // Timing bonus for early accurate warnings
    if (timeToImpact && timeToImpact > 60 && action !== 'none') {
      if (actualWaterState === 'high' || actualWaterState === 'critical') {
        reward += this.rewards.timingBonus
      }
    }

    return reward
  }

  // Determine water state from measurements
  classifyWaterState(waterLevel: number, rateOfChange: number): WaterState {
    if (waterLevel >= 15) return 'critical'
    if (waterLevel >= 10) return 'high'
    if (waterLevel >= 5 || rateOfChange > 1) return 'rising'
    return 'normal'
  }

  // Policy evaluation: simulate outcomes
  evaluatePolicy(testStates: MDPState[]): {
    accuracy: number
    falsePositiveRate: number
    falseNegativeRate: number
    averageConfidence: number
  } {
    let correct = 0
    let falsePositives = 0
    let falseNegatives = 0
    let totalConfidence = 0

    for (const state of testStates) {
      const action = this.getOptimalAction(state)
      const waterState = this.classifyWaterState(state.waterLevel, state.rateOfChange)

      // Evaluate action appropriateness
      const appropriate = this.isActionAppropriate(action.alert, waterState)

      if (appropriate) {
        correct++
      } else if (this.isOverAlert(action.alert, waterState)) {
        falsePositives++
      } else {
        falseNegatives++
      }

      totalConfidence += action.confidence
    }

    const total = testStates.length

    return {
      accuracy: correct / total,
      falsePositiveRate: falsePositives / total,
      falseNegativeRate: falseNegatives / total,
      averageConfidence: totalConfidence / total
    }
  }

  // Check if action is appropriate for state
  private isActionAppropriate(action: AlertLevel, waterState: WaterState): boolean {
    const appropriate = {
      normal: ['none'],
      rising: ['watch', 'none'],
      high: ['warning', 'watch'],
      critical: ['evacuate', 'warning']
    }

    return appropriate[waterState].includes(action)
  }

  // Check if action is over-alerting
  private isOverAlert(action: AlertLevel, waterState: WaterState): boolean {
    const alertOrder = ['none', 'watch', 'warning', 'evacuate']
    const stateOrder = ['normal', 'rising', 'high', 'critical']

    const actionLevel = alertOrder.indexOf(action)
    const stateLevel = stateOrder.indexOf(waterState)

    return actionLevel > stateLevel + 1
  }

  // Encode state to string key
  private encodeState(state: MDPState): string {
    const waterBucket = Math.floor(state.waterLevel / 5) * 5
    const rateBucket = Math.floor(state.rateOfChange * 2) / 2
    const precipBucket = Math.floor(state.precipitation / 10) * 10

    return `${waterBucket}_${rateBucket}_${precipBucket}_${state.timeOfDay}_${state.previousAlert}`
  }

  // Initialize Q-values for a new state
  private initializeQValues(stateKey: string) {
    const qValues = new Map<AlertLevel, number>()
    const actions: AlertLevel[] = ['none', 'watch', 'warning', 'evacuate']

    for (const action of actions) {
      // Initialize with small random values to break ties
      qValues.set(action, Math.random() * 0.01)
    }

    this.qTable.set(stateKey, qValues)
  }

  // Calculate confidence based on Q-value distribution
  private calculateConfidence(qValues: Map<AlertLevel, number>, maxQ: number): number {
    const values = Array.from(qValues.values())
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length

    // Higher variance means clearer best action
    const normalized = Math.min(1, variance / 10)

    // Also consider absolute Q-value
    const absoluteConfidence = Math.min(1, Math.abs(maxQ) / 20)

    return (normalized + absoluteConfidence) / 2
  }

  // Monte Carlo simulation for policy improvement
  async runMonteCarloSimulation(episodes: number = 1000) {
    for (let episode = 0; episode < episodes; episode++) {
      // Generate random initial state
      const initialState: MDPState = {
        waterLevel: Math.random() * 20,
        rateOfChange: Math.random() * 5 - 1,
        precipitation: Math.random() * 50,
        timeOfDay: Math.random() > 0.5 ? 'day' : 'night',
        previousAlert: 'none'
      }

      let currentState = initialState
      const trajectory: Array<{ state: MDPState; action: AlertLevel; reward: number }> = []

      // Simulate episode
      for (let step = 0; step < 10; step++) {
        const action = this.getOptimalAction(currentState)
        const nextState = this.simulateTransition(currentState)
        const waterState = this.classifyWaterState(nextState.waterLevel, nextState.rateOfChange)
        const reward = this.calculateReward(action.alert, waterState)

        trajectory.push({
          state: currentState,
          action: action.alert,
          reward
        })

        currentState = nextState
      }

      // Update Q-values based on trajectory
      for (let i = 0; i < trajectory.length - 1; i++) {
        const { state, action, reward } = trajectory[i]
        const nextState = trajectory[i + 1].state
        this.updatePolicy(state, action, reward, nextState)
      }
    }
  }

  // Simulate state transition
  private simulateTransition(state: MDPState): MDPState {
    const waterState = this.classifyWaterState(state.waterLevel, state.rateOfChange)
    const transitions = this.transitionProbs[waterState]

    // Sample next water state
    const rand = Math.random()
    let cumProb = 0
    let nextWaterState: WaterState = 'normal'

    for (const [nextState, prob] of Object.entries(transitions)) {
      cumProb += prob
      if (rand < cumProb) {
        nextWaterState = nextState as WaterState
        break
      }
    }

    // Generate next state parameters
    const stateParams = {
      normal: { level: 2, rate: 0 },
      rising: { level: 7, rate: 1.5 },
      high: { level: 12, rate: 2 },
      critical: { level: 18, rate: 3 }
    }

    const params = stateParams[nextWaterState]

    return {
      waterLevel: params.level + (Math.random() - 0.5) * 3,
      rateOfChange: params.rate + (Math.random() - 0.5),
      precipitation: state.precipitation * 0.8 + Math.random() * 10,
      timeOfDay: state.timeOfDay,
      previousAlert: state.previousAlert
    }
  }

  // Export policy for deployment
  exportPolicy(): string {
    const policy: any = {
      qTable: {},
      rewards: this.rewards,
      parameters: {
        learningRate: this.learningRate,
        discountFactor: this.discountFactor,
        explorationRate: this.explorationRate
      }
    }

    for (const [state, actions] of this.qTable.entries()) {
      policy.qTable[state] = Object.fromEntries(actions)
    }

    return JSON.stringify(policy, null, 2)
  }

  // Import policy from JSON
  importPolicy(policyJson: string) {
    const policy = JSON.parse(policyJson)

    // Clear existing Q-table
    this.qTable.clear()

    // Import Q-values
    for (const [state, actions] of Object.entries(policy.qTable)) {
      const qValues = new Map<AlertLevel, number>()
      for (const [action, value] of Object.entries(actions as any)) {
        qValues.set(action as AlertLevel, value as number)
      }
      this.qTable.set(state, qValues)
    }
  }
}

// Singleton instance
export const mdpAlertPolicy = new MDPAlertPolicy()
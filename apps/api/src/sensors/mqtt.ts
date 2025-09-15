// MQTT Adapter for IoT Sensor Ingestion
// Topic convention: riveralert/tx/sensor/{sensor_id}

import { IoTReading, IoTReadingSchema, processIoTReading } from './iot'

// MQTT Configuration
export const MQTT_CONFIG = {
  topics: {
    base: 'riveralert/tx',
    sensor: 'riveralert/tx/sensor/+',
    command: 'riveralert/tx/command/+',
    status: 'riveralert/tx/status/+'
  },
  qos: {
    sensor: 1,    // At least once delivery for sensor data
    command: 2,   // Exactly once for commands
    status: 0     // Fire and forget for status updates
  },
  retain: {
    sensor: false,
    command: false,
    status: true  // Retain last status
  }
}

// MQTT Message Parser
export function parseMQTTMessage(
  topic: string,
  message: Buffer
): { type: string; sensorId: string; data: any } | null {
  const topicParts = topic.split('/')

  if (topicParts.length < 4) {
    return null
  }

  const [, , messageType, sensorId] = topicParts

  try {
    const data = JSON.parse(message.toString())
    return {
      type: messageType,
      sensorId,
      data
    }
  } catch (error) {
    console.error('Failed to parse MQTT message:', error)
    return null
  }
}

// MQTT Client Interface (abstraction for different MQTT libraries)
export interface MQTTClientInterface {
  connect(): Promise<void>
  disconnect(): Promise<void>
  subscribe(topic: string, qos?: number): Promise<void>
  publish(topic: string, message: string | Buffer, options?: any): Promise<void>
  on(event: string, handler: Function): void
}

// MQTT Adapter Class
export class MQTTAdapter {
  private client: MQTTClientInterface | null = null
  private messageHandlers: Map<string, Function[]> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 5000

  constructor(
    private readonly config: {
      url?: string
      clientId?: string
      username?: string
      password?: string
      enabled?: boolean
    }
  ) {
    if (!config.enabled) {
      console.log('MQTT adapter disabled via configuration')
    }
  }

  // Initialize MQTT connection
  async initialize(client: MQTTClientInterface) {
    if (!this.config.enabled) {
      return
    }

    this.client = client

    // Set up event handlers
    this.client.on('connect', () => this.handleConnect())
    this.client.on('message', (topic: string, message: Buffer) =>
      this.handleMessage(topic, message)
    )
    this.client.on('error', (error: Error) => this.handleError(error))
    this.client.on('disconnect', () => this.handleDisconnect())

    // Connect to broker
    await this.connect()
  }

  private async connect() {
    try {
      if (this.client) {
        await this.client.connect()
      }
    } catch (error) {
      console.error('MQTT connection failed:', error)
      await this.scheduleReconnect()
    }
  }

  private async handleConnect() {
    console.log('MQTT connected successfully')
    this.reconnectAttempts = 0

    // Subscribe to sensor topics
    if (this.client) {
      await this.client.subscribe(
        MQTT_CONFIG.topics.sensor,
        MQTT_CONFIG.qos.sensor
      )
      await this.client.subscribe(
        MQTT_CONFIG.topics.command,
        MQTT_CONFIG.qos.command
      )
    }

    // Publish status
    await this.publishStatus('online')
  }

  private async handleMessage(topic: string, message: Buffer) {
    const parsed = parseMQTTMessage(topic, message)

    if (!parsed) {
      console.warn('Invalid MQTT message received:', topic)
      return
    }

    const { type, sensorId, data } = parsed

    // Handle different message types
    switch (type) {
      case 'sensor':
        await this.handleSensorReading(sensorId, data)
        break
      case 'command':
        await this.handleCommand(sensorId, data)
        break
      default:
        console.warn('Unknown message type:', type)
    }

    // Call registered handlers
    const handlers = this.messageHandlers.get(type) || []
    for (const handler of handlers) {
      try {
        await handler(sensorId, data)
      } catch (error) {
        console.error('Handler error:', error)
      }
    }
  }

  private async handleSensorReading(sensorId: string, data: any) {
    try {
      // Validate the reading
      const validated = IoTReadingSchema.parse({
        ...data,
        sensor_id: sensorId
      })

      // Process the reading
      const result = await processIoTReading(validated)

      // Publish alerts if any
      if (result.alerts.length > 0) {
        await this.publishAlert(sensorId, result.alerts)
      }

      console.log(`Processed MQTT reading from ${sensorId}:`, result)
    } catch (error) {
      console.error(`Invalid sensor reading from ${sensorId}:`, error)
    }
  }

  private async handleCommand(sensorId: string, command: any) {
    console.log(`Command received for ${sensorId}:`, command)

    // Handle different commands
    switch (command.action) {
      case 'reset':
        await this.publishStatus('resetting', sensorId)
        break
      case 'calibrate':
        await this.publishStatus('calibrating', sensorId)
        break
      case 'update':
        await this.publishStatus('updating', sensorId)
        break
      default:
        console.warn('Unknown command:', command.action)
    }
  }

  private handleError(error: Error) {
    console.error('MQTT error:', error)
  }

  private async handleDisconnect() {
    console.log('MQTT disconnected')
    await this.scheduleReconnect()
  }

  private async scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)

    setTimeout(() => {
      this.connect()
    }, delay)
  }

  // Public methods

  async publishSensorReading(reading: IoTReading) {
    if (!this.client || !this.config.enabled) {
      return
    }

    const topic = `${MQTT_CONFIG.topics.base}/sensor/${reading.sensor_id}`
    const message = JSON.stringify(reading)

    await this.client.publish(
      topic,
      message,
      {
        qos: MQTT_CONFIG.qos.sensor,
        retain: MQTT_CONFIG.retain.sensor
      }
    )
  }

  async publishAlert(sensorId: string, alerts: string[]) {
    if (!this.client || !this.config.enabled) {
      return
    }

    const topic = `${MQTT_CONFIG.topics.base}/alert/${sensorId}`
    const message = JSON.stringify({
      sensor_id: sensorId,
      alerts,
      timestamp: new Date().toISOString()
    })

    await this.client.publish(topic, message, { qos: 2 })
  }

  async publishStatus(status: string, sensorId?: string) {
    if (!this.client || !this.config.enabled) {
      return
    }

    const topic = sensorId
      ? `${MQTT_CONFIG.topics.base}/status/${sensorId}`
      : `${MQTT_CONFIG.topics.base}/status/gateway`

    const message = JSON.stringify({
      status,
      timestamp: new Date().toISOString()
    })

    await this.client.publish(
      topic,
      message,
      {
        qos: MQTT_CONFIG.qos.status,
        retain: MQTT_CONFIG.retain.status
      }
    )
  }

  registerHandler(messageType: string, handler: Function) {
    const handlers = this.messageHandlers.get(messageType) || []
    handlers.push(handler)
    this.messageHandlers.set(messageType, handlers)
  }

  async disconnect() {
    if (this.client) {
      await this.publishStatus('offline')
      await this.client.disconnect()
      this.client = null
    }
  }
}

// Factory function for creating MQTT adapter
export function createMQTTAdapter(enabled: boolean = false): MQTTAdapter {
  const config = {
    url: process.env.IOT_MQTT_URL || 'mqtt://localhost:1883',
    clientId: process.env.MQTT_CLIENT_ID || 'riveralert-gateway',
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    enabled: enabled && !!process.env.IOT_MQTT_URL
  }

  return new MQTTAdapter(config)
}
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { messages, context } = await request.json()

    // Build system prompt with context
    const systemPrompt = `You are RiverAlert's AI flood assistant for Texas. You have access to:
    - Real-time water level data and predictions
    - Evacuation routes and safety information
    - Current risk level: ${context.currentRiskLevel}
    - Active alerts: ${context.activeAlerts?.length || 0}
    - Sensor readings: ${JSON.stringify(context.sensorReadings || [])}

    Provide helpful, accurate, and actionable information about flood safety.
    Be concise but thorough. Prioritize safety in all recommendations.
    If evacuation is advised, be clear and direct about it.`

    let response = ''

    // Try Claude first (more powerful for complex analysis)
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const claudeMessages = messages.map((msg: any) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        }))

        const completion = await anthropic.messages.create({
          model: 'claude-3-opus-20240229',
          max_tokens: 500,
          system: systemPrompt,
          messages: claudeMessages
        })

        response = completion.content[0].type === 'text'
          ? completion.content[0].text
          : 'I understand your concern. Based on current conditions, please stay alert.'
      } catch (claudeError) {
        console.error('Claude API error:', claudeError)
        // Fall back to OpenAI
      }
    }

    // Use OpenAI if Claude fails or isn't configured
    if (!response && process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          max_tokens: 500,
          temperature: 0.7
        })

        response = completion.choices[0]?.message?.content ||
          'I understand your concern. Based on current conditions, please stay alert.'
      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError)
      }
    }

    // Fallback response if both APIs fail
    if (!response) {
      response = generateFallbackResponse(messages[messages.length - 1].content, context)
    }

    return NextResponse.json({ response })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      {
        response: 'I apologize, but I\'m having trouble processing your request. For immediate flood information, please call 911 if you\'re in danger, or check local emergency services.'
      },
      { status: 200 } // Return 200 to avoid breaking the UI
    )
  }
}

function generateFallbackResponse(userMessage: string, context: any): string {
  const message = userMessage.toLowerCase()

  if (message.includes('evacuate') || message.includes('leave')) {
    return `Based on the current ${context.currentRiskLevel} risk level, ${
      context.currentRiskLevel === 'extreme' || context.currentRiskLevel === 'high'
        ? 'evacuation is strongly recommended. Follow designated evacuation routes and avoid low-water crossings.'
        : 'evacuation is not currently required, but stay alert for changing conditions.'
    }`
  }

  if (message.includes('safe') || message.includes('route')) {
    return 'For safe evacuation routes, avoid all low-water crossings. Use major highways when possible. The app shows recommended safe routes in green on the map.'
  }

  if (message.includes('water level') || message.includes('flood')) {
    return `Current risk level is ${context.currentRiskLevel}. ${
      context.activeAlerts?.length > 0
        ? `There are ${context.activeAlerts.length} active alerts in your area.`
        : 'No immediate alerts, but continue monitoring conditions.'
    } Stay away from rivers and low-lying areas.`
  }

  if (message.includes('help') || message.includes('what should')) {
    return 'Key safety tips: 1) Never drive through flooded roads, 2) Move to higher ground if water is rising, 3) Have an emergency kit ready, 4) Monitor official alerts, 5) Know your evacuation routes.'
  }

  return 'I can help you with flood safety information, evacuation routes, and current conditions. What specific information do you need?'
}
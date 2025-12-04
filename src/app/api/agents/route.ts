import { NextResponse } from 'next/server'
import { getAgentStore, persistAgentStore } from '@/lib/agents-store'

export async function GET() {
  const store = getAgentStore()
  const agents = Object.values(store)
  return NextResponse.json(agents)
}

export async function POST(request: Request) {
  const body = await request.json()
  const id = body?.id || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`
  const agent: Agent = {
    id,
    name: body?.name || `Agent ${id.slice(0, 4)}`,
    model: body?.model || 'gpt-4o-mini',
    provider: body?.provider || 'openai',
    language: body?.language || 'en',
    prompt: body?.prompt || '',
    config: body?.config || {}
  }
  const store = getAgentStore()
  store[id] = agent
  persistAgentStore()
  return NextResponse.json(agent, { status: 201 })
}
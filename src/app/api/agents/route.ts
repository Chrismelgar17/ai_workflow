import { NextResponse } from 'next/server'

type Agent = {
  id: string
  name: string
  model: string
  provider: string
  language?: string
  prompt?: string
  config?: Record<string, any>
}

// In-memory store for dev/demo
const store: Record<string, Agent> = (globalThis as any).__AGENTS_STORE || {}
;(globalThis as any).__AGENTS_STORE = store

export async function GET() {
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
  store[id] = agent
  return NextResponse.json(agent, { status: 201 })
}
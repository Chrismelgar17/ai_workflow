import { NextResponse } from 'next/server'

type Agent = {
  id: string
  name?: string
  model?: string
  provider?: string
  language?: string
  prompt?: string
  config?: Record<string, any>
}

const store: Record<string, Agent> = (global as any).__AGENTS_STORE || {}
;(global as any).__AGENTS_STORE = store

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const agent = store[params.id]
  return NextResponse.json(
    agent || {
      id: params.id,
      name: `Agent ${params.id.slice(0, 4)}`,
      model: 'gpt-4o-mini',
      provider: 'openai',
      language: 'en',
      prompt: '',
      config: {},
    }
  )
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  const existing = store[params.id]
  const updated: Agent = {
    id: params.id,
    name: body?.name ?? existing?.name ?? `Agent ${params.id.slice(0, 4)}`,
    model: body?.model ?? existing?.model ?? 'gpt-4o-mini',
    provider: body?.provider ?? existing?.provider ?? 'openai',
    language: body?.language ?? existing?.language ?? 'en',
    prompt: body?.prompt ?? existing?.prompt ?? '',
    config: { ...(existing?.config || {}), ...(body?.config || {}) },
  }
  store[params.id] = updated
  return NextResponse.json(updated)
}

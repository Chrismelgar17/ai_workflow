import { NextResponse } from 'next/server'
import { getAgentStore, persistAgentStore } from '@/lib/agents-store'

type Agent = {
  id: string
  name?: string
  model?: string
  provider?: string
  language?: string
  prompt?: string
  config?: Record<string, any>
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const store = getAgentStore()
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
  const store = getAgentStore()
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
  persistAgentStore()
  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const store = getAgentStore()
  if (store[params.id]) {
    delete store[params.id]
    persistAgentStore()
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ ok: false }, { status: 404 })
}

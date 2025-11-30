import { NextResponse } from 'next/server'

// Simple in-memory store for demo agent configs during development.
// This keeps things lightweight and avoids requiring a separate backend.
const AGENTS_STORE: Record<string, any> = (global as any).__AGENTS_STORE || {};
(global as any).__AGENTS_STORE = AGENTS_STORE;

export async function GET(request: Request, context: any) {
  try {
    const params = context?.params || {}
    const id = params?.id || 'agent_demo'
    const stored = AGENTS_STORE[id]
    if (stored) return NextResponse.json(stored)
    // Default demo config
    return NextResponse.json({
      id,
      model: 'gpt-4o-mini',
      language: 'en-US',
      voice: 'alloy',
      prompt: 'Explain the difference between caching and rate limiting in one paragraph.',
    })
  } catch (e) {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const params = context?.params || {}
    const id = params?.id || `agent_${Date.now()}`
    const body = await request.json()
    AGENTS_STORE[id] = { ...(AGENTS_STORE[id] || {}), ...body, id }
    return NextResponse.json({ ok: true, id, ...AGENTS_STORE[id] })
  } catch (e) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
}

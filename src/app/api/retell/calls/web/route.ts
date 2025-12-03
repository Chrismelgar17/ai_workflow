import { NextResponse } from 'next/server'
import { RetellService } from '@/../backend/src/integrations/retell'

function getService() {
  const apiKey = process.env.RETELL_API_KEY
  const baseUrl = process.env.RETELL_BASE_URL
  if (!apiKey) throw new Error('RETELL_API_KEY not set')
  return new RetellService({ apiKey, baseUrl })
}

export async function POST(request: Request) {
  try {
    const svc = getService()
    const body = await request.json()
    const { agentId, metadata } = body || {}
    if (!agentId) {
      return NextResponse.json({ error: 'agentId required' }, { status: 400 })
    }
    const resp = await svc.createWebCall({ agentId, metadata })
    return NextResponse.json(resp || { ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'retell_error' }, { status: 500 })
  }
}

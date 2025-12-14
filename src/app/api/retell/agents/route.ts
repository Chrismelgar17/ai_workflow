import { NextResponse } from 'next/server'
import { RetellService } from '@/../backend/src/integrations/retell'

function getService() {
  const apiKey = process.env.RETELL_API_KEY
  const baseUrl = process.env.RETELL_BASE_URL
  if (!apiKey) throw new Error('RETELL_API_KEY not set')
  return new RetellService({ apiKey, baseUrl })
}

export async function GET() {
  try {
    const svc = getService()
    const agents = await svc.listAgents()
    return NextResponse.json({ agents })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'retell_error' }, { status: 500 })
  }
}

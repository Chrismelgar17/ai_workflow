import { headers } from 'next/headers'
import { proxyBackendJson } from '@/lib/agents-store'

export async function GET() {
  const headerMap: Record<string, string> = {}
  const token = headers().get('authorization')
  if (token) headerMap.Authorization = token
  return proxyBackendJson('/api/agents', {
    method: 'GET',
    headers: Object.keys(headerMap).length ? headerMap : undefined,
  })
}

export async function POST(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_json', detail: 'Request body must be valid JSON.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!body || typeof body !== 'object') {
    return new Response(
      JSON.stringify({ error: 'invalid_body', detail: 'Request body must be a JSON object.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const headerMap: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = request.headers.get('authorization')
  if (token) headerMap.Authorization = token

  return proxyBackendJson('/api/agents', {
    method: 'POST',
    headers: headerMap,
    body: JSON.stringify(body),
  })
}
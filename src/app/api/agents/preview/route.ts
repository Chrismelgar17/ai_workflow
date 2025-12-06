import { NextRequest } from 'next/server'

const BACKEND_CANDIDATES = [
  process.env.BACKEND_INTERNAL_URL,
  process.env.NEXT_PUBLIC_API_URL,
  'http://api:5000',
  'http://localhost:5000',
].filter((url, index, self) => url && self.indexOf(url) === index) as string[]

export async function POST(req: NextRequest) {
  let payload: any = null
  try {
    payload = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_json', detail: 'Request body must be valid JSON.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!payload || typeof payload !== 'object') {
    return new Response(
      JSON.stringify({ error: 'invalid_body', detail: 'Request body must be a JSON object.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const token = req.headers.get('authorization') || undefined
  let lastError: any = null

  for (const base of BACKEND_CANDIDATES) {
    try {
      const upstream = await fetch(`${base}/api/agents/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: token } : {}),
        },
        body: JSON.stringify(payload),
      })

      const text = await upstream.text()
      let json: any
      try {
        json = JSON.parse(text)
      } catch {
        json = { raw: text }
      }

      return new Response(JSON.stringify(json), {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error: any) {
      lastError = error
      continue
    }
  }

  return new Response(
    JSON.stringify({
      error: 'upstream_unreachable',
      detail: lastError?.message || 'Unable to reach backend for preview request.',
      tried: BACKEND_CANDIDATES,
    }),
    { status: 502, headers: { 'Content-Type': 'application/json' } }
  )
}

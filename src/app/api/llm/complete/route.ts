import { NextRequest } from 'next/server'

// Proxy with raw-first parsing + backend URL fallback (localhost -> api service name)
export async function POST(req: NextRequest) {
  let raw = ''
  try { raw = await req.text() } catch {}
  if (!raw) {
    return new Response(JSON.stringify({ error: 'empty_body', detail: 'Request body required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
  let cleaned = raw.trim()
  if ((cleaned.startsWith("'") && cleaned.endsWith("'")) || (cleaned.startsWith('"') && cleaned.endsWith('"'))) cleaned = cleaned.slice(1, -1)
  cleaned = cleaned.replace(/`"/g, '"')
  let body: any
  try { body = JSON.parse(cleaned) } catch {
    if (/^prompt\s*:/i.test(cleaned)) {
      const maybe = cleaned.replace(/^prompt\s*:/i, '').trim()
      body = { prompt: maybe.replace(/^"|"$/g, '') }
    } else {
      return new Response(JSON.stringify({ error: 'invalid_json', detail: 'Unable to parse body', raw }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
  }
  if (!body || typeof body !== 'object') {
    return new Response(JSON.stringify({ error: 'invalid_body', detail: 'Parsed body not object' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const token = req.headers.get('authorization') || ''
  const candidates = [
    process.env.BACKEND_INTERNAL_URL,
    process.env.NEXT_PUBLIC_API_URL,
    'http://api:5000',
    'http://localhost:5000'
  ].filter((u, i, arr) => u && arr.indexOf(u) === i) as string[]

  let lastErr: any = null
  for (const base of candidates) {
    try {
      const upstream = await fetch(`${base}/api/llm/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
        body: JSON.stringify(body),
      })
      const text = await upstream.text()
      let json: any
      try { json = JSON.parse(text) } catch { json = { raw: text } }
      if (upstream.status >= 500 && json?.error) json.proxy_note = 'Upstream backend error'
      return new Response(JSON.stringify(json), { status: upstream.status, headers: { 'Content-Type': 'application/json' } })
    } catch (e: any) {
      lastErr = e
      // Try next candidate
      continue
    }
  }
  return new Response(JSON.stringify({ error: 'upstream_unreachable', detail: lastErr?.message || 'All backend URL attempts failed', tried: candidates }), { status: 502, headers: { 'Content-Type': 'application/json' } })
}
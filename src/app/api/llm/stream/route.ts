import { NextRequest } from 'next/server'

// Proxy GET /api/llm/stream (SSE) from frontend (3002) to backend (5000)
export async function GET(req: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
    const token = req.headers.get('authorization') || ''
    const url = new URL(req.url)
    const qs = url.searchParams.toString()
    const backendStreamUrl = `${backendUrl}/api/llm/stream${qs ? `?${qs}` : ''}`
    const res = await fetch(backendStreamUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        ...(token ? { Authorization: token } : {}),
      },
    })
    if (!res.body) {
      return new Response(JSON.stringify({ error: 'backend stream unavailable' }), { status: 502 })
    }
    const readable = res.body
    return new Response(readable, {
      status: res.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (e: any) {
    return new Response(`data: ${JSON.stringify({ error: e?.message || 'llm stream proxy error' })}\n\n`, {
      status: 500,
      headers: { 'Content-Type': 'text/event-stream' }
    })
  }
}
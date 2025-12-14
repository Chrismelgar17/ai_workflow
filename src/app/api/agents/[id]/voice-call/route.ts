import { proxyBackendJson } from '@/lib/agents-store'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  let rawBody = ''
  try {
    rawBody = await request.text()
  } catch {
    rawBody = ''
  }

  const body = rawBody && rawBody.trim().length ? rawBody : '{}'
  const headerMap: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = request.headers.get('authorization')
  if (token) headerMap.Authorization = token

  return proxyBackendJson(`/api/agents/${encodeURIComponent(params.id)}/voice-call`, {
    method: 'POST',
    headers: headerMap,
    body,
  })
}

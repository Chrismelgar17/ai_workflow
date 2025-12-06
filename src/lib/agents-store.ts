export const BACKEND_CANDIDATES = [
  process.env.BACKEND_INTERNAL_URL,
  process.env.NEXT_PUBLIC_API_URL,
  'http://api:5000',
  'http://localhost:5000',
].filter((url, index, self) => url && self.indexOf(url) === index) as string[]

type ProxyInit = {
  method: string
  headers?: Record<string, string>
  body?: string
}

export async function proxyBackendJson(path: string, init: ProxyInit): Promise<Response> {
  let lastError: any = null
  for (const base of BACKEND_CANDIDATES) {
    try {
      const upstream = await fetch(`${base}${path}`, {
        method: init.method,
        headers: init.headers,
        body: init.body,
        cache: 'no-store',
      })

      const text = await upstream.text()
      const contentType = upstream.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      const payload = isJson ? text : JSON.stringify({ raw: text })

      return new Response(payload, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      lastError = error
    }
  }

  return new Response(
    JSON.stringify({
      error: 'upstream_unreachable',
      path,
      detail: lastError?.message || 'Unable to reach backend service.',
      tried: BACKEND_CANDIDATES,
    }),
    { status: 502, headers: { 'Content-Type': 'application/json' } }
  )
}

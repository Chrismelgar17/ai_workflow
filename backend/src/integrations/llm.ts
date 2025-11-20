import OpenAI from 'openai'
import crypto from 'crypto'

// Enhanced error type for clearer upstream diagnostics
class LLMError extends Error {
  status: number
  code?: string
  details?: any
  constructor(message: string, status: number = 500, code?: string, details?: any) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

// Simple wrapper around OpenAI client. Extendable to support other providers.
// Expects OPENAI_API_KEY in environment.

export interface LLMRequest {
  prompt: string
  model?: string
  temperature?: number
  maxTokens?: number
  system?: string
  provider?: string // future: 'openai' | 'anthropic' | etc.
  useCache?: boolean
}

export interface LLMResponse {
  model: string
  created: number
  content: string
  usage?: any
}

function getClient() {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new LLMError('OPENAI_API_KEY missing (set OPENAI_API_KEY environment variable)', 500, 'missing_api_key')
  return new OpenAI({ apiKey: key })
}

// --- Simple in-memory cache (disabled unless LLM_CACHE_ENABLED=true) ---
const CACHE_ENABLED = (process.env.LLM_CACHE_ENABLED || 'false').toLowerCase() === 'true'
const completionCache = new Map<string, { ts: number; value: LLMResponse }>()
const MAX_CACHE_ENTRIES = 200
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

function cacheKey(req: LLMRequest) {
  const hash = crypto.createHash('sha256').update(JSON.stringify({
    p: req.prompt,
    m: req.model || process.env.OPENAI_DEFAULT_MODEL,
    t: req.temperature,
    x: req.maxTokens,
    s: req.system,
  })).digest('hex')
  return hash
}

function getFromCache(key: string): LLMResponse | null {
  if (!CACHE_ENABLED) return null
  const hit = completionCache.get(key)
  if (!hit) return null
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    completionCache.delete(key)
    return null
  }
  return hit.value
}

function putInCache(key: string, value: LLMResponse) {
  if (!CACHE_ENABLED) return
  completionCache.set(key, { ts: Date.now(), value })
  if (completionCache.size > MAX_CACHE_ENTRIES) {
    // delete oldest
    let oldestKey: string | null = null
    let oldestTs = Infinity
    for (const [k, v] of completionCache.entries()) {
      if (v.ts < oldestTs) { oldestTs = v.ts; oldestKey = k }
    }
    if (oldestKey) completionCache.delete(oldestKey)
  }
}

// --- Basic moderation (simple keyword filter) ---
const bannedTerms = (process.env.LLM_BANNED_TERMS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean)
function isPromptAllowed(prompt: string): { ok: boolean; reason?: string } {
  const lower = prompt.toLowerCase()
  for (const term of bannedTerms) {
    if (term && lower.includes(term)) return { ok: false, reason: `Contains banned term: ${term}` }
  }
  if (prompt.length > 8000) return { ok: false, reason: 'Prompt too long' }
  return { ok: true }
}

export async function runCompletion(req: LLMRequest): Promise<LLMResponse> {
  // Provider abstraction placeholder
  const provider = (req.provider || 'openai').toLowerCase()
  if (provider !== 'openai') throw new LLMError(`Unsupported provider: ${provider}`, 400, 'unsupported_provider')

  // Moderation
  const mod = isPromptAllowed(req.prompt)
  if (!mod.ok) throw new LLMError(`Prompt rejected: ${mod.reason}`, 400, 'prompt_rejected')

  // Cache check
  const key = cacheKey(req)
  if (req.useCache) {
    const cached = getFromCache(key)
    if (cached) return { ...cached, model: cached.model }
  }

  const client = getClient()
  const model = req.model || process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini'
  const temperature = req.temperature ?? 0.7
  const maxTokens = req.maxTokens ?? 512
  const systemPrompt = req.system || process.env.OPENAI_SYSTEM_PROMPT || 'You are an assistant.'

  let response: any
  try {
    response = await client.chat.completions.create({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: req.prompt }
      ]
    })
  } catch (e: any) {
    // Normalize OpenAI error shape
    const status = e?.status || e?.response?.status || 500
    const upstream = e?.response?.data || e?.error || e
    const message = e?.message || upstream?.error?.message || 'llm_request_failed'
    throw new LLMError(message, status, upstream?.error?.type || 'llm_request_failed', upstream)
  }

  const choice = response.choices?.[0]
  const result: LLMResponse = {
    model: response.model || model,
    created: response.created,
    content: choice?.message?.content || '',
    usage: response.usage
  }
  if (req.useCache) putInCache(key, result)
  return result
}

// Streaming helper (Server-Sent Events). Returns an async iterator of string chunks.
export async function streamCompletion(req: LLMRequest, onChunk: (chunk: string) => void) {
  const provider = (req.provider || 'openai').toLowerCase()
  if (provider !== 'openai') throw new LLMError(`Unsupported provider: ${provider}`, 400, 'unsupported_provider')
  const mod = isPromptAllowed(req.prompt)
  if (!mod.ok) throw new LLMError(`Prompt rejected: ${mod.reason}`, 400, 'prompt_rejected')
  const client = getClient()
  const model = req.model || process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini'
  const temperature = req.temperature ?? 0.7
  const maxTokens = req.maxTokens ?? 512
  const systemPrompt = req.system || process.env.OPENAI_SYSTEM_PROMPT || 'You are an assistant.'

  let stream: any
  try {
    stream = await client.chat.completions.create({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: req.prompt }
      ],
      stream: true
    })
  } catch (e: any) {
    const status = e?.status || e?.response?.status || 500
    const upstream = e?.response?.data || e?.error || e
    const message = e?.message || upstream?.error?.message || 'llm_stream_failed'
    throw new LLMError(message, status, upstream?.error?.type || 'llm_stream_failed', upstream)
  }

  for await (const part of stream) {
    const chunk = part.choices?.[0]?.delta?.content
    if (chunk) onChunk(chunk)
  }
}

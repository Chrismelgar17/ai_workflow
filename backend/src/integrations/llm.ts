import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
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

// Simple wrapper around multiple LLM providers. Expects OPENAI_API_KEY, and optionally
// ANTHROPIC_API_KEY / GEMINI_API_KEY when requesting Claude or Gemini models.

type ProviderName = 'openai' | 'anthropic' | 'google'

function normalizeProviderName(input?: string): ProviderName | undefined {
  if (!input) return undefined
  const value = input.toLowerCase()
  if (value === 'openai') return 'openai'
  if (value === 'anthropic' || value === 'claude') return 'anthropic'
  if (value === 'google' || value === 'gemini') return 'google'
  return undefined
}

function inferProviderFromModel(model?: string): ProviderName | undefined {
  if (!model) return undefined
  const normalized = model.toLowerCase()
  if (normalized.startsWith('claude') || normalized.includes('anthropic')) return 'anthropic'
  if (normalized.startsWith('gemini') || normalized.includes('google')) return 'google'
  return undefined
}

export interface LLMRequest {
  prompt: string
  model?: string
  temperature?: number
  maxTokens?: number
  system?: string
  provider?: string // 'openai' | 'anthropic' | 'google' (or aliases like 'gemini')
  useCache?: boolean
}

export interface LLMResponse {
  model: string
  created: number
  content: string
  usage?: any
}

function resolveProvider(req: LLMRequest): ProviderName {
  return normalizeProviderName(req.provider) || inferProviderFromModel(req.model) || 'openai'
}

function resolveModel(provider: ProviderName, requested?: string) {
  if (requested) return requested
  if (provider === 'anthropic') return process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-5-sonnet-20241022'
  if (provider === 'google') return process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-flash'
  return process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini'
}

function resolveSystemPrompt(provider: ProviderName, requested?: string) {
  if (requested) return requested
  if (provider === 'anthropic') return process.env.ANTHROPIC_SYSTEM_PROMPT || process.env.OPENAI_SYSTEM_PROMPT || 'You are an assistant.'
  if (provider === 'google') return process.env.GEMINI_SYSTEM_PROMPT || process.env.OPENAI_SYSTEM_PROMPT || 'You are an assistant.'
  return process.env.OPENAI_SYSTEM_PROMPT || 'You are an assistant.'
}

function defaultMaxTokens(provider: ProviderName) {
  if (provider === 'anthropic') return 1024
  if (provider === 'google') return 1024
  return 512
}

function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new LLMError('OPENAI_API_KEY missing (set OPENAI_API_KEY environment variable)', 500, 'missing_api_key')
  return new OpenAI({ apiKey: key })
}

function getAnthropicClient() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new LLMError('ANTHROPIC_API_KEY missing (set ANTHROPIC_API_KEY environment variable)', 500, 'missing_api_key')
  return new Anthropic({ apiKey: key })
}

function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new LLMError('GEMINI_API_KEY missing (set GEMINI_API_KEY environment variable)', 500, 'missing_api_key')
  return new GoogleGenerativeAI(key)
}

// --- Simple in-memory cache (disabled unless LLM_CACHE_ENABLED=true) ---
const CACHE_ENABLED = (process.env.LLM_CACHE_ENABLED || 'false').toLowerCase() === 'true'
const completionCache = new Map<string, { ts: number; value: LLMResponse }>()
const MAX_CACHE_ENTRIES = 200
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

function cacheKey(req: LLMRequest, provider: ProviderName) {
  const hash = crypto.createHash('sha256').update(JSON.stringify({
    p: req.prompt,
    m: req.model,
    t: req.temperature,
    x: req.maxTokens,
    s: req.system,
    v: provider,
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
  const provider = resolveProvider(req)

  const moderation = isPromptAllowed(req.prompt)
  if (!moderation.ok) throw new LLMError(`Prompt rejected: ${moderation.reason}`, 400, 'prompt_rejected')

  const model = resolveModel(provider, req.model)
  const systemPrompt = resolveSystemPrompt(provider, req.system)
  const maxTokens = req.maxTokens ?? defaultMaxTokens(provider)
  const temperature = req.temperature ?? 0.7

  const cachePayload: LLMRequest = { ...req, model, provider }
  const key = cacheKey(cachePayload, provider)
  if (req.useCache) {
    const cached = getFromCache(key)
    if (cached) return { ...cached, model: cached.model }
  }

  let result: LLMResponse

  if (provider === 'openai') {
    const client = getOpenAIClient()
    try {
      const response = await client.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: req.prompt }
        ]
      })
      const choice = response.choices?.[0]
      result = {
        model: response.model || model,
        created: response.created,
        content: choice?.message?.content || '',
        usage: response.usage
      }
    } catch (e: any) {
      const status = e?.status || e?.response?.status || 500
      const upstream = e?.response?.data || e?.error || e
      const message = e?.message || upstream?.error?.message || 'llm_request_failed'
      throw new LLMError(message, status, upstream?.error?.type || 'llm_request_failed', upstream)
    }
  } else if (provider === 'anthropic') {
    const client = getAnthropicClient()
    try {
      const response = await client.messages.create({
        model,
        temperature,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          { role: 'user', content: req.prompt }
        ]
      })
      const content = (response.content || [])
        .map((part: any) => part?.type === 'text' ? part.text : '')
        .join('')
        .trim()
      result = {
        model: response.model || model,
        created: Math.floor(Date.now() / 1000),
        content,
        usage: response.usage
      }
    } catch (e: any) {
      const status = e?.status || e?.response?.status || 500
      const upstream = e?.response?.data || e?.error || e
      const message = e?.message || upstream?.error?.message || 'llm_request_failed'
      throw new LLMError(message, status, upstream?.error?.type || 'llm_request_failed', upstream)
    }
  } else {
    const client = getGeminiClient()
    try {
      const modelClient = client.getGenerativeModel({
        model,
        ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
      })

      const generationConfig: Record<string, any> = { temperature }
      if (typeof maxTokens === 'number') generationConfig.maxOutputTokens = maxTokens

      const response = await modelClient.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: req.prompt }]
          }
        ],
        generationConfig,
      })

      const text = typeof response?.response?.text === 'function'
        ? response.response.text()
        : (response?.response?.candidates || [])
            .flatMap((candidate: any) => candidate?.content?.parts || [])
            .map((part: any) => part?.text || '')
            .join('')
            .trim()

      result = {
        model,
        created: Math.floor(Date.now() / 1000),
        content: text || '',
        usage: response?.response?.usageMetadata,
      }
    } catch (e: any) {
      const status = e?.status || e?.response?.status || 500
      const upstream = e?.response?.data || e?.error || e
      const message = e?.message || upstream?.error?.message || 'llm_request_failed'
      throw new LLMError(message, status, upstream?.error?.code || 'llm_request_failed', upstream)
    }
  }

  if (req.useCache) putInCache(key, result)
  return result
}

// Streaming helper (Server-Sent Events). Returns an async iterator of string chunks.
export async function streamCompletion(req: LLMRequest, onChunk: (chunk: string) => void) {
  const provider = resolveProvider(req)
  if (provider !== 'openai') throw new LLMError(`Unsupported provider for streaming: ${provider}`, 400, 'unsupported_provider')
  const mod = isPromptAllowed(req.prompt)
  if (!mod.ok) throw new LLMError(`Prompt rejected: ${mod.reason}`, 400, 'prompt_rejected')
  const client = getOpenAIClient()
  const model = resolveModel('openai', req.model)
  const temperature = req.temperature ?? 0.7
  const maxTokens = req.maxTokens ?? defaultMaxTokens('openai')
  const systemPrompt = resolveSystemPrompt('openai', req.system)

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

import { useCallback, useRef, useState } from 'react'
import apiClient from './api-client'

interface StreamOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  system?: string
  provider?: string
}

export function useLlmStream() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [chunks, setChunks] = useState<string[]>([])

  const start = useCallback(async (prompt: string, opts: StreamOptions = {}) => {
    if (!prompt) return
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setContent('')
    setChunks([])
    setError(null)
    setLoading(true)
    try {
      await apiClient.llmStream({ prompt, ...opts }, (delta) => {
        setChunks((prev) => [...prev, delta])
        setContent((prev) => prev + delta)
      }, abortRef.current!.signal)
    } catch (e: any) {
      setError(e?.message || 'stream failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
  }, [])

  return { content, chunks, loading, error, start, cancel }
}

export default useLlmStream
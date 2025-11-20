"use client";
import { useState } from 'react'
import apiClient from '../../../lib/api-client'
import useLlmStream from '../../../lib/use-llm-stream'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'

export default function AiAgentPage() {
  const [prompt, setPrompt] = useState('Explain the difference between caching and rate limiting in one paragraph.')
  const [model, setModel] = useState('gpt-4o-mini')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(512)
  const [system, setSystem] = useState('You are a helpful assistant.')
  const [provider, setProvider] = useState('openai')
  const [useCache, setUseCache] = useState(true)
  const [completion, setCompletion] = useState<string>('')
  const [loadingComplete, setLoadingComplete] = useState(false)
  const [errorComplete, setErrorComplete] = useState<string | null>(null)
  const [rating, setRating] = useState<'up'|'down'|null>(null)

  const { content: streamContent, loading: streamLoading, error: streamError, start: startStream, cancel: cancelStream, chunks } = useLlmStream()

  async function runCompletion() {
    setLoadingComplete(true)
    setErrorComplete(null)
    setCompletion('')
    setRating(null)
    try {
      const res = await apiClient.llmComplete({ prompt, model, temperature, maxTokens, system, provider, useCache })
      setCompletion(res.content)
    } catch (e: any) {
      setErrorComplete(e?.message || 'request failed')
    } finally {
      setLoadingComplete(false)
    }
  }

  function startStreaming() {
    setRating(null)
    startStream(prompt, { model, temperature, maxTokens, system, provider })
  }

  const disabled = loadingComplete || streamLoading

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">AI Agent Sandbox</h1>
      <p className="text-sm text-muted-foreground">Experiment with LLM prompts, stream responses live, and rate their quality. This tooling uses backend endpoints <code>/api/llm/complete</code> and <code>/api/llm/stream</code>.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt</label>
            <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={6} placeholder="Enter your prompt" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Input value={model} onChange={e => setModel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <Input value={provider} onChange={e => setProvider(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Temperature</label>
              <Input type="number" step="0.1" value={temperature} onChange={e => setTemperature(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Tokens</label>
              <Input type="number" value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Use Cache</label>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={useCache} onChange={e => setUseCache(e.target.checked)} />
                <span className="text-xs">{useCache ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">System Prompt</label>
            <Textarea rows={2} value={system} onChange={e => setSystem(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button disabled={disabled || !prompt} onClick={runCompletion} variant="default">Run Completion</Button>
            <Button disabled={disabled || !prompt} onClick={startStreaming} variant="secondary">Stream</Button>
            {streamLoading && <Button onClick={cancelStream} variant="destructive">Cancel Stream</Button>}
          </div>
          {(loadingComplete || streamLoading) && <p className="text-xs text-muted-foreground">Processing...</p>}
          {errorComplete && <p className="text-xs text-red-600">Error: {errorComplete}</p>}
          {streamError && <p className="text-xs text-red-600">Stream Error: {streamError}</p>}
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Completion Output</label>
            <div className="border rounded p-3 text-sm max-h-[320px] overflow-auto bg-background/50">
              {streamLoading ? (
                <pre className="whitespace-pre-wrap font-mono text-xs">{chunks.join('')}</pre>
              ) : completion ? (
                <pre className="whitespace-pre-wrap font-mono text-xs">{completion}</pre>
              ) : streamContent ? (
                <pre className="whitespace-pre-wrap font-mono text-xs">{streamContent}</pre>
              ) : (
                <span className="text-muted-foreground text-xs">No output yet.</span>
              )}
            </div>
          </div>
          {(completion || streamContent) && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Rate Response</label>
              <div className="flex gap-2">
                <Button size="sm" variant={rating === 'up' ? 'default' : 'outline'} onClick={() => setRating('up')}>👍 Helpful</Button>
                <Button size="sm" variant={rating === 'down' ? 'default' : 'outline'} onClick={() => setRating('down')}>👎 Not Useful</Button>
              </div>
              {rating && <p className="text-xs text-muted-foreground">You marked this response as: {rating === 'up' ? 'Helpful' : 'Not Useful'}</p>}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Details</label>
            <div className="text-xs space-y-1">
              <p><strong>Prompt Length:</strong> {prompt.length}</p>
              <p><strong>Output Length:</strong> {(completion || streamContent).length}</p>
              <p><strong>Chunks (stream):</strong> {chunks.length}</p>
              <p><strong>Model:</strong> {model}</p>
              <p><strong>Provider:</strong> {provider}</p>
              <p><strong>Temperature:</strong> {temperature}</p>
              <p><strong>Max Tokens:</strong> {maxTokens}</p>
              <p><strong>Cache:</strong> {useCache ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
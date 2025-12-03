"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Agent = {
  id: string
  name?: string
  provider?: string
  model?: string
}

export default function AgentsListPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const r = await fetch('/api/agents')
        const j = await r.json()
        if (!mounted) return
        setAgents(Array.isArray(j) ? j : [])
      } catch (e: any) {
        setError(e?.message || 'Failed to load agents')
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Agents</h1>
          <p className="text-sm text-muted-foreground">Select an agent to edit</p>
        </div>
        <Button onClick={async () => {
          try {
            const r = await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New Agent' }) })
            const a: Agent = await r.json()
            setAgents(prev => [a, ...prev])
          } catch {}
        }}>New Agent</Button>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {!loading && !error && (
        agents.length === 0 ? (
          <div className="border rounded p-4 text-sm text-muted-foreground">No agents yet.</div>
        ) : (
          <ul role="listbox" aria-label="Agents" className="border rounded divide-y">
            {agents.map(a => (
              <li key={a.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{a.name || a.id}</div>
                  <div className="text-xs text-muted-foreground">{a.provider || 'openai'} · {a.model || 'gpt-4o-mini'}</div>
                </div>
                <Link className="text-sm text-indigo-600 hover:underline" href={`/dashboard/ai-agent?agentId=${encodeURIComponent(a.id)}`}>Edit</Link>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}

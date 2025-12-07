"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Swal from 'sweetalert2'

type Agent = {
  id: string
  name?: string
  provider?: string
  model?: string
  language?: string
  prompt?: string
  config?: Record<string, any>
  created_at?: string
}

const filters = [
  { value: 'all', label: 'All' },
  { value: 'openai', label: 'Text (OpenAI)' },
  { value: 'retell', label: 'Voice (Retell)' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
]

export default function AgentsListPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState(filters[0].value)

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

  const filteredAgents = useMemo(() => {
    if (filter === 'all') return agents
    return agents.filter(agent => (agent.provider || 'openai').toLowerCase() === filter)
  }, [agents, filter])

  const totalAgents = agents.length
  const activeAgents = agents.filter(agent => agent.prompt?.trim().length).length
  const totalInteractions = agents.reduce((sum, agent) => sum + Number(agent.config?.interactions ?? 0), 0)
  const successRate = totalAgents ? Math.round((activeAgents / totalAgents) * 100) : 0

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete agent?'
      ,text: 'This action cannot be undone.'
      ,icon: 'warning'
      ,showCancelButton: true
      ,confirmButtonText: 'Delete'
      ,cancelButtonText: 'Cancel'
    })
    if (!result.isConfirmed) return
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('failed')
      setAgents(prev => prev.filter(agent => agent.id !== id))
      Swal.fire({ title: 'Deleted', icon: 'success', timer: 1200, showConfirmButton: false })
    } catch {
      Swal.fire({ title: 'Unable to delete', icon: 'error' })
    }
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-semibold">AI Agents</h1>
            <p className="text-sm text-muted-foreground">View and manage every configured agent</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              {filters.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <Button onClick={async () => {
              try {
                const r = await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New Agent' }) })
                const a: Agent = await r.json()
                setAgents(prev => [a, ...prev])
              } catch {}
            }}>New Agent</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Agents</p>
            <p className="text-2xl font-semibold mt-2">{totalAgents}</p>
          </div>
          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Agents</p>
            <p className="text-2xl font-semibold mt-2">{activeAgents}</p>
          </div>
          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Interactions</p>
            <p className="text-2xl font-semibold mt-2">{totalInteractions}</p>
          </div>
          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Success Rate</p>
            <p className="text-2xl font-semibold mt-2">{successRate}%</p>
          </div>
        </div>
      </header>

      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAgents.map(agent => (
            <article key={agent.id} className="bg-white border rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{agent.name || agent.id}</h2>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{agent.provider || 'OpenAI'}</p>
                </div>
                <div className="flex flex-col items-end text-right text-xs text-muted-foreground">
                  <span>{agent.model || 'GPT-4o'}</span>
                  <span>{agent.language || 'en-US'}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full bg-indigo-50 text-indigo-600">{(agent.provider || 'OpenAI').toUpperCase()}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full bg-amber-50 text-amber-600">{agent.model || 'Single-prompt'}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full bg-emerald-50 text-emerald-600">Paused</span>
              </div>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-[10px] text-muted-foreground uppercase">Total Activity</dt>
                  <dd className="text-base font-semibold">{agent.config?.calls ?? 0} calls</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-muted-foreground uppercase">Success Rate</dt>
                  <dd className="text-base font-semibold">{agent.config?.successRate ?? '0%'} </dd>
                </div>
              </dl>
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>Avg Duration: {agent.config?.avgDuration ?? '0:00'}</span>
                <span>Last Updated: {agent.created_at ? new Date(agent.created_at).toLocaleDateString() : '—'}</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-600">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Prompt Review</p>
                <p>{agent.prompt ? 'Configured' : 'No prompt configured'}</p>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <Link className="text-indigo-600 hover:underline" href={`/dashboard/ai-agent?agentId=${encodeURIComponent(agent.id)}`}>Edit</Link>
                <button
                  className="text-rose-500 hover:text-rose-700"
                  onClick={() => handleDelete(agent.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
          {filteredAgents.length === 0 && (
            <div className="bg-white border rounded-2xl p-6 text-sm text-muted-foreground">No agents match the selected filter.</div>
          )}
        </div>
      )}
    </div>
  )
}

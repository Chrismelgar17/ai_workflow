"use client"

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ChevronRight } from 'lucide-react'
import styles from '../../app/dashboard/ai-agent/ai-agent.module.css'

type AgentConfig = {
  id: string
  model?: string
  language?: string
  voice?: string
  prompt?: string
}

type AgentListItem = {
  id: string
  name?: string
  provider?: string
  model?: string
}

function ModelDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { value: 'gpt-4o', label: 'GPT 4o' },
    { value: 'gpt-4o-mini', label: 'GPT 4o Mini' },
    { value: 'gpt-3.5-turbo', label: 'GPT 3.5 Turbo' },
  ]
  return (
    <select className="border rounded px-2 py-1" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  )
}

function LanguageDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'es-ES', label: 'Spanish (ES)' },
  ]
  return (
    <select className="border rounded px-2 py-1" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  )
}

export default function AgentsEditor({ showList = true }: { showList?: boolean }) {
  const params = useSearchParams()
  const router = useRouter()
  const agentId = useMemo(() => params.get('agentId') || 'agent_demo', [params])

  const [cfg, setCfg] = useState<AgentConfig>({ id: agentId, model: 'gpt-4o-mini', language: 'en-US', voice: 'alloy', prompt: '' })
  const [saveLabel, setSaveLabel] = useState<string>('Save')
  const [agents, setAgents] = useState<AgentListItem[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // Load list
        const rl = await fetch('/api/agents')
        const lj = await rl.json()
        if (mounted && Array.isArray(lj)) setAgents(lj as AgentListItem[])
        // Load selected config
        const r = await fetch(`/api/agents/${agentId}`)
        const j = await r.json()
        if (!mounted) return
        setCfg((s) => ({ ...s, ...j }))
      } catch {}
    })()
    return () => { mounted = false }
  }, [agentId])

  const save = async () => {
    try {
      setSaveLabel('Saving...')
      const r = await fetch(`/api/agents/${agentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) })
      if (!r.ok) throw new Error('save failed')
      setSaveLabel('Saved')
    } catch {
      setSaveLabel('Error')
    } finally {
      setTimeout(() => setSaveLabel('Save'), 1200)
    }
  }

  const createAgent = async () => {
    try {
      const res = await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New Agent' }) })
      const a: AgentListItem & AgentConfig = await res.json()
      setAgents(prev => [a, ...prev])
      router.replace(`?agentId=${a.id}`)
      setCfg({ id: a.id, model: a.model || 'gpt-4o-mini', language: 'en-US', voice: 'alloy', prompt: '' })
    } catch {}
  }

  const selectAgent = (a: AgentListItem) => {
    router.replace(`?agentId=${a.id}`)
  }

  return (
    <>
      <div className="mb-3 px-6">
        <button type="button" className="text-sm text-indigo-600 hover:underline" onClick={() => history.back()}>◂ Back to agents</button>
      </div>

      <div className="px-6 flex items-center gap-4 mb-3">
        <div className="text-xs">Model</div>
        <ModelDropdown value={cfg.model!} onChange={(v) => setCfg(s => ({ ...s, model: v }))} />
        <div className="text-xs">Language</div>
        <LanguageDropdown value={cfg.language!} onChange={(v) => setCfg(s => ({ ...s, language: v }))} />
      </div>

      <div className={styles.gridMain}>
        {/* Left: Agents list */}
        {showList && (
        <div className={styles.card}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Agents</h2>
              <p className="text-xs text-muted-foreground">Browse and select an agent</p>
            </div>
            <Button onClick={createAgent}>New Agent</Button>
          </div>
          <div className="border rounded">
            {agents.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">No agents yet.</div>
            ) : (
              <ul role="listbox" aria-label="Agents">
                {agents.map(a => (
                  <li key={a.id}>
                    <button
                      role="option"
                      aria-selected={agentId === a.id}
                      className={`w-full text-left px-3 py-2 border-b last:border-0 ${agentId===a.id ? 'bg-muted' : ''}`}
                      onClick={() => selectAgent(a)}
                    >
                      <div className="font-medium text-sm">{a.name || a.id}</div>
                      <div className="text-xs text-muted-foreground">{a.provider || 'openai'} · {a.model || 'gpt-4o-mini'}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        )}

        {/* Middle: Prompt editor */}
        <div className={styles.card}>
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Prompt</h2>
              <p className="text-xs text-muted-foreground">Type a universal prompt for your agent: role, style, objectives.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setCfg(s => ({ ...s, prompt: '' }))}>Clear</Button>
            </div>
          </div>
          <div className={styles.promptBox}>
            <Textarea className={styles.promptArea} rows={12} value={cfg.prompt || ''} onChange={e => setCfg(s => ({ ...s, prompt: e.target.value }))} />
            <button className={styles.saveButton} onClick={save}>{saveLabel}</button>
          </div>
        </div>

        {/* Right: Accordion */}
        <div className={styles.card}>
          <div className={styles.accordion}>
            {['Functions','Knowledge Base','Speech Settings','Call Settings','Post-Call Analysis','Security Settings','Webhook Settings'].map(title => (
              <div key={title} className={styles.accordionItem}>
                <div className={styles.accordionHeader}>{title} <ChevronRight className="w-4 h-4" /></div>
                <div className={styles.accordionContent}>Configure {title.toLowerCase()} for this agent</div>
              </div>
            ))}
          </div>
        </div>

        <aside className={styles.card}>
          <div className={styles.testPanel}>
            <div className={styles.micCircle}>
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">A</div>
            </div>
            <Button className={styles.startBtn}>Start Call</Button>
            <div className="border-t pt-3 text-xs text-muted-foreground w-full">
              <div className="flex justify-between"><span>Voice</span><strong>{cfg.voice}</strong></div>
              <div className="flex justify-between mt-2"><span>Language</span><strong>{cfg.language}</strong></div>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
 

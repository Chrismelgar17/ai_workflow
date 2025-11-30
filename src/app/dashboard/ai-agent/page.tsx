"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react'
import apiClient from '../../../lib/api-client'
import useLlmStream from '../../../lib/use-llm-stream'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { ChevronRight } from 'lucide-react'
import styles from './ai-agent.module.css'

export default function AiAgentPage() {
  const [mode, setMode] = useState<'list' | 'edit'>('list')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>('agent_demo')

  // Editor state
  const [prompt, setPrompt] = useState<string>('Explain the difference between caching and rate limiting in one paragraph.')
  const [model, setModel] = useState<string>('gpt-4o-mini')
  const [language, setLanguage] = useState<string>('en-US')
  const [voice, setVoice] = useState<string>('alloy')
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [ariaAnnouncement, setAriaAnnouncement] = useState<string>('')

  // LLM stream hook
  const { content: streamContent, loading: streamLoading, start: startStream, cancel: cancelStream, chunks } = useLlmStream()
  const [completion, setCompletion] = useState<string>('')
  const [loadingComplete, setLoadingComplete] = useState<boolean>(false)

  const agentId = selectedAgentId ?? 'agent_demo'

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await apiClient.getAgentConfig(agentId)
      if (cfg) {
        if (cfg.prompt) setPrompt(cfg.prompt)
        if (cfg.model) setModel(cfg.model)
        if (cfg.language) setLanguage(cfg.language)
        if (cfg.voice) setVoice(cfg.voice)
      }
    } catch (e) {
      // ignore
    }
  }, [agentId])

  useEffect(() => {
    if (mode === 'edit' && selectedAgentId) loadConfig()
  }, [mode, selectedAgentId, loadConfig])

  useEffect(() => { if (model) setAriaAnnouncement(`Model selected: ${model}`) }, [model])
  useEffect(() => { if (language) setAriaAnnouncement(`Language selected: ${language}`) }, [language])

  // Announce save status for screen readers
  useEffect(() => {
    if (saveStatus) setAriaAnnouncement(saveStatus)
  }, [saveStatus])

  // Autosave minimal fields (debounced)
  useEffect(() => {
    let mounted = true
    const t = setTimeout(async () => {
      try {
        setSaveStatus('Saving...')
        await apiClient.saveAgentConfig(agentId, { model, language })
        if (!mounted) return
        setSaveStatus('Saved')
        setTimeout(() => setSaveStatus(null), 1200)
      } catch (e) {
        if (!mounted) return
        setSaveStatus('Error')
        setTimeout(() => setSaveStatus(null), 1200)
      }
    }, 900)
    return () => { mounted = false; clearTimeout(t) }
  }, [model, language, agentId])

  const saveConfig = async () => {
    setSaveStatus('Saving...')
    try {
      await apiClient.saveAgentConfig(agentId, { prompt, model, language, voice })
      setSaveStatus('Saved')
    } catch (e) {
      setSaveStatus('Error')
    }
    setTimeout(() => setSaveStatus(null), 1500)
  }

  const runCompletion = async () => {
    setLoadingComplete(true)
    try {
      const res = await apiClient.llmComplete({ prompt, model })
      setCompletion(res?.content || '')
    } catch (e) {
      setCompletion('Request failed')
    } finally {
      setLoadingComplete(false)
    }
  }

  // Demo agent list (fallback) and list UI state
  const DEMO_AGENTS = [
    { id: 'agent_demo', name: 'GPT5 Demo Agent', owner: 'Amy', status: 'paused', totalActivity: 2, successRate: '50%', avgDuration: '2:26' },
    { id: 'agent_olivia_inbound', name: 'Lead Manager - Olivia (Active)', owner: 'Olivia', status: 'active', totalActivity: 56, successRate: '18%', avgDuration: '0:20' },
    { id: 'agent_outbound_warm', name: 'OUTBOUND WARM AGENT', owner: 'Jane', status: 'paused', totalActivity: 22, successRate: '9%', avgDuration: '0:30' },
  ]

  const [agents, setAgents] = useState<any[]>(DEMO_AGENTS)
  const [query, setQuery] = useState('')
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let mounted = true
    apiClient.getAgents().then(list => {
      if (!mounted) return
      if (Array.isArray(list) && list.length) setAgents(list)
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  const filtered = agents.filter(a => a.name.toLowerCase().includes(query.toLowerCase()) || (a.owner || '').toLowerCase().includes(query.toLowerCase()))

  const listView = (
    <>
      <div className={styles.headerRow}>
        <div className={styles.titleBlock}>
          <h1>AI Agents</h1>
          <p>Manage your deployed and draft agents</p>
        </div>
        <div className={styles.controls}>
          <Input placeholder="Search agents" value={query} onChange={e => setQuery(e.target.value)} />
          <Button onClick={async () => {
            const id = `agent_${Date.now()}`
            const newAgent = { id, name: 'New Agent', owner: 'You', status: 'draft', totalActivity: 0, successRate: '0%', avgDuration: '0:00' }
            setAgents(prev => [newAgent, ...prev])
            setSelectedAgentId(id)
            setPrompt('')
            setModel('gpt-4o-mini')
            setLanguage('en-US')
            setMode('edit')
            setAriaAnnouncement(`Created new agent ${newAgent.name}`)
            try {
              await apiClient.saveAgentConfig(id, { id, model: 'gpt-4o-mini', language: 'en-US', prompt: '' })
            } catch (e) {
              // ignore save errors for demo/dev
            }
          }}>New Agent</Button>
        </div>
      </div>

      <div ref={listRef} role="listbox" aria-label="AI agents" className="grid grid-cols-3 gap-6">
        {filtered.map((a, i) => (
          <AgentCard
            key={a.id}
            agent={a}
            index={i}
            selected={a.id === selectedAgentId}
            onSelect={() => { setSelectedAgentId(a.id); setAriaAnnouncement(`Selected agent ${a.name}`) }}
            onEdit={() => { setSelectedAgentId(a.id); setMode('edit'); setAriaAnnouncement(`Editing agent ${a.name}`) }}
          />
        ))}
      </div>
    </>
  )

  const editorView = (
    <>
      <div aria-live="polite" className="sr-only">{ariaAnnouncement}</div>
      <div className="mb-4">
        <button type="button" onClick={() => setMode('list')} className="text-sm text-indigo-600 hover:underline">◂ Back to agents</button>
      </div>
      <div className="mt-4">
            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <label className="text-xs">Model</label>
                <ModelDropdown value={model} onChange={setModel} />
              </div>
              <div className={styles.metaItem}>
                <label className="text-xs">Language</label>
                <LanguageDropdown value={language} onChange={setLanguage} />
              </div>
            </div>
          </div>

      <div className={styles.gridMain}>
        <div className={styles.card}>
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Prompt</h2>
              <p className="text-xs text-muted-foreground">Type a universal prompt for your agent: role, style, objectives.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setPrompt('')}>Clear</Button>
            </div>
          </div>

          <div className={styles.promptBox} onMouseDown={(e) => e.stopPropagation()}>
            <Textarea className={styles.promptArea} value={prompt} onChange={e => setPrompt(e.target.value)} rows={14} placeholder="Type your agent prompt here" />
            <button className={styles.saveButton} onClick={saveConfig}>{saveStatus ? saveStatus : 'Save'}</button>
          </div>

          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <label className="text-xs">Voice</label>
              <Input value={voice} onChange={e => setVoice(e.target.value)} />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Button onClick={runCompletion} disabled={loadingComplete || streamLoading || !prompt}>Run Completion</Button>
            <Button onClick={() => startStream(prompt, { model })} disabled={loadingComplete || streamLoading || !prompt}>Stream</Button>
            {streamLoading && <Button onClick={cancelStream} variant="destructive">Cancel Stream</Button>}
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium">Output</label>
            <div className="border rounded p-3 text-sm max-h-[240px] overflow-auto bg-background/50 mt-2">
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

          
        </div>

        <div>
          <div className={styles.card}>
            <div className={styles.accordion}>
              {[
                'Functions',
                'Knowledge Base',
                'Speech Settings',
                'Call Settings',
                'Post-Call Analysis',
                'Security Settings',
                'Webhook Settings'
              ].map((title) => (
                <div key={title} className={styles.accordionItem}>
                  <div className={styles.accordionHeader}>{title} <ChevronRight className="w-4 h-4" /></div>
                  <div className={styles.accordionContent}>Configure {title.toLowerCase()} for this agent</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className={styles.card}>
          <div className={styles.testPanel}>
            <div className={styles.micCircle}>
              <img src={`/assets/ai/voice-${voice}.svg`} alt={voice} className="w-12 h-12 object-contain" />
            </div>
            <Button className={styles.startBtn} onClick={() => { /* stub */ }}>Start Call</Button>
            <div className="border-t pt-3 text-xs text-muted-foreground w-full">
              <div className="flex justify-between"><span>Voice</span><strong>{voice}</strong></div>
              <div className="flex justify-between mt-2"><span>Language</span><strong>{language}</strong></div>
            </div>
          </div>
        </aside>
      </div>
    </>
  )

  const body = mode === 'list' ? listView : editorView

  return (
    <div className="p-6">{body}</div>
  )
}

function AgentCard({ agent, onEdit, selected, onSelect, index }: { agent: any; onEdit: () => void; selected?: boolean; onSelect?: () => void; index?: number }) {
  const ref = useRef<HTMLDivElement | null>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect?.()
      return
    }
    // Arrow navigation within list
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      const next = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement | null
      if (next) next.focus()
      return
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const prev = (e.currentTarget as HTMLElement).previousElementSibling as HTMLElement | null
      if (prev) prev.focus()
      return
    }
  }

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => onSelect?.()}
      className={`border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition focus:outline-none ${selected ? 'ring-2 ring-indigo-500 border-indigo-400' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{agent.owner}</div>
          <h3 className="font-semibold mt-1">{agent.name}</h3>
        </div>
        <div className="text-xs text-muted-foreground">{agent.status}</div>
      </div>

      <div className="mt-3 text-sm">
        <div className="flex items-center justify-between"><span>Total Activity</span><strong>{agent.totalActivity ?? 0} calls</strong></div>
        <div className="flex items-center justify-between mt-1"><span>Success Rate</span><strong>{agent.successRate ?? '0%'}</strong></div>
        <div className="mt-3 text-xs text-muted-foreground">Avg Duration: {agent.avgDuration ?? '0:00'}</div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button size="sm" onClick={e => { e.stopPropagation(); onEdit() }}>Edit</Button>
        <div className="text-xs text-muted-foreground">Last Updated: 11/24/2025</div>
      </div>
    </div>
  )
}

// --- Dropdowns and helpers ---

const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT 4o', color: '#6b21a8', gradient: 'linear-gradient(90deg,#7c3aed,#06b6d4)', icon: '/assets/ai/openai-color.svg' },
  { value: 'gpt-4o-mini', label: 'GPT 4o Mini', color: '#0ea5e9', gradient: 'linear-gradient(90deg,#0ea5e9,#60a5fa)', icon: '/assets/ai/openai-color.svg' },
  { value: 'gpt-3.5-turbo', label: 'GPT 3.5 Turbo', color: '#f97316', gradient: 'linear-gradient(90deg,#fb923c,#f97316)', icon: '/assets/ai/openai-color.svg' },
  // Claude family
  { value: 'claude-2', label: 'Anthropic Claude 2', color: '#111827', gradient: 'linear-gradient(90deg,#111827,#4b5563)', icon: '/assets/ai/claude-color.svg' },
  { value: 'claude-instant', label: 'Claude Instant', color: '#0f766e', gradient: 'linear-gradient(90deg,#0f766e,#2dd4bf)', icon: '/assets/ai/claude-color.svg' },
  // Gemini family
  { value: 'gemini-pro', label: 'Gemini Pro', color: '#7c3aed', gradient: 'linear-gradient(90deg,#7c3aed,#a78bfa)', icon: '/assets/ai/gemini-color.svg' },
  { value: 'gemini-ultra', label: 'Gemini Ultra', color: '#ef4444', gradient: 'linear-gradient(90deg,#ef4444,#f97316)', icon: '/assets/ai/gemini-color.svg' },
]

const LANGUAGE_OPTIONS = [
  { value: 'en-US', label: 'English (US)', flag: '/assets/ai/flag-us.svg' },
  { value: 'en-GB', label: 'English (UK)', flag: '/assets/ai/flag-uk.svg' },
  { value: 'fr-FR', label: 'French', flag: '/assets/ai/flag-fr.svg' },
  { value: 'es-ES', label: 'Spanish (ES)', flag: '/assets/ai/flag-es.svg' },
  { value: 'es-MX', label: 'Spanish (MX)', flag: '/assets/ai/flag-mx.svg' },
  { value: 'de-DE', label: 'German', flag: '/assets/ai/flag-de.svg' },
  { value: 'pt-BR', label: 'Portuguese (BR)', flag: '/assets/ai/flag-br.svg' },
  { value: 'zh-CN', label: 'Chinese (Simplified)', flag: '/assets/ai/flag-cn.svg' },
  { value: 'ja-JP', label: 'Japanese', flag: '/assets/ai/flag-jp.svg' },
  { value: 'ru-RU', label: 'Russian', flag: '/assets/ai/flag-ru.svg' },
]

function getFlagPath(code: string) {
  const found = LANGUAGE_OPTIONS.find(l => l.value === code)
  return found ? found.flag : '/assets/ai/flag-us.svg'
}

function getLanguageLabel(code: string) {
  const found = LANGUAGE_OPTIONS.find(l => l.value === code)
  return found ? found.label : code
}

function ModelDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = MODEL_OPTIONS.find(m => m.value === value) || MODEL_OPTIONS[0]
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  return (
    <div className="relative inline-block">
          <button
            ref={btnRef}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setTimeout(() => listRef.current?.querySelector('button')?.focus(), 0) }}}
            onClick={() => setOpen(v => !v)}
            className="w-full flex items-center gap-2 px-2 py-1 border rounded bg-white"
          >
            {selected.icon ? (
              <img src={selected.icon} alt="" className="w-6 h-4 object-contain flex-shrink-0" aria-hidden />
            ) : (
              <span className="w-6 h-4 rounded-md flex-shrink-0" style={{background: selected.gradient || selected.color}} aria-hidden />
            )}
            <span className="text-sm truncate">{selected.label}</span>
            <span className="ml-2 text-xs">▾</span>
          </button>
      {open && (
        <ul ref={listRef} role="listbox" aria-label="Model options" className="absolute right-0 mt-1 w-48 bg-white border rounded shadow z-50">
          {MODEL_OPTIONS.map(opt => (
            <li key={opt.value} role="option">
              <button type="button" onClick={() => { onChange(opt.value); setOpen(false); btnRef.current?.focus() }} className="w-full text-left px-3 py-2 hover:bg-muted/10 flex items-center gap-3">
                {opt.icon ? (
                  <img src={opt.icon} alt="" className="w-6 h-4 object-contain flex-shrink-0" aria-hidden />
                ) : (
                  <span className="w-6 h-4 rounded-md flex-shrink-0" style={{background: opt.gradient || opt.color}} aria-hidden />
                )}
                <span>{opt.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LanguageDropdown({ value, onChange, compact }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const selected = LANGUAGE_OPTIONS.find(l => l.value === value) || LANGUAGE_OPTIONS[0]
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setTimeout(() => listRef.current?.querySelector('button')?.focus(), 0) }}}
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-2 py-1 border rounded bg-white"
      >
        <img src={selected.flag} alt={selected.label} className="w-5 h-3 object-contain" />
        <span className="text-sm truncate">{compact ? selected.label : selected.label}</span>
        <span className="ml-2 text-xs">▾</span>
      </button>
      {open && (
        <ul ref={listRef} role="listbox" aria-label="Language options" className="absolute right-0 mt-1 w-44 bg-white border rounded shadow z-50 max-h-56 overflow-auto">
          {LANGUAGE_OPTIONS.map(opt => (
            <li key={opt.value} role="option">
              <button type="button" onClick={() => { onChange(opt.value); setOpen(false); btnRef.current?.focus() }} className="w-full text-left px-3 py-2 hover:bg-muted/10 flex items-center gap-2">
                <img src={opt.flag} alt={opt.label} className="w-5 h-3 object-contain" />
                <span className="truncate">{opt.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
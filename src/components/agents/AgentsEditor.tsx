"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image, { type StaticImageData } from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ChevronRight, PhoneCall, Bot } from 'lucide-react'
import styles from '../../app/dashboard/ai-agent/ai-agent.module.css'
import gptIcon from '@/app/images/gpt.svg'
import geminiIcon from '@/app/images/gemini-color.svg'
import claudeIcon from '@/app/images/claude-color.svg'

type AgentConfig = {
  id: string
  name?: string
  provider?: string
  model?: string
  language?: string
  voice?: string
  prompt?: string
  config?: Record<string, any>
}

type AgentListItem = {
  id: string
  name?: string
  provider?: string
  model?: string
}

type DropdownOption = {
  value: string
  label: string
  icon: ReactNode
}

const ensureConfigObject = (value: any): Record<string, any> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, any>
}

function Dropdown({ options, value, onChange }: { options: DropdownOption[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value) ?? options[0]

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex items-center gap-2 border rounded-md px-3 py-1.5 bg-white"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="w-4 h-4">{selected?.icon}</span>
        <span className="text-sm font-medium">{selected?.label}</span>
        <span className="ml-auto text-xs text-muted-foreground">▾</span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-lg"
        >
          {options.map(option => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={value === option.value}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${value === option.value ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <span className="w-4 h-4">{option.icon}</span>
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ModelDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const renderIcon = (src: StaticImageData, alt: string) => (
    <Image src={src} alt={alt} width={24} height={24} className="rounded-full object-cover" />
  )

  const options: DropdownOption[] = [
    { value: 'gpt-4o', label: 'GPT 4o', icon: renderIcon(gptIcon, 'GPT 4o') },
    { value: 'gpt-4o-mini', label: 'GPT 4o Mini', icon: renderIcon(gptIcon, 'GPT 4o Mini') },
    { value: 'gpt-3.5-turbo', label: 'GPT 3.5 Turbo', icon: renderIcon(gptIcon, 'GPT 3.5 Turbo') },
    { value: 'gemini-2.5', label: 'Gemini 2.5 Flash', icon: renderIcon(geminiIcon, 'Gemini logo') },
    { value: 'claude-3.7', label: 'Claude 3.7 Sonnet', icon: renderIcon(claudeIcon, 'Claude logo') },
  ]
  return <Dropdown options={options} value={value} onChange={onChange} />
}

function LanguageDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options: DropdownOption[] = [
    { value: 'en-US', label: 'English (US)', icon: <img src="/assets/ai/flag-us.svg" alt="US flag" className="w-full h-full" /> },
    { value: 'en-GB', label: 'English (UK)', icon: <img src="/assets/ai/flag-uk.svg" alt="UK flag" className="w-full h-full" /> },
    { value: 'es-ES', label: 'Spanish (ES)', icon: <img src="/assets/ai/flag-es.svg" alt="Spain flag" className="w-full h-full" /> },
    { value: 'fr-FR', label: 'French (FR)', icon: <img src="/assets/ai/flag-fr.svg" alt="France flag" className="w-full h-full" /> },
    { value: 'de-DE', label: 'German (DE)', icon: <img src="/assets/ai/flag-de.svg" alt="Germany flag" className="w-full h-full" /> },
    { value: 'it-IT', label: 'Italian (IT)', icon: <img src="/assets/ai/flag-it.svg" alt="Italy flag" className="w-full h-full" /> },
    { value: 'pt-BR', label: 'Portuguese (BR)', icon: <img src="/assets/ai/flag-br.svg" alt="Brazil flag" className="w-full h-full" /> },
    { value: 'jp-JP', label: 'Japanese (JP)', icon: <img src="/assets/ai/flag-jp.svg" alt="Japan flag" className="w-full h-full" /> },
    { value: 'kr-KR', label: 'Korean (KR)', icon: <img src="/assets/ai/flag-kr.svg" alt="South Korea flag" className="w-full h-full" /> },
  ]
  return <Dropdown options={options} value={value} onChange={onChange} />
}

function ProviderDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options: DropdownOption[] = [
    { value: 'openai', label: 'OpenAI (Text)', icon: <Bot className="w-4 h-4" /> },
    { value: 'retell', label: 'Retell (Voice)', icon: <PhoneCall className="w-4 h-4" /> },
  ]
  const selectedValue = options.some(option => option.value === value) ? value : options[0].value
  return <Dropdown options={options} value={selectedValue} onChange={onChange} />
}

export default function AgentsEditor({ showList = true }: { showList?: boolean }) {
  const params = useSearchParams()
  const router = useRouter()
  const agentId = useMemo(() => params.get('agentId') || 'agent_demo', [params])

  const [cfg, setCfg] = useState<AgentConfig>(() => ({
    id: agentId,
    name: 'Agent demo',
    provider: 'openai',
    model: 'gpt-4o-mini',
    language: 'en-US',
    voice: 'alloy',
    prompt: '',
    config: {},
  }))
  const [saveLabel, setSaveLabel] = useState<string>('Save')
  const [agents, setAgents] = useState<AgentListItem[]>([])
  const [testNumber, setTestNumber] = useState<string>('')
  const [callState, setCallState] = useState<'idle' | 'calling' | 'success' | 'error'>('idle')
  const [callMessage, setCallMessage] = useState<string>('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // Load list
        const rl = await fetch('/api/agents')
        const lj = await rl.json()
        if (mounted && Array.isArray(lj)) {
          setAgents((lj as AgentListItem[]).map(item => ({ ...item, provider: item.provider || 'openai' })))
        }
        // Load selected config
        const r = await fetch(`/api/agents/${agentId}`)
        const j = await r.json()
        if (!r.ok) throw new Error(typeof j?.error === 'string' ? j.error : 'Failed to load agent')
        if (!mounted) return
        const normalizedProvider = (j?.provider || 'openai') as string
        const normalizedConfig = ensureConfigObject(j?.config)
        setCfg((s) => ({
          ...s,
          ...j,
          provider: normalizedProvider,
          config: normalizedConfig,
        }))
        const defaultNumber = typeof normalizedConfig.retellDefaultToNumber === 'string' ? normalizedConfig.retellDefaultToNumber : ''
        setTestNumber(defaultNumber)
        setCallState('idle')
        setCallMessage('')
      } catch {}
    })()
    return () => { mounted = false }
  }, [agentId])

  const save = async () => {
    try {
      setSaveLabel('Saving...')
      const payload = { ...cfg, config: ensureConfigObject(cfg.config) }
      const r = await fetch(`/api/agents/${agentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!r.ok) throw new Error('save failed')
      const updated = await r.json()
      setCfg((prev) => ({
        ...prev,
        ...updated,
        provider: (updated?.provider || prev.provider || 'openai') as string,
        config: ensureConfigObject(updated?.config ?? prev.config),
      }))
      setAgents((prev) => prev.map(agent => agent.id === agentId
        ? {
            ...agent,
            name: updated?.name || agent.name,
            provider: updated?.provider || agent.provider,
            model: updated?.model || agent.model,
          }
        : agent))
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
      if (!res.ok) throw new Error('failed')
      const normalizedConfig = ensureConfigObject(a?.config)
      setAgents(prev => [{ ...a, provider: a.provider || 'openai' }, ...prev])
      router.replace(`?agentId=${a.id}`)
      setCfg({
        id: a.id,
        name: a.name || 'New Agent',
        provider: a.provider || 'openai',
        model: a.model || 'gpt-4o-mini',
        language: a.language || 'en-US',
        voice: a.voice || 'alloy',
        prompt: a.prompt || '',
        config: normalizedConfig,
      })
      setTestNumber(typeof normalizedConfig.retellDefaultToNumber === 'string' ? normalizedConfig.retellDefaultToNumber : '')
      setCallState('idle')
      setCallMessage('')
    } catch {}
  }

  const updateConfig = (key: string, value: any) => {
    setCfg(prev => {
      const nextConfig = { ...(prev.config || {}) }
      if (value === '' || value === null || value === undefined) {
        delete nextConfig[key]
      } else {
        nextConfig[key] = value
      }
      return { ...prev, config: nextConfig }
    })
  }

  const handleStartCall = async () => {
    const provider = (cfg.provider || 'openai').toLowerCase()
    if (provider !== 'retell') {
      setCallState('error')
      setCallMessage('Switch the provider to Retell before starting a voice call.')
      return
    }

    const configuredAgentId = typeof cfg.config?.retellAgentId === 'string' ? cfg.config.retellAgentId.trim() : ''
    if (!configuredAgentId) {
      setCallState('error')
      setCallMessage('Set config.retellAgentId before launching a call.')
      return
    }

    const channel = typeof cfg.config?.retellChannel === 'string' ? cfg.config.retellChannel : 'phone'
    const payload: Record<string, any> = { channel }

    if (channel === 'phone') {
      const configuredDefault = typeof cfg.config?.retellDefaultToNumber === 'string' ? cfg.config.retellDefaultToNumber : ''
      const destination = testNumber.trim() || configuredDefault.trim()
      if (!destination) {
        setCallState('error')
        setCallMessage('Enter a destination phone number before starting the call.')
        return
      }
      payload.toPhoneNumber = destination
    }

    const callerId = typeof cfg.config?.retellCallerId === 'string' ? cfg.config.retellCallerId.trim() : ''
    if (callerId) payload.fromPhoneNumber = callerId

    if (cfg.config && typeof cfg.config.retellMetadata === 'object') {
      payload.metadata = cfg.config.retellMetadata
    }

    setCallState('calling')
    setCallMessage('Starting call...')
    try {
      const res = await fetch(`/api/agents/${cfg.id}/voice-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      let data: any = null
      try {
        data = await res.json()
      } catch {
        data = null
      }
      if (!res.ok) {
        const detail = data?.detail || data?.error || 'Call failed'
        throw new Error(typeof detail === 'string' ? detail : 'Call failed')
      }
      const callId = data?.result?.call_id || data?.result?.id || data?.result?.session_id || ''
      const joinUrl = data?.result?.url || data?.result?.join_url || data?.result?.web_url
      if (channel === 'web' && typeof joinUrl === 'string' && joinUrl.length > 0) {
        setCallState('success')
        setCallMessage(`Join link: ${joinUrl}`)
        return
      }
      setCallState('success')
      setCallMessage(callId ? `Call started (ID ${callId}).` : 'Call started.')
    } catch (error: any) {
      setCallState('error')
      setCallMessage(error?.message || 'Unable to start call.')
    }
  }

  useEffect(() => {
    if ((cfg.provider || 'openai').toLowerCase() === 'retell') {
      if (!cfg.config?.retellChannel) {
        setCfg(prev => ({
          ...prev,
          config: { ...(prev.config || {}), retellChannel: 'phone' },
        }))
      }
    } else {
      setCallState('idle')
      setCallMessage('')
    }
  }, [cfg.provider, cfg.config?.retellChannel])

  const selectAgent = (a: AgentListItem) => {
    router.replace(`?agentId=${a.id}`)
  }

  return (
    <>
      <div className="mb-3 px-6">
        <button type="button" className="text-sm text-indigo-600 hover:underline" onClick={() => router.push('/dashboard/agents')}>◂ Back to agents</button>
      </div>

      <div className="px-6 flex flex-col gap-2 mb-3 max-w-sm">
        <label className="text-xs font-semibold" htmlFor="agentName">Agent Name</label>
        <Input
          id="agentName"
          value={cfg.name || ''}
          placeholder="Give your agent a name"
          onChange={e => setCfg(s => ({ ...s, name: e.target.value }))}
        />
      </div>

      <div className="px-6 flex flex-wrap items-center gap-4 mb-3">
        <div className="text-xs">Provider</div>
        <ProviderDropdown
          value={cfg.provider || 'openai'}
          onChange={(v) => setCfg(s => ({ ...s, provider: v }))}
        />
        <div className="text-xs">Model</div>
        <ModelDropdown value={cfg.model!} onChange={(v) => setCfg(s => ({ ...s, model: v }))} />
        <div className="text-xs">Language</div>
        <LanguageDropdown value={cfg.language!} onChange={(v) => setCfg(s => ({ ...s, language: v }))} />
        <Button className="ml-auto" onClick={save}>{saveLabel}</Button>
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
          <div className="mb-3">
            <h2 className="text-lg font-semibold">Configuration</h2>
            <p className="text-xs text-muted-foreground">Provider-specific controls and presets.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold" htmlFor="voicePreset">Voice Preset</label>
              <Input
                id="voicePreset"
                value={cfg.voice || ''}
                placeholder="e.g. alloy"
                onChange={e => setCfg(s => ({ ...s, voice: e.target.value }))}
              />
            </div>

            {(cfg.provider || 'openai').toLowerCase() === 'retell' && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                <div>
                  <h3 className="text-sm font-semibold">Retell Voice Agent</h3>
                  <p className="text-xs text-muted-foreground">Link a Retell Agent ID and optional caller defaults.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold" htmlFor="retellAgentId">Retell Agent ID</label>
                  <Input
                    id="retellAgentId"
                    value={cfg.config?.retellAgentId || ''}
                    placeholder="agt_..."
                    onChange={e => updateConfig('retellAgentId', e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">Copy this value from the Retell dashboard.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold" htmlFor="retellCallerId">Default Caller ID</label>
                  <Input
                    id="retellCallerId"
                    value={cfg.config?.retellCallerId || ''}
                    placeholder="+15551234567"
                    onChange={e => updateConfig('retellCallerId', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold" htmlFor="retellDefaultTo">Default Destination</label>
                  <Input
                    id="retellDefaultTo"
                    value={cfg.config?.retellDefaultToNumber || ''}
                    placeholder="Optional fallback number"
                    onChange={e => updateConfig('retellDefaultToNumber', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold" htmlFor="retellChannel">Call Channel</label>
                  <select
                    id="retellChannel"
                    className="border rounded-md px-3 py-2 text-sm w-full bg-background"
                    value={(cfg.config?.retellChannel as string) || 'phone'}
                    onChange={e => updateConfig('retellChannel', e.target.value)}
                  >
                    <option value="phone">Phone Call</option>
                    <option value="web">Web Call</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className={`${styles.accordion} mt-6`}>
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
            <Input
              value={testNumber}
              onChange={e => setTestNumber(e.target.value)}
              placeholder="Destination phone number"
              disabled={(cfg.provider || 'openai').toLowerCase() !== 'retell' || (cfg.config?.retellChannel || 'phone') !== 'phone'}
            />
            <Button
              className={styles.startBtn}
              onClick={handleStartCall}
              disabled={callState === 'calling' || (cfg.provider || 'openai').toLowerCase() !== 'retell'}
            >
              {callState === 'calling' ? 'Calling...' : 'Start Call'}
            </Button>
            <div className="border-t pt-3 text-xs text-muted-foreground w-full">
              <div className="flex justify-between"><span>Voice</span><strong>{cfg.voice}</strong></div>
              <div className="flex justify-between mt-2"><span>Language</span><strong>{cfg.language}</strong></div>
              <div className="flex justify-between mt-2"><span>Provider</span><strong>{cfg.provider || 'openai'}</strong></div>
            </div>
            {callMessage && (
              <div className={`text-xs mt-2 w-full ${callState === 'success' ? 'text-emerald-600' : callState === 'error' ? 'text-rose-600' : 'text-indigo-600'}`}>
                {callMessage}
              </div>
            )}
            {(cfg.provider || 'openai').toLowerCase() !== 'retell' && (
              <div className="text-[11px] text-muted-foreground mt-2 text-center w-full">
                Switch to the Retell provider to enable voice calling.
              </div>
            )}
            {(cfg.config?.retellChannel || 'phone') === 'web' && (cfg.provider || 'openai').toLowerCase() === 'retell' && (
              <div className="text-[11px] text-muted-foreground mt-2 text-center w-full">
                Web calls will return a join URL after you press Start Call.
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  )
}
 

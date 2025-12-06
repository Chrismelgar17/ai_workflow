"use client"

import React, { memo, useState, useEffect, useRef } from "react"
import { Node, NodeType, AIConfig, NodeActionType, NodeEventType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Play, Square, Zap, GitBranch, Clock, Globe, MessageSquare, Mail, Database, CheckCircle2, AlertCircle, Bot, Settings2, ChevronDown, ChevronRight, Activity, Command } from 'lucide-react'
import styles from './node.module.css'

type ValidationIssue = { level: 'error' | 'warning'; message: string; field?: string }

interface NodeProps {
  node: Node
  isSelected: boolean
  onNodeClick: (id: string, shiftKey: boolean) => void
  onNodeDragStart: (e: React.MouseEvent, id: string) => void
  onPortMouseDown: (e: React.MouseEvent, nodeId: string, type: "input" | "output", handleId?: string) => void
  onNodeDataChange?: (id: string, data: any) => void
  isHighlight?: boolean
  onMeasure?: (id: string, size: { width: number, height: number }) => void
  scale?: number
  validationIssues?: ValidationIssue[]
  onFillAgent?: (nodeId: string) => void
  previewLoading?: boolean
}

const iconMap: Record<string, any> = {
  start: Play,
  end: Square,
  trigger: Zap,
  condition: GitBranch,
  delay: Clock,
  webhook: Globe,
  action: MessageSquare,
  email: Mail,
  database: Database,
  ai: Bot,
}

type AgentSummary = {
  id: string
  name?: string
  model?: string
  prompt?: string
  language?: string
  provider?: string
}

const NodeComponent = ({ 
  node, 
  isSelected, 
  onNodeClick, 
  onNodeDragStart,
  onPortMouseDown,
  onNodeDataChange,
  isHighlight,
  onMeasure,
  scale = 1,
  validationIssues = [],
  onFillAgent,
  previewLoading = false,
}: NodeProps) => {
  const Icon = iconMap[node.data.icon || node.type] || Zap
  const [isExpanded, setIsExpanded] = useState(false)
  const nodeRef = useRef<HTMLDivElement | null>(null)

  const inferProviderFromModel = (model?: string) => {
    if (!model) return undefined
    const normalized = model.toLowerCase()
    if (normalized.startsWith('claude') || normalized.includes('anthropic')) return 'anthropic'
    if (normalized.startsWith('gemini') || normalized.includes('google')) return 'google'
    return 'openai'
  }

  useEffect(() => {
    if (isSelected) setIsExpanded(true)
    else setIsExpanded(false)
  }, [isSelected])

  // Report size to parent canvas so connection anchors can align precisely
  useEffect(() => {
    const el = nodeRef.current
    if (!el) return

    const report = () => {
      try {
        // Use getBoundingClientRect which reflects current layout on screen (includes transforms),
        // then convert into canvas-space by dividing by the current scale.
        const rect = el.getBoundingClientRect()
        const width = (rect.width || el.offsetWidth) / (scale || 1)
        const height = (rect.height || el.offsetHeight) / (scale || 1)
        if (typeof onMeasure === 'function') {
          onMeasure(node.id, { width: Math.round(width), height: Math.round(height) })
        }
      } catch (e) {
        // ignore measurement errors
      }
    }

    const ro = new ResizeObserver(report)
    ro.observe(el)
    // initial report
    report()
    return () => ro.disconnect()
  }, [nodeRef, isExpanded, node.id])

  const actionObj = typeof node.data.action === 'object' ? (node.data.action as any) : undefined

  const handleAIConfigChange = (key: keyof AIConfig, value: any) => {
    if (!onNodeDataChange) return
    const existing: Partial<AIConfig> = node.data.aiConfig || {}
    const currentConfig: AIConfig = {
      model: existing.model || "gpt-4o",
      temperature: typeof existing.temperature === 'number' ? existing.temperature : 0.7,
      maxTokens: typeof existing.maxTokens === 'number' ? existing.maxTokens : 1000,
      prompt: existing.prompt || "",
      evaluateLeadState: Boolean(existing.evaluateLeadState),
      provider: existing.provider || inferProviderFromModel(existing.model),
      language: existing.language || 'en-US'
    }
    const nextConfig: AIConfig = {
      ...currentConfig,
      [key]: value
    }
    if (key === 'model') {
      nextConfig.provider = inferProviderFromModel(String(value))
    }

    onNodeDataChange(node.id, {
      ...node.data,
      aiConfig: nextConfig
    })
  }

  const handleActionChange = (type: NodeActionType) => {
    if (!onNodeDataChange) return
    const currentParams = typeof node.data.action === 'object' ? (node.data.action as any).parameters || {} : {}
    onNodeDataChange(node.id, {
      ...node.data,
      action: {
        type,
        parameters: currentParams
      }
    })
  }

  const handleActionParamChange = (key: string, value: any) => {
    if (!onNodeDataChange) return
    const actionObj = typeof node.data.action === 'object' ? (node.data.action as any) : { parameters: {} }
    onNodeDataChange(node.id, {
      ...node.data,
      action: {
        ...actionObj,
        parameters: {
          ...(actionObj.parameters || {}),
          [key]: value
        }
      }
    })
  }

  const handleEventToggle = (type: NodeEventType) => {
    if (!onNodeDataChange) return
    const currentEvents = node.data.events || []
    const newEvents = currentEvents.includes(type)
      ? currentEvents.filter(e => e !== type)
      : [...currentEvents, type]
    
    onNodeDataChange(node.id, {
      ...node.data,
      events: newEvents
    })
  }

  const aiConfig = node.data.aiConfig || {
    model: "gpt-4o",
    temperature: 0.7,
    maxTokens: 1000,
    prompt: "",
    evaluateLeadState: false,
    provider: 'openai',
    language: 'en-US'
  }

  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)
  const hasError = validationIssues.some(issue => issue.level === 'error')
  const hasWarning = !hasError && validationIssues.some(issue => issue.level === 'warning')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/agents')
        if (!res.ok) throw new Error('Failed to load agents')
        const list: AgentSummary[] = await res.json()
        if (mounted) setAgents(list)
      } catch (error) {
        console.error('Unable to fetch agents', error)
      } finally {
        if (mounted) setAgentsLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const handleAgentSelect = (agentId?: string) => {
    if (!onNodeDataChange) return
    const agent = agents.find(a => a.id === agentId)
    const inferredProvider = agent?.provider || inferProviderFromModel(agent?.model || aiConfig.model)
    onNodeDataChange(node.id, {
      ...node.data,
      agentId,
      aiConfig: {
        ...aiConfig,
        model: agent?.model || aiConfig.model,
        language: agent?.language || aiConfig.language || 'en-US',
        provider: inferredProvider || aiConfig.provider,
      },
    })
  }

  const isCondition = node.type === "condition"
  const outputHandles = isCondition
    ? [
        { id: "output-true", left: "34%", label: "True" },
        { id: "output-false", left: "66%", label: "False" },
      ]
    : [
        { id: "output", left: "50%", label: "" }
      ]

  const renderActionParams = () => {
    const actionObj = typeof node.data.action === 'object' ? (node.data.action as any) : undefined
    const type = actionObj?.type
    if (!type) return null

    switch (type) {
      case "send_message":
        return (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
            <input 
              className="w-full bg-secondary/50 rounded-md border border-border p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
              placeholder="Recipient ID"
              value={actionObj?.parameters?.recipient_id || ""}
              onChange={(e) => handleActionParamChange("recipient_id", e.target.value)}
            />
            <textarea 
              className="w-full h-16 bg-secondary/50 rounded-md border border-border p-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
              placeholder="Message content..."
              value={actionObj?.parameters?.message_content || ""}
              onChange={(e) => handleActionParamChange("message_content", e.target.value)}
            />
          </div>
        )
      case "send_email":
        return (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
            <input 
              className="w-full bg-secondary/50 rounded-md border border-border p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
              placeholder="To Email"
              value={actionObj?.parameters?.to_email || ""}
              onChange={(e) => handleActionParamChange("to_email", e.target.value)}
            />
            <input 
              className="w-full bg-secondary/50 rounded-md border border-border p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
              placeholder="Subject"
              value={actionObj?.parameters?.subject || ""}
              onChange={(e) => handleActionParamChange("subject", e.target.value)}
            />
            <textarea 
              className="w-full h-20 bg-secondary/50 rounded-md border border-border p-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
              placeholder="Email body..."
              value={actionObj?.parameters?.body || ""}
              onChange={(e) => handleActionParamChange("body", e.target.value)}
            />
          </div>
        )
      case "http_request":
        return (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
            <div className="flex gap-2">
              <select 
                className="w-20 bg-secondary/50 rounded-md border border-border p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                value={actionObj?.parameters?.method || "GET"}
                onChange={(e) => handleActionParamChange("method", e.target.value)}
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
              </select>
              <input 
                className="flex-1 bg-secondary/50 rounded-md border border-border p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                placeholder="https://api.example.com/..."
                value={actionObj?.parameters?.url || ""}
                onChange={(e) => handleActionParamChange("url", e.target.value)}
              />
            </div>
          </div>
        )
      default:
        return (
          <div className="animate-in fade-in slide-in-from-top-1">
             <textarea 
              className="w-full h-16 bg-secondary/50 rounded-md border border-border p-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50 font-mono"
              placeholder={`Parameters for ${type} (JSON)`}
              value={actionObj?.parameters?.custom_payload || ""}
              onChange={(e) => handleActionParamChange("custom_payload", e.target.value)}
            />
          </div>
        )
    }
  }

  return (
    <div
      ref={nodeRef}
      className={cn(
        styles.nodeRoot,
        "absolute flex flex-col transition-all duration-200 group",
        hasError ? "border-red-400 ring-2 ring-red-400" : hasWarning ? "border-amber-300 ring-1 ring-amber-300" : "",
        isSelected ? (hasError || hasWarning ? "z-20" : "ring-1 ring-primary border-primary z-20") : "z-10",
        isHighlight && "ring-1 ring-blue-300",
        "hover:shadow-md",
        isExpanded ? "w-96" : "w-64 h-20"
      )}
      style={{
        transform: `translate(${(node.position?.x ?? 0)}px, ${(node.position?.y ?? 0)}px)`,
        cursor: "grab",
      }}
      onClick={(e) => {
        e.stopPropagation()
        onNodeClick(node.id, e.shiftKey)
      }}
      onMouseDown={(e) => onNodeDragStart(e, node.id)}
    >
      {(hasError || hasWarning) && (
        <div
          className={cn(
            "absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full shadow",
            hasError ? "bg-red-500 text-white" : "bg-amber-400 text-black"
          )}
          title={validationIssues.map(i => i.message).join('\n')}
        >
          <AlertCircle className="h-3.5 w-3.5" />
        </div>
      )}
      {/* Input Port (Top center) */}
      {node.type !== "start" && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-3 w-6 h-6 flex items-center justify-center cursor-crosshair z-10"
          onMouseDown={(e) => {
            e.stopPropagation()
            onPortMouseDown(e, node.id, "input", "input")
          }}
        >
          <div className="w-3 h-3 bg-muted-foreground/50 rounded-full border-2 border-background hover:bg-primary hover:scale-110 transition-transform" />
        </div>
      )}

      {/* Node Header */}
      <div className={cn(styles.header, "shrink-0") }>
        <div className={cn(
          styles.iconBox,
          "flex items-center justify-center transition-colors",
          node.type === "start" ? "bg-green-100 text-green-600" :
          node.type === "end" ? "bg-red-100 text-red-600" :
          node.type === "condition" ? "bg-orange-100 text-orange-600" :
          "bg-secondary text-primary"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate text-foreground">
            {node.data.label}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {node.data.description || node.type}
          </p>
        </div>
        <button 
          className="p-1 hover:bg-muted rounded-md text-muted-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className={cn(styles.content, "animate-in slide-in-from-top-2 fade-in duration-200 cursor-default space-y-4")} onMouseDown={(e) => e.stopPropagation()}>
          <div className={styles.divider} />
          {validationIssues.length > 0 && (
            <div
              className={cn(
                "space-y-1 rounded-md border border-dashed p-2 text-xs",
                hasError ? "border-red-200/80 bg-red-50/70 text-red-700" : "border-amber-200/80 bg-amber-50/70 text-amber-700"
              )}
            >
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                <AlertCircle className="h-3 w-3" />
                Validation
              </div>
              <ul className="space-y-1">
                {validationIssues.map((issue, idx) => (
                  <li key={`${issue.level}-${idx}`} className={issue.level === 'warning' ? 'text-amber-700' : 'text-red-700'}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Command className="w-3.5 h-3.5" />
              Action
            </div>
            <select 
              className={cn(styles.fieldInput, "w-full text-sm")}
              value={actionObj?.type || ""}
              onChange={(e) => handleActionChange(e.target.value as NodeActionType)}
            >
              <option value="" disabled>Select Action Type...</option>
              <option value="send_message">Send Message</option>
              <option value="send_email">Send Email</option>
              <option value="update_lead">Update Lead</option>
              <option value="classify_text">Classify Text</option>
              <option value="fetch_data">Fetch Data</option>
              <option value="http_request">HTTP Request</option>
              <option value="route_condition">Route Condition</option>
              <option value="wait_for_event">Wait For Event</option>
              <option value="transform_content">Transform Content</option>
              <option value="evaluate_lead_state">Evaluate Lead State</option>
            </select>
            
            {renderActionParams()}
          </div>

          <div className={styles.divider} />

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Activity className="w-3.5 h-3.5" />
              Events
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "on_enter", label: "On Enter" },
                { id: "on_exit", label: "On Exit" },
                { id: "on_error", label: "On Error" },
                { id: "on_ai_decision", label: "AI Decision" },
              ].map((event) => (
                <label key={event.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-secondary/50 cursor-pointer border border-transparent hover:border-border transition-colors">
                  <div className={cn(
                    "w-3 h-3 rounded border flex items-center justify-center transition-colors",
                    (node.data.events || []).includes(event.id as NodeEventType)
                      ? "bg-primary border-primary"
                      : "border-muted-foreground"
                  )}>
                    {(node.data.events || []).includes(event.id as NodeEventType) && (
                      <div className="w-1.5 h-1.5 bg-background rounded-sm" />
                    )}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden"
                    checked={(node.data.events || []).includes(event.id as NodeEventType)}
                    onChange={() => handleEventToggle(event.id as NodeEventType)}
                  />
                  <span className="text-[10px] text-muted-foreground font-medium">{event.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="h-px w-full bg-border" />

          {/* AI Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <Bot className="w-3.5 h-3.5" />
                AI Agent
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Config</span>
                <Settings2 className="w-3 h-3 text-muted-foreground" />
              </div>
            </div>

            {/* Prompt Box */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Internal Prompt</label>
              <textarea 
                className="w-full h-24 bg-secondary/50 rounded-lg border border-border p-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50 font-mono"
                placeholder="Describe the AI logic for this node... (e.g., 'Analyze the lead score and determine if we should send a discount')"
                value={aiConfig.prompt}
                onChange={(e) => handleAIConfigChange("prompt", e.target.value)}
              />
            </div>

            {/* Controls Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Model</label>
                <select 
                  className={cn(styles.fieldInput, "w-full text-sm")}
                  value={aiConfig.model}
                  onChange={(e) => handleAIConfigChange("model", e.target.value)}
                >
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Temp: {aiConfig.temperature}</label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1"
                  className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                  value={aiConfig.temperature}
                  onChange={(e) => handleAIConfigChange("temperature", parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Language</label>
              <input
                className={cn(styles.fieldInput, "w-full text-sm")}
                placeholder="e.g. en-US"
                value={aiConfig.language || ''}
                onChange={(e) => handleAIConfigChange("language", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <span>Agent</span>
                {agentsLoading && <span className="text-[9px] text-muted-foreground">Loading…</span>}
              </div>
              <div className="relative">
                <select
                  className={cn(styles.fieldInput, "w-full text-sm pr-8")}
                  value={node.data.agentId || ""}
                  onChange={(e) => handleAgentSelect(e.target.value || undefined)}
                >
                  <option value="">Custom prompt</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name || agent.id}</option>
                  ))}
                </select>
                <span className="absolute inset-y-0 right-2 flex items-center text-[10px] text-muted-foreground">▾</span>
              </div>
            </div>

            {/* Lead State Toggle */}
            <div className="flex items-center justify-between p-2 rounded-lg">
              <span className="text-sm text-muted-foreground">Evaluate Lead State</span>
              <button 
                className={cn(
                  styles.toggle,
                  aiConfig.evaluateLeadState ? styles.toggleOn : ''
                )}
                onClick={() => handleAIConfigChange("evaluateLeadState", !aiConfig.evaluateLeadState)}
                aria-pressed={aiConfig.evaluateLeadState}
              >
                <div className={styles.toggleThumb} />
              </button>
            </div>

            <div className="space-y-2">
              <button
                className="w-full px-3 py-2 text-xs font-semibold border border-border rounded-md bg-background hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={(e) => {
                  e.stopPropagation()
                  onFillAgent?.(node.id)
                }}
                disabled={!onFillAgent || !node.data.agentId || previewLoading}
                title={!node.data.agentId ? 'Select an agent to enable autofill' : undefined}
              >
                {previewLoading ? 'Filling content…' : 'Fill Message Body'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Output Port (Bottom center) */}
      {node.type !== "end" && (
        <>
          {outputHandles.map(handle => (
            <div
              key={handle.id}
              className="absolute -bottom-6 flex flex-col items-center justify-center gap-1 cursor-crosshair z-10"
              style={{ left: handle.left, transform: "translateX(-50%)" }}
              onMouseDown={(e) => {
                e.stopPropagation()
                onPortMouseDown(e, node.id, "output", handle.id)
              }}
              title={handle.label ? `${handle.label} branch` : undefined}
            >
              <div className="w-3 h-3 bg-muted-foreground/50 rounded-full border-2 border-background hover:bg-primary hover:scale-125 transition-all" />
              {handle.label && (
                <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{handle.label}</span>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export default memo(NodeComponent)

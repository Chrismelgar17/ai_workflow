"use client"

import React, { memo, useState, useEffect } from "react"
import { Node, NodeType, AIConfig, NodeActionType, NodeEventType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Play, Square, Zap, GitBranch, Clock, Globe, MessageSquare, Mail, Database, CheckCircle2, AlertCircle, Bot, Settings2, ChevronDown, ChevronRight, Activity, Command } from 'lucide-react'

interface NodeProps {
  node: Node
  isSelected: boolean
  onNodeClick: (id: string, shiftKey: boolean) => void
  onNodeDragStart: (e: React.MouseEvent, id: string) => void
  onPortMouseDown: (e: React.MouseEvent, nodeId: string, type: "input" | "output") => void
  onNodeDataChange?: (id: string, data: any) => void
  isHighlight?: boolean
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

const NodeComponent = ({ 
  node, 
  isSelected, 
  onNodeClick, 
  onNodeDragStart,
  onPortMouseDown,
  onNodeDataChange,
  isHighlight 
}: NodeProps) => {
  const Icon = iconMap[node.data.icon || node.type] || Zap
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (isSelected) setIsExpanded(true)
    else setIsExpanded(false)
  }, [isSelected])

  const handleAIConfigChange = (key: keyof AIConfig, value: any) => {
    if (!onNodeDataChange) return
    const currentConfig = node.data.aiConfig || {
      model: "gpt-4o",
      temperature: 0.7,
      maxTokens: 1000,
      prompt: "",
      evaluateLeadState: false
    }
    
    onNodeDataChange(node.id, {
      ...node.data,
      aiConfig: {
        ...currentConfig,
        [key]: value
      }
    })
  }

  const handleActionChange = (type: NodeActionType) => {
    if (!onNodeDataChange) return
    onNodeDataChange(node.id, {
      ...node.data,
      action: {
        type,
        parameters: node.data.action?.parameters || {}
      }
    })
  }

  const handleActionParamChange = (key: string, value: any) => {
    if (!onNodeDataChange) return
    onNodeDataChange(node.id, {
      ...node.data,
      action: {
        ...node.data.action,
        parameters: {
          ...node.data.action?.parameters,
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
    evaluateLeadState: false
  }

  const renderActionParams = () => {
    const type = node.data.action?.type
    if (!type) return null

    switch (type) {
      case "send_message":
        return (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
            <input 
              className="w-full bg-secondary/50 rounded-md border border-border p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
              placeholder="Sender Telephone (E.164, e.g. +15555550123)"
              value={node.data.action?.parameters?.sender_phone || ""}
              onChange={(e) => handleActionParamChange("sender_phone", e.target.value)}
            />
            <input 
              className="w-full bg-secondary/50 rounded-md border border-border p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
              placeholder="Recipient ID"
              value={node.data.action?.parameters?.recipient_id || ""}
              onChange={(e) => handleActionParamChange("recipient_id", e.target.value)}
            />
            <textarea 
              className="w-full h-16 bg-secondary/50 rounded-md border border-border p-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
              placeholder="Message content..."
              value={node.data.action?.parameters?.message_content || ""}
              onChange={(e) => handleActionParamChange("message_content", e.target.value)}
            />
          </div>
        )
      case "send_email":
        return (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
            <input 
              className="w-full bg-secondary/50 rounded-md border border-border p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
              placeholder="From Email"
              value={node.data.action?.parameters?.from_email || ""}
              onChange={(e) => handleActionParamChange("from_email", e.target.value)}
            />
            <input 
              className="w-full bg-secondary/50 rounded-md border border-border p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
              placeholder="To Email"
              value={node.data.action?.parameters?.to_email || ""}
              onChange={(e) => handleActionParamChange("to_email", e.target.value)}
            />
            <input 
              className="w-full bg-secondary/50 rounded-md border border-border p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
              placeholder="Subject"
              value={node.data.action?.parameters?.subject || ""}
              onChange={(e) => handleActionParamChange("subject", e.target.value)}
            />
            <textarea 
              className="w-full h-20 bg-secondary/50 rounded-md border border-border p-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
              placeholder="Email body..."
              value={node.data.action?.parameters?.body || ""}
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
                value={node.data.action?.parameters?.method || "GET"}
                onChange={(e) => handleActionParamChange("method", e.target.value)}
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
              </select>
              <input 
                className="flex-1 bg-secondary/50 rounded-md border border-border p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                placeholder="https://api.example.com/..."
                value={node.data.action?.parameters?.url || ""}
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
              value={node.data.action?.parameters?.custom_payload || ""}
              onChange={(e) => handleActionParamChange("custom_payload", e.target.value)}
            />
          </div>
        )
    }
  }

  return (
    <div
      className={cn(
        "absolute flex flex-col bg-card rounded-2xl shadow-sm border border-border transition-all duration-200 group",
        isSelected ? "ring-2 ring-primary border-primary shadow-md z-20" : "z-10",
        isHighlight && "ring-2 ring-blue-400 border-blue-400 shadow-blue-100",
        "hover:shadow-md hover:border-primary/50",
        isExpanded ? "w-96" : "w-64 h-20"
      )}
      style={{
        transform: `translate(${node.position.x}px, ${node.position.y}px)`,
        cursor: "grab",
      }}
      onClick={(e) => {
        e.stopPropagation()
        onNodeClick(node.id, e.shiftKey)
      }}
      onMouseDown={(e) => onNodeDragStart(e, node.id)}
    >
      {/* Input Port */}
      {node.type !== "start" && (
        <div
          className="absolute -left-3 top-5 -translate-y-1/2 w-6 h-6 flex items-center justify-center cursor-crosshair z-10"
          onMouseDown={(e) => {
            e.stopPropagation()
            onPortMouseDown(e, node.id, "input")
          }}
        >
          <div className="w-3 h-3 bg-muted-foreground/50 rounded-full border-2 border-background hover:bg-primary hover:scale-125 transition-all" />
        </div>
      )}

      {/* Node Header */}
      <div className="p-4 flex items-center gap-3 h-20 shrink-0">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
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
        <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 fade-in duration-200 cursor-default space-y-4" onMouseDown={(e) => e.stopPropagation()}>
          <div className="h-px w-full bg-border" />
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Command className="w-3.5 h-3.5" />
              Action
            </div>
            <select 
              className="w-full bg-secondary/50 rounded-md border border-border p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
              value={node.data.action?.type || ""}
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

          <div className="h-px w-full bg-border" />

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
                  className="w-full bg-secondary/50 rounded-md border border-border p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                  value={aiConfig.model}
                  onChange={(e) => handleAIConfigChange("model", e.target.value)}
                >
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="claude-3-opus">Claude 3 Opus</option>
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

            {/* Lead State Toggle */}
            <div className="flex items-center justify-between bg-secondary/30 p-2 rounded-lg border border-border/50">
              <span className="text-xs text-muted-foreground">Evaluate Lead State</span>
              <button 
                className={cn(
                  "w-8 h-4 rounded-full transition-colors relative",
                  aiConfig.evaluateLeadState ? "bg-primary" : "bg-muted"
                )}
                onClick={() => handleAIConfigChange("evaluateLeadState", !aiConfig.evaluateLeadState)}
              >
                <div className={cn(
                  "absolute top-0.5 left-0.5 w-3 h-3 bg-background rounded-full transition-transform shadow-sm",
                  aiConfig.evaluateLeadState ? "translate-x-4" : "translate-x-0"
                )} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Output Port */}
      {node.type !== "end" && (
        <div
          className="absolute -right-3 top-10 -translate-y-1/2 w-6 h-6 flex items-center justify-center cursor-crosshair z-10"
          onMouseDown={(e) => {
            e.stopPropagation()
            onPortMouseDown(e, node.id, "output")
          }}
        >
          <div className="w-3 h-3 bg-muted-foreground/50 rounded-full border-2 border-background hover:bg-primary hover:scale-125 transition-all" />
        </div>
      )}
    </div>
  )
}

export default memo(NodeComponent)

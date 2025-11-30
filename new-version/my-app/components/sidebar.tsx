"use client"

import React from "react"
import { NodeType } from "@/lib/types"
import { Play, Square, Zap, GitBranch, Clock, Globe, MessageSquare, Mail, Database, GripVertical } from 'lucide-react'

const nodeTypes: { type: NodeType; label: string; icon: any; description: string }[] = [
  { type: "trigger", label: "Webhook Trigger", icon: Zap, description: "Start on request" },
  { type: "action", label: "Send Email", icon: Mail, description: "Send via SMTP" },
  { type: "condition", label: "If / Else", icon: GitBranch, description: "Branch logic" },
  { type: "delay", label: "Delay", icon: Clock, description: "Wait for time" },
  { type: "webhook", label: "HTTP Request", icon: Globe, description: "Call external API" },
  { type: "action", label: "Database Query", icon: Database, description: "SQL / NoSQL" },
  { type: "action", label: "Slack Message", icon: MessageSquare, description: "Post to channel" },
  { type: "end", label: "End Workflow", icon: Square, description: "Terminate process" },
]

export function Sidebar() {
  const onDragStart = (event: React.DragEvent, type: NodeType, label: string) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify({ type, label }))
    event.dataTransfer.effectAllowed = "move"
  }

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full z-20 shadow-sm">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg tracking-tight">Components</h2>
        <p className="text-xs text-muted-foreground">Drag nodes to the canvas</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {nodeTypes.map((node, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl cursor-grab hover:border-primary/50 hover:shadow-sm transition-all active:cursor-grabbing group"
            draggable
            onDragStart={(e) => onDragStart(e, node.type, node.label)}
          >
            <div className="text-muted-foreground group-hover:text-primary transition-colors">
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-primary shrink-0">
              <node.icon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-medium leading-none mb-1">{node.label}</div>
              <div className="text-[10px] text-muted-foreground">{node.description}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border bg-muted/30">
        <div className="text-xs text-muted-foreground text-center">
          v1.0.0 • Auto-save enabled
        </div>
      </div>
    </aside>
  )
}

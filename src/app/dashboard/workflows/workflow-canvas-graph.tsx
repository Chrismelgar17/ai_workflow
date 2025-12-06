"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/label-badge"
// Removed Select components in favor of button groups for Service & Event
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Zap,
  Mail,
  Database,
  Webhook,
  MessageSquare,
  CreditCard,
  FileText,
  Bell,
  Calendar,
  Code,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  MinusCircle,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import apiClient from "@/lib/api-client"
import { cn } from "@/lib/utils"
import useWorkflowCanvasStore from "@/stores/workflow-canvas-store"
import { Node, Connection } from "@/lib/types"

interface WorkflowCanvasProps {
  workflowId: string | null
  onBack: () => void
}

export function WorkflowCanvas({ workflowId, onBack }: WorkflowCanvasProps) {
  const id = useMemo(() => workflowId || "demo-canvas", [workflowId])
  const store = useWorkflowCanvasStore()
  const data = useWorkflowCanvasStore((s) => s.byId[id])

  useEffect(() => {
    store.init(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const workflowName = data?.name ?? "Untitled Workflow"
  const workflowStatus = (data?.status ?? "draft") as "draft" | "active"
  const steps = (data?.steps ?? []) as Node[]
  const connections = (data?.connections ?? []) as Connection[]
  const setWorkflowName = (name: string) => store.setName(id, name)
  const setWorkflowStatus = (status: "draft" | "active") => store.setStatus(id, status)
  const setSteps = (v: Node[]) => store.setSteps(id, v)
  const setConnections = (v: Connection[]) => store.setConnections(id, v)
  const [isDeploying, setIsDeploying] = useState(false)
  const [testRunning, setTestRunning] = useState(false)
  const [defaultSenders, setDefaultSenders] = useState<{ messagingSender: string; smsSender: string; emailSender: string } | null>(null)
  const [testErrors, setTestErrors] = useState<Array<{ stepId: string; field?: string; message: string; level: 'error'|'warning' }>>([])
  const [lastRun, setLastRun] = useState<null | { counts: { triggers: number; schedules: number }; executions: Array<{ stepId: string; type: string; status: 'success'|'error'|'skipped'; result?: any; error?: any }> }>(null)
  const [selectedStep, setSelectedStep] = useState<string | null>("step-1")
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null)

  const getServiceIcon = (service: string) => {
    switch (service) {
      case "webhook":
        return <Webhook className="h-5 w-5" />
      case "email":
        return <Mail className="h-5 w-5" />
      case "database":
        return <Database className="h-5 w-5" />
      case "messaging":
        return <MessageSquare className="h-5 w-5" />
      case "payment":
        return <CreditCard className="h-5 w-5" />
      case "document":
        return <FileText className="h-5 w-5" />
      case "notification":
        return <Bell className="h-5 w-5" />
      case "scheduler":
        return <Calendar className="h-5 w-5" />
      case "api":
        return <Code className="h-5 w-5" />
      default:
        return <Zap className="h-5 w-5" />
    }
  }

  const getServiceName = (service: string) => {
    const names: Record<string, string> = {
      webhook: "HTTP Webhook",
      email: "Email Service",
      database: "Database",
      messaging: "Messaging Service",
      payment: "Payment Service",
      document: "Document Service",
      notification: "Notification Service",
      scheduler: "Scheduler",
      api: "API Service",
    }
    return names[service] || service
  }

  const defaultActionForService: Record<string, string> = {
    webhook: "Form Submission Created",
    email: "Send Email",
    database: "Create Record",
    messaging: "Send Message",
    payment: "Create Payment",
    document: "Generate PDF",
    notification: "Send Push Notification",
    scheduler: "Schedule Task",
    api: "Call API Endpoint",
  }

  // Actions per service for the Event buttons
  const actionsForService = (svc: string): string[] => {
    switch (svc) {
      case "webhook":
        return ["Form Submission Created", "HTTP Request Received", "Webhook Triggered"]
      case "email":
        return ["Send Email", "Send Template Email", "Email Received"]
      case "database":
        return ["Create Record", "Update Record", "Find Records"]
      case "messaging":
        return ["Send Message", "Create Channel", "Post Update"]
      case "payment":
        return ["Create Payment", "Create Customer", "Process Refund"]
      case "document":
        return ["Generate PDF", "Parse Document", "Convert Format"]
      case "notification":
        return ["Send Push Notification", "Send SMS", "Send Alert"]
      case "scheduler":
        return ["Schedule Task", "Delay Execution", "Every Hour"]
      case "api":
        return ["Call API Endpoint", "Transform Data", "Validate Response"]
      default:
        return []
    }
  }

  const addStepAt = (afterStepId: string | null) => {
    const newStep: any = {
      id: `step-${Date.now()}`,
      type: "action",
      service: "",
      action: "Select the event",
      config: {},
      status: "incomplete",
    }

    if (afterStepId === null) {
      // Add at the end
      setSteps([...steps, newStep])
      if (steps.length > 0) {
        const lastStep = steps[steps.length - 1]
        const newConnection: Connection = {
          id: `conn-${Date.now()}`,
          source: lastStep.id,
          target: newStep.id,
          sourceHandle: "output",
          targetHandle: "input",
        }
        setConnections([...connections, newConnection])
      }
    } else {
      // Insert after specific step
      const index = steps.findIndex((s) => s.id === afterStepId)
      const newSteps = [...steps]
      newSteps.splice(index + 1, 0, newStep)
      setSteps(newSteps)

      // Update connections
      const existingConnection = connections.find((c) => c.source === afterStepId)
      if (existingConnection) {
        // Update existing connection to point to new step
        setConnections([
          ...connections.filter((c) => c.id !== existingConnection.id),
          { ...existingConnection, target: newStep.id },
          {
            id: `conn-${Date.now()}`,
            source: newStep.id,
            target: existingConnection.target,
            sourceHandle: existingConnection.sourceHandle || "output",
            targetHandle: existingConnection.targetHandle || "input",
          },
        ])
      } else {
        // Create new connection
        setConnections([
          ...connections,
          {
            id: `conn-${Date.now()}`,
            source: afterStepId,
            target: newStep.id,
            sourceHandle: "output",
            targetHandle: "input",
          },
        ])
      }
    }

    setSelectedStep(newStep.id)
    setSelectedConnection(null)
  }

  const removeStep = (stepId: string) => {
    const stepIndex = steps.findIndex((s) => s.id === stepId)
    if (stepIndex === 0) return // Can't remove trigger

    const newSteps = steps.filter((s) => s.id !== stepId)
    setSteps(newSteps)

    // Update connections
    const incomingConn = connections.find((c) => c.target === stepId)
    const outgoingConn = connections.find((c) => c.source === stepId)

    const newConnections = connections.filter((c) => c.source !== stepId && c.target !== stepId)

    if (incomingConn && outgoingConn) {
      // Bridge the gap
      newConnections.push({
        id: `conn-${Date.now()}`,
        source: incomingConn.source,
        target: outgoingConn.target,
        sourceHandle: incomingConn.sourceHandle || "output",
        targetHandle: outgoingConn.targetHandle || "input",
        description: incomingConn.description || outgoingConn.description,
      })
    }

    setConnections(newConnections)
    if (selectedStep === stepId) setSelectedStep(null)
  }

  const updateStep = (stepId: string, updates: Partial<Node>) => {
    setSteps(steps.map((step) => (step.id === stepId ? { ...step, ...updates } : step)))
  }

  const updateConnection = (connectionId: string, description: string) => {
    setConnections(connections.map((conn) => (conn.id === connectionId ? { ...conn, description } : conn)))
  }

  const selectedStepData = steps.find((s) => s.id === selectedStep)
  const selectedConnectionData = connections.find((c) => c.id === selectedConnection)

  const handleDeploy = async () => {
    try {
      setIsDeploying(true)
      const flowId = id || `flow_${Date.now()}`
      // Validate before run
      const result = validateWorkflow()
      if (!result.ok) {
        // Mark statuses and show toast same as test run
        const errorIds = new Set(result.errors.filter(e => e.level === 'error').map(e => e.stepId))
        const newSteps = steps.map(s => errorIds.has(s.id) ? { ...s, status: 'error' as const } : { ...s, status: 'configured' as const })
        setSteps(newSteps)
        import('sonner').then(({ toast }) => {
          const errorCount = result.errors.filter(e=>e.level==='error').length
          const warnCount = result.warnings
          toast.error(`Fix validation issues: ${errorCount} error${errorCount!==1?'s':''}${warnCount>0?`, ${warnCount} warning${warnCount!==1?'s':''}`:''}`)
        })
        return
      }
      // Run flow: load triggers
      const payload = { steps, connections }
      try {
        const ran = await apiClient.runFlow(flowId, payload)
        setLastRun({ counts: ran.counts, executions: (ran as any).executions || [] })
        setWorkflowStatus("active")
        import('sonner').then(({ toast }) => {
          toast.success('Flow started', { description: `Loaded ${ran.counts.triggers} trigger(s) and ${ran.counts.schedules} schedule(s).` })
          const skipped = ((ran as any).executions || []).filter((e: any) => e.status === 'skipped')
          if (skipped.length > 0) {
            toast.warning(`Some actions were skipped`, {
              description: `Configure provider keys/connections or missing fields. Skipped: ${skipped.length}`
            })
          }
        })
      } catch (err: any) {
        const status = err?.response?.status
        if (status === 404) {
          import('sonner').then(({ toast }) => {
            toast.error('Backend missing /run endpoint', { description: 'Rebuild and restart the API container to pick up the new route.' })
          })
        }
        throw err
      }
    } catch (e) {
      // Best-effort: in demo mode this always succeeds, otherwise keep draft
    } finally {
      setIsDeploying(false)
    }
  }

  const validateWorkflow = () => {
  const errors: Array<{ stepId: string; field?: string; message: string; level: 'error'|'warning' }> = []
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
    const phoneRegex = /^\+?[0-9]{7,15}$/

    // Basic structural checks
    if (steps.length === 0) {
      errors.push({ stepId: 'global', message: 'Workflow has no steps', level: 'error' })
    }
    const trigger = steps[0]
    if (trigger?.type !== 'trigger') {
      errors.push({ stepId: trigger?.id || 'global', message: 'First step must be a trigger', level: 'error' })
    }

    // Map for inbound connections
    const inboundCounts: Record<string, number> = {}
    connections.forEach(c => { inboundCounts[c.target] = (inboundCounts[c.target] || 0) + 1 })

    steps.forEach(step => {
      // Non-trigger should have at least one inbound connection
      if (step.type === 'action' && !inboundCounts[step.id]) {
        errors.push({ stepId: step.id, message: 'Action step has no incoming connection', level: 'error' })
      }
      // Messaging/email validations
      const isMessaging = (step.service === 'messaging' && step.action === 'Send Message')
        || (step.service === 'notification' && step.action === 'Send SMS')
        || (step.service === 'email' && (step.action === 'Send Email' || step.action === 'Send Template Email'))
      if (isMessaging) {
        const cfg: any = step.config || {}
        // Sender intentionally ignored for test run validation
        if (!cfg.receiver) errors.push({ stepId: step.id, field: 'receiver', message: 'Receiver is required', level: 'error' })
        if (!cfg.body) errors.push({ stepId: step.id, field: 'body', message: 'Message body is required', level: 'error' })
        if (step.service === 'email') {
          if (cfg.receiver && !emailRegex.test(cfg.receiver)) errors.push({ stepId: step.id, field: 'receiver', message: 'Invalid email address', level: 'error' })
        } else {
          // Treat as phone if not email
          if (cfg.receiver && !emailRegex.test(cfg.receiver) && !phoneRegex.test(cfg.receiver)) errors.push({ stepId: step.id, field: 'receiver', message: 'Receiver phone looks invalid', level: 'warning' })
        }
      }
      // Scheduler validations
      if (step.service === 'scheduler' && step.action === 'Schedule Task') {
        const cfg: any = step.config || {}
        if (!cfg.calendarDate) errors.push({ stepId: step.id, field: 'calendarDate', message: 'Date is required', level: 'error' })
        if (!cfg.startTime) errors.push({ stepId: step.id, field: 'startTime', message: 'Start time is required', level: 'error' })
        if (!cfg.endTime) errors.push({ stepId: step.id, field: 'endTime', message: 'End time is required', level: 'error' })
        if (cfg.start && cfg.end) {
          const startMs = Date.parse(cfg.start)
          const endMs = Date.parse(cfg.end)
            if (!isNaN(startMs) && !isNaN(endMs) && endMs <= startMs) {
              errors.push({ stepId: step.id, field: 'endTime', message: 'End must be after start', level: 'error' })
            }
        }
        if (!cfg.timezone) errors.push({ stepId: step.id, field: 'timezone', message: 'Timezone is recommended', level: 'warning' })
      }
    })
    const warnings = errors.filter(e => e.level === 'warning').length
    const fatal = errors.filter(e => e.level === 'error').length
    return { ok: fatal === 0, errors, warnings }
  }

  const handleTestRun = () => {
    setTestRunning(true)
    try {
      const result = validateWorkflow()
      const errorIds = new Set(result.errors.filter(e => e.level === 'error').map(e => e.stepId))
      const newSteps = steps.map(s => {
        if (errorIds.has(s.id)) return { ...s, status: 'error' as const }
        return { ...s, status: 'configured' as const }
      })
      setSteps(newSteps)
      setTestErrors(result.errors)
      // Toast notifications
      import('sonner').then(({ toast }) => {
        if (result.ok) {
          toast.success('Workflow validation passed', { description: 'All checks succeeded. Ready to deploy.' })
        } else {
          const errorCount = result.errors.filter(e=>e.level==='error').length
          const warnCount = result.warnings
          const firstError = result.errors.find(e=>e.level==='error')
          const summary = `${errorCount} error${errorCount!==1?'s':''}${warnCount>0?`, ${warnCount} warning${warnCount!==1?'s':''}`:''}`
          toast.error(`Validation failed: ${summary}`, { description: firstError ? `${firstError.stepId}: ${firstError.message}` : 'Check configuration.' })
          if (warnCount > 0) {
            const firstWarn = result.errors.find(e=>e.level==='warning')
            if (firstWarn) {
              toast.warning(`Warning: ${firstWarn.stepId}`, { description: firstWarn.message })
            }
          }
        }
      })
    } finally {
      setTestRunning(false)
    }
  }

  // Fetch default senders once
  useEffect(() => {
    let mounted = true
    import('@/lib/api-client').then(({ apiClient }) => {
      apiClient.getDefaultSenders().then(data => { if (mounted) setDefaultSenders(data) }).catch(() => {})
    })
    return () => { mounted = false }
  }, [])

  // Auto-apply default sender to all relevant steps when defaults are fetched, but allow user override per step
  useEffect(() => {
    if (!defaultSenders) return
    const updated = steps.map((s) => {
      const isMsg = (s.service === 'messaging' && s.action === 'Send Message')
        || (s.service === 'notification' && s.action === 'Send SMS')
        || (s.service === 'email' && (s.action === 'Send Email' || s.action === 'Send Template Email'))
      if (!isMsg) return s
      const cfg: any = s.config || {}
      // Respect explicit override flag; if not overriding and no sender set, apply defaults
      const override = cfg.overrideSender === true || cfg.overrideSender === 'true'
      if (!override && !cfg.sender) {
        let value = ''
        if (s.service === 'messaging') value = defaultSenders.messagingSender
        else if (s.service === 'notification') value = defaultSenders.smsSender
        else if (s.service === 'email') value = defaultSenders.emailSender
        return { ...s, config: { ...cfg, sender: value } }
      }
      return s
    })
    if (JSON.stringify(updated) !== JSON.stringify(steps)) setSteps(updated)
  }, [defaultSenders])

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border bg-card/70 backdrop-blur px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-xl font-semibold border-0 px-0 focus-visible:ring-0 h-auto bg-transparent"
            />
            <Badge variant={workflowStatus === 'active' ? 'default' : 'secondary'} className="mt-1">
              {workflowStatus === 'active' ? 'Active' : 'Draft'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleTestRun} disabled={testRunning}>{testRunning ? 'Testing…' : 'Test run'}</Button>
          <Button onClick={handleDeploy} disabled={isDeploying}>
            {isDeploying ? 'Deploying…' : 'Deploy'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-muted/30 py-8">
          <div className="mx-auto max-w-2xl px-4">
            {/* Last run summary (once, above steps) */}
            {lastRun && (
              <div className="mb-6">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Last Run</h3>
                    <div className="text-sm text-muted-foreground">
                      {lastRun.counts.triggers} triggers • {lastRun.counts.schedules} schedules
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {lastRun.executions.length === 0 && (
                      <div className="text-sm text-muted-foreground">No immediate actions executed.</div>
                    )}
                    {lastRun.executions.map((ex, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {ex.status === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {ex.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                        {ex.status === 'skipped' && <MinusCircle className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium">{ex.type}</span>
                        <span className="text-muted-foreground">• step {ex.stepId}</span>
                        {ex.status === 'error' && (
                          <span className="text-destructive">— {ex.error?.message || 'error'}</span>
                        )}
                        {ex.status === 'skipped' && <span className="text-muted-foreground">— {ex.error}</span>}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
            {steps.map((step, index) => {
              const isSelected = selectedStep === step.id
              const connection = connections.find((c) => c.source === step.id)

              return (
                <div key={step.id}>
                  {/* Step Card */}
                  <Card
                    className={`relative cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? "ring-2 ring-primary shadow-lg" : ""
                    }`}
                    onClick={() => {
                      setSelectedStep(step.id)
                      setSelectedConnection(null)
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Status Indicator */}
                        <div className="mt-1">
                          {step.status === "incomplete" && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                          {step.status === "error" && <AlertCircle className="h-5 w-5 text-destructive" />}
                          {step.status === "configured" && <CheckCircle className="h-5 w-5 text-green-600" />}
                        </div>

                        {/* Service Icon and Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card border border-border">
                            {step.service ? (
                              getServiceIcon(step.service)
                            ) : (
                              <Zap className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-muted-foreground">
                                {step.type === "trigger" ? "Trigger" : `${index}. Action`}
                              </span>
                              {step.service && (
                                <Badge variant="outline" className="text-xs">
                                  {getServiceName(step.service)}
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium text-sm">
                              {typeof step.action === 'string' ? step.action : step.action?.type || 'Custom action'}
                            </p>
                          </div>
                        </div>

                        {/* Actions Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedStep(step.id)}>Configure</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addStepAt(step.id)}>Insert step below</DropdownMenuItem>
                            {step.type !== "trigger" && (
                              <DropdownMenuItem onClick={() => removeStep(step.id)} className="text-destructive">
                                Delete step
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>

                  {/* Connection Line with Add Button */}
                  {index < steps.length - 1 && (
                    <div className="relative flex items-center justify-center py-2">
                      <div className="absolute inset-y-0 left-1/2 w-0.5 bg-border -translate-x-1/2" />
                      <div className="relative z-10 flex flex-col items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-background shadow-sm hover:shadow-md"
                          onClick={() => addStepAt(step.id)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        {connection?.description && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto py-1 px-2 text-xs"
                            onClick={() => setSelectedConnection(connection.id)}
                          >
                            {connection.description}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add Step at End */}
            <div className="relative flex items-center justify-center py-4">
              <div className="absolute inset-y-0 left-1/2 w-0.5 bg-border -translate-x-1/2" />
              <Button
                variant="outline"
                size="icon"
                className="relative z-10 h-8 w-8 rounded-full bg-background shadow-sm hover:shadow-md"
                onClick={() => addStepAt(steps[steps.length - 1]?.id || null)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

        
        </div>

        {(selectedStepData || selectedConnectionData) && (
          <div className="w-96 border-l border-border bg-card overflow-y-auto">
            <div className="p-6 space-y-6">
              {selectedStepData && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {selectedStepData.type === "trigger" ? "Trigger" : "Action"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedStepData.type === "trigger" ? "Setup" : "Configure"}
                      </p>
                    </div>
                    {selectedStepData.type !== "trigger" && (
                      <Button variant="ghost" size="icon" onClick={() => removeStep(selectedStepData.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Service</Label>
                      {/* Button group replacing the Select */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { value: "webhook", label: "HTTP Webhook" },
                          { value: "email", label: "Email Service" },
                          { value: "database", label: "Database" },
                          { value: "messaging", label: "Messaging Service" },
                          { value: "payment", label: "Payment Service" },
                          { value: "document", label: "Document Service" },
                          { value: "notification", label: "Notification" },
                          { value: "scheduler", label: "Scheduler" },
                          { value: "api", label: "API Service" },
                        ].map((opt) => (
                          <Button
                            key={opt.value}
                            variant={selectedStepData.service === opt.value ? "default" : "outline"}
                            size="sm"
                            className="justify-start"
                            onClick={() =>
                              updateStep(selectedStepData.id, {
                                service: opt.value,
                                action: defaultActionForService[opt.value] || "",
                                status: opt.value ? "configured" : "incomplete",
                              })
                            }
                          >
                            <span className="truncate">{opt.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {selectedStepData.service && (
                      <div className="space-y-2">
                        <Label>Event</Label>
                        {/* Button group replacing the Select */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {actionsForService(selectedStepData.service).map((act) => (
                            <Button
                              key={act}
                              variant={selectedStepData.action === act ? "default" : "outline"}
                              size="sm"
                              className="justify-start"
                              onClick={() => updateStep(selectedStepData.id, { action: act })}
                            >
                              {act}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedStepData.service && selectedStepData.action && (
                      <div className="space-y-2">
                        <Label>Configuration</Label>
                        <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                          {/* Scheduler specific config */}
                          {(selectedStepData.service === 'scheduler' && selectedStepData.action === 'Schedule Task') ? (
                            <>
                              <div className="space-y-2">
                                <Label className="text-xs">Calendar</Label>
                                <Input
                                  placeholder="Calendar ID (e.g., primary)"
                                  className="h-8 text-sm"
                                  value={(selectedStepData.config?.calendarId as string) || ''}
                                  onChange={(e) => {
                                    const cfg: any = { ...(selectedStepData.config || {}), calendarId: e.target.value }
                                    updateStep(selectedStepData.id, { config: cfg })
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Description</Label>
                                <Textarea
                                  placeholder="What is this scheduled task?"
                                  className="min-h-[60px] text-sm"
                                  value={(selectedStepData.config?.description as string) || ''}
                                  onChange={(e) => {
                                    const cfg: any = { ...(selectedStepData.config || {}), description: e.target.value }
                                    updateStep(selectedStepData.id, { config: cfg })
                                  }}
                                />
                              </div>
                              {/* Date & Time pickers */}
                              <div className="grid grid-cols-1 gap-3">
                                <div className="space-y-2">
                                  <Label className="text-xs">Date</Label>
                                  <Input
                                    type="date"
                                    className={cn("h-8 text-sm", (testErrors.find(e => e.stepId === selectedStepData.id && e.field === 'calendarDate' && e.level === 'error')) && "border-red-500 focus-visible:ring-red-500")}
                                    value={(selectedStepData.config?.calendarDate as string) || ''}
                                    onChange={(e) => {
                                        const cfg: any = { ...(selectedStepData.config || {}), calendarDate: e.target.value }
                                      // derive ISO previews if times exist
                                      const startTime = cfg.startTime as string | undefined
                                      const endTime = cfg.endTime as string | undefined
                                      if (e.target.value && (startTime || endTime)) {
                                        if (startTime) cfg.start = `${e.target.value}T${startTime}:00`
                                        if (endTime) cfg.end = `${e.target.value}T${endTime}:00`
                                      }
                                      updateStep(selectedStepData.id, { config: cfg })
                                    }}
                                  />
                                  {testErrors.find(e => e.stepId === selectedStepData.id && e.field === 'calendarDate' && e.level === 'error') && (
                                    <p className="text-[11px] text-red-600">{testErrors.find(e => e.stepId === selectedStepData.id && e.field === 'calendarDate' && e.level === 'error')?.message}</p>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs">Start Time</Label>
                                    <Input
                                      type="time"
                                      className={cn("h-8 text-sm", (testErrors.find(e => e.stepId === selectedStepData.id && e.field === 'startTime' && e.level === 'error')) && "border-red-500 focus-visible:ring-red-500")}
                                      value={(selectedStepData.config?.startTime as string) || ''}
                                      onChange={(e) => {
                                        const cfg: any = { ...(selectedStepData.config || {}), startTime: e.target.value }
                                        const date = cfg.calendarDate as string | undefined
                                        if (date && e.target.value) cfg.start = `${date}T${e.target.value}:00`
                                        updateStep(selectedStepData.id, { config: cfg })
                                      }}
                                    />
                                    {testErrors.find(e => e.stepId === selectedStepData.id && e.field === 'startTime' && e.level === 'error') && (
                                      <p className="text-[11px] text-red-600">{testErrors.find(e => e.stepId === selectedStepData.id && e.field === 'startTime' && e.level === 'error')?.message}</p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs">End Time</Label>
                                    <Input
                                      type="time"
                                      className={cn("h-8 text-sm", (testErrors.find(e => e.stepId === selectedStepData.id && e.field === 'endTime' && e.level === 'error')) && "border-red-500 focus-visible:ring-red-500")}
                                      value={(selectedStepData.config?.endTime as string) || ''}
                                      onChange={(e) => {
                                        const cfg: any = { ...(selectedStepData.config || {}), endTime: e.target.value }
                                        const date = cfg.calendarDate as string | undefined
                                        if (date && e.target.value) cfg.end = `${date}T${e.target.value}:00`
                                        updateStep(selectedStepData.id, { config: cfg })
                                      }}
                                    />
                                    {testErrors.find(e => e.stepId === selectedStepData.id && e.field === 'endTime' && e.level === 'error') && (
                                      <p className="text-[11px] text-red-600">{testErrors.find(e => e.stepId === selectedStepData.id && e.field === 'endTime' && e.level === 'error')?.message}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs">Timezone</Label>
                                    <Input
                                      placeholder="UTC"
                                      className="h-8 text-sm"
                                      value={(selectedStepData.config?.timezone as string) || ''}
                                      onChange={(e) => {
                                        const cfg: any = { ...(selectedStepData.config || {}), timezone: e.target.value }
                                        updateStep(selectedStepData.id, { config: cfg })
                                      }}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs">Preview</Label>
                                    <div className="text-[11px] text-muted-foreground border rounded px-2 py-1 h-8 flex items-center">
                                      {(selectedStepData.config?.start as string) || 'start not set'} → {(selectedStepData.config?.end as string) || 'end not set'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <p className="text-[11px] text-muted-foreground">Pick date and start/end times. We’ll store ISO-like local times and optional timezone.</p>
                            </>
                          ) : null}

                          {/* Messaging/Email specific config */}
                          {((selectedStepData.service === 'messaging' && selectedStepData.action === 'Send Message')
                            || (selectedStepData.service === 'notification' && selectedStepData.action === 'Send SMS')
                            || (selectedStepData.service === 'email' && (selectedStepData.action === 'Send Email' || selectedStepData.action === 'Send Template Email')))
                            ? (
                              <>
                                <div className="space-y-2">
                                  <Label className="text-xs">Sender</Label>
                                  <Input
                                    placeholder={selectedStepData.service === 'email' ? 'from@example.com' : '+1... or phoneNumberId'}
                                    className="h-8 text-sm"
                                    value={(selectedStepData.config?.sender as string) || ''}
                                    disabled={!Boolean(selectedStepData.config?.overrideSender)}
                                    onChange={(e) => {
                                      const cfg: any = { ...(selectedStepData.config || {}), sender: e.target.value }
                                      updateStep(selectedStepData.id, { config: cfg })
                                    }}
                                  />
                                  <div className="flex items-center gap-2">
                                    <input
                                      id={`override-${selectedStepData.id}`}
                                      type="checkbox"
                                      className="h-3 w-3"
                                      checked={Boolean(selectedStepData.config?.overrideSender)}
                                      onChange={(e) => {
                                        const cfg: any = { ...(selectedStepData.config || {}), overrideSender: e.target.checked }
                                        // If enabling override and sender is empty, seed with current default to make it editable
                                        if (e.target.checked && !cfg.sender) {
                                          cfg.sender = selectedStepData.service === 'email'
                                            ? (defaultSenders?.emailSender || '')
                                            : (selectedStepData.service === 'notification'
                                              ? (defaultSenders?.smsSender || '')
                                              : (defaultSenders?.messagingSender || ''))
                                        }
                                        updateStep(selectedStepData.id, { config: cfg })
                                      }}
                                    />
                                    <label htmlFor={`override-${selectedStepData.id}`} className="text-[11px]">Override sender for this step</label>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">Use a verified SendGrid sender email for email steps, and a purchased/verified Twilio number for SMS.</p>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs">Receiver</Label>
                                  <Input
                                    placeholder={selectedStepData.service === 'email' ? 'to@example.com' : '+1...'}
                                    className={cn("h-8 text-sm", (testErrors.find(e => e.stepId === selectedStepData.id && e.field === 'receiver' && e.level === 'error')) && "border-red-500 focus-visible:ring-red-500")}
                                    value={(selectedStepData.config?.receiver as string) || ''}
                                    onChange={(e) => {
                                      const cfg = { ...(selectedStepData.config || {}), receiver: e.target.value }
                                      updateStep(selectedStepData.id, { config: cfg })
                                    }}
                                  />
                                  {testErrors.find(e => e.stepId === selectedStepData.id && e.field === 'receiver' && e.level === 'error') && (
                                    <p className="text-[11px] text-red-600">{testErrors.find(e => e.stepId === selectedStepData.id && e.field === 'receiver' && e.level === 'error')?.message}</p>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs">Message Body</Label>
                                  <Textarea
                                    placeholder={selectedStepData.service === 'email' ? 'Email body...' : 'Message text...'}
                                    className={cn("min-h-[80px] text-sm", (testErrors.find(e => e.stepId === selectedStepData.id && e.field === 'body' && e.level === 'error')) && "border-red-500 focus-visible:ring-red-500")}
                                    value={(selectedStepData.config?.body as string) || ''}
                                    onChange={(e) => {
                                      const cfg = { ...(selectedStepData.config || {}), body: e.target.value }
                                      updateStep(selectedStepData.id, { config: cfg })
                                    }}
                                  />
                                  {testErrors.find(e => e.stepId === selectedStepData.id && e.field === 'body' && e.level === 'error') && (
                                    <p className="text-[11px] text-red-600">{testErrors.find(e => e.stepId === selectedStepData.id && e.field === 'body' && e.level === 'error')?.message}</p>
                                  )}
                                  <p className="text-[11px] text-muted-foreground">Provide sender, receiver, and message body.</p>
                                </div>
                                {/* Advanced provider overrides */}
                                <div className="mt-3 rounded-md border border-dashed p-3">
                                  <p className="text-[11px] font-medium mb-2">Advanced</p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-[11px]">providerConfigKey</Label>
                                      <Input
                                        placeholder={selectedStepData.service === 'notification' ? 'twilio' : (selectedStepData.service === 'messaging' ? 'whatsapp' : 'sendgrid')}
                                        className="h-8 text-sm"
                                        value={((selectedStepData.config as any)?.providerConfigKey as string) || ''}
                                        onChange={(e) => {
                                          const cfg = { ...(selectedStepData.config || {}), providerConfigKey: e.target.value }
                                          updateStep(selectedStepData.id, { config: cfg })
                                        }}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[11px]">connectionId</Label>
                                      <Input
                                        placeholder={selectedStepData.service === 'notification' ? 'twilio_main' : (selectedStepData.service === 'messaging' ? 'whatsapp_main' : 'sendgrid_main')}
                                        className="h-8 text-sm"
                                        value={((selectedStepData.config as any)?.connectionId as string) || ''}
                                        onChange={(e) => {
                                          const cfg = { ...(selectedStepData.config || {}), connectionId: e.target.value }
                                          updateStep(selectedStepData.id, { config: cfg })
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-2">Optional. Overrides project defaults for this step only. Leave empty to use environment configuration.</p>
                                </div>
                              </>
                            ) : (! (selectedStepData.service === 'scheduler' && selectedStepData.action === 'Schedule Task') ? (
                              <>
                                <div className="space-y-2">
                                  <Label className="text-xs">Parameter 1</Label>
                                  <Input placeholder="Enter value..." className="h-8 text-sm" />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs">Parameter 2</Label>
                                  <Input placeholder="Enter value..." className="h-8 text-sm" />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Configure {typeof selectedStepData.action === 'string' ? selectedStepData.action : selectedStepData.action?.type || 'this'} parameters
                                </p>
                              </>
                            ) : null)}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {selectedConnectionData && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Connection Note</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        updateConnection(selectedConnectionData.id, "")
                        setSelectedConnection(null)
                      }}
                    >
                      Clear
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="connection-description">Description</Label>
                      <Textarea
                        id="connection-description"
                        placeholder="Add a note about this connection..."
                        value={selectedConnectionData.description || ""}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateConnection(selectedConnectionData.id, e.target.value)}
                        className="min-h-[100px] resize-none"
                      />
                      <p className="text-xs text-muted-foreground">Document what data flows between these steps</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
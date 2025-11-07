"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/label-badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import apiClient from "@/lib/api-client"
import useWorkflowCanvasStore, { WorkflowStep, StepConnection } from "@/stores/workflow-canvas-store"

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
  const steps = (data?.steps ?? []) as WorkflowStep[]
  const connections = (data?.connections ?? []) as StepConnection[]
  const setWorkflowName = (name: string) => store.setName(id, name)
  const setWorkflowStatus = (status: "draft" | "active") => store.setStatus(id, status)
  const setSteps = (v: WorkflowStep[]) => store.setSteps(id, v)
  const setConnections = (v: StepConnection[]) => store.setConnections(id, v)
  const [isDeploying, setIsDeploying] = useState(false)
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

  const addStepAt = (afterStepId: string | null) => {
    const newStep: WorkflowStep = {
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
        const newConnection: StepConnection = {
          id: `conn-${Date.now()}`,
          fromStep: lastStep.id,
          toStep: newStep.id,
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
      const existingConnection = connections.find((c) => c.fromStep === afterStepId)
      if (existingConnection) {
        // Update existing connection to point to new step
        setConnections([
          ...connections.filter((c) => c.id !== existingConnection.id),
          { ...existingConnection, toStep: newStep.id },
          {
            id: `conn-${Date.now()}`,
            fromStep: newStep.id,
            toStep: existingConnection.toStep,
          },
        ])
      } else {
        // Create new connection
        setConnections([
          ...connections,
          {
            id: `conn-${Date.now()}`,
            fromStep: afterStepId,
            toStep: newStep.id,
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
    const incomingConn = connections.find((c) => c.toStep === stepId)
    const outgoingConn = connections.find((c) => c.fromStep === stepId)

    const newConnections = connections.filter((c) => c.fromStep !== stepId && c.toStep !== stepId)

    if (incomingConn && outgoingConn) {
      // Bridge the gap
      newConnections.push({
        id: `conn-${Date.now()}`,
        fromStep: incomingConn.fromStep,
        toStep: outgoingConn.toStep,
        description: incomingConn.description || outgoingConn.description,
      })
    }

    setConnections(newConnections)
    if (selectedStep === stepId) setSelectedStep(null)
  }

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
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
      await apiClient.deployFlow(flowId)
      setWorkflowStatus("active")
    } catch (e) {
      // Best-effort: in demo mode this always succeeds, otherwise keep draft
    } finally {
      setIsDeploying(false)
    }
  }

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
          <Button variant="outline">Test run</Button>
          <Button onClick={handleDeploy} disabled={isDeploying}>
            {isDeploying ? 'Deploying…' : 'Deploy'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-muted/30 py-8">
          <div className="mx-auto max-w-2xl px-4">
            {steps.map((step, index) => {
              const isSelected = selectedStep === step.id
              const connection = connections.find((c) => c.fromStep === step.id)

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
                          {step.status === "configured" && (
                            <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-white" />
                            </div>
                          )}
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
                            <p className="font-medium text-sm">{step.action}</p>
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
                      <Select
                        value={selectedStepData.service}
                        onValueChange={(value: string) => {
                          updateStep(selectedStepData.id, {
                            service: value,
                            action: defaultActionForService[value] || "",
                            status: value ? "configured" : "incomplete",
                          })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose service..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="webhook">HTTP Webhook</SelectItem>
                          <SelectItem value="email">Email Service</SelectItem>
                          <SelectItem value="database">Database</SelectItem>
                          <SelectItem value="messaging">Messaging Service</SelectItem>
                          <SelectItem value="payment">Payment Service</SelectItem>
                          <SelectItem value="document">Document Service</SelectItem>
                          <SelectItem value="notification">Notification Service</SelectItem>
                          <SelectItem value="scheduler">Scheduler</SelectItem>
                          <SelectItem value="api">API Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedStepData.service && (
                      <div className="space-y-2">
                        <Label>Event</Label>
                        <Select
                          value={selectedStepData.action}
                          onValueChange={(value: string) => updateStep(selectedStepData.id, { action: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select event..." />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedStepData.service === "webhook" && (
                              <>
                                <SelectItem value="Form Submission Created">Form Submission Created</SelectItem>
                                <SelectItem value="HTTP Request Received">HTTP Request Received</SelectItem>
                                <SelectItem value="Webhook Triggered">Webhook Triggered</SelectItem>
                              </>
                            )}
                            {selectedStepData.service === "email" && (
                              <>
                                <SelectItem value="Send Email">Send Email</SelectItem>
                                <SelectItem value="Send Template Email">Send Template Email</SelectItem>
                                <SelectItem value="Email Received">Email Received</SelectItem>
                              </>
                            )}
                            {selectedStepData.service === "database" && (
                              <>
                                <SelectItem value="Create Record">Create Record</SelectItem>
                                <SelectItem value="Update Record">Update Record</SelectItem>
                                <SelectItem value="Find Records">Find Records</SelectItem>
                              </>
                            )}
                            {selectedStepData.service === "messaging" && (
                              <>
                                <SelectItem value="Send Message">Send Message</SelectItem>
                                <SelectItem value="Create Channel">Create Channel</SelectItem>
                                <SelectItem value="Post Update">Post Update</SelectItem>
                              </>
                            )}
                            {selectedStepData.service === "payment" && (
                              <>
                                <SelectItem value="Create Payment">Create Payment</SelectItem>
                                <SelectItem value="Create Customer">Create Customer</SelectItem>
                                <SelectItem value="Process Refund">Process Refund</SelectItem>
                              </>
                            )}
                            {selectedStepData.service === "document" && (
                              <>
                                <SelectItem value="Generate PDF">Generate PDF</SelectItem>
                                <SelectItem value="Parse Document">Parse Document</SelectItem>
                                <SelectItem value="Convert Format">Convert Format</SelectItem>
                              </>
                            )}
                            {selectedStepData.service === "notification" && (
                              <>
                                <SelectItem value="Send Push Notification">Send Push Notification</SelectItem>
                                <SelectItem value="Send SMS">Send SMS</SelectItem>
                                <SelectItem value="Send Alert">Send Alert</SelectItem>
                              </>
                            )}
                            {selectedStepData.service === "scheduler" && (
                              <>
                                <SelectItem value="Schedule Task">Schedule Task</SelectItem>
                                <SelectItem value="Delay Execution">Delay Execution</SelectItem>
                                <SelectItem value="Every Hour">Every Hour</SelectItem>
                              </>
                            )}
                            {selectedStepData.service === "api" && (
                              <>
                                <SelectItem value="Call API Endpoint">Call API Endpoint</SelectItem>
                                <SelectItem value="Transform Data">Transform Data</SelectItem>
                                <SelectItem value="Validate Response">Validate Response</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {selectedStepData.service && selectedStepData.action && (
                      <div className="space-y-2">
                        <Label>Configuration</Label>
                        <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Parameter 1</Label>
                            <Input placeholder="Enter value..." className="h-8 text-sm" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Parameter 2</Label>
                            <Input placeholder="Enter value..." className="h-8 text-sm" />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Configure {selectedStepData.action} parameters
                          </p>
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

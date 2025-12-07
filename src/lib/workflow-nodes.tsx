import React, { ReactNode } from "react"
import { 
  Zap, Webhook, Mail, Database, MessageSquare, CreditCard, FileText, Bell, Calendar, Code, PhoneCall
} from "lucide-react"

export type ServiceKey = 
  | "webhook" | "email" | "database" | "messaging" | "payment" | "document" | "notification" | "scheduler" | "api" | "voice"

export interface WorkflowServiceMeta {
  key: ServiceKey
  label: string
  description: string
  defaultAction: string
  actions: string[]
  icon: ReactNode
}

export const WORKFLOW_SERVICES: WorkflowServiceMeta[] = [
  {
    key: "webhook",
    label: "HTTP Webhook",
    description: "Start on request",
    defaultAction: "Form Submission Created",
    actions: ["Form Submission Created", "HTTP Request Received", "Webhook Triggered"],
    icon: <Webhook className="h-5 w-5" />,
  },
  {
    key: "email",
    label: "Email Service",
    description: "Send via SMTP",
    defaultAction: "Send Email",
    actions: ["Send Email", "Send Template Email", "Email Received"],
    icon: <Mail className="h-5 w-5" />,
  },
  {
    key: "database",
    label: "Database",
    description: "CRUD operations",
    defaultAction: "Create Record",
    actions: ["Create Record", "Update Record", "Find Records"],
    icon: <Database className="h-5 w-5" />,
  },
  {
    key: "messaging",
    label: "Messaging Service",
    description: "Chat & posts",
    defaultAction: "Send Message",
    actions: ["Send Message", "Create Channel", "Post Update"],
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    key: "payment",
    label: "Payment Service",
    description: "Process billing",
    defaultAction: "Create Payment",
    actions: ["Create Payment", "Create Customer", "Process Refund"],
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    key: "document",
    label: "Document Service",
    description: "Generate & parse",
    defaultAction: "Generate PDF",
    actions: ["Generate PDF", "Parse Document", "Convert Format"],
    icon: <FileText className="h-5 w-5" />,
  },
  {
    key: "notification",
    label: "Notification Service",
    description: "Multi-channel send",
    defaultAction: "Send Push Notification",
    actions: ["Send Push Notification", "Send SMS", "Send Alert"],
    icon: <Bell className="h-5 w-5" />,
  },
  {
    key: "scheduler",
    label: "Scheduler",
    description: "Wait or schedule",
    defaultAction: "Schedule Task",
    actions: ["Schedule Task", "Delay Execution", "Every Hour"],
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    key: "api",
    label: "API Service",
    description: "Call external API",
    defaultAction: "Call API Endpoint",
    actions: ["Call API Endpoint", "Transform Data", "Validate Response"],
    icon: <Code className="h-5 w-5" />,
  },
  {
    key: "voice",
    label: "Voice Call",
    description: "Place AI-driven phone calls",
    defaultAction: "Start Voice Call",
    actions: ["Start Voice Call"],
    icon: <PhoneCall className="h-5 w-5" />,
  },
]

export const SERVICE_BY_KEY: Record<string, WorkflowServiceMeta> = WORKFLOW_SERVICES.reduce((acc, s) => { acc[s.key] = s; return acc }, {} as Record<string, WorkflowServiceMeta>)

export function getServiceIcon(key: string): ReactNode {
  return SERVICE_BY_KEY[key]?.icon || <Zap className="h-5 w-5" />
}

export function getServiceName(key: string): string {
  return SERVICE_BY_KEY[key]?.label || key
}

export function getServiceDescription(key: string): string {
  return SERVICE_BY_KEY[key]?.description || ''
}

export function defaultActionForService(key: string): string {
  return SERVICE_BY_KEY[key]?.defaultAction || ""
}

export function actionsForService(key: string): string[] {
  return SERVICE_BY_KEY[key]?.actions || []
}

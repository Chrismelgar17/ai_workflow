// Non-JSX shim re-exporting the TSX implementation to avoid build errors when
// resolution prefers .ts over .tsx for extensionless imports.
import React, { ReactNode } from "react"
import { Zap, Webhook, Mail, Database, MessageSquare, CreditCard, FileText, Bell, Calendar, Code, PhoneCall } from "lucide-react"

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

const I = (C: any) => React.createElement(C, { className: "h-5 w-5" })

export const WORKFLOW_SERVICES: WorkflowServiceMeta[] = [
	{ key: "webhook", label: "Webhook Trigger", description: "Start on request", defaultAction: "Form Submission Created", actions: ["Form Submission Created", "HTTP Request Received", "Webhook Triggered"], icon: I(Webhook) },
	{ key: "email", label: "Send Email", description: "Send via SMTP", defaultAction: "Send Email", actions: ["Send Email", "Send Template Email", "Email Received"], icon: I(Mail) },
	{ key: "database", label: "Database", description: "CRUD operations", defaultAction: "Create Record", actions: ["Create Record", "Update Record", "Find Records"], icon: I(Database) },
	{ key: "messaging", label: "Messaging", description: "Chat & posts", defaultAction: "Send Message", actions: ["Send Message", "Create Channel", "Post Update"], icon: I(MessageSquare) },
	{ key: "payment", label: "Payments", description: "Process billing", defaultAction: "Create Payment", actions: ["Create Payment", "Create Customer", "Process Refund"], icon: I(CreditCard) },
	{ key: "document", label: "Documents", description: "Generate & parse", defaultAction: "Generate PDF", actions: ["Generate PDF", "Parse Document", "Convert Format"], icon: I(FileText) },
	{ key: "notification", label: "Notifications", description: "Multi-channel send", defaultAction: "Send Push Notification", actions: ["Send Push Notification", "Send SMS", "Send Alert"], icon: I(Bell) },
	{ key: "scheduler", label: "Delay / Schedule", description: "Wait or schedule", defaultAction: "Schedule Task", actions: ["Schedule Task", "Delay Execution", "Every Hour"], icon: I(Calendar) },
	{ key: "api", label: "API Request", description: "Call external API", defaultAction: "Call API Endpoint", actions: ["Call API Endpoint", "Transform Data", "Validate Response"], icon: I(Code) },
	{ key: "voice", label: "Voice Call", description: "Place AI phone calls", defaultAction: "Start Voice Call", actions: ["Start Voice Call"], icon: I(PhoneCall) },
]

export const SERVICE_BY_KEY: Record<string, WorkflowServiceMeta> = WORKFLOW_SERVICES.reduce((acc, s) => { acc[s.key] = s; return acc }, {} as Record<string, WorkflowServiceMeta>)

export function getServiceIcon(key: string): ReactNode {
	return SERVICE_BY_KEY[key]?.icon || I(Zap)
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

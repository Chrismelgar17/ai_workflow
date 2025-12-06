export type NodeType = "start" | "end" | "action" | "condition" | "trigger" | "webhook" | "delay" | "email" | "database"

export type NodeActionType =
  | "send_message"
  | "send_email"
  | "update_lead"
  | "classify_text"
  | "fetch_data"
  | "route_condition"
  | "wait_for_event"
  | "transform_content"
  | "http_request"
  | "evaluate_lead_state"

export interface NodeAction {
  type: NodeActionType
  parameters: Record<string, any>
}

export type NodeEventType =
  | "on_enter"
  | "on_exit"
  | "on_error"
  | "on_condition_true"
  | "on_condition_false"
  | "on_ai_decision"
  | "on_external_event"

export interface NodeEvent {
  type: NodeEventType
  handlers: Record<string, any>
}

export interface AIConfig {
  model: string
  temperature: number
  maxTokens: number
  prompt: string
  evaluateLeadState: boolean
  provider?: string
  language?: string
}

export interface NodeData {
  label: string
  description?: string
  icon?: string // Name of the icon
  aiConfig?: AIConfig
  action?: NodeAction | string
  events?: NodeEventType[] // Array of selected event types
  eventHandlers?: Record<NodeEventType, any> // Configuration for each event
  agentId?: string
  language?: string
  [key: string]: any
}

export interface Position {
  x: number
  y: number
}

export interface Node {
  id: string
  type: NodeType
  position: Position
  data: NodeData
  selected?: boolean
  // Runtime-friendly convenience properties used by the workflow UI
  service?: string
  action?: string | NodeAction
  config?: Record<string, any>
  status?: string
}

export interface Connection {
  id: string
  source: string // Node ID
  sourceHandle: string // 'output' or specific handle ID
  target: string // Node ID
  targetHandle: string // 'input' or specific handle ID
  animated?: boolean
  description?: string
}


export interface WorkflowState {
  nodes: Node[]
  connections: Connection[]
  scale: number
  offset: Position
}

export interface DragItem {
  type: NodeType
  label: string
}

"use client"

import React, { useRef, useCallback, useEffect, useMemo, useState, use } from "react"
import { useWorkflowCanvasStore } from "@/stores/workflow-canvas-store"
import { Node, Connection, Position, NodeType, NodeData, AIConfig } from "@/lib/types"
import NodeComponent from "./node"
import ConnectionComponent from "./connection"
import { getBezierPath, distance, isPointNearLine } from "@/lib/utils"
import { Plus, Minus, MousePointer2, Hand, Trash2, RotateCcw } from 'lucide-react'
import canvasStyles from './canvas.module.css'

type ValidationIssue = { level: 'error' | 'warning'; message: string; field?: string }

const getOutputAnchor = (node: Node, size: { width: number; height: number }, handleId?: string): Position => {
  const baseY = node.position.y + size.height
  let xRatio = 0.5
  if (node.type === "condition") {
    if (handleId === "output-true") xRatio = 0.25
    else if (handleId === "output-false") xRatio = 0.75
  }
  return { x: node.position.x + size.width * xRatio, y: baseY }
}

const getInputAnchor = (node: Node, size: { width: number; height: number }): Position => {
  return { x: node.position.x + size.width / 2, y: node.position.y }
}

const DEFAULT_FLOW_ID = "flow_cust_onboarding"

export function Canvas() {
  const INITIAL_NODES: Node[] = [
    {
      id: "start-1",
      type: "start",
      position: { x: 100, y: 300 },
      data: { label: "Start", description: "Workflow trigger", icon: "start" },
    },
    {
      id: "end-1",
      type: "end",
      position: { x: 900, y: 300 },
      data: { label: "End", description: "Workflow completion", icon: "end" },
    },
  ]

  const INITIAL_CONNECTIONS: Connection[] = [
    {
      id: "c-init-1",
      source: "start-1",
      sourceHandle: "output",
      target: "end-1",
      targetHandle: "input"
    }
  ]
  

  // State management from workflow-canvas-graph
  const workflowId = useMemo(() => "demo-canvas", [])
  const store = useWorkflowCanvasStore()
  const data = useWorkflowCanvasStore((s) => s.byId[workflowId])
  useEffect(() => { store.init(workflowId) }, [workflowId])
  // Ensure all nodes have a data attribute, defaulting to INITIAL_NODES structure if missing
  const nodes = useMemo(() => {
    if (data?.steps) {
      return data.steps.map((n, i) => {
        // If node is missing data, use INITIAL_NODES fallback for start/end nodes
        if (!n.data) {
          const initial = INITIAL_NODES.find(init => init.id === n.id)
          return initial
            ? { ...n, data: initial.data }
            : {
                ...n,
                data: {
                  label: "Unnamed Node",
                  description: n.type,
                  icon: n.type
                }
              }
        }
        return n
      })
    }
    return INITIAL_NODES
  }, [data])
  useEffect(() => { console.log("Nodes:", nodes) }, [nodes])
  // Ensure start node is first and end node is last
  const sortedNodes = useMemo(() => {
    const startNodes = nodes.filter(n => n.type === "start")
    const endNodes = nodes.filter(n => n.type === "end")
    const middleNodes = nodes.filter(n => n.type !== "start" && n.type !== "end")
    return [...startNodes, ...middleNodes, ...endNodes]
  }, [nodes])

  const connections = useMemo(() => {
    const baseConnections = (data?.connections && JSON.stringify(data.connections) !== JSON.stringify(INITIAL_CONNECTIONS))
      ? [...data.connections]
      : [...INITIAL_CONNECTIONS]
    const validNodeIds = new Set(nodes.map(n => n.id))
    const filtered = baseConnections.filter(conn => validNodeIds.has(conn.source) && validNodeIds.has(conn.target))

    const ensureConnection = (sourceId: string, targetId: string, id: string) => {
      if (!filtered.some(conn => conn.source === sourceId && conn.target === targetId)) {
        filtered.push({
          id,
          source: sourceId,
          sourceHandle: "output",
          target: targetId,
          targetHandle: "input",
        })
      }
    }

    const startNode = nodes.find(n => n.type === "start")
    const endNode = nodes.find(n => n.type === "end")

    if (startNode && endNode) {
      const hasStartOutgoing = filtered.some(conn => conn.source === startNode.id)
      if (!hasStartOutgoing) {
        ensureConnection(startNode.id, endNode.id, `c-init-${startNode.id}-to-${endNode.id}`)
      }
      const hasEndIncoming = filtered.some(conn => conn.target === endNode.id)
      if (!hasEndIncoming) {
        ensureConnection(startNode.id, endNode.id, `c-init-${startNode.id}-to-${endNode.id}-fallback`)
      }
    }

    if (endNode) {
      nodes.forEach(node => {
        if (node.id === endNode.id) return
        const hasOutgoing = filtered.some(conn => conn.source === node.id)
        if (!hasOutgoing) {
          ensureConnection(node.id, endNode.id, `auto-${node.id}-to-${endNode.id}`)
        }
      })
    }

    return filtered
  }, [data, nodes])

  useEffect(() => { console.log("Connections:", connections) }, [connections])
  const setNodes = useCallback((v: Node[]) => store.setSteps(workflowId, v), [store, workflowId])
  const setConnections = useCallback((v: Connection[]) => store.setConnections(workflowId, v), [store, workflowId])
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState<Position>({ x: 0, y: 0 })
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false)
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 })
  
  // Node dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [nodeDragOffset, setNodeDragOffset] = useState<Position>({ x: 0, y: 0 })

  // Connection creation state
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null)
  const [connectingHandleId, setConnectingHandleId] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState<Position>({ x: 0, y: 0 })

  // Measured sizes for nodes (filled by Node components)
  const [nodeSizes, setNodeSizes] = useState<Record<string, { width: number, height: number }>>({})

  // Selection state
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [validationIssuesByNode, setValidationIssuesByNode] = useState<Record<string, ValidationIssue[]>>({})
  const [validationSummary, setValidationSummary] = useState<{ errors: number; warnings: number } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewNodeId, setPreviewNodeId] = useState<string | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)

  // --- Helpers ---

  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: (screenX - rect.left - offset.x) / scale,
      y: (screenY - rect.top - offset.y) / scale,
    }
  }, [offset, scale])

  // --- Event Handlers ---

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const zoomSensitivity = 0.001
      const newScale = Math.min(Math.max(0.1, scale - e.deltaY * zoomSensitivity), 3)
      
      // Zoom towards mouse pointer
      const rect = canvasRef.current!.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      const scaleDiff = newScale - scale
      const offsetX = offset.x - (mouseX - offset.x) * (scaleDiff / scale)
      const offsetY = offset.y - (mouseY - offset.y) * (scaleDiff / scale)

      setScale(newScale)
      setOffset({ x: offsetX, y: offsetY })
    } else {
      setOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }))
    }
  }, [scale, offset])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse or Space+Click to pan
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsDraggingCanvas(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      return
    }
    
    // Click on canvas clears selection
    if (e.target === canvasRef.current) {
      setSelectedNodes(new Set())
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvasPos = screenToCanvas(e.clientX, e.clientY)
    setMousePos(canvasPos)

    if (isDraggingCanvas) {
      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      setDragStart({ x: e.clientX, y: e.clientY })
    }

    if (draggingNodeId) {
      const updatedNodes = nodes.map((node: Node) => {
        if (node.id === draggingNodeId) {
          return {
            ...node,
            position: {
              x: canvasPos.x - nodeDragOffset.x,
              y: canvasPos.y - nodeDragOffset.y
            }
          }
        }
        return node
      })
      setNodes(updatedNodes)
    }
  }, [isDraggingCanvas, dragStart, draggingNodeId, nodeDragOffset, screenToCanvas])

  const validateWorkflow = useCallback(() => {
    const issuesByNode: Record<string, ValidationIssue[]> = {}
    const pushIssue = (nodeId: string, issue: ValidationIssue) => {
      issuesByNode[nodeId] = [...(issuesByNode[nodeId] || []), issue]
    }

    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
    const phoneRegex = /^\+?[0-9]{7,15}$/

    if (nodes.length === 0) {
      pushIssue('global', { level: 'error', message: 'Workflow has no steps' })
    }

    const triggerNode = nodes.find(n => n.type === 'trigger' || n.type === 'start')
    if (!triggerNode) {
      pushIssue('global', { level: 'error', message: 'Add a trigger/start node as the first step' })
    }

    const inboundCounts: Record<string, number> = {}
    connections.forEach(conn => {
      inboundCounts[conn.target] = (inboundCounts[conn.target] || 0) + 1
    })

    nodes.forEach(node => {
      if (node.type === 'action' && !inboundCounts[node.id]) {
        pushIssue(node.id, { level: 'error', message: 'Action has no incoming connection' })
      }

      const actionObj = typeof node.action === 'object' ? (node.action as any) : undefined
      const params = actionObj?.parameters || {}

      const isMessaging = actionObj?.type === 'send_message' || (node.service === 'messaging' && node.action === 'Send Message')
      const isSms = actionObj?.type === 'send_message' || (node.service === 'notification' && node.action === 'Send SMS')
      const isEmail = actionObj?.type === 'send_email' || (node.service === 'email' && (node.action === 'Send Email' || node.action === 'Send Template Email'))

      if (isMessaging || isSms) {
        const receiver = params.recipient_id || params.receiver || (node as any).config?.receiver
        const body = params.message_content || params.body || (node as any).config?.body
        if (!receiver) pushIssue(node.id, { level: 'error', message: 'Receiver is required' })
        if (!body) pushIssue(node.id, { level: 'error', message: 'Message body is required' })
        if (receiver && !phoneRegex.test(receiver) && !emailRegex.test(receiver)) {
          pushIssue(node.id, { level: 'warning', message: 'Receiver format looks invalid (expect E.164 phone or email)' })
        }
      }

      if (isEmail) {
        const receiver = params.to_email || params.receiver || (node as any).config?.receiver
        const body = params.body || (node as any).config?.body
        const subject = params.subject || (node as any).config?.subject
        if (!receiver) pushIssue(node.id, { level: 'error', message: 'Email recipient is required' })
        if (receiver && !emailRegex.test(receiver)) pushIssue(node.id, { level: 'error', message: 'Email recipient is invalid' })
        if (!body) pushIssue(node.id, { level: 'error', message: 'Email body is required' })
        if (!subject) pushIssue(node.id, { level: 'warning', message: 'Email subject is recommended' })
      }

      if (node.data?.agentId) {
        const prompt = node.data?.aiConfig?.prompt?.trim()
        if (!prompt) pushIssue(node.id, { level: 'warning', message: 'Linked agent has no prompt; output may be generic' })
      }
    })

    const errors = Object.values(issuesByNode).flat().filter(i => i.level === 'error').length
    const warnings = Object.values(issuesByNode).flat().filter(i => i.level === 'warning').length

    return {
      ok: errors === 0,
      errors,
      warnings,
      issuesByNode,
    }
  }, [nodes, connections])

  const handleMouseUp = useCallback(() => {
    setIsDraggingCanvas(false)
    setDraggingNodeId(null)
    
    // If we were connecting, check if we dropped on a valid target
    if (connectingNodeId) {
      // Hit testing is handled in onPortMouseUp usually, but if we release on canvas, cancel
      setConnectingNodeId(null)
      setConnectingHandleId(null)
    }
  }, [connectingNodeId])

  const handleValidate = useCallback(async () => {
    const result = validateWorkflow()
    setValidationIssuesByNode(result.issuesByNode)
    setValidationSummary({ errors: result.errors, warnings: result.warnings })
    const { toast } = await import('sonner')
    if (result.ok) {
      toast.success('Workflow validation passed', { description: result.warnings ? `${result.warnings} warning${result.warnings === 1 ? '' : 's'} to review` : 'All checks succeeded.' })
    } else {
      const firstIssue = Object.entries(result.issuesByNode).find(([key, list]) => key !== 'global' && list.some(l => l.level === 'error'))
      const message = firstIssue?.[1]?.find(i => i.level === 'error')?.message
        || result.issuesByNode['global']?.find(i => i.level === 'error')?.message
        || 'Check node configuration.'
      toast.error(`Validation failed: ${result.errors} error${result.errors === 1 ? '' : 's'}`, { description: message })
    }
  }, [validateWorkflow])

  // --- Node Interaction ---

  const handleNodeDragStart = useCallback((e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const canvasPos = screenToCanvas(e.clientX, e.clientY)
    const node = nodes.find(n => n.id === id)
    if (node) {
      setDraggingNodeId(id)
      setNodeDragOffset({
        x: canvasPos.x - node.position.x,
        y: canvasPos.y - node.position.y
      })
      setSelectedNodes(new Set([id]))
    }
  }, [nodes, screenToCanvas])

  const handleNodeDataChange = useCallback((id: string, newData: Partial<NodeData>) => {
    const updatedNodes = nodes.map((node: Node) => {
      if (node.id !== id) return node
      const mergedData = { ...node.data, ...newData }
      const actionValue = mergedData.action || node.action
      return {
        ...node,
        data: mergedData,
        action: actionValue,
      }
    })
    setNodes(updatedNodes)
  }, [nodes])

  const handlePortMouseDown = useCallback((e: React.MouseEvent, nodeId: string, type: "input" | "output", handleId: string = "output") => {
    e.stopPropagation()
    if (type === "output") {
      setConnectingNodeId(nodeId)
      setConnectingHandleId(handleId)
    }
  }, [])

  const handleMeasure = useCallback((id: string, size: { width: number, height: number }) => {
    setNodeSizes(prev => {
      const prevSize = prev[id]
      if (prevSize && prevSize.width === size.width && prevSize.height === size.height) return prev
      return { ...prev, [id]: size }
    })
  }, [])

  const handlePortMouseUp = useCallback((e: React.MouseEvent, nodeId: string, type: "input" | "output") => {
    e.stopPropagation()
    if (connectingNodeId && type === "input" && connectingNodeId !== nodeId) {
      const sourceHandle = connectingHandleId || "output"
      const newConnection: Connection = {
        id: `c-${Date.now()}`,
        source: connectingNodeId,
        sourceHandle,
        target: nodeId,
        targetHandle: "input"
      }
      
      const exists = connections.some(c => 
        c.source === newConnection.source && c.target === newConnection.target && c.sourceHandle === newConnection.sourceHandle
      )
      if (!exists) {
        const filtered = connections.filter(c => !(c.source === connectingNodeId && c.sourceHandle === sourceHandle))
        setConnections([...filtered, newConnection])
      }
    }
    setConnectingNodeId(null)
    setConnectingHandleId(null)
  }, [connectingNodeId, connectingHandleId, connections])

  // --- Drag & Drop from Sidebar ---

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const data = e.dataTransfer.getData("application/reactflow")
    if (!data) return

    const { type, label } = JSON.parse(data)
    const pos = screenToCanvas(e.clientX, e.clientY)

    const newNode: Node = {
      id: `node-${Date.now()}`,
      type,
      position: { x: pos.x - 128, y: pos.y - 40 }, // Center the node
      data: { label, description: "New node" }
    }

    // Auto-rewire logic: Check if dropped on a connection
      const droppedOnConnection = connections.find(conn => {
      const sourceNode = nodes.find(n => n.id === conn.source)
      const targetNode = nodes.find(n => n.id === conn.target)
      if (!sourceNode || !targetNode) return false

      // Simple bounding box check + distance check
      // Center of the new node
      const center = { x: newNode.position.x + 128, y: newNode.position.y + 40 }
      
      // Use measured node sizes when available for anchor computation
      const srcSize = nodeSizes[sourceNode.id] || { width: 256, height: 80 }
      const tgtSize = nodeSizes[targetNode.id] || { width: 256, height: 80 }
      // Source output pos: bottom-center of source node
      const start = getOutputAnchor(sourceNode, srcSize, conn.sourceHandle)
      // Target input pos: top-center of target node
      const end = getInputAnchor(targetNode, tgtSize)

      return isPointNearLine(center, start, end, 50) // 50px threshold
    })

    if (droppedOnConnection) {
      // Break connection and insert new node
      const newConn1: Connection = {
        id: `c-${Date.now()}-1`,
        source: droppedOnConnection.source,
        sourceHandle: "output",
        target: newNode.id,
        targetHandle: "input"
      }
      const newConn2: Connection = {
        id: `c-${Date.now()}-2`,
        source: newNode.id,
        sourceHandle: "output",
        target: droppedOnConnection.target,
        targetHandle: "input"
      }

      const filtered = connections.filter((c: Connection) => c.id !== droppedOnConnection.id)
      setConnections(filtered.concat([newConn1, newConn2]))
    } else {
      // If not dropped on a connection, check if we should auto-connect to the selected node
      if (selectedNodes.size === 1) {
        const selectedId = Array.from(selectedNodes)[0]
        const selectedNode = nodes.find(n => n.id === selectedId)
        
        // If selected node is not an End node, connect it to the new node
        if (selectedNode && selectedNode.type !== "end") {
           const newConn: Connection = {
            id: `c-${Date.now()}-auto`,
            source: selectedId,
            sourceHandle: "output",
            target: newNode.id,
            targetHandle: "input"
          }
          setConnections([...connections, newConn])
        }
      }
    }

    setNodes([...nodes, newNode])
    // Select the new node
    setSelectedNodes(new Set([newNode.id]))
  }, [screenToCanvas, connections, nodes, selectedNodes])

  // --- Deletion ---
  
  const deleteSelected = useCallback(() => {
    const selectedIds = Array.from(selectedNodes)
    if (selectedIds.length === 0) return

    // Filter out Start and End nodes from deletion
    const nodesToDelete = selectedIds.filter(id => {
      const node = nodes.find(n => n.id === id)
      return node && node.type !== "start" && node.type !== "end"
    })

    if (nodesToDelete.length === 0) return

    // Auto-reconnect logic before deleting
    // For each deleted node, find its input source and output target
    // If it has exactly one input and one output, connect them
    let newConnections = [...connections]
    
    nodesToDelete.forEach(nodeId => {
      const inputs = connections.filter(c => c.target === nodeId)
      const outputs = connections.filter(c => c.source === nodeId)
      
      // Remove connections attached to this node
      newConnections = newConnections.filter(c => c.source !== nodeId && c.target !== nodeId)

      // If simple 1-in-1-out, reconnect
      if (inputs.length === 1 && outputs.length === 1) {
        const sourceId = inputs[0].source
        const targetId = outputs[0].target
        
        // Don't create duplicate connections
        if (!newConnections.some(c => c.source === sourceId && c.target === targetId)) {
          newConnections.push({
            id: `c-reconnect-${Date.now()}`,
            source: sourceId,
            sourceHandle: "output",
            target: targetId,
            targetHandle: "input"
          })
        }
      }
    })

    setConnections(newConnections)
    setNodes(nodes.filter((n: Node) => !nodesToDelete.includes(n.id)))
    setSelectedNodes(new Set())
  }, [selectedNodes, connections, nodes])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null
      const isInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.getAttribute("contenteditable") === "true")
      if ((e.key === "Delete" || e.key === "Backspace") && !isInput) {
        e.preventDefault()
        deleteSelected()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [deleteSelected])

  // --- Path Highlighting ---
  // Find all upstream and downstream nodes from hoveredNodeId
  const getConnectedNodes = (nodeId: string) => {
    const connected = new Set<string>()
    const traverse = (currentId: string, direction: "up" | "down") => {
      connected.add(currentId)
      const relevantConns = connections.filter(c => 
        direction === "up" ? c.target === currentId : c.source === currentId
      )
      relevantConns.forEach(c => {
        const nextId = direction === "up" ? c.source : c.target
        if (!connected.has(nextId)) traverse(nextId, direction)
      })
    }
    traverse(nodeId, "up")
    traverse(nodeId, "down")
    return connected
  }

  const highlightedNodes = hoveredNodeId ? getConnectedNodes(hoveredNodeId) : new Set()

  const inferProviderFromModel = useCallback((model?: string) => {
    if (!model) return undefined
    const normalized = model.toLowerCase()
    if (normalized.startsWith("claude") || normalized.includes("anthropic")) return "anthropic"
    if (normalized.startsWith("gemini") || normalized.includes("google")) return "google"
    return "openai"
  }, [])

  const buildStepFromNode = useCallback((n: Node) => {
    const nodeData = (n.data || {}) as NodeData
    const actionObj = typeof n.action === "object"
      ? (n.action as any)
      : typeof nodeData.action === "object"
        ? (nodeData.action as any)
        : undefined

    let service = "custom"
    let action = "Custom Action"
    let config: Record<string, any> = {}

    if (actionObj?.type === "send_message") {
      service = "notification"
      action = "Send SMS"
      config = {
        receiver: actionObj?.parameters?.recipient_id,
        body: actionObj?.parameters?.message_content,
      }
    } else if (actionObj?.type === "send_email") {
      service = "email"
      action = "Send Email"
      config = {
        receiver: actionObj?.parameters?.to_email,
        subject: actionObj?.parameters?.subject,
        body: actionObj?.parameters?.body,
      }
    }

    if (nodeData.aiConfig?.language) {
      config = {
        ...config,
        language: nodeData.aiConfig.language,
      }
    }

    if (nodeData.agentId) {
      service = service === "custom" ? "ai-agent" : service
      action = action === "Custom Action" ? "Generate Content" : action
      const provider = nodeData.aiConfig?.provider || inferProviderFromModel(nodeData.aiConfig?.model)
      config = {
        ...config,
        agentId: nodeData.agentId,
        agentPrompt: nodeData.aiConfig?.prompt ?? "",
        agentModel: nodeData.aiConfig?.model ?? "",
        language: nodeData.aiConfig?.language || nodeData.language || 'en-US',
        agentLanguage: nodeData.aiConfig?.language || nodeData.language || 'en-US',
        autoEvents: nodeData.events ?? [],
        agentTemperature: nodeData.aiConfig?.temperature,
        agentMaxTokens: nodeData.aiConfig?.maxTokens,
        agentProvider: provider,
      }
    }

    return {
      id: n.id,
      type: "action",
      service,
      action,
      config: {
        ...config,
        nodeLabel: nodeData.label,
        nodeDescription: nodeData.description,
      },
    }
  }, [inferProviderFromModel])

  // --- Workflow Run Integration ---
  const [runStatus, setRunStatus] = useState<string>("")
  // Use apiClient.runFlow to run workflow
  // Import apiClient
  // @ts-ignore
  // eslint-disable-next-line
  const { apiClient } = require("@/lib/api-client")
  const handleRunWorkflow = async () => {
    setRunStatus("Running...");
    try {
      const validation = validateWorkflow()
      setValidationIssuesByNode(validation.issuesByNode)
      setValidationSummary({ errors: validation.errors, warnings: validation.warnings })
      if (!validation.ok) {
        const { toast } = await import('sonner')
        toast.error('Fix validation errors before running', { description: `${validation.errors} error${validation.errors === 1 ? '' : 's'} detected.` })
        setRunStatus('Validation failed')
        return
      }
      // Build workflow steps for backend
      const steps = nodes
        .filter(n => n.type !== "start" && n.type !== "end")
        .map(buildStepFromNode)
      // console.log("Workflow steps to run:", steps);
      // Use connections from state
      const result = await apiClient.runFlow(DEFAULT_FLOW_ID, { steps, connections });
      if (result.ok) {
        setRunStatus("Workflow executed successfully!");
      } else {
        setRunStatus("Error: " + (result.error || "Unknown error"));
      }
    } catch (e: any) {
      setRunStatus("Error: " + (e?.message || "Unknown error"));
    }
  }

  const handleFillAgentContent = useCallback(async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node || node.type !== "action") return

    const step = buildStepFromNode(node)
    const agentId = (step.config as any)?.agentId
    if (!agentId) {
      const { toast } = await import('sonner')
      toast.error('Select an AI agent before filling.', { description: 'Pick an agent in the node configuration to generate output.' })
      return
    }

    const channel: 'sms' | 'whatsapp' | 'email' = step.service === 'email'
      ? 'email'
      : step.service === 'messaging'
        ? 'whatsapp'
        : 'sms'

    try {
      setPreviewNodeId(nodeId)
      setPreviewLoading(true)
      const response = await apiClient.previewAgent({
        flowId: DEFAULT_FLOW_ID,
        nodeId,
        channel,
        step,
      })
      const body = response.body || ''
      const subject = response.subject
      const updatedNodes = nodes.map(n => {
        if (n.id !== nodeId) return n
        const existingData = (n.data || {}) as NodeData
        let actionConfig: any = typeof n.action === 'object' ? { ...(n.action as any) } : undefined
        if (!actionConfig && typeof existingData.action === 'object') {
          actionConfig = { ...(existingData.action as any) }
        }
        if (!actionConfig) {
          actionConfig = channel === 'email'
            ? { type: 'send_email', parameters: {} }
            : { type: 'send_message', parameters: {} }
        }
        const parameters = { ...(actionConfig.parameters || {}) }
        if (channel === 'email') {
          parameters.body = body
          if (typeof subject === 'string' && subject.length > 0) {
            parameters.subject = subject
          }
        } else {
          parameters.message_content = body
          parameters.body = body
        }
        const updatedAction = { ...actionConfig, parameters }
        const updatedAiConfig = { ...(existingData.aiConfig || {}) }
        if (response.agentModel) {
          updatedAiConfig.model = response.agentModel
        }
        if (response.agentProvider) {
          updatedAiConfig.provider = response.agentProvider
        }
        if (response.agentLanguage) {
          updatedAiConfig.language = response.agentLanguage
        }
        const mergedAiConfig: AIConfig = {
          model: updatedAiConfig.model || existingData.aiConfig?.model || 'gpt-4o',
          temperature: typeof updatedAiConfig.temperature === 'number'
            ? updatedAiConfig.temperature
            : typeof existingData.aiConfig?.temperature === 'number'
              ? existingData.aiConfig.temperature
              : 0.7,
          maxTokens: typeof updatedAiConfig.maxTokens === 'number'
            ? updatedAiConfig.maxTokens
            : typeof existingData.aiConfig?.maxTokens === 'number'
              ? existingData.aiConfig.maxTokens
              : 1000,
          prompt: typeof updatedAiConfig.prompt === 'string'
            ? updatedAiConfig.prompt
            : existingData.aiConfig?.prompt || '',
          evaluateLeadState: Boolean(updatedAiConfig.evaluateLeadState ?? existingData.aiConfig?.evaluateLeadState),
          provider: updatedAiConfig.provider || existingData.aiConfig?.provider,
          language: updatedAiConfig.language || existingData.aiConfig?.language || existingData.language || 'en-US',
        }
        return {
          ...n,
          action: updatedAction,
          data: {
            ...existingData,
            action: updatedAction,
            language: response.agentLanguage || existingData.language,
            aiConfig: mergedAiConfig,
          },
        }
      })
      setNodes(updatedNodes)
      const { toast } = await import('sonner')
      toast.success('Content filled from agent', { description: channel === 'email' ? 'Subject and body updated.' : 'Message body updated.' })
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to generate preview'
      const { toast } = await import('sonner')
      toast.error('Autofill failed', { description: message })
    } finally {
      setPreviewLoading(false)
      setPreviewNodeId(null)
    }
  }, [nodes, buildStepFromNode, setNodes])

  return (
    <div className={canvasStyles.canvasRoot}>
      {/* Toolbar */}
      <div className={canvasStyles.toolbar}>
        <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors">
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono w-12 text-center text-muted-foreground">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="Reset View">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Run Workflow Button */}
      <div className={canvasStyles.runArea}>
        <button onClick={handleValidate} className="px-3 py-1.5 text-xs font-semibold border border-border rounded-lg bg-background hover:bg-secondary transition-colors">Validate</button>
        <button onClick={handleRunWorkflow} className={canvasStyles.runButton}>Run Workflow</button>
        {runStatus && (
          <span className="text-xs text-muted-foreground bg-card px-2 py-1 rounded border border-border">{runStatus}</span>
        )}
        {validationSummary && (
          <span className="text-xs text-muted-foreground">
            {validationSummary.errors > 0 ? `${validationSummary.errors} error${validationSummary.errors === 1 ? '' : 's'}` : '0 errors'}, {validationSummary.warnings} warning{validationSummary.warnings === 1 ? '' : 's'}
          </span>
        )}
      </div>
      {/* Canvas Area */}
      <div
        ref={canvasRef}
        className={canvasStyles.canvasArea}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          backgroundImage: "radial-gradient(#e5e7eb 1px, transparent 1px)",
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          backgroundPosition: `${offset.x}px ${offset.y}px`,
        }}
      >
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {/* Connections Layer */}
          <svg className={canvasStyles.svgLayer}>
            {connections.map(conn => {
              // Use sortedNodes for source/target lookup to ensure correct node references
              const sourceNode = sortedNodes.find(n => n.id === conn.source)
              const targetNode = sortedNodes.find(n => n.id === conn.target)
              if (!sourceNode || !targetNode) return null

              const isHighlighted = highlightedNodes.has(conn.source) && highlightedNodes.has(conn.target)

                    // Compute anchor points using measured sizes when available
                    const srcSize = nodeSizes[sourceNode.id] || { width: 256, height: 80 }
                    const tgtSize = nodeSizes[targetNode.id] || { width: 256, height: 80 }
                    const startPoint = getOutputAnchor(sourceNode, srcSize, conn.sourceHandle)
                    const endPoint = getInputAnchor(targetNode, tgtSize)

                    return (
                      <ConnectionComponent
                        key={conn.id}
                        connection={conn}
                        sourcePoint={startPoint}
                        targetPoint={endPoint}
                        isHighlight={isHighlighted}
                      />
                    )
            })}
            
            {/* Active Connection Line (while dragging) */}
            {connectingNodeId && (() => {
              const node = nodes.find(n => n.id === connectingNodeId)
              if (!node) return null
              const size = nodeSizes[node.id] || { width: 256, height: 80 }
              const start = getOutputAnchor(node, size, connectingHandleId || undefined)
              return (
                <path
                  d={getBezierPath(start, mousePos)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeDasharray="5,5"
                  className="text-primary/50"
                />
              )
            })()}
          </svg>

          {/* Nodes Layer */}
          {sortedNodes.map(node => (
            // console.log("Rendering node:", node),
            <div 
              key={node.id} 
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onMouseUp={(e) => {
                // Handle dropping a connection on a node input
                if (connectingNodeId && connectingNodeId !== node.id) {
                  handlePortMouseUp(e, node.id, "input")
                }
              }}
              className={selectedNodes.has(node.id) ? "z-50 relative" : "z-10 relative"}
            >
              <NodeComponent
                node={node}
                  
                isSelected={selectedNodes.has(node.id)}
                isHighlight={highlightedNodes.has(node.id)}
                scale={scale}
                validationIssues={validationIssuesByNode[node.id]}
                onFillAgent={handleFillAgentContent}
                previewLoading={previewLoading && previewNodeId === node.id}
                onNodeClick={(id, shift) => {
                  if (shift) {
                    const newSelected = new Set(selectedNodes)
                    if (newSelected.has(id)) newSelected.delete(id)
                    else newSelected.add(id)
                    setSelectedNodes(newSelected)
                  } else {
                    setSelectedNodes(new Set([id]))
                  }
                }}
                onNodeDragStart={handleNodeDragStart}
                onPortMouseDown={handlePortMouseDown}
                onNodeDataChange={handleNodeDataChange}
                onMeasure={handleMeasure}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Hint / Status */}
      <div className={canvasStyles.hint}>
        {connectingNodeId ? "Release on another node to connect" : "Drag nodes from sidebar • Shift+Click to multi-select • Backspace to delete"}
      </div>
    </div>
  )
}

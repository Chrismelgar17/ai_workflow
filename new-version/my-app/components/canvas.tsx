"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { Node, Connection, Position, NodeType } from "@/lib/types"
import NodeComponent from "./node"
import ConnectionComponent from "./connection"
import { getBezierPath, distance, isPointNearLine } from "@/lib/utils"
import { Plus, Minus, MousePointer2, Hand, Trash2, RotateCcw } from 'lucide-react'

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

export function Canvas() {
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES)
  const [connections, setConnections] = useState<Connection[]>(INITIAL_CONNECTIONS)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState<Position>({ x: 0, y: 0 })
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false)
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 })
  
  // Node dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [nodeDragOffset, setNodeDragOffset] = useState<Position>({ x: 0, y: 0 })

  // Connection creation state
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState<Position>({ x: 0, y: 0 })

  // Selection state
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

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
      setNodes(prev => prev.map(node => {
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
      }))
    }
  }, [isDraggingCanvas, dragStart, draggingNodeId, nodeDragOffset, screenToCanvas])

  const handleMouseUp = useCallback(() => {
    setIsDraggingCanvas(false)
    setDraggingNodeId(null)
    
    // If we were connecting, check if we dropped on a valid target
    if (connectingNodeId) {
      // Hit testing is handled in onPortMouseUp usually, but if we release on canvas, cancel
      setConnectingNodeId(null)
    }
  }, [connectingNodeId])

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

  const handleNodeDataChange = useCallback((id: string, newData: any) => {
    setNodes(prev => prev.map(node => {
      if (node.id === id) {
        return { ...node, data: newData }
      }
      return node
    }))
  }, [])

  const handlePortMouseDown = useCallback((e: React.MouseEvent, nodeId: string, type: "input" | "output") => {
    e.stopPropagation()
    if (type === "output") {
      setConnectingNodeId(nodeId)
    }
  }, [])

  const handlePortMouseUp = useCallback((e: React.MouseEvent, nodeId: string, type: "input" | "output") => {
    e.stopPropagation()
    if (connectingNodeId && type === "input" && connectingNodeId !== nodeId) {
      // Create connection
      const newConnection: Connection = {
        id: `c-${Date.now()}`,
        source: connectingNodeId,
        sourceHandle: "output",
        target: nodeId,
        targetHandle: "input"
      }
      
      // Check if connection already exists
      const exists = connections.some(c => 
        c.source === newConnection.source && c.target === newConnection.target
      )
      
      if (!exists) {
        setConnections(prev => [...prev, newConnection])
      }
      setConnectingNodeId(null)
    }
  }, [connectingNodeId, connections])

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
      
      // Source output pos
      const start = { x: sourceNode.position.x + 256, y: sourceNode.position.y + 40 }
      // Target input pos
      const end = { x: targetNode.position.x, y: targetNode.position.y + 40 }

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

      setConnections(prev => prev.filter(c => c.id !== droppedOnConnection.id).concat([newConn1, newConn2]))
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
          setConnections(prev => [...prev, newConn])
        }
      }
    }

    setNodes(prev => [...prev, newNode])
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
    setNodes(prev => prev.filter(n => !nodesToDelete.includes(n.id)))
    setSelectedNodes(new Set())
  }, [selectedNodes, connections, nodes])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
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

  // --- Workflow Run Integration ---
  const [runStatus, setRunStatus] = useState<string>("")
  const handleRunWorkflow = async () => {
    setRunStatus("Running...");
    try {
      // Build workflow steps for backend
      const steps = nodes.filter(n => n.type !== "start" && n.type !== "end").map(n => {
        let service = "custom", action = "Custom Action", config = {};
        // Map node type/action to backend service/action/config
        if (n.data.action?.type === "send_message") {
          service = "notification";
          action = "Send SMS";
          config = {
            sender: n.data.action?.parameters?.sender_phone,
            receiver: n.data.action?.parameters?.recipient_id,
            body: n.data.action?.parameters?.message_content
          };
        } else if (n.data.action?.type === "send_email") {
          service = "email";
          action = "Send Email";
          config = {
            sender: n.data.action?.parameters?.from_email,
            receiver: n.data.action?.parameters?.to_email,
            subject: n.data.action?.parameters?.subject,
            body: n.data.action?.parameters?.body
          };
        }
        return {
          id: n.id,
          type: "action",
          service,
          action,
          config
        };
      });
      // Use a demo flow id for now
      const flowId = "demo-flow-1";
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = (typeof window !== 'undefined') ? localStorage.getItem('auth_token') : null;
      console.log('Workflow Run: Sending token:', token);
      const res = await fetch(`${apiUrl}/api/flows/${flowId}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ steps })
      });
      const result = await res.json();
      if (result.ok) {
        setRunStatus("Workflow executed successfully!");
      } else {
        setRunStatus("Error: " + (result.error || "Unknown error"));
      }
    } catch (e: any) {
      setRunStatus("Error: " + (e?.message || "Unknown error"));
    }
  };
  return (
    <div className="relative w-full h-full overflow-hidden bg-background select-none">
      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-card p-1.5 rounded-xl shadow-sm border border-border">
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
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <button
          onClick={handleRunWorkflow}
          className="px-3 py-2 bg-primary text-white rounded shadow hover:bg-primary/80 text-xs font-semibold"
        >Run Workflow</button>
        {runStatus && (
          <span className="text-xs text-muted-foreground bg-card px-2 py-1 rounded border border-border">{runStatus}</span>
        )}
      </div>
      {/* Canvas Area */}
      <div
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
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
          <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none">
            {connections.map(conn => {
              const sourceNode = nodes.find(n => n.id === conn.source)
              const targetNode = nodes.find(n => n.id === conn.target)
              if (!sourceNode || !targetNode) return null

              const isHighlighted = highlightedNodes.has(conn.source) && highlightedNodes.has(conn.target)

              return (
                <ConnectionComponent
                  key={conn.id}
                  connection={conn}
                  sourcePos={sourceNode.position}
                  targetPos={targetNode.position}
                  isHighlight={isHighlighted}
                />
              )
            })}
            
            {/* Active Connection Line (while dragging) */}
            {connectingNodeId && (
              <path
                d={getBezierPath(
                  { 
                    x: nodes.find(n => n.id === connectingNodeId)!.position.x + 256, 
                    y: nodes.find(n => n.id === connectingNodeId)!.position.y + 40 
                  },
                  mousePos
                )}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeDasharray="5,5"
                className="text-primary/50"
              />
            )}
          </svg>

          {/* Nodes Layer */}
          {nodes.map(node => (
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
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Hint / Status */}
      <div className="absolute bottom-4 left-4 z-20 bg-card/80 backdrop-blur px-4 py-2 rounded-full border border-border text-xs text-muted-foreground shadow-sm pointer-events-none">
        {connectingNodeId ? "Release on another node to connect" : "Drag nodes from sidebar • Shift+Click to multi-select • Backspace to delete"}
      </div>
    </div>
  )
}

"use client"

import React, { useRef, useCallback, useEffect, useMemo, useState, use } from "react"
import { useWorkflowCanvasStore } from "@/stores/workflow-canvas-store"
import { Node, Connection, Position, NodeType, NodeData } from "@/lib/types"
import NodeComponent from "./node"
import ConnectionComponent from "./connection"
import { getBezierPath, distance, isPointNearLine } from "@/lib/utils"
import { Plus, Minus, MousePointer2, Hand, Trash2, RotateCcw } from 'lucide-react'
import canvasStyles from './canvas.module.css'

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
      // Only use data.connections if it exists and is different from INITIAL_CONNECTIONS
      let allConnections = (data?.connections && JSON.stringify(data.connections) !== JSON.stringify(INITIAL_CONNECTIONS))
        ? data.connections
        : INITIAL_CONNECTIONS;
      const validNodeIds = new Set(nodes.map(n => n.id));
      allConnections = allConnections.filter(conn => validNodeIds.has(conn.source) && validNodeIds.has(conn.target));

      // Ensure at least one connection with start as source
      const hasStartSource = allConnections.some(conn => {
        const sourceNode = nodes.find(n => n.id === conn.source)
        return sourceNode && sourceNode.type === "start";
      });
      // Ensure at least one connection with end as target
      const hasEndTarget = allConnections.some(conn => {
        const targetNode = nodes.find(n => n.id === conn.target)
        return targetNode && targetNode.type === "end";
      });

      // Add default connection if missing
      if (!hasStartSource) {
        const startNode = nodes.find(n => n.type === "start");
        const endNode = nodes.find(n => n.type === "end");
        if (startNode && endNode) {
          allConnections.push({
            id: `c-init-${Date.now()}`,
            source: startNode.id,
            sourceHandle: "output",
            target: endNode.id,
            targetHandle: "input"
          });
        }
      }
      if (!hasEndTarget) {
        const startNode = nodes.find(n => n.type === "start");
        const endNode = nodes.find(n => n.type === "end");
        if (startNode && endNode) {
          allConnections.push({
            id: `c-init-${Date.now()}-end`,
            source: startNode.id,
            sourceHandle: "output",
            target: endNode.id,
            targetHandle: "input"
          });
        }
      }
      return allConnections;
    }, [data, nodes])
    useEffect(() => {console.log("Connections:", connections)}, [connections])
  const setNodes = (v: Node[]) => store.setSteps(workflowId, v)
  const setConnections = (v: Connection[]) => store.setConnections(workflowId, v)
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

  // Measured sizes for nodes (filled by Node components)
  const [nodeSizes, setNodeSizes] = useState<Record<string, { width: number, height: number }>>({})

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
    const updatedNodes = nodes.map((node: Node) => {
      console.log("Updating node:", id, newData);
      if (node.id === id) {
        // If newData contains 'action', replace action, not nest
        return { ...node, action: newData.action};
      }
      return node;
    });
    console.log("Updated nodes:", updatedNodes);
    setNodes(updatedNodes);
  }, [nodes]);

  const handlePortMouseDown = useCallback((e: React.MouseEvent, nodeId: string, type: "input" | "output") => {
    e.stopPropagation()
    if (type === "output") {
      setConnectingNodeId(nodeId)
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
        setConnections([...connections, newConnection])
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
      
      // Use measured node sizes when available for anchor computation
      const srcSize = nodeSizes[sourceNode.id] || { width: 256, height: 80 }
      const tgtSize = nodeSizes[targetNode.id] || { width: 256, height: 80 }
      // Source output pos: bottom-center of source node
      const start = { x: sourceNode.position.x + srcSize.width / 2, y: sourceNode.position.y + srcSize.height }
      // Target input pos: top-center of target node
      const end = { x: targetNode.position.x + tgtSize.width / 2, y: targetNode.position.y }

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
      // Prevent node deletion if typing in an input or textarea
      const active = document.activeElement;
      const isInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.getAttribute("contenteditable") === "true");
      if ((e.key === "Delete" || e.key === "Backspace") && !isInput) {
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelected]);

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
  // Use apiClient.runFlow to run workflow
  // Import apiClient
  // @ts-ignore
  // eslint-disable-next-line
  const { apiClient } = require("@/lib/api-client")
  const handleRunWorkflow = async () => {
    setRunStatus("Running...");
    try {
      // Build workflow steps for backend
      const steps = nodes.filter(n => n.type !== "start" && n.type !== "end").map(n => {
        // console.log("Building step for node:", n.action);
        let service = "custom", action = "Custom Action", config = {};
          // Normalize action which may be either a string (label) or an object with { type, parameters }
          const actionObj = typeof n.action === 'object' ? (n.action as any) : undefined
          // Map node type/action to backend service/action/config
          if (actionObj?.type === "send_message") {
            service = "notification";
            action = "Send SMS";
            config = {
              sender: actionObj?.parameters?.sender_phone,
              receiver: actionObj?.parameters?.recipient_id,
              body: actionObj?.parameters?.message_content
            };
          } else if (actionObj?.type === "send_email") {
            service = "email";
            action = "Send Email";
            config = {
              sender: actionObj?.parameters?.from_email,
              receiver: actionObj?.parameters?.to_email,
              subject: actionObj?.parameters?.subject,
              body: actionObj?.parameters?.body
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
      // console.log("Workflow steps to run:", steps);
      // Use a demo flow id for now
      const flowId = "flow_cust_onboarding";
      // Use connections from state
      const result = await apiClient.runFlow(flowId, { steps, connections });
      if (result.ok) {
        setRunStatus("Workflow executed successfully!");
      } else {
        setRunStatus("Error: " + (result.error || "Unknown error"));
      }
    } catch (e: any) {
      setRunStatus("Error: " + (e?.message || "Unknown error"));
    }
  }

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
        <button onClick={handleRunWorkflow} className={canvasStyles.runButton}>Run Workflow</button>
        {runStatus && (
          <span className="text-xs text-muted-foreground bg-card px-2 py-1 rounded border border-border">{runStatus}</span>
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
                    const startPoint = { x: sourceNode.position.x + srcSize.width / 2, y: sourceNode.position.y + srcSize.height }
                    const endPoint = { x: targetNode.position.x + tgtSize.width / 2, y: targetNode.position.y }

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
              const start = { x: node.position.x + size.width / 2, y: node.position.y + size.height }
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

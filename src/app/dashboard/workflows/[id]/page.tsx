"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {Canvas} from "../workflow-canvas"
import { Sidebar } from "../sidebar"
import apiClient from "@/lib/api-client"
import useWorkflowCanvasStore from "@/stores/workflow-canvas-store"

export default function WorkflowDesignPage() {
  const router = useRouter()
  const params = useParams()
  const store = useWorkflowCanvasStore()
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : 'demo-canvas'

  // Initialize canvas state and hydrate the title/status from the selected flow
  useEffect(() => {
    if (!id) return
    store.init(id)
  }, [id])

  const workflow = store.byId[id]
  // Map steps to Node type if needed
  const nodes = (workflow?.steps || []).map(step => ({
    id: step.id,
    type: step.type === "trigger" ? "start" : "action", // or map as needed
    position: (workflow as any).positions?.[step.id] || { x: 100, y: 100 },
    data: { label: (step as any).action, ...((step as any).config || {}) }
  }))
  const connections = workflow?.connections || []

  return (
     <div className="flex w-full h-full pt-14">
        <Sidebar />
        <main className="flex-1 relative">
          <Canvas />
        </main>
      </div>
  )
}
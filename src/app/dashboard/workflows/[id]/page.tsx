"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { WorkflowCanvas } from "../workflow-canvas"
import apiClient from "@/lib/api-client"
import useWorkflowCanvasStore from "@/stores/workflow-canvas-store"

export default function WorkflowDesignPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const store = useWorkflowCanvasStore()
  const id = params?.id || null

  // Initialize canvas state and hydrate the title/status from the selected flow
  useEffect(() => {
    if (!id) return
    // Ensure store entry exists
    store.init(id)

    const current = useWorkflowCanvasStore.getState().byId[id]
    const shouldHydrate = !current || !current.name || current.name === "Untitled Workflow"

    if (shouldHydrate) {
      apiClient
        .getFlow(id)
        .then((flow: any) => {
          if (!flow) return
          if (flow.name) store.setName(id, flow.name)
          if (flow.status) store.setStatus(id, flow.status)
        })
        .catch(() => {
          // ignore: demo mode/offline
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <WorkflowCanvas
      workflowId={id}
      onBack={() => router.push("/dashboard/workflows")}
    />
  )
}

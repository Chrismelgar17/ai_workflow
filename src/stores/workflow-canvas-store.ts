"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export type WorkflowStep = {
  id: string
  type: "trigger" | "action"
  service: string
  action: string
  config: Record<string, string>
  status: "configured" | "incomplete" | "error"
}

export type StepConnection = {
  id: string
  fromStep: string
  toStep: string
  description?: string
}

export type WorkflowData = {
  name: string
  status: "draft" | "active"
  steps: WorkflowStep[]
  connections: StepConnection[]
}

type Store = {
  byId: Record<string, WorkflowData>
  init: (id: string) => void
  setName: (id: string, name: string) => void
  setStatus: (id: string, status: WorkflowData["status"]) => void
  setSteps: (id: string, steps: WorkflowStep[]) => void
  setConnections: (id: string, connections: StepConnection[]) => void
  reset: (id: string) => void
}

const initialData: WorkflowData = {
  name: "Untitled Workflow",
  status: "draft",
  steps: [
    {
      id: "step-1",
      type: "trigger",
      service: "webhook",
      action: "HTTP Request Received",
      config: {},
      status: "configured",
    },
  ],
  connections: [],
}

export const useWorkflowCanvasStore = create<Store>()(
  persist(
    (set, get) => ({
      byId: {},
      init: (id: string) => {
        const exists = get().byId[id]
        if (!exists) {
          set((s) => ({ byId: { ...s.byId, [id]: { ...initialData } } }))
        }
      },
      setName: (id, name) => set((s) => ({ byId: { ...s.byId, [id]: { ...(s.byId[id] || initialData), name } } })),
      setStatus: (id, status) => set((s) => ({ byId: { ...s.byId, [id]: { ...(s.byId[id] || initialData), status } } })),
      setSteps: (id, steps) => set((s) => ({ byId: { ...s.byId, [id]: { ...(s.byId[id] || initialData), steps } } })),
      setConnections: (id, connections) =>
        set((s) => ({ byId: { ...s.byId, [id]: { ...(s.byId[id] || initialData), connections } } })),
      reset: (id) => set((s) => ({ byId: { ...s.byId, [id]: { ...initialData } } })),
    }),
    {
      name: "workflow-canvas-store",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
)

export default useWorkflowCanvasStore

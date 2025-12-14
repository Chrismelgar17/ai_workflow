"use client"

import { create } from "zustand"

import { Node, Connection, Position } from "@/lib/types"
import { persist, createJSONStorage } from "zustand/middleware"

export type WorkflowData = {
  name: string
  status: "draft" | "active"
  steps: Node[]
  connections: Connection[]
  positions?: Record<string, Position>
}

type Store = {
  byId: Record<string, WorkflowData>
  init: (id: string) => void
  setName: (id: string, name: string) => void
  setStatus: (id: string, status: WorkflowData["status"]) => void
  setSteps: (id: string, steps: Node[]) => void
  setConnections: (id: string, connections: Connection[]) => void
  reset: (id: string) => void
}

const initialData: WorkflowData = {
  name: "Untitled Workflow",
  status: "draft",
  steps: [
    {
      id: "start-1",
      type: "start",
      position: { x: 250, y: 80 },
      data: { label: "Start", description: "Workflow trigger", icon: "start" },
    },
    {
      id: "end-1",
      type: "end",
      position: { x: 250, y: 260 },
      data: { label: "End", description: "Workflow completion", icon: "end" },
    },
  ],
  connections: [
    { id: "conn-1", source: "start-1", sourceHandle: "output", target: "end-1", targetHandle: "input" },
  ],
  positions: {},
}

export const useWorkflowCanvasStore = create<Store>()(
  persist(
    (set, get) => ({
      byId: {},
      init: (id: string) => {
        const exists = get().byId[id]
        if (!exists) {
          set((s) => ({ byId: { ...s.byId, [id]: { ...initialData } } }))
          return
        }
        if (!exists.steps || exists.steps.length === 0) {
          set((s) => ({
            byId: {
              ...s.byId,
              [id]: {
                ...exists,
                steps: [...initialData.steps],
                connections: [...(initialData.connections || [])],
                positions: { ...(initialData.positions || {}) },
              },
            },
          }))
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

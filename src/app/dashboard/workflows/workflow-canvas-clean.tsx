"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";

// Clean vertical workflow canvas (Option A). Minimal baseline showing ordered steps.
// Extend gradually with connections, drag/drop, validation, config side panel.

export type WorkflowStep = {
  id: string;
  type: "trigger" | "action";
  name: string;
};

let useWorkflowCanvasStore: any = null;
try {
  useWorkflowCanvasStore = require("../../../stores/workflow-canvas-store").useWorkflowCanvasStore;
} catch {
  // External store absent; fallback to local state.
}

interface Props { workflowId?: string; onBack?: () => void }

const WorkflowCanvasClean: React.FC<Props> = ({ workflowId, onBack }) => {
  const id = workflowId || "demo-clean";
  const [localSteps, setLocalSteps] = useState<WorkflowStep[]>([
    { id: "trigger-1", type: "trigger", name: "Trigger" },
    { id: "action-1", type: "action", name: "First Action" }
  ]);

  // Attempt store subscription
  const storeSteps: WorkflowStep[] | null = (() => {
    if (!useWorkflowCanvasStore) return null;
    try {
      const data = useWorkflowCanvasStore((s: any) => s.byId?.[id]);
      return data?.steps || null;
    } catch { return null; }
  })();

  const steps = storeSteps || localSteps;

  useEffect(() => {
    if (useWorkflowCanvasStore) {
      try { const st = useWorkflowCanvasStore.getState(); if (!st.byId[id]) st.init?.(id); } catch {}
    }
  }, [id]);

  const addStep = useCallback(() => {
    const next = steps.filter(s => s.type === "action").length + 1;
    const newStep: WorkflowStep = { id: `action-${next}`, type: "action", name: `Action ${next}` };
    if (storeSteps && useWorkflowCanvasStore) {
      try {
        const st = useWorkflowCanvasStore.getState();
        st.setSteps(id, [...st.byId[id].steps, newStep]);
        return;
      } catch {}
    }
    setLocalSteps(prev => [...prev, newStep]);
  }, [steps, storeSteps, id]);

  const move = useCallback((stepId: string, dir: -1 | 1) => {
    const mutate = (arr: WorkflowStep[]) => {
      const i = arr.findIndex(s => s.id === stepId); if (i < 0) return arr;
      if (arr[i].type === "trigger") return arr; // keep trigger first
      const tgt = i + dir; if (tgt < 1 || tgt >= arr.length) return arr;
      const copy = [...arr]; [copy[i], copy[tgt]] = [copy[tgt], copy[i]]; return copy;
    };
    if (storeSteps && useWorkflowCanvasStore) {
      try {
        const st = useWorkflowCanvasStore.getState();
        st.setSteps(id, mutate(st.byId[id].steps));
        return;
      } catch {}
    }
    setLocalSteps(prev => mutate(prev));
  }, [storeSteps, id]);

  const validation = useMemo(() => {
    if (!steps.length) return "Empty";
    if (steps[0].type !== "trigger") return "Need trigger";
    return "OK";
  }, [steps]);

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="h-8 w-8 flex items-center justify-center rounded border hover:bg-muted text-xs"
              aria-label="Back"
            >←</button>
          )}
          <h1 className="text-lg font-semibold">Workflow Builder</h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={validation === "OK" ? "text-green-600" : "text-red-600"}>{validation}</span>
          <button onClick={addStep} className="px-2 py-1 border rounded hover:bg-muted">Add Action</button>
        </div>
      </header>
      <div className="flex flex-col gap-3">
        {steps.map((s, i) => (
          <div key={s.id} className="border rounded p-4 bg-card shadow relative group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.type}</p>
                <p className="font-medium" title={s.name}>{s.name}</p>
              </div>
              {s.type === "action" && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => move(s.id, -1)} className="px-2 py-1 text-xs border rounded hover:bg-muted">Up</button>
                  <button onClick={() => move(s.id, 1)} className="px-2 py-1 text-xs border rounded hover:bg-muted">Down</button>
                </div>
              )}
            </div>
            {i < steps.length - 1 && <div className="absolute left-1/2 -bottom-4 w-px h-4 bg-border" />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkflowCanvasClean;

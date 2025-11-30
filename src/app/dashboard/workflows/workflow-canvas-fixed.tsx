"use client"
import React, { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Plus, Trash2, Zap, AlertCircle, CheckCircle, MinusCircle } from "lucide-react"
import { defaultActionForService, actionsForService, getServiceIcon, WORKFLOW_SERVICES } from "@/lib/workflow-nodes"
import useWorkflowCanvasStore from "@/stores/workflow-canvas-store"
import { Node as WorkflowStep, Connection as StepConnection } from "@/lib/types"
import { cn } from "@/lib/utils"

interface WorkflowCanvasProps { workflowId: string | null; onBack: () => void }

export function WorkflowCanvasFixed({ workflowId, onBack }: WorkflowCanvasProps){
  const id = useMemo(()=> workflowId || "demo-canvas", [workflowId])
  const store = useWorkflowCanvasStore()
  useEffect(()=>{ store.init(id) },[id,store])
  const data = useWorkflowCanvasStore(s=>s.byId[id])
  const workflowName = data?.name || "Untitled Workflow"
  const workflowStatus = (data?.status || "draft") as "draft"|"active"
  const steps = (data?.steps || []) as WorkflowStep[]
  const connections = (data?.connections || []) as StepConnection[]
  const setWorkflowName = (name:string)=> store.setName(id,name)
  const setWorkflowStatus = (s:"draft"|"active")=> store.setStatus(id,s)
  const setSteps = (v:WorkflowStep[])=> store.setSteps(id,v)
  const setConnections = (v:StepConnection[])=> store.setConnections(id,v)
  const [selectedStep,setSelectedStep] = useState<string|null>(steps[0]?.id || null)
  const [selectedConnection,setSelectedConnection] = useState<string|null>(null)
  const [zoom,setZoom] = useState(100)
  const [isDeploying,setIsDeploying] = useState(false)
  const [testRunning,setTestRunning] = useState(false)
  const [testErrors,setTestErrors] = useState<Array<{stepId:string; field?:string; message:string; level:'error'|'warning'}>>([])
  const [lastRun,setLastRun] = useState<null | { counts:{triggers:number; schedules:number}; executions:Array<{ stepId:string; type:string; status:'success'|'error'|'skipped'; error?:any }> }>(null)
  const [dragOverAfterId, setDragOverAfterId] = useState<string | 'END' | null>(null)

  const addStepAt = (afterStepId:string|null, serviceKey?:string) => {
    const newStep: any = { id:`step-${Date.now()}`, type:"action", service: serviceKey||"", action: serviceKey? (defaultActionForService(serviceKey)||"") : "Select the event", config:{}, status: serviceKey?"configured":"incomplete" }
    if(afterStepId===null){
      setSteps([...steps,newStep])
      if(steps.length){
        const last = steps[steps.length-1]
        setConnections([...connections,{ id:`conn-${Date.now()}`, source:last.id, sourceHandle: 'output', target:newStep.id, targetHandle: 'input' }])
      }
    } else {
      const idx = steps.findIndex(s=>s.id===afterStepId)
      const arr = [...steps]; arr.splice(idx+1,0,newStep); setSteps(arr)
      const existing = connections.find(c=>c.source===afterStepId)
      if(existing){
        setConnections([
          ...connections.filter(c=>c.id!==existing.id),
          { ...existing, target:newStep.id, targetHandle: existing?.targetHandle || 'input' },
          { id:`conn-${Date.now()}`, source:newStep.id, sourceHandle: 'output', target: existing?.target, targetHandle: existing?.targetHandle || 'input' }
        ])
      } else {
        setConnections([...connections,{ id:`conn-${Date.now()}`, source:afterStepId, sourceHandle: 'output', target:newStep.id, targetHandle: 'input' }])
      }
    }
    setSelectedStep(newStep.id); setSelectedConnection(null)
  }

  const removeStep = (stepId:string) => {
    const idx = steps.findIndex(s=>s.id===stepId); if(idx===0) return
    const incoming = connections.find(c=>c.target===stepId)
    const outgoing = connections.find(c=>c.source===stepId)
    let filtered = connections.filter(c=>c.source!==stepId && c.target!==stepId)
    if(incoming && outgoing){ filtered.push({ id:`conn-${Date.now()}`, source:incoming.source, sourceHandle: incoming.sourceHandle || 'output', target:outgoing.target, targetHandle: outgoing.targetHandle || 'input', description: (incoming as any).description || (outgoing as any).description } as any) }
    setConnections(filtered); setSteps(steps.filter(s=>s.id!==stepId)); if(selectedStep===stepId) setSelectedStep(null)
  }

  const rebuildConnections = (arr: WorkflowStep[]) => {
    const rebuilt: StepConnection[] = []
    for(let i=0;i<arr.length-1;i++){
      rebuilt.push({ id:`conn-${i}-${Date.now()}`, source:arr[i].id, sourceHandle: 'output', target:arr[i+1].id, targetHandle: 'input' })
    }
    setConnections(rebuilt)
  }

  const moveStepAfter = (moveStepId: string, afterStepId: string | null) => {
    if(!moveStepId) return
    const current = [...steps]
    const moving = current.find(s=>s.id===moveStepId)
    if(!moving) return
    // Don't allow moving trigger from index 0
    const movingIndex = current.findIndex(s=>s.id===moveStepId)
    if(movingIndex===0) return
    const filtered = current.filter(s=>s.id!==moveStepId)
    let insertIndex = afterStepId ? filtered.findIndex(s=>s.id===afterStepId) : -1
    if(insertIndex<0) insertIndex = filtered.length-1
    // Insert after the target index
    filtered.splice(insertIndex+1,0,moving)
    setSteps(filtered)
    rebuildConnections(filtered)
    setSelectedStep(moveStepId)
  }

  const handleDropAt = (afterStepId: string | null, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverAfterId(null)
    const serviceKey = e.dataTransfer.getData('text/service')
    const dragStepId = e.dataTransfer.getData('text/step')
    if(serviceKey){ addStepAt(afterStepId, serviceKey) }
    else if(dragStepId){ moveStepAfter(dragStepId, afterStepId) }
  }

  const updateStep = (sid:string, upd:Partial<WorkflowStep>) => setSteps(steps.map(s=> s.id===sid ? { ...s, ...upd } : s))
  const updateConnection = (cid:string, desc:string) => setConnections(connections.map(c=> c.id===cid ? { ...c, description:desc } : c))
  const selectedStepData = steps.find(s=>s.id===selectedStep)
  const selectedConnectionData = connections.find(c=>c.id===selectedConnection)

  const validateWorkflow = () => {
    const errors: Array<{stepId:string; field?:string; message:string; level:'error'|'warning'}> = []
    const email=/^[^@\s]+@[^@\s]+\.[^@\s]+$/; const phone=/^\+?[0-9]{7,15}$/
    if(!steps.length) errors.push({ stepId:'global', message:'Workflow has no steps', level:'error'})
    if(steps[0]?.type!=="trigger") errors.push({ stepId:steps[0]?.id||'global', message:'First step must be a trigger', level:'error'})
    const inbound:Record<string,number>={}; connections.forEach(c=>{ inbound[c.target]=(inbound[c.target]||0)+1 })
    steps.forEach(step=>{
      const s = step as any
      if(step.type==='action' && !inbound[step.id]) errors.push({ stepId:step.id, message:'Action step has no incoming connection', level:'error'})
      const messaging = (s.service==='messaging' && s.action==='Send Message') || (s.service==='notification' && s.action==='Send SMS') || (s.service==='email' && (s.action==='Send Email' || s.action==='Send Template Email'))
      if(messaging){ const cfg:any=s.config||{}; if(!cfg.receiver) errors.push({ stepId:step.id, field:'receiver', message:'Receiver required', level:'error'}); if(!cfg.body) errors.push({ stepId:step.id, field:'body', message:'Message body required', level:'error'}); if(s.service==='email' && cfg.receiver && !email.test(cfg.receiver)) errors.push({ stepId:step.id, field:'receiver', message:'Invalid email', level:'error'}); if(s.service!=='email' && cfg.receiver && !email.test(cfg.receiver) && !phone.test(cfg.receiver)) errors.push({ stepId:step.id, field:'receiver', message:'Receiver phone looks invalid', level:'warning'}) }
      if(s.service==='scheduler' && s.action==='Schedule Task'){ const cfg:any=s.config||{}; if(!cfg.calendarDate) errors.push({ stepId:step.id, field:'calendarDate', message:'Date required', level:'error'}); if(!cfg.startTime) errors.push({ stepId:step.id, field:'startTime', message:'Start time required', level:'error'}); if(!cfg.endTime) errors.push({ stepId:step.id, field:'endTime', message:'End time required', level:'error'}); if(cfg.start && cfg.end){ const s2=Date.parse(cfg.start); const e=Date.parse(cfg.end); if(!isNaN(s2)&&!isNaN(e)&&e<=s2) errors.push({ stepId:step.id, field:'endTime', message:'End must be after start', level:'error'}) } if(!cfg.timezone) errors.push({ stepId:step.id, field:'timezone', message:'Timezone recommended', level:'warning'}) }
    })
    const warnings=errors.filter(e=>e.level==='warning').length; const fatal=errors.filter(e=>e.level==='error').length
    return { ok:fatal===0, errors, warnings }
  }

  const handleDeploy = () => { setIsDeploying(true); try { const result=validateWorkflow(); if(!result.ok){ const errIds=new Set(result.errors.filter(e=>e.level==='error').map(e=>e.stepId)); setSteps(steps.map(s=>errIds.has(s.id)?{...s,status:'error' as const}:{...s,status:'configured' as const})); return } setWorkflowStatus('active'); setLastRun({ counts:{ triggers:1, schedules:0 }, executions: [] }) } finally { setIsDeploying(false) } }
  const handleTestRun = () => { setTestRunning(true); try { const result=validateWorkflow(); const errIds=new Set(result.errors.filter(e=>e.level==='error').map(e=>e.stepId)); setSteps(steps.map(s=>errIds.has(s.id)?{...s,status:'error' as const}:{...s,status:'configured' as const})); setTestErrors(result.errors) } finally { setTestRunning(false) } }

  return (
    <div className="grid grid-rows-[32px_1fr_20px] min-h-screen w-full bg-background">
      <div className="row-start-1 flex items-center justify-between px-4 text-xs text-muted-foreground border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <span className="font-medium">FlowBuilder</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleDeploy} disabled={isDeploying}>{isDeploying?"Deploying...":"Publish"}</Button>
        </div>
      </div>
      <div className="row-start-2 flex h-full w-full">
        <aside className="w-56 border-r border-border bg-card/60 flex flex-col">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide">Components</h2>
            <span className="text-[11px] text-muted-foreground">Drag nodes to the canvas</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 px-3 pb-4">
            {WORKFLOW_SERVICES.map(svc => (
              <div
                key={svc.key}
                className="group rounded-md border border-border/60 bg-card px-3 py-2 text-xs cursor-pointer hover:border-primary"
                onClick={() => addStepAt(steps[steps.length - 1]?.id || null, svc.key)}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData('text/service', svc.key); e.dataTransfer.effectAllowed = 'copy' }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 flex items-center justify-center rounded bg-muted/50 border border-border/50">{getServiceIcon(svc.key)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" title={svc.label}>{svc.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate" title={svc.description}>{svc.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-4 py-2 text-[10px] flex items-center justify-between text-muted-foreground"><span>v1.0.0</span><span>Auto-save</span></div>
        </aside>
        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto relative" style={{ backgroundImage:'radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)', backgroundSize:'20px 20px'}} onDragOver={(e)=>{e.preventDefault()}}>
              <div className="absolute top-3 right-3 z-10">
                <div className="flex items-center gap-1 border border-border rounded-md px-2 py-1 bg-card/80 shadow">
                  <Button variant="ghost" size="icon" disabled={zoom<=40} onClick={()=>setZoom(z=>Math.max(40,z-10))}>-</Button>
                  <span className="text-xs w-10 text-center">{zoom}%</span>
                  <Button variant="ghost" size="icon" disabled={zoom>=160} onClick={()=>setZoom(z=>Math.min(160,z+10))}>+</Button>
                  <Button variant="ghost" size="icon" onClick={()=>setZoom(100)}>↺</Button>
                </div>
              </div>
              <div className="py-6 px-6" style={{ transform:`scale(${zoom/100})`, transformOrigin:'0 0'}}>
                <div className="space-y-5 max-w-2xl">
                  {lastRun && (
                    <Card className="p-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-xs">Last Run</h3>
                        <div className="text-[11px] text-muted-foreground">{lastRun.counts.triggers} triggers • {lastRun.counts.schedules} schedules</div>
                      </div>
                      <div className="mt-2 space-y-1">
                        {lastRun.executions.length===0 && <div className="text-[11px] text-muted-foreground">No immediate actions executed.</div>}
                        {lastRun.executions.map((ex,i)=>(
                          <div key={i} className="flex items-center gap-2 text-[11px]">
                            {ex.status==='success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                            {ex.status==='error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                            {ex.status==='skipped' && <MinusCircle className="h-4 w-4 text-muted-foreground" />}
                            <span className="font-medium">{ex.type}</span>
                            <span className="text-muted-foreground">• step {ex.stepId}</span>
                            {ex.status==='error' && <span className="text-destructive">— {ex.error?.message || 'error'}</span>}
                            {ex.status==='skipped' && <span className="text-muted-foreground">— {ex.error}</span>}
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                  {steps.map((step,index)=>{
                    const isSel = selectedStep===step.id
                    const connection = connections.find(c=>c.source===step.id)
                    return (
                      <div key={step.id} className="relative">
                        <Card
                          draggable={index!==0}
                          onDragStart={(e)=>{ if(index===0){ e.preventDefault(); return } e.dataTransfer.setData('text/step', step.id); e.dataTransfer.effectAllowed='move' }}
                          onDragEnd={()=> setDragOverAfterId(null)}
                          className={cn("transition-colors group border-border/60 cursor-pointer", isSel?"ring-2 ring-primary border-primary shadow-lg":"hover:border-primary/60")}
                          onClick={()=>{setSelectedStep(step.id); setSelectedConnection(null)}}
                        >
                          <div className="p-3 flex items-start gap-3">
                            <div className="mt-0.5">
                              {(step as any).status==='incomplete' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                              {(step as any).status==='error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                              {(step as any).status==='configured' && <CheckCircle className="h-4 w-4 text-green-600" />}
                            </div>
                            <div className="h-9 w-9 rounded-md bg-muted/50 border border-border/50 flex items-center justify-center shrink-0">
                              {(step as any).service? getServiceIcon((step as any).service) : <Zap className="h-4 w-4 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-medium text-muted-foreground">{step.type==='trigger'? 'Workflow trigger': `${index}. Action`}</span>
                                {(step as any).service && <span className="text-[10px] font-normal border px-1 py-0.5 rounded" title={(step as any).service}>{(step as any).service}</span>}
                              </div>
                              <p className="font-medium text-xs truncate" title={(step as any).action}>{(step as any).action || 'Select event'}</p>
                            </div>
                            {step.type!=='trigger' && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e)=>{e.stopPropagation(); removeStep(step.id)}}><Trash2 className="h-4 w-4" /></Button>}
                          </div>
                        </Card>
                        {index < steps.length - 1 && (
                          <div
                            className={cn("flex justify-center py-2 transition-colors", dragOverAfterId===step.id && "bg-primary/10 rounded-md")}
                            onDragOver={(e)=>{ e.preventDefault(); setDragOverAfterId(step.id) }}
                            onDragLeave={()=>{ if(dragOverAfterId===step.id) setDragOverAfterId(null) }}
                            onDrop={(e)=> handleDropAt(step.id, e)}
                          >
                            {(connection as any)?.description && <Button variant="ghost" size="sm" className="ml-2 text-[10px]" onClick={()=>setSelectedConnection((connection as any).id)}>{(connection as any).description}</Button>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div
                    className={cn("flex justify-center py-3 transition-colors", dragOverAfterId==='END' && "bg-primary/10 rounded-md")}
                    onDragOver={(e)=>{ e.preventDefault(); setDragOverAfterId('END') }}
                    onDragLeave={()=>{ if(dragOverAfterId==='END') setDragOverAfterId(null) }}
                    onDrop={(e)=> handleDropAt(steps[steps.length-1]?.id || null, e)}
                  >
                    <div className="h-8" />
                  </div>
                  <div className="text-center text-[10px] text-muted-foreground pb-8">Drag nodes to the canvas • Publish deploys</div>
                </div>
              </div>
            </div>
            {(selectedStepData || selectedConnectionData) && (
              <div className="w-80 border-l border-border bg-card/70 overflow-y-auto">
                <div className="p-5 space-y-5">
                  {selectedStepData && (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold">{selectedStepData.type==='trigger'? 'Trigger':'Action'}</h3>
                          <p className="text-[10px] text-muted-foreground">{selectedStepData.type==='trigger'? 'Setup':'Configure'}</p>
                        </div>
                        {selectedStepData.type!=='trigger' && <Button variant="ghost" size="icon" onClick={()=>removeStep(selectedStepData.id)}><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Service</Label>
                          <div className="grid grid-cols-2 gap-1">
                            {WORKFLOW_SERVICES.map(svc=> (
                              <Button key={svc.key} variant={(selectedStepData as any).service===svc.key? 'default':'outline'} size="sm" className="justify-start text-[10px]" onClick={()=> updateStep(selectedStepData.id,({ service: svc.key, action: defaultActionForService(svc.key)||'', status: svc.key?'configured':'incomplete' } as any))}>{svc.label}</Button>
                            ))}
                          </div>
                        </div>
                        {(selectedStepData as any).service && (
                          <div className="space-y-1">
                            <Label className="text-xs">Event</Label>
                            <div className="grid grid-cols-2 gap-1">
                              {actionsForService((selectedStepData as any).service).map(act=> (
                                <Button key={act} variant={(selectedStepData as any).action===act? 'default':'outline'} size="sm" className="justify-start text-[10px]" onClick={()=> updateStep(selectedStepData.id,({ action: act } as any))}>{act}</Button>
                              ))}
                            </div>
                          </div>
                        )}
                        {(selectedStepData as any).service && (selectedStepData as any).action && (
                          <div className="space-y-2">
                            <Label className="text-xs">Configuration</Label>
                            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3">
                              {((selectedStepData as any).service==='scheduler' && (selectedStepData as any).action==='Schedule Task') ? (
                                <>
                                  <div className="space-y-1"><Label className="text-xs">Calendar</Label><Input placeholder="Calendar ID" className="h-8 text-xs" value={((selectedStepData as any).config?.calendarId as string)||''} onChange={e=>updateStep(selectedStepData.id,({ config:{ ...(((selectedStepData as any).config||{})), calendarId:e.target.value } } as any))} /></div>
                                  <div className="space-y-1"><Label className="text-xs">Description</Label><Textarea placeholder="Scheduled task" className="min-h-[50px] text-xs" value={((selectedStepData as any).config?.description as string)||''} onChange={e=>updateStep(selectedStepData.id,({ config:{ ...(((selectedStepData as any).config||{})), description:e.target.value } } as any))} /></div>
                                  <div className="space-y-1"><Label className="text-xs">Date</Label><Input type="date" className={cn("h-8 text-xs", testErrors.find(e=>e.stepId===selectedStepData.id && e.field==='calendarDate' && e.level==='error') && 'border-red-500 focus-visible:ring-red-500')} value={((selectedStepData as any).config?.calendarDate as string)||''} onChange={e=>{const cfg:any={...(((selectedStepData as any).config||{})), calendarDate:e.target.value}; const st=cfg.startTime, et=cfg.endTime; if(e.target.value && (st||et)){ if(st) cfg.start=`${e.target.value}T${st}:00`; if(et) cfg.end=`${e.target.value}T${et}:00`; } updateStep(selectedStepData.id,({ config:cfg } as any))}} />{testErrors.find(e=>e.stepId===selectedStepData.id && e.field==='calendarDate' && e.level==='error') && <p className="text-[10px] text-red-600">{testErrors.find(e=>e.stepId===selectedStepData.id && e.field==='calendarDate' && e.level==='error')?.message}</p>}</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1"><Label className="text-xs">Start</Label><Input type="time" className={cn("h-8 text-xs", testErrors.find(e=>e.stepId===selectedStepData.id && e.field==='startTime' && e.level==='error') && 'border-red-500 focus-visible:ring-red-500')} value={((selectedStepData as any).config?.startTime as string)||''} onChange={e=>{const cfg:any={...(((selectedStepData as any).config||{})), startTime:e.target.value}; const d=cfg.calendarDate; if(d && e.target.value) cfg.start=`${d}T${e.target.value}:00`; updateStep(selectedStepData.id,({ config:cfg } as any))}} />{testErrors.find(e=>e.stepId===selectedStepData.id && e.field==='startTime' && e.level==='error') && <p className="text-[10px] text-red-600">{testErrors.find(e=>e.stepId===selectedStepData.id && e.field==='startTime' && e.level==='error')?.message}</p>}</div>
                                    <div className="space-y-1"><Label className="text-xs">End</Label><Input type="time" className={cn("h-8 text-xs", testErrors.find(e=>e.stepId===selectedStepData.id && e.field==='endTime' && e.level==='error') && 'border-red-500 focus-visible:ring-red-500')} value={((selectedStepData as any).config?.endTime as string)||''} onChange={e=>{const cfg:any={...(((selectedStepData as any).config||{})), endTime:e.target.value}; const d=cfg.calendarDate; if(d && e.target.value) cfg.end=`${d}T${e.target.value}:00`; updateStep(selectedStepData.id,({ config:cfg } as any))}} />{testErrors.find(e=>e.stepId===selectedStepData.id && e.field==='endTime' && e.level==='error') && <p className="text-[10px] text-red-600">{testErrors.find(e=>e.stepId===selectedStepData.id && e.field==='endTime' && e.level==='error')?.message}</p>}</div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label className="text-xs">Timezone</Label><Input placeholder="UTC" className="h-8 text-xs" value={((selectedStepData as any).config?.timezone as string)||''} onChange={e=>updateStep(selectedStepData.id,({ config:{ ...(((selectedStepData as any).config||{})), timezone:e.target.value } } as any))} /></div><div className="space-y-1"><Label className="text-xs">Preview</Label><div className="text-[10px] text-muted-foreground border rounded px-2 py-1 h-8 flex items-center">{((selectedStepData as any).config?.start as string)||'start ?'} → {((selectedStepData as any).config?.end as string)||'end ?'}</div></div></div>
                                </>
                              ) : (((selectedStepData as any).service==='messaging' && (selectedStepData as any).action==='Send Message') || ((selectedStepData as any).service==='notification' && (selectedStepData as any).action==='Send SMS') || ((selectedStepData as any).service==='email' && ((selectedStepData as any).action==='Send Email' || (selectedStepData as any).action==='Send Template Email'))) ? (
                                <>
                                  <div className="space-y-1"><Label className="text-xs">Sender</Label><Input placeholder={(selectedStepData as any).service==='email'? 'from@example.com':'+1...'} className="h-8 text-xs" value={((selectedStepData as any).config?.sender as string)||''} disabled={!Boolean(((selectedStepData as any).config as any)?.overrideSender)} onChange={e=>updateStep(selectedStepData.id,({ config:{ ...(((selectedStepData as any).config||{})), sender:e.target.value } } as any))} /><div className="flex items-center gap-2"><input id={`override-${selectedStepData.id}`} type="checkbox" className="h-3 w-3" checked={Boolean(((selectedStepData as any).config as any)?.overrideSender)} onChange={e=>{const cfg:any={...(((selectedStepData as any).config||{})), overrideSender:e.target.checked}; if(e.target.checked && !cfg.sender) cfg.sender=''; updateStep(selectedStepData.id,({ config:cfg } as any))}} /><label htmlFor={`override-${selectedStepData.id}`} className="text-[10px]">Override sender</label></div></div>
                                  <div className="space-y-1"><Label className="text-xs">Receiver</Label><Input placeholder={(selectedStepData as any).service==='email'? 'to@example.com':'+1...'} className={cn("h-8 text-xs", testErrors.find(e=>e.stepId===selectedStepData.id && e.field==='receiver' && e.level==='error') && 'border-red-500 focus-visible:ring-red-500')} value={((selectedStepData as any).config?.receiver as string)||''} onChange={e=>updateStep(selectedStepData.id,({ config:{ ...(((selectedStepData as any).config||{})), receiver:e.target.value } } as any))} />{testErrors.find(e=>e.stepId===selectedStepData.id && e.field==='receiver' && e.level==='error') && <p className="text-[10px] text-red-600">{testErrors.find(e=>e.stepId===selectedStepData.id && e.field==='receiver' && e.level==='error')?.message}</p>}</div>
                                  <div className="space-y-1"><Label className="text-xs">Message Body</Label><Textarea placeholder={(selectedStepData as any).service==='email'? 'Email body...':'Message text...'} className={cn("min-h-[60px] text-xs", testErrors.find(e=>e.stepId===selectedStepData.id && e.field==='body' && e.level==='error') && 'border-red-500 focus-visible:ring-red-500')} value={((selectedStepData as any).config?.body as string)||''} onChange={e=>updateStep(selectedStepData.id,({ config:{ ...(((selectedStepData as any).config||{})), body:e.target.value } } as any))} />{testErrors.find(e=>e.stepId===selectedStepData.id && e.field==='body' && e.level==='error') && <p className="text-[10px] text-red-600">{testErrors.find(e=>e.stepId===selectedStepData.id && e.field==='body' && e.level==='error')?.message}</p>}</div>
                                </>
                              ) : (
                                <>
                                  <div className="space-y-1"><Label className="text-xs">Parameter 1</Label><Input placeholder="Enter value..." className="h-8 text-xs" /></div>
                                  <div className="space-y-1"><Label className="text-xs">Parameter 2</Label><Input placeholder="Enter value..." className="h-8 text-xs" /></div>
                                  <p className="text-[10px] text-muted-foreground">Configure {(selectedStepData as any).action} parameters</p>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {selectedConnectionData && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold">Connection Note</h3>
                      <Textarea placeholder="Add a note..." value={(selectedConnectionData as any).description || ''} onChange={e=>updateConnection((selectedConnectionData as any).id, e.target.value)} className="min-h-[70px] text-xs" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

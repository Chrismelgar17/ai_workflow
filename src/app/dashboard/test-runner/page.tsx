'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function TestRunnerPage() {
  const { data: flows } = useQuery({ queryKey: ['flows'], queryFn: () => apiClient.getFlows() })
  const [selectedFlow, setSelectedFlow] = useState<string>('')
  const [inputJson, setInputJson] = useState<string>('{}')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const runTest = async () => {
    setError('')
    setResult(null)
    try {
      // Placeholder until backend exposes execution endpoint
      const parsed = JSON.parse(inputJson)
      setResult({ ok: true, simulated: true, flowId: selectedFlow, input: parsed })
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Test Runner</h1>
        <p className="text-gray-600 dark:text-gray-400">Run workflows with sandboxed input</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run a Test</CardTitle>
          <CardDescription>Select a workflow and provide input JSON</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Workflow</label>
              <select className="w-full h-10 border rounded-md px-3" value={selectedFlow} onChange={(e) => setSelectedFlow(e.target.value)}>
                <option value="">Select a flow…</option>
                {Array.isArray(flows) && flows.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Input (JSON)</label>
              <textarea className="w-full h-40 border rounded-md p-3 font-mono text-sm" value={inputJson} onChange={(e) => setInputJson(e.target.value)} />
            </div>
          </div>
          <Button onClick={runTest} disabled={!selectedFlow}>Run Test</Button>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {result && (
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

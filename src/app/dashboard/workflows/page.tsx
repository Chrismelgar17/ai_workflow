'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/label-badge'
import Link from 'next/link'

export default function WorkflowsPage() {
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['flows'],
    queryFn: () => apiClient.getFlows(),
  })

  const deployMutation = useMutation({
    mutationFn: (id: string) => apiClient.deployFlow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flows'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteFlow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flows'] }),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workflows</h1>
        <p className="text-gray-600 dark:text-gray-400">Create, deploy and manage your workflows</p>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="p-6">Loading workflows…</CardContent>
        </Card>
      )}

      {isError && (
        <Card>
          <CardContent className="p-6 text-red-600">
            Failed to load flows: {(error as any)?.message || 'Backend not reachable'}
          </CardContent>
        </Card>
      )}

      {Array.isArray(data) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((flow: any) => (
            <Card key={flow.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{flow.name}</CardTitle>
                  <Badge variant={flow.status === 'active' ? 'default' : 'secondary'}>
                    {flow.status || 'unknown'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-x-2">
                <Button size="sm" onClick={() => deployMutation.mutate(flow.id)} disabled={deployMutation.isPending}>
                  {deployMutation.isPending ? 'Deploying…' : 'Deploy'}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(flow.id)} disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                </Button>
                <Link href={`/dashboard/workflows/${flow.id}`}>
                  <Button size="sm" variant="outline">Design</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {Array.isArray(data) && data.length === 0 && (
        <Card><CardContent className="p-6">No workflows yet.</CardContent></Card>
      )}
    </div>
  )
}

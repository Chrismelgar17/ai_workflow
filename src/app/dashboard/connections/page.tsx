'use client'

import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/label-badge'

export default function ConnectionsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['connections'],
    queryFn: () => apiClient.getConnections(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Connections</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage OAuth connections to providers</p>
      </div>

      {isLoading && <Card><CardContent className="p-6">Loading connections…</CardContent></Card>}
      {isError && <Card><CardContent className="p-6 text-red-600">Failed to load connections: {(error as any)?.message}</CardContent></Card>}

      {Array.isArray(data) && data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((c: any) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{c.provider}</CardTitle>
                  <Badge variant="secondary">{c.category}</Badge>
                </div>
                <CardDescription>{c.account || c.status}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" variant="outline">Disconnect</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !isLoading && !isError && (
          <Card>
            <CardContent className="p-6">No connections yet. Use the provider catalog to add one.</CardContent>
          </Card>
        )
      )}
    </div>
  )
}

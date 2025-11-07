'use client'

import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AnalyticsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => apiClient.getAnalytics(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400">Overview of workflow usage and costs</p>
      </div>

      {isLoading && <Card><CardContent className="p-6">Loading analytics…</CardContent></Card>}
      {isError && <Card><CardContent className="p-6 text-red-600">Failed to load analytics: {(error as any)?.message}</CardContent></Card>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Runs</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{data.total_runs ?? '—'}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Success Rate</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{data.success_rate ? `${data.success_rate}%` : '—'}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Monthly Cost</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{data.monthly_cost ? `$${data.monthly_cost}` : '—'}</CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

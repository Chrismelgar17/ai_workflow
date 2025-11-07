"use client"

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Workflow, FileText, BarChart3, Settings, Plug, Inbox } from 'lucide-react'

export default function Home() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'AI Workflow Portal'

  const tiles = [
    {
      title: 'Workflows',
      description: 'Create and manage AI workflows',
      href: '/dashboard/workflows',
      icon: Workflow,
    },
    {
      title: 'Templates',
      description: 'Browse workflow templates',
      href: '/dashboard/templates',
      icon: FileText,
    },
    {
      title: 'Connections',
      description: 'Manage OAuth connections',
      href: '/dashboard/connections',
      icon: Plug,
    },
    {
      title: 'Inbox',
      description: 'Approve human-in-loop tasks',
      href: '/dashboard/inbox',
      icon: Inbox,
    },
    {
      title: 'Analytics',
      description: 'Monitor workflow performance',
      href: '/dashboard/analytics',
      icon: BarChart3,
    },
    {
      title: 'Settings',
      description: 'Configure your workspace',
      href: '/dashboard/settings',
      icon: Settings,
    },
  ]

  // Lightweight overview from backend (best-effort, optional)
  const { data: flows } = useQuery({ queryKey: ['flows.home'], queryFn: () => apiClient.getFlows(), staleTime: 60_000 })
  const { data: connections } = useQuery({ queryKey: ['connections.home'], queryFn: () => apiClient.getConnections(), staleTime: 60_000 })
  const { data: analytics } = useQuery({ queryKey: ['analytics.home'], queryFn: () => apiClient.getAnalytics(), staleTime: 60_000 })

  return (
    <main className="min-h-screen w-full">
      {/* Hero */}
      <section className="py-20 text-center">
        <div className="mx-auto max-w-4xl px-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Welcome to {appName}
          </h1>
          <p className="mt-4 text-muted-foreground">
            AI Workflow Infrastructure Portal - Easy-Button Interface
          </p>
          <div className="mt-6">
            <Link href="/dashboard">
              <Button size="lg">Open Dashboard</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Tiles */}
      <section className="pb-10">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tiles.map((t) => (
            <Card key={t.title} className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <t.icon className="h-5 w-5 text-primary" />
                  {t.title}
                </CardTitle>
                <CardDescription>{t.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={t.href}>
                  <Button variant="outline" className="w-full">Go to {t.title}</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick Stats (best effort) */}
      <section className="pb-20">
        <div className="mx-auto max-w-6xl px-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Flows</CardTitle>
              <CardDescription>Deployed and drafts</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-bold">
              {Array.isArray(flows) ? flows.length : '—'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Connections</CardTitle>
              <CardDescription>Active provider integrations</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-bold">
              {Array.isArray(connections) ? connections.length : '—'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Monthly Runs</CardTitle>
              <CardDescription>From analytics overview</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-bold">
              {analytics?.monthly_runs ?? analytics?.total_runs ?? '—'}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
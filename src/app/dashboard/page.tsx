'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  Workflow, 
  FileText, 
  Plug, 
  TestTube, 
  Inbox, 
  BarChart3, 
  Settings,
  Plus,
  Activity,
  Users,
  Clock
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const quickStats = [
    { name: 'Active Workflows', value: '12', icon: Workflow, color: 'text-blue-600' },
    { name: 'Templates', value: '24', icon: FileText, color: 'text-green-600' },
    { name: 'Connections', value: '8', icon: Plug, color: 'text-purple-600' },
    { name: 'Pending Approvals', value: '3', icon: Clock, color: 'text-orange-600' }
  ]

  const quickActions = [
    { name: 'Create Workflow', href: '/dashboard/templates', icon: Plus },
    { name: 'View Templates', href: '/dashboard/templates', icon: FileText },
    { name: 'Manage Connections', href: '/dashboard/connections', icon: Plug },
    { name: 'Check Inbox', href: '/dashboard/inbox', icon: Inbox }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome to your AI Workflow Portal
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get started with common tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.name} href={action.href}>
                <Button variant="outline" className="w-full h-20 flex flex-col space-y-2">
                  <action.icon className="h-6 w-6" />
                  <span className="text-sm">{action.name}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Workflow "Customer Onboarding" completed</p>
                  <p className="text-xs text-gray-500">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New template "Invoice Processing" added</p>
                  <p className="text-xs text-gray-500">1 hour ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Approval required for "Data Export"</p>
                  <p className="text-xs text-gray-500">3 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Response Time</span>
                <span className="text-sm text-green-600">125ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{width: '85%'}}></div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Connections</span>
                <span className="text-sm text-blue-600">8/10</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{width: '80%'}}></div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Workflow Success Rate</span>
                <span className="text-sm text-green-600">97%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{width: '97%'}}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
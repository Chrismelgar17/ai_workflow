'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
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
  LogOut,
  Menu,
  X,
  Bell,
  User
  ,
  Cpu
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Templates', href: '/dashboard/templates', icon: FileText },
  { name: 'AI Agent', href: '/dashboard/ai-agent', icon: Cpu },
  { name: 'Workflows', href: '/dashboard/workflows', icon: Workflow },
  { name: 'Connections', href: '/dashboard/connections', icon: Plug },
  { name: 'Inbox', href: '/dashboard/inbox', icon: Inbox },
  { name: 'Test Runner', href: '/dashboard/test-runner', icon: TestTube },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Users', href: '/dashboard/users', icon: User },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, clearAuth, hydrated } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  const syncViewportState = useCallback(() => {
    if (typeof window === 'undefined') return
    const desktop = window.matchMedia('(min-width: 1024px)').matches
    setIsDesktop(desktop)
    setSidebarOpen(desktop)
  }, [])

  useEffect(() => {
    syncViewportState()
  }, [syncViewportState])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => syncViewportState()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [syncViewportState])

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [hydrated, isAuthenticated, router])

  const handleLogout = () => {
    clearAuth()
    router.push('/auth/login')
  }

  

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3 text-gray-600 dark:text-gray-300">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
          <p className="text-sm">Loading your session…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-primary">AI Workflow</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center mb-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  <User className="h-5 w-5" />
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.tenant_name}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        className={cn(
          "transition-all duration-200 ease-in-out",
          sidebarOpen ? "lg:pl-64" : ""
        )}
      >
        {/* Top bar */}
        <div className="sticky top-0 z-40 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-full px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen((open) => (isDesktop ? true : !open))}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

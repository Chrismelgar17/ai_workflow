'use client'

import { useAuthStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  const { user, clearAuth } = useAuthStore()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your profile and organization</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div><span className="text-sm text-gray-500">Name</span><div>{user?.name || '—'}</div></div>
          <div><span className="text-sm text-gray-500">Email</span><div>{user?.email || '—'}</div></div>
          <div><span className="text-sm text-gray-500">Role</span><div>{user?.role || '—'}</div></div>
          <div><span className="text-sm text-gray-500">Organization</span><div>{user?.tenant_name || '—'}</div></div>
          <Button variant="destructive" onClick={clearAuth}>Log out</Button>
        </CardContent>
      </Card>
    </div>
  )
}

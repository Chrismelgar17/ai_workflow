'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/label-badge'

export default function InboxPage() {
  const items = [] as any[] // hook up to API later
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inbox</h1>
        <p className="text-gray-600 dark:text-gray-400">Approve or review items requiring human attention</p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6">No items at the moment 🎉</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((it) => (
            <Card key={it.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{it.title}</span>
                  <Badge variant="secondary">{it.priority}</Badge>
                </CardTitle>
                <CardDescription>{it.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-x-2">
                <Button size="sm" variant="outline">Request Info</Button>
                <Button size="sm" variant="destructive">Reject</Button>
                <Button size="sm">Approve</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

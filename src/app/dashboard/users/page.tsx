'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type User = { id: string; email: string; name?: string; tenant_name?: string }

export default function UsersPage() {
  const qc = useQueryClient()
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => apiClient.getUsers(),
  })

  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<{ email: string; name?: string; tenant_name?: string; password?: string; confirmPassword?: string }>({ email: '' })

  const resetForm = () => {
    setEditing(null)
  setForm({ email: '' })
  }

  const createMutation = useMutation({
    mutationFn: (payload: { email: string; password: string; name?: string; tenant_name?: string }) => apiClient.createUser(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); resetForm() },
  })
  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: Partial<{ email: string; password: string; name: string; tenant_name: string }> }) => apiClient.updateUser(payload.id, payload.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); resetForm() },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }) },
  })

  const startCreate = () => {
    setEditing(null)
    setForm({ email: '', name: '', tenant_name: '', password: '', confirmPassword: '' })
  }
  const startEdit = (u: User) => {
    setEditing(u)
    setForm({ email: u.email, name: u.name, tenant_name: u.tenant_name, password: '', confirmPassword: '' })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      const { email, name, tenant_name, password } = form
      const data: any = { email, name, tenant_name }
      if (password) {
        if (password !== form.confirmPassword) {
          alert('Passwords do not match')
          return
        }
        data.password = password
      }
      updateMutation.mutate({ id: editing.id, data })
    } else {
      const { email, name, tenant_name, password, confirmPassword } = form
      if (!password) return alert('Password is required for new users')
      if (password !== confirmPassword) return alert('Passwords do not match')
      createMutation.mutate({ email, name, tenant_name, password })
    }
  }

  const onDelete = (u: User) => {
    if (confirm(`Delete user ${u.email}?`)) {
      deleteMutation.mutate(u.id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Users</h2>
        <Button onClick={startCreate}>New User</Button>
      </div>

      {(editing || form.password !== undefined) && (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? 'Edit User' : 'Create User'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 max-w-xl">
              <div>
                <label className="block text-sm mb-1">Email</label>
                <Input type="email" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required />
              </div>
              <div>
                <label className="block text-sm mb-1">Name</label>
                <Input value={form.name || ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm mb-1">Tenant</label>
                <Input value={form.tenant_name || ''}
                  onChange={(e) => setForm((f) => ({ ...f, tenant_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm mb-1">{editing ? 'New Password (optional)' : 'Password'}</label>
                <Input type="password" value={form.password || ''}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required={!editing} />
              </div>
              <div>
                <label className="block text-sm mb-1">{editing ? 'Confirm New Password' : 'Confirm Password'}</label>
                <Input type="password" value={form.confirmPassword || ''}
                  onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  required={!editing} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editing ? 'Save' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="p-6">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-3 pr-4">Email</th>
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Tenant</th>
                    <th className="py-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(users || []).map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{u.email}</td>
                      <td className="py-2 pr-4">{u.name || '-'}</td>
                      <td className="py-2 pr-4">{u.tenant_name || '-'}</td>
                      <td className="py-2 pr-4 text-right">
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(u)}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => onDelete(u)} disabled={deleteMutation.isPending}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

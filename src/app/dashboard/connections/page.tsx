'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient, { NangoProviderCatalogEntry, StartNangoOAuthPayload } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/label-badge'

export default function ConnectionsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['connections'],
    queryFn: () => apiClient.getConnections(),
  })
  const { data: nangoConnections } = useQuery({
    queryKey: ['nangoConnections'],
    queryFn: () => apiClient.getNangoConnections(),
  })
  const { data: providerCatalog, isLoading: isProviderLoading, isError: isProviderError, error: providerError } = useQuery<NangoProviderCatalogEntry[]>({
    queryKey: ['nangoProviderCatalog'],
    queryFn: () => apiClient.getNangoProviderCatalog(),
  })

  const disconnect = useMutation({
    mutationFn: (id: string) => apiClient.deleteConnection(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] })
  })

  const deleteNangoConn = useMutation({
    mutationFn: (id: string) => apiClient.deleteNangoConnection(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nangoConnections'] })
  })

  // Simple import form state
  const [importForm, setImportForm] = useState({ provider_config_key: '', connection_id: '', credential_type: 'API_KEY', api_key: '', basic_username: '', basic_password: '' })
  const [providerFilter, setProviderFilter] = useState('')
  const importMutation = useMutation({
    mutationFn: () => {
      const credentials = importForm.credential_type === 'API_KEY'
        ? { type: 'API_KEY', api_key: importForm.api_key }
        : { type: 'BASIC', username: importForm.basic_username, password: importForm.basic_password }
      return apiClient.importNangoConnection({ provider_config_key: importForm.provider_config_key, connection_id: importForm.connection_id, credentials })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nangoConnections'] })
      setImportForm({ provider_config_key: '', connection_id: '', credential_type: 'API_KEY', api_key: '', basic_username: '', basic_password: '' })
    }
  })

  const [oauthError, setOauthError] = useState<string | null>(null)

  const oauthMutation = useMutation({
    mutationFn: (payload: StartNangoOAuthPayload) => apiClient.startNangoOAuthSession(payload),
    onSuccess: (session) => {
      setOauthError(null)
      if (session?.authorizationUrl && typeof window !== 'undefined') {
        window.location.href = session.authorizationUrl
      }
    },
    onError: (err: any) => {
      setOauthError(err?.message || 'Failed to start OAuth session')
    }
  })

  const filteredCatalog = useMemo(() => {
    if (!Array.isArray(providerCatalog)) return []
    const term = providerFilter.trim().toLowerCase()
    if (!term) return providerCatalog
    return providerCatalog.filter((entry: NangoProviderCatalogEntry) => {
      const haystack = [
        entry.key,
        entry.title,
        entry.provider,
        ...(entry.categories || []),
        entry.description || '',
        ...(entry.tags || []),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [providerCatalog, providerFilter])

  const handlePrefill = (entry: NangoProviderCatalogEntry) => {
    const credential = entry.recommendedCredentialType === 'BASIC' ? 'BASIC' : 'API_KEY'
    setImportForm((f) => ({
      ...f,
      provider_config_key: entry.key,
      credential_type: credential,
      api_key: credential === 'API_KEY' ? '' : f.api_key,
      basic_username: credential === 'BASIC' ? '' : f.basic_username,
      basic_password: credential === 'BASIC' ? '' : f.basic_password,
    }))
  }

  const isCatalogLoading = isProviderLoading && !providerCatalog

  const handleStartOAuth = (entry: NangoProviderCatalogEntry) => {
    if (typeof window === 'undefined') return
    const defaultConnectionId = entry.key.replace(/[^a-zA-Z0-9_-]/g, '-')
    const connectionId = window.prompt('Choose a connection identifier for this provider', defaultConnectionId)
    if (!connectionId) return
    const returnUrl = `${window.location.origin}/dashboard/connections`
    setOauthError(null)
    oauthMutation.mutate({
      provider_config_key: entry.key,
      connection_id: connectionId,
      return_url: returnUrl
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Connections</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage OAuth connections to providers</p>
      </div>

      {isLoading && <Card><CardContent className="p-6">Loading connections…</CardContent></Card>}
      {isError && <Card><CardContent className="p-6 text-red-600">Failed to load connections: {(error as any)?.message}</CardContent></Card>}

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Provider Catalog</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Curated third-party integrations available through Nango.</p>
          </div>
          <Input
            className="md:w-72"
            placeholder="Search providers or categories"
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
          />
        </div>
        {oauthError && <div className="text-sm text-red-600">{oauthError}</div>}
        {isProviderError ? (
          <Card><CardContent className="p-6 text-red-600">Failed to load provider catalog: {(providerError as any)?.message || 'unknown error'}</CardContent></Card>
        ) : isCatalogLoading ? (
          <Card><CardContent className="p-6">Loading provider catalog…</CardContent></Card>
        ) : filteredCatalog.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCatalog.map((entry) => {
              const importable = entry.recommendedCredentialType === 'API_KEY' || entry.recommendedCredentialType === 'BASIC'
              const authMode = entry.authMode?.toLowerCase()
              const supportsOAuth = authMode === 'oauth' || entry.recommendedCredentialType === 'OAUTH'
              return (
                <Card key={entry.key} className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">{entry.title}</CardTitle>
                        <CardDescription>{entry.provider}</CardDescription>
                      </div>
                      <Badge variant="secondary">{entry.authMode ? entry.authMode.toUpperCase() : 'INTEGRATION'}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {entry.categories?.map((cat) => (
                        <Badge key={cat} variant="outline" className="text-xs uppercase tracking-wide">{cat}</Badge>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">{entry.description || 'Connect with this provider via Nango.'}</p>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px] uppercase tracking-wide bg-muted text-muted-foreground">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      {importable && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={oauthMutation.isPending}
                          onClick={() => handlePrefill(entry)}
                        >
                          Prefill Import
                        </Button>
                      )}
                      {supportsOAuth && (
                        <Button
                          size="sm"
                          disabled={oauthMutation.isPending}
                          onClick={() => handleStartOAuth(entry)}
                        >
                          {oauthMutation.isPending ? 'Starting…' : 'Connect'}
                        </Button>
                      )}
                      {entry.docsUrl && (
                        <Button size="sm" variant="link" className="px-0" asChild>
                          <a href={entry.docsUrl} target="_blank" rel="noreferrer">Docs</a>
                        </Button>
                      )}
                    </div>
                    {!importable && !supportsOAuth && (
                      <p className="text-xs text-muted-foreground">Launch the OAuth flow from the provider dashboard to connect.</p>
                    )}
                    <div className="text-xs text-muted-foreground">Key: <code className="font-mono text-muted-foreground/90">{entry.key}</code></div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card><CardContent className="p-6">No providers match that search yet.</CardContent></Card>
        )}
      </div>

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
                <Button size="sm" variant="outline" disabled={disconnect.isPending} onClick={() => disconnect.mutate(c.id)}>Disconnect</Button>
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

      {/* Nango direct connections list */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Nango Connections</h2>
        {Array.isArray(nangoConnections) && nangoConnections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nangoConnections.map((c: any) => (
              <Card key={c.connection_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{c.connection_id}</CardTitle>
                    <Badge variant="secondary">{c.provider}</Badge>
                  </div>
                  <CardDescription>{c.created_at}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="outline" disabled={deleteNangoConn.isPending} onClick={() => deleteNangoConn.mutate(c.connection_id)}>Delete</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-6">No Nango connections found.</CardContent></Card>
        )}
      </div>

      {/* Import Nango connection */}
      <Card>
        <CardHeader>
          <CardTitle>Import Nango Connection</CardTitle>
          <CardDescription>Provide existing credentials to create a connection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Provider Config Key</label>
              <Input value={importForm.provider_config_key} onChange={e => setImportForm(f => ({ ...f, provider_config_key: e.target.value }))} placeholder="whatsapp-business" />
            </div>
            <div>
              <label className="text-sm font-medium">Connection ID</label>
              <Input value={importForm.connection_id} onChange={e => setImportForm(f => ({ ...f, connection_id: e.target.value }))} placeholder="my-whatsapp" />
            </div>
            <div>
              <label className="text-sm font-medium">Credential Type</label>
              <select className="w-full h-10 border rounded-md px-3" value={importForm.credential_type} onChange={e => setImportForm(f => ({ ...f, credential_type: e.target.value }))}>
                <option value="API_KEY">API_KEY</option>
                <option value="BASIC">BASIC</option>
              </select>
            </div>
          </div>
          {importForm.credential_type === 'API_KEY' && (
            <div>
              <label className="text-sm font-medium">API Key / Token</label>
              <Input value={importForm.api_key} onChange={e => setImportForm(f => ({ ...f, api_key: e.target.value }))} placeholder="EAAG..." />
            </div>
          )}
          {importForm.credential_type === 'BASIC' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Username</label>
                <Input value={importForm.basic_username} onChange={e => setImportForm(f => ({ ...f, basic_username: e.target.value }))} placeholder="ACxxxx (Account SID)" />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <Input type="password" value={importForm.basic_password} onChange={e => setImportForm(f => ({ ...f, basic_password: e.target.value }))} placeholder="Auth Token" />
              </div>
            </div>
          )}
          <Button disabled={importMutation.isPending || !importForm.provider_config_key || !importForm.connection_id} onClick={() => importMutation.mutate()}>
            {importMutation.isPending ? 'Importing…' : 'Import Connection'}
          </Button>
          {importMutation.isError && <div className="text-red-600 text-sm">Failed to import</div>}
        </CardContent>
      </Card>
    </div>
  )
}
